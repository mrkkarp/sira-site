/**
 * Repository barrel (Prompt 8 §0/§3, Phase B). Exports factory
 * functions and interfaces/input types only — never the concrete
 * `Payload*Repository`/`HoroshopSnapshot*Repository` classes, per the
 * "UI не має напряму імпортувати JSON/ORM/DB" rule: a call site asks
 * `getXRepository()` for "the" repository and programs against the
 * matching interface, never picks a storage backend itself.
 */
export type { ProductRepository, CatalogSource } from "./product-repository";
export {
  getProductRepository,
  __resetProductRepositoryForTests,
} from "./product-repository";

export type { CartRepository, NewCart, NewCartLine } from "./cart-repository";
export {
  getCartRepository,
  __resetCartRepositoryForTests,
} from "./cart-repository";

export type { OrderRepository, NewOrder } from "./order-repository";
export {
  getOrderRepository,
  __resetOrderRepositoryForTests,
} from "./order-repository";

export type { PaymentRepository, NewPayment } from "./payment-repository";
export {
  getPaymentRepository,
  __resetPaymentRepositoryForTests,
} from "./payment-repository";

export type { LeadRepository, NewLeadRequest } from "./lead-repository";
export {
  getLeadRepository,
  __resetLeadRepositoryForTests,
} from "./lead-repository";
