# Developer & AI Agent Guidelines (`AGENTS.md`)

This document serves as the persistent technical guideline and architectural reference for AI coding agents and human contributors working on the `com.smok3y97.tilemetrics.beszel` Stream Deck plugin codebase.

---

## 🏛️ 1. Architecture & Component Interaction

TileMetrics for Beszel is a single-root Elgato Stream Deck plugin written in TypeScript using the official `@elgato/streamdeck` SDK. It connects directly to one or more user-configured Beszel hub instances via their underlying PocketBase REST API.

```
┌────────────────────────────────────────────────────────┐
│               Elgato Stream Deck Hardware              │
│       (Keypad / Stream Deck + / Stream Deck Neo)       │
└───────────────────────────▲────────────────────────────┘
                            │ SVG Base64 Data-URI (144x144)
                            │ Key Events (onKeyDown, onKeyUp)
┌───────────────────────────┴────────────────────────────┐
│         TileMetrics Stream Deck Plugin (Node.js 24)    │
│                                                        │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │ BaseMetricAction      │   │ SvgRenderer          │  │
│  │ (CPU, RAM, Disk, etc.)│   │ (Zero-Disk In-Memory)│  │
│  └───────────▲───────────┘   └──────────▲───────────┘  │
│              │                          │              │
│  ┌───────────┴──────────────────────────┴───────────┐  │
│  │ MetricsCacheService (Central Polling Singleton)  │  │
│  │ - Reference-counted active keys & standby mode   │  │
│  │ - Chronological ring-buffer for sparkline stats  │  │
│  └───────────────────────▲──────────────────────────┘  │
│                          │                             │
│  ┌───────────────────────┴──────────────────────────┐  │
│  │ BeszelApiService (PocketBase REST Client)        │  │
│  │ - Strict read-only HTTP GET queries              │  │
│  │ - JWT auth caching & self-signed HTTPS support   │  │
│  └───────────────────────▲──────────────────────────┘  │
└──────────────────────────┼─────────────────────────────┘
                           │ HTTP / HTTPS (REST API)
                           │ Strict Read-Only
┌──────────────────────────▼─────────────────────────────┐
│             Beszel Hub (PocketBase Backend)            │
│         (/api/collections/system_stats/records)        │
└────────────────────────────────────────────────────────┘
```

### Core Architecture Components:

1. **Single-Root Repository**:
    - Pure standalone Stream Deck plugin project.
    - No monorepo structure, no browser companion extension, no local WebSocket server, and no native Win32 helper binaries.
2. **Strict Read-Only PocketBase REST API**:
    - Interacts only with PocketBase read endpoints (`/api/collections/systems/records` and `/api/collections/system_stats/records`).
    - Authentication is performed against `/api/collections/users/auth-with-password`, `_superusers`, or `admins` to acquire a read-only JWT bearer token, or directly via pre-shared user token.
    - Never writes or mutates data on the Beszel server.
3. **MetricsCacheService (Central Polling Singleton)**:
    - Aggregates polling requests across all active keys to prevent redundant HTTP requests.
    - Reference counts active keys per server and per host (`registerKey` / `unregisterKey`).
    - Automatically stops server polling timers when all associated keys disappear (`Standby` mode).
    - Maintains an in-memory chronological ring-buffer (up to 60 data points) per monitored host for instant sparkline prefilling.
4. **SvgRenderer (Zero-Disk In-Memory Generation)**:
    - Generates crisp 144×144 vector graphics dynamically in memory without saving temporary files to disk.
    - Encodes SVG payloads as Base64 Data URIs (`data:image/svg+xml;base64,...`) and passes them directly to `action.setImage()`.
    - Incorporates dynamic typography sizing, threshold color coding (normal emerald, warning amber, critical red, offline slate), and sparkline trend polygons.
5. **BaseMetricAction Controller**:
    - Centralized lifecycle handling (`onWillAppear`, `onWillDisappear`, `onDidReceiveSettings`).
    - Short press (< 450 ms): Cycles through configured sub-metrics (e.g., CPU Usage -> Load Avg -> Temp).
    - Long press (>= 450 ms): Opens the target host directly in the Beszel web dashboard via `streamDeck.system.openUrl()`.

---

## 🏷️ 2. Versioning Specification

TileMetrics strictly follows the **4-digit Elgato Stream Deck Manifest Specification**:

$$\mathbf{\{Major\}.\{Minor\}.\{Patch\}.\{Build\}}$$

Starting version: `0.1.0.0`

### Synchronized Version Files:

| File                             | Property    | Format Example | Requirement                                                                   |
| :------------------------------- | :---------- | :------------- | :---------------------------------------------------------------------------- |
| [`version.json`](version.json)   | `"version"` | `"0.1.0.0"`    | Single Source of Truth for project version.                                   |
| [`manifest.json`](manifest.json) | `"Version"` | `"0.1.0.0"`    | Must be 4 numeric parts matching regex `^(0\|[1-9]\d*)(\.(0\|[1-9]\d*)){3}$`. |
| [`package.json`](package.json)   | `"version"` | `"0.1.0.0"`    | Node.js package version synchronized with manifest.                           |

### Version Semantics:

- **Major** (`{Major}`): Breaking architectural changes or complete protocol revamps.
- **Minor** (`{Minor}`): New actions, major hardware capabilities, or major telemetry features.
- **Patch** (`{Patch}`): Bug fixes, metric calculation adjustments, SVG rendering improvements.
- **Build** (`{Build}`): Packaging or marketplace submission counter.

---

## 🎨 3. Iconography & Asset Guidelines

1. **Main Plugin Icon (`Icon`)**:
    - Location: `assets/plugin-icon.png` (256×256 px) and `assets/plugin-icon@2x.png` (512×512 px).
    - Format: PNG on transparent background.
2. **Category Icon (`CategoryIcon`)**:
    - Location: `assets/category-icon.svg` (and referenced in `manifest.json` as `assets/category-icon`).
    - Format: Monochromatic vector glyph (28×28 px / 56×56 px `@2x`).
3. **Action Key & List Icons (`Actions[].Icon` & `Actions[].States[].Image`)**:
    - Location: `assets/actions/<action-name>/...`
    - Format: SVG vector graphic, white glyphs on transparent backgrounds.
4. **Key Display Generation**:
    - Keys are dynamically rendered at runtime as 144×144 SVGs via `SvgRenderer` and set via `action.setImage(dataUri)`.

---

## 📋 4. Elgato Marketplace & Plugin Guidelines Compliance

1. **Identifiers & UUIDs**:
    - Root UUID: `com.smok3y97.tilemetrics.beszel` (Reverse DNS).
    - Action UUID Prefix: `com.smok3y97.tilemetrics.beszel.<action>` (e.g. `cpu`, `memory`, `storage`, `network`, `gpu`, `ups`).
    - Immutability: Never modify existing action UUIDs post-release.
2. **Rate Limiting**:
    - Telemetry rendering updates are bounded to the polling cadence (default: 30s, minimum: 5s).
    - Dynamic updates strictly respect Elgato's 10 Hz upper ceiling.
3. **Property Inspector (PI) Rules**:
    - Settings auto-save on input or change (`setSettings` / `setGlobalSettings`).
    - No manual "Save" buttons.
    - Clean dark-mode UI with no external advertisements, donation buttons, or intrusive branding.

---

## 🚀 5. Build, Packaging & Validation Workflow

### Commands:

```bash
# Compile TypeScript to bin/plugin.js via Rollup
npm run build

# Run TypeScript typecheck & official Elgato ESLint check
npm run lint

# Auto-fix code style issues with ESLint and Prettier
npm run lint:fix

# Package release archive via PowerShell packaging script
npm run package
# or directly:
powershell -ExecutionPolicy Bypass -File ./scripts/package_plugin.ps1

# Validate staged plugin bundle with official Elgato CLI
npm run validate
# or directly:
npx streamdeck validate release/com.smok3y97.tilemetrics.beszel.sdPlugin

# Restart plugin process inside live Stream Deck desktop app
npm run restart
```

---

## ⚠️ 6. Critical Guidelines for AI Agents

- **Single-Root Directory Structure**: Keep all code, configuration, scripts, and documentation strictly within the root workspace. Do not re-introduce `plugin/` or `extension/` subdirectories.
- **Strict Read-Only Operations**: Never add REST mutations (POST/PUT/DELETE) against Beszel system records or configurations. All metric querying is strictly read-only.
- **Zero-Disk In-Memory Rendering**: Render all key metrics, sparklines, and statuses in memory as Base64 Data URIs. Never write temporary SVG or PNG files to disk.
- **Reference-Counted Polling**: All data fetching must go through `MetricsCacheService`. Actions must register on appearance and unregister on disappearance to preserve host resources.
- **Official Elgato Code Style**: Follow `@elgato/eslint-config` and `@elgato/prettier-config`. Verify that `npm run lint` finishes with `0 errors, 0 warnings`.
- **Node.js Runtime**: Maintain `"Version": "24"` under `"Nodejs"`, `"SDKVersion": 3`, and `"MinimumVersion": "7.1"` in `manifest.json`. Do not revert to Node.js 20.
- **Accurate Documentation**: Maintain technical, factual descriptions in `README.md` and `docs/`. Avoid hyperbolic marketing terminology.
