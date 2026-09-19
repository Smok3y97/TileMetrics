import streamDeck from "@elgato/streamdeck";
import PocketBase from "pocketbase";

import type {
	BeszelStatsRecord,
	BeszelSystem,
} from "../types/beszel.types.js";
import type { BeszelServerConfig } from "../types/settings.types.js";

/**
 * REST client for communicating with Beszel using the official PocketBase JavaScript SDK.
 */
export class BeszelApiService {
	private readonly server: BeszelServerConfig;
	private pb: PocketBase;
	private lastAuthError: string | null = null;

	constructor(server: BeszelServerConfig) {
		this.server = server;
		const baseUrl = server.url.replace(/\/+$/, "");

		if (baseUrl.startsWith("https://") && server.rejectUnauthorized === false) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		}

		this.pb = new PocketBase(baseUrl);
		this.pb.autoCancellation(false);

		// If user provided a direct token
		if (server.token && server.token.trim().length > 0) {
			this.pb.authStore.save(server.token.trim(), null);
		}
	}

	/**
	 * Authenticates against PocketBase backend using username and password.
	 */
	public async authenticate(): Promise<boolean> {
		if (this.pb.authStore.isValid) {
			return true;
		}

		if (this.server.token && this.server.token.trim().length > 0) {
			this.pb.authStore.save(this.server.token.trim(), null);
			return true;
		}

		const username = this.server.username?.trim();
		const password = this.server.password;

		if (!username || !password) {
			this.lastAuthError = `Missing username or password for server ${this.server.url}`;
			streamDeck.logger.warn(this.lastAuthError);
			return false;
		}

		if (this.server.rejectUnauthorized === false) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		}

		// 1. Try standard Beszel user authentication
		try {
			streamDeck.logger.info(`Authenticating as user '${username}' at ${this.server.url}`);
			await this.pb.collection("users").authWithPassword(username, password);
			if (this.pb.authStore.isValid) {
				streamDeck.logger.info(`Successfully authenticated as user with ${this.server.url}`);
				this.lastAuthError = null;
				return true;
			}
		} catch (userErr) {
			this.lastAuthError = userErr instanceof Error ? userErr.message : String(userErr);
			streamDeck.logger.debug(`User auth failed: ${String(userErr)}. Attempting superuser/admin auth...`);
		}

		// 2. Try PocketBase 0.23+ superuser authentication
		try {
			streamDeck.logger.info(`Authenticating as _superuser '${username}' at ${this.server.url}`);
			await this.pb.collection("_superusers").authWithPassword(username, password);
			if (this.pb.authStore.isValid) {
				streamDeck.logger.info(`Successfully authenticated as _superuser with ${this.server.url}`);
				this.lastAuthError = null;
				return true;
			}
		} catch (superErr) {
			this.lastAuthError = superErr instanceof Error ? superErr.message : String(superErr);
			streamDeck.logger.debug(`Superuser auth failed: ${String(superErr)}. Attempting legacy admin auth...`);
		}

		// 3. Try legacy PocketBase 0.22 admin authentication
		try {
			streamDeck.logger.info(`Authenticating as legacy admin '${username}' at ${this.server.url}`);
			await this.pb.admins.authWithPassword(username, password);
			if (this.pb.authStore.isValid) {
				streamDeck.logger.info(`Successfully authenticated as admin with ${this.server.url}`);
				this.lastAuthError = null;
				return true;
			}
		} catch (adminErr) {
			this.lastAuthError = adminErr instanceof Error ? adminErr.message : String(adminErr);
			streamDeck.logger.error(`All authentication methods failed for ${this.server.url}: ${String(adminErr)}`);
		}

		return false;
	}

	/**
	 * Retrieves the list of monitored systems.
	 */
	public async getSystems(): Promise<BeszelSystem[]> {
		await this.ensureAuth();
		try {
			const systems = await this.pb.collection("systems").getFullList<BeszelSystem>({
				sort: "name",
			});
			streamDeck.logger.info(`Fetched systems from ${this.server.url}: found ${systems.length} system(s)`);
			return systems;
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch systems from ${this.server.url}: ${String(err)}`);
			throw err;
		}
	}

	/**
	 * Retrieves the latest single stats record for a system.
	 */
	public async getLatestStats(systemId: string): Promise<BeszelStatsRecord | null> {
		await this.ensureAuth();
		try {
			const result = await this.pb.collection("system_stats").getList<BeszelStatsRecord>(1, 1, {
				filter: `system = "${systemId}"`,
				sort: "-created",
			});
			return result.items[0] ?? null;
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch latest stats for ${systemId}: ${String(err)}`);
			return null;
		}
	}

	/**
	 * Retrieves historical stats records for sparkline ring-buffer prefilling.
	 */
	public async getHistoricalStats(systemId: string, limit: number = 20): Promise<BeszelStatsRecord[]> {
		await this.ensureAuth();
		try {
			const result = await this.pb.collection("system_stats").getList<BeszelStatsRecord>(1, limit, {
				filter: `system = "${systemId}"`,
				sort: "-created",
			});
			return result.items.reverse();
		} catch (err) {
			streamDeck.logger.error(`Failed to fetch historical stats for ${systemId}: ${String(err)}`);
			return [];
		}
	}

	private async ensureAuth(): Promise<void> {
		if (!this.pb.authStore.isValid) {
			const ok = await this.authenticate();
			if (!ok) {
				throw new Error(
					this.lastAuthError ||
						`Authentication failed for ${this.server.url}. Please verify username and password.`,
				);
			}
		}
	}
}
