# Contributing to TileMetrics for Beszel (`CONTRIBUTING.md`)

Thank you for your interest in contributing to **TileMetrics for Beszel**! 🎉

Whether you are reporting a bug, proposing new telemetry metrics, improving documentation, or submitting pull requests, any help in making this open-source Stream Deck plugin even better is warmly appreciated.

---

## 📑 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Features & Metrics](#suggesting-features--metrics)
    - [Submitting Pull Requests](#submitting-pull-requests)
- [Local Development Setup](#-local-development-setup)
    - [Prerequisites](#prerequisites)
    - [Build, Package & Validate Commands](#build-package--validate-commands)
- [Architecture & Coding Standards](#-architecture--coding-standards)
    - [1. Strict Read-Only Operations](#1-strict-read-only-operations)
    - [2. Zero-Disk In-Memory Policy](#2-zero-disk-in-memory-policy)
    - [3. Reference-Counted Central Poller](#3-reference-counted-central-poller)
    - [4. Zero Native Canvas Dependencies](#4-zero-native-canvas-dependencies)
    - [5. Property Inspector Auto-Save](#5-property-inspector-auto-save)
    - [6. Versioning & Package Standards](#6-versioning--package-standards)

---

## 🤝 Code of Conduct

All contributors and participants are expected to uphold the **[Code of Conduct](CODE_OF_CONDUCT.md)** (Contributor Covenant v2.1). Please review the full guidelines to understand community standards.

---

## 💡 How Can I Contribute?

### Reporting Bugs

Before filing a new report, please search [existing issues](https://github.com/Smok3y97/TileMetrics/issues) to avoid duplicates. When opening a bug report, use the **[Bug Report Template](https://github.com/Smok3y97/TileMetrics/issues/new?template=bug_report.yml)** to provide:

- **Environment**: OS (Windows / macOS), Stream Deck software version, Beszel hub version.
- **Hardware**: Stream Deck model (MK.2, XL, Mini, Neo, +, Mobile).
- **Steps to Reproduce**: Clear, reproducible step-by-step instructions.
- **Expected vs. Actual Behavior**: What happened vs. what you expected.
- **Logs / Screenshots**: Stream Deck plugin logs (`%APPDATA%\Elgato\StreamDeck\logs\com.smok3y97.tilemetrics.beszel\`).

### Suggesting Features & Metrics

Feature requests and telemetry proposals are always welcome! Please use the **[Feature Request Template](https://github.com/Smok3y97/TileMetrics/issues/new?template=feature_request.yml)**:

- Explain the telemetry use case and the target Beszel metric.
- Describe the proposed visual display and toggle states on Stream Deck keys.

### Submitting Pull Requests

1. **Fork & Branch**: Fork the repository and create a descriptive feature branch (e.g. `feature/ups-runtime-badge` or `fix/disk-mount-lookup`).
2. **Follow Coding Standards**: Adhere to the project's architectural guidelines and pass all linting and typecheck rules.
3. **Validate**: Always run `npm run lint` and `npm run validate` locally before submitting.
4. **Open a PR**: Submit a Pull Request using the standard PR template. GitHub Actions CI will automatically run all checks.

---

## 💻 Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or newer
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- [Elgato Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/intro): `npm install -g @elgato/cli`
- Stream Deck Application v6.5+

### Build, Package & Validate Commands

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript & bundle via Rollup
npm run build

# 3. Lint and typecheck with official Elgato ESLint & Prettier
npm run lint

# 4. Auto-fix formatting and styling
npm run lint:fix

# 5. Build, package, and deploy directly to your local Stream Deck
npm run package

# 6. Validate staged plugin bundle with Elgato CLI
npm run validate
```

---

## 🏛️ Architecture & Coding Standards

### 1. Strict Read-Only Operations

The plugin queries the Beszel PocketBase REST API exclusively via HTTP `GET` requests. Never add mutation endpoints (`POST`, `PATCH`, `DELETE`) against system records or stats collections (with the sole exception of authentication).

### 2. Zero-Disk In-Memory Policy

All telemetry, history arrays, and rendered 144×144 SVG graphics remain strictly in V8 RAM. Do not write temporary images, cache files, or local databases to disk.

### 3. Reference-Counted Central Poller

Never initiate ad-hoc HTTP polling loops inside individual action classes. All querying must flow through `MetricsCacheService`, which reference-counts active keys and enters zero-CPU standby mode when no keys are visible.

### 4. Zero Native Canvas Dependencies

To ensure reliable, cross-platform compilation on macOS and Windows without native C++ compilation toolchains (`node-gyp`), all key visuals are generated via `SvgRenderer` as pure in-memory SVG strings and passed as Base64 Data URIs to `action.setImage()`.

### 5. Property Inspector Auto-Save

In compliance with official Elgato guidelines, Property Inspector settings must auto-save on input or change events (`setSettings` / `setGlobalSettings`). Never add manual "Save" buttons.

### 6. Versioning & Package Standards

We follow Elgato's 4-digit versioning: `{Major}.{Minor}.{Patch}.{Build}`. Always keep `version.json`, `manifest.json`, and `package.json` synchronized.
