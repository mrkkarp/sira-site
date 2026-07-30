/**
 * Structural nav config — hrefs and dictionary key references only, no
 * copy. Labels are pulled from the `megaMenu`/`nav` dictionaries so every
 * item stays translatable.
 *
 * `sinkTypes`' first three entries (`?mount=...`) are real, data-backed
 * filters (Prompt 5 — the shop's `mount` facet, values `countertop` /
 * `wall-mounted` / `freestanding`, from `ShopCategorySchema`'s `sinkType`).
 * The remaining `sinkTypes` entries (`tap-hole`/`size`/`basins`) and all of
 * `shapes` (`shape=...`) reference filters that are NOT implemented — the
 * source data has no tap-hole, single/double-basin, or shape fields to
 * filter on. Those links still resolve (the shop's filter parser silently
 * ignores unknown query params rather than crashing) but simply show the
 * unfiltered category — see Prompt 5's final report "known limitations".
 */

export type NavLink = { labelKey: string; href: string };

export const catalogMenu = {
  categories: [
    { labelKey: "allProducts", href: "/shop" },
    { labelKey: "sinks", href: "/shop/sinks" },
    { labelKey: "planters", href: "/shop/planters" },
    { labelKey: "tables", href: "/shop/tables" },
    { labelKey: "wallModules", href: "/shop/wall-modules" },
    { labelKey: "wallPanels", href: "/shop/wall-panels" },
    { labelKey: "wallArt", href: "/shop/wall-art" },
    { labelKey: "outdoor", href: "/shop/outdoor" },
    { labelKey: "custom", href: "/contact" },
    { labelKey: "samples", href: "/samples" },
  ] satisfies NavLink[],

  sinkTypes: [
    { labelKey: "sinkCountertop", href: "/shop/sinks?mount=countertop" },
    { labelKey: "sinkWallMounted", href: "/shop/sinks?mount=wall-mounted" },
    { labelKey: "sinkFreestanding", href: "/shop/sinks?mount=freestanding" },
    { labelKey: "sinkWithTapHole", href: "/shop/sinks?tap-hole=yes" },
    { labelKey: "sinkWithoutTapHole", href: "/shop/sinks?tap-hole=no" },
    { labelKey: "sinkCompact", href: "/shop/sinks?size=compact" },
    { labelKey: "sinkDouble", href: "/shop/sinks?basins=double" },
    { labelKey: "sinkCustomSize", href: "/shop/sinks?size=custom" },
  ] satisfies NavLink[],

  shapes: [
    { labelKey: "shapeRound", href: "/shop/sinks?shape=round" },
    { labelKey: "shapeOval", href: "/shop/sinks?shape=oval" },
    { labelKey: "shapeRectangular", href: "/shop/sinks?shape=rectangular" },
    { labelKey: "shapeSquare", href: "/shop/sinks?shape=square" },
    { labelKey: "shapeCylindrical", href: "/shop/sinks?shape=cylindrical" },
    { labelKey: "shapeSculptural", href: "/shop/sinks?shape=sculptural" },
    { labelKey: "shapeTextured", href: "/shop/sinks?shape=textured" },
  ] satisfies NavLink[],
};

/** Digital preview colours for the mega-menu swatch column — same caveat
 * as `src/lib/schemas/colour.ts`: screen approximation only. */
export const catalogMenuColours = [
  { labelKey: "white", href: "/shop?colour=white", hex: "#FAF9F5" },
  { labelKey: "lightGrey", href: "/shop?colour=light-grey", hex: "#C9C4BA" },
  { labelKey: "graphite", href: "/shop?colour=graphite", hex: "#343536" },
  { labelKey: "black", href: "/shop?colour=black", hex: "#1D1D1B" },
  { labelKey: "sand", href: "/shop?colour=sand", hex: "#D8D0B8" },
  { labelKey: "terracotta", href: "/shop?colour=terracotta", hex: "#B85B42" },
  { labelKey: "olive", href: "/shop?colour=olive", hex: "#7B806B" },
  { labelKey: "blue", href: "/shop?colour=blue", hex: "#5D7882" },
  { labelKey: "burgundy", href: "/shop?colour=burgundy", hex: "#7A3B3B" },
  { labelKey: "customRal", href: "/colours", hex: "#9E9D98" },
];

export const collectionsMenu: NavLink[] = [
  { labelKey: "new", href: "/collections/new" },
  { labelKey: "bestsellers", href: "/collections/bestsellers" },
  { labelKey: "minimalism", href: "/collections/minimalism" },
  { labelKey: "texturedConcrete", href: "/collections/textured-concrete" },
  { labelKey: "smallSpaces", href: "/collections/small-spaces" },
  { labelKey: "outdoor", href: "/collections/outdoor" },
  { labelKey: "custom", href: "/collections/custom" },
  { labelKey: "all", href: "/collections" },
];

export const brandMenu: NavLink[] = [
  { labelKey: "about", href: "/about" },
  { labelKey: "production", href: "/about#production" },
  { labelKey: "materials", href: "/about#materials" },
  { labelKey: "care", href: "/care" },
  { labelKey: "warranty", href: "/warranty" },
  { labelKey: "faq", href: "/faq" },
  { labelKey: "contact", href: "/contact" },
];

export const designersMenu: NavLink[] = [
  { labelKey: "terms", href: "/designers" },
  { labelKey: "samples", href: "/samples" },
  { labelKey: "catalogues", href: "/resources" },
  { labelKey: "models3d", href: "/resources#3d-models" },
  { labelKey: "drawings", href: "/resources#drawings" },
  { labelKey: "specifications", href: "/resources#specifications" },
  { labelKey: "quoteRequest", href: "/contact" },
];

export type MegaMenuKey = "catalog" | "collections" | "brand" | "designers";

type PrimaryNavItem = { key: string; href: string; mega?: MegaMenuKey };

/** Top-level header nav — `mega` names one of the menus above; omit for a plain link. */
export const primaryNav: PrimaryNavItem[] = [
  { key: "shop", href: "/shop", mega: "catalog" },
  { key: "collections", href: "/collections", mega: "collections" },
  { key: "colours", href: "/colours" },
  { key: "projects", href: "/projects" },
  { key: "brand", href: "/about", mega: "brand" },
  { key: "designers", href: "/designers", mega: "designers" },
  { key: "contact", href: "/contact" },
];
