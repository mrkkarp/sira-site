"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Price } from "@/components/ui/price";
import { Divider } from "@/components/ui/divider";
import { moneyToDecimal } from "@/domain/shared/money";
import type { OrderStatusResponse } from "@/app/api/order-status/route";

type Status = "idle" | "submitting" | "found" | "notFound" | "error";

/**
 * Real `/order-status` page content (Prompt 8 §2.3/§11, Phase F),
 * replacing the earlier `PlaceholderPage` stub. A guest-checkout site
 * has no account to look an order up under, so this asks for the order
 * number *and* the phone that was on it — see `/api/order-status`'s
 * doc comment for why both are required. This is also where a customer
 * lands after paying via LiqPay (`result_url`), so the same lookup
 * form doubles as the payment-confirmation flow.
 */
export function OrderStatusPageContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.orderStatus;
  const baseId = useId();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<
    Extract<OrderStatusResponse, { ok: true }>["order"] | null
  >(null);

  const statusLabels: Record<string, string> = {
    pending: copy.statusPending,
    awaitingPayment: copy.statusAwaitingPayment,
    paid: copy.statusPaid,
    processing: copy.statusProcessing,
    shipped: copy.statusShipped,
    completed: copy.statusCompleted,
    cancelled: copy.statusCancelled,
    refunded: copy.statusRefunded,
    failed: copy.statusFailed,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;

    setStatus("submitting");
    try {
      const response = await fetch(`/api/order-status?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
        }),
      });
      const result = (await response.json()) as OrderStatusResponse;

      if (!result.ok) {
        setStatus(result.error === "not_found" ? "notFound" : "error");
        setOrder(null);
        return;
      }

      setOrder(result.order);
      setStatus("found");
    } catch {
      setStatus("error");
      setOrder(null);
    }
  }

  const inputClass =
    "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60";

  return (
    <div className="flex flex-col gap-(--space-lg)">
      <p className="type-body text-text-muted">{copy.intro}</p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-(--space-sm) sm:max-w-sm"
      >
        <FormField
          id={`${baseId}-orderNumber`}
          label={copy.orderNumberLabel}
          required
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
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
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
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
          {status === "notFound" ? (
            <span className="text-error">{copy.notFoundMessage}</span>
          ) : null}
          {status === "error" ? (
            <span className="text-error">{copy.errorMessage}</span>
          ) : null}
        </p>
      </form>

      {status === "found" && order ? (
        <div className="border-border flex flex-col gap-(--space-sm) border p-(--space-md) sm:max-w-md">
          <h2 className="type-h4 text-text">
            {copy.resultHeading} {order.orderNumber}
          </h2>
          <p className="type-body text-text">
            {copy.statusLabel}: {statusLabels[order.status] ?? order.status}
          </p>
          <Divider />
          <ul className="flex flex-col gap-(--space-3xs)">
            {order.lines.map((line, index) => (
              <li
                key={index}
                className="type-body-sm text-text-muted flex justify-between gap-(--space-sm)"
              >
                <span>
                  {line.name} × {line.quantity}
                </span>
                <Price
                  amount={moneyToDecimal({
                    currency: order.currency as "UAH",
                    minorUnits: line.lineTotalMinorUnits,
                  })}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
          <Divider />
          <div className="flex items-baseline justify-between">
            <span className="type-body text-text">{copy.totalLabel}</span>
            <Price
              amount={moneyToDecimal({
                currency: order.currency as "UAH",
                minorUnits: order.totalMinorUnits,
              })}
              locale={locale}
              className="type-h4"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
