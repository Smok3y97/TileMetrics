<a id="top"></a>

# Feature Matrix & Action Reference (`docs/features.md`)

This document provides a technical overview of all available Stream Deck actions, telemetry metrics, visual indicator states, and interactive gestures provided by **TileMetrics (Beszel)**.

---

## 📑 Table of Contents

- [📊 Telemetry Actions Summary](#-telemetry-actions-summary)
- [🎛️ Detailed Action Reference](#-detailed-action-reference)
    - [CPU Telemetry](#cpu-telemetry)
    - [Memory Telemetry](#memory-telemetry)
    - [Storage Telemetry](#storage-telemetry)
    - [Network Telemetry](#network-telemetry)
    - [GPU Telemetry](#gpu-telemetry)
    - [UPS / Battery Telemetry](#ups--battery-telemetry)
- [📈 Dynamic Sparkline History](#-dynamic-sparkline-history)
- [🎨 Threshold States & Visual Indications](#-threshold-states--visual-indications)
- [👆 Hardware Gestures & Interactions](#-hardware-gestures--interactions)

---

## [📊 Telemetry Actions Summary](#top)

| Action Name           | UUID                                      | Default Metric | Available Sub-Metrics                        | Target Units        |
| :-------------------- | :---------------------------------------- | :------------- | :------------------------------------------- | :------------------ |
| **CPU Telemetry**     | `com.smok3y97.tilemetrics.beszel.cpu`     | Usage          | `Usage`, `Load Avg`, `Temp`                  | %, 1m load, °C / °F |
| **Memory Telemetry**  | `com.smok3y97.tilemetrics.beszel.memory`  | RAM %          | `RAM %`, `RAM GB`, `Swap %`, `ZFS ARC`       | %, GB, %            |
| **Storage Telemetry** | `com.smok3y97.tilemetrics.beszel.storage` | Capacity       | `Capacity`, `Read I/O`, `Write I/O`          | %, B/s to GB/s      |
| **Network Telemetry** | `com.smok3y97.tilemetrics.beszel.network` | Throughput     | `Throughput`, `Download (RX)`, `Upload (TX)` | bps to Gbps         |
| **GPU Telemetry**     | `com.smok3y97.tilemetrics.beszel.gpu`     | Core Load      | `Core Load`, `VRAM`, `Power`, `Temp`         | %, %, W, °C / °F    |
| **UPS / Battery**     | `com.smok3y97.tilemetrics.beszel.ups`     | Battery %      | `Battery %`, `Status`                        | %, Status / minutes |

---

## [🎛️ Detailed Action Reference](#top)

### CPU Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.cpu`
- **Sub-Metrics**:
    - `Usage`: Total CPU utilization percentage across all cores (0–100%).
    - `Load Avg`: 1-minute system load average formatted to two decimal places (e.g. `0.45`, `2.10`).
    - `Temp`: CPU package temperature formatted according to the global temperature unit setting (°C or °F).
- **Threshold Evaluation**: Computed based on total CPU percentage or package temperature against configured warning and critical thresholds.

### Memory Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.memory`
- **Sub-Metrics**:
    - `RAM %`: Main physical memory utilization percentage (0–100%).
    - `RAM GB`: Consumed physical memory formatted in Gigabytes (e.g. `14.2G`).
    - `Swap %`: Swap space utilization percentage.
    - `ZFS ARC`: ZFS Adaptive Replacement Cache usage percentage.
- **Threshold Evaluation**: Evaluated against RAM utilization percentage or Swap usage.

### Storage Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.storage`
- **Sub-Metrics**:
    - `Capacity`: Used capacity percentage of the target filesystem mountpoint.
    - `Read I/O`: Read throughput formatted dynamically (B/s, KB/s, MB/s, GB/s).
    - `Write I/O`: Write throughput formatted dynamically (B/s, KB/s, MB/s, GB/s).
- **Mountpoint Selection**: Targets a specific filesystem path (e.g., `/` or `/mnt/data`) or defaults to root.

### Network Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.network`
- **Sub-Metrics**:
    - `Throughput`: Combined bandwidth (RX + TX) in bps, Kbps, Mbps, or Gbps.
    - `Download (RX)`: Inbound transfer rate.
    - `Upload (TX)`: Outbound transfer rate.
- **Interface Selection**: Targets a specific interface (e.g., `eth0`, `enp4s0`) or automatically selects the active interface with traffic.

### GPU Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.gpu`
- **Sub-Metrics**:
    - `Core Load`: Primary GPU core utilization percentage (0–100%).
    - `VRAM`: Dedicated video memory utilization percentage.
    - `Power`: Power draw in Watts (W).
    - `Temp`: Core temperature formatted in °C or °F.
- **Display Label**: Header automatically truncates vendor prefixes (NVIDIA, GeForce, AMD, Radeon) for compact display on key faces.

### UPS / Battery Telemetry

- **UUID**: `com.smok3y97.tilemetrics.beszel.ups`
- **Sub-Metrics**:
    - `Battery %`: Battery state-of-charge percentage (0–100%).
    - `Status`: Operational state (`OL` for Online/Mains, `OB` for On Battery) and estimated battery runtime remaining in minutes.
- **Inverted Thresholds**: Normal state above warning threshold; warning state when charge drops below `warnThreshold` (default: 40%); critical state when charge drops below `critThreshold` (default: 20%).

---

## [📈 Dynamic Sparkline History](#top)

Each key can render a chronological trend line behind its primary value readout:

- Built as an SVG polyline and shaded polygon gradient.
- History length is configurable (default: 20 data points; maximum ring-buffer: 60 data points).
- Pre-filled on initial key display by querying historical records from the Beszel hub.
- Normalized dynamically between minimum and maximum bounds for the selected metric.

---

## [🎨 Threshold States & Visual Indications](#top)

Key status is indicated by the accent color applied to the sparkline, footer status dot, and value styling:

| State        | Color   | Hex Code  | Condition   |
| :----------- | :------ | :-------- | :---------- |
| **Normal**   | Emerald | `#10b981` | `< Warn`    |
| **Warning**  | Amber   | `#f59e0b` | `>= Warn`   |
| **Critical** | Red     | `#ef4444` | `>= Crit`   |
| **Offline**  | Slate   | `#64748b` | Unreachable |

---

## [👆 Hardware Gestures & Interactions](#top)

| Gesture         | Threshold  | Function                                                                                           |
| :-------------- | :--------- | :------------------------------------------------------------------------------------------------- |
| **Short Press** | `< 450 ms` | **Cycle Sub-Metric**: Cycles to the next sub-metric in sequence and immediately refreshes the key. |
| **Long Press**  | `≥ 450 ms` | **Open Web Dashboard**: Opens the host directly in your web browser (`/#/system/<hostId>`).        |
