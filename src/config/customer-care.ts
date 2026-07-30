/**
 * Structured summary data for the footer's customer-care block — confirmed
 * legacy-site facts only (payment methods, delivery options, warranty
 * length, care rules). This is a *summary*; the full legal/warranty text
 * lives on the dedicated pages (`/warranty`, `/payment-delivery`) and must
 * not be duplicated here. Each `itemKey` resolves against
 * `dictionary.customerCare`.
 */

export const paymentItemKeys = [
  "paymentLiqpay",
  "paymentInvoice",
  "paymentCash",
] as const;

export const deliveryItemKeys = [
  "deliveryPickup",
  "deliveryNovaPoshta",
  "deliveryCourier",
  "deliveryCustom",
] as const;

export const careItemKeys = [
  "careNoAbrasive",
  "careNoAcid",
  "careCleanPromptly",
  "careAvoidImpact",
] as const;

export const warrantyReadMoreHref = "/warranty";
