import streamDeck from "@elgato/streamdeck";
import { EventEmitter } from "node:events";

import type { BeszelStatsRecord, BeszelSystem } from "../types/beszel.types.js";
import type { BeszelServerConfig, GlobalSettings } from "../types/settings.types.js";
import { BeszelApiService } from "./beszel-api.service.js";

interface ActiveKeyRegistration {
	actionInstanceId: string;
	serverId: string;
	hostId: string;
	enableHistory: boolean;
	historyPoints: number;
}

interface HostCacheEntry {
	latest: BeszelStatsRecord | null;
	history: BeszelStatsRecord[];
	lastUpdated: number;
}

/**
 * Central singleton for managing pooled polling loops, ring-buffers,
 * key lifecycle tracking, and zero-leak memory pruning.
 */
export class MetricsCacheService extends EventEmitter {
	private static instance: MetricsCacheService;

	private globalSettings: GlobalSettings = {
		servers: [],
		globalInterval: 30,
		tempUnit: "C",
	};

	private apiClients = new Map<string, BeszelApiService>();
	private activeKeys = new Map<string, ActiveKeyRegistration>();
	private hostCache = new Map<string, HostCacheEntry>(); // key: `${serverId}:${hostId}`
	private systemListCache = new Map<string, BeszelSystem[]>(); // key: serverId
	private serverIntervals = new Map<string, NodeJS.Timeout>();

	private constructor() {
		super();
	}

	public static getInstance(): MetricsCacheService {
		if (!MetricsCacheService.instance) {
			MetricsCacheService.instance = new MetricsCacheService();
		}
		return MetricsCacheService.instance;
	}

	/**
	 * Updates the global configuration and refreshes API client pools.
	 */
	public setGlobalSettings(settings: GlobalSettings): void {
		this.globalSettings = {
			...this.globalSettings,
			...settings,
		};

		// Recreate API clients for each configured server
		this.apiClients.clear();
		this.systemListCache.clear();
		for (const server of this.globalSettings.servers ?? []) {
			this.apiClients.set(server.id, new BeszelApiService(server));
		}

		// Restart active polling loops with updated interval
		this.restartAllPolling();
	}

	public getGlobalSettings(): GlobalSettings {
		return this.globalSettings;
	}

	/**
	 * Registers an action key when it appears on the Stream Deck.
	 */
	public async registerKey(
		actionInstanceId: string,
		serverId?: string,
		hostId?: string,
		enableHistory: boolean = true,
		historyPoints: number = 20,
	): Promise<void> {
		if (!serverId || !hostId) {
			return;
		}

		this.activeKeys.set(actionInstanceId, {
			actionInstanceId,
			serverId,
			hostId,
			enableHistory,
			historyPoints,
		});

		const cacheKey = `${serverId}:${hostId}`;

		// Initial prefetch if this host is not yet cached
		if (!this.hostCache.has(cacheKey)) {
			this.hostCache.set(cacheKey, {
				latest: null,
				history: [],
				lastUpdated: 0,
			});

			await this.prefetchHostHistory(serverId, hostId, historyPoints);
		}

		this.ensureServerPolling(serverId);

		// Emit immediately if cached data already exists
		const entry = this.hostCache.get(cacheKey);
		if (entry?.latest) {
			this.emit("metricsUpdated", serverId, hostId, entry.latest, entry.history);
		}
	}

	/**
	 * Unregisters an action key when it disappears from view.
	 */
	public unregisterKey(actionInstanceId: string): void {
		const key = this.activeKeys.get(actionInstanceId);
		if (!key) {
			return;
		}

		this.activeKeys.delete(actionInstanceId);

		// Check if any other visible key still needs this host
		const hostStillNeeded = Array.from(this.activeKeys.values()).some(
			(k) => k.serverId === key.serverId && k.hostId === key.hostId,
		);

		if (!hostStillNeeded) {
			const cacheKey = `${key.serverId}:${key.hostId}`;
			this.hostCache.delete(cacheKey);
			streamDeck.logger.debug(`Pruned host cache for ${cacheKey} (0 active keys).`);
		}

		// Check if any visible key still needs this server
		const serverStillNeeded = Array.from(this.activeKeys.values()).some((k) => k.serverId === key.serverId);

		if (!serverStillNeeded) {
			const timer = this.serverIntervals.get(key.serverId);
			if (timer) {
				clearInterval(timer);
				this.serverIntervals.delete(key.serverId);
				streamDeck.logger.debug(`Stopped polling loop for server ${key.serverId} (Standby).`);
			}
		}
	}

	/**
	 * Returns the latest stats for a given host from in-memory cache.
	 */
	public getLatestStats(serverId: string, hostId: string): BeszelStatsRecord | null {
		return this.hostCache.get(`${serverId}:${hostId}`)?.latest ?? null;
	}

	/**
	 * Returns the history array for sparkline rendering.
	 */
	public getHistory(serverId: string, hostId: string): BeszelStatsRecord[] {
		return this.hostCache.get(`${serverId}:${hostId}`)?.history ?? [];
	}

	/**
	 * Returns the cached or freshly fetched system list for Property Inspector dropdowns.
	 */
	public async getSystems(serverId: string): Promise<BeszelSystem[]> {
		let client = this.apiClients.get(serverId);
		if (!client) {
			try {
				const freshSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
				if (freshSettings?.servers) {
					this.setGlobalSettings(freshSettings);
					client = this.apiClients.get(serverId);
				}
			} catch (err) {
				streamDeck.logger.warn(`Could not refresh global settings: ${String(err)}`);
			}
		}

		if (!client) {
			const serverConfig = this.getServerConfig(serverId);
			if (serverConfig) {
				client = new BeszelApiService(serverConfig);
				this.apiClients.set(serverId, client);
			}
		}

		if (!client) {
			const msg = `No Beszel server configured with ID '${serverId}'. Please configure server credentials.`;
			streamDeck.logger.warn(msg);
			throw new Error(msg);
		}

		try {
			const systems = await client.getSystems();
			this.systemListCache.set(serverId, systems);
			return systems;
		} catch (err) {
			streamDeck.logger.error(`Error in getSystems for server ${serverId}: ${String(err)}`);
			throw err;
		}
	}

	/**
	 * Finds a configured server by its ID.
	 */
	public getServerConfig(serverId?: string): BeszelServerConfig | undefined {
		if (!serverId) {
			return this.globalSettings.servers?.[0];
		}
		return this.globalSettings.servers?.find((s) => s.id === serverId);
	}

	/**
	 * Initial prefetch of historical stats to render sparklines immediately on load.
	 */
	private async prefetchHostHistory(serverId: string, hostId: string, limit: number): Promise<void> {
		const client = this.apiClients.get(serverId);
		if (!client) {
			return;
		}

		try {
			const history = await client.getHistoricalStats(hostId, limit);
			const cacheKey = `${serverId}:${hostId}`;
			const entry = this.hostCache.get(cacheKey) ?? {
				latest: null,
				history: [],
				lastUpdated: 0,
			};

			entry.history = history;
			entry.latest = history.length > 0 ? history[history.length - 1] : await client.getLatestStats(hostId);
			entry.lastUpdated = Date.now();
			this.hostCache.set(cacheKey, entry);

			if (entry.latest) {
				this.emit("metricsUpdated", serverId, hostId, entry.latest, entry.history);
			}
		} catch (err) {
			streamDeck.logger.warn(`Prefetch failed for ${serverId}:${hostId}: ${String(err)}`);
		}
	}

	/**
	 * Ensures a polling timer is active for the target server instance.
	 */
	private ensureServerPolling(serverId: string): void {
		if (this.serverIntervals.has(serverId)) {
			return;
		}

		const intervalSeconds = Math.max(5, this.globalSettings.globalInterval ?? 30);
		const intervalMs = intervalSeconds * 1000;

		const timer = setInterval(() => {
			void this.pollServer(serverId);
		}, intervalMs);

		this.serverIntervals.set(serverId, timer);
		streamDeck.logger.debug(`Started polling loop for server ${serverId} every ${intervalSeconds}s.`);
	}

	/**
	 * Executes a single poll cycle for a server, querying only active hosts.
	 */
	private async pollServer(serverId: string): Promise<void> {
		const client = this.apiClients.get(serverId);
		if (!client) {
			return;
		}

		// Find all unique hostIds needed by active keys on this server
		const targetHostIds = new Set<string>();
		for (const key of this.activeKeys.values()) {
			if (key.serverId === serverId) {
				targetHostIds.add(key.hostId);
			}
		}

		if (targetHostIds.size === 0) {
			return;
		}

		for (const hostId of targetHostIds) {
			try {
				const latest = await client.getLatestStats(hostId);
				if (!latest) {
					continue;
				}

				const cacheKey = `${serverId}:${hostId}`;
				const entry = this.hostCache.get(cacheKey) ?? {
					latest: null,
					history: [],
					lastUpdated: 0,
				};

				entry.latest = latest;
				entry.lastUpdated = Date.now();

				// Append to ring-buffer
				entry.history.push(latest);
				const maxHistory = 60;
				if (entry.history.length > maxHistory) {
					entry.history.shift();
				}

				this.hostCache.set(cacheKey, entry);
				this.emit("metricsUpdated", serverId, hostId, latest, entry.history);
			} catch (err) {
				streamDeck.logger.error(`Error polling host ${hostId} on ${serverId}: ${String(err)}`);
			}
		}
	}

	private restartAllPolling(): void {
		for (const timer of this.serverIntervals.values()) {
			clearInterval(timer);
		}
		this.serverIntervals.clear();

		// Restart for servers that currently have active keys
		const activeServers = new Set<string>();
		for (const key of this.activeKeys.values()) {
			activeServers.add(key.serverId);
		}

		for (const serverId of activeServers) {
			this.ensureServerPolling(serverId);
		}
	}
}
