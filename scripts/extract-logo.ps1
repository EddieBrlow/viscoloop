param(
  [string]$SourcePath = "C:\Users\EddieBarlow\Downloads\Image (1).jpg",
  [string]$OutDir = "C:\Users\EddieBarlow\ViscoLoop\public\icons"
)

Add-Type -AssemblyName System.Drawing

function Get-MinChannelArray($bmp) {
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)

  $v = New-Object 'single[,]' $w, $h
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      $i = $row + $x * 3
      $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
      $m = $b
      if ($g -lt $m) { $m = $g }
      if ($r -lt $m) { $m = $r }
      $v[$x, $y] = $m
    }
  }
  return @{ v = $v; w = $w; h = $h; bytes = $bytes; stride = $stride }
}

function BoxBlur($v, $w, $h, $radius) {
  $tmp = New-Object 'single[,]' $w, $h
  $out = New-Object 'single[,]' $w, $h
  $norm = 1.0 / (2 * $radius + 1)

  for ($y = 0; $y -lt $h; $y++) {
    $sum = 0.0
    for ($x = -$radius; $x -le $radius; $x++) {
      $xx = [Math]::Min([Math]::Max($x, 0), $w - 1)
      $sum += $v[$xx, $y]
    }
    $tmp[0, $y] = $sum * $norm
    for ($x = 1; $x -lt $w; $x++) {
      $addX = [Math]::Min($x + $radius, $w - 1)
      $subX = [Math]::Max($x - $radius - 1, 0)
      $sum += $v[$addX, $y] - $v[$subX, $y]
      $tmp[$x, $y] = $sum * $norm
    }
  }

  for ($x = 0; $x -lt $w; $x++) {
    $sum = 0.0
    for ($y = -$radius; $y -le $radius; $y++) {
      $yy = [Math]::Min([Math]::Max($y, 0), $h - 1)
      $sum += $tmp[$x, $yy]
    }
    $out[$x, 0] = $sum * $norm
    for ($y = 1; $y -lt $h; $y++) {
      $addY = [Math]::Min($y + $radius, $h - 1)
      $subY = [Math]::Max($y - $radius - 1, 0)
      $sum += $tmp[$x, $addY] - $tmp[$x, $subY]
      $out[$x, $y] = $sum * $norm
    }
  }
  return $out
}

Write-Output "Loading $SourcePath ..."
$src = [System.Drawing.Bitmap]::FromFile($SourcePath)
Write-Output "Source size: $($src.Width) x $($src.Height)"

$res = Get-MinChannelArray $src
$v = $res.v; $w = $res.w; $h = $res.h

Write-Output "Computing local background baseline (this takes a little while)..."
$radius = [Math]::Round(([Math]::Min($w, $h)) * 0.14)
Write-Output "Blur radius: $radius"
$vbase = BoxBlur $v $w $h $radius

Write-Output "Computing alpha mask..."
$alpha = New-Object 'single[,]' $w, $h
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
$threshold = 0.16
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $denom = 255.0 - $vbase[$x, $y]
    if ($denom -lt 1) { $denom = 1 }
    $a = ($v[$x, $y] - $vbase[$x, $y]) / $denom
    if ($a -lt 0) { $a = 0 }
    if ($a -gt 1) { $a = 1 }
    if ($a -lt $threshold) { $a = 0 } else { $a = ($a - $threshold) / (1 - $threshold) }
    $alpha[$x, $y] = $a
    if ($a -gt 0.05) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
Write-Output "Detected bounding box: ($minX,$minY) to ($maxX,$maxY)"

$padX = [Math]::Round(($maxX - $minX) * 0.06)
$padY = [Math]::Round(($maxY - $minY) * 0.06)
$minX = [Math]::Max(0, $minX - $padX); $maxX = [Math]::Min($w - 1, $maxX + $padX)
$minY = [Math]::Max(0, $minY - $padY); $maxY = [Math]::Min($h - 1, $maxY + $padY)
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
Write-Output "Cropped mask size: $cropW x $cropH"

# Build a cropped ARGB bitmap: orange color, alpha from mask
$mask = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$orange = [System.Drawing.Color]::FromArgb(249, 115, 22)
for ($yy = 0; $yy -lt $cropH; $yy++) {
  for ($xx = 0; $xx -lt $cropW; $xx++) {
    $a = $alpha[$minX + $xx, $minY + $yy]
    $ab = [int]([Math]::Round($a * 255))
    $mask.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb($ab, $orange.R, $orange.G, $orange.B))
  }
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$maskPath = Join-Path $OutDir "logo-mask-debug.png"
$mask.Save($maskPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved raw extracted mask (on transparent bg) to $maskPath"

# Compose onto a black square canvas
$canvasSize = 1024
$canvas = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(255, 10, 10, 11))

$targetFrac = 0.8
$scale = [Math]::Min(($canvasSize * $targetFrac) / $cropW, ($canvasSize * $targetFrac) / $cropH)
$destW = $cropW * $scale
$destH = $cropH * $scale
$destX = ($canvasSize - $destW) / 2
$destY = ($canvasSize - $destH) / 2
$g.DrawImage($mask, $destX, $destY, $destW, $destH)
$g.Dispose()

$png512 = Join-Path $OutDir "icon-512.png"
$png192 = Join-Path $OutDir "icon-192.png"
$canvas.Save($png512, [System.Drawing.Imaging.ImageFormat]::Png)

$small = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($small)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($canvas, 0, 0, 192, 192)
$g2.Dispose()
$small.Save($png192, [System.Drawing.Imaging.ImageFormat]::Png)

$mask.Dispose(); $canvas.Dispose(); $small.Dispose(); $src.Dispose()
Write-Output "Saved $png512 and $png192"
