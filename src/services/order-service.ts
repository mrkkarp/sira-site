import "server-only";
import {
  getCartRepository,
  type CartRepository,
} from "@/repositories/cart-repository";
import {
  getOrderRepository,
  type OrderRepository,
  type NewOrder,
} from "@/repositories/order-repository";
import {
  getPaymentRepository,
  type PaymentRepository,
} from "@/repositories/payment-repository";
import {
  getProductById,
  effectivePrice,
  isVariantOrderable,
} from "./product-service";
import type { ProductRepository } from "@/repositories/product-repository";
import type { Order } from "@/domain/ecommerce/order";
import type { Payment, PaymentProvider } from "@/domain/ecommerce/payment";
import type { CustomerDetails } from "@/domain/ecommerce/customer-details";
import type { DeliveryMethod } from "@/domain/ecommerce/delivery-method";
import type { OrderLine } from "@/domain/ecommerce/order-line";
import {
  money,
  addMoney,
  multiplyMoney,
  type Money,
} from "@/domain/shared/money";
import { OrderLineId } from "@/domain/shared/ids";
import { isLiqPayConfigured } from "@/lib/payments/liqpay-adapter";

/**
 * `OrderService` (Prompt 8 §2.3/§9/§11, Phase F) — turns a server-
 * persisted `Cart` into a frozen `Order` + a `Payment` attempt. Mirrors
 * `cart-service.ts`'s shape: every export takes an optional
 * `Dependencies` bag so tests can inject in-memory fakes for all four
 * repositories it touches, without going through the module-level
 * singleton caches or a real `CATALOG_SOURCE`/Postgres.
 *
 * Two rules this module enforces, both required by the spec:
 *  - **Never trust the cart's stored price/availability.** Every line
 *    is re-resolved against `ProductRepository` and re-priced via
 *    `effectivePrice()`/`isVariantOrderable()` at the moment of
 *    checkout (§7/§13's "завжди перевіряй ціну і наявність на
 *    сервері") — a cart can sit for days before checkout, and a price
 *    or stock change during that window must never silently carry
 *    over into the frozen order.
 *  - **Never fabricate a shipping cost.** `deliveryTotal` is always
 *    `0` — there is no shipping-cost calculator anywhere in this app,
 *    and inventing one would violate the spec's explicit rule against
 *    showing a made-up delivery price. Nova Poshta/courier shipping is
 *    billed separately (COD-style) in this business, same as
 *    `DeliveryMethod`'s modeling implies. Likewise `discountTotal` is
 *    always `0`: `PromoCode` is domain-modeled only (Phase A) with no
 *    repository/collection/UI anywhere yet (§14 scope, deliberately
 *    not built — same "no unused infrastructure" call as Phase E's
 *    designer/warranty/sample lead forms), so redemption logic has
 *    nothing real to operate on.
 */
export interface Dependencies {
  cartRepository?: CartRepository;
  productRepository?: ProductRepository;
  orderRepository?: OrderRepository;
  paymentRepository?: PaymentRepository;
}

async function resolveCartRepository(
  deps?: Dependencies,
): Promise<CartRepository> {
  return deps?.cartRepository ?? (await getCartRepository());
}
async function resolveOrderRepository(
  deps?: Dependencies,
): Promise<OrderRepository> {
  return deps?.orderRepository ?? (await getOrderRepository());
}
async function resolvePaymentRepository(
  deps?: Dependencies,
): Promise<PaymentRepository> {
  return deps?.paymentRepository ?? (await getPaymentRepository());
}

export interface PlaceOrderInput {
  customer: CustomerDetails;
  deliveryMethod: DeliveryMethod;
  notes?: string;
}

export type PlaceOrderResult =
  | { status: "ok"; order: Order; payment: Payment }
  | { status: "cartEmpty" }
  | { status: "lineUnavailable"; sku: string };

/** Generates a human-facing order number. Format is an implementation detail (see `OrderSchema`'s doc comment) — date-based prefix + a short random suffix, unique enough for this app's real-world order volume without needing a database sequence. */
function generateOrderNumber(now: Date = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase();
  return `SO-${datePart}-${randomPart}`;
}

export async function placeOrder(
  sessionToken: string,
  input: PlaceOrderInput,
  deps?: Dependencies,
): Promise<PlaceOrderResult> {
  const cartRepo = await resolveCartRepository(deps);
  const cart = await cartRepo.findBySessionToken(sessionToken);
  if (!cart || cart.lines.length === 0) return { status: "cartEmpty" };

  const currency = cart.currency;
  const lines: OrderLine[] = [];

  for (const line of cart.lines) {
    const product = await getProductById(
      line.productId,
      deps?.productRepository,
    );
    const variant = product?.variants.find(
      (candidate) => candidate.id === line.variantId,
    );
    if (!product || !variant || !isVariantOrderable(variant)) {
      return { status: "lineUnavailable", sku: line.sku };
    }

    const unitPrice = effectivePrice(product, variant);
    if (!unitPrice) return { status: "lineUnavailable", sku: line.sku };

    lines.push({
      id: OrderLineId.parse(line.id),
      productId: line.productId,
      variantId: line.variantId,
      sku: line.sku,
      name: line.name,
      mediaId: line.mediaId,
      quantity: line.quantity,
      unitPrice,
      lineTotal: multiplyMoney(unitPrice, line.quantity),
      options: line.options,
    });
  }

  const subtotal = lines.reduce(
    (sum, line) => addMoney(sum, line.lineTotal),
    money(currency, 0),
  );
  const discountTotal = money(currency, 0);
  const deliveryTotal = money(currency, 0);
  // total = subtotal - discountTotal + deliveryTotal, but both of those are always 0 today (see doc comment above).
  const total: Money = subtotal;

  const provider: PaymentProvider = isLiqPayConfigured() ? "liqpay" : "manual";
  // An order row is created before the customer ever reaches LiqPay (so
  // an abandoned/failed payment still has a record) — `awaitingPayment`
  // for the LiqPay path, `pending` for the manual/invoice path where
  // staff follow up directly (see `OrderStatus`'s doc comment).
  const orderStatus = provider === "liqpay" ? "awaitingPayment" : "pending";

  const newOrder: NewOrder = {
    orderNumber: generateOrderNumber(),
    lines,
    subtotal,
    discountTotal,
    deliveryTotal,
    total,
    promoCodeId: undefined,
    deliveryMethod: input.deliveryMethod,
    customer: input.customer,
    status: orderStatus,
    paymentId: undefined,
    notes: input.notes,
  };

  const orderRepo = await resolveOrderRepository(deps);
  const order = await orderRepo.create(newOrder);

  // Past this point the order row exists, and the three writes below are
  // NOT one transaction (Payload's local API would need a transactionID
  // threaded through all four repositories). So each is compensated
  // instead: whatever fails, the order must never be left in a state that
  // *looks* like a live order but isn't. An order sitting at
  // `awaitingPayment` with no payment row attached is exactly that — it
  // would show up in the admin queue as real work, and staff would chase a
  // payment that was never even attempted.
  let payment: Payment;
  try {
    const paymentRepo = await resolvePaymentRepository(deps);
    payment = await paymentRepo.create({
      orderId: order.id,
      provider,
      amount: total,
      status: "pending",
      externalId: undefined,
      signatureVerified: false,
      rawCallbackPayload: undefined,
    });
  } catch (error) {
    await markOrderFailed(orderRepo, order, "payment_create_failed");
    throw error;
  }

  let orderWithPayment: Order;
  try {
    orderWithPayment = await orderRepo.attachPayment(order.id, payment.id);
  } catch (error) {
    await markOrderFailed(orderRepo, order, "attach_payment_failed");
    throw error;
  }

  // Clearing the cart is deliberately last and deliberately non-fatal: the
  // order is already committed, so throwing here would answer 500 to a
  // customer whose order *was* placed — they'd re-submit and we'd have two.
  // A cart that outlives its order is a visible annoyance; a duplicate
  // order is a real one.
  try {
    await cartRepo.deleteBySessionToken(sessionToken);
  } catch (error) {
    console.error(
      `[order-service] order ${order.orderNumber} was placed but its cart could not be cleared`,
      error,
    );
  }

  return { status: "ok", order: orderWithPayment, payment };
}

/**
 * Compensating write for a half-created order. Never throws: it runs on an
 * error path that is about to rethrow the *original* failure, and masking
 * that with a secondary one would lose the only useful diagnostic.
 */
async function markOrderFailed(
  orderRepo: OrderRepository,
  order: Order,
  reason: string,
): Promise<void> {
  try {
    await orderRepo.updateStatus(order.id, "failed");
  } catch (compensationError) {
    console.error(
      `[order-service] order ${order.orderNumber} failed (${reason}) AND could not be marked failed — it is orphaned in the database`,
      compensationError,
    );
    return;
  }
  console.error(
    `[order-service] order ${order.orderNumber} marked failed: ${reason}`,
  );
}
