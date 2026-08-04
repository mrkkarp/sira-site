import { describe, expect, it, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ContactLinkTracker } from "@/components/analytics/contact-link-tracker";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
import { contact } from "@/config/contact";

/**
 * These assert against the *real* hrefs from `config/contact.ts`, not
 * hand-written ones. The Telegram link there is `https://t.me/+380961545584`
 * — an ordinary https URL — and the whole reason this component matches on
 * hostname rather than scheme. A test with its own invented `tg://` href would
 * have passed while the site's actual link went unmeasured.
 */
const events = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]",
  );

const lastEvent = () => events()[events().length - 1];

describe("ContactLinkTracker", () => {
  beforeEach(() => {
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  it("counts a tap on the site's real phone link", () => {
    const { getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <a href={`tel:${contact.phone.href}`}>{contact.phone.display}</a>
      </div>,
    );

    fireEvent.click(getByText(contact.phone.display));
    expect(lastEvent()).toMatchObject({
      event: "phone_click",
      location: "footer",
    });
  });

  it("tells Viber and Telegram apart", () => {
    const { getByText } = render(
      <div data-analytics-location="contact_page">
        <ContactLinkTracker />
        <a href={contact.viberHref}>Viber</a>
        <a href={contact.telegramHref}>Telegram</a>
      </div>,
    );

    fireEvent.click(getByText("Viber"));
    expect(lastEvent()).toMatchObject({
      event: "messenger_click",
      channel: "viber",
      location: "contact_page",
    });

    fireEvent.click(getByText("Telegram"));
    expect(lastEvent()).toMatchObject({
      event: "messenger_click",
      channel: "telegram",
      location: "contact_page",
    });
  });

  it("counts a click on the label inside the link, not just the link itself", () => {
    // Real links wrap their text in spans, icons and `VisuallyHidden` labels,
    // so the click target is almost never the anchor element.
    const { getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <a href={`tel:${contact.phone.href}`}>
          <span>
            <strong>Зателефонувати</strong>
          </span>
        </a>
      </div>,
    );

    fireEvent.click(getByText("Зателефонувати"));
    expect(lastEvent()).toMatchObject({ event: "phone_click" });
  });

  it("ignores ordinary links, including the email and Instagram beside them", () => {
    // The footer puts `mailto:`, Instagram and Telegram in one list. Matching
    // Telegram by scheme would have made every https link a messenger handoff.
    const { getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        <a href={contact.instagram.url}>Instagram</a>
        {/* A raw `<a>` on purpose: the tracker reads the DOM, and what it has
            to ignore is an ordinary internal link. `next/link` renders the same
            anchor but would make the fixture about the router instead. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/rakovyny">Умивальники</a>
      </div>,
    );

    fireEvent.click(getByText(contact.email));
    fireEvent.click(getByText("Instagram"));
    fireEvent.click(getByText("Умивальники"));
    expect(events()).toHaveLength(0);
  });

  it("reports an unlabelled placement as one obvious row, not as the page", () => {
    // `"unknown"` rather than the pathname: a pathname fallback would split
    // the dimension across every page on the site and read like real data.
    const { getByText } = render(
      <div>
        <ContactLinkTracker />
        <a href={`tel:${contact.phone.href}`}>Дзвінок</a>
      </div>,
    );

    fireEvent.click(getByText("Дзвінок"));
    expect(lastEvent()).toMatchObject({ location: "unknown" });
  });

  it("still counts the tap when a handler upstream stops the click", () => {
    // A `tel:` tap hands off to the dialer immediately, so the push has to
    // already be in the queue. The capture-phase listener is what guarantees
    // that; a bubbling one would be silenced here.
    const { getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <div onClickCapture={(event) => event.stopPropagation()}>
          <a href={`tel:${contact.phone.href}`}>Дзвінок</a>
        </div>
      </div>,
    );

    fireEvent.click(getByText("Дзвінок"));
    expect(lastEvent()).toMatchObject({ event: "phone_click" });
  });

  it("stops listening once unmounted", () => {
    const { unmount, getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <a href={`tel:${contact.phone.href}`}>Дзвінок</a>
      </div>,
    );
    const link = getByText("Дзвінок");
    unmount();
    // `unmount` takes the link out of the document with it, and a click on a
    // detached node never reaches the document listener — which would pass
    // whether or not the listener was removed. Re-attaching is what makes the
    // click real; removing it again keeps it out of the next test's queries.
    document.body.appendChild(link);
    fireEvent.click(link);
    link.remove();

    expect(events()).toHaveLength(0);
  });

  it("queues the denied consent defaults ahead of the click it measures", () => {
    const { getByText } = render(
      <div data-analytics-location="footer">
        <ContactLinkTracker />
        <a href={`tel:${contact.phone.href}`}>Дзвінок</a>
      </div>,
    );

    fireEvent.click(getByText("Дзвінок"));
    const [first] = window.dataLayer ?? [];
    expect(Array.from(first as IArguments).slice(0, 2)).toEqual([
      "consent",
      "default",
    ]);
  });
});
