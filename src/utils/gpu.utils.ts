import type { BeszelStatsData } from "../types/beszel.types.js";
import { extractGpuTemperature } from "./temperature.utils.js";

/**
 * Normalized GPU metrics extracted from Beszel telemetry.
 */
export interface GpuMetrics {
	hasGpu: boolean;
	name: string;
	usagePct: number;
	vramPct: number;
	powerW: number;
	tempC: number | undefined;
}

/**
 * Extracts and normalizes GPU telemetry metrics from Beszel stats.
 * Single Point of Truth (SSOT) supporting both modern dictionary format (`stats.g`)
 * and legacy array format (`stats.gpu`).
 */
export function extractGpuMetrics(stats: BeszelStatsData): GpuMetrics {
	const tempC = extractGpuTemperature(stats);

	if (stats.g && Object.keys(stats.g).length > 0) {
		const firstKey = Object.keys(stats.g)[0];
		const gpu = stats.g[firstKey];
		const usagePct = Math.round(gpu.u ?? 0);
		const vramPct = gpu.mt && gpu.mt > 0 ? Math.round(((gpu.mu ?? 0) / gpu.mt) * 100) : 0;
		const powerW = Math.round(gpu.p ?? 0);

		return {
			hasGpu: true,
			name: gpu.n || "GPU",
			usagePct,
			vramPct,
			powerW,
			tempC,
		};
	}

	if (stats.gpu && stats.gpu.length > 0) {
		const gpu = stats.gpu[0];
		const usagePct = Math.round(gpu.pct ?? 0);
		const vramPct = Math.round(gpu.mem_pct ?? 0);
		const powerW = Math.round(gpu.power ?? 0);

		return {
			hasGpu: true,
			name: gpu.name || "GPU",
			usagePct,
			vramPct,
			powerW,
			tempC,
		};
	}

	return {
		hasGpu: false,
		name: "GPU",
		usagePct: 0,
		vramPct: 0,
		powerW: 0,
		tempC: undefined,
	};
}
