import type { BeszelStatsData } from "../types/beszel.types.js";

/**
 * Normalized UPS/Battery metrics extracted from Beszel telemetry.
 */
export interface UpsMetrics {
	hasBattery: boolean;
	chargePct: number;
	stateStr: string;
	runtimeMinutes?: number;
}

/**
 * Extracts and normalizes UPS/Battery metrics from Beszel stats.
 * Single Point of Truth (SSOT) supporting tuple format (`stats.bat`),
 * map format (`stats.bats`), and legacy object (`stats.ups`).
 */
export function extractUpsMetrics(stats: BeszelStatsData): UpsMetrics {
	if (stats.bat && stats.bat.length > 0) {
		const chargePct = Math.round(stats.bat[0] ?? 100);
		const rawState = stats.bat[1];
		const stateStr = typeof rawState === "string" ? rawState : rawState === 1 ? "Charging" : "Discharging";
		return {
			hasBattery: true,
			chargePct,
			stateStr,
			runtimeMinutes: stats.ups?.runtime,
		};
	}

	if (stats.bats && Object.keys(stats.bats).length > 0) {
		const chargePct = Math.round(Object.values(stats.bats)[0] ?? 100);
		return {
			hasBattery: true,
			chargePct,
			stateStr: "OL",
			runtimeMinutes: stats.ups?.runtime,
		};
	}

	if (stats.ups) {
		const chargePct = Math.round(stats.ups.pct ?? 100);
		const stateStr = stats.ups.status ?? "OL";
		return {
			hasBattery: true,
			chargePct,
			stateStr,
			runtimeMinutes: stats.ups.runtime,
		};
	}

	return {
		hasBattery: false,
		chargePct: 100,
		stateStr: "OL",
		runtimeMinutes: undefined,
	};
}
