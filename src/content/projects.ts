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
 * Both projects now carry `en` and `pl` as well, written on the owner's
 * instruction (2026-08-11: «переклади вже існуючі проєкти на мови»). The type
 * stays `Partial` regardless: a project may still land Ukrainian-only and be
 * publishable the same day, rather than waiting on two translations. A
 * translation is held to the same standard as the Ukrainian — it may render a
 * fact differently, never add one the Ukrainian does not state.
 *
 * ## The two categories
 *
 * Every project declares a {@link ProjectCategory}. See the note on that type
 * for why, and {@link getProjectGroups} for why the empty one still renders.
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
  /**
   * The section (1-based) this photograph is shown after on the detail page,
   * so the pictures sit next to the paragraph about them rather than in one
   * pile at the end (owner, 2026-10-09: «нехай фото ідуть вперемішку з
   * текстом»). Locale-neutral, like the image itself — which is why every
   * translation must keep the Ukrainian's section count, as
   * `projects.test.ts` already asserts. Omitted on the cover; omitted on any
   * other photograph, it is shown after the last section.
   */
  afterSection?: number;
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
 * Where the project is. It lives on the `Project` and not in `content` because
 * it is a *fact about the site*, not prose about it: one value feeds the fact
 * sheet, the JSON-LD `locationCreated` and (eventually) any "projects in your
 * city" grouping. Splitting `label` from `countryCode` is what keeps the
 * JSON-LD from having to parse a display string it did not write.
 *
 * The fact is locale-neutral; its *spelling* is not, which is the distinction
 * the first version of this type got wrong. A city has an established
 * exonym in each language — Київ / Kyiv / Kijów — and rendering the Ukrainian
 * one on the English page left a single Cyrillic string sitting in an
 * otherwise fully translated fact sheet, reading as an untranslated leftover
 * rather than as a place name. So `label` and `locality` are per-locale and
 * total, not `Partial`: unlike a case study, which may honestly ship
 * Ukrainian-only and fall back, there is no excuse for an unwritten city name
 * — it is three words, not a translation job, and a missing one would fall
 * back to Cyrillic and reintroduce exactly this bug.
 *
 * `countryCode` stays flat: ISO 3166-1 has one spelling per country by
 * construction.
 */
export type ProjectPlace = {
  /** Rendered as-is in the fact sheet and on the index card, e.g. `Київ, Україна`. */
  label: Record<Locale, string>;
  /** City on its own, for `PostalAddress.addressLocality`. */
  locality: Record<Locale, string>;
  /** ISO 3166-1 alpha-2, for `PostalAddress.addressCountry`. */
  countryCode: string;
};

/**
 * Which half of the workshop's work a project belongs to — the owner's own
 * division (2026-08-11).
 *
 * - `public` — благоустрій: courtyards, entrances, office grounds. Pieces that
 *   stand outdoors all year.
 * - `interior` — commissions made for one room: bar counters, worktops,
 *   basins.
 *
 * These are not tags and a project has exactly one. They exist because the two
 * halves are read by different people: an architect specifying benches for a
 * residential block and a restaurateur pricing a concrete bar have nothing to
 * say to each other, and until now both landed in one undifferentiated scroll.
 *
 * Locale-neutral, like {@link ProjectPlace} and `year` — the heading and the
 * standfirst live in `projectsPage.categories` in the dictionaries, so a
 * category reads in the visitor's language while the key stays stable.
 */
export type ProjectCategory = "public" | "interior";

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
  /** Which group the project is filed under on the index. See {@link ProjectCategory}. */
  category: ProjectCategory;
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
  category: "public",
  year: "2019",
  place: {
    label: { uk: "Київ, Україна", en: "Kyiv, Ukraine", pl: "Kijów, Ukraina" },
    locality: { uk: "Київ", en: "Kyiv", pl: "Kijów" },
    countryCode: "UA",
  },
  images: [
    {
      src: "/projects/ukrsibbank/ukrsibbank-lavy-ta-vazony-bilia-vhodu.jpg",
      alt: "Бетонні вазони з чагарниками та лава з дерев'яним сидінням біля скляного фасаду офісу Укрсиббанку в Києві",
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-vazony-vzdovzh-fasadu.jpg",
      alt: "Ряд прямокутних бетонних вазонів різної висоти з деревами й чагарниками вздовж гранітного фасаду будівлі",
      afterSection: 1,
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-lava-mizh-vazonamy.jpg",
      alt: "Лава з дерев'яним сидінням, вбудована між двома бетонними вазонами, на брукованому майданчику біля офісної будівлі",
      afterSection: 2,
    },
    {
      src: "/projects/ukrsibbank/ukrsibbank-blahoustrii-prybudynkovoi-terytorii.jpg",
      alt: "Прилегла територія офісу Укрсиббанку: газон в обрамленні бетонних вазонів, лава та молоді дерева",
      afterSection: 3,
    },
  ],
  relatedCategories: ["planters", "outdoor"],
  content: {
    uk: {
      title: "Благоустрій прилеглої території офісу Укрсиббанку",
      summary:
        "Вазони, лави та урни з архітектурного бетону для входу й двору офісу Укрсиббанку в Києві. Частина виробів — з каталогу, частина зроблена під розміри ділянки.",
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
          heading: "Вазони",
          paragraphs: [
            "Уздовж фасаду й біля входу стоять прямокутні бетонні вазони двох висот. У високих ростуть дерева, у низьких — кущі. Вазони поставлені в лінію і під кутом, тож вони самі утворюють клумби — бордюр тут не знадобився.",
          ],
        },
        {
          heading: "Лави та урни",
          paragraphs: [
            "Лави вбудовані між вазонами: дерев'яне сидіння лежить на двох сусідніх вазонах, і вони ж служать опорами. Урни відлиті з того самого бетону, тому не виглядають окремо купленими.",
          ],
        },
        {
          heading: "Каталог і розміри",
          paragraphs: [
            "Частина виробів — серійні моделі з каталогу. Решту зробили за розмірами самої ділянки: довжину ряду й відстань між опорами під сидінням зі списку не вибереш.",
            "Колір у цих виробах — не фарба: пігмент додають у бетонну суміш, тому подряпина чи скол не відкривають інший колір. Поверхню покрито гідрофобізатором.",
          ],
        },
      ],
    },
    en: {
      title: "Landscaping the grounds of the UKRSIBBANK office",
      summary:
        "Planters, benches and litter bins in architectural concrete for the entrance and courtyard of the UKRSIBBANK office in Kyiv. Some pieces come from the catalogue; others were made to the dimensions of the site.",
      seoTitle: "UKRSIBBANK office grounds, Kyiv",
      seoDescription:
        "Planters, benches and litter bins in architectural concrete for the grounds of the UKRSIBBANK office in Kyiv, 2019. Catalogue models and made-to-measure pieces from the ODUDLAB workshop.",
      facts: {
        // The bank's own Latin-script name, not a translation of the Ukrainian.
        client: "UKRSIBBANK",
        typology: "Office building, adjacent grounds",
        scope: "Planters, benches, litter bins",
        production: "Catalogue models and made-to-measure",
      },
      sections: [
        {
          heading: "Planters",
          paragraphs: [
            "Rectangular concrete planters in two heights stand along the façade and by the entrance. The tall ones hold trees, the low ones shrubs. They are set in a line and at an angle, so the planters form the beds themselves — no kerb was needed.",
          ],
        },
        {
          heading: "Benches and bins",
          paragraphs: [
            "The benches are built in between the planters: a timber seat rests on two neighbouring planters, which act as its supports. The bins are cast from the same concrete, so they do not look bought separately.",
          ],
        },
        {
          heading: "Catalogue and custom sizes",
          paragraphs: [
            "Some of the pieces are catalogue models. The rest were made to the dimensions of the site: the length of a run and the spacing of the supports under a seat are not something you pick from a list.",
            "The colour is not paint: the pigment is mixed into the concrete, so a scratch or a chip does not show a different colour. The surface is treated with a water repellent.",
          ],
        },
      ],
    },
    pl: {
      title: "Zagospodarowanie terenu wokół biura UKRSIBBANK",
      summary:
        "Donice, ławki i kosze z betonu architektonicznego dla wejścia i dziedzińca biura UKRSIBBANK w Kijowie. Część wyrobów pochodzi z katalogu, część powstała na wymiar terenu.",
      seoTitle: "Zagospodarowanie terenu biura UKRSIBBANK, Kijów",
      seoDescription:
        "Donice, ławki i kosze z betonu architektonicznego na terenie biura UKRSIBBANK w Kijowie, 2019 rok. Modele katalogowe i wyroby na wymiar z pracowni ODUDLAB.",
      facts: {
        client: "UKRSIBBANK",
        typology: "Budynek biurowy, teren przyległy",
        scope: "Donice, ławki, kosze",
        production: "Modele katalogowe i wykonanie na wymiar",
      },
      sections: [
        {
          heading: "Donice",
          paragraphs: [
            "Wzdłuż elewacji i przy wejściu stoją prostokątne betonowe donice w dwóch wysokościach. W wysokich rosną drzewa, w niskich — krzewy. Donice ustawiono w linii i pod kątem, więc same tworzą rabaty — krawężnik nie był potrzebny.",
          ],
        },
        {
          heading: "Ławki i kosze",
          paragraphs: [
            "Ławki wbudowano między donice: drewniane siedzisko leży na dwóch sąsiednich donicach, które służą mu za podpory. Kosze odlano z tego samego betonu, więc nie wyglądają na kupione osobno.",
          ],
        },
        {
          heading: "Katalog i wymiary",
          paragraphs: [
            "Część wyrobów to modele z katalogu. Resztę wykonano na wymiar terenu: długości odcinka i rozstawu podpór pod siedziskiem nie wybiera się z listy.",
            "Kolor to nie farba: pigment dodaje się do mieszanki betonowej, więc zarysowanie czy odprysk nie odsłania innego koloru. Powierzchnię zabezpieczono hydrofobizatorem.",
          ],
        },
      ],
    },
  },
};

const metropolis: Project = {
  slug: "metropolis",
  category: "public",
  /**
   * The year the first pieces went in, not the span of the relationship.
   * `year` feeds `CreativeWork.dateCreated` in the JSON-LD, where a value like
   * "з 2021" is not a date and would turn a true sentence into an invalid one.
   * That the work continued is said in the prose, where prose belongs.
   */
  year: "2021",
  place: {
    label: { uk: "Київ, Україна", en: "Kyiv, Ukraine", pl: "Kijów, Ukraina" },
    locality: { uk: "Київ", en: "Kyiv", pl: "Kijów" },
    countryCode: "UA",
  },
  images: [
    {
      src: "/projects/metropolis/metropolis-lavy-vzdovzh-dekoratyvnyh-zlakiv.webp",
      alt: "Три білі бетонні лави з дерев'яними сидіннями вздовж смуги високих декоративних злаків на брукованій алеї житлового комплексу",
    },
    {
      src: "/projects/metropolis/metropolis-lava-bez-spynky-zblyzka.webp",
      alt: "Бетонна лава без спинки з гранчастою опорою та темним дерев'яним сидінням крупним планом на тлі декоративних злаків",
      afterSection: 1,
    },
    {
      src: "/projects/metropolis/metropolis-lava-zi-spynkoiu-zblyzka.webp",
      alt: "Бетонна лава зі спинкою, підлокітниками й темним дерев'яним сидінням на тлі живоплоту",
      afterSection: 1,
    },
    {
      src: "/projects/metropolis/metropolis-riad-lav-vzdovzh-hazonu.webp",
      alt: "Ряд бетонних лав зі спинками та дерев'яними сидіннями вздовж газону у дворі житлового комплексу",
      afterSection: 1,
    },
    {
      src: "/projects/metropolis/metropolis-dovhi-mistsia-dlia-sydinnia.webp",
      alt: "Довгі дерев'яні місця для сидіння, що повертають під кутом уздовж парапету, і бетонна лава на передньому плані",
      afterSection: 2,
    },
    {
      src: "/projects/metropolis/metropolis-dovhe-sydinnia-ta-urna-rock.webp",
      alt: "Довге дерев'яне сидіння, що тягнеться вздовж краю майданчика, і бетонна урна Rock на брукованій площині",
      afterSection: 2,
    },
    {
      src: "/projects/metropolis/metropolis-zahalnyi-vyd-maidanchyka.webp",
      alt: "Загальний вид благоустроєного майданчика: бетонна лава, довге дерев'яне сидіння вздовж стінки, живопліт і молоді дерева",
      afterSection: 2,
    },
    {
      src: "/projects/metropolis/metropolis-bolardy-z-monohramoiu.webp",
      alt: "Бетонні боларди з рельєфною монограмою комплексу вздовж краю тротуару біля газону",
      afterSection: 3,
    },
    {
      src: "/projects/metropolis/metropolis-urna-rock-bilia-vhodu.webp",
      alt: "Бетонна урна Rock і лава зі спинкою біля скляного фасаду будівлі, оточені живоплотом",
      afterSection: 3,
    },
    {
      src: "/projects/metropolis/metropolis-lavy-ta-urna-rock-bilia-fasadu.webp",
      alt: "Чотири бетонні лави зі спинками та бетонна урна Rock біля фасаду з вітринами на першому поверсі",
      afterSection: 3,
    },
    {
      src: "/projects/metropolis/metropolis-lava-na-hazoni-bilia-znaka-kompleksu.webp",
      alt: "Бетонна лава з дерев'яним сидінням на газоні під деревами, за нею фасад житлового комплексу з великою літерою M",
      afterSection: 4,
    },
    {
      src: "/projects/metropolis/metropolis-lava-sered-hortenzii.webp",
      alt: "Біла бетонна лава з дерев'яним сидінням серед кущів гортензії на брукованому майданчику житлового комплексу",
      afterSection: 4,
    },
    {
      src: "/projects/metropolis/metropolis-lavy-na-hazoni-bilia-budynku.webp",
      alt: "Бетонні лави зі спинками та без спинок на газоні біля фасаду житлового комплексу, поруч сосна й підстрижені кущі",
      afterSection: 4,
    },
  ],
  relatedCategories: ["outdoor"],
  content: {
    uk: {
      title: "Благоустрій прибудинкової території ЖК «Метрополіс»",
      summary:
        "Лави, урни та боларди з архітектурного бетону для дворів і алей житлового комплексу в Києві. Працюємо з «Метрополісом» з 2021 року: крім моделей із каталогу, зробили для нього довгі сидіння під розміри майданчиків.",
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
          heading: "Лави",
          paragraphs: [
            "На алеях, у дворах і біля входів стоять лави з каталогу — «Сете» та Urban N. Лави без спинки, з гранчастою бетонною опорою, поставили на відкритих майданчиках і вздовж декоративних злаків. Лави зі спинкою й підлокітниками — рядами біля газонів і вітрин першого поверху, де люди сидять довше.",
          ],
        },
        {
          heading: "Довгі сидіння",
          paragraphs: [
            "Для комплексу окремо зробили довгі сидіння. Вони йдуть уздовж парапетів і підпірних стінок і повторюють форму майданчика. Такої довжини в каталозі немає — їх робили під конкретне місце.",
          ],
        },
        {
          heading: "Урни та боларди",
          paragraphs: [
            "Біля входів і лав стоять бетонні урни Rock. Боларди відділяють проїзд від тротуару. На них відлита монограма комплексу — вона не наклеєна і не намальована, а є частиною самого виробу.",
          ],
        },
        {
          heading: "Поставки з 2021 року",
          paragraphs: [
            "Перші вироби привезли у 2021 році, далі партії доїжджали чергами — на нові двори й входи. Нова лава має виглядати так само, як та, що стоїть поруч уже кілька років: та сама форма, колір бетону й дерево. Тому для комплексу, який будують поетапно, зручно мати одного виробника.",
            "Колір у бетоні — не фарба: пігмент додають у суміш, тому подряпина чи скол не відкривають інший колір. Поверхню покрито гідрофобізатором. Дерево є тільки на сидінні, все інше — бетон.",
          ],
        },
      ],
    },
    en: {
      title: "Landscaping the grounds of the Metropolis residential complex",
      summary:
        "Benches, litter bins and bollards in architectural concrete for the courtyards and walkways of a residential complex in Kyiv. We have worked with Metropolis since 2021: alongside catalogue models, we made long seats for it to the dimensions of its spaces.",
      seoTitle: "Metropolis residential complex, Kyiv",
      seoDescription:
        "Benches, litter bins and bollards in architectural concrete for the Metropolis residential complex in Kyiv, since 2021. Catalogue models and long made-to-measure seating from the ODUDLAB workshop.",
      facts: {
        client: "Metropolis residential complex",
        typology: "Residential complex, grounds",
        scope: "Benches, litter bins, bollards, long seating",
        production: "Catalogue models and made-to-measure",
      },
      sections: [
        {
          heading: "Benches",
          paragraphs: [
            // «Сете» is the owner's word for the model and is not in the
            // catalogue, so the Latin spelling here is a straight
            // transliteration of it. Every sibling model the workshop sells
            // (Urban N, Rock, Hampy, Volcano) carries a Latin name, so this is
            // near-certainly how it is written — but if the workshop spells it
            // otherwise, correct it here and in the `pl` block, not by guessing
            // again.
            "Catalogue benches — Sete and Urban N — stand along the walkways, in the courtyards and by the entrances. The backless ones, on a faceted concrete support, went on the open squares and along the ornamental grasses. The ones with a back and armrests stand in rows by the lawns and the ground-floor shopfronts, where people sit for longer.",
          ],
        },
        {
          heading: "Long seats",
          paragraphs: [
            "Long seats were made for the complex specifically. They run along parapets and retaining walls and follow the shape of each space. No catalogue item comes in that length — they were made for the particular place.",
          ],
        },
        {
          heading: "Bins and bollards",
          paragraphs: [
            "Rock concrete bins stand by the entrances and the benches. Bollards separate the roadway from the pavement. The complex's monogram is cast into them — not stuck on or painted, but part of the piece itself.",
          ],
        },
        {
          heading: "Deliveries since 2021",
          paragraphs: [
            "The first pieces arrived in 2021, and further batches followed in stages — for new courtyards and entrances. A new bench has to look the same as the one that has stood next to it for years: the same form, the same colour of concrete, the same timber. For a complex built in phases, one manufacturer makes that easy.",
            "The colour is not paint: the pigment is mixed into the concrete, so a scratch or a chip does not show a different colour. The surface is treated with a water repellent. Timber is used only for the seats; everything else is concrete.",
          ],
        },
      ],
    },
    pl: {
      title: "Zagospodarowanie terenu osiedla Metropolis",
      summary:
        "Ławki, kosze i słupki z betonu architektonicznego dla dziedzińców i alejek osiedla mieszkaniowego w Kijowie. Współpracujemy z Metropolis od 2021 roku: oprócz modeli z katalogu wykonaliśmy dla niego długie siedziska na wymiar placów.",
      seoTitle: "Zagospodarowanie terenu osiedla Metropolis, Kijów",
      seoDescription:
        "Ławki, kosze i słupki z betonu architektonicznego dla osiedla Metropolis w Kijowie — od 2021 roku. Modele katalogowe i długie siedziska na wymiar z pracowni ODUDLAB.",
      facts: {
        client: "Osiedle Metropolis",
        typology: "Osiedle mieszkaniowe, teren przyległy",
        scope: "Ławki, kosze, słupki, długie siedziska",
        production: "Modele katalogowe i wykonanie na wymiar",
      },
      sections: [
        {
          heading: "Ławki",
          paragraphs: [
            "Na alejkach, dziedzińcach i przy wejściach stoją ławki z katalogu — Sete i Urban N. Ławki bez oparcia, na graniastej betonowej podporze, ustawiono na otwartych placach i wzdłuż traw ozdobnych. Ławki z oparciem i podłokietnikami stoją rzędami przy trawnikach i witrynach parteru, gdzie siedzi się dłużej.",
          ],
        },
        {
          heading: "Długie siedziska",
          paragraphs: [
            "Dla osiedla osobno wykonano długie siedziska. Biegną wzdłuż parapetów i murów oporowych i powtarzają kształt placu. Takiej długości nie ma w katalogu — powstały pod konkretne miejsce.",
          ],
        },
        {
          heading: "Kosze i słupki",
          paragraphs: [
            "Przy wejściach i ławkach stoją betonowe kosze Rock. Słupki oddzielają jezdnię od chodnika. Odlano na nich monogram osiedla — nie jest naklejony ani namalowany, tylko stanowi część samego wyrobu.",
          ],
        },
        {
          heading: "Dostawy od 2021 roku",
          paragraphs: [
            "Pierwsze wyroby przyjechały w 2021 roku, a kolejne partie docierały etapami — na nowe dziedzińce i wejścia. Nowa ławka musi wyglądać tak samo jak ta, która stoi obok od kilku lat: ta sama forma, kolor betonu i drewno. Przy osiedlu budowanym etapami jeden producent to ułatwia.",
            "Kolor to nie farba: pigment dodaje się do mieszanki, więc zarysowanie czy odprysk nie odsłania innego koloru. Powierzchnię zabezpieczono hydrofobizatorem. Drewno jest tylko na siedziskach, cała reszta to beton.",
          ],
        },
      ],
    },
  },
};

/**
 * The owner supplied the name, the city, the year and the photographs
 * (2026-10-08), then two corrections the photographs could not settle: the
 * concrete around the planting is a concrete planting bed in its own right,
 * not an edging (« це просто бетонна клумба »), and the benches and bins are
 * catalogue models. Everything else is what the photographs show. So
 * `facts.production` names only the benches and bins as catalogue — nobody has
 * said which of the rest were made for the site — and no model is named until
 * the owner names it.
 */
const svitlopark: Project = {
  slug: "svitlopark",
  category: "public",
  year: "2025",
  place: {
    label: { uk: "Київ, Україна", en: "Kyiv, Ukraine", pl: "Kijów, Ukraina" },
    locality: { uk: "Київ", en: "Kyiv", pl: "Kijów" },
    countryCode: "UA",
  },
  images: [
    {
      src: "/projects/svitlopark/svitlopark-hofrovani-vazony-z-derevamy-u-dvori.webp",
      alt: "Два гофровані конічні бетонні вазони з деревами на брукованому майданчику двору ЖК «Світлопарк», за ними дитячий майданчик",
    },
    {
      src: "/projects/svitlopark/svitlopark-vazony-na-ploshchi-mizh-bashtamy.webp",
      alt: "Ряд гофрованих бетонних вазонів із молодими деревами на площі між висотними будинками житлового комплексу",
      afterSection: 1,
    },
    {
      src: "/projects/svitlopark/svitlopark-hofrovanyi-vazon-zblyzka.webp",
      alt: "Гофрований бетонний вазон крупним планом: вертикальні ребра, зубчастий край, мульча з кори, поруч лава з дерев'яним сидінням",
      afterSection: 1,
    },
    {
      src: "/projects/svitlopark/svitlopark-betonni-klumby-z-hortenziiamy.webp",
      alt: "Бетонні клумби ламаної форми з гортензіями та деревами на брукованій площі",
      afterSection: 2,
    },
    {
      src: "/projects/svitlopark/svitlopark-zaokruhlenyi-kut-betonnoi-klumby.webp",
      alt: "Заокруглений кут бетонної клумби з чагарником і мульчею, видно шов між двома сегментами",
      afterSection: 2,
    },
    {
      src: "/projects/svitlopark/svitlopark-poverkhnia-betonnoi-klumby-zblyzka.webp",
      alt: "Гладка матова поверхня стінки бетонної клумби з тінню гілок, за ним мульча з кори та паросток чагарника",
      afterSection: 2,
    },
    {
      src: "/projects/svitlopark/svitlopark-hranchasti-sydinnia-vzdovzh-klumby.webp",
      alt: "Гранчасті бетонні сидіння з дерев'яним настилом, що ламаною лінією тягнуться вздовж бетонної клумби біля паркування",
      afterSection: 3,
    },
    {
      src: "/projects/svitlopark/svitlopark-sydinnia-z-derevianym-nastylom-zblyzka.webp",
      alt: "Дерев'яний настил сидіння на бетонній основі крупним планом, уздовж клумби з чагарником",
      afterSection: 3,
    },
    {
      src: "/projects/svitlopark/svitlopark-lava-na-dorizhtsi-sered-yalivtsiu.webp",
      alt: "Серійна лава з бетонними опорами на брукованій доріжці серед ялівцю та декоративних злаків у дворі житлового комплексу",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-lava-z-betonnymy-oporamy.webp",
      alt: "Лава з темним дерев'яним сидінням на бетонних опорах-рамках біля клумби з ялівцем",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-lava-bilia-hazonu.webp",
      alt: "Лава з бетонними опорами-рамками на брукованому краї газону під деревами",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-lavy-vzdovzh-zvyvystoi-dorizhky.webp",
      alt: "Лави з бетонними опорами вздовж звивистої брукованої доріжки між газоном і смугою декоративних злаків",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-urna-bilia-vhodu-v-budynok.webp",
      alt: "Серійна бетонна урна з похилою кришкою на тротуарі біля смуги гортензій і входу в житловий будинок",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-lava-ta-urna-na-dorizhtsi.webp",
      alt: "Бетонна урна з похилою кришкою на передньому плані, за нею лава на доріжці вздовж хвойних насаджень",
      afterSection: 4,
    },
    {
      src: "/projects/svitlopark/svitlopark-prystovburni-konusy-dlia-derev.webp",
      alt: "Бетонні пристовбурні конуси навколо дерев на брукованому майданчику біля скляного фасаду",
      afterSection: 5,
    },
  ],
  relatedCategories: ["planters", "outdoor"],
  content: {
    uk: {
      title: "Благоустрій прибудинкової території ЖК «Світлопарк»",
      summary:
        "Вазони, клумби, сидіння, лави та урни з архітектурного бетону для дворів і площ житлового комплексу в Києві, 2025 рік.",
      seoTitle: "Благоустрій території ЖК «Світлопарк», Київ",
      seoDescription:
        "Гофровані вазони, бетонні клумби, сидіння з дерев'яним настилом, серійні лави та урни з архітектурного бетону для ЖК «Світлопарк» у Києві, 2025 рік. Майстерня ODUDLAB.",
      facts: {
        client: "ЖК «Світлопарк»",
        typology: "Житловий комплекс, прибудинкова територія",
        scope: "Вазони, клумби, сидіння, лави, урни, пристовбурні конуси",
        production: "Лави та урни — серійні моделі з каталогу",
      },
      sections: [
        {
          heading: "Вазони",
          paragraphs: [
            "Конічні вазони з ребристими стінками стоять у дворі біля дитячого майданчика й на площі між будинками. У кожному росте дерево. Ребра вгорі закінчуються зубчастим краєм.",
          ],
        },
        {
          heading: "Клумби",
          paragraphs: [
            "Клумби на площах теж бетонні. Це великі підняті клумби, які повертають під кутом і заокруглюються на поворотах. Землю тримає сама клумба, тому бордюр не потрібен.",
          ],
        },
        {
          heading: "Сидіння вздовж клумб",
          paragraphs: [
            "Уздовж частини клумб ідуть сидіння: бетонні сегменти з дерев'яним настилом зверху. Вони тягнуться ламаною лінією по краю клумби. Дерево — лише там, де сидять, усе інше — бетон.",
          ],
        },
        {
          heading: "Лави та урни",
          paragraphs: [
            "На доріжках між газонами й хвойними кущами стоять лави на бетонних опорах з дерев'яним сидінням. Біля входів і вздовж тротуарів — бетонні урни з похилою кришкою. Лави й урни — серійні моделі з нашого каталогу.",
          ],
        },
        {
          heading: "Конуси біля дерев",
          paragraphs: [
            "На одному з майданчиків навколо дерев стоять бетонні пристовбурні конуси.",
            "Колір в усіх виробах — не фарба: пігмент додають у бетонну суміш, тому подряпина чи скол не відкривають інший колір. Поверхню покрито гідрофобізатором.",
          ],
        },
      ],
    },
    en: {
      title: "Landscaping the grounds of the Svitlopark residential complex",
      summary:
        "Planters, planting beds, seating, benches and litter bins in architectural concrete for the courtyards and squares of a residential complex in Kyiv, 2025.",
      seoTitle: "Svitlopark residential complex, Kyiv",
      seoDescription:
        "Fluted planters, concrete planting beds, timber-topped seating, catalogue benches and litter bins in architectural concrete for the Svitlopark residential complex in Kyiv, 2025. The ODUDLAB workshop.",
      facts: {
        client: "Svitlopark residential complex",
        typology: "Residential complex, grounds",
        scope:
          "Planters, planting beds, seating, benches, litter bins, tree-base cones",
        production: "Benches and litter bins — catalogue models",
      },
      sections: [
        {
          heading: "Planters",
          paragraphs: [
            "Conical planters with ribbed walls stand in the courtyard by the playground and on the square between the buildings. Each one holds a tree. At the top, the ribs end in a serrated rim.",
          ],
        },
        {
          heading: "Planting beds",
          paragraphs: [
            "The planting beds on the squares are concrete too. They are large raised beds that turn at an angle and round off at the corners. The bed itself holds the soil, so no kerb is needed.",
          ],
        },
        {
          heading: "Seating along the beds",
          paragraphs: [
            "Along some of the beds runs seating: concrete segments with timber decking on top. They follow the edge of the bed in a broken line. Timber is used only where people sit; everything else is concrete.",
          ],
        },
        {
          heading: "Benches and bins",
          paragraphs: [
            "Benches on concrete supports with a timber seat stand on the walkways between the lawns and the conifers. By the entrances and along the pavements there are concrete bins with a sloping lid. Both the benches and the bins are catalogue models.",
          ],
        },
        {
          heading: "Cones around the trees",
          paragraphs: [
            "On one of the squares, concrete cones stand around the base of the trees.",
            "In every piece the colour is not paint: the pigment is mixed into the concrete, so a scratch or a chip does not show a different colour. The surface is treated with a water repellent.",
          ],
        },
      ],
    },
    pl: {
      title: "Zagospodarowanie terenu osiedla Svitlopark",
      summary:
        "Donice, rabaty, siedziska, ławki i kosze z betonu architektonicznego dla dziedzińców i placów osiedla mieszkaniowego w Kijowie, 2025 rok.",
      seoTitle: "Zagospodarowanie terenu osiedla Svitlopark, Kijów",
      seoDescription:
        "Karbowane donice, betonowe rabaty, siedziska z drewnianym blatem, katalogowe ławki i kosze z betonu architektonicznego dla osiedla Svitlopark w Kijowie, 2025 rok. Pracownia ODUDLAB.",
      facts: {
        client: "Osiedle Svitlopark",
        typology: "Osiedle mieszkaniowe, teren przyległy",
        scope: "Donice, rabaty, siedziska, ławki, kosze, stożki przypniowe",
        production: "Ławki i kosze — modele katalogowe",
      },
      sections: [
        {
          heading: "Donice",
          paragraphs: [
            "Stożkowe donice o żebrowanych ściankach stoją na dziedzińcu przy placu zabaw i na placu między budynkami. W każdej rośnie drzewo. U góry żebra kończą się ząbkowaną krawędzią.",
          ],
        },
        {
          heading: "Rabaty",
          paragraphs: [
            "Rabaty na placach też są betonowe. To duże podniesione rabaty, które skręcają pod kątem i zaokrąglają się na zakrętach. Ziemię utrzymuje sama rabata, więc krawężnik nie jest potrzebny.",
          ],
        },
        {
          heading: "Siedziska wzdłuż rabat",
          paragraphs: [
            "Wzdłuż części rabat biegną siedziska: betonowe segmenty z drewnianym blatem. Ciągną się łamaną linią po krawędzi rabaty. Drewno jest tylko tam, gdzie się siedzi, cała reszta to beton.",
          ],
        },
        {
          heading: "Ławki i kosze",
          paragraphs: [
            "Na alejkach między trawnikami a krzewami iglastymi stoją ławki na betonowych podporach z drewnianym siedziskiem. Przy wejściach i wzdłuż chodników — betonowe kosze z ukośną pokrywą. Ławki i kosze to modele z naszego katalogu.",
          ],
        },
        {
          heading: "Stożki wokół drzew",
          paragraphs: [
            "Na jednym z placów wokół drzew stoją betonowe stożki przypniowe.",
            "We wszystkich wyrobach kolor to nie farba: pigment dodaje się do mieszanki betonowej, więc zarysowanie czy odprysk nie odsłania innego koloru. Powierzchnię zabezpieczono hydrofobizatorem.",
          ],
        },
      ],
    },
  },
};

/**
 * The first `interior` project. The owner supplied four workshop photographs,
 * the city, that it has just been installed (2026-10-09), and a screenshot of
 * a finished café counter — which is the client's *reference*, not this job,
 * so it is deliberately not on the page: every photograph here must be of
 * work the workshop did. No client name, no dimensions, no count of panels,
 * and no installed photograph yet — add one when it exists, as the cover.
 *
 * No `relatedCategories`: nothing in the catalogue is this piece, and a link
 * to the nearest category would claim a relationship nobody has checked.
 */
const barCounterKremenchuk: Project = {
  slug: "barna-stiika-kremenchuk",
  category: "interior",
  year: "2026",
  place: {
    label: {
      uk: "Кременчук, Україна",
      en: "Kremenchuk, Ukraine",
      pl: "Krzemieńczuk, Ukraina",
    },
    locality: { uk: "Кременчук", en: "Kremenchuk", pl: "Krzemieńczuk" },
    countryCode: "UA",
  },
  images: [
    {
      src: "/projects/barna-stiika-kremenchuk/barna-stiika-paneli-pivtsylindry-u-maisterni.webp",
      alt: "Світло-сірі бетонні панелі у формі півциліндрів рядами на піддонах у майстерні ODUDLAB",
    },
    {
      src: "/projects/barna-stiika-kremenchuk/barna-stiika-torsti-paneli-z-napivkruhlym-profilem.webp",
      alt: "Торці бетонних панелей для барної стійки: напівкруглий профіль із тонким бортиком по краях",
      afterSection: 1,
    },
    {
      src: "/projects/barna-stiika-kremenchuk/barna-stiika-poverkhnia-paneli-zblyzka.webp",
      alt: "Гладка матова поверхня бетонної панелі-півциліндра крупним планом",
      afterSection: 2,
    },
  ],
  relatedCategories: [],
  content: {
    uk: {
      title: "Барна стійка в Кременчуці",
      summary:
        "Бетонні панелі-півциліндри для фронту барної стійки в Кременчуці, 2026 рік. Зроблені під замовлення за референсом клієнта.",
      seoTitle: "Барна стійка з бетонних панелей, Кременчук",
      seoDescription:
        "Панелі-півциліндри з архітектурного бетону для фронту барної стійки в Кременчуці, 2026 рік. Виготовлення під замовлення за референсом клієнта в майстерні ODUDLAB.",
      facts: {
        typology: "Інтер'єр, барна стійка",
        scope: "Панелі фронту барної стійки",
        production: "Під замовлення, за референсом клієнта",
      },
      sections: [
        {
          heading: "Що зробили",
          paragraphs: [
            "Бетонні панелі для фронту барної стійки. Кожна панель — половина циліндра. Форму взяли з референсу клієнта: фронт стійки складається з вертикальних напівкруглих ребер.",
          ],
        },
        {
          heading: "Панелі",
          paragraphs: [
            "Панелі світло-сірі, з гладкою матовою поверхнею. На торцях видно профіль — рівне півколо з тонким бортиком по краях.",
            "На фото — панелі в майстерні перед відправкою на об'єкт.",
          ],
        },
      ],
    },
    en: {
      title: "Bar counter in Kremenchuk",
      summary:
        "Half-cylinder concrete panels for the front of a bar counter in Kremenchuk, 2026. Made to order from the client's reference.",
      seoTitle: "Bar counter in concrete panels, Kremenchuk",
      seoDescription:
        "Half-cylinder panels in architectural concrete for the front of a bar counter in Kremenchuk, 2026. Made to order from the client's reference at the ODUDLAB workshop.",
      facts: {
        typology: "Interior, bar counter",
        scope: "Bar counter front panels",
        production: "Made to order from the client's reference",
      },
      sections: [
        {
          heading: "What we made",
          paragraphs: [
            "Concrete panels for the front of a bar counter. Each panel is half a cylinder. The form came from the client's reference: a counter front made of vertical half-round ribs.",
          ],
        },
        {
          heading: "The panels",
          paragraphs: [
            "The panels are light grey, with a smooth matte surface. The ends show the profile — a clean half-circle with a thin lip along the edges.",
            "The photographs show the panels in the workshop before they were sent to the site.",
          ],
        },
      ],
    },
    pl: {
      title: "Lada barowa w Krzemieńczuku",
      summary:
        "Betonowe panele w kształcie półwalców na front lady barowej w Krzemieńczuku, 2026 rok. Wykonane na zamówienie według referencji klienta.",
      seoTitle: "Lada barowa z paneli betonowych, Krzemieńczuk",
      seoDescription:
        "Panele w kształcie półwalców z betonu architektonicznego na front lady barowej w Krzemieńczuku, 2026 rok. Wykonane na zamówienie według referencji klienta w pracowni ODUDLAB.",
      facts: {
        typology: "Wnętrze, lada barowa",
        scope: "Panele frontu lady barowej",
        production: "Na zamówienie, według referencji klienta",
      },
      sections: [
        {
          heading: "Co zrobiliśmy",
          paragraphs: [
            "Betonowe panele na front lady barowej. Każdy panel to połowa walca. Kształt wzięliśmy z referencji klienta: front lady składa się z pionowych półokrągłych żeber.",
          ],
        },
        {
          heading: "Panele",
          paragraphs: [
            "Panele są jasnoszare, o gładkiej matowej powierzchni. Na końcach widać profil — równe półkole z cienkim rantem wzdłuż krawędzi.",
            "Na zdjęciach — panele w pracowni przed wysyłką na obiekt.",
          ],
        },
      ],
    },
  },
};

/**
 * Every project, newest first — the array is the ordering.
 */
const projects: Project[] = [
  barCounterKremenchuk,
  svitlopark,
  metropolis,
  ukrsibbank,
];

/** A project with no photographs has nothing to show — it is not published. */
export function getPublishedProjects(): Project[] {
  return projects.filter((project) => project.images.length > 0);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getPublishedProjects().find((project) => project.slug === slug);
}

/**
 * The order the groups appear in on `/projects`. `public` first because that is
 * where the finished work is, and a page whose argument is "we have built this
 * before" should open with the evidence.
 */
export const projectCategoryOrder = ["public", "interior"] as const;

export type ProjectGroup = {
  category: ProjectCategory;
  projects: Project[];
};

/**
 * Every category, in {@link projectCategoryOrder} — **including the ones that
 * hold nothing**. That is the point, not an oversight.
 *
 * `interior` was empty until 2026-10-09, and the owner asked for it to be on
 * the page anyway (2026-08-11: «поки порожня — зробіть структуру»). A reader who came
 * looking for a concrete bar counter would otherwise read a page of benches
 * and conclude the workshop only works outdoors, which is false. `ProjectIndex`
 * renders an empty group as a short statement of what the workshop makes for
 * interiors plus the reason there are no photographs yet — never as a case
 * study, and never with a stand-in image. The moment a real interior project
 * is added with its photographs, it appears here and the statement is replaced
 * by the work, with no code change.
 */
export function getProjectGroups(): ProjectGroup[] {
  const published = getPublishedProjects();
  return projectCategoryOrder.map((category) => ({
    category,
    projects: published.filter((project) => project.category === category),
  }));
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
