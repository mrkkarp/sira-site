# SIRA LAB — demo site

Статичний сайт-каталог виробів з архітектурного бетону. Без бекенду: дані товарів
живуть у `products.json`, кожна сторінка товару — окремий статичний HTML-файл.

## Структура

```
index.html            Головна + каталог (пошук, сортування, фільтр категорій)
about.html            Про майстерню
delivery.html         Оплата і доставка
wishlist.html         Список бажань (localStorage)
style.css             Усі стилі
site.js               Спільна логіка: вішлист, "переглянуті товари", модалка дзвінка
products.json         Каталог товарів (по одному рядку на товар/групу кольорів) — читає index.html/wishlist.html
product/*.html        Згенеровані сторінки товарів (не редагувати вручну!)
product/_template.html  Шаблон, з якого генеруються сторінки товарів
scripts/build_site.ps1  Генератор: перетворює scripts/data/products-source.json на products.json + product/*.html
scripts/data/products-source.json  Вихідні дані товарів (усі варіанти кольору, повні описи)
```

## Як запустити локально

**macOS / Linux:**
```
cd concrete-decor-demo
python3 -m http.server 8099
```
Відкрити http://localhost:8099

**Windows (якщо немає Python):**
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

## Як перегенерувати сторінки товарів

Якщо змінили `scripts/data/products-source.json` (додали товар, поправили опис/ціну) або
відредагували `product/_template.html` — перезапустіть генератор:

```
pwsh scripts/build_site.ps1 -ProductsJson scripts/data/products-source.json -TemplatePath product/_template.html -SiteDir .
```

На macOS для команди `pwsh` потрібен PowerShell (`brew install --cask powershell`) —
сам скрипт кросплатформний, Windows-специфічного коду в ньому немає.

Формат `products-source.json` (масив об'єктів):
```json
{
  "sku": "Odri",
  "parentSku": "Odri",
  "name": "ODRI",
  "category": "Раковини/Підлогові",
  "price": 15150,
  "photo": "https://...",
  "alias": "rakovyna-na-pidlohu-odri",
  "shortDesc": "...",
  "fullDesc": "...",
  "color": "Сірий базовий",
  "show": "Да"
}
```
Товари з однаковим `parentSku` групуються в одну сторінку (варіант "Сірий базовий" —
основний, будь-який інший — варіант "у кольорі" з перемикачем ціни/опису).

## Чого свідомо немає

- Кошика й оплати — за домовленістю не додавали.
- Форма "Замовити дзвінок" нічого нікуди не надсилає (немає бекенду/пошти).
- Відгуків і порівняння товарів (щоб не вигадувати фейковий контент).

## SEO

`sitemap.xml` і `robots.txt` містять тимчасовий домен-заглушку — замініть на реальний,
коли визначитесь із доменом.
