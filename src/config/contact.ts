/**
 * Centralised, owner-confirmed contact data — the single source of truth for
 * every place the site shows how to reach ODUDLAB (footer, contact page,
 * callback confirmations, etc.). Do not duplicate these values inline
 * elsewhere; import from here instead.
 *
 * Everything below has been explicitly confirmed. Do NOT add other channels
 * (Pinterest, Behance, working hours, additional phone numbers…) until the
 * owner confirms them — an unconfirmed/wrong contact detail is worse than a
 * missing one.
 */
export const contact = {
  address: {
    /** Single-line, as given by the owner — Kyiv showroom/pickup point. */
    line: "Київ, вул. Заболотного, 17, ВДНГ, павільйон 49",
    /**
     * Exact pin the owner dropped on Google Maps (shared as
     * https://maps.app.goo.gl/2XziszuR4LxzhJ1v8, which resolves to these
     * coordinates). Used to build the "Відкрити на карті" link so it points
     * at the precise location instead of a fuzzy address-string search.
     */
    coords: { lat: 50.360054, lng: 30.47469 },
  },
  email: "odudlab@gmail.com",
  /** E.164-ish display format as confirmed; used for tel:/viber/telegram links too. */
  phone: {
    display: "+380 96 154 55 84",
    href: "+380961545584",
  },
  instagram: {
    handle: "@odudlab",
    url: "https://instagram.com/odudlab",
  },
  /**
   * Same primary number doubles as Viber and Telegram per the owner.
   *
   * The `+` in the Telegram href is load-bearing: `t.me/<digits>` is read as
   * a *username* lookup and resolves to nothing (Telegram serves its generic
   * landing page), while `t.me/+<E.164>` is the phone-number deep link. The
   * link looked fine and quietly went nowhere.
   */
  viberHref: "viber://chat?number=%2B380961545584",
  telegramHref: "https://t.me/+380961545584",
  /**
   * Not yet confirmed by the owner — keep `null` (never invent a URL).
   * Flip to a real, confirmed URL once available; the footer only renders
   * these when non-null.
   */
  pinterestUrl: null as string | null,
  behanceUrl: null as string | null,
  /**
   * Working hours are intentionally omitted site-wide until the owner
   * verifies them (see AGENTS/README "what's next"). Do not add a schedule
   * here from guesswork.
   */
  workingHours: null as string | null,
} as const;
