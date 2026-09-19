# TileMetrics (Beszel) Stream Deck Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stream Deck](https://img.shields.io/badge/Stream%20Deck-v6.5%2B-red.svg)](https://www.elgato.com/stream-deck)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)

A lightweight, read-only telemetry display plugin for Elgato Stream Deck that queries the [Beszel](https://beszel.dev) server monitoring hub via its PocketBase REST API. It renders real-time metrics, threshold-based status indicators, and historical sparklines directly onto Stream Deck keys.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Available Telemetry Actions](#available-telemetry-actions)
- [Interactive Controls](#interactive-controls)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development & Build](#development--build)
- [Architecture Summary](#architecture-summary)
- [Privacy & Security](#privacy--security)
- [License](#license)

---

## Overview

TileMetrics provides real-time visibility into infrastructure metrics monitored by Beszel directly on your desk. The plugin runs as a native Node.js plugin within the Stream Deck application, connecting over HTTP or HTTPS to your Beszel hub instance.

Key design characteristics:

- **Strict Read-Only Integration**: Interacts solely with Beszel PocketBase REST endpoints without modifying server state.
- **Zero-Disk In-Memory Rendering**: Dynamic 144×144 SVG key images and sparklines are generated in memory and passed directly to the hardware as Base64 Data URIs.
- **Centralized Reference-Counted Polling**: Multiple keys sharing a server or host reuse a single polling loop. Polling halts automatically when keys are not visible.
- **Multi-Server Architecture**: Monitor hosts across multiple independent Beszel hub instances within the same Stream Deck profile.

---

## Features

- **Multi-Server Monitoring**: Configure multiple Beszel hub instances with independent credentials, tokens, or self-signed certificate options.
- **Comprehensive Hardware Metrics**: Dedicated actions for CPU, Memory, Storage, Network, GPU, and UPS/Battery metrics.
- **Dynamic In-Key Sparklines**: Trend history rendered as SVG area charts behind current numerical values.
- **Threshold Color Coding**: Automatic state shifts across Normal (emerald), Warning (amber), and Critical (red) thresholds.
- **Interactive Cycling**: Tap any key to cycle through available sub-metrics without opening the Property Inspector.
- **Dashboard Deep-Linking**: Long-press any key to open the target host directly in the Beszel web UI in your default browser.
- **Configurable Units**: Supports Celsius and Fahrenheit temperature formats, automatic network bitrate formatting (bps to Gbps), and storage throughput (B/s to GB/s).

---

## Available Telemetry Actions

| Action                | UUID                                      | Default Metric | Supported Sub-Metrics (Short Press Cycle)                      |
| :-------------------- | :---------------------------------------- | :------------- | :------------------------------------------------------------- |
| **CPU Telemetry**     | `com.smok3y97.tilemetrics.beszel.cpu`     | Total CPU %    | `Usage` (%), `Load Avg` (1m load), `Temp` (°C / °F)            |
| **Memory Telemetry**  | `com.smok3y97.tilemetrics.beszel.memory`  | RAM Usage %    | `RAM %`, `RAM GB` (used memory), `Swap %`, `ZFS ARC` (%)       |
| **Storage Telemetry** | `com.smok3y97.tilemetrics.beszel.storage` | Disk Used %    | `Capacity` (%), `Read I/O` (speed), `Write I/O` (speed)        |
| **Network Telemetry** | `com.smok3y97.tilemetrics.beszel.network` | Throughput     | `Throughput` (RX + TX), `Download (RX)`, `Upload (TX)`         |
| **GPU Telemetry**     | `com.smok3y97.tilemetrics.beszel.gpu`     | Core Load %    | `Core Load` (%), `VRAM` (%), `Power` (Watts), `Temp` (°C / °F) |
| **UPS / Battery**     | `com.smok3y97.tilemetrics.beszel.ups`     | Battery %      | `Battery %`, `Status` (Online/Battery mode, runtime remaining) |

---

## Interactive Controls

Every telemetry key supports dual interaction modes:

1. **Short Press (< 450 ms)**:
    - Cycles to the next available sub-metric for that action.
    - Saves the selected sub-metric to key settings automatically.
    - Updates the key display immediately.

2. **Long Press (≥ 450 ms)**:
    - Launches the Beszel web interface directly in your default web browser.
    - Links straight to the system view (`/#/system/<hostId>`) for the configured host.

---

## Installation

### From Release Package (`.streamDeckPlugin`)

1. Download the latest `com.smok3y97.tilemetrics.beszel.streamDeckPlugin` from [Releases](https://github.com/Smok3y97/TileMetrics/releases).
2. Double-click the downloaded file to install it into Elgato Stream Deck.
3. The **TileMetrics** category will appear in the Stream Deck actions list.

### Manual / Developer Installation

1. Clone the repository into your preferred directory:
    ```bash
    git clone https://github.com/Smok3y97/TileMetrics.git
    cd TileMetrics
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Build the plugin bundle:
    ```bash
    npm run build
    ```
4. Package and deploy to your local Stream Deck plugins directory:
    ```bash
    npm run package
    ```

---

## Configuration

### 1. Global Settings (Server Management)

In the Property Inspector of any TileMetrics key:

1. Under **Global Settings**, configure your Beszel servers:
    - **Server URL**: Base URL of your Beszel instance (e.g., `https://beszel.example.com` or `http://192.168.1.50:8090`).
    - **Authentication**: Enter your username and password, or provide a pre-generated authentication token.
    - **Self-Signed Certificates**: Enable `Allow Self-Signed Certificates` if using internal HTTPS with private root certificates.
2. Set the **Global Polling Interval** (default: 30 seconds, minimum: 5 seconds).
3. Set the **Temperature Unit** (`Celsius` or `Fahrenheit`).

### 2. Action Key Settings

For each key added to your Stream Deck:

1. Select the target **Server** from the configured servers list.
2. Select the **Host** to monitor from the dropdown (populated directly from your Beszel instance).
3. Optionally configure:
    - **Target Interface / Mountpoint**: Specific network interface (e.g. `eth0`) or filesystem mount (e.g. `/` or `/mnt/data`).
    - **Sparkline History**: Enable or disable the background trend sparkline, and set the history length (default: 20 points).
    - **Thresholds**: Adjust warning and critical threshold percentages (defaults: 75% warning, 90% critical; inverted for UPS battery).

For more detailed setup options, see [`docs/configuration.md`](docs/configuration.md).

---

## Development & Build

### Requirements

- Node.js 20 or newer
- npm 10 or newer
- Elgato Stream Deck software 6.5 or newer
- PowerShell (for Windows packaging script)

### Build Commands

```bash
# Compile TypeScript to bin/plugin.js via Rollup
npm run build

# Continuously compile on file changes
npm run watch

# Run TypeScript typechecks and ESLint
npm run lint

# Automatically fix linting and formatting issues
npm run lint:fix

# Package into release/com.smok3y97.tilemetrics.beszel.streamDeckPlugin and deploy locally
npm run package

# Validate staged plugin against official Elgato SDK schema
npm run validate

# Restart plugin process inside Stream Deck
npm run restart
```

---

## Architecture Summary

```
Stream Deck Hardware <──> Stream Deck SDK <──> MetricsCacheService <──> BeszelApiService <──> Beszel Hub
                                                        │
                                                        ▼
                                                   SvgRenderer (144x144 Base64)
```

- **`BeszelApiService`**: Handles HTTP/HTTPS communication with PocketBase, authentication token caching, and automated 401 retry handling.
- **`MetricsCacheService`**: Central singleton coordinating scheduled polling loops, host history ring-buffers, and reference-counted lifecycle tracking.
- **`SvgRenderer`**: Pure mathematical rendering of SVG text, metric values, and sparkline polyline geometry into Base64 strings.
- **`BaseMetricAction`**: Abstract Stream Deck action encapsulating lifecycle hooks, key press duration calculations, and rendering coordination.

For complete architectural details, class diagrams, and sequence flows, refer to [`docs/architecture.md`](docs/architecture.md).

---

## Privacy & Security

TileMetrics communicates **strictly and exclusively** with the Beszel server URLs configured in your settings. It contains no external analytics, telemetry collection, or remote tracking. Credentials and tokens are stored locally by the Stream Deck application in its settings store.

For complete information, see [`PRIVACY.md`](PRIVACY.md).

---

## License

This project is licensed under the [MIT License](LICENSE).
Beszel is developed by Henry Gressmann and contributors. TileMetrics is an independent community plugin not officially affiliated with Beszel.
