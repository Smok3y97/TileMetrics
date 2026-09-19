import streamDeck from "@elgato/streamdeck";
import { EventEmitter } from "node:events";

import type {
	BeszelDiskStat,
	BeszelExtraFsEntry,
	BeszelGpuEntry,
	BeszelGpuStat,
	BeszelNetStat,
	BeszelStatsData,
	BeszelStatsRecord,
	BeszelSystem,
	BeszelUpsStat,
	HostState,
} from "../types/beszel.types.js";
import type { BeszelServerConfig, GlobalSettings } from "../types/settings.types.js";
import { BeszelApiService } from "./beszel-api.service.js";

export type { HostState };

interface ActiveKeyRegistration {
	actionInstanceId: string;
	serverId: string;
	hostId: string;
	enableHistory: boolean;
	historyPoints: number;
}

export interface HostCacheEntry {
	latest: BeszelStatsRecord | null;
	history: BeszelStatsRecord[];
	lastUpdated: number;
	state: HostState;
	errorMessage?: string;
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
	 * Defensively parses and sanitizes a raw Beszel stats record or stats payload.
	 * Never throws a TypeError. Returns null if payload is fundamentally invalid.
	 */
	public static parseStatsRecord(rawRecord: unknown, fallbackHostId: string = ""): BeszelStatsRecord | null {
		if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
			return null;
		}

		const rec = rawRecord as Record<string, unknown>;
		let rawStats: unknown = rec.stats;

		// Handle string-encoded JSON stats from PocketBase
		if (typeof rawStats === "string") {
			try {
				rawStats = JSON.parse(rawStats);
			} catch {
				return null;
			}
		}

		if (!rawStats || typeof rawStats !== "object" || Array.isArray(rawStats)) {
			return null;
		}

		const s = rawStats as Record<string, unknown>;

		const num = (v: unknown, fallback: number = 0): number =>
			typeof v === "number" && Number.isFinite(v) ? v : fallback;

		const str = (v: unknown, fallback: string = "N/A"): string =>
			typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;

		const numArr = (v: unknown): number[] =>
			Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isFinite(x)) : [];

		// 1. CPU properties
		const cpu = num(s?.cpu, 0);
		const cpum = num(s?.cpum, 0);
		const cpub = numArr(s?.cpub);
		const cpus = numArr(s?.cpus);
		const cpu_temp = typeof s?.cpu_temp === "number" && Number.isFinite(s.cpu_temp) ? s.cpu_temp : undefined;

		const la: [number, number, number] =
			Array.isArray(s?.la) && s.la.length >= 3 ? [num(s.la[0]), num(s.la[1]), num(s.la[2])] : [0, 0, 0];

		const loadavg: [number, number, number] =
			Array.isArray(s?.loadavg) && s.loadavg.length >= 3
				? [num(s.loadavg[0]), num(s.loadavg[1]), num(s.loadavg[2])]
				: [0, 0, 0];

		const t: Record<string, number> =
			s?.t && typeof s.t === "object" && !Array.isArray(s.t)
				? Object.fromEntries(
					Object.entries(s.t as Record<string, unknown>)
						.filter(([_, v]) => typeof v === "number" && Number.isFinite(v))
						.map(([k, v]) => [k, v as number]),
				)
				: {};

		// 2. Memory properties
		const m = num(s?.m, 0);
		const mu = num(s?.mu, 0);
		const mp = num(s?.mp, 0);
		const mb = num(s?.mb, 0);
		const mz = num(s?.mz, 0);
		const s_swap = num(s?.s, 0);
		const su = num(s?.su, 0);
		const mem = num(s?.mem, 0);
		const mem_pct = num(s?.mem_pct, 0);
		const swap_pct = num(s?.swap_pct, 0);
		const zfs_arc_pct = num(s?.zfs_arc_pct, 0);

		// 3. Storage & Disk properties
		const d = num(s?.d, 0);
		const du = num(s?.du, 0);
		const dp = num(s?.dp, 0);
		const dr = num(s?.dr, 0);
		const dw = num(s?.dw, 0);

		const efs: Record<string, BeszelExtraFsEntry> =
			s?.efs && typeof s.efs === "object" && !Array.isArray(s.efs)
				? Object.fromEntries(
					Object.entries(s.efs as Record<string, unknown>).map(([mount, entry]) => {
						const e = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
						return [
							mount,
							{
								d: num(e.d, 0),
								du: num(e.du, 0),
								tr: num(e.tr, 0),
								tw: num(e.tw, 0),
							},
						];
					}),
				)
				: {};

		const parseDiskList = (arr: unknown): BeszelDiskStat[] =>
			Array.isArray(arr)
				? arr.map((item) => {
					const dItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
					return {
						disk: str(dItem.disk, "N/A"),
						total: num(dItem.total, 0),
						used: num(dItem.used, 0),
						pct: num(dItem.pct, 0),
						read: num(dItem.read, 0),
						write: num(dItem.write, 0),
					};
				})
				: [];

		const disk = parseDiskList(s?.disk);
		const disks = parseDiskList(s?.disks);

		// 4. Network properties
		const ns = num(s?.ns, 0);
		const nr = num(s?.nr, 0);

		const b: [number, number] = Array.isArray(s?.b) && s.b.length >= 2 ? [num(s.b[0]), num(s.b[1])] : [0, 0];

		const ni: Record<string, [number, number, number, number]> =
			s?.ni && typeof s.ni === "object" && !Array.isArray(s.ni)
				? Object.fromEntries(
					Object.entries(s.ni as Record<string, unknown>).map(([iface, val]) => {
						const arr = Array.isArray(val) ? val : [];
						return [iface, [num(arr[0]), num(arr[1]), num(arr[2]), num(arr[3])]];
					}),
				)
				: {};

		const parseNetList = (arr: unknown): BeszelNetStat[] =>
			Array.isArray(arr)
				? arr.map((item) => {
					const nItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
					return {
						name: str(nItem.name, "N/A"),
						rx: num(nItem.rx, 0),
						tx: num(nItem.tx, 0),
					};
				})
				: [];

		const net = parseNetList(s?.net);
		const interfaces = parseNetList(s?.interfaces);

		// 5. GPU properties
		const g: Record<string, BeszelGpuEntry> =
			s?.g && typeof s.g === "object" && !Array.isArray(s.g)
				? Object.fromEntries(
					Object.entries(s.g as Record<string, unknown>).map(([gpuId, val]) => {
						const gVal = val && typeof val === "object" ? (val as Record<string, unknown>) : {};
						return [
							gpuId,
							{
								n: str(gVal.n, "N/A"),
								u: num(gVal.u, 0),
								mu: num(gVal.mu, 0),
								mt: num(gVal.mt, 0),
								p: num(gVal.p, 0),
								temp: num(gVal.temp, 0),
							},
						];
					}),
				)
				: {};

		const parseGpuList = (arr: unknown): BeszelGpuStat[] =>
			Array.isArray(arr)
				? arr.map((item) => {
					const gItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
					return {
						name: str(gItem.name, "N/A"),
						pct: num(gItem.pct, 0),
						mem_pct: num(gItem.mem_pct, 0),
						mem_used: num(gItem.mem_used, 0),
						mem_total: num(gItem.mem_total, 0),
						temp: num(gItem.temp, 0),
						power: num(gItem.power, 0),
						fan: num(gItem.fan, 0),
					};
				})
				: [];

		const gpu = parseGpuList(s?.gpu);
		const gpus = parseGpuList(s?.gpus);

		// 6. Battery & UPS properties
		const bat: [number, number | string] =
			Array.isArray(s?.bat) && s.bat.length > 0
				? [
					num(s.bat[0], 0),
					typeof s.bat[1] === "string" && s.bat[1].trim().length > 0
						? s.bat[1].trim()
						: typeof s.bat[1] === "number" && Number.isFinite(s.bat[1])
							? s.bat[1]
							: "N/A",
				]
				: [0, "N/A"];

		const bats: Record<string, number> =
			s?.bats && typeof s.bats === "object" && !Array.isArray(s.bats)
				? Object.fromEntries(
					Object.entries(s.bats as Record<string, unknown>)
						.filter(([_, v]) => typeof v === "number" && Number.isFinite(v))
						.map(([k, v]) => [k, v as number]),
				)
				: {};

		const upsRaw =
			s?.ups && typeof s.ups === "object" && !Array.isArray(s.ups) ? (s.ups as Record<string, unknown>) : null;
		const ups: BeszelUpsStat = {
			pct: num(upsRaw?.pct, 0),
			status: str(upsRaw?.status, "N/A"),
			runtime: num(upsRaw?.runtime, 0),
			load: num(upsRaw?.load, 0),
		};

		const sanitizedStats: BeszelStatsData = {
			cpu,
			cpum,
			cpub,
			cpus,
			la,
			loadavg,
			t,
			cpu_temp,
			m,
			mu,
			mp,
			mb,
			mz,
			s: s_swap,
			su,
			mem,
			mem_pct,
			swap_pct,
			zfs_arc_pct,
			d,
			du,
			dp,
			dr,
			dw,
			efs,
			disk,
			disks,
			ns,
			nr,
			b,
			ni,
			net,
			interfaces,
			g,
			gpu,
			gpus,
			bat,
			bats,
			ups,
		};

		return {
			id: typeof rec?.id === "string" ? rec.id : "",
			system: typeof rec?.system === "string" ? rec.system : fallbackHostId,
			created: typeof rec?.created === "string" ? rec.created : new Date().toISOString(),
			...(typeof rec?.updated === "string" ? { updated: rec.updated } : {}),
			stats: sanitizedStats,
		};
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

		if ((!this.globalSettings.servers || this.globalSettings.servers.length === 0) || !this.apiClients.has(serverId)) {
			try {
				const freshSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
				if (freshSettings?.servers?.length) {
					this.setGlobalSettings(freshSettings);
				}
			} catch (err) {
				streamDeck.logger.warn(`Could not refresh global settings in registerKey: ${String(err)}`);
			}
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
				state: "OFFLINE",
			});

			await this.prefetchHostHistory(serverId, hostId, historyPoints);
		}

		this.ensureServerPolling(serverId);
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
	 * Returns the current host telemetry state ('ONLINE', 'OFFLINE', or 'ERROR').
	 */
	public getHostState(serverId: string, hostId: string): HostState {
		return this.hostCache.get(`${serverId}:${hostId}`)?.state ?? "OFFLINE";
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
	 * Updates the cached state for a host and emits appropriate events.
	 */
	private updateHostState(
		serverId: string,
		hostId: string,
		state: HostState,
		latest: BeszelStatsRecord | null = null,
		errorMessage?: string,
	): void {
		const cacheKey = `${serverId}:${hostId}`;
		const entry = this.hostCache.get(cacheKey) ?? {
			latest: null,
			history: [],
			lastUpdated: 0,
			state: "OFFLINE",
		};

		const previousState = entry.state;
		entry.state = state;
		entry.errorMessage = errorMessage;
		entry.lastUpdated = Date.now();

		if (state === "ONLINE" && latest) {
			entry.latest = latest;
			entry.history.push(latest);
			const maxHistory = 60;
			if (entry.history.length > maxHistory) {
				entry.history.shift();
			}
		} else if (state === "OFFLINE" || state === "ERROR") {
			entry.latest = null;
		}

		this.hostCache.set(cacheKey, entry);

		this.emit("metricsUpdated", serverId, hostId, entry.latest, entry.history);
		if (previousState !== state) {
			this.emit("hostStateChanged", serverId, hostId, state);
		}
	}

	/**
	 * Initial prefetch of historical stats to render sparklines immediately on load.
	 */
	private async prefetchHostHistory(serverId: string, hostId: string, limit: number): Promise<void> {
		let client = this.apiClients.get(serverId);
		if (!client) {
			const serverConfig = this.getServerConfig(serverId);
			if (serverConfig) {
				client = new BeszelApiService(serverConfig);
				this.apiClients.set(serverId, client);
			}
		}

		if (!client) {
			this.updateHostState(serverId, hostId, "ERROR", null, `No client configured for server ${serverId}`);
			return;
		}

		try {
			const res = await client.getStatsResponse(hostId, limit);
			const cacheKey = `${serverId}:${hostId}`;
			const entry = this.hostCache.get(cacheKey) ?? {
				latest: null,
				history: [],
				lastUpdated: 0,
				state: "OFFLINE",
			};

			if (!res || !Array.isArray(res.items)) {
				this.updateHostState(serverId, hostId, "ERROR", null, "Invalid API response payload");
				return;
			}

			if (res.items.length === 0) {
				this.updateHostState(serverId, hostId, "OFFLINE");
				return;
			}

			// Items come back newest-first (-created), reverse for chronological history
			const rawItems = [...res.items].reverse();
			const parsedItems: BeszelStatsRecord[] = [];

			for (const raw of rawItems) {
				const parsed = MetricsCacheService.parseStatsRecord(raw, hostId);
				if (parsed) {
					parsedItems.push(parsed);
				}
			}

			if (parsedItems.length === 0) {
				this.updateHostState(serverId, hostId, "ERROR", null, "Invalid stats payload in API response");
				return;
			}

			const previousState = entry.state;
			entry.history = parsedItems.slice(-60);
			entry.latest = parsedItems[parsedItems.length - 1];
			entry.state = "ONLINE";
			entry.lastUpdated = Date.now();
			this.hostCache.set(cacheKey, entry);

			this.emit("metricsUpdated", serverId, hostId, entry.latest, entry.history);
			if (previousState !== "ONLINE") {
				this.emit("hostStateChanged", serverId, hostId, "ONLINE");
			}
		} catch (err) {
			streamDeck.logger.warn(`Prefetch failed for ${serverId}:${hostId}: ${String(err)}`);
			this.updateHostState(serverId, hostId, "ERROR", null, String(err));
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
		let client = this.apiClients.get(serverId);
		if (!client) {
			const serverConfig = this.getServerConfig(serverId);
			if (serverConfig) {
				client = new BeszelApiService(serverConfig);
				this.apiClients.set(serverId, client);
			}
		}

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
				const res = await client.getStatsResponse(hostId, 1);

				if (!res || !Array.isArray(res.items)) {
					this.updateHostState(serverId, hostId, "ERROR", null, "Invalid API response structure");
					continue;
				}

				if (res.items.length === 0) {
					// Empty items array -> host is offline
					this.updateHostState(serverId, hostId, "OFFLINE");
					continue;
				}

				const rawRecord = res.items[0];
				const parsed = MetricsCacheService.parseStatsRecord(rawRecord, hostId);

				if (!parsed) {
					// Invalid payload -> mark host error
					this.updateHostState(serverId, hostId, "ERROR", null, "Invalid stats payload in API response");
					continue;
				}

				// Successfully ingested telemetry
				this.updateHostState(serverId, hostId, "ONLINE", parsed);
			} catch (err) {
				streamDeck.logger.error(`Error polling host ${hostId} on ${serverId}: ${String(err)}`);
				this.updateHostState(serverId, hostId, "ERROR", null, String(err));
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
