## 📝 Description

Please provide a clear and concise summary of the changes introduced in this pull request and the motivation behind them.

Fixes #(issue) <!-- Replace with issue number if applicable -->

---

## 🔍 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New telemetry feature / action (non-breaking addition)
- [ ] 🎨 Code style / Refactoring (formatting, rename, architectural cleanup)
- [ ] 📚 Documentation update
- [ ] ⚙️ CI/CD / Build tooling update

---

## 🏛️ Architectural Compliance Checklist

- [ ] **Strict Read-Only**: REST operations against Beszel are strictly read-only HTTP GET queries.
- [ ] **Zero-Disk Footprint**: Telemetry caches and SVG graphics remain transient in memory (Base64 Data URIs).
- [ ] **Reference-Counted Polling**: Telemetry is routed exclusively through `MetricsCacheService`.
- [ ] **Property Inspector Auto-Save**: All settings save automatically on input/change events with no manual save button.
- [ ] **i18n & Localization**: User-visible strings and keys are maintained in `en.json` and `de.json`.

---

## 🧪 Quality Assurance & Testing Checklist

- [ ] Run typechecking and linting: `npm run lint` (`0 errors, 0 warnings`)
- [ ] Run plugin build: `npm run build`
- [ ] Validate against official Elgato SDK Schema: `npm run validate`
- [ ] Tested on live Stream Deck hardware or staging profile
