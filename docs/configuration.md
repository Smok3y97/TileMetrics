<a id="top"></a>

# Configuration & Setup Guide (`docs/configuration.md`)

This guide covers all setup options, authentication methods, network configurations, and threshold settings available in TileMetrics for Beszel.

---

## 📑 Table of Contents

- [🌐 1. Global Plugin Configuration](#-1-global-plugin-configuration)
    - [Server Setup](#server-setup)
    - [Authentication Options](#authentication-options)
    - [SSL & Self-Signed Certificates](#ssl--self-signed-certificates)
    - [Polling Interval Tuning](#polling-interval-tuning)
    - [Temperature Display Unit](#temperature-display-unit)
- [🔘 2. Action Key Configuration](#-2-action-key-configuration)
    - [Server & Host Selection](#server--host-selection)
    - [Sub-Metric Selection](#sub-metric-selection)
    - [Interface and Mountpoint Filtering](#interface-and-mountpoint-filtering)
    - [Sparkline Ring-Buffer Settings](#sparkline-ring-buffer-settings)
    - [Threshold Configuration](#threshold-configuration)
- [💡 3. Interactive Key Actions](#-3-interactive-key-actions)
- [🔍 4. Troubleshooting & Diagnostics](#-4-troubleshooting--diagnostics)

---

## [🌐 1. Global Plugin Configuration](#top)

Global settings apply across all TileMetrics keys on your Stream Deck. They are configured via the Property Inspector of any TileMetrics action.

### Server Setup

TileMetrics supports multi-server configurations. You can monitor hosts managed across multiple distinct Beszel hub instances:

1. Click any TileMetrics action key on your Stream Deck canvas to open the Property Inspector.
2. In the **Global Settings** section, locate the **Beszel Servers** table.
3. Click **Add Server** and provide:
    - **Server Name**: A recognizable label (e.g., `Home Lab`, `Production Cloud`, `VPS`).
    - **Server URL**: The full HTTP or HTTPS endpoint where your Beszel hub is accessible (e.g., `https://beszel.internal.lan` or `http://192.168.1.100:8090`). Note: Do not append `/api` or trailing slashes.

### Authentication Options

Beszel relies on PocketBase for account management and security. TileMetrics supports two authentication models:

1. **Username & Password (Automatic Token Negotiation)**:
    - Enter the **Username / Email** and **Password** for a registered Beszel user, admin, or superuser account.
    - On initial connection, TileMetrics submits credentials to `/api/collections/users/auth-with-password` (falling back to `_superusers` or `admins`).
    - The returned JWT bearer token is stored in memory and included in the `Authorization` header of all subsequent telemetry requests.
    - If an expired token returns HTTP 401 Unauthorized, TileMetrics automatically re-authenticates and retries the request once.

2. **Pre-Generated Token**:
    - If you prefer not to store passwords inside Stream Deck settings, you can paste a pre-generated authentication token directly into the **Auth Token** field.
    - When present, the token is passed directly without password exchange.

### SSL & Self-Signed Certificates

For internal networks using private Certificate Authorities (CAs) or self-signed TLS certificates:

- Enable the **Allow Self-Signed Certificates (`rejectUnauthorized: false`)** checkbox for that server.
- TileMetrics initializes a Node.js `https.Agent` configured to bypass certificate chain validation for that endpoint, avoiding `DEPTH_ZERO_SELF_SIGNED_CERT` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` connection errors.

> [!NOTE]
> Self-signed certificate bypass should be restricted to trusted local networks or private VPN links.

### Polling Interval Tuning

- **Global Polling Interval**: Configured in seconds (default: `30` seconds; minimum: `5` seconds).
- **Resource Impact**:
    - Beszel agents typically write telemetry to the hub every 10 to 60 seconds depending on agent configuration.
    - Setting the polling interval below the agent update frequency generates redundant requests without providing fresher data.
    - Recommended interval: `30` seconds for balanced desktop monitoring; `15` seconds for active system diagnostics.

### Temperature Display Unit

- Choose between **Celsius (°C)** (default) and **Fahrenheit (°F)**.
- Affects CPU package temperature and GPU temperature readouts across all keys.

---

## [🔘 2. Action Key Configuration](#top)

Each key placed on the Stream Deck can be independently assigned to a specific server, host system, and metric view.

### Server & Host Selection

- **Server**: Select which configured Beszel instance provides telemetry for this key.
- **Host**: Choose the monitored target from the populated list of systems.
    - The dropdown automatically queries the Beszel API (`/api/collections/systems/records`) for available systems.
    - If a newly added system is not appearing, verify that the agent is reporting as `up` in the Beszel web dashboard.

### Sub-Metric Selection

Select the primary metric value rendered on the key. This metric can also be dynamically cycled during use via short-press:

| Action      | Supported Sub-Metrics | Description                                                                                      |
| :---------- | :-------------------- | :----------------------------------------------------------------------------------------------- |
| **CPU**     | `Usage`               | Overall CPU utilization percentage (0–100%).                                                     |
|             | `Load Avg`            | 1-minute system load average.                                                                    |
|             | `Temp`                | CPU package temperature in configured temperature unit.                                          |
| **Memory**  | `RAM %`               | Used memory percentage (0–100%).                                                                 |
|             | `RAM GB`              | Used memory in Gigabytes (GB).                                                                   |
|             | `Swap %`              | Swap memory utilization percentage.                                                              |
|             | `ZFS ARC`             | ZFS Adaptive Replacement Cache usage percentage.                                                 |
| **Storage** | `Capacity`            | Used capacity percentage of target filesystem.                                                   |
|             | `Read I/O`            | Read throughput in bytes/s (formatted as B/s, KB/s, MB/s, GB/s).                                 |
|             | `Write I/O`           | Write throughput in bytes/s (formatted as B/s, KB/s, MB/s, GB/s).                                |
| **Network** | `Throughput`          | Combined network throughput (RX + TX) in bps, Mbps, or Gbps.                                     |
|             | `Download (RX)`       | Inbound network throughput.                                                                      |
|             | `Upload (TX)`         | Outbound network throughput.                                                                     |
| **GPU**     | `Core Load`           | Primary GPU core utilization percentage (0–100%).                                                |
|             | `VRAM`                | Video RAM utilization percentage.                                                                |
|             | `Power`               | GPU power consumption in Watts (W).                                                              |
|             | `Temp`                | GPU temperature in configured unit.                                                              |
| **UPS**     | `Battery %`           | Battery charge percentage (0–100%).                                                              |
|             | `Status`              | Operational status (e.g., `OL` for Online, `OB` for On Battery) and estimated runtime remaining. |

### Interface and Mountpoint Filtering

For **Storage** and **Network** actions:

- **Interface or Mountpoint**: Enter the specific filesystem mount (e.g. `/`, `/mnt/storage`, `/opt`) or network interface (e.g. `eth0`, `enp3s0`, `tailscale0`).
- If left blank:
    - Storage defaults to root mount (`/`) or the first available filesystem.
    - Network defaults to the primary interface with non-zero traffic or the first available interface.

### Sparkline Ring-Buffer Settings

- **Enable Sparkline History**: Displays the trend line and shaded gradient behind the numerical text.
- **History Data Points**: Specifies the number of chronological data points rendered in the sparkline polyline (default: `20` points).

### Threshold Configuration

TileMetrics uses visual color states on the key:

- **Normal (Emerald `#10b981`)**: Nominal operating parameters.
- **Warning (Amber `#f59e0b`)**: Parameter approaching elevated utilization.
- **Critical (Red `#ef4444`)**: Utilization exceeding safe thresholds.

Default thresholds:

- Standard metrics (CPU, RAM, Disk, GPU): Warning at **75%**, Critical at **90%**.
- UPS Battery: **Inverted scale** — Normal above 40%, Warning at **≤ 40%**, Critical at **≤ 20%**.

---

## [💡 3. Interactive Key Actions](#top)

| Interaction                | Action             | Behavior                                                                                                                                    |
| :------------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Short Press (< 450 ms)** | Cycle Sub-Metric   | Cycles to the next available sub-metric in the action's defined cycle array. Automatically updates the key rendering and saves the setting. |
| **Long Press (≥ 450 ms)**  | Open Web Dashboard | Invokes the operating system's default browser to open the Beszel web UI directly at the specific system's page (`/#/system/<hostId>`).     |

---

## [🔍 4. Troubleshooting & Diagnostics](#top)

### Key Shows "OFFLINE" or "--"

1. Verify that the Beszel server is running and accessible from your workstation:
    - Try opening the configured URL in your web browser.
2. Verify credentials or authentication tokens.
3. If using an internal HTTPS URL with an untrusted certificate, ensure **Allow Self-Signed Certificates** is checked.
4. Verify that the agent on the target system is actively reporting to the Beszel hub.

### Logs

To inspect live Stream Deck plugin execution logs:

- Navigate to `%APPDATA%\Elgato\StreamDeck\logs\com.smok3y97.tilemetrics.beszel\` on Windows.
- Open the latest log file to check for HTTP response statuses, authentication errors, or network timeouts.
