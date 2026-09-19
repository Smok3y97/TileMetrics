import type { BeszelStatsData } from "../types/beszel.types.js";

/**
 * Universal temperature extractor and formatting utilities for TileMetrics.
 * Single Point of Truth (DRY) for all thermal sensor parsing across platforms.
 *
 * Supports multi-architecture sensor keys:
 * - Raspberry Pi / ARM / SBCs: `cpu_thermal`, `soc_thermal`, `cpu-thermal`
 * - Intel: `coretemp` (e.g. `coretemp-package-id-0`, `coretemp-isa-...`)
 * - AMD: `k10temp` (e.g. `k10temp-tctl`, `k10temp-tdie`)
 * - ACPI / VMs: `acpitz`, `cpu`
 * - Windows / LHM: `cpu_package`, `cpu_core`
 * - Dedicated GPU thermal sensors: `stats.g`, `stats.gpu`
 *
 * Filters out non-CPU sensors (NVMe, HDD/SSD drivetemp, Wi-Fi, battery).
 */

const NON_CPU_SENSOR_PATTERNS = [
	/nvme/i,
	/drivetemp/i,
	/disk/i,
	/hdd/i,
	/sdd/i,
	/wifi/i,
	/wireless/i,
	/wlan/i,
	/battery/i,
	/bat/i,
	/gpu/i,
	/fan/i,
];

const PREFERRED_CPU_SENSOR_PATTERNS = [
	/^cpu[_-]?thermal$/i,
	/^soc[_-]?thermal$/i,
	/coretemp.*package/i,
	/coretemp/i,
	/k10temp.*tctl/i,
	/k10temp.*tdie/i,
	/k10temp/i,
	/cpu[_-]?package/i,
	/cpu[_-]?core/i,
	/cpu/i,
	/acpitz/i,
];

/**
 * Extracts the most representative CPU temperature in Celsius from Beszel stats.
 * Returns `undefined` if no temperature sensor is available.
 */
export function extractCpuTemperature(stats: BeszelStatsData): number | undefined {
	// 1. Direct explicit cpu_temp (if present and valid > 0)
	if (typeof stats.cpu_temp === "number" && Number.isFinite(stats.cpu_temp) && stats.cpu_temp > 0) {
		return stats.cpu_temp;
	}

	const tempMap = stats.t;
	if (!tempMap || typeof tempMap !== "object") {
		return undefined;
	}

	const entries = Object.entries(tempMap).filter(
		([_, val]) => typeof val === "number" && Number.isFinite(val) && val > 0,
	);

	if (entries.length === 0) {
		return undefined;
	}

	// Filter out obvious non-CPU sensors
	const eligibleEntries = entries.filter(([name]) => !NON_CPU_SENSOR_PATTERNS.some((p) => p.test(name)));

	const pool = eligibleEntries.length > 0 ? eligibleEntries : entries;

	// 2. Try preferred patterns in order of specificity
	for (const pattern of PREFERRED_CPU_SENSOR_PATTERNS) {
		const matches = pool.filter(([name]) => pattern.test(name));
		if (matches.length > 0) {
			// If multiple cores/sensors match, take the highest temperature
			return Math.max(...matches.map(([_, v]) => v));
		}
	}

	// 3. Fallback: Take maximum of any eligible sensors
	return Math.max(...pool.map(([_, v]) => v));
}

/**
 * Extracts the GPU temperature in Celsius from Beszel stats.
 * Returns `undefined` if no GPU thermal sensor or temperature reading is available.
 */
export function extractGpuTemperature(stats: BeszelStatsData): number | undefined {
	if (stats.g && Object.keys(stats.g).length > 0) {
		const firstKey = Object.keys(stats.g)[0];
		const gpu = stats.g[firstKey];
		if (typeof gpu.temp === "number" && Number.isFinite(gpu.temp) && gpu.temp > 0) {
			return gpu.temp;
		}
	}

	if (stats.gpu && stats.gpu.length > 0) {
		const temp = stats.gpu[0]?.temp;
		if (typeof temp === "number" && Number.isFinite(temp) && temp > 0) {
			return temp;
		}
	}

	return undefined;
}

/**
 * Converts a temperature in Celsius to Fahrenheit.
 */
export function celsiusToFahrenheit(tempCelsius: number): number {
	return (tempCelsius * 9) / 5 + 32;
}

/**
 * Converts a temperature in Fahrenheit to Celsius.
 */
export function fahrenheitToCelsius(tempFahrenheit: number): number {
	return ((tempFahrenheit - 32) * 5) / 9;
}

/**
 * Formats temperature according to user preference (Celsius or Fahrenheit).
 */
export function formatTemperature(tempCelsius: number, unit: "C" | "F" = "C"): string {
	if (unit === "F") {
		return `${Math.round(celsiusToFahrenheit(tempCelsius))}°F`;
	}
	return `${Math.round(tempCelsius)}°C`;
}

