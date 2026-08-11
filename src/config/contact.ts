import type { Locale } from "@/i18n/config";

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
    /**
     * Single-line, as given by the owner — Kyiv showroom/pickup point.
     *
     * Per locale, because the Ukrainian line sat untranslated on the English
     * and Polish pages next to a translated "Address" label, reading as a
     * leftover rather than as an address (owner, 2026-08-11: «переклади
     * також»). Same fix and same reasoning as `ProjectPlace` in
     * `src/content/projects.ts`.
     *
     * The Latin lines are a **transliteration, not a rewrite**, and that
     * limit is the whole discipline here — this is owner-confirmed contact
     * data, and an address is the one string on the site where being
     * plausible is worthless and being exact is everything:
     *
     *  - `Заболотного` → `Zabolotnoho`, the official Ukrainian romanisation.
     *    Not expanded to "Akademika Zabolotnoho": the street very probably is
     *    that one, but the owner wrote three words and inventing a fourth in
     *    an address is exactly the move this file exists to prevent.
     *  - `ВДНГ` → `VDNG`, which is the complex's own Latin branding, not a
     *    guess at one. Left as an abbreviation rather than expanded to
     *    "Expocenter of Ukraine": the sign at the gate says VDNG, and a
     *    visitor matching text to signage is the only thing that matters.
     *  - `павільйон` → `pavilion` / `pawilon`. A common noun, safe to render.
     *
     * Ukrainian stays the source and is what a courier or a Nova Poshta form
     * wants; nothing here replaces it, and `coords` — not any of these
     * strings — is what the map link resolves.
     */
    line: {
      uk: "Київ, вул. Заболотного, 17, ВДНГ, павільйон 49",
      en: "Kyiv, 17 Zabolotnoho St., VDNG, pavilion 49",
      pl: "Kijów, ul. Zabolotnoho 17, VDNG, pawilon 49",
    } as Record<Locale, string>,
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
