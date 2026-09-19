import type { BeszelStatsData } from "../types/beszel.types.js";
import { bytesToMegabytes } from "./unit-conversion.utils.js";

/**
 * Normalized storage filesystem metrics extracted from Beszel telemetry.
 */
export interface StorageMetrics {
	diskName: string;
	totalGb: number;
	usedGb: number;
	pct: number;
	readMb: number;
	writeMb: number;
}

/**
 * Extracts storage filesystem usage and throughput metrics.
 * Single Point of Truth (SSOT) supporting native root disk, extra filesystems (`stats.efs`),
 * and legacy disk arrays.
 */
export function extractStorageMetrics(stats: BeszelStatsData, targetMount?: string): StorageMetrics {
	const mount = targetMount?.trim();

	// 1. Extra filesystem match
	if (mount && stats.efs && stats.efs[mount]) {
		const efs = stats.efs[mount];
		const totalGb = efs.d ?? 0;
		const usedGb = efs.du ?? 0;
		const pct = Math.round(totalGb > 0 ? (usedGb / totalGb) * 100 : 0);
		return {
			diskName: mount,
			totalGb,
			usedGb,
			pct,
			readMb: 0,
			writeMb: 0,
		};
	}

	// 2. Legacy disk array match
	if (stats.disk && stats.disk.length > 0) {
		const legacy = (mount ? stats.disk.find((d) => d.disk === mount) : null) ?? stats.disk[0];
		if (legacy) {
			const totalGb = legacy.total;
			const usedGb = legacy.used;
			const pct = Math.round(legacy.pct ?? (totalGb > 0 ? (usedGb / totalGb) * 100 : 0));
			return {
				diskName: legacy.disk,
				totalGb,
				usedGb,
				pct,
				readMb: bytesToMegabytes(legacy.read ?? 0),
				writeMb: bytesToMegabytes(legacy.write ?? 0),
			};
		}
	}

	// 3. Native root disk default
	const totalGb = stats.d ?? 0;
	const usedGb = stats.du ?? 0;
	const pct = Math.round(stats.dp ?? (totalGb > 0 ? (usedGb / totalGb) * 100 : 0));
	return {
		diskName: "Root",
		totalGb,
		usedGb,
		pct,
		readMb: stats.dr ?? 0,
		writeMb: stats.dw ?? 0,
	};
}
