# Developer & AI Agent Guidelines (`AGENTS.md`)

This document serves as the persistent technical guideline and architectural reference for AI coding agents (such as Google Antigravity / Gemini) and human contributors working on the `com.smok3y97.tilemetrics.beszel` Stream Deck plugin codebase.

---

## 🏛️ 1. Architecture & Component Interaction

For detailed architectural diagrams, sequence charts, and component breakdowns, refer to [`docs/architecture.md`](docs/architecture.md).

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

### 📁 Repository Layout
- `src/`: TypeScript source code (`actions/`, `services/`, `rendering/`, `utils/`, `types/`).
- `bin/`: Transpiled Node.js module bundle (`preserveModules: true`) loaded by Stream Deck.
- `ui/`: Property Inspector frontend components (`common.html`, `global-settings.html`, `i18n.js`, `streamdeck-client.js`).
- `assets/`: Plugin icon badges, category icon, and telemetry action vector graphics.
- `scripts/`: Automation, asset generation, version bumping, and packaging scripts.
- `docs/`: Technical architecture specifications, configuration guides, feature matrix, and developer documentation.
- `release/`: Generated distribution packages (`com.smok3y97.tilemetrics.beszel.streamDeckPlugin`).

### 🔄 End-to-End State Flow
```text
1. Key Life-Cycle Event:
   Stream Deck app invokes onWillAppear() on BaseMetricAction
2. Cache Registration:
   BaseMetricAction ──► MetricsCacheService.registerKey(keyId, serverId, hostId)
3. Initial Prefill & Polling Start:
   MetricsCacheService ──► BeszelApiService.getHistoricalStats() ──► Ring-Buffer prefilled
   MetricsCacheService starts dynamic polling interval for active server (if not already running)
4. Telemetry Distribution:
   MetricsCacheService emits 'metricsUpdated' ──► BaseMetricAction.renderKey(latest, history)
5. In-Memory Rendering:
   SvgRenderer generates 144x144 SVG ──► Base64 Data-URI ──► action.setImage()
6. Standby Mode:
   onWillDisappear() ──► MetricsCacheService.unregisterKey(keyId) ──► Polling timer destroyed on 0 active keys
```

---

## 🚨 2. Critical Rules & Edge Cases

- **Never edit generated/packed files:** Never manually edit `release/**`, `bin/**`, or `package-lock.json`. Dependencies and lockfiles must strictly be managed natively via `npm`.
- **Strict Read-Only REST Operations:** Never add REST mutations (`POST`, `PUT`, `DELETE`, `PATCH`) against Beszel system records or configurations. All metric querying is strictly read-only HTTP `GET` against PocketBase endpoints.
- **In-Memory Assets Only (Zero-Disk):** Never write temporary SVG or PNG files to disk. All dynamic key imagery, numerical indicators, and sparkline area polylines must be rendered in RAM as Base64 Data URIs (`data:image/svg+xml;base64,...`).
- **Reference-Counted Polling & Standby Mode:** All data fetching must go through `MetricsCacheService`. Actions must register on appearance and unregister on disappearance. When 0 keys remain for a host/server, polling timers must be destroyed immediately.
- **10 Hz Hardware Limit:** Programmatic updates to Stream Deck keys and dynamic renderings must never exceed 10 updates per second (10 Hz). Telemetry updates remain bounded to the polling cadence (default: 30s, minimum: 5s).
- **Central Version Source:** Never manually edit version strings across manifests or package files. Always use the central bump command: `npm run bump <version>`.
- **Immutable Action UUIDs:** Never modify existing action UUIDs in `manifest.json` after release (use `"VisibleInActionsList": false` to deprecate actions).
- **Strict Typing Discipline:** Avoid `as any`, `@ts-ignore`, and `@ts-expect-error`. Define or extend explicit TypeScript interfaces in `src/types/` instead of bypassing the type checker.
- **String & Label Truncation:** Hostnames and metric names can vary greatly in length. Always truncate and sanitize strings before embedding into SVG markup to prevent layout breakage or invalid XML.
- **Node.js Runtime:** Maintain `"Version": "24"` under `"Nodejs"`, `"SDKVersion": 3`, and `"MinimumVersion": "7.1"` in `manifest.json`. Do not revert to Node.js 20.

---

## 🧩 3. Modular Architecture & Single Responsibility Principle (SRP)

The codebase strictly follows a decoupled, modular architecture adhering to the Single Responsibility Principle:

- **Backend Services Layer (`src/services/`)**: Centralized, isolated services (`beszel-api.service.ts`, `metrics-cache.service.ts`) consumed exclusively via Singleton patterns.
- **Action Controllers Layer (`src/actions/`)**: Independent action handlers inheriting from `BaseMetricAction` (`cpu.action.ts`, `gpu.action.ts`, `memory.action.ts`, `network.action.ts`, `storage.action.ts`, `ups.action.ts`).
- **Rendering Engine Layer (`src/rendering/`)**: Pure in-memory vector renderer (`svg.renderer.ts`) handling layout geometry, dynamic typography scaling, status indicators, and sparkline trend polygons.
- **Single Point of Truth Utilities (`src/utils/`)**: Domain-specific metric extraction (`cpu.utils.ts`, `gpu.utils.ts`, `memory.utils.ts`, etc.), temperature parsers (`temperature.utils.ts`), and unit conversions (`unit-conversion.utils.ts`).
- **Property Inspector Frontend Layer (`ui/`)**: Strict separation between the SDK WebSocket bridge ([`streamdeck-client.js`](ui/streamdeck-client.js)), localization loader ([`i18n.js`](ui/i18n.js)), and action configuration views.
- **Full Architecture & Component Reference**: Detailed diagrams, data flows, and full directory trees are maintained in [`docs/architecture.md`](docs/architecture.md).

---

## 🏷️ 4. Versioning Specification & Centralized Synchronization

TileMetrics strictly follows the **4-digit Elgato Stream Deck Manifest Specification**:

$$\mathbf{\{Major\}.\{Minor\}.\{Patch\}.\{Build\}}$$

Starting version: `0.1.0.0`

### 🚀 Centralized Single Command Versioning:
Versions are managed centrally via [`version.json`](version.json) and automated with:
```bash
npm run bump <version>
# Example:
npm run bump 0.1.2.0
```

Running `npm run bump` automatically updates and synchronizes all required files:
| File | Property | Format Example | Requirement |
| :--- | :--- | :--- | :--- |
| [`version.json`](version.json) | `"version"` | `"0.1.2.0"` | **Single Source of Truth** for project version. |
| [`manifest.json`](manifest.json) | `"Version"` | `"0.1.2.0"` | **Must be 4 numeric parts** matching regex `^(0\|[1-9]\d*)(\.(0\|[1-9]\d*)){3}$`. Required by Elgato CLI validation. |
| [`package.json`](package.json) | `"version"` | `"0.1.2.0"` | Synchronized with plugin manifest version. |
| `package-lock.json` | `"version"` | `"0.1.2.0"` | Synchronized automatically via `npm install --package-lock-only` (never edited manually). |

### Segment Semantics:
- **Major** (`{Major}`): Fundamental architectural overhauls, breaking changes, or SDK major upgrades.
- **Minor** (`{Minor}`): New actions, major hardware capabilities, or major telemetry features.
- **Patch** (`{Patch}`): Bug fixes, metric calculation adjustments, SVG rendering improvements.
- **Build** (`{Build}`): Packaging or marketplace submission counter.

> [!NOTE]
> Version numbers appearing in code snippets, tables, or guides within [`docs/development.md`](docs/development.md) serve strictly as **illustrative examples** and do **not** need to be edited or bumped with each release. The live version is defined solely by [`version.json`](version.json).

### 🏷️ Creating and Triggering a GitHub Release
To trigger the automated GitHub Actions release pipeline (`release.yml`), the version tag must be created and pushed along with the bump commit:

```bash
# 1. Bump version across all manifests / package files
npm run bump <version>  # e.g., npm run bump 0.1.3.0

# 2. Stage and commit the synchronized files
git add version.json package.json package-lock.json manifest.json
git commit -m "chore(release): bump version to <version>" -m "- Synchronized all manifests to <version> via npm run bump"

# 3. Create the version tag matching the v{Major}.{Minor}.{Patch}.{Build} pattern
git tag v<version>  # e.g., git tag v0.1.3.0

# 4. Push commit and tag to GitHub to trigger the release workflow
git push origin main
git push origin v<version>
```
*Note: The `.github/workflows/release.yml` pipeline strictly listens to tags matching `v*.*.*.*`. Pushing only the commit will trigger the CI test pipeline, but will NOT create a GitHub Release.*

---

## 🎨 5. Iconography & Asset Guidelines

Refer to [`docs/plugin-guideline.md`](docs/plugin-guideline.md) and official Elgato guidelines for complete asset requirements:

1. **Main Plugin Icon (`Icon`)**:
   - Location: `assets/plugin-icon.png` (256×256 px) and `assets/plugin-icon@2x.png` (512×512 px).
   - Format: **PNG** on transparent background (Strict requirement by Stream Deck preferences detail pane).
2. **Category Icon (`CategoryIcon`)**:
   - Location: `assets/category-icon.svg` (and referenced in `manifest.json` as `"CategoryIcon": "assets/category-icon"`).
   - Dimensions: 28×28 px (Standard DPI) / 56×56 px (`@2x` High DPI).
   - Format: **Monochromatic vector glyph**, `#FFFFFF` white stroke on transparent background. No solid background fill.
3. **Action Key & List Icons (`Actions[].Icon` & `Actions[].States[].Image`)**:
   - Location: `assets/actions/<action-name>/...`
   - Dimensions: Action List Icons: 20×20 px (40×40 px `@2x`). Key State Icons: 72×72 px (144×144 px `@2x`).
   - Format: **SVG vector graphic**, white glyphs on transparent backgrounds.
4. **Key Display Generation**:
   - Keys are dynamically rendered at runtime as 144×144 SVGs via `SvgRenderer` and set via `action.setImage(dataUri)`.
5. **Asset Generation**:
   - Run `npm run assets` (or `powershell -ExecutionPolicy Bypass -File scripts/generate_assets.ps1`) to re-generate all SVG and PNG assets.

---

## 📋 6. Elgato Marketplace & Plugin Guidelines Compliance

1. **Identifiers & UUIDs**:
   - Root UUID: `com.smok3y97.tilemetrics.beszel` (Reverse DNS).
   - Action UUID Prefix: `com.smok3y97.tilemetrics.beszel.<action>` (e.g. `cpu`, `memory`, `storage`, `network`, `gpu`, `ups`).
   - Immutability: **Never** modify existing action UUIDs post-release.
2. **Rate Limiting**:
   - Telemetry rendering updates are bounded to the polling cadence (default: 30s, minimum: 5s).
   - Dynamic updates strictly respect Elgato's 10 Hz upper ceiling.
3. **Property Inspector (PI) Rules**:
   - **Auto-Save**: Settings auto-save on input or change (`setSettings` / `setGlobalSettings`).
   - **Never include a manual "Save" button.**
   - Clean dark-mode UI with no external advertisements, donation buttons, or intrusive branding.
4. **Visual Feedback (`showAlert` / `showOk`)**:
   - `showAlert`: Trigger on errors or unreachable server endpoints.
   - `showOk`: Trigger **only** when there is no other visual indicator of success. Never call `showOk` if the key icon or state updates dynamically.

---

## 💬 7. Code Commenting Guidelines for AI Agents

- **Explain Intent, Not Syntax ("Why over What"):** Comments must explain *why* a particular piece of logic, guard clause, or branch exists rather than narrating what the syntax does. Avoid trivial comments.
- **Document Workarounds & Quirks:** Any fallback logic addressing PocketBase schema quirks, multi-architecture thermal sensor naming, or Stream Deck SDK specifics must explicitly state the problem or bug being mitigated.
- **Visual Section Separators:** For complex methods or multibranch logic, use a short, concise one-line comment above major logical steps as a visual anchor.
- **No Trailing Periods:** Single-line comments should end without a period (concise imperative style).
- **No Marketing Fluff:** Avoid hyperbolic buzzwords ("blazing", "ultra-fast", "bulletproof", "pixel-perfect") in code comments and docstrings; keep language strictly technical and objective.

---

## 🚀 8. Build, Packaging & Validation Workflow

### Commands:

```bash
# 0. Fast TypeScript validation (type check only without building bundles)
npx tsc --noEmit

# 1. Compile TypeScript to bin/plugin.js via Rollup
npm run build

# 2. Continuously compile on file changes
npm run watch

# 3. Run TypeScript typecheck & official Elgato ESLint check
npm run lint

# 4. Auto-fix code style issues with ESLint and Prettier
npm run lint:fix

# 5. Bump project version across all manifests
npm run bump <version>

# 6. Package release archive via PowerShell packaging script
npm run package
# or directly:
powershell -ExecutionPolicy Bypass -File ./scripts/package_plugin.ps1

# 7. Validate staged plugin bundle with official Elgato CLI
npm run validate
# or directly:
npx streamdeck validate release/com.smok3y97.tilemetrics.beszel.sdPlugin

# 8. Restart plugin process inside live Stream Deck desktop app
npm run restart
# or directly:
npx streamdeck restart com.smok3y97.tilemetrics.beszel
```

### Packaging Script (`scripts/package_plugin.ps1`):
The packaging script automates:
1. Invoking `scripts/generate_assets.ps1` to ensure all vector and raster assets are up to date.
2. Checking linting & formatting (`npm run lint`).
3. Compiling TypeScript & building plugin bundle via Rollup (`npm run build`).
4. Staging plugin files to `release/com.smok3y97.tilemetrics.beszel.sdPlugin`.
5. Packing `.streamDeckPlugin` archive via Elgato CLI (`npx streamdeck pack`).
6. Deploying the staged `.sdPlugin` directly to `%APPDATA%\Elgato\StreamDeck\Plugins\com.smok3y97.tilemetrics.beszel.sdPlugin`.
7. Hot-restarting the live plugin process in Stream Deck via `streamdeck restart` for instant live testing.

### CI/CD & Automated GitHub Releases:
- **CI Pipeline (`.github/workflows/ci.yml`)**: Triggered on pushes and PRs on `ubuntu-latest`. Validates types (`tsc`), linting (`eslint`), builds bundle, and validates via `streamdeck validate`.
- **Release Pipeline (`.github/workflows/release.yml`)**: Triggered upon pushing a version tag (e.g. `v0.1.2.0`). Packages, validates, and automatically publishes the official GitHub Release with attached `.streamDeckPlugin`.
- **Dependency Automation (`.github/dependabot.yml`)**: Scans weekly for dependency and GitHub Actions security/version updates.

### 🛑 Definition of Done (Task Checklist)
Before completing any task, verify the following checklist:
1. `npx tsc --noEmit` passes with 0 type errors, followed by `npm run build` for the final bundle.
2. `npm run lint` (ESLint & TypeScript check) completes with 0 errors and 0 warnings.
3. `npm run validate` confirms official Elgato SDK schema compliance with 0 errors and 0 warnings.
4. No orphaned `console.log()` debug statements left in production code.
5. Any additions or modifications to services, metrics, or settings are synchronized in the relevant markdown files in `docs/` and `README.md` within the same change.

---

## ⚠️ 9. Critical Operational Guidelines for AI Agents

### 📚 Comprehensive Documentation Maintenance
Always keep documentation files inside [`docs/`](docs/) and [`README.md`](README.md) up to date whenever new services, actions, UI components, settings, or architectural workflows are added or modified:
- **`docs/architecture.md` (Highest Priority):** Must meticulously reflect every backend service, REST route, Mermaid diagram, and repository file structure change.
- **User & Setup Guides (`docs/features.md`, `docs/configuration.md`):** Must accurately document all user-facing settings, action tables, sub-metrics, and threshold options.
- **Developer & Reference Guides (`docs/development.md`, `docs/ai-disclosure.md`):** Must keep build steps and testing environments synchronized without stale or contradictory information.
- **Do NOT Edit `docs/plugin-guideline.md`:** Serves as an immutable upstream reference mirroring official Elgato specifications and must **never** be manually modified by AI agents.
- **Focused & Minimal Edits:** Avoid unnecessary sentence restructuring, cosmetic rephrasing, or adding fluff. Focus documentation changes strictly on essentials and factual updates.

### 🛡️ Network Security & Read-Only Invariants
- **Read-Only Invariant:** Under no circumstances should mutative HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`) be added for Beszel resources.
- **Credential Storage:** Passwords and tokens must remain within Stream Deck's internal settings store and never be transmitted to external servers or logged in plain text.
- **Self-Signed Certificates:** Ensure custom TLS agents with `rejectUnauthorized: false` are only instantiated when explicitly enabled by user settings.

### 📦 Git & Workflow Discipline
- **Conditional Builds:** Run packaging and validation (`npm run package` / `npm run validate`) only when code, assets, UI, or manifests are modified. Do not execute build or validation commands for documentation-only changes.
- **Never Manually Edit `package-lock.json`:** Lockfiles must always be committed to Git, but **never** manually edited via text tools. Changes must always be generated natively by npm (`npm install <pkg>`, `npm update`, or `npm install --package-lock-only` via `npm run bump`).
- **Structured Commit Messages:** Commits must follow Conventional Commits with a mandatory body explaining specific changes and rationale in bullet points:
  ```text
  <type>(<scope>): <short imperative summary>

  - <bullet point explaining what changed>
  - <bullet point explaining why the change was made>
  ```

