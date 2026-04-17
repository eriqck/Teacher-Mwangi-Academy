param(
  [string]$CsvPath = "C:\Users\Eric\Downloads\New products to be added.csv",
  [string]$Stamp = $(if ($env:RUN_STAMP) { $env:RUN_STAMP } else { "20260416-hsp-product-cards" })
)

$ErrorActionPreference = "Stop"

if (-not $env:WC_KEY -or -not $env:WC_SECRET) {
  throw "Missing WC_KEY or WC_SECRET environment variables."
}

if (-not $env:WP_APP_PASSWORD) {
  throw "Missing WP_APP_PASSWORD environment variable."
}

$BaseUrl = if ($env:WC_URL) { $env:WC_URL.TrimEnd("/") } else { "https://homeskitspro.com" }
$OutputDir = Join-Path (Get-Location) "outputs"
$CardDir = Join-Path $OutputDir "hsp-product-cards-$Stamp"
$ResultsPath = Join-Path $OutputDir "hsp-product-card-results-$Stamp.csv"
$SummaryPath = Join-Path $OutputDir "hsp-product-card-summary-$Stamp.json"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $CardDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Get-HspSku {
  param([string]$SourceSku)
  $safeSourceSku = if ($null -eq $SourceSku) { "" } else { $SourceSku }
  $match = [regex]::Match($safeSourceSku, "(\d+)")
  if ($match.Success) {
    return "HSP-{0:000}" -f [int]$match.Groups[1].Value
  }
  return ($safeSourceSku -replace "^SKU-", "HSP-")
}

function Normalize-Text {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  return (($Value -replace "\s+", " ").Trim())
}

function Get-CategoryLabel {
  param($Row)
  $combined = "$(Normalize-Text $Row.custom_label_0) $(Normalize-Text $Row.product_type) $(Normalize-Text $Row.title)".ToLowerInvariant()
  if ($combined -match "washing machine|steam iron|laundry") { return "Laundry" }
  if ($combined -match "refrigerator|fridge") { return "Refrigerators" }
  if ($combined -match "tv|television") { return "TVs & Home Entertainment" }
  if ($combined -match "fan|air cooler|air purifier") { return "Fans & Air Treatment" }
  if ($combined -match "generator") { return "Generators" }
  if ($combined -match "solar water pump|water pump") { return "Water Pumps" }
  if ($combined -match "solar") { return "Solar" }
  if ($combined -match "cooker|microwave|blender|mixer|kettle|water dispenser|cooking|kitchen") { return "Cooking & Kitchen" }
  if ($combined -match "vacuum") { return "Cleaning Appliances" }
  if ($combined -match "audio|speaker|home theatre|theatre") { return "Audio" }
  return (Normalize-Text $Row.custom_label_0)
}

function Get-AccentColor {
  param([string]$Category)
  switch -Regex ($Category) {
    "Laundry|Refrigerators|Cooking|Cleaning|Fans" { return [System.Drawing.Color]::FromArgb(31, 111, 139) }
    "TVs|Audio" { return [System.Drawing.Color]::FromArgb(32, 82, 149) }
    "Generator|Solar" { return [System.Drawing.Color]::FromArgb(190, 110, 28) }
    "Water" { return [System.Drawing.Color]::FromArgb(24, 126, 118) }
    default { return [System.Drawing.Color]::FromArgb(48, 84, 67) }
  }
}

function Split-Lines {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [int]$MaxWidth,
    [int]$MaxLines = 4
  )

  $words = (Normalize-Text $Text).Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
  $lines = New-Object System.Collections.Generic.List[string]
  $current = ""

  foreach ($word in $words) {
    $candidate = if ($current) { "$current $word" } else { $word }
    if ($Graphics.MeasureString($candidate, $Font).Width -le $MaxWidth) {
      $current = $candidate
      continue
    }
    if ($current) { $lines.Add($current) }
    $current = $word
    if ($lines.Count -ge $MaxLines) { break }
  }

  if ($current -and $lines.Count -lt $MaxLines) {
    $lines.Add($current)
  }

  if ($lines.Count -eq $MaxLines -and ($words -join " ").Length -gt ($lines -join " ").Length) {
    $lastIndex = $lines.Count - 1
    $lines[$lastIndex] = ($lines[$lastIndex].TrimEnd(".") + "...")
  }

  return $lines.ToArray()
}

function New-ProductCard {
  param($Row, [string]$Sku, [string]$Destination)

  $width = 1000
  $height = 1000
  $brand = Normalize-Text $Row.brand
  if (-not $brand) { $brand = "HomesKitsPro" }
  $category = Get-CategoryLabel $Row
  $accent = Get-AccentColor $category

  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::White)

  $lightAccent = [System.Drawing.Color]::FromArgb(26, $accent.R, $accent.G, $accent.B)
  $brushLight = New-Object System.Drawing.SolidBrush $lightAccent
  $brushAccent = New-Object System.Drawing.SolidBrush $accent
  $brushDark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 39, 44))
  $brushMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(94, 103, 112))
  $brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $penAccent = New-Object System.Drawing.Pen $accent, 5
  $penSoft = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(225, 230, 235)), 2

  $graphics.FillRectangle($brushLight, 0, 0, $width, 260)
  $graphics.DrawLine($penAccent, 0, 260, $width, 260)
  $graphics.DrawEllipse($penSoft, 690, -130, 420, 420)
  $graphics.DrawEllipse($penSoft, -170, 650, 420, 420)

  $fontBrand = New-Object System.Drawing.Font "Segoe UI", 34, ([System.Drawing.FontStyle]::Bold)
  $fontSku = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Bold)
  $fontCategory = New-Object System.Drawing.Font "Segoe UI", 23, ([System.Drawing.FontStyle]::Regular)
  $fontTitle = New-Object System.Drawing.Font "Segoe UI", 42, ([System.Drawing.FontStyle]::Bold)
  $fontSpec = New-Object System.Drawing.Font "Segoe UI", 25, ([System.Drawing.FontStyle]::Regular)
  $fontFooter = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Regular)

  $graphics.DrawString($brand.ToUpperInvariant(), $fontBrand, $brushDark, 70, 70)
  $skuRect = New-Object System.Drawing.RectangleF 760, 72, 170, 54
  $graphics.FillRectangle($brushAccent, $skuRect)
  $formatCenter = New-Object System.Drawing.StringFormat
  $formatCenter.Alignment = [System.Drawing.StringAlignment]::Center
  $formatCenter.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString($Sku, $fontSku, $brushWhite, $skuRect, $formatCenter)
  $graphics.DrawString($category, $fontCategory, $brushMuted, 72, 145)

  $titleLines = Split-Lines -Graphics $graphics -Text $Row.title -Font $fontTitle -MaxWidth 850 -MaxLines 4
  $y = 335
  foreach ($line in $titleLines) {
    $graphics.DrawString($line, $fontTitle, $brushDark, 72, $y)
    $y += 58
  }

  $specs = @()
  if (Normalize-Text $Row.size) { $specs += "Size: $(Normalize-Text $Row.size)" }
  if (Normalize-Text $Row.color) { $specs += "Colour: $(Normalize-Text $Row.color)" }
  if (Normalize-Text $Row.mpn) { $specs += "Model: $(Normalize-Text $Row.mpn)" }
  if ($specs.Count -eq 0 -and (Normalize-Text $Row.custom_label_0)) { $specs += Normalize-Text $Row.custom_label_0 }

  $specY = 640
  foreach ($spec in ($specs | Select-Object -First 3)) {
    $graphics.FillEllipse($brushAccent, 76, ($specY + 12), 12, 12)
    $graphics.DrawString($spec, $fontSpec, $brushMuted, 105, $specY)
    $specY += 45
  }

  $graphics.DrawLine($penSoft, 72, 842, 928, 842)
  $graphics.DrawString("HomesKitsPro", $fontFooter, $brushDark, 72, 875)
  $graphics.DrawString("Reliable home essentials", $fontFooter, $brushMuted, 680, 875)

  $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

function Invoke-JsonCurl {
  param(
    [string[]]$Arguments
  )
  $output = & curl.exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "curl failed with exit code $LASTEXITCODE"
  }
  return ($output | ConvertFrom-Json)
}

function Get-WooProducts {
  $auth = "$($env:WC_KEY):$($env:WC_SECRET)"
  $items = @()
  for ($page = 1; $page -le 20; $page++) {
    $batch = Invoke-JsonCurl @("-s", "-S", "-L", "-u", $auth, "$BaseUrl/wp-json/wc/v3/products?per_page=100&page=$page")
    if (-not $batch -or $batch.Count -eq 0) { break }
    $items += $batch
    if ($batch.Count -lt 100) { break }
  }
  return $items
}

function Upload-Media {
  param([string]$FilePath, [string]$FileName, [string]$AltText)
  $wpUser = if ($env:WP_USER) { $env:WP_USER } else { "admin" }
  $auth = "$($wpUser):$($env:WP_APP_PASSWORD)"
  $media = Invoke-JsonCurl @(
    "-s", "-S", "-L",
    "-u", $auth,
    "-X", "POST",
    "-H", "Content-Disposition: attachment; filename=`"$FileName`"",
    "-H", "Content-Type: image/png",
    "--data-binary", "@$FilePath",
    "$BaseUrl/wp-json/wp/v2/media"
  )

  try {
    $body = @{ alt_text = $AltText } | ConvertTo-Json -Depth 5
    $temp = Join-Path $OutputDir "media-alt-$($media.id).json"
    Set-Content -LiteralPath $temp -Value $body -Encoding UTF8
    Invoke-JsonCurl @("-s", "-S", "-L", "-u", $auth, "-X", "POST", "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", "@$temp", "$BaseUrl/wp-json/wp/v2/media/$($media.id)") | Out-Null
    Remove-Item -LiteralPath $temp -Force
  } catch {}

  return $media
}

function Update-ProductImage {
  param([int]$ProductId, [int]$MediaId)
  $auth = "$($env:WC_KEY):$($env:WC_SECRET)"
  $body = @{ images = @(@{ id = $MediaId }) } | ConvertTo-Json -Depth 10
  $temp = Join-Path $OutputDir "product-image-$ProductId.json"
  Set-Content -LiteralPath $temp -Value $body -Encoding UTF8
  $updated = Invoke-JsonCurl @("-s", "-S", "-L", "-u", $auth, "-X", "PUT", "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", "@$temp", "$BaseUrl/wp-json/wc/v3/products/$ProductId")
  Remove-Item -LiteralPath $temp -Force
  return $updated
}

$rows = Import-Csv -LiteralPath $CsvPath
$products = Get-WooProducts
$productBySku = @{}
foreach ($product in $products) {
  if ($product.sku) {
    $productBySku[$product.sku] = $product
  }
}

$results = @()
foreach ($row in $rows) {
  $sku = Get-HspSku $row.sku
  $product = $productBySku[$sku]
  $title = Normalize-Text $row.title

  if (-not $product) {
    $results += [pscustomobject]@{ sku = $sku; title = $title; product_id = ""; status = "missing_product"; media_id = ""; file = ""; message = "" }
    continue
  }

  if ($product.images -and $product.images.Count -gt 0) {
    $results += [pscustomobject]@{ sku = $sku; title = $title; product_id = $product.id; status = "already_has_image"; media_id = $product.images[0].id; file = ""; message = "" }
    continue
  }

  $fileName = "$($sku.ToLowerInvariant())-product-card.png"
  $filePath = Join-Path $CardDir $fileName

  try {
    New-ProductCard -Row $row -Sku $sku -Destination $filePath
    $media = Upload-Media -FilePath $filePath -FileName $fileName -AltText $title
    $updated = Update-ProductImage -ProductId ([int]$product.id) -MediaId ([int]$media.id)
    $results += [pscustomobject]@{ sku = $sku; title = $title; product_id = $updated.id; status = "attached_card"; media_id = $media.id; file = $filePath; message = "" }
  } catch {
    $results += [pscustomobject]@{ sku = $sku; title = $title; product_id = $product.id; status = "failed"; media_id = ""; file = $filePath; message = $_.Exception.Message }
  }
}

$results | Export-Csv -LiteralPath $ResultsPath -NoTypeInformation

$summary = [pscustomobject]@{
  csvPath = $CsvPath
  totalRows = $rows.Count
  attachedCards = @($results | Where-Object { $_.status -eq "attached_card" }).Count
  alreadyHadImage = @($results | Where-Object { $_.status -eq "already_has_image" }).Count
  failed = @($results | Where-Object { $_.status -eq "failed" }).Count
  missingProducts = @($results | Where-Object { $_.status -eq "missing_product" }).Count
  resultsPath = $ResultsPath
  cardDirectory = $CardDir
}

$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8
$summary | ConvertTo-Json -Depth 5
