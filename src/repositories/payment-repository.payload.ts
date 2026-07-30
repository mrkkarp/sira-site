import "server-only";
import type { Payment as PayloadPayment } from "@/payload-types";
import { getPayloadClient } from "@/lib/payload-client";
import { PaymentId, OrderId } from "@/domain/shared/ids";
import { money } from "@/domain/shared/money";
import {
  PaymentSchema,
  type Payment,
  type PaymentStatus,
} from "@/domain/ecommerce/payment";
import type { PaymentRepository, NewPayment } from "./payment-repository";

function relationId(
  value: number | { id: number } | null | undefined,
): string | null {
  if (value == null) return null;
  return String(typeof value === "number" ? value : value.id);
}

export function mapPayloadPaymentToDomain(doc: PayloadPayment): Payment {
  const mapped: Payment = {
    id: PaymentId.parse(String(doc.id)),
    orderId: OrderId.parse(relationId(doc.orderId) ?? ""),
    provider: doc.provider,
    amount: money(doc.amount.currency ?? "UAH", doc.amount.minorUnits),
    status: doc.status as PaymentStatus,
    externalId: doc.externalId ?? undefined,
    signatureVerified: doc.signatureVerified ?? false,
    rawCallbackPayload: doc.rawCallbackPayload ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  return PaymentSchema.parse(mapped);
}

export class PayloadPaymentRepository implements PaymentRepository {
  async findById(id: PaymentId): Promise<Payment | null> {
    const payload = await getPayloadClient();
    const doc = await payload.findByID({
      collection: "payments",
      id: Number(id),
      disableErrors: true,
      overrideAccess: true,
    });
    return doc
      ? mapPayloadPaymentToDomain(doc as unknown as PayloadPayment)
      : null;
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "payments",
      where: { externalId: { equals: externalId } },
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as unknown as PayloadPayment | undefined;
    return doc ? mapPayloadPaymentToDomain(doc) : null;
  }

  async findByOrderId(orderId: OrderId): Promise<Payment[]> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "payments",
      where: { orderId: { equals: Number(orderId) } },
      limit: 0,
      overrideAccess: true,
    });
    return (result.docs as unknown as PayloadPayment[]).map(
      mapPayloadPaymentToDomain,
    );
  }

  async create(input: NewPayment): Promise<Payment> {
    const payload = await getPayloadClient();
    const created = await payload.create({
      collection: "payments",
      data: {
        orderId: Number(input.orderId),
        provider: input.provider,
        amount: {
          currency: input.amount.currency,
          minorUnits: input.amount.minorUnits,
        },
        status: input.status,
        externalId: input.externalId,
        signatureVerified: input.signatureVerified,
        rawCallbackPayload: input.rawCallbackPayload,
      },
      overrideAccess: true,
    });
    return mapPayloadPaymentToDomain(created as unknown as PayloadPayment);
  }

  async updateStatus(
    id: PaymentId,
    status: PaymentStatus,
    patch?: {
      signatureVerified?: boolean;
      externalId?: string;
      rawCallbackPayload?: string;
    },
  ): Promise<Payment> {
    const payload = await getPayloadClient();
    const updated = await payload.update({
      collection: "payments",
      id: Number(id),
      data: { status, ...patch },
      overrideAccess: true,
    });
    return mapPayloadPaymentToDomain(updated as unknown as PayloadPayment);
  }
}
