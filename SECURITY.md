# Security Policy

## Supported Versions

Security fixes and maintenance updates are actively applied to the latest release of TileMetrics (Beszel).

| Version | Supported |
| :--- | :--- |
| Latest Release (v0.1.x+) | :white_check_mark: |

---

## 🛡️ Security Architecture & Privacy Guarantee

TileMetrics is designed with a strict **local-first, read-only, and privacy-conscious** architecture:

- **Strict Read-Only Integration**: The plugin interacts only with Beszel's PocketBase read endpoints (`/api/collections/systems/records` and `/api/collections/system_stats/records`). It never issues state-altering HTTP commands (POST/PUT/DELETE) to mutate servers, metrics, or host records.
- **Zero External Telemetry**: No user telemetry, usage data, hardware profiles, server IP addresses, or PocketBase tokens are collected, analyzed, or forwarded to external third parties or remote analytics servers.
- **Direct Point-to-Point Communication**: Network requests travel exclusively and directly from your local Stream Deck plugin process to your configured Beszel hub instance(s).
- **In-Memory Rendering**: Real-time SVGs and historical sparklines are calculated dynamically in memory (RAM) and passed to the Stream Deck hardware as Data URIs, leaving zero temporary image files on disk.
- **Credential Storage**: PocketBase credentials (passwords/tokens) are securely saved in Elgato's local settings store on your machine and only used to authenticate against your specified Beszel hub.

---

## 🚨 Reporting a Vulnerability

Security and privacy are taken very seriously in this project. If you discover a security vulnerability or unauthorized data exposure:

1. **Do NOT open a public GitHub issue.**
2. Please report the issue privately using **[GitHub Private Vulnerability Reporting](https://github.com/Smok3y97/TileMetrics/security/advisories/new)** (Security tab ➔ Report a vulnerability).
3. Provide a clear explanation of the issue, including:
   - Steps to reproduce or proof-of-concept description.
   - Affected components (e.g. API client, authentication flow, settings handler).
   - Impact assessment.

### What to Expect:
- **Review**: Reports will be reviewed on a best-effort basis as time permits.
- **Resolution**: Valid issues will be investigated and addressed in an upcoming release.
- **Attribution**: Once resolved, credit and appreciation will be given in the release notes (unless requested otherwise).
