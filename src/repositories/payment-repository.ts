import "server-only";
import type { Payment, PaymentStatus } from "@/domain/ecommerce/payment";
import type { PaymentId, OrderId } from "@/domain/shared/ids";

export type NewPayment = Omit<Payment, "id" | "createdAt" | "updatedAt">;

/**
 * `PaymentRepository` (Prompt 8 §2.3/§9, Phase B). `findByExternalId`
 * exists specifically for the LiqPay callback handler's idempotency
 * requirement (§9, §13): before recording a callback's effect, the
 * handler looks up any existing `Payment` by LiqPay's own transaction
 * id — if one is already `success`, a repeat callback must be a no-op,
 * never a second state transition.
 */
export interface PaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByExternalId(externalId: string): Promise<Payment | null>;
  findByOrderId(orderId: OrderId): Promise<Payment[]>;
  create(input: NewPayment): Promise<Payment>;
  updateStatus(
    id: PaymentId,
    status: PaymentStatus,
    patch?: {
      signatureVerified?: boolean;
      externalId?: string;
      rawCallbackPayload?: string;
    },
  ): Promise<Payment>;
}

let cachedRepository: PaymentRepository | null = null;

export async function getPaymentRepository(): Promise<PaymentRepository> {
  if (cachedRepository) return cachedRepository;
  const { PayloadPaymentRepository } =
    await import("./payment-repository.payload");
  cachedRepository = new PayloadPaymentRepository();
  return cachedRepository;
}

/** Test-only escape hatch. */
export function __resetPaymentRepositoryForTests(): void {
  cachedRepository = null;
}
