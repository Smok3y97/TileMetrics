import streamDeck from "@elgato/streamdeck";
import { Agent } from "undici";

import type {
	BeszelAuthResponse,
	BeszelStatsListResponse,
	BeszelStatsRecord,
	BeszelSystem,
	BeszelSystemListResponse,
} from "../types/beszel.types.js";
import type { BeszelServerConfig } from "../types/settings.types.js";

/**
 * REST client for communicating with Beszel PocketBase backend using native fetch.
 */
export class BeszelApiService {
	private readonly server: BeszelServerConfig;
	private readonly baseUrl: string;
	private readonly dispatcher?: Agent;
	private token: string | null = null;
	private lastAuthError: string | null = null;

	constructor(server: BeszelServerConfig) {
		this.server = server;
		this.baseUrl = server.url.replace(/\/+$/, "");

		if (server.rejectUnauthorized === false) {
			this.dispatcher = new Agent({
				connect: {
					rejectUnauthorized: false,
				},
			});
		}

		// If user provided a direct token
		if (server.token && server.token.trim().length > 0) {
			this.token = server.token.trim();
		}
	}

	/**
	 * Authenticates against PocketBase backend using username and password.
	 * Tries Beszel users endpoint, then PocketBase 0.23+ _superusers endpoint,
	 * then legacy PocketBase 0.22 admins endpoint.
	 */
	public async authenticate(): Promise<boolean> {
		if (this.token) {
			return true;
		}

		const username = this.server.username?.trim();
		const password = this.server.password;

		if (!username || !password) {
			if (this.server.token && this.server.token.trim().length > 0) {
				this.token = this.server.token.trim();
				return true;
			}
			this.lastAuthError = `Missing username or password for server ${this.server.url}`;
			streamDeck.logger.warn(this.lastAuthError);
			return false;
		}

		const authEndpoints = [
			{ name: "user", path: "/api/collections/users/auth-with-password" },
			{ name: "_superuser", path: "/api/collections/_superusers/auth-with-password" },
			{ name: "admin", path: "/api/admins/auth-with-password" },
		];

		for (const endpoint of authEndpoints) {
			try {
				streamDeck.logger.info(`Authenticating as ${endpoint.name} '${username}' at ${this.server.url}`);
				const res = await this.executeFetch(endpoint.path, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({
						identity: username,
						password,
					}),
				});

				if (res.ok) {
					const data = (await res.json()) as BeszelAuthResponse;
					if (data.token) {
						this.token = data.token;
						this.lastAuthError = null;
						streamDeck.logger.info(`Successfully authenticated as ${endpoint.name} with ${this.server.url}`);
						return true;
					}
				} else {
					const errText = await res.text().catch(() => "");
					this.lastAuthError = `HTTP ${res.status}: ${errText}`;
					streamDeck.logger.debug(`${endpoint.name} auth failed (${res.status}): ${errText}. Trying next endpoint...`);
				}
			} catch (err) {
				this.lastAuthError = err instanceof Error ? err.message : String(err);
				streamDeck.logger.debug(`${endpoint.name} auth error: ${String(err)}. Trying next endpoint...`);
			}
		}

		streamDeck.logger.error(`All authentication methods failed for ${this.server.url}: ${this.lastAuthError}`);
		return false;
	}

	/**
	 * Retrieves the list of monitored systems.
	 */
	public async getSystems(): Promise<BeszelSystem[]> {
		const params = new URLSearchParams({
			sort: "name",
			perPage: "500",
		});

		try {
			const data = await this.request<BeszelSystemListResponse>(
				`/api/collections/systems/records?${params.toString()}`,
			);
			const systems = data.items ?? [];
			streamDeck.logger.info(`Fetched systems from ${this.server.url}: found ${systems.length} system(s)`);
			return systems;
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch systems from ${this.server.url}: ${String(err)}`);
			throw err;
		}
	}

	/**
	 * Retrieves the raw stats list response for a system.
	 */
	public async getStatsResponse(systemId: string, limit: number = 1): Promise<BeszelStatsListResponse> {
		const params = new URLSearchParams({
			filter: `system='${systemId}'`,
			sort: "-created",
			page: "1",
			perPage: String(limit),
		});

		return this.request<BeszelStatsListResponse>(`/api/collections/system_stats/records?${params.toString()}`);
	}

	/**
	 * Retrieves the latest single stats record for a system.
	 */
	public async getLatestStats(systemId: string): Promise<BeszelStatsRecord | null> {
		try {
			const data = await this.getStatsResponse(systemId, 1);
			return data.items?.[0] ?? null;
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch latest stats for ${systemId}: ${String(err)}`);
			return null;
		}
	}

	/**
	 * Retrieves historical stats records for sparkline ring-buffer prefilling.
	 */
	public async getHistoricalStats(systemId: string, limit: number = 20): Promise<BeszelStatsRecord[]> {
		try {
			const data = await this.getStatsResponse(systemId, limit);
			const items = data.items ?? [];
			return items.reverse();
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch historical stats for ${systemId}: ${String(err)}`);
			return [];
		}
	}

	/**
	 * Ensures authentication token is present, attempting authentication if needed.
	 */
	private async ensureAuth(): Promise<void> {
		if (!this.token) {
			const ok = await this.authenticate();
			if (!ok) {
				throw new Error(
					this.lastAuthError || `Authentication failed for ${this.server.url}. Please verify credentials.`,
				);
			}
		}
	}

	/**
	 * Performs an HTTP request with PocketBase authorization and auto-reauth on HTTP 401.
	 */
	private async request<T>(path: string, init: RequestInit = {}, isRetry: boolean = false): Promise<T> {
		await this.ensureAuth();

		const headers: Record<string, string> = {
			Accept: "application/json",
			...(init.headers as Record<string, string> | undefined),
		};

		if (this.token) {
			// PocketBase expects 'Authorization': token (without 'Bearer ' prefix)
			headers["Authorization"] = this.token;
		}

		const res = await this.executeFetch(path, {
			...init,
			headers,
		});

		if (res.status === 401) {
			if (!isRetry) {
				streamDeck.logger.warn(`Received 401 from ${path} on ${this.server.url}. Re-authenticating and retrying...`);
				this.token = null;
				const ok = await this.authenticate();
				if (ok) {
					return this.request<T>(path, init, true);
				}
			}
			throw new Error(`HTTP 401 Unauthorized for ${path}`);
		}

		if (!res.ok) {
			const errorBody = await res.text().catch(() => "");
			throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}: ${errorBody}`);
		}

		return (await res.json()) as T;
	}

	/**
	 * Internal fetch wrapper that applies base URL and undici dispatcher.
	 */
	private async executeFetch(path: string, init: RequestInit): Promise<Response> {
		const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
		const options: Record<string, unknown> = {
			signal: init.signal ?? AbortSignal.timeout(10000),
			...init,
		};

		if (this.dispatcher) {
			options.dispatcher = this.dispatcher;
		}

		return fetch(url, options as unknown as RequestInit);
	}
}
