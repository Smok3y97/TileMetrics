<a id="top"></a>

# AI Collaboration & Transparency Disclosure (`docs/ai-disclosure.md`)

This document outlines the development methodology, the extent of AI-assisted generation, and the validation procedures applied to the **TileMetrics (Beszel)** Stream Deck plugin.

---

## 📑 Table of Contents

- [🤖 1. Development Methodology](#-1-development-methodology)
- [🛠️ 2. Architectural Scope of Generated Components](#-2-architectural-scope-of-generated-components)
- [🧪 3. Quality Assurance & Verification Standards](#-3-quality-assurance--verification-standards)
- [🔍 4. Dependencies & Security Review](#-4-dependencies--security-review)

---

## [🤖 1. Development Methodology](#top)

The source code, build configuration, vector artwork, and documentation in this repository were created through pair-programming between the project maintainer (**Smok3y97**) and **Google Antigravity** (utilizing Google DeepMind's advanced reasoning models).

```
┌────────────────────────────────────────────────────────┐
│               Human Maintainer (Smok3y97)              │
│                                                        │
│ • Defines system architecture & monitoring requirements│
│ • Specifies Beszel / PocketBase REST API constraints   │
│ • Conducts physical hardware testing on Stream Deck    │
└───────────────────────────┬────────────────────────────┘
                            │ Interactive Prompting
                            │ & Iterative Review
                            ▼
┌────────────────────────────────────────────────────────┐
│             Google Antigravity / Gemini AI             │
│                                                        │
│ • Writes TypeScript plugin backend code                │
│ • Implements in-memory SVG sparkline renderer          │
│ • Configures Rollup, ESLint, and packaging automation  │
│ • Authoring technical specifications and documentation │
└────────────────────────────────────────────────────────┘
```

---

## [🛠️ 2. Architectural Scope of Generated Components](#top)

1. **Backend Plugin Services**:
    - `BeszelApiService`: PocketBase REST client, JWT authentication lifecycle, and HTTPS custom agent handling.
    - `MetricsCacheService`: Singleton cache with reference-counted polling timers and chronological ring-buffers.
2. **Action Controllers**:
    - `BaseMetricAction`: Hardware lifecycle methods, press duration timing, and Property Inspector bridging.
    - Specific metric controllers for CPU, Memory, Storage, Network, GPU, and UPS monitoring.
3. **Graphics Engine**:
    - `SvgRenderer`: In-memory 144×144 pixel SVG generator computing sparkline coordinate geometry and tabular numeric layouts.
4. **Tooling & Build Pipelines**:
    - Rollup compilation bundling, packaging automation (`package_plugin.ps1`), and GitHub Actions workflows.

---

## [🧪 3. Quality Assurance & Verification Standards](#top)

To ensure stability and correctness:

- **Type Safety**: The entire codebase is compiled with strict TypeScript checking (`noImplicitAny`, strict null checks).
- **Official Elgato Linting**: Validated with `@elgato/eslint-config` and `@elgato/prettier-config` with zero allowed warnings (`--max-warnings 0`).
- **Schema Validation**: Every build is validated using the official Elgato CLI (`npx streamdeck validate`) against Elgato's plugin manifest specifications.
- **Hardware Validation**: Tested on physical Elgato Stream Deck hardware devices.

---

## [🔍 4. Dependencies & Security Review](#top)

- **Minimal External Dependencies**: The production runtime relies on `@elgato/streamdeck` for hardware communication and native Node.js libraries (`https`, `events`, `buffer`).
- **Read-Only Guarantee**: Network operations are strictly confined to HTTP `GET` requests against user-specified Beszel servers.
- **Open Source**: The entire repository is published under the [MIT License](../LICENSE) for community review and contribution.
