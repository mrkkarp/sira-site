import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Merge authored EN/PL translations into `_content-audit/content-all.json`.
 *
 * Fills the empty `en`/`pl` locale copy for the 32 cleaned-source products
 * (the 6 pilots already carry authored EN/PL). For each locale I hand-write
 * only the `shortDescription` (a faithful, non-fabricating rendering of the
 * Ukrainian source copy) plus, where the product name is descriptive rather
 * than a Latin brand name, a natural `name` token used ONLY to build the SEO
 * title (the DB `name` field is left untouched — the storefront H1 keeps the
 * imported name). `seoTitle` and `seoDescription` are derived deterministically
 * here, exactly like build-content-drafts.ts, so they stay consistent.
 *
 * These are AI-authored translations, not human-verified — flagged as such in
 * _meta; a native reviewer should still pass over them before they are treated
 * as final marketing copy.
 *
 * Also repairs two Ukrainian source descriptions that imported broken
 * (`nori` carried a raw "Стислий опис UA/EN" scaffold; `riflo` kept a stray
 * "Вартість …" price fragment).
 *
 * Run: node_modules/.bin/tsx scripts/merge-translations.ts
 * Then: npm run content:all:apply   (writes to Payload after backup)
 */

const AUDIT_DIR = path.resolve(process.cwd(), "_content-audit");
const FILE = path.join(AUDIT_DIR, "content-all.json");

const CAT_EN: Record<string, string> = {
  sinks: "Basins",
  planters: "Planters",
  tables: "Tables",
  outdoor: "Street Furniture",
  "wall-art": "Wall Art",
  "wall-panels": "Wall Panels",
};
const CAT_PL: Record<string, string> = {
  sinks: "Umywalki",
  planters: "Donice",
  tables: "Stoły",
  outdoor: "Mała architektura",
  "wall-art": "Panele dekoracyjne",
  "wall-panels": "Panele ścienne",
};

function firstSentences(s: string, max = 155): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return (lastStop > 60 ? cut.slice(0, lastStop + 1) : cut.trim()) + "…";
}

interface Tr {
  en: string; // shortDescription EN
  pl: string; // shortDescription PL
  enName?: string; // SEO name token EN (descriptive names only)
  plName?: string; // SEO name token PL
  ukFix?: string; // repaired UK shortDescription (broken imports only)
}

// Faithful renderings of the Ukrainian source copy — no invented facts,
// certifications, dimensions or claims beyond what the source already states.
const T: Record<string, Tr> = {
  "rakovyna-na-pidlohu-odri": {
    en: "ODRI is a freestanding concrete basin with a clean cylindrical form and soft proportions. Its bold, original design gives a space character and works as a standalone sculptural object. The restrained silhouette looks modern and precise, settling easily into minimalist interiors without crowding them. The mass of architectural concrete meets simple lines to create an expressive focal point in the bathroom.",
    pl: "ODRI to wolnostojąca umywalka betonowa o czystej, cylindrycznej formie i miękkich proporcjach. Odważny, oryginalny projekt nadaje wnętrzu charakter i działa jak samodzielny obiekt rzeźbiarski. Stonowana sylwetka wygląda nowocześnie i schludnie, łatwo wpisuje się w minimalistyczne aranżacje i nie przeciąża przestrzeni. Masywność architektonicznego betonu łączy się z prostotą linii, tworząc wyrazisty akcent w łazience.",
  },
  "odri-z-kaneliuramy": {
    en: "ODRI fluted is a freestanding architectural-concrete basin with an expressive ribbed surface. Vertical flutes play with light and shadow, add depth to the form and turn the piece into an accent object. The bold, original design pairs the mass of concrete with clear geometry while keeping a sense of cleanliness and order. It works well in modern minimalist and design interiors where material texture matters.",
    pl: "ODRI z kanelurami to wolnostojąca umywalka z betonu architektonicznego o wyrazistej, żłobkowanej powierzchni. Pionowe kanelury tworzą grę światła i cienia, pogłębiają formę i zamieniają wyrób w akcent wnętrza. Odważny, oryginalny projekt łączy masywność betonu z czytelną geometrią, zachowując wrażenie czystości i porządku. Model dobrze sprawdza się w nowoczesnych, minimalistycznych i designerskich wnętrzach, gdzie liczy się faktura materiału.",
  },
  "copy-monro": {
    en: "MONRO fluted is a freestanding architectural-concrete basin with an expressive ribbed surface. Vertical flutes emphasise the form, create a play of light and shadow and add volume to the silhouette. The bold, original design makes the model a central accent while keeping clean geometry and a monolithic feel. The mass of concrete meets a clear structure, so the basin looks both architectural and elegant. It suits modern minimalist and design spaces.",
    pl: "MONRO z kanelurami to wolnostojąca umywalka z betonu architektonicznego o wyrazistej, żłobkowanej powierzchni. Pionowe kanelury podkreślają formę, tworzą grę światła i cienia oraz dodają sylwetce objętości. Odważny, oryginalny projekt czyni model centralnym akcentem, zachowując czystość geometrii i wrażenie monolitu. Masywność betonu łączy się z wyraźną strukturą, dzięki czemu umywalka wygląda architektonicznie i elegancko. Dobrze sprawdza się w nowoczesnych, minimalistycznych i designerskich przestrzeniach.",
  },
  tower: {
    en: "TOWER is a freestanding architectural-concrete basin with a single monolithic geometry. An integrated tap underlines the idea of a pure form and keeps the model as pared-back as possible. The bold design reads like a sculptural object and forms a strong visual accent in a space. The mass of concrete meets smooth modelling to give a sense of stability, order and architectural rigour. It works well in modern design interiors where form and materiality matter.",
    pl: "TOWER to wolnostojąca umywalka z betonu architektonicznego o zwartej, monolitycznej geometrii. Zintegrowana bateria podkreśla ideę czystej formy i sprawia, że model jest maksymalnie oszczędny. Odważny projekt wygląda jak obiekt rzeźbiarski i tworzy mocny akcent wizualny. Masywność betonu łączy się z gładką plastyką, dając poczucie stabilności, porządku i architektonicznego rygoru. Umywalka dobrze sprawdza się w nowoczesnych, designerskich wnętrzach, w których liczy się forma i materiał.",
  },
  nori: {
    ukFix:
      "Nori — підлогова раковина з архітектурного бетону з плавними пропорціями та збалансованим силуетом. М'яка форма пом'якшує масивність матеріалу й створює відчуття спокою в просторі. Лаконічний дизайн виглядає сучасно та універсально, тому модель легко інтегрується в різні інтер'єрні стилі — від мінімалізму до сучасної класики. Архітектурний бетон підкреслює текстуру матеріалу й робить раковину виразним, але стриманим акцентом у ванній кімнаті.",
    en: "Nori is a freestanding architectural-concrete basin with flowing proportions and a balanced silhouette. Its soft shape tempers the mass of the material and brings a sense of calm to a space. The pared-back design looks modern and versatile, so the model integrates easily into different interior styles — from minimalism to contemporary classic. Architectural concrete highlights the texture of the material and makes the basin an expressive yet restrained accent in the bathroom.",
    pl: "Nori to wolnostojąca umywalka z betonu architektonicznego o płynnych proporcjach i zrównoważonej sylwetce. Miękki kształt łagodzi masywność materiału i wprowadza do wnętrza poczucie spokoju. Oszczędny projekt wygląda nowocześnie i uniwersalnie, dzięki czemu model łatwo wpisuje się w różne style — od minimalizmu po współczesną klasykę. Beton architektoniczny podkreśla fakturę materiału i czyni umywalkę wyrazistym, lecz stonowanym akcentem łazienki.",
  },
  square: {
    en: "SQUARE is a freestanding architectural-concrete basin with an expressive cubic form. Sharp edges and graphic geometry create a strong architectural image and turn the model into an accent object. The bold, minimalist design highlights the structure of the material and works as a pure form with no superfluous detail. The basin looks monolithic, stable and modern, and pairs well with minimalist, loft and contemporary-architecture interiors.",
    pl: "SQUARE to wolnostojąca umywalka z betonu architektonicznego o wyrazistej, kubicznej formie. Ostre krawędzie i graficzna geometria tworzą mocny, architektoniczny obraz i zamieniają model w akcent wnętrza. Odważny, minimalistyczny projekt podkreśla strukturę materiału i działa jak czysta forma bez zbędnych detali. Umywalka wygląda monolitycznie, stabilnie i nowocześnie, dobrze łączy się z wnętrzami w stylu minimalizm, loft i współczesna architektura.",
  },
  "odri-nakladna": {
    en: "ODRI countertop is a compact architectural-concrete basin for mounting on a worktop. Its clean round geometry looks restrained and modern while highlighting the texture of the material. The minimalist design lets the model sit easily in different interiors — from loft to contemporary classic. The basin looks tidy, does not crowd a space and works as a precise architectural accent. Natural concrete adds a sense of mass and tactility.",
    pl: "ODRI nablatowa to kompaktowa umywalka z betonu architektonicznego montowana na blacie. Czysta, okrągła geometria wygląda stonowanie i nowocześnie, podkreślając fakturę materiału. Minimalistyczny projekt pozwala łatwo wpisać model w różne wnętrza — od loftu po współczesną klasykę. Umywalka wygląda schludnie, nie przeciąża przestrzeni i działa jak precyzyjny akcent architektoniczny. Naturalny beton dodaje wrażenia masy i dotykowej faktury.",
    enName: "ODRI countertop", plName: "ODRI nablatowa",
  },
  "copy-odri-nakladna": {
    en: "MONRO countertop is an architectural-concrete basin for mounting on a worktop, with an elongated oval geometry. Flowing lines soften the mass of the material and bring a sense of calm and balance. The minimalist design looks tidy and modern and pairs well with natural materials and light interiors. The basin works as a pure architectural volume with no superfluous detail, highlighting the concrete texture and the tactility of the surface.",
    pl: "MONRO nablatowa to umywalka z betonu architektonicznego montowana na blacie, o wydłużonej, owalnej geometrii. Płynne linie łagodzą masywność materiału i wprowadzają poczucie spokoju oraz równowagi. Minimalistyczny projekt wygląda schludnie i nowocześnie, dobrze łączy się z naturalnymi materiałami i jasnymi wnętrzami. Umywalka działa jak czysta bryła architektoniczna bez zbędnych detali, podkreślając fakturę betonu i dotykowy charakter powierzchni.",
    enName: "MONRO countertop", plName: "MONRO nablatowa",
  },
  "copy-odri-nakladna-530": {
    en: "SOLO is a compact countertop architectural-concrete basin in a bowl shape. Its slim silhouette and flowing geometry create a sense of lightness despite the mass of the material. The minimalist design highlights the concrete texture and works as a neat accent on a worktop. The model looks modern, tactile and natural, and pairs well with stone, wood and warm interiors. The basin suits smaller spaces where clean form and function matter.",
    pl: "SOLO to kompaktowa umywalka nablatowa z betonu architektonicznego w kształcie misy. Smukła sylwetka i płynna geometria dają wrażenie lekkości mimo masywności materiału. Minimalistyczny projekt podkreśla fakturę betonu i działa jak schludny akcent na blacie. Model wygląda nowocześnie, dotykowo i naturalnie, dobrze łączy się z kamieniem, drewnem i ciepłymi wnętrzami. Umywalka pasuje do niewielkich przestrzeni, w których liczy się czysta forma i funkcjonalność.",
  },
  low: {
    en: "LOW is a countertop architectural-concrete basin with the lowest possible profile. Its flat bowl looks graphic and modern, emphasising the horizontal of the worktop. The minimalist geometry creates a sense of order and clean form, while the concrete texture adds materiality. The model is ideal for modern interiors where restraint and precise lines matter. The basin looks light, does not crowd a space and works as a neat designer accent.",
    pl: "LOW to nablatowa umywalka z betonu architektonicznego o maksymalnie niskim profilu. Płaska misa wygląda graficznie i nowocześnie, podkreślając poziom blatu. Minimalistyczna geometria tworzy poczucie porządku i czystej formy, a faktura betonu dodaje materialności. Model idealnie pasuje do nowoczesnych wnętrz, w których liczy się powściągliwość i precyzja linii. Umywalka wygląda lekko, nie przeciąża przestrzeni i działa jak schludny, designerski akcent.",
  },
  "semi-nakladna": {
    en: "SEMI is a countertop concrete basin with an expressive hemispherical form that combines sculptural presence and function. Its flowing lines create a sense of balance and calm, while the natural concrete texture underlines the materiality of the piece. The model is made by hand from architectural concrete and finished with a protective layer resistant to moisture and daily use. The deep bowl is comfortable to use and the shape becomes a soft accent in the interior. SEMI works well in minimalist, Scandinavian and natural interiors. Available in any body colour from the RAL or NCS palettes; tap connection from the wall.",
    pl: "SEMI to nablatowa umywalka betonowa o wyrazistej, półkulistej formie, która łączy rzeźbiarski charakter z funkcjonalnością. Płynne linie tworzą poczucie równowagi i spokoju, a naturalna faktura betonu podkreśla materialność wyrobu. Model wykonywany jest ręcznie z betonu architektonicznego i pokrywany warstwą ochronną odporną na wilgoć oraz codzienne użytkowanie. Dzięki głębokiej misie umywalka jest wygodna w użyciu, a jej kształt staje się miękkim akcentem wnętrza. SEMI dobrze sprawdza się w aranżacjach minimalistycznych, skandynawskich i naturalnych. Możliwe wykonanie w dowolnym kolorze masy według palet RAL lub NCS; podłączenie baterii ze ściany.",
  },
  "little-semi-nakladna": {
    en: "LITTLE SEMI is a compact countertop concrete basin created for modern interiors where every detail counts. Its pared-back hemispherical form looks clean and architectural, giving a space a sense of order and calm. Made from architectural concrete with a protective coating, the basin is resistant to moisture and daily use and easy to clean. Its small size makes it ideal for guest cloakrooms, commercial spaces or compact bathrooms. Every piece has a natural concrete texture that makes it unique. Available in a range of colours — from restrained neutrals to accent shades.",
    pl: "LITTLE SEMI to kompaktowa umywalka betonowa typu nablatowego, stworzona do nowoczesnych wnętrz, w których liczy się każdy detal. Oszczędna, półkulista forma wygląda czysto i architektonicznie, nadając przestrzeni poczucie porządku i spokoju. Wykonana z betonu architektonicznego z powłoką ochronną, umywalka jest odporna na wilgoć i codzienne użytkowanie oraz łatwa w czyszczeniu. Dzięki niewielkim rozmiarom idealnie pasuje do toalet dla gości, przestrzeni komercyjnych i kompaktowych łazienek. Każdy wyrób ma naturalną fakturę betonu, co czyni go niepowtarzalnym. Możliwe wykonanie w różnych kolorach — od stonowanych neutralnych po akcentowe odcienie.",
  },
  "square-nakladna": {
    en: "SQUARE countertop is a concrete basin with expressive geometry and a graphic bowl shape. Its clear lines give the piece an architectural character and make it the central accent of a bathroom. The model is made by hand from architectural concrete. The surface is protected against moisture and dirt, ensuring durability and easy care. The construction combines mass and precision, underlining a modern interior. Available in any body colour from the RAL or NCS palettes; tap connection from the wall.",
    pl: "SQUARE nablatowa to umywalka betonowa o wyrazistej geometrii i graficznym kształcie misy. Czyste linie nadają wyrobowi architektoniczny charakter i czynią go centralnym akcentem łazienki. Model wykonywany jest ręcznie z betonu architektonicznego. Powierzchnia zabezpieczona jest przed wilgocią i zabrudzeniami, co zapewnia trwałość i łatwą pielęgnację. Konstrukcja łączy masywność z precyzją, podkreślając nowoczesne wnętrze. Dostępne dowolne kolory masy według palet RAL lub NCS; podłączenie baterii ze ściany.",
    enName: "SQUARE countertop", plName: "SQUARE nablatowa",
  },
  skolot: {
    en: "Skolot is a freestanding architectural-concrete basin made as a sculpture in the form of a face. Organic modelling, soft features and a natural texture underline the handwork and the uniqueness of every piece. The surface keeps the character of the material, so the basin looks alive, tactile and emotional. The model works as a central art object, forming a strong visual accent and setting the mood of a space. It is a design piece that combines function and art.",
    pl: "Skolot to wolnostojąca umywalka z betonu architektonicznego wykonana jako rzeźba w formie twarzy. Organiczna plastyka, miękkie rysy i naturalna faktura podkreślają ręczną pracę i niepowtarzalność każdego egzemplarza. Powierzchnia zachowuje charakter materiału, dzięki czemu umywalka wygląda żywo, dotykowo i emocjonalnie. Model działa jak centralny obiekt artystyczny, tworząc mocny akcent wizualny i budując atmosferę wnętrza. To przedmiot designu łączący funkcję ze sztuką.",
  },
  flute: {
    en: "Flute is a concrete planter for outdoor plants or installations. What sets this model apart is the currently popular retro-fluted design paired with a modern material. The planter fits equally well in a LOFT-style exterior and beside period architecture. The concrete pot can be made in a range of shades.",
    pl: "Flute to donica betonowa do roślin zewnętrznych lub instalacji. Cechą tego modelu jest popularny obecnie projekt z retro-kanelurami w połączeniu z nowoczesnym materiałem. Donica równie dobrze pasuje do eksterieru w stylu LOFT, jak i obok zabytkowej architektury. Betonową donicę można wykonać w różnych odcieniach.",
  },
  "vazon-z-betonu-tsylindr-4060": {
    en: "«Cylinder 4060» is a stylish concrete planter for home and garden. Its pared-back cylindrical form easily complements modern and minimalist interiors, while the strength of concrete ensures durability and resistance to any weather. Benefits: ideal for large indoor and outdoor plants; the natural concrete texture adds character to a space; withstands temperature swings and moisture; suitable for private homes, offices, terraces and gardens. The concrete pot can be made in a range of colour shades.",
    pl: "«Cylinder 4060» to stylowa donica betonowa do domu i ogrodu. Oszczędna, cylindryczna forma łatwo uzupełnia nowoczesne i minimalistyczne wnętrza, a wytrzymałość betonu zapewnia trwałość i odporność na każdą pogodę. Zalety: idealna do dużych roślin doniczkowych i zewnętrznych; naturalna faktura betonu dodaje przestrzeni charakteru; znosi wahania temperatur i wilgoć; nadaje się do domów prywatnych, biur, tarasów i ogrodów. Betonową donicę można wykonać w różnych odcieniach.",
    enName: "Concrete Planter «Cylinder 4060»", plName: "Donica betonowa «Cylinder 4060»",
  },
  "vazon-z-betonu-elips-linea-60": {
    en: "«Ellipse Linea 60» is a compact yet very roomy concrete planter for indoor and outdoor plants. Its elegant elongated form is perfect for creating stylish green accents in any space. Benefits: ideal for windowsills, terraces and tables; the natural concrete texture suits modern interiors; resistant to moisture and temperature swings.",
    pl: "«Elipsa Linea 60» to kompaktowa, a zarazem bardzo pojemna donica betonowa do roślin doniczkowych i zewnętrznych. Elegancka, wydłużona forma świetnie nadaje się do tworzenia stylowych zielonych akcentów w każdej przestrzeni. Zalety: idealna na parapety, tarasy i stoły; naturalna faktura betonu pasuje do nowoczesnych wnętrz; odporna na wilgoć i wahania temperatur.",
    enName: "Concrete Planter «Ellipse Linea 60»", plName: "Donica betonowa «Elipsa Linea 60»",
  },
  "vazon-z-betonu-pivsfera-50": {
    en: "An original hemispherical concrete planter — a stylish solution for any space. Ideal for indoor and outdoor plants, it adds a modern look to your interior or garden. Its minimalist design pairs easily with other decor elements. Benefits: the expressive hemispherical shape looks striking in any space; suitable for use indoors and outdoors; light weight and resistant to moisture and temperature changes; natural concrete that adds originality and character.",
    pl: "Oryginalna donica betonowa w kształcie półkuli — stylowe rozwiązanie do każdej przestrzeni. Idealna do roślin doniczkowych i zewnętrznych, nadaje wnętrzu lub ogrodowi nowoczesny charakter. Minimalistyczny projekt łatwo łączy się z innymi elementami dekoru. Zalety: wyrazisty kształt półkuli efektownie wygląda w każdej przestrzeni; nadaje się do użytku wewnątrz i na zewnątrz; lekka oraz odporna na wilgoć i zmiany temperatur; naturalny beton, który dodaje oryginalności i charakteru.",
    enName: "Concrete Planter «Hemisphere 50»", plName: "Donica betonowa «Półsfera 50»",
  },
  "horshchyk-z-betonu-tsylindr-20": {
    en: "«Cylinder 20» is a minimalist cylindrical concrete pot — an ideal solution for indoor plants. Its simple, stylish design blends organically into any interior. The pot is perfect for smaller plants, giving them elegance and a modern look. Benefits: a pared-back, elegant design for any interior; suited to small houseplants; resistant to wear, moisture and temperature swings; light weight and compact size.",
    pl: "«Cylinder 20» to minimalistyczna, cylindryczna doniczka betonowa — idealne rozwiązanie do roślin doniczkowych. Prosty, stylowy projekt organicznie wpisuje się w każde wnętrze. Doniczka świetnie nadaje się do mniejszych roślin, dodając im elegancji i nowoczesnego charakteru. Zalety: oszczędny, elegancki projekt do każdego wnętrza; odpowiednia do małych roślin doniczkowych; odporna na zużycie, wilgoć i wahania temperatur; lekka i kompaktowa.",
    enName: "Concrete Pot «Cylinder 20»", plName: "Doniczka betonowa «Cylinder 20»",
  },
  "vazon-z-betonu-tsylindr-4040": {
    en: "«Cylinder 4040», from the ODUDLAB collection, brings together geometric simplicity and the natural texture of concrete. Its pared-back form emphasises clean lines and lets the plant become the main accent of a space. Made by hand from architectural concrete, the planter looks equally at home in a modern interior, on a terrace or in a garden. The strength of the material guarantees durability and resistance to rain, sun and frost. Benefits: ideal for medium and large indoor or outdoor plants; the natural concrete texture adds character; resistant to temperature swings, moisture and UV; suitable for home, office, terrace or garden. Available in any colour from the RAL or NCS palettes.",
    pl: "«Cylinder 4040» z kolekcji ODUDLAB łączy geometryczną prostotę z naturalną fakturą betonu. Oszczędna forma podkreśla czystość linii i pozwala roślinie stać się głównym akcentem przestrzeni. Wykonana ręcznie z betonu architektonicznego donica równie dobrze wygląda w nowoczesnym wnętrzu, na tarasie czy w ogrodzie. Wytrzymałość materiału gwarantuje trwałość i odporność na deszcz, słońce i mróz. Zalety: idealna do średnich i dużych roślin doniczkowych lub zewnętrznych; naturalna faktura betonu dodaje charakteru; odporna na wahania temperatur, wilgoć i promieniowanie UV; nadaje się do domu, biura, tarasu czy ogrodu. Możliwe wykonanie w dowolnym kolorze według palet RAL lub NCS.",
    enName: "Concrete Planter «Cylinder 4040»", plName: "Donica betonowa «Cylinder 4040»",
  },
  priamyi: {
    en: "«Linear 1000×300×500», from the ODUDLAB collection, is a minimalist rectangular planter made for those who value clean geometry and architectural balance. Its elongated form is ideal for compositions of several plants or decorative shrubs, adding structure and rhythm to a space. Made by hand from high-strength architectural concrete resistant to frost, moisture and UV. The planter looks harmonious in private courtyards as well as public spaces, on terraces or beside facades. Benefits: the pared-back form emphasises a modern style; ideal for linear green compositions and living borders; withstands temperature swings and moisture; suitable for home, office, terrace, facade or garden. Available in any colour from the RAL or NCS palettes.",
    pl: "«Prosta 1000×300×500» z kolekcji ODUDLAB to minimalistyczna, prostokątna donica stworzona dla tych, którzy cenią czystą geometrię i architektoniczną równowagę. Wydłużona forma idealnie nadaje się do kompozycji z kilku roślin lub ozdobnych krzewów, dodając przestrzeni struktury i rytmu. Wykonana ręcznie z wysokowytrzymałego betonu architektonicznego, odpornego na mróz, wilgoć i promieniowanie UV. Donica harmonijnie wygląda zarówno na prywatnych podwórzach, jak i w przestrzeniach publicznych, na tarasach czy przy fasadach. Zalety: oszczędna forma podkreśla nowoczesny styl; idealna do liniowych kompozycji zieleni i żywych obwódek; znosi wahania temperatur i wilgoć; nadaje się do domu, biura, tarasu, fasady czy ogrodu. Możliwe wykonanie w dowolnym kolorze według palet RAL lub NCS.",
    enName: "Concrete Planter «Linear 1000×300×500»", plName: "Donica betonowa «Prosta 1000×300×500»",
  },
  circle: {
    en: "Circle is a designer concrete coffee table on a metal base. It fits perfectly in a living room or studio, as well as a Loft-style office or restaurant. It looks especially good paired with the Hemisphere 17 concrete planter or the Slim concrete vase. The concrete top can be made in a range of shades: black, grey (base), white, flamingo, terracotta, ochre, emerald, sky blue and others. Top material: concrete. Base material: metal. Colour: to the RAL chart. Top diameter 600 mm. Table height 400 mm. Top thickness 25 mm. Weight 11.5 kg.",
    pl: "Circle to designerski betonowy stolik kawowy na metalowej podstawie. Świetnie sprawdzi się w salonie lub studiu, a także w biurze czy restauracji w stylu Loft. Szczególnie dobrze wygląda w zestawieniu z betonową donicą Półsfera 17 lub betonowym wazonem Slim. Betonowy blat można wykonać w różnych odcieniach: czarny, szary (bazowy), biały, flaming, terakota, ochra, szmaragd, błękit i inne. Materiał blatu: beton. Materiał podstawy: metal. Kolor: według palety RAL. Średnica blatu 600 mm. Wysokość stołu 400 mm. Grubość blatu 25 mm. Waga 11,5 kg.",
  },
  "zhurnalnyi-stolyk-z-betonu-korop": {
    en: "The Korop designer coffee table is a refined pairing of durable concrete and an elegant metal base. Simple yet stylish, it makes a fine addition to your interior, adding a modern, individual note to your space. Benefits: a modern minimalist design that suits any interior; a sturdy concrete top and metal frame for reliability and durability; ideal for a living room, office or lobby.",
    pl: "Designerski stolik kawowy Korop to wyrafinowane połączenie trwałego betonu i eleganckiej metalowej podstawy. Prosty, a zarazem stylowy, stanie się doskonałym uzupełnieniem wnętrza, dodając przestrzeni nowoczesności i indywidualnego charakteru. Zalety: nowoczesny, minimalistyczny projekt pasujący do każdego wnętrza; solidny betonowy blat i metalowa rama zapewniają niezawodność i trwałość; idealny do salonu, biura lub lobby.",
    enName: "Korop Concrete Coffee Table", plName: "Betonowy stolik kawowy Korop",
  },
  "komplekt-zhurnalnykh-stolykiv-z-betonu": {
    en: "The concrete coffee-table set is a successful blend of function and modern design. Pared-back forms and the natural texture of concrete make these tables an ideal choice for minimalist, loft or Scandinavian-modern interiors. Benefits: added function thanks to the different table sizes; a modern look and natural material; easy to combine or use separately; strength, resistance to damage and durability. Ideal for: living rooms; lounge areas; offices and coworking spaces. Features: natural concrete with a protective coating; resistance to scratches and moisture; available in a range of RAL colours (on request).",
    pl: "Zestaw betonowych stolików kawowych to udane połączenie funkcjonalności i nowoczesnego designu. Oszczędne formy i naturalna faktura betonu czynią te stoliki idealnym rozwiązaniem do wnętrz w stylu minimalizm, loft czy skandynawski modernizm. Zalety: dodatkowa funkcjonalność dzięki różnym rozmiarom stolików; nowoczesny wygląd i naturalny materiał; łatwe do łączenia lub używania osobno; wytrzymałość, odporność na uszkodzenia i trwałość. Idealne do: salonu; strefy wypoczynku; biur i coworkingów. Cechy: naturalny beton z powłoką ochronną; odporność na zarysowania i wilgoć; możliwość wykonania w różnych kolorach według skali RAL (na zamówienie).",
    enName: "Concrete Coffee Table Set", plName: "Zestaw betonowych stolików kawowych",
  },
  "urban-n": {
    en: "A modern concrete-and-wood bench for the urban space. Base — fibre-reinforced concrete. Seat — Alder wood treated with Remmers facade oil-glaze (Germany). Fixings — galvanised painted steel. The concrete base can be tinted to any other colour on request.",
    pl: "Nowoczesna ławka z betonu i drewna do przestrzeni miejskiej. Podstawa — fibrobeton. Siedzisko — drewno olchowe zabezpieczone lazurą olejną do fasad Remmers (Niemcy). Mocowania — stal cynkowana malowana. Podstawę betonową można zabarwić na dowolny inny kolor na zamówienie.",
  },
  hampy: {
    en: "Base — concrete. The concrete can be tinted to any other colour on request. The bollard is fixed by setting reinforcement dowels into pre-prepared holes (in asphalt or paving) of the appropriate size.",
    pl: "Podstawa — beton. Beton można zabarwić na dowolny inny kolor na zamówienie. Słupek mocowany jest przez osadzenie wypustów zbrojeniowych w wcześniej przygotowanych otworach (w asfalcie lub kostce) o odpowiednim rozmiarze.",
  },
  rock: {
    en: "A versatile concrete-and-metal bin for the urban space. Base — fibre-reinforced concrete. Lid — galvanised painted steel. The concrete base can be tinted to any other colour on request.",
    pl: "Uniwersalny kosz z betonu i metalu do przestrzeni miejskiej. Podstawa — fibrobeton. Pokrywa — stal cynkowana malowana. Podstawę betonową można zabarwić na dowolny inny kolor na zamówienie.",
  },
  "urban-b": {
    en: "A modern concrete-and-wood bench for the urban space. Base — fibre-reinforced concrete. Seat — Alder wood treated with Remmers facade oil-glaze (Germany). Fixings — galvanised painted steel. The concrete base can be tinted to any other colour on request.",
    pl: "Nowoczesna ławka z betonu i drewna do przestrzeni miejskiej. Podstawa — fibrobeton. Siedzisko — drewno olchowe zabezpieczone lazurą olejną do fasad Remmers (Niemcy). Mocowania — stal cynkowana malowana. Podstawę betonową można zabarwić na dowolny inny kolor na zamówienie.",
  },
  volcano: {
    en: "A designer concrete tree grate for the urban space. Material — fibre-reinforced concrete, with the option to tint to any other colour on request.",
    pl: "Designerska betonowa krata pod drzewo do przestrzeni miejskiej. Materiał — fibrobeton, z możliwością zabarwienia na dowolny inny kolor na zamówienie.",
  },
  "town-b": {
    en: "A modern concrete-and-wood bench for the urban space. Base — fibre-reinforced concrete. Seat — Alder wood treated with Remmers facade oil-glaze (Germany). Fixings — galvanised painted steel. The concrete base can be tinted to any other colour on request.",
    pl: "Nowoczesna ławka z betonu i drewna do przestrzeni miejskiej. Podstawa — fibrobeton. Siedzisko — drewno olchowe zabezpieczone lazurą olejną do fasad Remmers (Niemcy). Mocowania — stal cynkowana malowana. Podstawę betonową można zabarwić na dowolny inny kolor na zamówienie.",
  },
  "panno-z-betonu-buddha": {
    en: "A wall panel made by hand from natural concrete. The minimalist face form, free of decorative elements, highlights the texture of the material and the natural irregularities of the surface. Every piece is unique thanks to the character of hand casting. Suited to minimalist, loft, wabi-sabi and ethno interiors. Fitted with an integrated mount for wall installation.",
    pl: "Panel ścienny wykonany ręcznie z naturalnego betonu. Minimalistyczna forma twarzy, pozbawiona elementów dekoracyjnych, podkreśla fakturę materiału i naturalne nierówności powierzchni. Każdy egzemplarz jest niepowtarzalny dzięki charakterowi ręcznego odlewu. Pasuje do wnętrz w stylu minimalizm, loft, wabi-sabi i etno. Wyposażony we wbudowany uchwyt do montażu na ścianie.",
    enName: "BUDDHA Concrete Wall Panel", plName: "Betonowy panel ścienny BUDDHA",
  },
  riflo: {
    ukFix:
      "Декоративні стінові панелі з фібробетону для інтер'єру. Висока міцність, стабільна геометрія, сучасна рельєфна фактура. Кольори: сірий (базовий), бежевий, індивідуальний колір за RAL / NCS (за погодженням). Вага — ~30 кг/м². Товщина — 18 мм. Доступні розміри (В × Ш): 1125 × 1190 мм, 1125 × 925 мм, 1120 × 793 мм, 1070 × 793 мм.",
    en: "Decorative fibre-concrete wall panels for interiors. High strength, stable geometry, a modern relief texture. Colours: grey (base), beige, or a custom colour to RAL / NCS (by agreement). Weight — approx. 30 kg/m². Thickness — 18 mm. Available sizes (H × W): 1125 × 1190 mm, 1125 × 925 mm, 1120 × 793 mm, 1070 × 793 mm.",
    pl: "Dekoracyjne panele ścienne z fibrobetonu do wnętrz. Wysoka wytrzymałość, stabilna geometria, nowoczesna faktura reliefowa. Kolory: szary (bazowy), beżowy, kolor indywidualny według RAL / NCS (po uzgodnieniu). Waga — ok. 30 kg/m². Grubość — 18 mm. Dostępne wymiary (wys. × szer.): 1125 × 1190 mm, 1125 × 925 mm, 1120 × 793 mm, 1070 × 793 mm.",
  },
};

interface LocaleCopy {
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
}
interface Entry {
  slug: string;
  name: string;
  category: string;
  locales: { uk: LocaleCopy; en: LocaleCopy; pl: LocaleCopy };
}

function topCategory(category: string): string {
  return category.split(/[\s/]/)[0];
}

function main() {
  const doc = JSON.parse(readFileSync(FILE, "utf8")) as {
    _meta: Record<string, string>;
    products: Entry[];
  };

  let filled = 0;
  const missing: string[] = [];

  for (const p of doc.products) {
    const tr = T[p.slug];
    // Skip the 6 authored pilots (already have en/pl) and anything not in T.
    if (!tr) {
      if (!p.locales.en.shortDescription) missing.push(p.slug);
      continue;
    }
    const cat = topCategory(p.category);
    const enName = tr.enName ?? p.name;
    const plName = tr.plName ?? p.name;

    if (tr.ukFix) {
      p.locales.uk.shortDescription = tr.ukFix;
      p.locales.uk.seoDescription = firstSentences(tr.ukFix, 155);
    }

    p.locales.en = {
      shortDescription: tr.en,
      seoTitle: `${enName} — ${CAT_EN[cat] ?? "Catalogue"} | ODUDLAB`,
      seoDescription: firstSentences(tr.en, 155),
    };
    p.locales.pl = {
      shortDescription: tr.pl,
      seoTitle: `${plName} — ${CAT_PL[cat] ?? "Katalog"} | ODUDLAB`,
      seoDescription: firstSentences(tr.pl, 155),
    };
    filled++;
  }

  doc._meta.translationsNote =
    "EN/PL for the 32 non-pilot products are AI-authored from the Ukrainian source copy (no invented facts) and NOT yet human-verified; a native review is recommended before treating them as final.";
  doc._meta.translationsGeneratedAt = new Date().toISOString();

  writeFileSync(FILE, JSON.stringify(doc, null, 2), "utf8");
  console.log(`Filled EN/PL for ${filled} products → ${path.relative(process.cwd(), FILE)}`);
  if (missing.length) {
    console.log(`Still missing EN (no translation supplied): ${missing.length}`);
    console.log("  " + missing.join(", "));
  } else {
    console.log("All non-pilot products now have EN/PL.");
  }
}

main();
