param(
  [string]$SourcePath = "C:\Users\EddieBarlow\Downloads\Image (1).jpg",
  [string]$OutDir = "C:\Users\EddieBarlow\ViscoLoop\public\icons"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($SourcePath)
$w = $src.Width; $h = $src.Height
Write-Output "Source size: $w x $h"

# Center-crop to a square (the badge sits roughly centered in the frame).
$side = [Math]::Min($w, $h)
$cropX = [Math]::Round(($w - $side) / 2)
$cropY = [Math]::Round(($h - $side) / 2)
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $side, $side)

function SaveResized($size, $path) {
  $out = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $destRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
SaveResized 512 (Join-Path $OutDir "icon-512.png")
SaveResized 192 (Join-Path $OutDir "icon-192.png")
$src.Dispose()
Write-Output "Saved icon-512.png and icon-192.png (center-cropped square from source photo)"
