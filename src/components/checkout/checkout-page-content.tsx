"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { useCart } from "@/lib/cart-store";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { FormField } from "@/components/ui/form-field";
import { RadioGroup } from "@/components/ui/radio-group";
import { EmptyState } from "@/components/ui/empty-state";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import type { DeliveryMethodType } from "@/domain/ecommerce/delivery-method";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Client-side shape the `/api/checkout` route re-validates server-side
 * against the real `CustomerDetailsSchema`/`DeliveryMethodSchema` — same
 * "loose client guard, real domain schema is the source of truth" split
 * as the Phase E forms (see `callback-form.tsx`).
 */
const CheckoutFields = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional().or(z.literal("")),
  deliveryType: z.enum([
    "novaPoshtaBranch",
    "novaPoshtaCourier",
    "courier",
    "pickup",
  ]),
  cityName: z.string().trim().optional(),
  branchNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  stockistId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function buildDeliveryMethod(fields: z.infer<typeof CheckoutFields>) {
  switch (fields.deliveryType) {
    case "novaPoshtaBranch":
      return {
        type: "novaPoshtaBranch" as const,
        cityName: fields.cityName ?? "",
        branchNumber: fields.branchNumber ?? "",
      };
    case "novaPoshtaCourier":
      return {
        type: "novaPoshtaCourier" as const,
        cityName: fields.cityName ?? "",
        address: fields.address ?? "",
      };
    case "courier":
      return {
        type: "courier" as const,
        cityName: fields.cityName ?? "",
        address: fields.address ?? "",
      };
    case "pickup":
      return { type: "pickup" as const, stockistId: fields.stockistId ?? "" };
  }
}

interface CheckoutResult {
  ok: boolean;
  orderNumber?: string;
  status?: string;
  provider?: "liqpay" | "manual";
  liqpay?: { data: string; signature: string; checkoutUrl: string };
  error?: string;
}

/**
 * Real `/checkout` page content (Prompt 8 §2.3/§9/§11, Phase F). Reads
 * the live client-side cart mirror (`useCart()`, same store `/cart`
 * uses) for the order summary, then posts customer + delivery details
 * to `/api/checkout`. On success:
 *  - a LiqPay-backed order auto-submits a hidden form to LiqPay's
 *    hosted checkout (this app never collects a card number itself);
 *  - a manual/invoice order shows an inline confirmation — there is
 *    nothing further to redirect to, since staff follow up directly.
 */
export function CheckoutPageContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const { items, subtotal, count, isLoading } = useCart();
  const copy = dictionary.checkout;
  const baseId = useId();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const liqpayFormRef = useRef<HTMLFormElement>(null);

  const [fields, setFields] = useState({
    fullName: "",
    phone: "",
    email: "",
    deliveryType: "novaPoshtaBranch" as DeliveryMethodType,
    cityName: "",
    branchNumber: "",
    address: "",
    stockistId: "",
    notes: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<
    string | null
  >(null);
  const [liqpayPayload, setLiqpayPayload] =
    useState<CheckoutResult["liqpay"]>(undefined);

  function update<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CheckoutFields.safeParse(fields);
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(copy.invalidFormMessage);
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/checkout?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            email: parsed.data.email || undefined,
          },
          deliveryMethod: buildDeliveryMethod(parsed.data),
          notes: parsed.data.notes || undefined,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      const result = (await response.json()) as CheckoutResult;

      if (!response.ok || !result.ok) {
        setStatus("error");
        setErrorMessage(copy.errorMessage);
        return;
      }

      if (result.provider === "liqpay" && result.liqpay) {
        setLiqpayPayload(result.liqpay);
        setStatus("success");
        // Auto-submit the hidden form to LiqPay's hosted checkout once it's rendered.
        requestAnimationFrame(() => liqpayFormRef.current?.submit());
        return;
      }

      setConfirmedOrderNumber(result.orderNumber ?? null);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(copy.errorMessage);
    }
  }

  if (isLoading) return null;

  if (status === "success" && liqpayPayload) {
    return (
      <div className="flex flex-col gap-(--space-sm)">
        <p className="type-body text-text-muted">{copy.redirectingToLiqpay}</p>
        <form
          ref={liqpayFormRef}
          method="POST"
          action={liqpayPayload.checkoutUrl}
        >
          <input type="hidden" name="data" value={liqpayPayload.data} />
          <input
            type="hidden"
            name="signature"
            value={liqpayPayload.signature}
          />
        </form>
      </div>
    );
  }

  if (status === "success" && confirmedOrderNumber !== null) {
    return (
      <EmptyState
        heading={copy.manualConfirmationHeading}
        description={`${copy.manualConfirmationBody} ${confirmedOrderNumber}`}
        action={
          <LinkButton href={localeHref(locale, "/shop")}>
            {copy.continueShoppingCta}
          </LinkButton>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        heading={copy.emptyCartMessage}
        action={
          <LinkButton href={localeHref(locale, "/shop")}>
            {copy.continueShoppingCta}
          </LinkButton>
        }
      />
    );
  }

  const inputClass =
    "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60";

  return (
    <div className="grid grid-cols-1 gap-(--space-xl) lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-(--space-md)"
      >
        <HoneypotField ref={honeypotRef} />

        <h2 className="type-h4 text-text">{copy.customerHeading}</h2>
        <FormField
          id={`${baseId}-fullName`}
          label={copy.fullNameLabel}
          required
        >
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="name"
              value={fields.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              disabled={status === "submitting"}
              className={inputClass}
            />
          )}
        </FormField>
        <FormField id={`${baseId}-phone`} label={copy.phoneLabel} required>
          {(props) => (
            <input
              {...props}
              type="tel"
              autoComplete="tel"
              value={fields.phone}
              onChange={(event) => update("phone", event.target.value)}
              disabled={status === "submitting"}
              className={inputClass}
            />
          )}
        </FormField>
        <FormField id={`${baseId}-email`} label={copy.emailLabel}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(event) => update("email", event.target.value)}
              disabled={status === "submitting"}
              className={inputClass}
            />
          )}
        </FormField>

        <h2 className="type-h4 text-text">{copy.deliveryHeading}</h2>
        <RadioGroup
          name={`${baseId}-deliveryType`}
          legend={copy.deliveryMethodLabel}
          value={fields.deliveryType}
          onChange={(value) =>
            update("deliveryType", value as DeliveryMethodType)
          }
          options={[
            { value: "novaPoshtaBranch", label: copy.deliveryNovaPoshtaBranch },
            {
              value: "novaPoshtaCourier",
              label: copy.deliveryNovaPoshtaCourier,
            },
            { value: "courier", label: copy.deliveryCourier },
            { value: "pickup", label: copy.deliveryPickup },
          ]}
        />

        {fields.deliveryType === "pickup" ? (
          <FormField
            id={`${baseId}-stockist`}
            label={copy.pickupLocationLabel}
            required
          >
            {(props) => (
              <input
                {...props}
                type="text"
                value={fields.stockistId}
                onChange={(event) => update("stockistId", event.target.value)}
                disabled={status === "submitting"}
                className={inputClass}
              />
            )}
          </FormField>
        ) : (
          <>
            <FormField id={`${baseId}-city`} label={copy.cityLabel} required>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={fields.cityName}
                  onChange={(event) => update("cityName", event.target.value)}
                  disabled={status === "submitting"}
                  className={inputClass}
                />
              )}
            </FormField>
            {fields.deliveryType === "novaPoshtaBranch" ? (
              <FormField
                id={`${baseId}-branch`}
                label={copy.branchNumberLabel}
                required
              >
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    value={fields.branchNumber}
                    onChange={(event) =>
                      update("branchNumber", event.target.value)
                    }
                    disabled={status === "submitting"}
                    className={inputClass}
                  />
                )}
              </FormField>
            ) : (
              <FormField
                id={`${baseId}-address`}
                label={copy.addressLabel}
                required
              >
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    value={fields.address}
                    onChange={(event) => update("address", event.target.value)}
                    disabled={status === "submitting"}
                    className={inputClass}
                  />
                )}
              </FormField>
            )}
          </>
        )}

        <FormField id={`${baseId}-notes`} label={copy.notesLabel}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              value={fields.notes}
              onChange={(event) => update("notes", event.target.value)}
              disabled={status === "submitting"}
              className={inputClass}
            />
          )}
        </FormField>

        <Button
          type="submit"
          disabled={status === "submitting"}
          className="self-start"
        >
          {status === "submitting" ? copy.submittingCta : copy.submitCta}
        </Button>

        <p aria-live="polite" className="type-caption min-h-[1.4em]">
          {status === "error" ? (
            <span className="text-error">{errorMessage}</span>
          ) : null}
        </p>
      </form>

      <aside className="border-border flex flex-col gap-(--space-sm) border p-(--space-md)">
        <h2 className="type-h4 text-text">{copy.summaryHeading}</h2>
        <p className="type-caption text-text-muted">
          {copy.itemsCountLabel}: {count}
        </p>
        <div className="flex items-baseline justify-between">
          <span className="type-body text-text">{copy.totalLabel}</span>
          <Price amount={subtotal} locale={locale} className="type-h4" />
        </div>
      </aside>
    </div>
  );
}
