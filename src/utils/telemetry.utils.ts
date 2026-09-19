import type { ThresholdState } from "../rendering/svg.renderer.js";

/**
 * Single Point of Truth (DRY) for telemetry calculations, unit conversions,
 * threshold evaluations, and metric formatting across all actions.
 */

/**
 * Evaluates standard threshold states where higher values indicate warning/critical states.
 * (e.g. CPU, RAM, Disk, Temperature, GPU usage)
 */
export function evaluateThreshold(
	value: number,
	warnThreshold: number = 75,
	critThreshold: number = 90,
): ThresholdState {
	if (value >= critThreshold) {
		return "critical";
	}
	if (value >= warnThreshold) {
		return "warning";
	}
	return "normal";
}

/**
 * Evaluates inverted threshold states where lower values indicate warning/critical states.
 * (e.g. Battery capacity, UPS remaining charge)
 */
export function evaluateInvertedThreshold(
	value: number,
	warnThreshold: number = 40,
	critThreshold: number = 20,
): ThresholdState {
	if (value <= critThreshold) {
		return "critical";
	}
	if (value <= warnThreshold) {
		return "warning";
	}
	return "normal";
}

/**
 * Formats temperature according to user preference (Celsius or Fahrenheit).
 */
export function formatTemperature(tempCelsius: number, unit: "C" | "F" = "C"): string {
	if (unit === "F") {
		const tempFahrenheit = Math.round((tempCelsius * 9) / 5 + 32);
		return `${tempFahrenheit}°F`;
	}
	return `${Math.round(tempCelsius)}°C`;
}

/**
 * Formats data throughput in bytes per second with automatic unit scaling (B/s, KB/s, MB/s, GB/s).
 */
export function formatByteThroughput(bytesPerSec: number): string {
	if (bytesPerSec >= 1024 * 1024 * 1024) {
		return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)}GB/s`;
	}
	if (bytesPerSec >= 1024 * 1024) {
		return `${(bytesPerSec / (1024 * 1024)).toFixed(1)}MB/s`;
	}
	if (bytesPerSec >= 1024) {
		return `${(bytesPerSec / 1024).toFixed(0)}KB/s`;
	}
	return `${bytesPerSec.toFixed(0)}B/s`;
}

/**
 * Formats network bandwidth in bits per second (bps, Kbps, Mbps, Gbps).
 */
export function formatNetworkBandwidth(bytesPerSec: number): string {
	const bitsPerSec = bytesPerSec * 8;
	if (bitsPerSec >= 1e9) {
		return `${(bitsPerSec / 1e9).toFixed(1)}Gbps`;
	}
	if (bitsPerSec >= 1e6) {
		return `${(bitsPerSec / 1e6).toFixed(1)}Mbps`;
	}
	if (bitsPerSec >= 1e3) {
		return `${(bitsPerSec / 1e3).toFixed(0)}Kbps`;
	}
	return `${bitsPerSec.toFixed(0)}bps`;
}

/**
 * Formats memory or storage byte sizes into readable gigabyte values.
 */
export function formatGigabytes(bytesOrGb: number): string {
	// If value is greater than 1 MB, assume it's raw bytes and convert to GB
	const gb = bytesOrGb > 1024 * 1024 ? bytesOrGb / (1024 * 1024 * 1024) : bytesOrGb;
	return `${gb.toFixed(1)}G`;
}

/**
 * Safely computes maximum upper bound for dynamic sparklines.
 */
export function computeSparklineMax(history: number[], defaultMax: number = 100): number {
	if (history.length === 0) {
		return defaultMax;
	}
	const peak = Math.max(...history);
	return peak > defaultMax ? peak * 1.1 : defaultMax;
}
