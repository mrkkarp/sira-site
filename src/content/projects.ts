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

const metropolis: Project = {
  slug: "metropolis",
  /**
   * The year the first pieces went in, not the span of the relationship.
   * `year` feeds `CreativeWork.dateCreated` in the JSON-LD, where a value like
   * "з 2021" is not a date and would turn a true sentence into an invalid one.
   * That the work continued is said in the prose, where prose belongs.
   */
  year: "2021",
  place: { label: "Київ, Україна", locality: "Київ", countryCode: "UA" },
  images: [
    {
      src: "/projects/metropolis/metropolis-lavy-vzdovzh-dekoratyvnyh-zlakiv.webp",
      alt: "Три білі бетонні лави з дерев'яними сидіннями вздовж смуги високих декоративних злаків на брукованій алеї житлового комплексу",
    },
    {
      src: "/projects/metropolis/metropolis-lava-na-hazoni-bilia-znaka-kompleksu.webp",
      alt: "Бетонна лава з дерев'яним сидінням на газоні під деревами, за нею фасад житлового комплексу з великою літерою M",
    },
    {
      src: "/projects/metropolis/metropolis-lava-bez-spynky-zblyzka.webp",
      alt: "Бетонна лава без спинки з гранчастою опорою та темним дерев'яним сидінням крупним планом на тлі декоративних злаків",
    },
    {
      src: "/projects/metropolis/metropolis-lava-sered-hortenzii.webp",
      alt: "Біла бетонна лава з дерев'яним сидінням серед кущів гортензії на брукованому майданчику житлового комплексу",
    },
    {
      src: "/projects/metropolis/metropolis-dovhe-sydinnia-ta-urna-rock.webp",
      alt: "Довге дерев'яне сидіння, що тягнеться вздовж краю майданчика, і бетонна урна Rock на брукованій площині",
    },
    {
      src: "/projects/metropolis/metropolis-dovhi-mistsia-dlia-sydinnia.webp",
      alt: "Довгі дерев'яні місця для сидіння, що повертають під кутом уздовж парапету, і бетонна лава на передньому плані",
    },
    {
      src: "/projects/metropolis/metropolis-zahalnyi-vyd-maidanchyka.webp",
      alt: "Загальний вид благоустроєного майданчика: бетонна лава, довге дерев'яне сидіння вздовж стінки, живопліт і молоді дерева",
    },
    {
      src: "/projects/metropolis/metropolis-lavy-na-hazoni-bilia-budynku.webp",
      alt: "Бетонні лави зі спинками та без спинок на газоні біля фасаду житлового комплексу, поруч сосна й підстрижені кущі",
    },
    {
      src: "/projects/metropolis/metropolis-riad-lav-vzdovzh-hazonu.webp",
      alt: "Ряд бетонних лав зі спинками та дерев'яними сидіннями вздовж газону у дворі житлового комплексу",
    },
    {
      src: "/projects/metropolis/metropolis-lavy-ta-urna-rock-bilia-fasadu.webp",
      alt: "Чотири бетонні лави зі спинками та бетонна урна Rock біля фасаду з вітринами на першому поверсі",
    },
    {
      src: "/projects/metropolis/metropolis-lava-zi-spynkoiu-zblyzka.webp",
      alt: "Бетонна лава зі спинкою, підлокітниками й темним дерев'яним сидінням на тлі живоплоту",
    },
    {
      src: "/projects/metropolis/metropolis-urna-rock-bilia-vhodu.webp",
      alt: "Бетонна урна Rock і лава зі спинкою біля скляного фасаду будівлі, оточені живоплотом",
    },
    {
      src: "/projects/metropolis/metropolis-bolardy-z-monohramoiu.webp",
      alt: "Бетонні боларди з рельєфною монограмою комплексу вздовж краю тротуару біля газону",
    },
  ],
  relatedCategories: ["outdoor"],
  content: {
    uk: {
      title: "Благоустрій прибудинкової території ЖК «Метрополіс»",
      summary:
        "Лави, урни та боларди з архітектурного бетону для дворів, алей і вхідних груп житлового комплексу в Києві. З «Метрополісом» ми працюємо від 2021 року — вироби доїжджали чергами, і поряд із каталожними моделями тут стоять довгі місця для сидіння, зроблені за розмірами самих майданчиків.",
      seoTitle: "Благоустрій території ЖК «Метрополіс», Київ",
      seoDescription:
        "Лави, урни та боларди з архітектурного бетону для ЖК «Метрополіс» у Києві — від 2021 року. Каталожні моделі та довгі місця для сидіння за індивідуальними розмірами від майстерні ODUDLAB.",
      facts: {
        client: "ЖК «Метрополіс»",
        typology: "Житловий комплекс, прибудинкова територія",
        scope: "Лави, урни, боларди, довгі місця для сидіння",
        production: "Каталожні моделі та виготовлення за розміром",
      },
      sections: [
        {
          heading: "Що зробили",
          paragraphs: [
            "На алеях, у дворах і біля вхідних груп стоять лави з каталогу — «Сете» та Urban N — і бетонні урни Rock. Частина лав без спинки: гранчаста бетонна опора, дерев'яне сидіння, нічого зайвого; такі ставили на відкритих майданчиках і вздовж смуг декоративних злаків. Частина — зі спинкою та підлокітниками, рядами вздовж газонів і біля вітрин першого поверху, там, де сидять довше.",
            "Окремо для комплексу зробили довгі місця для сидіння. Вони тягнуться вздовж парапетів і підпірних стінок, повторюють злам майданчика й фактично малюють його межу. Такої довжини й такої лінії в каталозі немає: це не вибір моделі зі списку, а форма під конкретну ділянку.",
            "Боларди відділяють проїзд від пішохідної частини. На їхніх гранях відлита монограма комплексу — знак не наклеєний і не нанесений фарбою, він є частиною самого виробу.",
          ],
        },
        {
          heading: "Постійний партнер від 2021 року",
          paragraphs: [
            "Перші вироби стали на майданчиках у 2021 році, і на цьому робота не закінчилася: партії доїжджали чергами — на нові двори, нові вхідні групи, нові ділянки благоустрою.",
            "Для комплексу, який освоюють поетапно, це головний аргумент на користь одного виробника. Лава, поставлена цьогоріч, стоїть поряд із лавою 2021 року й має читатися з нею як одна серія: та сама форма, той самий колір бетону, той самий підбір дерева. Доробити партію тієї ж моделі простіше, ніж потім шукати збіг у нового постачальника.",
          ],
        },
        {
          heading: "Бетон у житловому дворі",
          paragraphs: [
            "Двір працює без вихідних і без міжсезоння: сніг і реагенти, злива, літнє сонце, велосипеди та самокати. Пігмент замішаний у масу бетону, а не нанесений зверху, тому подряпина чи скол не оголюють інший колір під шаром фарби — на відміну від пофарбованого металу. Поверхню оброблено гідрофобізатором.",
            "Дерево лишається тільки там, де його торкаються, — на сидінні. Усе інше бере на себе бетон: масу, стійкість і геометрію. Бетонна опора важка сама по собі, тож лава стоїть там, де її поставили.",
          ],
        },
      ],
    },
  },
};

/**
 * Every project, newest first — the array is the ordering.
 */
const projects: Project[] = [metropolis, ukrsibbank];

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
