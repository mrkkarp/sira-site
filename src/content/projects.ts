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
    en: {
      title: "Landscaping the grounds of the UKRSIBBANK office",
      summary:
        "Planters, benches and litter bins in architectural concrete for the entrance and the courtyard of a bank office building in Kyiv. Some of the pieces are catalogue models; the rest were made to the dimensions of the site itself.",
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
          heading: "What we made",
          paragraphs: [
            "Rectangular concrete planters in two heights stand along the façade and around the entrance: the tall ones hold multi-stemmed trees, the low ones shrubs. They do not merely contain the planting, they form the beds themselves — the volumes are set in a line and at an angle, and the geometry of the greenery comes from how the pieces are arranged rather than from a kerb stone.",
            "Benches are built in between the planters: a timber seat rests on the adjacent concrete volumes, so those double as supports. The litter bins are cast from the same concrete as everything else, which makes them read as part of the composition rather than as street furniture bought separately.",
          ],
        },
        {
          heading: "Why concrete outdoors",
          paragraphs: [
            "The pieces stand in the open all year round. The pigment is mixed into the body of the concrete rather than applied on top, so a chip or a scratch does not expose a different colour beneath the paint — unlike painted metal or timber. The surface is treated with a water repellent, reinforcement holds a thin wall in a large mould, and the sheer weight of volumes like these keeps them in place without anchoring.",
            "The matte surface with its visible pores is the character of the material, not a defect. The concrete here imitates nothing: neither stone nor wood.",
          ],
        },
        {
          heading: "Catalogue, and size made for the site",
          paragraphs: [
            "Some of the pieces on this site are catalogue models. Others were made to the dimensions the site itself dictated: the length of a run, and the spacing of the supports under a seat, are not the kind of parameter you pick from a list.",
            "This is how we work on other sites too. If a stock model fits, we use it; if it does not, we build a mould for the particular place. Full-cycle production in Kyiv means a change of size does not mean a change of supplier.",
          ],
        },
      ],
    },
    pl: {
      title: "Zagospodarowanie terenu wokół biura UKRSIBBANK",
      summary:
        "Donice, ławki i kosze z betonu architektonicznego dla strefy wejściowej i dziedzińca budynku biurowego banku w Kijowie. Część wyrobów to modele katalogowe, część powstała na wymiar samego terenu.",
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
          heading: "Co zrobiliśmy",
          paragraphs: [
            "Wzdłuż elewacji i w strefie wejściowej stoją prostokątne betonowe donice w dwóch wysokościach: wysokie — pod drzewa wielopniowe, niskie — pod krzewy. Nie tylko mieszczą rośliny, ale same tworzą rabaty: bryły ustawiono w linii i pod kątem, a geometria zieleni wynika z rozstawienia wyrobów, a nie z krawężnika.",
            "Pomiędzy donicami wbudowano ławki — drewniane siedzisko opiera się na sąsiednich betonowych bryłach, więc te pracują jednocześnie jako podpory. Kosze wykonano z tego samego betonu co reszta, dlatego czytają się jako część kompozycji, a nie jako osobno kupiony sprzęt miejski.",
          ],
        },
        {
          heading: "Dlaczego beton na zewnątrz",
          paragraphs: [
            "Wyroby stoją pod gołym niebem przez cały rok. Pigment jest wmieszany w masę betonu, a nie naniesiony z wierzchu, więc odprysk czy zarysowanie nie odsłania innego koloru pod warstwą farby — inaczej niż w malowanym metalu czy drewnie. Powierzchnię zabezpieczono hydrofobizatorem, zbrojenie utrzymuje cienką ściankę w dużej formie, a własny ciężar takich brył sprawia, że stoją nieruchomo bez kotwienia.",
            "Matowa powierzchnia z widocznymi porami to charakter materiału, a nie wada. Beton niczego tu nie udaje: ani kamienia, ani drewna.",
          ],
        },
        {
          heading: "Katalog i wymiar pod obiekt",
          paragraphs: [
            "Część wyrobów na tym obiekcie to modele seryjne z katalogu. Część wykonano na wymiary, które podyktował sam teren: długość odcinka i rozstaw podpór pod siedzisko to nie jest parametr, który wybiera się z listy.",
            "Tak samo pracujemy przy innych obiektach. Pasuje gotowy model — bierzemy go; nie pasuje — robimy formę pod konkretne miejsce. Produkcja pełnego cyklu w Kijowie oznacza, że zmiana wymiaru nie pociąga za sobą zmiany wykonawcy.",
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
    en: {
      title: "Landscaping the grounds of the Metropolis residential complex",
      summary:
        "Benches, litter bins and bollards in architectural concrete for the courtyards, walkways and entrances of a residential complex in Kyiv. We have worked with Metropolis since 2021 — the pieces arrived batch by batch, and alongside the catalogue models there are long seats made to the dimensions of the spaces themselves.",
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
          heading: "What we made",
          paragraphs: [
            // «Сете» is the owner's word for the model and is not in the
            // catalogue, so the Latin spelling here is a straight
            // transliteration of it. Every sibling model the workshop sells
            // (Urban N, Rock, Hampy, Volcano) carries a Latin name, so this is
            // near-certainly how it is written — but if the workshop spells it
            // otherwise, correct it here and in the `pl` block, not by guessing
            // again.
            "Along the walkways, in the courtyards and by the entrances stand benches from the catalogue — Sete and Urban N — and Rock concrete bins. Some of the benches have no back: a faceted concrete support, a timber seat, nothing more; those went on the open squares and along the bands of ornamental grasses. Others have a back and armrests, set in rows along the lawns and by the ground-floor shopfronts, where people sit for longer.",
            "The long seats were made for the complex specifically. They run along parapets and retaining walls, follow the turn of the space and in effect draw its edge. No catalogue holds that length or that line: this is not a model chosen from a list but a form made for one particular site.",
            "The bollards separate the roadway from the pedestrian part. The complex's monogram is cast into their faces — the mark is not stuck on and not painted on, it is part of the piece itself.",
          ],
        },
        {
          heading: "A regular partner since 2021",
          paragraphs: [
            "The first pieces went in on the grounds in 2021, and the work did not end there: batches kept arriving — for new courtyards, new entrances, new stretches of landscaping.",
            "For a complex built out in phases, that is the main argument for a single manufacturer. A bench installed this year stands next to a bench from 2021 and has to read with it as one series: the same form, the same colour of concrete, the same choice of timber. Adding to a run of the same model is easier than hunting for a match at a new supplier later.",
          ],
        },
        {
          heading: "Concrete in a residential courtyard",
          paragraphs: [
            "A courtyard works without weekends and without an off-season: snow and de-icing salt, downpours, summer sun, bicycles and scooters. The pigment is mixed into the body of the concrete rather than applied on top, so a scratch or a chip does not expose a different colour under a layer of paint — unlike painted metal. The surface is treated with a water repellent.",
            "Timber is left only where people touch it — on the seat. Everything else is carried by the concrete: the mass, the durability and the geometry. A concrete support is heavy in itself, so a bench stays where it was put.",
          ],
        },
      ],
    },
    pl: {
      title: "Zagospodarowanie terenu osiedla Metropolis",
      summary:
        "Ławki, kosze i słupki z betonu architektonicznego dla dziedzińców, alejek i stref wejściowych osiedla mieszkaniowego w Kijowie. Z Metropolis współpracujemy od 2021 roku — wyroby przyjeżdżały partiami, a obok modeli katalogowych stoją tu długie siedziska wykonane na wymiar samych placów.",
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
          heading: "Co zrobiliśmy",
          paragraphs: [
            "Na alejkach, na dziedzińcach i przy strefach wejściowych stoją ławki z katalogu — Sete i Urban N — oraz betonowe kosze Rock. Część ławek jest bez oparcia: graniasta betonowa podpora, drewniane siedzisko, nic więcej; takie ustawiano na otwartych placach i wzdłuż pasów traw ozdobnych. Część ma oparcie i podłokietniki — rzędami wzdłuż trawników i przy witrynach parteru, tam gdzie siedzi się dłużej.",
            "Osobno dla osiedla wykonano długie siedziska. Ciągną się wzdłuż parapetów i murów oporowych, powtarzają załamanie placu i faktycznie rysują jego granicę. Takiej długości i takiej linii nie ma w katalogu: to nie wybór modelu z listy, lecz forma pod konkretny teren.",
            "Słupki oddzielają jezdnię od części pieszej. Na ich ścianach odlano monogram osiedla — znak nie jest naklejony ani naniesiony farbą, jest częścią samego wyrobu.",
          ],
        },
        {
          heading: "Stały partner od 2021 roku",
          paragraphs: [
            "Pierwsze wyroby stanęły na placach w 2021 roku i na tym praca się nie skończyła: partie przyjeżdżały kolejnymi turami — na nowe dziedzińce, nowe strefy wejściowe, nowe fragmenty zagospodarowania.",
            "Dla osiedla realizowanego etapami to główny argument za jednym producentem. Ławka postawiona w tym roku stoi obok ławki z 2021 roku i musi czytać się z nią jako jedna seria: ta sama forma, ten sam kolor betonu, ten sam dobór drewna. Dorobić partię tego samego modelu jest łatwiej, niż potem szukać zgodności u nowego dostawcy.",
          ],
        },
        {
          heading: "Beton na osiedlowym dziedzińcu",
          paragraphs: [
            "Dziedziniec pracuje bez weekendów i bez międzysezonu: śnieg i sól drogowa, ulewa, letnie słońce, rowery i hulajnogi. Pigment jest wmieszany w masę betonu, a nie naniesiony z wierzchu, więc zarysowanie czy odprysk nie odsłania innego koloru pod warstwą farby — inaczej niż w malowanym metalu. Powierzchnię zabezpieczono hydrofobizatorem.",
            "Drewno zostaje tylko tam, gdzie się go dotyka — na siedzisku. Całą resztę bierze na siebie beton: masę, trwałość i geometrię. Betonowa podpora sama w sobie jest ciężka, więc ławka stoi tam, gdzie ją postawiono.",
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
 * `interior` is empty today, and the owner asked for it to be on the page
 * anyway (2026-08-11: «поки порожня — зробіть структуру»). A reader who came
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
