import { describe, expect, it, beforeEach } from "vitest";
import {
  consentSignalsFor,
  ensureConsentDefaults,
  resetConsentModeForTests,
  updateConsent,
} from "@/lib/analytics/consent-mode";

/** The queue as GTM would read it: gtag commands, flattened to plain arrays. */
function commands(): unknown[][] {
  return (window.dataLayer ?? [])
    .filter((entry) => Object.prototype.toString.call(entry) === "[object Arguments]")
    .map((entry) => Array.from(entry as IArguments));
}

function consentCalls(): { kind: string; payload: Record<string, unknown> }[] {
  return commands()
    .filter(([command]) => command === "consent")
    .map(([, kind, payload]) => ({
      kind: kind as string,
      payload: payload as Record<string, unknown>,
    }));
}

describe("consent mode v2", () => {
  beforeEach(() => {
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  describe("defaults", () => {
    it("denies every advertising and measurement signal on arrival", () => {
      ensureConsentDefaults();
      const [first] = consentCalls();
      expect(first.kind).toBe("default");
      expect(first.payload).toMatchObject({
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        personalization_storage: "denied",
      });
    });

    it("grants only the two signals the site cannot function without", () => {
      ensureConsentDefaults();
      const [first] = consentCalls();
      expect(first.payload.security_storage).toBe("granted");
      expect(first.payload.functionality_storage).toBe("granted");
    });

    it("applies to everyone, with no region carve-out", () => {
      // Google permits granted-by-default outside the EEA. Taking that option
      // means maintaining a region list whose failure mode is a compliance
      // breach, for a market that is Ukraine, Poland and the rest of Europe.
      ensureConsentDefaults();
      expect(consentCalls()[0].payload).not.toHaveProperty("region");
    });

    it("holds tags briefly so a returning visitor's choice reaches page one", () => {
      ensureConsentDefaults();
      expect(consentCalls()[0].payload.wait_for_update).toBe(500);
    });

    it("redacts ad data while consent is denied", () => {
      ensureConsentDefaults();
      expect(commands()).toContainEqual(["set", "ads_data_redaction", true]);
    });

    it("queues the defaults exactly once, however many times it is called", () => {
      // It is called on every event and on every render of the container
      // component; a second `default` after an `update` would be, at best,
      // noise in the queue GTM has to reconcile.
      ensureConsentDefaults();
      ensureConsentDefaults();
      ensureConsentDefaults();
      expect(consentCalls().filter((call) => call.kind === "default")).toHaveLength(1);
    });
  });

  describe("ordering", () => {
    it("puts the defaults ahead of an update, even if update is called first", () => {
      // The guarantee the whole design rests on. GTM reads the queue from
      // index 0 when it initialises, so an `update` sitting at a lower index
      // than the `default` is processed against an unconfigured container.
      updateConsent({ analytics: true, marketing: true });
      expect(consentCalls().map((call) => call.kind)).toEqual([
        "default",
        "update",
      ]);
    });

    it("puts `consent default` at the very head of the queue", () => {
      updateConsent({ analytics: true, marketing: false });
      expect(Array.from(window.dataLayer?.[0] as IArguments)[1]).toBe("default");
    });
  });

  describe("mapping the banner's two switches onto Google's signals", () => {
    it("grants everything when both categories are accepted", () => {
      expect(consentSignalsFor({ analytics: true, marketing: true })).toEqual({
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        personalization_storage: "granted",
      });
    });

    it("keeps analytics and advertising independent", () => {
      // Accepting measurement is not accepting ad targeting; the banner offers
      // them separately and the signals have to honour that separation.
      expect(consentSignalsFor({ analytics: true, marketing: false })).toEqual({
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        personalization_storage: "denied",
      });
    });

    it("treats personalised content as an advertising signal", () => {
      // Personalised ads and personalised content are the same promise to a
      // visitor; letting "no to marketing" still profile them would not be.
      expect(
        consentSignalsFor({ analytics: true, marketing: false })
          .personalization_storage,
      ).toBe("denied");
    });

    it("sends the denials explicitly, so consent can be withdrawn", () => {
      // Consent that cannot be taken back is not consent. An `update` carrying
      // only the grants would leave a previously-granted signal granted.
      updateConsent({ analytics: false, marketing: false });
      const update = consentCalls().find((call) => call.kind === "update");
      expect(update?.payload).toEqual({
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        personalization_storage: "denied",
      });
    });
  });
});
