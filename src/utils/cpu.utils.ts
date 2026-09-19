import type { BeszelStatsData } from "../types/beszel.types.js";
import { extractCpuTemperature } from "./temperature.utils.js";

/**
 * Normalized CPU metrics extracted from Beszel telemetry.
 */
export interface CpuMetrics {
	usagePct: number;
	load1m: number;
	tempC: number | undefined;
}

/**
 * Extracts and normalizes CPU metrics (Usage %, 1m Load, Temperature).
 * Single Point of Truth (SSOT).
 */
export function extractCpuMetrics(stats: BeszelStatsData): CpuMetrics {
	const usagePct = Math.round(stats.cpu ?? 0);
	const load1m = stats.la?.[0] ?? stats.loadavg?.[0] ?? 0;
	const tempC = extractCpuTemperature(stats);

	return {
		usagePct,
		load1m,
		tempC,
	};
}
