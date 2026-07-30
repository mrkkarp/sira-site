import "server-only";
import type { Order as PayloadOrder } from "@/payload-types";
import { getPayloadClient } from "@/lib/payload-client";
import {
  OrderId,
  OrderLineId,
  ProductId,
  VariantId,
  MediaId,
  PaymentId,
  StockistId,
} from "@/domain/shared/ids";
import { money } from "@/domain/shared/money";
import { localeAllToLocaleContent, type LocaleAllValue } from "./locale-all";
import {
  OrderSchema,
  type Order,
  type OrderStatus,
} from "@/domain/ecommerce/order";
import type { OrderLine } from "@/domain/ecommerce/order-line";
import type { DeliveryMethod } from "@/domain/ecommerce/delivery-method";
import type { CustomerDetails } from "@/domain/ecommerce/customer-details";
import type { OrderRepository, NewOrder } from "./order-repository";

type PayloadOrderLine = NonNullable<PayloadOrder["lines"]>[number];
type PayloadDeliveryMethod = PayloadOrder["deliveryMethod"];

function relationId(
  value: number | { id: number } | null | undefined,
): string | null {
  if (value == null) return null;
  return String(typeof value === "number" ? value : value.id);
}

/**
 * Same `CATALOG_SOURCE=horoshop-snapshot` bridge-mode caveat as
 * `lead-repository.payload.ts`'s `toPayloadRelationId()`: `ProductId`/
 * `MediaId` are plain branded strings, and in that mode they're real
 * catalog *slugs* (e.g. `"odri"`), not Payload numeric ids — there are
 * no real `products`/`media` documents to relate an `OrderLine` to yet.
 * `Orders.lines[].productId`/`mediaId` are Payload relationship fields,
 * which require a numeric id, so writing `Number("odri")` would silently
 * write `NaN`. This drops only the *relationship* reference when it
 * isn't a real numeric id — `productId` itself is never lost, since
 * `productRef` (a plain text field, see `mapOrderLine`/`buildOrderData`)
 * always carries the raw string losslessly. Picks the relationship back
 * up automatically once Phase G makes `ProductId`/`MediaId` real
 * Payload ids.
 */
function toPayloadRelationId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapOrderLine(row: PayloadOrderLine): OrderLine {
  return {
    id: OrderLineId.parse(row.id || row.sku),
    productId: ProductId.parse(row.productRef),
    variantId: VariantId.parse(row.variantSku),
    sku: row.sku,
    name: localeAllToLocaleContent(
      row.name as unknown as LocaleAllValue,
      row.sku,
    ),
    mediaId: relationId(row.mediaId)
      ? MediaId.parse(relationId(row.mediaId) as string)
      : undefined,
    quantity: row.quantity,
    unitPrice: money("UAH", row.unitPriceMinorUnits),
    lineTotal: money("UAH", row.lineTotalMinorUnits),
    options: (row.options ?? []).map((option) => ({
      optionKey: option.optionKey,
      value: option.value,
      label: localeAllToLocaleContent(
        option.label as unknown as LocaleAllValue,
        option.value,
      ),
    })),
  };
}

/**
 * `deliveryMethod` bridges a flat Payload group (all fields optional
 * except `type`, shown/hidden via `admin.condition` — see
 * `src/collections/Orders.ts`) back into the domain's discriminated
 * union, which requires exactly the fields each `type` needs.
 *
 * `pickup` is the one lossy case: the domain schema wants a real
 * `StockistId` (a relationship to a `Stockists` entity), but no
 * `Stockists` Payload collection exists yet (Phase B scope, see
 * `Orders.ts`'s `stockistNote` field comment) — there is only a
 * free-text note naming the pickup point. Until that collection
 * exists, the note text itself is reused as the `StockistId`'s
 * string value (it only needs to be a non-empty string to satisfy the
 * brand); this is an opaque placeholder, not a real foreign key, and
 * must be replaced once `Stockists` is modeled.
 */
function mapDeliveryMethod(group: PayloadDeliveryMethod): DeliveryMethod {
  switch (group.type) {
    case "novaPoshtaBranch":
      return {
        type: "novaPoshtaBranch",
        cityName: group.cityName ?? "",
        branchNumber: group.branchNumber ?? "",
        branchAddress: group.branchAddress ?? undefined,
      };
    case "novaPoshtaCourier":
      return {
        type: "novaPoshtaCourier",
        cityName: group.cityName ?? "",
        address: group.address ?? "",
      };
    case "courier":
      return {
        type: "courier",
        cityName: group.cityName ?? "",
        address: group.address ?? "",
      };
    case "pickup":
    default:
      return {
        type: "pickup",
        stockistId: StockistId.parse(group.stockistNote || "unknown"),
      };
  }
}

function mapCustomer(group: PayloadOrder["customer"]): CustomerDetails {
  return {
    fullName: group.fullName,
    phone: group.phone,
    email: group.email ?? undefined,
    companyName: group.companyName ?? undefined,
    notes: group.notes ?? undefined,
  };
}

/**
 * Payload/Postgres-backed mapper: Payload's generated `Order` -> domain
 * `Order`. `promoCodeId` is always `undefined` for the same reason as
 * `Cart.promoCodeId` (see `cart-repository.payload.ts`): `Orders` has
 * no field for it, since there's no `PromoCodes` collection to relate
 * to yet.
 */
export function mapPayloadOrderToDomain(doc: PayloadOrder): Order {
  const mapped: Order = {
    id: OrderId.parse(String(doc.id)),
    orderNumber: doc.orderNumber,
    lines: (doc.lines ?? []).map(mapOrderLine),
    subtotal: money("UAH", doc.totals.subtotalMinorUnits),
    discountTotal: money("UAH", doc.totals.discountTotalMinorUnits),
    deliveryTotal: money("UAH", doc.totals.deliveryTotalMinorUnits),
    total: money("UAH", doc.totals.totalMinorUnits),
    promoCodeId: undefined,
    deliveryMethod: mapDeliveryMethod(doc.deliveryMethod),
    customer: mapCustomer(doc.customer),
    status: doc.status as OrderStatus,
    paymentId: relationId(doc.paymentId)
      ? PaymentId.parse(relationId(doc.paymentId) as string)
      : undefined,
    notes: doc.notes ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  return OrderSchema.parse(mapped);
}

function buildDeliveryMethodData(method: NewOrder["deliveryMethod"]) {
  switch (method.type) {
    case "novaPoshtaBranch":
      return {
        type: method.type,
        cityName: method.cityName,
        branchNumber: method.branchNumber,
        branchAddress: method.branchAddress,
      };
    case "novaPoshtaCourier":
    case "courier":
      return {
        type: method.type,
        cityName: method.cityName,
        address: method.address,
      };
    case "pickup":
      return { type: method.type, stockistNote: method.stockistId };
  }
}

export function buildOrderData(input: NewOrder) {
  return {
    orderNumber: input.orderNumber,
    currency: input.subtotal.currency,
    lines: input.lines.map((line) => ({
      productId: toPayloadRelationId(line.productId),
      productRef: line.productId,
      variantSku: line.variantId,
      sku: line.sku,
      name: { uk: line.name.uk, en: line.name.en, pl: line.name.pl },
      mediaId: toPayloadRelationId(line.mediaId),
      quantity: line.quantity,
      unitPriceMinorUnits: line.unitPrice.minorUnits,
      lineTotalMinorUnits: line.lineTotal.minorUnits,
      options: line.options.map((option) => ({
        optionKey: option.optionKey,
        value: option.value,
        label: {
          uk: option.label.uk,
          en: option.label.en,
          pl: option.label.pl,
        },
      })),
    })),
    totals: {
      subtotalMinorUnits: input.subtotal.minorUnits,
      discountTotalMinorUnits: input.discountTotal.minorUnits,
      deliveryTotalMinorUnits: input.deliveryTotal.minorUnits,
      totalMinorUnits: input.total.minorUnits,
    },
    deliveryMethod: buildDeliveryMethodData(input.deliveryMethod),
    customer: {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email,
      companyName: input.customer.companyName,
      notes: input.customer.notes,
    },
    status: input.status,
    paymentId: input.paymentId ? Number(input.paymentId) : undefined,
    notes: input.notes,
  };
}

export class PayloadOrderRepository implements OrderRepository {
  async findById(id: OrderId): Promise<Order | null> {
    const payload = await getPayloadClient();
    const doc = await payload.findByID({
      collection: "orders",
      id: Number(id),
      depth: 0,
      disableErrors: true,
      overrideAccess: true,
    });
    return doc ? mapPayloadOrderToDomain(doc as unknown as PayloadOrder) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "orders",
      where: { orderNumber: { equals: orderNumber } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as unknown as PayloadOrder | undefined;
    return doc ? mapPayloadOrderToDomain(doc) : null;
  }

  async create(input: NewOrder): Promise<Order> {
    const payload = await getPayloadClient();
    const created = await payload.create({
      collection: "orders",
      data: buildOrderData(input),
      overrideAccess: true,
    });
    return mapPayloadOrderToDomain(created as unknown as PayloadOrder);
  }

  async updateStatus(id: OrderId, status: OrderStatus): Promise<Order> {
    const payload = await getPayloadClient();
    const updated = await payload.update({
      collection: "orders",
      id: Number(id),
      data: { status },
      overrideAccess: true,
    });
    return mapPayloadOrderToDomain(updated as unknown as PayloadOrder);
  }

  async attachPayment(id: OrderId, paymentId: PaymentId): Promise<Order> {
    const payload = await getPayloadClient();
    const updated = await payload.update({
      collection: "orders",
      id: Number(id),
      data: { paymentId: Number(paymentId) },
      overrideAccess: true,
    });
    return mapPayloadOrderToDomain(updated as unknown as PayloadOrder);
  }
}
