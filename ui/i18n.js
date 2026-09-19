/**
 * TileMetrics i18n Localization Engine
 * Provides translation dictionaries and DOM-binding for Property Inspector views.
 */

const LOCALES = {
	en: {
		// Headings
		targetSystemHeading: "Target System",
		displayOptionsHeading: "Display Options",
		sparklineHeading: "Sparkline & History",
		alertThresholdsHeading: "Alert Thresholds",
		serverManagementHeading: "Beszel Server Configuration",
		generalSettingsHeading: "General Settings",
		beszelHubInstancesHeading: "Beszel Hub Instances",

		// Field Labels
		serverLabel: "Server",
		selectServerPlaceholder: "-- Select Server --",
		noServersNotice: "No Beszel servers configured yet. Click below to add a server.",
		hostLabel: "Host / System",
		selectHostPlaceholder: "-- Select Host --",
		subMetricLabel: "Sub-Metric",
		targetLabel: "Target",
		mountpointLabel: "Mountpoint",
		interfaceLabel: "Interface",
		sparklineLabel: "Sparkline",
		showTrendGraph: "Show trend graph",
		pointsLabel: "Points",
		points15: "15 data points",
		points20Default: "20 data points (Default)",
		points30: "30 data points",
		points60: "60 data points",
		warningLabel: "Warning (Amber)",
		criticalLabel: "Critical (Red)",
		pollIntervalLabel: "Poll Interval",
		tempUnitLabel: "Temperature",
		celsiusOption: "Celsius (°C)",
		fahrenheitOption: "Fahrenheit (°F)",

		// Buttons & Actions
		btnConfigureServers: "Configure Beszel Servers...",
		btnBackToAction: "← Back to Action Settings",
		btnAddServer: "+ Add Beszel Server",
		btnRemove: "Remove",
		btnOpenSeparateWindow: "Open in Separate Window ↗",
		saveNote: "Settings are saved automatically. No telemetry is collected or transmitted to external third parties.",
		savedIndicator: "✓ Saved automatically",

		// Server Card Fields
		serverHeaderPrefix: "Server #",
		nameLabel: "Name",
		namePlaceholder: "e.g. Home Server",
		urlLabel: "URL",
		urlPlaceholder: "http://192.168.1.50:8090",
		usernameLabel: "Username / Email",
		usernamePlaceholder: "admin@example.com",
		passwordLabel: "Password",
		passwordPlaceholder: "••••••••",
		tokenLabel: "Auth Token",
		tokenPlaceholder: "Optional direct JWT token",
		sslLabel: "Self-Signed SSL",
		allowUntrustedCerts: "Allow untrusted certificates",

		// Sub-metric names
		subMetric_Usage: "Usage (%)",
		subMetric_LoadAvg: "Load Average (1m)",
		subMetric_Temp: "Package Temp",
		subMetric_RAMPct: "RAM Usage (%)",
		subMetric_RAMGB: "RAM Used (GB)",
		subMetric_SwapPct: "Swap Usage (%)",
		subMetric_ZFSARC: "ZFS ARC Cache",
		subMetric_Capacity: "Capacity (%)",
		subMetric_ReadIO: "Read I/O",
		subMetric_WriteIO: "Write I/O",
		subMetric_Throughput: "Throughput (Total)",
		subMetric_DownloadRX: "Download (RX)",
		subMetric_UploadTX: "Upload (TX)",
		subMetric_CoreLoad: "Core Load (%)",
		subMetric_VRAM: "VRAM Used",
		subMetric_Power: "Power Draw (W)",
		subMetric_BatteryPct: "Battery Capacity (%)",
		subMetric_Status: "Power Supply Status",

		// Dynamic Placeholders
		storagePlaceholder: "e.g. / or /mnt/data (Auto)",
		networkPlaceholder: "e.g. eth0 or en0 (Auto)",
	},
	de: {
		// Headings
		targetSystemHeading: "Zielsystem",
		displayOptionsHeading: "Anzeigeoptionen",
		sparklineHeading: "Verlauf & Trendlinie",
		alertThresholdsHeading: "Warnschwellen",
		serverManagementHeading: "Beszel Server-Konfiguration",
		generalSettingsHeading: "Allgemeine Einstellungen",
		beszelHubInstancesHeading: "Beszel Hub Instanzen",

		// Field Labels
		serverLabel: "Server",
		selectServerPlaceholder: "-- Server auswählen --",
		noServersNotice: "Noch keine Beszel-Server konfiguriert. Klicken Sie unten, um einen Server hinzuzufügen.",
		hostLabel: "Host / System",
		selectHostPlaceholder: "-- Host auswählen --",
		subMetricLabel: "Sub-Metrik",
		targetLabel: "Ziel",
		mountpointLabel: "Einhängepunkt",
		interfaceLabel: "Netzwerkschnittstelle",
		sparklineLabel: "Trendlinie",
		showTrendGraph: "Trendlinie anzeigen",
		pointsLabel: "Datenpunkte",
		points15: "15 Datenpunkte",
		points20Default: "20 Datenpunkte (Standard)",
		points30: "30 Datenpunkte",
		points60: "60 Datenpunkte",
		warningLabel: "Warnung (Gelb)",
		criticalLabel: "Kritisch (Rot)",
		pollIntervalLabel: "Abfrageintervall",
		tempUnitLabel: "Temperatur",
		celsiusOption: "Celsius (°C)",
		fahrenheitOption: "Fahrenheit (°F)",

		// Buttons & Actions
		btnConfigureServers: "Beszel Server konfigurieren...",
		btnBackToAction: "← Zurück zu den Aktionen",
		btnAddServer: "+ Beszel-Server hinzufügen",
		btnRemove: "Entfernen",
		btnOpenSeparateWindow: "In separatem Fenster öffnen ↗",
		saveNote: "Einstellungen werden automatisch gespeichert. Keine Telemetriedaten werden an Dritte übertragen.",
		savedIndicator: "✓ Automatisch gespeichert",

		// Server Card Fields
		serverHeaderPrefix: "Server #",
		nameLabel: "Name",
		namePlaceholder: "z. B. Heimserver",
		urlLabel: "URL",
		urlPlaceholder: "http://192.168.1.50:8090",
		usernameLabel: "Benutzername / E-Mail",
		usernamePlaceholder: "admin@beispiel.de",
		passwordLabel: "Passwort",
		passwordPlaceholder: "••••••••",
		tokenLabel: "Auth-Token",
		tokenPlaceholder: "Optionales direktes JWT-Token",
		sslLabel: "Selbstsigniertes SSL",
		allowUntrustedCerts: "Nicht vertrauenswürdige Zertifikate erlauben",

		// Sub-metric names
		subMetric_Usage: "Auslastung (%)",
		subMetric_LoadAvg: "Lastdurchschnitt (1m)",
		subMetric_Temp: "Paket-Temperatur",
		subMetric_RAMPct: "RAM-Auslastung (%)",
		subMetric_RAMGB: "RAM belegt (GB)",
		subMetric_SwapPct: "Swap-Auslastung (%)",
		subMetric_ZFSARC: "ZFS ARC-Cache",
		subMetric_Capacity: "Speicherbelegung (%)",
		subMetric_ReadIO: "Lese-I/O",
		subMetric_WriteIO: "Schreib-I/O",
		subMetric_Throughput: "Gesamtdurchsatz",
		subMetric_DownloadRX: "Download (RX)",
		subMetric_UploadTX: "Upload (TX)",
		subMetric_CoreLoad: "Kern-Auslastung (%)",
		subMetric_VRAM: "VRAM belegt",
		subMetric_Power: "Leistungsaufnahme (W)",
		subMetric_BatteryPct: "Akkukapazität (%)",
		subMetric_Status: "Stromversorgungsstatus",

		// Dynamic Placeholders
		storagePlaceholder: "z. B. / oder /mnt/daten (Auto)",
		networkPlaceholder: "z. B. eth0 oder en0 (Auto)",
	},
};

class I18nManager {
	constructor() {
		this.currentLang = "en";
		this.detectInitialLanguage();
	}

	detectInitialLanguage() {
		const navLang = (navigator.language || "en").toLowerCase();
		if (navLang.startsWith("de")) {
			this.currentLang = "de";
		} else {
			this.currentLang = "en";
		}
	}

	setLanguage(lang) {
		if (lang && typeof lang === "string") {
			const cleanLang = lang.toLowerCase().slice(0, 2);
			if (LOCALES[cleanLang]) {
				this.currentLang = cleanLang;
			} else {
				this.currentLang = "en";
			}
		}
		this.apply();
	}

	getLanguage() {
		return this.currentLang;
	}

	t(key, fallback = "") {
		const dict = LOCALES[this.currentLang] || LOCALES.en;
		if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
			return dict[key];
		}
		const enDict = LOCALES.en;
		if (enDict && Object.prototype.hasOwnProperty.call(enDict, key)) {
			return enDict[key];
		}
		return fallback || key;
	}

	/**
	 * Translates submetric label for display.
	 */
	translateSubMetric(rawMetric) {
		const mapping = {
			"Usage": "subMetric_Usage",
			"Load Avg": "subMetric_LoadAvg",
			"Temp": "subMetric_Temp",
			"RAM %": "subMetric_RAMPct",
			"RAM GB": "subMetric_RAMGB",
			"Swap %": "subMetric_SwapPct",
			"ZFS ARC": "subMetric_ZFSARC",
			"Capacity": "subMetric_Capacity",
			"Read I/O": "subMetric_ReadIO",
			"Write I/O": "subMetric_WriteIO",
			"Throughput": "subMetric_Throughput",
			"Download (RX)": "subMetric_DownloadRX",
			"Upload (TX)": "subMetric_UploadTX",
			"Core Load": "subMetric_CoreLoad",
			"VRAM": "subMetric_VRAM",
			"Power": "subMetric_Power",
			"Battery %": "subMetric_BatteryPct",
			"Status": "subMetric_Status",
		};
		const key = mapping[rawMetric];
		return key ? this.t(key, rawMetric) : rawMetric;
	}

	/**
	 * Scans the container DOM and translates elements with data-i18n attributes.
	 */
	apply(container = document) {
		const i18nElements = container.querySelectorAll("[data-i18n]");
		i18nElements.forEach((el) => {
			const key = el.getAttribute("data-i18n");
			if (key) {
				el.textContent = this.t(key, el.textContent);
			}
		});

		const placeholderElements = container.querySelectorAll("[data-i18n-placeholder]");
		placeholderElements.forEach((el) => {
			const key = el.getAttribute("data-i18n-placeholder");
			if (key) {
				el.setAttribute("placeholder", this.t(key, el.getAttribute("placeholder") || ""));
			}
		});

		const titleElements = container.querySelectorAll("[data-i18n-title]");
		titleElements.forEach((el) => {
			const key = el.getAttribute("data-i18n-title");
			if (key) {
				el.setAttribute("title", this.t(key, el.getAttribute("title") || ""));
			}
		});
	}
}

window.i18n = new I18nManager();
