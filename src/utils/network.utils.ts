import type { BeszelStatsData } from "../types/beszel.types.js";
import { bytesToMegabytes, megabytesToBytes } from "./unit-conversion.utils.js";

/**
 * Normalized network throughput metrics extracted from Beszel telemetry.
 */
export interface NetworkMetrics {
	ifaceName: string;
	rxBytesSec: number;
	txBytesSec: number;
	totalBytesSec: number;
	rxMbSec: number;
	txMbSec: number;
	totalMbSec: number;
}

/**
 * Extracts network throughput metrics for a specific interface or overall system bandwidth.
 * Single Point of Truth (SSOT) supporting interface map (`stats.ni`), legacy array (`stats.net`),
 * and system-wide aggregate bandwidth (`stats.nr`, `stats.ns`, `stats.b`).
 */
export function extractNetworkMetrics(stats: BeszelStatsData, targetIface?: string): NetworkMetrics {
	const iface = targetIface?.trim();

	// 1. Interface map lookup
	if (iface && stats.ni && stats.ni[iface]) {
		const ifc = stats.ni[iface];
		const txBytesSec = ifc[0] ?? 0;
		const rxBytesSec = ifc[1] ?? 0;
		const totalBytesSec = rxBytesSec + txBytesSec;
		return {
			ifaceName: iface,
			rxBytesSec,
			txBytesSec,
			totalBytesSec,
			rxMbSec: bytesToMegabytes(rxBytesSec),
			txMbSec: bytesToMegabytes(txBytesSec),
			totalMbSec: bytesToMegabytes(totalBytesSec),
		};
	}

	// 2. Legacy net array lookup
	if (stats.net && stats.net.length > 0) {
		const matched =
			(iface ? stats.net.find((i) => i.name === iface) : null) ??
			stats.net.find((i) => (i.rx ?? 0) + (i.tx ?? 0) > 0) ??
			stats.net[0];
		if (matched) {
			const rxBytesSec = matched.rx ?? 0;
			const txBytesSec = matched.tx ?? 0;
			const totalBytesSec = rxBytesSec + txBytesSec;
			return {
				ifaceName: matched.name,
				rxBytesSec,
				txBytesSec,
				totalBytesSec,
				rxMbSec: bytesToMegabytes(rxBytesSec),
				txMbSec: bytesToMegabytes(txBytesSec),
				totalMbSec: bytesToMegabytes(totalBytesSec),
			};
		}
	}

	// 3. System-wide network bandwidth (stats.nr / stats.ns in MB/s)
	let rxBytesSec = megabytesToBytes(stats.nr ?? 0);
	let txBytesSec = megabytesToBytes(stats.ns ?? 0);
	if (stats.b && rxBytesSec === 0 && txBytesSec === 0) {
		txBytesSec = stats.b[0] ?? 0;
		rxBytesSec = stats.b[1] ?? 0;
	}
	const totalBytesSec = rxBytesSec + txBytesSec;

	return {
		ifaceName: iface || "NET",
		rxBytesSec,
		txBytesSec,
		totalBytesSec,
		rxMbSec: bytesToMegabytes(rxBytesSec),
		txMbSec: bytesToMegabytes(txBytesSec),
		totalMbSec: bytesToMegabytes(totalBytesSec),
	};
}
