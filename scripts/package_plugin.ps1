<#
.SYNOPSIS
    Packages the TileMetrics for Beszel Stream Deck Plugin into a distributable .streamDeckPlugin archive.
.DESCRIPTION
    1. Generates icons and assets
    2. Builds plugin bundle via Rollup
    3. Stages files to release/com.smok3y97.tilemetrics.beszel.sdPlugin
    4. Packs with Elgato CLI
    5. Deploys to local Stream Deck plugins directory for live testing
#>

[CmdletBinding()]
param(
    [switch]$SkipLint,
    [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"

$PluginUUID = "com.smok3y97.tilemetrics.beszel"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $RootDir "release"
$StagingDir = Join-Path $ReleaseDir "$PluginUUID.sdPlugin"

Write-Host "=== Packaging $PluginUUID ===" -ForegroundColor Cyan

# 1. Asset Generation
$AssetScript = Join-Path $RootDir "scripts\generate_assets.ps1"
if (Test-Path $AssetScript) {
    Write-Host "[1/5] Running asset generator..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File $AssetScript
}

# 2. Linting (Optional)
if (-not $SkipLint) {
    Write-Host "[2/5] Checking linting & formatting..." -ForegroundColor Yellow
    npm run lint
}

# 3. Compile TypeScript & Bundle
Write-Host "[3/5] Building plugin bundle (Rollup)..." -ForegroundColor Yellow
npm run build

# 4. Stage Files
Write-Host "[4/5] Staging plugin files..." -ForegroundColor Yellow
if (Test-Path $StagingDir) {
    Remove-Item -Path $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

Copy-Item (Join-Path $RootDir "manifest.json") $StagingDir
if (Test-Path (Join-Path $RootDir "en.json")) { Copy-Item (Join-Path $RootDir "en.json") $StagingDir }
if (Test-Path (Join-Path $RootDir "de.json")) { Copy-Item (Join-Path $RootDir "de.json") $StagingDir }

Copy-Item (Join-Path $RootDir "bin") $StagingDir -Recurse
Copy-Item (Join-Path $RootDir "ui") $StagingDir -Recurse
Copy-Item (Join-Path $RootDir "assets") $StagingDir -Recurse

# 5. Pack via Elgato CLI
Write-Host "[5/5] Packing .streamDeckPlugin archive..." -ForegroundColor Yellow
npx streamdeck pack $StagingDir --output $ReleaseDir --force

# 6. Local Deployment for Live Testing
$LocalPluginDir = Join-Path $env:APPDATA "Elgato\StreamDeck\Plugins\$PluginUUID.sdPlugin"
if (Test-Path (Join-Path $env:APPDATA "Elgato\StreamDeck\Plugins")) {
    Write-Host "Deploying to local Stream Deck plugins..." -ForegroundColor Green
    if (Test-Path $LocalPluginDir) {
        Remove-Item -Path $LocalPluginDir -Recurse -Force
    }
    Copy-Item -Path $StagingDir -Destination $LocalPluginDir -Recurse -Force

    if (-not $SkipRestart) {
        Write-Host "Restarting plugin in Stream Deck..." -ForegroundColor Green
        try {
            npx streamdeck restart $PluginUUID
        } catch {
            Write-Host "Could not restart plugin automatically (Stream Deck may not be running)." -ForegroundColor Gray
        }
    }
}

Write-Host "`nPlugin successfully packaged into $ReleaseDir!" -ForegroundColor Green
