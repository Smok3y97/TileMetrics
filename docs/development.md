<a id="top"></a>

# Development & Contribution Guide (`docs/development.md`)

This guide covers local environment setup, compilation workflows, code quality guidelines, and packaging procedures for the **TileMetrics (Beszel)** Stream Deck plugin.

---

## 📑 Table of Contents

- [🛠️ Prerequisites](#-prerequisites)
- [🚀 Build & Packaging Commands](#-build--packaging-commands)
- [📦 Packaging Pipeline (`scripts/package_plugin.ps1`)](#-packaging-pipeline-scriptspackage_pluginps1)
- [✨ Code Style & Linting Specifications](#-code-style--linting-specifications)
- [🏷️ Versioning Scheme](#-versioning-scheme)
- [🤖 CI/CD & Automated GitHub Releases](#-cicd--automated-github-releases)

---

## [🛠️ Prerequisites](#top)

To develop and build TileMetrics locally, ensure you have:

- **Node.js**: `v20.0.0` or newer (LTS recommended).
- **npm**: `v10.0.0` or newer.
- **Elgato Stream Deck Application**: `v6.5+` (tested on `v7.0+`).
- **PowerShell**: Windows PowerShell 5.1 or PowerShell 7 (required for automated packaging scripts).

---

## [🚀 Build & Packaging Commands](#top)

All development scripts are executed from the repository root:

```bash
# 1. Install all dependencies
npm install

# 2. Compile TypeScript into bin/plugin.js bundle via Rollup
npm run build

# 3. Continuous compilation watch mode
npm run watch

# 4. Check TypeScript types and execute Elgato ESLint validation
npm run lint

# 5. Automatically fix formatting and lint issues
npm run lint:fix

# 6. Package and deploy to local Stream Deck plugins directory
npm run package
# or directly:
powershell -ExecutionPolicy Bypass -File .\scripts\package_plugin.ps1

# 7. Validate staged plugin directory against official Elgato SDK schema
npm run validate
# or directly:
npx streamdeck validate release/com.smok3y97.tilemetrics.beszel.sdPlugin

# 8. Hot-restart plugin inside running Stream Deck desktop application
npm run restart
# or directly:
npx streamdeck restart com.smok3y97.tilemetrics.beszel
```

---

## [📦 Packaging Pipeline (`scripts/package_plugin.ps1`)](#top)

The packaging script in [`scripts/package_plugin.ps1`](../scripts/package_plugin.ps1) automates the end-to-end distribution process:

1. **Asset Generation**: Executes `scripts/generate_assets.ps1` if present to produce vector graphics.
2. **Lint & Code Style**: Runs `npm run lint` (skippable with `-SkipLint`).
3. **Rollup Compilation**: Compiles the standalone JavaScript distribution file to `bin/plugin.js`.
4. **Staging Directory Preparation**: Creates clean staging structure in `release/com.smok3y97.tilemetrics.beszel.sdPlugin` and copies required distribution components:
    - `manifest.json`
    - Localization manifests (`en.json`, `de.json` if present)
    - `bin/` bundle
    - `ui/` Property Inspector HTML/CSS/JS
    - `assets/` icons and action artwork
5. **Elgato CLI Packing**: Invokes `npx streamdeck pack` to generate the `.streamDeckPlugin` distribution file.
6. **Local Deployment**: Copies the staged plugin directory directly into `%APPDATA%\Elgato\StreamDeck\Plugins\com.smok3y97.tilemetrics.beszel.sdPlugin`.
7. **Process Restart**: Sends a restart signal via `npx streamdeck restart` for immediate testing.

---

## [✨ Code Style & Linting Specifications](#top)

The codebase strictly adheres to the official Elgato Stream Deck coding standards:

- **ESLint**: Configured with flat config via [`eslint.config.js`](../eslint.config.js) using `@elgato/eslint-config`.
- **Prettier**: Configured using `@elgato/prettier-config`.
- **Zero Warnings Policy**: CI enforces `--max-warnings 0`. Code must pass with 0 errors and 0 warnings.
- **Type Safety**: Avoid using `any`. Use strict interfaces from `@elgato/streamdeck` (`JsonObject`, `JsonValue`, etc.).

---

## [🏷️ Versioning Scheme](#top)

TileMetrics adheres to the 4-digit Elgato Stream Deck versioning standard:

$$\mathbf{\{Major\}.\{Minor\}.\{Patch\}.\{Build\}}$$

Starting version: `0.1.0.0`

### Version Files:

- [`version.json`](../version.json): Root project version.
- [`manifest.json`](../manifest.json): Plugin manifest version inspected by Elgato Stream Deck.
- [`package.json`](../package.json): Root Node.js package version.

### Semantic Meaning:

- **Major**: Incompatible architectural redesigns or breaking changes.
- **Minor**: New action controllers, hardware support, or new metric categories.
- **Patch**: Bug fixes, threshold adjustments, or typography refinements.
- **Build**: Packaging counter or marketplace re-submission counter.

---

## [🤖 CI/CD & Automated GitHub Releases](#top)

Automated testing and release pipelines are defined in `.github/workflows/`:

- **Continuous Integration (`ci.yml`)**:
    - Triggers on every push and pull request to `main` or `master`.
    - Runs on `ubuntu-latest` with Node.js 20.
    - Executes `npm ci`, `npm run lint`, `npm run build`, and `npm run validate`.
- **Release Automation (`release.yml`)**:
    - Triggers when a Git tag matching `v*` (e.g. `v0.1.0.0`) is pushed, or via manual dispatch.
    - Builds, packages, and validates the plugin.
    - Creates a GitHub Release and attaches `com.smok3y97.tilemetrics.beszel.streamDeckPlugin`.
