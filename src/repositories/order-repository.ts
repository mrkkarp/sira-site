import "server-only";
import type { Order, OrderStatus } from "@/domain/ecommerce/order";
import type { OrderId, PaymentId } from "@/domain/shared/ids";

/**
 * Input for placing a new order — everything except the generated
 * `id`/`createdAt`/`updatedAt`. Unlike `NewCart`, this is genuinely a
 * one-shot creation: per §11's "order snapshot" requirement, `lines`/
 * `subtotal`/`discountTotal`/`deliveryTotal`/`total`/`deliveryMethod`/
 * `customer` are frozen at checkout and this interface deliberately
 * offers no way to edit them afterwards — only `status` and
 * `paymentId` are ever allowed to change post-creation (see
 * `updateStatus`/`attachPayment` below).
 */
export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;

/**
 * `OrderRepository` (Prompt 8 §2.3/§11, Phase B). The order service
 * (Phase F) is the only intended caller of `updateStatus`, and only
 * ever transitions `awaitingPayment -> paid` from the signature-
 * verified LiqPay callback handler — this interface doesn't enforce
 * that state machine itself (that's the service's job), it just
 * refuses to expose any other mutation.
 */
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  create(input: NewOrder): Promise<Order>;
  updateStatus(id: OrderId, status: OrderStatus): Promise<Order>;
  attachPayment(id: OrderId, paymentId: PaymentId): Promise<Order>;
}

let cachedRepository: OrderRepository | null = null;

export async function getOrderRepository(): Promise<OrderRepository> {
  if (cachedRepository) return cachedRepository;
  const { PayloadOrderRepository } = await import("./order-repository.payload");
  cachedRepository = new PayloadOrderRepository();
  return cachedRepository;
}

/** Test-only escape hatch. */
export function __resetOrderRepositoryForTests(): void {
  cachedRepository = null;
}
