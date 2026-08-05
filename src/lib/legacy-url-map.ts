/**
 * The pre-Horoshop URL map: 466 old addresses, none of which the migration
 * knew about.
 *
 * ## Why this file exists at all
 *
 * The redirect map built during the migration came 1:1 out of the old site's
 * own sitemaps — 96 products + 76 categories + 12 pages = exactly 184 `locs`,
 * every one of them a `Redirects` row. That map is correct and stays. What it
 * could not contain is the URLs the sitemap no longer listed: odudlab.com ran
 * on WordPress/WooCommerce before Horoshop, and on an *earlier* Horoshop
 * scheme before the one that was exported. Both generations are still indexed,
 * still linked, and still being clicked.
 *
 * `/kategoriya/umyvalnuku/` is the one that surfaced it: a live URL the old
 * server answers with its own `301`, and the new site answered `404`. Walking
 * the Wayback CDX inventory (`odudlab.com*`, status 200) and replaying all 683
 * paths against production found **490 more of them**, in these families:
 *
 * | family                        | what it was                          |
 * | ----------------------------- | ------------------------------------ |
 * | `/kategoriya/<slug>`          | WooCommerce category archive         |
 * | `/produkciya/<cat>/<slug>`    | WooCommerce product                  |
 * | `/katalog/<slug>`             | the *earlier* Horoshop product URLs  |
 * | `/komplekt/<slug>`            | planter + stand bundles              |
 * | `/blog/<slug>`                | eleven real posts                    |
 * | `/b/ /price/ /tsvet/ /ves/ /vysota/` | Horoshop faceted filters      |
 * | `/ru/…`                       | a Russian twin of nearly all of it   |
 *
 * ## The rule the owner set
 *
 * «Усі редіректи мають відповідати ідентичним або схожим сторінкам на новому
 * сайті. Якщо немає відповідної — то просто на головну.» So: `301` to the
 * closest real page, and the homepage only when nothing on the site is close.
 * There are no `410`s here, and that is a deliberate departure from the
 * treatment `GONE_PATHS` gives the Horoshop *demo* catalogue — see the note in
 * `src/lib/gone-paths.ts` for why the two lists are judged differently.
 *
 * Closeness was resolved from live data, never guessed. Where an old product
 * still exists it points at that product (`/katalog/rakovina-betonnaya-tower`
 * → `/products/tower`); the ambiguous ones were settled by fetching the new
 * site's `<title>` for all 30 candidates and the product list of all 8
 * category pages, which is how `copy-monro` was confirmed to be MONRO with
 * flutes and `copy-odri-nakladna-530` to be SOLO. Where the product is
 * discontinued it points at the category that sells its successors. Only
 * lines the catalogue abandoned entirely — concrete lamps, garden sculptures,
 * candlesticks — go to the homepage.
 *
 * ## Why code and not `Redirects` rows
 *
 * Three reasons, in order of weight:
 *
 * 1. `/ru/` is one rule here and 193 rows there. The proxy strips the prefix
 *    before the lookup, so every Russian twin resolves through its Ukrainian
 *    entry — including the twins of the 184 rows already in the database.
 * 2. The filter namespaces are an *unbounded* URL space. `/b/15-30-sm`,
 *    `/price/1000-2000`, `/tsvet/ral-7047` compose freely; exact-match rows
 *    can only ever cover the combinations that happened to be crawled. A
 *    prefix rule covers all of them.
 * 3. It is testable. `legacy-url-map.test.ts` asserts every target is a route
 *    this site actually serves, so a category rename cannot quietly turn a
 *    301 into a 404 — which is precisely what happened to the fossil
 *    `/vulychni → /shop/outdoor` row that lived in the database.
 *
 * At 466 rules a plain `Map` is the whole optimisation. Next's own guidance
 * reaches for Edge Config and a bloom filter "to manage a large number of
 * redirects (1000+)" (`02-guides/redirecting.md`); below that threshold an
 * in-module `Map` is a hash lookup against memory the isolate already holds,
 * and it costs no round-trip at all — which is the point, because the
 * database lookup it runs *before* costs ~30–50 ms.
 */

/**
 * Prefix rules, first match wins. Two different jobs in one list:
 *
 * The first eight are *generalisations* — namespaces where the old site
 * composed URLs from facets and no enumerated list can be complete.
 *
 * The last five are *safety nets*. `/katalog/`, `/kategoriya/`,
 * `/produkciya/`, `/komplekt/` and `/blog/` are dead namespaces: nothing on
 * this site serves them, so anything arriving under one is by definition an
 * address from a previous generation. The exact map below answers the 466 the
 * inventory found; these catch the ones it missed, and the Wayback inventory
 * is certainly incomplete — it only ever sees what a crawler happened to fetch.
 * A visitor landing on the catalogue beats a visitor landing on a dead end.
 */
const PREFIX_RULES: ReadonlyArray<readonly [string, string]> = [
  // Blog *taxonomy* pages. There are no rubrics on this site to map them to,
  // and unlike the posts themselves they had no content of their own.
  ["/post-cat/", "/"],
  // `/material/<slug>` described what the products are made of.
  ["/material/", "/about"],

  // Horoshop's faceted filters: height, price, colour, weight, height again
  // (`/b/` and `/vysota/` are the same facet under two names), plus the
  // WordPress product tags. Each was a narrowed view of the catalogue, so the
  // similar page is the catalogue.
  ["/b/", "/shop"],
  ["/price/", "/shop"],
  ["/tsvet/", "/shop"],
  ["/ves/", "/shop"],
  ["/vysota/", "/shop"],
  ["/product-tag/", "/shop"],

  // Dead namespaces — see above.
  ["/katalog/", "/shop"],
  ["/kategoriya/", "/shop"],
  ["/produkciya/", "/shop"],
  ["/komplekt/", "/shop"],
  ["/blog/", "/"],
];

/**
 * Reduce an old address to the form the map is keyed on.
 *
 * Runs on the path the proxy has *already* stripped `/en` or `/pl` from, so
 * only the three things the proxy cannot know about are handled here:
 *
 * `/ru`   — a locale this site does not have and is not going to. It was the
 *           old site's second language and it doubled the entire URL space;
 *           stripping it here is what turns 193 dead Russian addresses into
 *           zero extra rules. The Ukrainian page is the honest destination:
 *           there is no Russian version to send anyone to.
 * `/page/N` — WordPress archive pagination. Page 3 of a category that no
 *           longer exists is the same answer as page 1 of it.
 * `/feed`  — the RSS twin of any archive. `/feed` on its own is not stripped
 *           (it would reduce to `/` and stop being a legacy path at all); it
 *           is listed in the map as itself.
 */
export function normaliseLegacyPath(barePath: string): string {
  let path = barePath.startsWith("/ru/")
    ? barePath.slice(3)
    : barePath === "/ru"
      ? "/"
      : barePath;
  path = path.replace(/\/page\/\d+$/, "") || "/";
  path = path.replace(/(?<=.)\/feed$/, "");
  return path || "/";
}

/**
 * The closest current page for an old address, or `null` if this file has
 * nothing to say about it — in which case the proxy falls through to the
 * `Redirects` collection and then to its `404`.
 *
 * Exact entries are consulted before prefixes so that a rule which knows the
 * *product* always beats the rule that only knows the namespace.
 */
export function findStaticLegacyRedirect(barePath: string): string | null {
  const path = normaliseLegacyPath(barePath);
  const exact = LEGACY_URL_MAP.get(path);
  if (exact) return exact;
  for (const [prefix, target] of PREFIX_RULES) {
    if (path.startsWith(prefix)) return target;
  }
  return null;
}

/**
 * Old path → closest current page. Keyed on the normalised, locale-free form.
 *
 * Grouped by destination and by the reason for it, largest group first. The
 * comments are the audit trail: each says *why* that destination is the
 * similar page, because in a year the slugs will mean nothing on their own.
 */
export const LEGACY_URL_MAP: ReadonlyMap<string, string> = new Map([
  // discontinued product → the category that sells its successors → /vazony
  ["/katalog/betonna-vaza-slim-70", "/vazony"],
  ["/katalog/betonna-vaza-slim-cuadrado", "/vazony"],
  ["/katalog/betonna-vaza-slim-cuadrado-2", "/vazony"],
  ["/katalog/betonna-vaza-slim-little", "/vazony"],
  ["/katalog/betonna-vaza-slim-little-cuadrado", "/vazony"],
  ["/katalog/betonnaya-vaza-slim-little-cuadrado", "/vazony"],
  ["/katalog/gorshhyk-z-betonu-tsylindr-15", "/vazony"],
  ["/katalog/gorshhyk-z-betonu-tsylindr-7", "/vazony"],
  ["/katalog/gorshhyk-z-betonu-tsylindr-9", "/vazony"],
  ["/katalog/gorshok-yz-betona-tsylyndr-15", "/vazony"],
  ["/katalog/gorshok-yz-betona-tsylyndr-20", "/vazony"],
  ["/katalog/komplekt-cilindr-20-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-deco-mini-4-shtuky", "/vazony"],
  ["/katalog/komplekt-deco-mini-4-shtuky-2", "/vazony"],
  ["/katalog/komplekt-elips-60-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-elyps-60-podstavka-linea", "/vazony"],
  [
    "/katalog/komplekt-gorshhyky-z-betonu-tsylindr-33sm-ral-7047-3sht-na-pidstavkah",
    "/vazony",
  ],
  [
    "/katalog/komplekt-gorshky-yz-betona-tsylyndr-33sm-ral-7047-na-podstavkah",
    "/vazony",
  ],
  ["/katalog/komplekt-napivsfera-25-pidstavka-cuadrado", "/vazony"],
  ["/katalog/komplekt-napivsfera-30-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-polusfera-25-podstavka-suadrado", "/vazony"],
  ["/katalog/komplekt-polusfera-30-podstavka-linea", "/vazony"],
  ["/katalog/komplekt-polusfera-50-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-polusfera-50-podstavka-linea", "/vazony"],
  ["/katalog/komplekt-polusfera-pidstavka-cuadrado", "/vazony"],
  ["/katalog/komplekt-polusfera-podstavka-cuadrado", "/vazony"],
  ["/katalog/komplekt-polusfera-polka-cuadrado", "/vazony"],
  ["/katalog/komplekt-polusfera-polka-cuadrado-2", "/vazony"],
  ["/katalog/komplekt-tsylindr-15-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-tsylindr-33-pidstavka-linea", "/vazony"],
  ["/katalog/komplekt-tsylyndr-15-podstavka-linea", "/vazony"],
  ["/katalog/komplekt-tsylyndr-20-podstavka-linea", "/vazony"],
  ["/katalog/komplekt-tsylyndr-33-podstavka-linea", "/vazony"],
  ["/katalog/komplekt-vazoniv-z-betonu-deco-mini-4-shtuky", "/vazony"],
  ["/katalog/komplekt-vazoniv-z-betonu-kub-cuadrado-4-shtuky", "/vazony"],
  ["/katalog/komplekt-vazoniv-z-betonu-pivsfera-4-shtuky", "/vazony"],
  ["/katalog/komplekt-vazonov-yz-betona-kub-cuadrado-4-shtuky", "/vazony"],
  ["/katalog/komplekt-vazonov-yz-betona-polusfera-4-shtuky", "/vazony"],
  ["/katalog/kopiya-vazon-yz-betona-kub-cuadrado-11", "/vazony"],
  ["/katalog/kopiya-vazon-z-betonu-kub-suadrado-30", "/vazony"],
  ["/katalog/kopiya-vazon-z-betonu-kub-suadrado-31", "/vazony"],
  ["/katalog/vaza-little-slim", "/vazony"],
  ["/katalog/vaza-slim", "/vazony"],
  ["/katalog/vaza-slim-2", "/vazony"],
  ["/katalog/vaza-slim-70", "/vazony"],
  ["/katalog/vaza-slim-sale-50", "/vazony"],
  ["/katalog/vazon-dlya-komnatnyh-rastenij-12x22x18sm", "/vazony"],
  ["/katalog/vazon-dlya-komnatnyh-rastenij-6x12x4sm", "/vazony"],
  ["/katalog/vazon-dlya-komnatnyh-rastenij-7x17x12sm", "/vazony"],
  ["/katalog/vazon-doya-komnatnyh-rastenij-12x29x26sm", "/vazony"],
  ["/katalog/vazon-flute", "/vazony"],
  ["/katalog/vazon-konus-10", "/vazony"],
  ["/katalog/vazon-konus-23", "/vazony"],
  ["/katalog/vazon-konus-28-2", "/vazony"],
  ["/katalog/vazon-konus-40", "/vazony"],
  ["/katalog/vazon-kub-10", "/vazony"],
  ["/katalog/vazon-kub-400", "/vazony"],
  ["/katalog/vazon-kub-60", "/vazony"],
  ["/katalog/vazon-kub-80", "/vazony"],
  ["/katalog/vazon-polusfera-15", "/vazony"],
  ["/katalog/vazon-polusfera-29-sale-50", "/vazony"],
  ["/katalog/vazon-tsilindr-33", "/vazony"],
  ["/katalog/vazon-tsilindr-7", "/vazony"],
  ["/katalog/vazon-tsilindr-9", "/vazony"],
  ["/katalog/vazon-yz-betona-elyps-linea-30", "/vazony"],
  ["/katalog/vazon-yz-betona-elyps-linea-60", "/vazony"],
  ["/katalog/vazon-yz-betona-kub-cuadrado-11", "/vazony"],
  ["/katalog/vazon-yz-betona-kub-cuadrado-15", "/vazony"],
  ["/katalog/vazon-yz-betona-kub-cuadrado-16", "/vazony"],
  ["/katalog/vazon-yz-betona-kub-suadrado-30", "/vazony"],
  ["/katalog/vazon-yz-betona-kub-suadrado-31", "/vazony"],
  ["/katalog/vazon-yz-betona-sfera-11", "/vazony"],
  ["/katalog/vazon-yz-betona-tsylyndr-33-ral-7047", "/vazony"],
  ["/katalog/vazon-yz-betona-tsylyndr-4040", "/vazony"],
  ["/katalog/vazon-yz-betona-tsylyndr-4060", "/vazony"],
  ["/katalog/vazon-z-betonu-elips-linea-30", "/vazony"],
  ["/katalog/vazon-z-betonu-konus-10", "/vazony"],
  ["/katalog/vazon-z-betonu-konus-23", "/vazony"],
  ["/katalog/vazon-z-betonu-konus-28", "/vazony"],
  ["/katalog/vazon-z-betonu-konus-40", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-10", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-40", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-60", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-80", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-linea-31", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-suadrado-22", "/vazony"],
  ["/katalog/vazon-z-betonu-kub-suadrado-23", "/vazony"],
  ["/katalog/vazon-z-betonu-pivsfera-20", "/vazony"],
  ["/katalog/vazon-z-betonu-pivsfera-25", "/vazony"],
  ["/katalog/vazon-z-betonu-pivsfera-30", "/vazony"],
  ["/katalog/vazon-z-betonu-sfera-11", "/vazony"],
  ["/produkciya/akcia/vaza-slim-70", "/vazony"],
  ["/produkciya/vazony/vaza-little-slim", "/vazony"],
  ["/produkciya/vazony/vaza-slim", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnanyh-rastenij-16sm", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-12x22x10sm", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-12x22x18sm", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-6x12x4sm", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-7x17x12sm", "/vazony"],
  ["/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-7x17x8sm", "/vazony"],
  [
    "/produkciya/vazony/vazon-dlya-komnatnyh-rastenij-betonnyj-shar-11x4sm",
    "/vazony",
  ],
  ["/produkciya/vazony/vazon-doya-komnatnyh-rastenij-12x29x26sm", "/vazony"],
  ["/produkciya/vazony/vazon-konus-10", "/vazony"],
  ["/produkciya/vazony/vazon-konus-23", "/vazony"],
  ["/produkciya/vazony/vazon-konus-28-2", "/vazony"],
  ["/produkciya/vazony/vazon-konus-40", "/vazony"],
  ["/produkciya/vazony/vazon-kub-10", "/vazony"],
  ["/produkciya/vazony/vazon-trapetsiya-40", "/vazony"],
  ["/produkciya/vazony/vazon-tsilindr-7", "/vazony"],
  ["/produkciya/vazony/vazon-tsilindr-9", "/vazony"],

  // discontinued bundle → the category it belonged to → /vazony
  ["/komplekt/kolo-170sm", "/vazony"],
  ["/komplekt/kolo-170sm-ru", "/vazony"],
  ["/komplekt/komplekt-4-sht-vazon-polka-vsi-rozmiry", "/vazony"],
  ["/komplekt/komplekt-4-sht-vazon-polka-vsi-rozmiry-ru", "/vazony"],
  ["/komplekt/komplekt-4sht-vazon-pidstavka-vsi-rozmiry", "/vazony"],
  ["/komplekt/komplekt-4sht-vazon-pidstavka-vsi-rozmiry-ru", "/vazony"],
  ["/komplekt/kvadrat-120sm", "/vazony"],
  ["/komplekt/kvadrat-120sm-ru", "/vazony"],
  ["/komplekt/polusfera-15sm-polka", "/vazony"],
  ["/komplekt/polusfera-15sm-polka-ru", "/vazony"],
  ["/komplekt/polusfera-20sm-polka", "/vazony"],
  ["/komplekt/polusfera-20sm-polka-ru", "/vazony"],
  ["/komplekt/polusfera-25sm-polka", "/vazony"],
  ["/komplekt/polusfera-25sm-polka-ru", "/vazony"],
  ["/komplekt/polusfera-30sm-polka", "/vazony"],
  ["/komplekt/polusfera-30sm-polka-ru", "/vazony"],
  ["/komplekt/polusfera_15_i_cuadrado", "/vazony"],
  ["/komplekt/polusfera_15_i_cuadrado-ru", "/vazony"],
  ["/komplekt/polusfera_20_i_cuadrado", "/vazony"],
  ["/komplekt/polusfera_20_i_cuadrado-ru", "/vazony"],
  ["/komplekt/polusfera_25_i_cuadrado", "/vazony"],
  ["/komplekt/polusfera_25_i_cuadrado-ru", "/vazony"],
  ["/komplekt/polusfera_30_i_cuadrado", "/vazony"],
  ["/komplekt/polusfera_30_i_cuadrado-ru", "/vazony"],
  ["/komplekt/vazon-na-vysokij-vazon-na-nyzkij-pidstavkah-2sht", "/vazony"],
  ["/komplekt/vazon-na-vysokij-vazon-na-nyzkij-pidstavkah-2sht-ru", "/vazony"],
  ["/komplekt/vazon-pidstavka-10sm", "/vazony"],
  ["/komplekt/vazon-pidstavka-10sm-ru", "/vazony"],
  ["/komplekt/vazon-pidstavka-12sm", "/vazony"],
  ["/komplekt/vazon-pidstavka-12sm-ru", "/vazony"],
  ["/komplekt/vazon-pidstavka-20sm", "/vazony"],
  ["/komplekt/vazon-pidstavka-20sm-ru", "/vazony"],
  ["/komplekt/vazon-pidstavka-27sm", "/vazony"],
  ["/komplekt/vazon-pidstavka-27sm-ru", "/vazony"],
  ["/komplekt/vazon-pidstavka-6sm", "/vazony"],
  ["/komplekt/vazon-pidstavka-6sm-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_1100", "/vazony"],
  ["/komplekt/vazon_i_linea_1100-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_15sm", "/vazony"],
  ["/komplekt/vazon_i_linea_15sm-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_400", "/vazony"],
  ["/komplekt/vazon_i_linea_400-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_45sm", "/vazony"],
  ["/komplekt/vazon_i_linea_45sm-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_600", "/vazony"],
  ["/komplekt/vazon_i_linea_600-ru", "/vazony"],
  ["/komplekt/vazon_i_linea_700", "/vazony"],
  ["/komplekt/vazon_i_linea_700-ru", "/vazony"],

  // line abandoned entirely, nothing on the site is close → /
  ["/katalog/betonnyj-svitylnyk-kelyh", "/"],
  ["/katalog/betonnyj-svitylnyk-kulya", "/"],
  ["/katalog/betonnyj-svitylnyk-tsylindr", "/"],
  ["/katalog/budda", "/"],
  ["/katalog/dekoratyvna-statua-z-betonu-budda", "/"],
  ["/katalog/dekoratyvna-statuetka-z-betonu-budda", "/"],
  ["/katalog/dekoratyvnaya-statuetka-yz-betona-budda", "/"],
  ["/katalog/dekoratyvnoe-nastennoe-panno-yz-betona-budda", "/"],
  ["/katalog/kaktus", "/"],
  ["/katalog/kaktus-2", "/"],
  ["/katalog/kopiya-betonnyj-svitylnyk-retro", "/"],
  ["/katalog/pidsvichnyk-double-cube", "/"],
  ["/katalog/pidsvichnyk-single-cube", "/"],
  ["/katalog/pingvin", "/"],
  ["/katalog/pingvin-2", "/"],
  ["/katalog/sadova-skulptura-zhuk-olen", "/"],
  ["/katalog/sadova-skulptura-zhuk-olen-2", "/"],
  ["/katalog/sadovaya-skulptura-zhuk-olen", "/"],
  ["/katalog/svetilnik-sfera-16-sm", "/"],
  ["/katalog/svetilnik-tsilindr-41", "/"],
  ["/katalog/svetilnik-tsilindr-41-2", "/"],
  ["/katalog/zhuk-olen-3", "/"],
  ["/katalog/zhuk-olen-4", "/"],
  ["/katalog/zhuk-olen-5", "/"],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-1100",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-140",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-190",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-230-700",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-240",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-4",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-5",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-cuadrodo-310",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-linea-1100",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-linea-400",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-podstavka-dlya-tsvetov-linea-700",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-polka-dlya-tsvetov",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-polka-dlya-tsvetov-cuadrado-200",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-polka-dlya-tsvetov-cuadrado-320",
    "/",
  ],
  [
    "/produkciya/podstavki-dlya-tsvetov/metallicheskaya-polka-dlya-tsvetov-suadrado-150",
    "/",
  ],
  ["/produkciya/skylptyru/kaktus", "/"],
  ["/produkciya/skylptyru/pingvin", "/"],
  ["/produkciya/skylptyru/sadovaya-skulptura-zhuk-olen", "/"],
  ["/produkciya/skylptyru/zhuk-olen-3", "/"],
  ["/produkciya/skylptyru/zhuk-olen-4", "/"],
  ["/produkciya/svetilniki/svetilnik-sfera-16-sm", "/"],
  ["/produkciya/svetilniki/svetilnik-tsilindr-41", "/"],
  ["/produkciya/svetilniki/svetilnik-tsilindr-41-2", "/"],

  // planter accessory (same Cuadrado/Linea model names) → planters → /vazony
  ["/katalog/metaleva-pidstavka-dlya-vazoniv-cuadrado-140", "/vazony"],
  ["/katalog/metaleva-polytsya-dlya-kvitiv-suadrado-150", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-1100", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-140", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-190", "/vazony"],
  [
    "/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-230-700",
    "/vazony",
  ],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-240", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrado-4", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-cuadrodo-310", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-linea-1100", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-linea-300", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-linea-400", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-linea-600", "/vazony"],
  ["/katalog/metallicheskaya-podstavka-dlya-tsvetov-linea-700", "/vazony"],
  ["/katalog/metallicheskaya-polka-dlya-tsvetov", "/vazony"],
  ["/katalog/metallicheskaya-polka-dlya-tsvetov-cuadrado-200", "/vazony"],
  ["/katalog/metallicheskaya-polka-dlya-tsvetov-cuadrado-320", "/vazony"],
  ["/katalog/metallicheskaya-polka-dlya-tsvetov-suadrado-150", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-1100", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-190", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-200", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-240", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-250", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-310", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-320", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-4", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-cuadrado-700", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-linea-1100", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-linea-300", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-linea-400", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-linea-600", "/vazony"],
  ["/katalog/pidstavka-dlya-kvitiv-loft-linea-700", "/vazony"],

  // discontinued product → the category that sells its successors → /rakovyny
  ["/katalog/nakladna-rakovyna-z-betonu-teja", "/rakovyny"],
  ["/katalog/nakladnaya-rakovyna-yz-betona-monro", "/rakovyny"],
  ["/katalog/nakladnaya-rakovyna-yz-betona-semi", "/rakovyny"],
  ["/katalog/nakladnaya-rakovyna-yz-betona-solo", "/rakovyny"],
  ["/katalog/napolnaya-rakovyna-yz-betona-monro-2", "/rakovyny"],
  ["/katalog/napolnaya-rakovyna-yz-betona-monro-s-kanelyuramy", "/rakovyny"],
  ["/katalog/napolnyj-umyvalnik-trump", "/rakovyny"],
  ["/katalog/plytka-na-rakovynu-z-betonu-trump", "/rakovyny"],
  ["/katalog/rakovyna-na-pol-yz-betona-odri-s-kannelyuramy", "/rakovyny"],
  ["/produkciya/umyvalniki/napolnyj-umyvalnik-trump", "/rakovyny"],
  ["/produkciya/umyvalniki/umyvalnik-slit", "/rakovyny"],
  ["/produkciya/umyvalniki/umyvlnik", "/rakovyny"],

  // category retired, no equivalent on this site → /
  ["/kategoriya/pidstavku-dlya-kvitiv", "/"],
  ["/kategoriya/pidstavky-dlya-kvitiv", "/"],
  ["/kategoriya/podstavki-dlya-tsvetov", "/"],
  ["/kategoriya/s3t", "/"],
  ["/kategoriya/s3t-ru", "/"],
  ["/kategoriya/skulptury-z-betonu-ta-armatury", "/"],
  ["/kategoriya/skylptyru", "/"],
  ["/kategoriya/svetilniki", "/"],
  ["/kategoriya/svitulnuku", "/"],
  ["/kategoriya/svitylnyky-z-betonu", "/"],

  // blog post → the page that now covers its subject → /projects
  ["/blog/kurazh-bazar-na-vdng-2019", "/projects"],
  ["/blog/kurazh-bazar-na-vdng-2019-2", "/projects"],
  ["/blog/make-my-cake", "/projects"],
  ["/blog/make-my-cake-2", "/projects"],
  ["/blog/proekt-vetnamskaya-bystronomyya-chang", "/projects"],
  ["/blog/v-yetnamska-bistronomiya-chang", "/projects"],
  ["/blog/vystavka-dlt-2019", "/projects"],
  ["/blog/vystavka-dlt-2019-2", "/projects"],
  ["/blog/vystavka-kiff-2020", "/projects"],
  ["/blog/vystavka-kiff-2020-2", "/projects"],

  // plumbing URL, never a page a human could read → /
  ["/comments", "/"],
  ["/feed", "/"],
  ["/globals.js", "/"],
  ["/my-account", "/"],
  ["/my-account-uk", "/"],
  ["/pdf", "/"],
  ["/pdf-uk", "/"],

  // discontinued product → the category that sells its successors → /vulychni-mebli
  ["/katalog/lava-z-betonu-seete-z-spynkoy", "/vulychni-mebli"],
  ["/katalog/lava-z-betonu-town-c-kolova", "/vulychni-mebli"],
  ["/katalog/lava-z-betonu-town-n-bez-spynkoyu", "/vulychni-mebli"],
  ["/katalog/lava-z-betonu-town-s-okrugla", "/vulychni-mebli"],
  ["/katalog/prystovburova-reshitka-urban", "/vulychni-mebli"],
  ["/katalog/prystvolnaya-reshetka-volcano", "/vulychni-mebli"],
  ["/katalog/urna-yz-betona-urban-b", "/vulychni-mebli"],

  // blog post → the page that now covers its subject → /about
  ["/blog/chi-mojna-zrobutu-kolir-betony-v-ral", "/about"],
  [
    "/blog/otvet-na-vopros-chto-znachyt-tehnyka-terrazzoo-y-pochemu-ono-dorozhe",
    "/about",
  ],
  ["/blog/otvet-na-vopros-mozhno-sdelat-tsvet-betona-v-ral", "/about"],
  [
    "/blog/otvet-na-vopros-tehnycheskye-harakterystyky-betona-ot-odudlab",
    "/about",
  ],
  [
    "/blog/vidpovid-na-pytannya-shho-znachyt-tehnika-terrazzoo-i-chomu-vono-dorozhche",
    "/about",
  ],
  [
    "/blog/vidpovid-na-pytannya-tehnichni-harakterystyky-betonu-vid-odudlab",
    "/about",
  ],

  // old category → its current equivalent → /vazony
  ["/kategoriya/ozelenenie", "/vazony"],
  ["/kategoriya/ozelenenie-ru", "/vazony"],
  ["/kategoriya/ozelenennya", "/vazony"],
  ["/kategoriya/vazon", "/vazony"],
  ["/kategoriya/vazony", "/vazony"],
  ["/kategoriya/vazony-z-betonu", "/vazony"],

  // blog post → the page that now covers its subject → /care
  ["/blog/otvet-na-vopros-kak-uhazhyvat-za-betonom-v-ynterere", "/care"],
  [
    "/blog/video-instruktsiya-po-pidklyuchennyu-syfona-do-shhilovoyi-rakovyny-z-betonu-odudlab",
    "/care",
  ],
  [
    "/blog/vidpovid-na-pytannya-yak-doglyadaty-za-betonom-v-inter-yeri",
    "/care",
  ],
  ["/blog/vydeo-ynstruktsyya-po-podklyuchenyyu-syfona", "/care"],

  // same product, new slug → /products/semi-nakladna
  ["/katalog/nakladna-rakovyna-z-betonu-semi", "/products/semi-nakladna"],
  ["/katalog/nakladna-rakovyna-z-betonu-semmi", "/products/semi-nakladna"],
  ["/katalog/umyvalnik-semi", "/products/semi-nakladna"],
  ["/produkciya/umyvalniki/umyvalnik-semi", "/products/semi-nakladna"],

  // old category → its current equivalent → /rakovyny
  ["/kategoriya/rakovyny-z-betonu", "/rakovyny"],
  ["/kategoriya/stilnytsi-z-betonu", "/rakovyny"],
  ["/kategoriya/umyvalniki", "/rakovyny"],
  ["/kategoriya/umyvalnuku", "/rakovyny"],

  // informational page → its current equivalent → /contact
  ["/kontakty", "/contact"],
  ["/kontakty-uk", "/contact"],
  ["/pytannia-vidpovid", "/contact"],

  // same product, new slug → /products/circle
  ["/katalog/zhurnalnyj-stolik-circle-2", "/products/circle"],
  ["/katalog/zhurnalnyj-stolyk-z-betonu-circle", "/products/circle"],
  ["/produkciya/mebel/zhurnalnyj-stolik-circle-2", "/products/circle"],

  // same product, new slug → /products/odri-nakladna
  ["/katalog/nakladna-rakovyna-z-betonu-odri", "/products/odri-nakladna"],
  ["/katalog/umyvalnik-odri", "/products/odri-nakladna"],
  ["/produkciya/umyvalniki/umyvalnik-odri", "/products/odri-nakladna"],

  // same product, new slug → /products/rakovyna-na-pidlohu-odri
  ["/katalog/napolnyj-umyvalnik-odri", "/products/rakovyna-na-pidlohu-odri"],
  [
    "/katalog/rakovyna-na-pidlogu-z-betonu-odri",
    "/products/rakovyna-na-pidlohu-odri",
  ],
  [
    "/produkciya/umyvalniki/napolnyj-umyvalnik-odri",
    "/products/rakovyna-na-pidlohu-odri",
  ],

  // same product, new slug → /products/square
  ["/katalog/napolnyj-umyvalnik-square", "/products/square"],
  ["/katalog/pidlogova-rakovyna-z-betonu-square", "/products/square"],
  ["/produkciya/umyvalniki/napolnyj-umyvalnik-square", "/products/square"],

  // same product, new slug → /products/square-nakladna
  ["/katalog/nakladna-rakovyna-z-betonu-square", "/products/square-nakladna"],
  ["/katalog/umyvalnik-square", "/products/square-nakladna"],
  ["/produkciya/umyvalniki/umyvalnik-square", "/products/square-nakladna"],

  // same product, new slug → /products/tower
  ["/katalog/rakovina-betonnaya-tower", "/products/tower"],
  ["/katalog/rakovyna-na-pidlogu-z-betonu-tower-teja", "/products/tower"],
  ["/produkciya/umyvalniki/rakovina-betonnaya-tower", "/products/tower"],

  // same product, new slug → /products/vazon-z-betonu-pivsfera-50
  ["/katalog/vazon-polusfera-50", "/products/vazon-z-betonu-pivsfera-50"],
  [
    "/katalog/vazon-z-betonu-pivsfera-50",
    "/products/vazon-z-betonu-pivsfera-50",
  ],
  [
    "/produkciya/vazony/vazon-polusfera-50",
    "/products/vazon-z-betonu-pivsfera-50",
  ],

  // same product, new slug → /products/zhurnalnyi-stolyk-z-betonu-caiman
  [
    "/katalog/zhurnalnyj-stolik-caiman",
    "/products/zhurnalnyi-stolyk-z-betonu-caiman",
  ],
  [
    "/katalog/zhurnalnyj-stolyk-z-betonu-caiman",
    "/products/zhurnalnyi-stolyk-z-betonu-caiman",
  ],
  [
    "/produkciya/mebel/zhurnalnyj-stolik-caiman",
    "/products/zhurnalnyi-stolyk-z-betonu-caiman",
  ],

  // discontinued product → the category that sells its successors → /stolyky
  ["/katalog/zhurnalnyj-stolyk-yz-betona-fish", "/stolyky"],
  ["/katalog/zhurnalnyj-stolyk-yz-betona-terrazzo", "/stolyky"],
  ["/katalog/zhurnalnyj-stolyk-z-betonu-terrazzo", "/stolyky"],

  // table bundle → the tables category → /stolyky
  ["/komplekt/circle-caiman", "/stolyky"],
  ["/komplekt/circle-circle", "/stolyky"],
  ["/komplekt/circle-fish", "/stolyky"],

  // informational page → its current equivalent → /about
  ["/o-masterskoj", "/about"],
  ["/pro-majsternyu", "/about"],

  // informational page → its current equivalent → /care
  ["/instruktsiya", "/care"],
  ["/pam-yatka", "/care"],

  // blog post → the page that now covers its subject → /contact
  [
    "/blog/vidpovid-na-pytannya-vy-mozhete-zrobyty-os-taku-tarilochku-vazon-umyvalnyk-na-zamovlennya",
    "/contact",
  ],
  [
    "/blog/vidpovid-na-pytannya-vy-mozhete-zrobyty-os-taku-tarilochku-vazon-umyvalnyk-na-zamovlennya-2",
    "/contact",
  ],

  // informational page → its current equivalent → /designers
  ["/dlya-duzayneriv", "/designers"],
  ["/dlya-dyzajnerov-x2764", "/designers"],

  // informational page → its current equivalent → /payment-delivery
  ["/dostavka-i-oplata", "/payment-delivery"],
  ["/dostavka-oplata", "/payment-delivery"],

  // same product, new slug → /products/horshchyk-z-betonu-tsylindr-33
  [
    "/katalog/gorshhyk-z-betonu-tsylindr-33",
    "/products/horshchyk-z-betonu-tsylindr-33",
  ],
  [
    "/katalog/gorshhyk-z-betonu-tsylindr-33-ral-7047",
    "/products/horshchyk-z-betonu-tsylindr-33",
  ],

  // same product, new slug → /products/town-b
  ["/katalog/lava-z-betonu-town-b", "/products/town-b"],
  ["/katalog/lava-z-betonu-town-b-zi-spynkou", "/products/town-b"],

  // informational page → its current equivalent → /projects
  ["/portfolio", "/projects"],
  ["/stati", "/projects"],

  // informational page → its current equivalent → /shop
  ["/produkciya", "/shop"],
  ["/produktsiya", "/shop"],

  // old category → its current equivalent → /stolyky
  ["/kategoriya/mebel", "/stolyky"],
  ["/kategoriya/mebli", "/stolyky"],

  // old category → its current equivalent → /panno-na-stinu
  ["/kategoriya/dekor-z-betonu", "/panno-na-stinu"],

  // same product, new slug → /products/ava
  ["/katalog/nakladna-rakovyna-z-betonu-ava", "/products/ava"],

  // same product, new slug → /products/copy-monro
  [
    "/katalog/rakovyna-na-pidlogu-z-betonu-monro-z-kanelyuramy",
    "/products/copy-monro",
  ],

  // same product, new slug → /products/copy-odri-nakladna
  ["/katalog/nakladna-rakovyna-z-betonu-monro", "/products/copy-odri-nakladna"],

  // same product, new slug → /products/copy-odri-nakladna-530
  [
    "/katalog/nakladna-rakovyna-z-betonu-solo",
    "/products/copy-odri-nakladna-530",
  ],

  // same product, new slug → /products/flute
  ["/katalog/vazon-z-betonu-flute", "/products/flute"],

  // same product, new slug → /products/hampy
  ["/katalog/obmeschuvach-parkovki-hampy", "/products/hampy"],

  // same product, new slug → /products/horshchyk-z-betonu-tsylindr-20
  [
    "/katalog/gorshhyk-z-betonu-tsylindr-20",
    "/products/horshchyk-z-betonu-tsylindr-20",
  ],

  // same product, new slug → /products/komplekt-zhurnalnykh-stolykiv-z-betonu
  [
    "/katalog/komplekt-zhurnalnyj-stolyk-z-betonu",
    "/products/komplekt-zhurnalnykh-stolykiv-z-betonu",
  ],

  // same product, new slug → /products/low
  ["/katalog/kopiya-nakladna-rakovyna-z-betonu-low", "/products/low"],

  // same product, new slug → /products/monro
  ["/katalog/rakovyna-na-pidlogu-z-betonu-monro", "/products/monro"],

  // same product, new slug → /products/odri-z-kaneliuramy
  [
    "/katalog/rakovyna-na-pidlogu-z-betonu-odri-z-kanelyuramy",
    "/products/odri-z-kaneliuramy",
  ],

  // same product, new slug → /products/rock
  ["/katalog/urna-z-betonu-rock", "/products/rock"],

  // informational page → its current equivalent → /products/skolot
  ["/vira", "/products/skolot"],

  // same product, new slug → /products/urban-b
  ["/katalog/ava-z-betonu-urban-b-z-spynkoy", "/products/urban-b"],

  // same product, new slug → /products/urban-n
  ["/katalog/lava-urban-n", "/products/urban-n"],

  // same product, new slug → /products/vazon-z-betonu-elips-linea-60
  [
    "/katalog/vazon-z-betonu-elips-linea-60",
    "/products/vazon-z-betonu-elips-linea-60",
  ],

  // same product, new slug → /products/vazon-z-betonu-tsylindr-4040
  [
    "/katalog/vazon-z-betonu-cilindr-4040",
    "/products/vazon-z-betonu-tsylindr-4040",
  ],

  // same product, new slug → /products/vazon-z-betonu-tsylindr-4060
  [
    "/katalog/vazon-z-betonu-tsylindr-4060",
    "/products/vazon-z-betonu-tsylindr-4060",
  ],

  // same product, new slug → /products/volcano
  ["/katalog/prustovbyrna-reshetka-volcano", "/products/volcano"],

  // same product, new slug → /products/zhurnalnyi-stolyk-z-betonu-korop
  [
    "/katalog/kopiya-zhurnalnyj-stolyk-z-betonu-fish",
    "/products/zhurnalnyi-stolyk-z-betonu-korop",
  ],

  // informational page → its current equivalent → /vazony
  ["/vazon-onion", "/vazony"],
]);
