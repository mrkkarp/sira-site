import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeadForm } from "@/lib/forms/use-lead-form";

/**
 * The three lead forms that share this hook are covered by their own component
 * tests. What is left over — and what no component test can reach without
 * breaking something on purpose — is the ordering guarantee between the network
 * call and the measurement callback.
 *
 * That ordering is not cosmetic. `onAccepted` used to be called *inside* the
 * same `try` as `fetch`, so anything that threw while measuring a lead the
 * server had already saved was caught by the network handler, flipped the form
 * to its error state, and told the customer their enquiry had failed. They then
 * send it again. The enquiry is in the database twice, the workshop phones the
 * same person twice, and nothing in any log says why.
 *
 * Enhanced Conversions is what made this reachable rather than theoretical:
 * `hashUserData` awaits `crypto.subtle.digest`, which is `undefined` outside a
 * secure context, so on any origin the site is ever served from over plain HTTP
 * the measurement step is exactly the thing that throws.
 */
type LeadFormOptions = Parameters<typeof useLeadForm>[0];

function setup(overrides: Partial<LeadFormOptions> = {}) {
  return renderHook(() =>
    useLeadForm({
      endpoint: "/api/contact",
      validate: () => ({}),
      fieldRefs: {},
      ...overrides,
    }),
  );
}

describe("useLeadForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the form in its success state when measurement throws", async () => {
    // The lead is saved. Whatever happened after that is the site's problem,
    // not the customer's, and they must not be invited to submit it again.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onAccepted = vi.fn().mockRejectedValue(new Error("crypto.subtle is undefined"));

    const { result } = setup({ onAccepted });

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current.submit({ name: "Марко" });
    });

    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(accepted).toBe(true);
    expect(result.current.status).toBe("success");
    // Silent is not acceptable either — a conversion that stopped being
    // reported has to leave a trace someone can find.
    expect(consoleError).toHaveBeenCalledWith(
      "[forms] the lead was accepted but not measured",
      expect.any(Error),
    );
  });

  it("waits for the measurement before reporting the submission finished", async () => {
    // `onAccepted` is async now. If it were fired and forgotten, the caller
    // would clear the fields — and the component would unmount on navigation —
    // while the hashing promise was still pending, and the conversion would be
    // pushed to a dataLayer nobody is reading any more, or not at all.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const order: string[] = [];
    const onAccepted = vi.fn().mockImplementation(async () => {
      await Promise.resolve();
      order.push("measured");
    });

    const { result } = setup({ onAccepted });
    await act(async () => {
      await result.current.submit({ name: "Марко" });
      order.push("returned");
    });

    expect(order).toEqual(["measured", "returned"]);
  });

  it("does not measure a lead the server refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const onAccepted = vi.fn();

    const { result } = setup({ onAccepted });
    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current.submit({ name: "Марко" });
    });

    expect(onAccepted).not.toHaveBeenCalled();
    expect(accepted).toBe(false);
    expect(result.current.status).toBe("error");
  });

  it("does not measure a lead that never left the browser", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onAccepted = vi.fn();

    const { result } = setup({
      validate: () => ({ name: "Вкажіть імʼя" }),
      onAccepted,
    });
    await act(async () => {
      await result.current.submit({ name: "" });
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({ name: "Вкажіть імʼя" });
  });
});
