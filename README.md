<a id="top"></a>

# TileMetrics (Beszel) Stream Deck Plugin

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/Smok3y97/TileMetrics/actions/workflows/ci.yml"><img src="https://github.com/Smok3y97/TileMetrics/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Smok3y97/TileMetrics/releases"><img src="https://img.shields.io/github/v/release/Smok3y97/TileMetrics?include_prereleases&label=Release&color=blue" alt="Latest Release"></a>
  <a href="https://www.elgato.com/stream-deck"><img src="https://img.shields.io/badge/Stream%20Deck-v7.1%2B-red.svg" alt="Stream Deck"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v24%2B-green.svg" alt="Node.js"></a>
</p>

A lightweight, read-only telemetry display plugin for **Elgato Stream Deck** that queries the [Beszel](https://beszel.dev) server monitoring hub via its PocketBase REST API. It renders real-time metrics, threshold-based status indicators, and historical sparklines directly onto Stream Deck keys.

> [!NOTE]
> **Legal Disclaimer**: Beszel is an open-source project created by [henrygd](https://github.com/henrygd). TileMetrics is an independent community plugin developed by Smok3y97 and is not affiliated with, sponsored, or endorsed by henrygd or the Beszel project.

---

## 📑 Table of Contents

- [🌟 Why This Exists](#why-this-exists)
- [✨ Key Features](#key-features)
- [📊 Available Telemetry Actions](#available-telemetry-actions)
- [👆 Interactive Controls](#interactive-controls)
- [📦 Quickstart & Installation](#quickstart--installation)
- [📚 Documentation & Guides](#documentation--guides)
- [🤖 AI Collaboration & Transparency](#ai-collaboration--transparency)
- [🧪 Tested Environments & Hardware](#tested-environments--hardware)
- [🗺️ Roadmap & Future Ideas](#roadmap)
- [⚖️ Legal & Trademark Disclaimer](#disclaimer)
- [🔒 Privacy & Security](#privacy--security)
- [📄 License](#license)

---

<a id="why-this-exists"></a>

## [🌟 Why This Exists](#top)

Monitoring multiple home lab servers, NAS systems, and VPS instances usually requires keeping browser tabs open or checking heavy dashboards.

**TileMetrics** brings your [Beszel](https://beszel.dev) infrastructure metrics right onto your **Elgato Stream Deck**:

- 🚀 **Strict Read-Only Integration**: Connects via PocketBase REST endpoints with read-only access. It never writes, alters, or mutates any server data or configuration.
- ⚡ **Zero-Disk In-Memory Rendering**: Dynamic 144×144 SVG key graphics and sparkline curves are rendered entirely in RAM and passed as Base64 Data URIs directly to the hardware.
- ⏱️ **Reference-Counted Standby Polling**: Keys share a central polling loop to minimize network requests. When keys are not visible, polling halts completely into zero-CPU standby.
- 🌐 **Multi-Server Architecture**: Monitor hosts across multiple independent Beszel hub instances within the same Stream Deck profile.

---

<a id="key-features"></a>

## [✨ Key Features](#top)

- 🖥️ **6 Telemetry Actions**: Dedicated keys for CPU, Memory, Storage, Network, GPU, and UPS/Battery metrics.
- 📈 **Dynamic In-Key Sparklines**: Chronological historical trend curves rendered dynamically as SVG area charts behind numerical readouts.
- 🎨 **Threshold Color Coding**: Instant visual status changes across Normal (emerald `#10b981`), Warning (amber `#f59e0b`), Critical (red `#ef4444`), and Offline (slate `#64748b`).
- 🔄 **Interactive Cycling**: Short press any key to cycle through available sub-metrics on the fly without opening the Property Inspector.
- 🔗 **Web Dashboard Deep-Linking**: Long press any key to launch the target system's view in your default browser (`/#/system/<hostId>`).
- ⚙️ **Configurable Units**: Supports Celsius and Fahrenheit, automatic network bitrate scaling (bps to Gbps), and storage throughput (B/s to GB/s).

> [!TIP]
> 📋 **Detailed Action Reference**: For full metric specifications and formulas, see the **[Feature Matrix & Action Reference (`docs/features.md`)](docs/features.md)**.

---

<a id="available-telemetry-actions"></a>

## [📊 Available Telemetry Actions](#top)

| Action | UUID | Default Metric | Supported Sub-Metrics (Short Press Cycle) | Target Units |
| :--- | :--- | :--- | :--- | :--- |
| **CPU Telemetry** | `com.smok3y97.tilemetrics.beszel.cpu` | Total CPU % | `Usage` (%), `Load Avg` (1m load), `Temp` (°C / °F) | %, 1m load, °C / °F |
| **Memory Telemetry** | `com.smok3y97.tilemetrics.beszel.memory` | RAM Usage % | `RAM %`, `RAM GB` (used memory), `Swap %`, `ZFS ARC` (%) | %, GB, % |
| **Storage Telemetry** | `com.smok3y97.tilemetrics.beszel.storage` | Disk Used % | `Capacity` (%), `Read I/O` (speed), `Write I/O` (speed) | %, B/s to GB/s |
| **Network Telemetry** | `com.smok3y97.tilemetrics.beszel.network` | Throughput | `Throughput` (RX + TX), `Download (RX)`, `Upload (TX)` | bps to Gbps |
| **GPU Telemetry** | `com.smok3y97.tilemetrics.beszel.gpu` | Core Load % | `Core Load` (%), `VRAM` (%), `Power` (Watts), `Temp` (°C / °F) | %, %, W, °C / °F |
| **UPS / Battery** | `com.smok3y97.tilemetrics.beszel.ups` | Battery % | `Battery %`, `Status` (Online/Battery mode, runtime remaining) | %, Status / min |

---

<a id="interactive-controls"></a>

## [👆 Interactive Controls](#top)

Every telemetry key supports dual interaction modes:

1. **Short Press (< 450 ms)**:
   - Cycles to the next available sub-metric for that action.
   - Saves the selected sub-metric to key settings automatically.
   - Immediately re-renders the key display.

2. **Long Press (≥ 450 ms)**:
   - Launches the Beszel web interface in your default web browser.
   - Links directly to the system overview (`/#/system/<hostId>`) for the configured host.

---

<a id="quickstart--installation"></a>

## [📦 Quickstart & Installation](#top)

### Step 1: Install the Stream Deck Plugin
1. Download the latest `com.smok3y97.tilemetrics.beszel.streamDeckPlugin` from the [Releases](https://github.com/Smok3y97/TileMetrics/releases) page.
2. Double-click the file to install it directly into Elgato Stream Deck.
3. Open Stream Deck; the **TileMetrics (Beszel)** category will appear in the action list.

### Step 2: Configure Your Beszel Server
1. Drag any TileMetrics action (e.g. **CPU Telemetry**) onto an empty key.
2. In the Property Inspector under **Global Settings**:
   - Add your **Server URL** (e.g., `https://beszel.example.com` or `http://192.168.1.50:8090`).
   - Enter your **Username / Password** or paste a pre-generated **Auth Token**.
   - If using internal HTTPS with private certificates, enable **Allow Self-Signed Certificates**.
3. Select the monitored **Host** from the populated dropdown.

> [!TIP]
> 📖 **Configuration Details**: For multi-server management, polling tuning, and threshold options, see the **[Configuration & Setup Guide (`docs/configuration.md`)](docs/configuration.md)**.

---

<a id="documentation--guides"></a>

## [📚 Documentation & Guides](#top)

For detailed technical specifications, architecture diagrams, and developer guides, consult the project documentation:

| Guide | Description |
| :--- | :--- |
| 📋 **[Feature Matrix & Action Reference](docs/features.md)** | Detailed breakdown of all 6 telemetry actions, sub-metrics, and visual threshold states. |
| ⚙️ **[Configuration & Setup Guide](docs/configuration.md)** | Complete breakdown of Property Inspector options, authentication models, SSL settings, and thresholds. |
| 🏛️ **[System Architecture & Specifications](docs/architecture.md)** | Full technical specifications, Mermaid architecture and sequence diagrams, and directory tree. |
| 🏗️ **[Development & Contribution Guide](docs/development.md)** | Local environment setup, Rollup build commands, packaging pipeline, and versioning standards. |
| 📋 **[Marketplace Guidelines Compliance](docs/plugin-guideline.md)** | Elgato Stream Deck Marketplace compliance rules and asset specifications. |
| 🤖 **[AI Collaboration & Transparency](docs/ai-disclosure.md)** | Transparent breakdown of AI pair programming with Google Antigravity and quality assurance practices. |
| 🤝 **[Community Contribution Guidelines](CONTRIBUTING.md)** | Contribution steps, bug reporting, PR workflow, and architectural principles. |
| 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** | Contributor Covenant v2.1 community standards and pledge. |
| 🔒 **[Security Policy](SECURITY.md)** | Local-first security architecture, privacy guarantee, and vulnerability reporting. |
| 📋 **[Agent & Developer Guidelines](AGENTS.md)** | Persistent rules for human contributors and AI coding agents. |

---

<a id="ai-collaboration--transparency"></a>

## [🤖 AI Collaboration & Transparency](#top)

The source code, build scripts, vector assets, and UI components in this repository were created through pair-programming between the maintainer (**Smok3y97**) and **Google Antigravity** (utilizing Google DeepMind's advanced reasoning models). All functionality, keys, and integrations are physically tested on Stream Deck hardware. For full details, see **[AI Collaboration & Transparency (`docs/ai-disclosure.md`)](docs/ai-disclosure.md)**.

---

<a id="tested-environments--hardware"></a>

## [🧪 Tested Environments & Hardware](#top)

All releases and features are physically tested and validated on live hardware:

- **Hardware**: Elgato Stream Deck +, Elgato Stream Deck MK.2
- **Environment**: Windows 11, Node.js 24, Stream Deck Software 7.1+
- **Monitoring Hub**: Beszel Hub (Docker / Linux)

---

<a id="roadmap"></a>

## [🗺️ Roadmap & Future Ideas](#top)

Here is an overview of planned platform releases and potential future features under consideration for TileMetrics:

### 🚀 Distribution & Platform Releases
- 🏬 **Elgato Stream Deck Marketplace Release**: Official distribution on the Elgato Marketplace for seamless one-click installation and automatic plugin updates.

### 💡 Potential Future Features & Ideas
- 🎛️ **Stream Deck + Dial & LCD Layouts**: Native support for Stream Deck + rotary dials and touchstrips to monitor multi-core graphs or scrub telemetry history.
- 🐳 **Container Telemetry Action**: Dedicated action displaying Docker / Podman container statuses and resource footprints directly from Beszel.
- 🔔 **Threshold Alert Haptics / Flashing**: Optional visual pulse or audible chime on Stream Deck when critical thresholds are breached.
- 📊 **Multi-Host Aggregated Summary Key**: Single overview tile indicating overall infrastructure health across all monitored systems.

---

<a id="disclaimer"></a>

## [⚖️ Legal & Trademark Disclaimer](#top)

Beszel is an open-source project created by [henrygd](https://github.com/henrygd). TileMetrics is an independent open-source tool developed by Smok3y97 and is not affiliated with, sponsored, or endorsed by henrygd or the Beszel project. All product names, logos, and brands are property of their respective owners.

---

<a id="privacy--security"></a>

## [🔒 Privacy & Security](#top)

TileMetrics communicates **strictly and exclusively** with the Beszel server URLs configured in your settings:
- **Zero External Telemetry**: No tracking, analytics, or remote calls to third parties.
- **Zero Disk Writes**: Transient metrics and SVG key images remain purely in memory (RAM).
- **Secure Credentials**: Passwords and tokens are stored locally in Elgato Stream Deck's secure settings store.

For complete information, see **[Privacy Policy (`PRIVACY.md`)](PRIVACY.md)** and **[Security Policy (`SECURITY.md`)](SECURITY.md)**.

---

<a id="license"></a>

## [📄 License](#top)

This project is licensed under the [MIT License](LICENSE).
