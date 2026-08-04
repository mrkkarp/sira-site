import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import { shopCategoryPath } from "@/lib/schemas/product-categories";

/**
 * Realised projects — the case studies at `/projects` and `/projects/[slug]`.
 *
 * ## Why this is a file and not a Payload collection
 *
 * There is no `Projects` collection in `payload.config.ts`, and adding one
 * would cost a migration, an admin UI, and — the blocking part — durable media
 * storage, which production does not have yet (`S3_*` is unset, so uploads land
 * on Vercel's ephemeral filesystem). A project is also not a thing the owner
 * edits weekly: it is written once, with the photographs, and then left alone.
 * Static content in the repo is reviewed, versioned, deployed atomically with
 * the images it references, and survives a database restore. Move it into
 * Payload the day someone actually needs to publish a project without a
 * developer — not before.
 *
 * ## Why the prose is `Partial<Record<Locale, …>>`
 *
 * Same reason as `src/content/info-pages.ts`: `Dictionary = typeof uk.json`
 * with no fallback, so any key added to `uk.json` must exist in `en.json` and
 * `pl.json` or the build breaks — which would force machine-translating a case
 * study to satisfy a type. Here a locale may simply be absent and the reader
 * gets Ukrainian, exactly as they already do for every product description on
 * the site. `en`/`pl` are `noindex` Ukrainian-fallback routes today, so this
 * changes nothing about what Google sees.
 *
 * ## Rules for what may be written here
 *
 * Every fact in a `facts` block comes from the owner or is visible in the
 * photograph. Nothing else. Specifically **not** invented: quantities, square
 * metres, dimensions, the architect or landscape designer, the photographer,
 * the budget, the brief. A missing fact is an omitted row — `ProjectFacts` is
 * all-optional precisely so the page renders correctly short rather than
 * plausibly wrong. On a page whose entire purpose is proving to an architect
 * that this workshop has done public-space work before, one invented number is
 * the most expensive sentence on the site.
 *
 * The same rule is why no project links a *product* SKU. Linking "Urban N was
 * used here" would need someone to have checked, and nobody has;
 * `relatedCategories` sends the reader to the category instead, which is true
 * by construction and is where a specifier wants to land anyway.
 */

/**
 * A photograph, with its alt text attached rather than index-aligned with a
 * separate array. Two parallel arrays drift the first time someone reorders a
 * gallery, and the failure is silent — the page still renders, it just
 * describes the wrong picture to a screen reader and to Google Images. Alt
 * text is Ukrainian for every locale, matching how product photography already
 * behaves.
 */
export type ProjectImage = {
  /** Path under `public/`, e.g. `/projects/ukrsibbank/….jpg`. */
  src: string;
  alt: string;
};

/**
 * The fact sheet — the block every serious manufacturer of public-space
 * furniture puts at the top of a case study, because it is the part a
 * specifier reads first and the part that decides whether they read the rest.
 * Every field is optional and an unset field renders no row at all.
 */
export type ProjectFacts = {
  /** Who the object belongs to. A proper noun; not translated. */
  client?: string;
  /** What kind of object it is — "office building, adjacent grounds". */
  typology?: string;
  /** What ODUDLAB supplied — the scope line. */
  scope?: string;
  /** Catalogue models, made-to-measure, or both. */
  production?: string;
};

/**
 * Where the project is. Locale-neutral, so it lives on the `Project` and not
 * in `content` — one value feeds the fact sheet, the JSON-LD `locationCreated`
 * and (eventually) any "projects in your city" grouping. Splitting `label`
 * from `countryCode` is what keeps the JSON-LD from having to parse a display
 * string it did not write.
 */
export type ProjectPlace = {
  /** Rendered as-is in the fact sheet, e.g. `Київ, Україна`. */
  label: string;
  /** City on its own, for `PostalAddress.addressLocality`. */
  locality: string;
  /** ISO 3166-1 alpha-2, for `PostalAddress.addressCountry`. */
  countryCode: string;
};

export type ProjectSection = {
  heading: string;
  paragraphs: string[];
};

export type ProjectContent = {
  /** `<h1>`. One page, one commercial subject. */
  title: string;
  /** The dek under the `<h1>`, and the index card's summary. */
  summary: string;
  /** `<title>`; the locale layout appends " — ODUDLAB". */
  seoTitle: string;
  /** `<meta name="description">` and the OG description. */
  seoDescription: string;
  facts: ProjectFacts;
  sections: ProjectSection[];
};

export type Project = {
  slug: string;
  /**
   * Year of completion, as a string so a range ("2019–2020") stays
   * expressible. Locale-neutral, like {@link ProjectPlace} — and, like it,
   * feeds both the fact sheet and `CreativeWork.dateCreated`, so the two can
   * never disagree.
   */
  year?: string;
  place?: ProjectPlace;
  /**
   * Ordered. `images[0]` is the cover: the hero on the detail page, the card
   * image in the index, and the Open Graph image. A project with no images
   * would render an empty page, so `getPublishedProjects` drops it.
   */
  images: ProjectImage[];
  /**
   * Catalogue category paths this project sends a reader to, as
   * `ShopCategory` identifiers — resolved through `shopCategoryPath` so a URL
   * is never hand-written here (`/vazony`, not `/shop/planters`), and so these
   * links cannot drift from the addresses the routes actually serve. Two of
   * them are live Google Ads landing pages.
   */
  relatedCategories: Parameters<typeof shopCategoryPath>[0][];
  content: Partial<Record<Locale, ProjectContent>>;
};

const ukrsibbank: Project = {
  slug: "ukrsibbank",
  year: "2019",
  place: { label: "Київ, Україна", locality: "Київ", countryCode: "UA" },
  images: [
    {
      src: "/projects/ukrsibbank/ukrsibbank-lavy-ta-vazony-bilia-vhodu.jpg",
      alt: "Бетонні вазони з чагарниками та лава з дерев'яним сидінням біля скляного фасаду офісу Укрсиббанку в Києві",
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-blahoustrii-prybudynkovoi-terytorii.jpg",
      alt: "Прилегла територія офісу Укрсиббанку: газон в обрамленні бетонних вазонів, лава та молоді дерева",
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-vazony-vzdovzh-fasadu.jpg",
      alt: "Ряд прямокутних бетонних вазонів різної висоти з деревами й чагарниками вздовж гранітного фасаду будівлі",
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-lava-mizh-vazonamy.jpg",
      alt: "Лава з дерев'яним сидінням, вбудована між двома бетонними вазонами, на брукованому майданчику біля офісної будівлі",
    },
  ],
  relatedCategories: ["planters", "outdoor"],
  content: {
    uk: {
      title: "Благоустрій прилеглої території офісу Укрсиббанку",
      summary:
        "Вазони, лави та урни з архітектурного бетону для вхідної групи й подвір'я офісної будівлі банку в Києві. Частина виробів — серійні моделі з каталогу, частина зроблена за розмірами самої ділянки.",
      seoTitle: "Благоустрій території офісу Укрсиббанку, Київ",
      seoDescription:
        "Вазони, лави та урни з архітектурного бетону для прилеглої території офісу Укрсиббанку в Києві, 2019 рік. Каталожні моделі та вироби за індивідуальними розмірами від майстерні ODUDLAB.",
      facts: {
        client: "Укрсиббанк",
        typology: "Офісна будівля, прилегла територія",
        scope: "Вазони, лави, урни",
        production: "Каталожні моделі та виготовлення за розміром",
      },
      sections: [
        {
          heading: "Що зробили",
          paragraphs: [
            "Уздовж фасаду й у вхідній групі стоять прямокутні бетонні вазони двох висот: високі — під багатостовбурні дерева, низькі — під чагарник. Вони не просто тримають рослини, а самі й утворюють клумби: об'єми ставляться в лінію та під кутом, і геометрія озеленення береться з розстановки виробів, а не з бордюрного каменю.",
            "Між вазонами вбудовані лави — дерев'яне сидіння лягає на сусідні бетонні об'єми, тож ті працюють водночас як опори. Урни для сміття зроблені з того самого бетону, що й решта, тому читаються як частина композиції, а не як окремо куплений міський інвентар.",
          ],
        },
        {
          heading: "Чому бетон надворі",
          paragraphs: [
            "Вироби стоять просто неба цілий рік. Пігмент замішаний у масу бетону, а не нанесений зверху, тому скол чи подряпина не оголюють інший колір під фарбою — на відміну від пофарбованого металу чи дерева. Поверхню оброблено гідрофобізатором, армування тримає тонку стінку у великій формі, а власна вага таких об'ємів робить їх нерухомими без анкерного кріплення.",
            "Матова поверхня з видимими порами — це характер матеріалу, а не дефект. Бетон тут нічого не імітує: ані камінь, ані дерево.",
          ],
        },
        {
          heading: "Каталог і розмір під об'єкт",
          paragraphs: [
            "Частина виробів на цьому об'єкті — серійні моделі з каталогу. Частину зробили за розмірами, які диктувала сама ділянка: довжина відрізка й крок опор під сидіння — не той параметр, який обирають зі списку.",
            "Так ми працюємо і з іншими об'єктами. Підходить готова модель — беремо її; не підходить — робимо форму під конкретне місце. Виробництво повного циклу в Києві означає, що зміна розміру не тягне за собою зміну підрядника.",
          ],
        },
      ],
    },
  },
};

/**
 * Every project, newest first. One entry today; the array is the ordering.
 */
const projects: Project[] = [ukrsibbank];

/** A project with no photographs has nothing to show — it is not published. */
export function getPublishedProjects(): Project[] {
  return projects.filter((project) => project.images.length > 0);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getPublishedProjects().find((project) => project.slug === slug);
}

/**
 * The slugs `/projects/[slug]` actually serves — read by `src/proxy.ts`.
 *
 * `notFound()` inside the page cannot set a `404` status (there is a
 * `loading.tsx` above it, so the `200` headers are already on the wire by the
 * time the page runs — see the long note in `proxy.ts`). The proxy therefore
 * has to know whether a slug exists *before* anything streams, and unlike
 * `/products/<slug>` and `/collections/<slug>`, which would each cost a
 * database round-trip on every request, this answer is a static in-memory set.
 * Exported as the set rather than as a predicate so the proxy builds nothing
 * per request, and derived from the registry so it cannot drift from it.
 */
export const publishedProjectSlugs: ReadonlySet<string> = new Set(
  getPublishedProjects().map((project) => project.slug),
);

/**
 * The written content for a locale, falling back to {@link defaultLocale}.
 * Returns `undefined` only if the project has no content in any locale, which
 * a `Project` literal cannot express usefully — callers treat it as "not
 * publishable" and 404.
 */
export function getProjectContent(
  project: Project,
  locale: Locale,
): ProjectContent | undefined {
  return project.content[locale] ?? project.content[defaultLocale];
}

/** The path a project is served at, locale prefix excluded. */
export function projectPath(slug: string): string {
  return `/projects/${slug}`;
}
