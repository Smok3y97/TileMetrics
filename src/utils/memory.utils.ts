import type { BeszelStatsData } from "../types/beszel.types.js";
import { BYTES_PER_MB, bytesToGigabytes } from "./unit-conversion.utils.js";

/**
 * Normalized memory metrics extracted from Beszel telemetry.
 */
export interface MemoryMetrics {
	ramPct: number;
	usedRamGb: number;
	swapPct: number;
	zfsArcGb: number;
}

/**
 * Extracts and normalizes system memory, swap, and ZFS ARC cache metrics.
 * Single Point of Truth (SSOT) supporting modern and legacy Beszel structures.
 */
export function extractMemoryMetrics(stats: BeszelStatsData): MemoryMetrics {
	// 1. Used RAM in GB
	const usedRamGb =
		stats.mu ??
		(stats.mem ? (stats.mem > BYTES_PER_MB ? bytesToGigabytes(stats.mem) : stats.mem) : 0);

	// 2. RAM Usage %
	const ramPct = Math.round(
		stats.mp ?? stats.mem_pct ?? (stats.m && stats.m > 0 ? ((stats.mu ?? 0) / stats.m) * 100 : 0),
	);

	// 3. Swap Usage %
	const swapPct = Math.round(
		stats.swap_pct ?? (stats.s && stats.s > 0 ? ((stats.su ?? 0) / stats.s) * 100 : 0),
	);

	// 4. ZFS ARC Cache in GB
	const zfsArcGb = stats.mz ?? stats.zfs_arc_pct ?? 0;

	return {
		ramPct,
		usedRamGb,
		swapPct,
		zfsArcGb,
	};
}
