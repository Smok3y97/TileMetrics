<#
.SYNOPSIS
    Asset and icon generator for TileMetrics (Beszel) Stream Deck Plugin.
.DESCRIPTION
    Ensures directory structure exists, writes SVG icons if missing,
    and rasterizes plugin-icon.png (256x256) and plugin-icon@2x.png (512x512)
    using .NET System.Drawing.
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")
$AssetsDir = Join-Path $RootDir "assets"

Write-Host "=== TileMetrics Asset Generator ===" -ForegroundColor Cyan

# 1. Ensure Directory Structure
$Actions = @("cpu", "memory", "storage", "network", "gpu", "ups")
$DirsToEnsure = @($AssetsDir)
foreach ($act in $Actions) {
    $DirsToEnsure += (Join-Path $AssetsDir "actions\$act")
}

foreach ($dir in $DirsToEnsure) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  [+] Created directory: $dir" -ForegroundColor Gray
    }
}

# 2. Vector SVGs Definition Map
$SvgDefinitions = @{
    "category-icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
  <!-- Outer Dashboard Screen -->
  <rect x="2.5" y="3.5" width="23" height="21" rx="3" stroke="#FFFFFF" stroke-width="1.8"/>
  <!-- Top Header Bar Divider -->
  <line x1="2.5" y1="9.5" x2="25.5" y2="9.5" stroke="#FFFFFF" stroke-width="1.5"/>
  <!-- Header Status Indicators -->
  <circle cx="6" cy="6.5" r="1" fill="#FFFFFF"/>
  <circle cx="9.5" cy="6.5" r="1" fill="#FFFFFF"/>
  <!-- Telemetry Sparkline Waveform -->
  <path d="M5 18.5 H8.5 L11.5 13 L14.5 21 L17.5 14.5 L20 18.5 H23" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'@

    "actions/cpu/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- CPU Substrate Body -->
  <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" stroke="#FFFFFF" stroke-width="1.4"/>
  <!-- Silicon Core Die -->
  <rect x="7.5" y="7.5" width="5" height="5" rx="0.75" fill="#FFFFFF"/>
  <!-- Top Pins -->
  <path d="M7 2V4.5 M10 2V4.5 M13 2V4.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
  <!-- Bottom Pins -->
  <path d="M7 15.5V18 M10 15.5V18 M13 15.5V18" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
  <!-- Left Pins -->
  <path d="M2 7H4.5 M2 10H4.5 M2 13H4.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
  <!-- Right Pins -->
  <path d="M15.5 7H18 M15.5 10H18 M15.5 13H18" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
</svg>
'@

    "actions/cpu/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- CPU Package Substrate -->
  <rect x="17" y="17" width="38" height="38" rx="4" stroke="#FFFFFF" stroke-width="3"/>
  <!-- Silicon Die Heat Spreader -->
  <rect x="26" y="26" width="20" height="20" rx="2.5" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- Core Die Center Notch & Orientation Indicator -->
  <circle cx="21" cy="21" r="1.5" fill="#FFFFFF"/>
  <path d="M33 36H39 M36 33V39" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
  <!-- Connector Pins - Top -->
  <path d="M24 8V17 M30 8V17 M36 8V17 M42 8V17 M48 8V17" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Connector Pins - Bottom -->
  <path d="M24 55V64 M30 55V64 M36 55V64 M42 55V64 M48 55V64" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Connector Pins - Left -->
  <path d="M8 24H17 M8 30H17 M8 36H17 M8 42H17 M8 48H17" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Connector Pins - Right -->
  <path d="M55 24H64 M55 30H64 M55 36H64 M55 42H64 M55 48H64" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
</svg>
'@

    "actions/memory/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- RAM Module PCB Body -->
  <rect x="2" y="6" width="16" height="8" rx="1" stroke="#FFFFFF" stroke-width="1.3"/>
  <!-- Memory DRAM Chips -->
  <rect x="4" y="8" width="2.5" height="4" rx="0.5" fill="#FFFFFF"/>
  <rect x="8.75" y="8" width="2.5" height="4" rx="0.5" fill="#FFFFFF"/>
  <rect x="13.5" y="8" width="2.5" height="4" rx="0.5" fill="#FFFFFF"/>
  <!-- Contact Pins and Key Notch -->
  <path d="M3.5 14V16 M5.5 14V16 M7.5 14V16 M12.5 14V16 M14.5 14V16 M16.5 14V16" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
</svg>
'@

    "actions/memory/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- RAM DIMM PCB Outline with Locking Notches -->
  <path d="M9 25 C9 23.5 10 22 12 22 H60 C62 22 63 23.5 63 25 V45 C63 46.5 62 48 60 48 H40 V45 H36 V48 H12 C10 48 9 46.5 9 45 Z" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <!-- DRAM Memory Packages -->
  <rect x="14" y="28" width="8" height="12" rx="1.5" stroke="#FFFFFF" stroke-width="2"/>
  <rect x="25" y="28" width="8" height="12" rx="1.5" stroke="#FFFFFF" stroke-width="2"/>
  <rect x="39" y="28" width="8" height="12" rx="1.5" stroke="#FFFFFF" stroke-width="2"/>
  <rect x="50" y="28" width="8" height="12" rx="1.5" stroke="#FFFFFF" stroke-width="2"/>
  <!-- Gold Finger Contact Pins -->
  <path d="M14 48V54 M18 48V54 M22 48V54 M26 48V54 M30 48V54 M44 48V54 M48 48V54 M52 48V54 M56 48V54" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
</svg>
'@

    "actions/storage/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- Drive Enclosure -->
  <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="#FFFFFF" stroke-width="1.3"/>
  <!-- Disk Platter -->
  <circle cx="10" cy="8.5" r="4" stroke="#FFFFFF" stroke-width="1.2"/>
  <!-- Spindle Hub -->
  <circle cx="10" cy="8.5" r="1.2" fill="#FFFFFF"/>
  <!-- Head Arm -->
  <path d="M10 8.5L13 12" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Status / Connector Line -->
  <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
</svg>
'@

    "actions/storage/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- Hard Drive Casing -->
  <rect x="15" y="9" width="42" height="54" rx="5" stroke="#FFFFFF" stroke-width="3"/>
  <!-- Corner Mount Screws -->
  <circle cx="20" cy="14" r="1.5" fill="#FFFFFF"/>
  <circle cx="52" cy="14" r="1.5" fill="#FFFFFF"/>
  <circle cx="20" cy="58" r="1.5" fill="#FFFFFF"/>
  <circle cx="52" cy="58" r="1.5" fill="#FFFFFF"/>
  <!-- Magnetic Disk Platter -->
  <circle cx="36" cy="31" r="15" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- Spindle Motor Hub -->
  <circle cx="36" cy="31" r="5" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="36" cy="31" r="1.8" fill="#FFFFFF"/>
  <!-- Actuator Pivot and Arm -->
  <circle cx="48" cy="46" r="3" stroke="#FFFFFF" stroke-width="2"/>
  <path d="M46 44 L37 34" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Interface Connector Port -->
  <line x1="24" y1="54" x2="48" y2="54" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
</svg>
'@

    "actions/network/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- RX Down Arrow (Download Telemetry) -->
  <path d="M6.5 4.5V15.5 M3.5 12.5L6.5 15.5L9.5 12.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- TX Up Arrow (Upload Telemetry) -->
  <path d="M13.5 15.5V4.5 M10.5 7.5L13.5 4.5L16.5 7.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'@

    "actions/network/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- RX Down Arrow (Download Telemetry) -->
  <path d="M24 16V54 M13 43L24 54L35 43" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- TX Up Arrow (Upload Telemetry) -->
  <path d="M48 56V18 M37 29L48 18L59 29" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Activity Signal Indicators -->
  <circle cx="24" cy="10" r="2.5" fill="#FFFFFF"/>
  <circle cx="48" cy="62" r="2.5" fill="#FFFFFF"/>
</svg>
'@

    "actions/gpu/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- IO Bracket -->
  <path d="M2.5 4V16" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Graphics Card Shroud Body -->
  <rect x="4.5" y="5.5" width="13.5" height="9" rx="1.5" stroke="#FFFFFF" stroke-width="1.3"/>
  <!-- Dual Cooling Fans -->
  <circle cx="8.5" cy="10" r="2.3" stroke="#FFFFFF" stroke-width="1.1"/>
  <circle cx="14" cy="10" r="2.3" stroke="#FFFFFF" stroke-width="1.1"/>
  <!-- PCIe Connector Tab -->
  <path d="M6 14.5V16.5H11V14.5" stroke="#FFFFFF" stroke-width="1.2"/>
</svg>
'@

    "actions/gpu/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- PCI Bracket on Left -->
  <path d="M9 15V57 M9 23H6 M9 49H6" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
  <!-- GPU Cooler Shroud -->
  <rect x="14" y="20" width="50" height="32" rx="4" stroke="#FFFFFF" stroke-width="3"/>
  <!-- Dual Axial Cooling Fans -->
  <circle cx="28" cy="36" r="10" stroke="#FFFFFF" stroke-width="2.5"/>
  <circle cx="28" cy="36" r="3.5" fill="#FFFFFF"/>
  <path d="M28 28V44 M20 36H36" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="50" cy="36" r="10" stroke="#FFFFFF" stroke-width="2.5"/>
  <circle cx="50" cy="36" r="3.5" fill="#FFFFFF"/>
  <path d="M50 28V44 M42 36H58" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
  <!-- PCIe Gold Finger Bus Interface -->
  <path d="M20 52V58H33V52 M36 52V58H48V52" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Top Power/Heatsink Accents -->
  <path d="M22 17V20 M26 17V20 M52 17V20 M56 17V20" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
</svg>
'@

    "actions/ups/icon.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- Terminal Cap -->
  <rect x="7.5" y="2" width="5" height="2" rx="0.5" fill="#FFFFFF"/>
  <!-- Battery Body -->
  <rect x="4.5" y="4.5" width="11" height="13.5" rx="2" stroke="#FFFFFF" stroke-width="1.4"/>
  <!-- Lightning Bolt -->
  <path d="M10.5 7L7.5 11.5H10.5L9.5 15.5L13 10.5H10L11.5 7H10.5Z" fill="#FFFFFF"/>
</svg>
'@

    "actions/ups/key.svg" = @'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <!-- Battery Positive Terminal -->
  <rect x="28" y="9" width="16" height="7" rx="2.5" fill="#FFFFFF"/>
  <!-- Battery Cell Enclosure -->
  <rect x="18" y="16" width="36" height="47" rx="6" stroke="#FFFFFF" stroke-width="3.5"/>
  <!-- Fast Charge / Telemetry Lightning Bolt -->
  <path d="M38 23L25 38H35L31 54L47 36H36L39 23H38Z" fill="#FFFFFF"/>
  <!-- Charge Level Status Dots -->
  <circle cx="26" cy="57" r="1.8" fill="#FFFFFF"/>
  <circle cx="36" cy="57" r="1.8" fill="#FFFFFF"/>
  <circle cx="46" cy="57" r="1.8" fill="#FFFFFF"/>
</svg>
'@
}

# Write SVGs if missing or if -Force is specified
foreach ($relPath in $SvgDefinitions.Keys) {
    $fullPath = Join-Path $AssetsDir $relPath
    if ($Force -or (-not (Test-Path $fullPath))) {
        [System.IO.File]::WriteAllText($fullPath, $SvgDefinitions[$relPath], [System.Text.Encoding]::UTF8)
        Write-Host "  [+] Wrote SVG: $relPath" -ForegroundColor Green
    } else {
        Write-Host "  [-] Exists (skipped): $relPath" -ForegroundColor DarkGray
    }
}

# 3. Rasterize Marketplace Badge PNGs (256x256 and 512x512) via .NET System.Drawing
Add-Type -AssemblyName System.Drawing

function Render-TileMetricsBadge([int]$size, [string]$outputPath) {
    $scale = $size / 256.0
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $margin = 8.0 * $scale
    $badgeDiameter = $size - 2.0 * $margin

    # 1. Base Dark Slate Gradient Disc (#1E293B -> #0F172A)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.PointF]::new($margin, $margin),
        [System.Drawing.PointF]::new($margin + $badgeDiameter, $margin + $badgeDiameter),
        [System.Drawing.Color]::FromArgb(255, 30, 41, 59),
        [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    )
    $g.FillEllipse($bgBrush, $margin, $margin, $badgeDiameter, $badgeDiameter)
    $bgBrush.Dispose()

    # 2. Outer Emerald Accent Ring (#10B981)
    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(235, 16, 185, 129), 5.5 * $scale)
    $g.DrawEllipse($ringPen, $margin + 2.75 * $scale, $margin + 2.75 * $scale, $badgeDiameter - 5.5 * $scale, $badgeDiameter - 5.5 * $scale)
    $ringPen.Dispose()

    # Inner Emerald Subtle Rim (#34D399)
    $innerRimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 52, 211, 153), 1.8 * $scale)
    $g.DrawEllipse($innerRimPen, $margin + 6.5 * $scale, $margin + 6.5 * $scale, $badgeDiameter - 13.0 * $scale, $badgeDiameter - 13.0 * $scale)
    $innerRimPen.Dispose()

    # Helper: Rounded Rectangle Path
    function Local-AddRoundRect($path, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
        $d = $r * 2.0
        $path.AddArc($x, $y, $d, $d, 180, 90)
        $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
        $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
        $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
        $path.CloseFigure()
    }

    # 3. 2x2 Telemetry Metric Tiles
    $tileW = 66.0 * $scale
    $tileH = 66.0 * $scale
    $tileR = 8.0 * $scale
    $gap = 12.0 * $scale
    $gridLeft = (128.0 - 66.0 - 6.0) * $scale
    $gridTop = (128.0 - 66.0 - 6.0) * $scale

    $tilePositions = @(
        @{ X = $gridLeft; Y = $gridTop },
        @{ X = $gridLeft + $tileW + $gap; Y = $gridTop },
        @{ X = $gridLeft; Y = $gridTop + $tileH + $gap },
        @{ X = $gridLeft + $tileW + $gap; Y = $gridTop + $tileH + $gap }
    )

    $tileFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 20, 29, 44))
    $tileBorderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(120, 51, 65, 85), 1.5 * $scale)

    foreach ($t in $tilePositions) {
        $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
        Local-AddRoundRect $p $t.X $t.Y $tileW $tileH $tileR
        $g.FillPath($tileFill, $p)
        $g.DrawPath($tileBorderPen, $p)
        $p.Dispose()
    }
    $tileFill.Dispose()
    $tileBorderPen.Dispose()

    # Glyph inside Tile 1: CPU
    $cpuPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 203, 213, 225), 1.5 * $scale)
    $cpuBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 16, 185, 129))
    $cx1 = $gridLeft + $tileW / 2.0
    $cy1 = $gridTop + $tileH / 2.0 - 4.0 * $scale
    $g.DrawRectangle($cpuPen, ($cx1 - 10.0 * $scale), ($cy1 - 10.0 * $scale), (20.0 * $scale), (20.0 * $scale))
    $g.FillRectangle($cpuBrush, ($cx1 - 5.0 * $scale), ($cy1 - 5.0 * $scale), (10.0 * $scale), (10.0 * $scale))
    $g.DrawLine($cpuPen, ($cx1 - 6.0 * $scale), ($cy1 - 14.0 * $scale), ($cx1 - 6.0 * $scale), ($cy1 - 10.0 * $scale))
    $g.DrawLine($cpuPen, ($cx1 + 6.0 * $scale), ($cy1 - 14.0 * $scale), ($cx1 + 6.0 * $scale), ($cy1 - 10.0 * $scale))
    $g.DrawLine($cpuPen, ($cx1 - 6.0 * $scale), ($cy1 + 10.0 * $scale), ($cx1 - 6.0 * $scale), ($cy1 + 14.0 * $scale))
    $g.DrawLine($cpuPen, ($cx1 + 6.0 * $scale), ($cy1 + 10.0 * $scale), ($cx1 + 6.0 * $scale), ($cy1 + 14.0 * $scale))
    $cpuPen.Dispose()
    $cpuBrush.Dispose()

    # Glyph inside Tile 2: Memory (horizontal DRAM chips)
    $memPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 203, 213, 225), 1.5 * $scale)
    $memFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 16, 185, 129))
    $cx2 = $gridLeft + $tileW + $gap + $tileW / 2.0
    $cy2 = $gridTop + $tileH / 2.0 - 4.0 * $scale
    $g.DrawRectangle($memPen, ($cx2 - 16.0 * $scale), ($cy2 - 8.0 * $scale), (32.0 * $scale), (16.0 * $scale))
    $g.FillRectangle($memFill, ($cx2 - 12.0 * $scale), ($cy2 - 4.0 * $scale), (6.0 * $scale), (8.0 * $scale))
    $g.FillRectangle($memFill, ($cx2 - 3.0 * $scale), ($cy2 - 4.0 * $scale), (6.0 * $scale), (8.0 * $scale))
    $g.FillRectangle($memFill, ($cx2 + 6.0 * $scale), ($cy2 - 4.0 * $scale), (6.0 * $scale), (8.0 * $scale))
    $memPen.Dispose()
    $memFill.Dispose()

    # Glyph inside Tile 3: Storage (Disk platter)
    $diskPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 203, 213, 225), 1.5 * $scale)
    $diskBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 16, 185, 129))
    $cx3 = $gridLeft + $tileW / 2.0
    $cy3 = $gridTop + $tileH + $gap + $tileH / 2.0 + 3.0 * $scale
    $g.DrawEllipse($diskPen, ($cx3 - 12.0 * $scale), ($cy3 - 12.0 * $scale), (24.0 * $scale), (24.0 * $scale))
    $g.FillEllipse($diskBrush, ($cx3 - 4.0 * $scale), ($cy3 - 4.0 * $scale), (8.0 * $scale), (8.0 * $scale))
    $diskPen.Dispose()
    $diskBrush.Dispose()

    # Glyph inside Tile 4: Network (RX/TX Arrows)
    $netPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230, 16, 185, 129), 2.0 * $scale)
    $netPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $netPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $cx4 = $gridLeft + $tileW + $gap + $tileW / 2.0
    $cy4 = $gridTop + $tileH + $gap + $tileH / 2.0 + 3.0 * $scale
    $g.DrawLine($netPen, ($cx4 - 6.0 * $scale), ($cy4 - 10.0 * $scale), ($cx4 - 6.0 * $scale), ($cy4 + 8.0 * $scale))
    $g.DrawLine($netPen, ($cx4 - 10.0 * $scale), ($cy4 + 3.0 * $scale), ($cx4 - 6.0 * $scale), ($cy4 + 8.0 * $scale))
    $g.DrawLine($netPen, ($cx4 - 2.0 * $scale), ($cy4 + 3.0 * $scale), ($cx4 - 6.0 * $scale), ($cy4 + 8.0 * $scale))
    $g.DrawLine($netPen, ($cx4 + 6.0 * $scale), ($cy4 + 8.0 * $scale), ($cx4 + 6.0 * $scale), ($cy4 - 10.0 * $scale))
    $g.DrawLine($netPen, ($cx4 + 2.0 * $scale), ($cy4 - 5.0 * $scale), ($cx4 + 6.0 * $scale), ($cy4 - 10.0 * $scale))
    $g.DrawLine($netPen, ($cx4 + 10.0 * $scale), ($cy4 - 5.0 * $scale), ($cx4 + 6.0 * $scale), ($cy4 - 10.0 * $scale))
    $netPen.Dispose()

    # 4. Prominent Central Telemetry Sparkline Surging Across the Tiles
    $points = @(
        [System.Drawing.PointF]::new(36.0 * $scale, 128.0 * $scale),
        [System.Drawing.PointF]::new(68.0 * $scale, 128.0 * $scale),
        [System.Drawing.PointF]::new(84.0 * $scale, 142.0 * $scale),
        [System.Drawing.PointF]::new(104.0 * $scale, 96.0 * $scale),
        [System.Drawing.PointF]::new(118.0 * $scale, 154.0 * $scale),
        [System.Drawing.PointF]::new(138.0 * $scale, 68.0 * $scale),
        [System.Drawing.PointF]::new(154.0 * $scale, 142.0 * $scale),
        [System.Drawing.PointF]::new(172.0 * $scale, 114.0 * $scale),
        [System.Drawing.PointF]::new(188.0 * $scale, 128.0 * $scale),
        [System.Drawing.PointF]::new(220.0 * $scale, 128.0 * $scale)
    )

    # Shaded area under the sparkline
    $areaPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $areaPath.AddLines($points)
    $areaPath.AddLine((220.0 * $scale), (170.0 * $scale), (36.0 * $scale), (170.0 * $scale))
    $areaPath.CloseFigure()

    $areaBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.PointF]::new(0, 68.0 * $scale),
        [System.Drawing.PointF]::new(0, 170.0 * $scale),
        [System.Drawing.Color]::FromArgb(90, 16, 185, 129),
        [System.Drawing.Color]::FromArgb(0, 16, 185, 129)
    )
    $g.FillPath($areaBrush, $areaPath)
    $areaBrush.Dispose()
    $areaPath.Dispose()

    # Sparkline outer glow
    $glowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(60, 52, 211, 153), 7.0 * $scale)
    $glowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($glowPen, $points)
    $glowPen.Dispose()

    # Sparkline main line
    $sparkPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 16, 185, 129), 3.2 * $scale)
    $sparkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $sparkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $sparkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($sparkPen, $points)
    $sparkPen.Dispose()

    # Sparkline core highlight line
    $corePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 255, 255, 255), 1.2 * $scale)
    $corePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $corePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $corePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($corePen, $points)
    $corePen.Dispose()

    # Luminous data point node on the main peak
    $peakX = 138.0 * $scale
    $peakY = 68.0 * $scale
    $haloBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(100, 52, 211, 153))
    $g.FillEllipse($haloBrush, ($peakX - 7.0 * $scale), ($peakY - 7.0 * $scale), (14.0 * $scale), (14.0 * $scale))
    $haloBrush.Dispose()

    $nodeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillEllipse($nodeBrush, ($peakX - 3.2 * $scale), ($peakY - 3.2 * $scale), (6.4 * $scale), (6.4 * $scale))
    $nodeBrush.Dispose()

    # Save to PNG
    $destDir = Split-Path -Parent $outputPath
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "  [+] Rendered badge: $outputPath ($size x $size)" -ForegroundColor Green
}

$PluginIcon1x = Join-Path $AssetsDir "plugin-icon.png"
$PluginIcon2x = Join-Path $AssetsDir "plugin-icon@2x.png"

Render-TileMetricsBadge 256 $PluginIcon1x
Render-TileMetricsBadge 512 $PluginIcon2x

Write-Host "`nAll TileMetrics assets successfully generated!" -ForegroundColor Cyan
