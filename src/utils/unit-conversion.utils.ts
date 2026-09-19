/**
 * Pure mathematical unit conversion utilities for data sizes, bitrates, and throughput.
 * Single Point of Truth (SSOT) for all unit conversions in TileMetrics.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * Converts bytes to megabytes (MB).
 */
export function bytesToMegabytes(bytes: number): number {
	return bytes / BYTES_PER_MB;
}

/**
 * Converts megabytes (MB) to bytes.
 */
export function megabytesToBytes(megabytes: number): number {
	return megabytes * BYTES_PER_MB;
}

/**
 * Converts bytes to gigabytes (GB).
 */
export function bytesToGigabytes(bytes: number): number {
	return bytes / BYTES_PER_GB;
}

/**
 * Converts gigabytes (GB) to bytes.
 */
export function gigabytesToBytes(gigabytes: number): number {
	return gigabytes * BYTES_PER_GB;
}

/**
 * Converts bytes per second to bits per second.
 */
export function bytesToBits(bytes: number): number {
	return bytes * 8;
}

/**
 * Converts bits per second to bytes per second.
 */
export function bitsToBytes(bits: number): number {
	return bits / 8;
}
