param([string]$ProductsJson, [string]$TemplatePath, [string]$SiteDir)

$products = Get-Content $ProductsJson -Raw -Encoding UTF8 | ConvertFrom-Json
$template = Get-Content $TemplatePath -Raw -Encoding UTF8
$OutDir = Join-Path $SiteDir "product"

$groups = [ordered]@{}
foreach ($p in $products) {
  $key = if ($p.parentSku) { $p.parentSku } else { $p.sku }
  if (-not $groups.Contains($key)) { $groups[$key] = New-Object System.Collections.ArrayList }
  [void]$groups[$key].Add($p)
}

function JsonEscape($s) {
  if ($null -eq $s) { return "" }
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace '"', '\"'
  $s = $s -replace "`r`n", '\n'
  $s = $s -replace "`n", '\n'
  return $s
}

function HtmlEscape($s) {
  if ($null -eq $s) { return "" }
  $s = $s -replace '&', '&amp;'
  $s = $s -replace '<', '&lt;'
  $s = $s -replace '>', '&gt;'
  return $s
}

function FormatPrice($n) {
  $s = [string][int]$n
  $rev = ($s[($s.Length-1)..0] -join "")
  $chunks = [regex]::Matches($rev, ".{1,3}") | ForEach-Object { $_.Value }
  $grouped = ($chunks -join " ")
  $arr = $grouped.ToCharArray()
  [array]::Reverse($arr)
  return (-join $arr) + " грн"
}

function TopCategory($category) {
  if (-not $category) { return "Інше" }
  if ($category.StartsWith("Раковини")) { return "Раковини" }
  if ($category.StartsWith("Вазони")) { return "Вазони" }
  if ($category.StartsWith("Столики")) { return "Столики" }
  if ($category.StartsWith("Вуличні меблі")) { return "Вуличні меблі" }
  if ($category.StartsWith("Панелі") -or $category.StartsWith("Панно")) { return "Панно" }
  return $category
}

function Slugify($base, $key) {
  $slug = $base.alias
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = $key }
  return ($slug -replace '[^a-zA-Z0-9]+', '-').Trim('-').ToLower()
}

function SplitDesc($fullDesc) {
  if (-not $fullDesc) { return @{ desc = ""; specs = @() } }
  $lines = $fullDesc -split "`n"
  $descLines = New-Object System.Collections.ArrayList
  $specLines = New-Object System.Collections.ArrayList
  $inSpecs = $false
  foreach ($line in $lines) {
    $t = $line.Trim()
    if ($t -eq "Характеристики") { $inSpecs = $true; continue }
    if ($t -eq "-") { continue }
    if ($t -eq "Стислий опис" -or $t -eq "Повний опис") { continue }
    if ($t.StartsWith("EN:")) { continue }
    if ($t.StartsWith("UA:")) { $t = $t.Substring(3).Trim() }
    if ($t -eq "") { continue }
    if ($inSpecs) { [void]$specLines.Add($t) } else { [void]$descLines.Add($t) }
  }
  $specs = @()
  foreach ($sl in $specLines) {
    $idx = $sl.IndexOf(":")
    if ($idx -gt 0) {
      $specs += [ordered]@{ label = $sl.Substring(0, $idx).Trim(); value = $sl.Substring($idx + 1).Trim() }
    }
  }
  return @{ desc = ($descLines -join "`n"); specs = $specs }
}

# First pass: compute slug + topCategory for every group (needed for products.json + related-product links)
$groupInfo = [ordered]@{}
foreach ($key in $groups.Keys) {
  $variants = $groups[$key]
  $base = $variants | Where-Object { $_.color -eq "Сірий базовий" } | Select-Object -First 1
  if (-not $base) { $base = $variants[0] }
  $colorVariant = $variants | Where-Object { $_.sku -ne $base.sku } | Select-Object -First 1
  $groupInfo[$key] = [ordered]@{
    base = $base
    colorVariant = $colorVariant
    slug = Slugify $base $key
    topCategory = TopCategory $base.category
  }
}

# Write products.json (one row per group) for catalog/search/sort/related products
$catalogRows = @()
foreach ($key in $groupInfo.Keys) {
  $gi = $groupInfo[$key]
  $catalogRows += [ordered]@{
    slug = $gi.slug
    sku = $gi.base.sku
    name = $gi.base.name
    category = $gi.base.category
    topCategory = $gi.topCategory
    price = [int]$gi.base.price
    photo = $gi.base.photo
    hasColorVariant = [bool]$gi.colorVariant
  }
}
$catalogJsonPath = Join-Path $SiteDir "products.json"
$catalogRows | ConvertTo-Json -Depth 5 | Out-File -FilePath $catalogJsonPath -Encoding utf8

# Generate each product page
$count = 0
foreach ($key in $groupInfo.Keys) {
  $gi = $groupInfo[$key]
  $base = $gi.base
  $colorVariant = $gi.colorVariant
  $split = SplitDesc $base.fullDesc

  $toggleHtml = ""
  $dataObj = "{"
  $dataObj += "`"base`":{`"price`":$([int]$base.price),`"desc`":`"$(JsonEscape $split.desc)`",`"photo`":`"$(JsonEscape $base.photo)`"}"

  if ($colorVariant) {
    $toggleHtml = "<button class=`"variant-btn active`" data-variant=`"base`">Сірий базовий</button><button class=`"variant-btn`" data-variant=`"color`">У вашому кольорі</button>"
    $colorSplit = SplitDesc $colorVariant.fullDesc
    $colorDescText = $colorSplit.desc
    if ($colorDescText.Trim() -eq $split.desc.Trim() -and $colorVariant.shortDesc) {
      $colorDescText = "$($split.desc)`n`n$($colorVariant.shortDesc)"
    }
    $dataObj += ",`"color`":{`"price`":$([int]$colorVariant.price),`"desc`":`"$(JsonEscape $colorDescText)`",`"photo`":`"$(JsonEscape $colorVariant.photo)`"}"
  }
  $dataObj += "}"

  $specsHtml = ""
  foreach ($spec in $split.specs) {
    $specsHtml += "<div class=`"spec-row`"><span>$(HtmlEscape $spec.label)</span><strong>$(HtmlEscape $spec.value)</strong></div>"
  }
  if (-not $specsHtml) { $specsHtml = "<p>Характеристики уточнюйте у майстерні.</p>" }

  # Breadcrumb
  $catParts = $base.category -split "/"
  $breadcrumbHtml = "<a href=`"../index.html`">Головна</a>"
  $breadcrumbHtml += " / <a href=`"../index.html?cat=$([uri]::EscapeDataString($gi.topCategory))#catalog`">$(HtmlEscape $gi.topCategory)</a>"
  if ($catParts.Count -gt 1 -and $catParts[1].Trim() -ne "") {
    $breadcrumbHtml += " / $(HtmlEscape $catParts[1].Trim())"
  }
  $breadcrumbHtml += " / $(HtmlEscape $base.name)"

  $html = $template
  $html = $html.Replace("{{TITLE}}", (HtmlEscape "$($base.name) — SIRA LAB"))
  $html = $html.Replace("{{META_DESC}}", (HtmlEscape $base.shortDesc))
  $html = $html.Replace("{{BREADCRUMB}}", $breadcrumbHtml)
  $html = $html.Replace("{{PHOTO}}", $base.photo)
  $html = $html.Replace("{{CATEGORY}}", (HtmlEscape $base.category))
  $html = $html.Replace("{{NAME}}", (HtmlEscape $base.name))
  $html = $html.Replace("{{SKU}}", (HtmlEscape $base.sku))
  $html = $html.Replace("{{PRICE}}", (FormatPrice $base.price))
  $html = $html.Replace("{{TOGGLE_HTML}}", $toggleHtml)
  $html = $html.Replace("{{DESC}}", (HtmlEscape $split.desc))
  $html = $html.Replace("{{SPECS_HTML}}", $specsHtml)
  $html = $html.Replace("{{DATA_JSON}}", $dataObj)
  $html = $html.Replace("{{TOP_CATEGORY}}", (JsonEscape $gi.topCategory))
  $html = $html.Replace("{{SLUG}}", $gi.slug)

  $outFile = Join-Path $OutDir "$($gi.slug).html"
  [System.IO.File]::WriteAllText($outFile, $html, (New-Object System.Text.UTF8Encoding($false)))
  $count++
}

Write-Host "Generated $count product pages + products.json ($($catalogRows.Count) rows)"
