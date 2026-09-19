# Privacy Policy (`PRIVACY.md`)

**Last updated:** September 19, 2026

This Privacy Policy applies to the **TileMetrics (Beszel)** Elgato Stream Deck plugin (`com.smok3y97.tilemetrics.beszel`).

---

## 🔒 1. Core Principles & Philosophy

TileMetrics is designed with strict privacy and security standards:

- **Zero External Telemetry**: The plugin does not collect, log, track, sell, or transmit any user information, telemetry, diagnostics, or analytics to the author, Elgato, or any external third-party server.
- **Strict Read-Only Communication**: The plugin connects exclusively to user-configured [Beszel](https://beszel.dev) hub instances over HTTP or HTTPS to read system metrics. No data is ever mutated, deleted, or posted to the monitoring instance other than standard authentication requests.
- **Zero-Disk In-Memory Policy**: Historical metrics and rendered 144×144 SVG key images remain strictly transient in memory (RAM). No metric caches, temporary files, or SQLite databases are written to the local disk.
- **Credential Protection**: Server credentials (usernames, passwords, and JWT tokens) are stored locally in Elgato Stream Deck's secure plugin settings storage and are never exposed or shared.

---

## 🛡️ 2. Information Handled

### A. Infrastructure Metrics

When configured, the plugin queries your designated Beszel monitoring hub for:

- System utilization statistics (CPU load, memory, swap, ZFS ARC)
- Storage statistics (mountpoint usage, read/write I/O throughput)
- Network bandwidth metrics (RX/TX bytes per second)
- GPU utilization, VRAM usage, and temperatures
- UPS / Battery capacity and charging states

This telemetry is retrieved solely to generate in-memory key displays and trend sparklines on your local Stream Deck device.

### B. Network Traffic

- All HTTP requests are initiated directly from the plugin process running locally on your computer to the Beszel hub URLs that you explicitly specify in settings.
- If you use self-signed TLS certificates on your local network, the optional "Allow untrusted certificates" toggle controls whether certificate validation is relaxed for that specific server connection.

---

## 📞 3. Questions & Contact

If you have questions or concerns regarding privacy or security in TileMetrics, please submit an issue on the official GitHub repository:
https://github.com/Smok3y97/TileMetrics/issues
