# Content glossary (UK → EN → PL)

Canonical translations for the terms that actually appear in the OdudLab
catalogue. **UK is the source of truth.** EN is British English; PL is Polish.
Use these exact renderings so product copy, specs, and SEO stay consistent
across the three locales.

Every term below was extracted from real source data
(`_content-audit/facts-audit.json`) — this glossary intentionally contains no
material, technology, certification, or warranty vocabulary that the catalogue
does not itself use. Do not add terms here to "enrich" copy; add them only
when a real, source-verified product uses them.

## Materials & brand

| UK                    | EN (British)             | PL                        | Notes |
| --------------------- | ------------------------ | ------------------------- | ----- |
| архітектурний бетон   | architectural concrete   | beton architektoniczny    | The core material claim. Never upgrade to "high-performance", "reinforced", "nano-", etc. — the source says only this. |
| бетон                 | concrete                 | beton                     | |
| ручна робота          | handmade / handcrafted   | ręcznie wykonane          | Only where the source states it. |

## Product types

| UK                | EN (British)          | PL                    | Notes |
| ----------------- | --------------------- | --------------------- | ----- |
| раковина          | washbasin / basin     | umywalka              | Prefer "washbasin". "sink" only for kitchen contexts (none here). |
| раковина на підлогу / підлогова | floor-standing basin | umywalka wolnostojąca (podłogowa) | |
| накладна раковина | countertop basin      | umywalka nablatowa    | |
| кашпо             | planter               | donica                | |
| стіл              | table                 | stół                  | |
| стільниця         | countertop / worktop  | blat                  | |
| настінна панель   | wall panel            | panel ścienny         | |
| настінний модуль  | wall module           | moduł ścienny         | |
| настінне мистецтво / декор | wall art       | dekoracja ścienna     | |

## Spec labels (the 11 real ones)

| UK                 | EN (British)        | PL                   |
| ------------------ | ------------------- | -------------------- |
| Матеріал           | Material            | Materiał             |
| Висота             | Height              | Wysokość             |
| Ширина             | Width               | Szerokość            |
| Глибина            | Depth               | Głębokość            |
| Діаметр            | Diameter            | Średnica             |
| Ширина / діаметр   | Width / diameter    | Szerokość / średnica |
| Вага               | Weight              | Waga                 |
| Колір              | Colour              | Kolor                |
| Монтаж             | Installation / mounting | Montaż           |
| Підключення        | Connection          | Podłączenie          |
| Тип змішувача      | Mixer type / tap type | Typ baterii        |

## Mixer / connection values (verbatim set — translate 1:1, invent no new options)

| UK                                | EN (British)                          | PL                                        |
| --------------------------------- | ------------------------------------- | ----------------------------------------- |
| зі стіни                          | wall-mounted                          | ścienny (z ściany)                        |
| зі стіни або з раковини           | wall-mounted or basin-mounted         | ścienny lub montowany w umywalce          |
| зі стіни, окремо стоячий          | wall-mounted, free-standing           | ścienny, wolnostojący                     |
| можливе зі стіни або з підлоги    | wall or floor connection possible     | możliwe podłączenie ścienne lub podłogowe |
| накладний на стільницю            | countertop-mounted                    | nablatowy                                 |
| приховане                         | concealed                             | ukryte                                    |
| приховане підлогове               | concealed floor connection            | ukryte podłączenie podłogowe              |
| інтегрований у раковину           | integrated into the basin             | zintegrowany z umywalką                   |
| інтегрований або зі стіни         | integrated or wall-mounted            | zintegrowany lub ścienny                  |

## Units & formatting

- Metric only (source is metric): cm, kg. Keep the tilde on approximate
  weights (`~100 кг` → `~100 kg` → `~100 kg`) — it is a real source hedge,
  not a typo; do not present an approximate figure as exact.
- Decimal separator: keep `.` in EN (`4.3 kg`), use `,` in PL (`4,3 kg`).
- Prices are stored in UAH (`basePrice`). Do not hardcode converted prices in
  copy — currency/format is a presentation concern, not description text.

## Lead time & stock (only when source states it)

| UK                                       | EN (British)                          | PL                                         |
| ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| Термін виготовлення — N тижнів           | Lead time — N weeks                    | Czas realizacji — N tygodni                |
| виготовляється на замовлення             | made to order                          | wykonywane na zamówienie                   |
| може бути відсутня на складі             | may be out of stock                    | może być niedostępne w magazynie           |

> `undefined` lead time / stock = the source is **silent**. Silence is not a
> claim. Never write "in stock", "ships in X days", or a made-up lead time.
