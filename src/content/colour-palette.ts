/**
 * Illustrative shade palette shown on `/colours` — and NOWHERE else.
 *
 * SCOPE, deliberately narrow (owner instruction, 2026-08-06: "на серійних ми
 * залишаємо все як є, не чіпай в товарах нічого"). This module must not be
 * imported by the product pages, the homepage `ColourPalette` block, `/samples`,
 * or anything else that implies an orderable option. It is editorial imagery for
 * one info page. The orderable colour model stays exactly where it is —
 * `src/data/product-colours.json` + `src/lib/schemas/colour.ts` — untouched.
 *
 * WHY IT IS SEPARATE from `ProductColour` rather than reusing that type:
 * `ProductColourSchema` documents its entries as "a real, orderable finish —
 * not a marketing palette", carries `physicalSampleAvailable` and an
 * `ralOrNcsReference` that may only be filled in from the workshop's confirmed
 * pigment list. None of that is true here. These are examples of the kind of
 * shade the workshop is asked for most often; putting them in the product data
 * would be claiming nine finishes exist as catalogue options, which is exactly
 * the failure mode `demo: true` already flags on the six entries there.
 *
 * SOURCE of the framing, owner (2026-08-06): "вони можуть бути впринципі будь
 * які, можеш додати палітру самих популярних елегантних та красивий опис" —
 * colour is essentially unrestricted, so the page shows a curated sample of the
 * most-requested shades, explicitly labelled as examples rather than a range.
 * The accompanying prose in `info-pages.ts` says so in as many words; do not
 * edit this list into something that reads like a fixed catalogue.
 *
 * `hex` is a SCREEN APPROXIMATION only. Concrete is a mineral material whose
 * shade shifts with mixing, drying and finishing (see the "Чому кожен виріб
 * унікальний" section on the same page), so no hex here is a promise. That is
 * why every entry deliberately carries NO RAL/NCS code: per
 * `ProductColourSchema`, a reference may only be stated "if actually confirmed
 * against the workshop's pigment list — omit rather than guess". None is
 * confirmed, so none is shown.
 */
export type PaletteShade = {
  /** Stable React key + anchor id. Not a product slug — nothing resolves it. */
  slug: string;
  name: string;
  /** Screen approximation. See the module note — never a colour guarantee. */
  hex: string;
  /** One line on where the shade works. Design commentary, not a spec. */
  note: string;
};

export const colourPaletteShades: PaletteShade[] = [
  {
    slug: "naturalnyi-siryi",
    name: "Натуральний сірий",
    hex: "#9c9b96",
    note: "Колір самого матеріалу, без жодного пігменту. Найтепліший із сірих, з найвиразнішою фактурою.",
  },
  {
    slug: "svitlo-siryi",
    name: "Світло-сірий",
    hex: "#bdbbb5",
    note: "Спокійніша, менш контрастна варіація сірого. Добре працює в невеликих ванних кімнатах.",
  },
  {
    slug: "greige",
    name: "Грейж",
    hex: "#a3998c",
    note: "Сірий, зміщений у бежевий. Найуніверсальніший відтінок для інтер'єру з деревом.",
  },
  {
    slug: "pisochnyi",
    name: "Пісочний",
    hex: "#c5b69e",
    note: "Теплий мінеральний тон, близький за настроєм до вапняку й травертину.",
  },
  {
    slug: "kremovyi",
    name: "Кремовий",
    hex: "#ded5c6",
    note: "Найсвітліший із теплих. Візуально полегшує масивний виріб.",
  },
  {
    slug: "pudrovyi",
    name: "Пудровий",
    hex: "#c3a09c",
    note: "Приглушений рожевий із сірою підосновою — теплий, але стриманий.",
  },
  {
    slug: "terakota",
    name: "Теракота",
    hex: "#b0705c",
    note: "Найнасиченіший із теплих. Працює як акцент — один виріб на весь простір.",
  },
  {
    slug: "hrafit",
    name: "Графіт",
    hex: "#54534f",
    note: "Темний сірий, на якому рельєф і межі форми читаються виразніше.",
  },
  {
    slug: "antratsyt",
    name: "Антрацит",
    hex: "#343330",
    note: "Майже чорний. Пори на ньому помітніші — це частина характеру матеріалу.",
  },
];
