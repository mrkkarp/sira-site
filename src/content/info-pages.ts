import type { Locale } from "@/i18n/config";

/**
 * Long-form INFO-page body content. `payment-delivery` and `returns` are
 * transcribed VERBATIM from the live ODUDLAB (Horoshop) export in
 * `_horoshop-export/pages-html/`; `care` is the one exception — see its note
 * below. This lives in its own module — deliberately NOT in the i18n
 * dictionaries — because
 * `src/i18n/get-dictionary.ts` types `Dictionary = typeof uk.json` with no
 * fallback, so any key added to `uk.json` must also exist in `en.json` and
 * `pl.json` or the build breaks. Body content is per-locale-optional here so
 * a locale can simply be absent (see below).
 *
 * Locale coverage — dictated strictly by what the export actually contains:
 * - `uk` — the Ukrainian source pages have real body prose, transcribed here.
 * - `en` — INTENTIONALLY ABSENT. The `en__*` export files exist but their
 *   `article-text` body regions are completely empty (only the page `<h1>`
 *   title is present, and even that is blank for care/pamiatka). There is no
 *   English prose to render, and we never translate or fabricate content, so
 *   these routes fall back to the `PlaceholderPage` + `noindex` shell for `en`
 *   exactly as they do for `pl`.
 * - `pl` — INTENTIONALLY ABSENT. No Polish source exists at all; those routes
 *   stay on `PlaceholderPage` + `noindex`.
 *
 * `care` is EDITORIALLY REWRITTEN, not transcribed — the only page here that
 * is. The Horoshop source duplicated itself (the "Пам'ятка користування" memo
 * in `pamiatka-korystuvannia.html` restated the care text almost word for
 * word), carried russisms ("столешень", "царапин", "состав"), and opened with
 * warnings about porosity before any reassurance, which read as off-putting to
 * a prospective buyer. Rewritten on the owner's instruction (2026-08-06) into
 * ordered sections, leading with the protection already applied.
 *
 * Every factual claim is still sourced from ODUDLAB's own material — the
 * Horoshop care page and memo, plus four archived posts from the pre-Horoshop
 * WordPress blog recovered via the Wayback Machine:
 * - `.../yak-doglyadaty-za-betonom-v-inter-yeri` — protection + care rules
 * - `.../tehnichni-harakterystyky-betonu-vid-odudlab` — БСл В35 П5 F200 W8
 * - `.../chi-mojna-zrobutu-kolir-betony-v-ral` — why shade varies per piece
 * - `.../video-instruktsiya-po-pidklyuchennyu-syfona...` — siphon fitting;
 *   that URL redirects to `/care`, so the instruction belongs on this page.
 * Nothing here is invented. Do not add care claims without a source.
 */

export type InfoPageSection = {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
};

export type InfoPageContent = { sections: InfoPageSection[] };

export const infoPages: Record<
  string,
  Partial<Record<Locale, InfoPageContent>>
> = {
  "payment-delivery": {
    uk: {
      sections: [
        {
          paragraphs: ["Здійснити оплату можна:"],
          bullets: [
            "через систему LiqPay",
            "по виставленому рахунку від ФОП (або ТОВ)",
            "готівкою в нашому офісі",
          ],
        },
        {
          heading: "Доставка",
          paragraphs: [],
          bullets: [
            "Самовивіз з нашого магазину — безкоштовно",
            "«Новою поштою» по Україні — за тарифами перевізника",
            "Кур'єром по Києву — за тарифами перевізника",
          ],
        },
      ],
    },
  },

  returns: {
    uk: {
      sections: [
        {
          paragraphs: [
            "Гарантія на наші вироби - 12 місяців.",
            "Обов'язково оглядайте Ваше замовлення, коли забираєте його з Нової Пошти. Всі наші посилки застраховані на їх повну вартість, тому Ви маєте повне право на відшкодування збитків, якщо виявили сколи або ж виріб приїхало розбитий. Повернути товар у магазин (або обміняти його на інший аналогічний) можна протягом 14 днів із дня покупки. Це правило поширюється на товари належної якості, тобто невикористані та непошкоджені.",
            "Для довговічного збереження експлуатаційних і декоративних характеристик рекомендуємо ознайомитися з ПАМ'ЯТКОЮ ПОВОДЖЕННЯ З БЕТОННИМИ ВИРОБАМИ",
            "Якщо замовлення на виріб із бетону індивідуальне, виготовлене під розміри та/або в кольорі, текстурі визначених покупцем (замовником), то даний товар відноситься до переліку товарів додатку № 3 постанови Кабінету Міністрів України від 19.03.1994 № 172 (Перелік товарів належної якості, що не підлягають обміну ( поверненню)). Передплата за виріб не повертається, передплата йде на перекриття витрат до індивідуального замовлення.",
          ],
        },
        {
          paragraphs: [
            "Товар не підлягає обміну та поверненню у таких випадках:",
          ],
          bullets: [
            "З моменту придбання Товару пройшло більше 14 календарних днів",
            "З моменту придбання Товару не минуло 14 календарних днів, але товар був у вживанні, порушена цілісність упаковки та/або комплектність, відсутні бірки/цінники тощо.",
            "Товар міститься в переліку товарів, які не підлягають поверненню та обміну, згідно з Постановою Кабінету Міністрів України №172 від 19 березня 1994 року (у чинній редакції) https://zakon4.rada.gov.ua/laws/show/172-94-%D0%BF",
            "Відвідувач (Покупець) відмовляється надати фотоматеріали бракованого та/або несправного на його погляд товару",
          ],
        },
        {
          paragraphs: [
            "Обміну або поверненню підлягає тільки новий товар, який не був у вжитку і не має слідів використання: подряпин, сколів, потертостей повинні бути збережені: повний комплект товару, цілісність і всі компоненти упаковки, ярлики, заводське маркування та оригінал документа, що підтверджує факт покупки відповідного Товару. Порушення будь-якого з цих пунктів залишає за Адміністрацією право відмовити відвідувачу (покупцеві) в обміні або поверненні товару.",
            "У разі відмови Відвідувача (Покупця) від товару Адміністрація повертає йому суму, сплачену Покупцем, за винятком витрат Продавця на доставку від Покупця повернутих товарів.",
          ],
        },
      ],
    },
  },

  care: {
    uk: {
      sections: [
        {
          paragraphs: [
            "Вироби ODUDLAB не потребують складного догляду. Кожен виріб виходить з майстерні вже захищеним — покриття наносимо на етапі виробництва, тож користуватися ним можна одразу після встановлення.",
            "Нижче — як зберегти вигляд бетону на роки і що вважати нормою, а що ні.",
          ],
        },
        {
          heading: "Захист, який уже нанесено",
          paragraphs: [
            "Бетон — природний матеріал з пористою структурою, як дерево чи мармур. Саме тому кожен виріб проходить обов'язкову поверхневу обробку ще в майстерні, перед тим як потрапити до вас.",
          ],
          bullets: [
            "Стільниці й умивальники просочуємо двокомпонентним поліуретановим складом — прозорим, матовим, гігієнічно безпечним. Наносимо 3–4 шари: вони закривають пори бетону й утворюють захисну плівку, яка не пропускає рідину.",
            "Вазони, кашпо та декор покриваємо водовідштовхувальним гідрофобізатором.",
          ],
        },
        {
          heading: "Щоденний догляд",
          paragraphs: [
            "Достатньо м'якої серветки або губки, теплої води й делікатного мийного засобу — того самого, яким ви миєте будь-яку іншу поверхню в домі.",
          ],
          bullets: [
            "Розлите краще витирати одразу — особливо каву, вино, олію та інші барвні рідини.",
            "Жирні плями теж не варто залишати надовго: свіжі прибираються звичайним засобом без зусиль.",
          ],
        },
        {
          heading: "Чого варто уникати",
          paragraphs: ["Три речі, які справді можуть зашкодити покриттю:"],
          bullets: [
            "Абразивні губки та чистильні порошки — вони подряпають захисний шар.",
            "Агресивна хімія — кислотні й лужні засоби.",
            "Сильні удари та гострі предмети — від них можливі сколи й пошкодження плівки.",
          ],
        },
        {
          heading: "Якщо подряпина все ж з'явилась",
          paragraphs: [
            "Хвилюватись не варто. Пошкодження захисного шару — це питання зовнішнього вигляду, а не міцності: щоб бетон втратив функціональні характеристики, ерозія має тривати не одне десятиліття.",
            "До того ж на тлі всієї бетонної поверхні дрібні подряпини майже непомітні — жива фактура ховає їх краще за будь-який однорідний матеріал.",
            "А якщо захочете повернути ідеальний вигляд, покриття завжди можна оновити поверх — тими самими засобами й за тією самою технологією.",
          ],
        },
        {
          heading: "Що є нормою для бетону",
          paragraphs: [
            "Бетон робиться з природних компонентів: цементу, піску, щебеню й води. Через це кожен виріб виходить унікальним — відтінок, дрібні пори й візерунок на поверхні ніколи не повторюються двічі.",
            "Навіть та сама суміш, замішана однією людиною в одному місці, щоразу дає трохи інший результат: на це впливають вологість повітря, неоднорідність піску, швидкість заливки, матеріал форми, умови висихання.",
            "Тому невелика різниця у відтінку між фотографією і вашим виробом — не дефект, а властивість матеріалу. Саме ця глибина фактури й робить бетон таким затребуваним у дизайні.",
          ],
        },
        {
          heading: "Технічні характеристики",
          paragraphs: ["Бетон майстерні ODUDLAB: БСл В35 П5 F200 W8."],
          bullets: [
            "В35 — клас міцності, найвищий у шкалі від В5 до В35.",
            "F200 — морозостійкість: 200 циклів замерзання й відтавання.",
            "W8 — водонепроникність.",
            "П5 — рухливість суміші.",
            "БСл — бетонна суміш легка.",
          ],
        },
        {
          heading: "Підключення сифона до умивальника",
          paragraphs: [
            "До щілинної раковини з бетону підійде будь-який стандартний сифон.",
            "На нижній частині умивальника є отвір із забетонованою закладною під шпильку М6. Вставте шпильку в отвір і закрутіть за годинниковою стрілкою до легкого упору. Далі наживіть на неї нижню частину сифона з ущільнювальною прокладкою і підключіть до сантехнічних виводів за класичною схемою.",
          ],
        },
        {
          heading: "Залишились питання?",
          paragraphs: [
            "Напишіть або зателефонуйте — підкажемо, як доглядати за вашим конкретним виробом: +380 96 154 55 84, odudlab@gmail.com",
          ],
        },
      ],
    },
  },
};

export function getInfoPageContent(
  slug: string,
  locale: Locale,
): InfoPageContent | undefined {
  return infoPages[slug]?.[locale];
}
