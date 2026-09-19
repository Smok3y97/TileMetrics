import streamDeck, {
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";

import { SvgRenderer } from "../rendering/svg.renderer.js";
import { MetricsCacheService } from "../services/metrics-cache.service.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";

/**
 * Abstract base class for all TileMetrics telemetry actions.
 */
export abstract class BaseMetricAction extends SingletonAction<ActionSettings> {
	protected cache = MetricsCacheService.getInstance();
	private keyPressTimers = new Map<string, number>();

	constructor() {
		super();

		// Subscribe to global cache updates
		this.cache.on(
			"metricsUpdated",
			(serverId: string, hostId: string, latest: BeszelStatsRecord, history: BeszelStatsRecord[]) => {
				void this.handleMetricsUpdated(serverId, hostId, latest, history);
			},
		);
	}

	/**
	 * Available sub-metrics for this action (cycled on short-press).
	 */
	public abstract getSubMetrics(): string[];

	/**
	 * Renders key imagery and sends Data-URI to Stream Deck hardware.
	 */
	public abstract renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void>;

	/**
	 * Single Point of Truth for rendering offline/unconfigured fallback frames.
	 */
	protected async renderOffline(
		action: KeyAction<ActionSettings>,
		title: string,
		footer: string = "Offline",
	): Promise<void> {
		try {
			const svg = SvgRenderer.render({
				title,
				value: "--",
				footer,
				isOffline: true,
			});
			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Failed to render offline state for action ${action.id}: ${String(err)}`);
		}
	}

	/**
	 * Single Point of Truth for rendering error fallback frames.
	 */
	protected async renderError(
		action: KeyAction<ActionSettings>,
		title: string = "Error",
		footer: string = "Error",
	): Promise<void> {
		try {
			const svg = SvgRenderer.render({
				title,
				value: "ERR",
				footer,
				threshold: "critical",
			});
			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Failed to render error state for action ${action.id}: ${String(err)}`);
		}
	}

	override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
		const action = ev.action as KeyAction<ActionSettings>;
		const settings = ev.payload.settings;

		try {
			await this.cache.registerKey(
				action.id,
				settings.serverId,
				settings.hostId,
				settings.enableHistory ?? true,
				settings.historyPoints ?? 20,
			);

			const latest =
				settings.serverId && settings.hostId
					? this.cache.getLatestStats(settings.serverId, settings.hostId)
					: null;
			const history =
				settings.serverId && settings.hostId ? this.cache.getHistory(settings.serverId, settings.hostId) : [];

			await this.renderKey(action, settings, latest, history);
		} catch (err) {
			streamDeck.logger.error(`Error in onWillAppear for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Error", "Error");
		}
	}

	override async onWillDisappear(ev: WillDisappearEvent<ActionSettings>): Promise<void> {
		try {
			this.cache.unregisterKey(ev.action.id);
			this.keyPressTimers.delete(ev.action.id);
		} catch (err) {
			streamDeck.logger.error(`Error in onWillDisappear for action ${ev.action.id}: ${String(err)}`);
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
		const action = ev.action as KeyAction<ActionSettings>;
		const settings = ev.payload.settings;

		try {
			await this.cache.registerKey(
				action.id,
				settings.serverId,
				settings.hostId,
				settings.enableHistory ?? true,
				settings.historyPoints ?? 20,
			);

			const latest =
				settings.serverId && settings.hostId
					? this.cache.getLatestStats(settings.serverId, settings.hostId)
					: null;
			const history =
				settings.serverId && settings.hostId ? this.cache.getHistory(settings.serverId, settings.hostId) : [];

			await this.renderKey(action, settings, latest, history);
		} catch (err) {
			streamDeck.logger.error(`Error in onDidReceiveSettings for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Error", "Error");
		}
	}

	override onKeyDown(ev: KeyDownEvent<ActionSettings>): void {
		try {
			this.keyPressTimers.set(ev.action.id, Date.now());
		} catch (err) {
			streamDeck.logger.error(`Error in onKeyDown for action ${ev.action.id}: ${String(err)}`);
		}
	}

	override async onKeyUp(ev: KeyUpEvent<ActionSettings>): Promise<void> {
		const action = ev.action as KeyAction<ActionSettings>;
		try {
			const startTime = this.keyPressTimers.get(action.id) ?? Date.now();
			this.keyPressTimers.delete(action.id);

			const duration = Date.now() - startTime;
			if (duration >= 450) {
				await this.onLongPress(action, ev.payload.settings);
			} else {
				await this.onShortPress(action, ev.payload.settings);
			}
		} catch (err) {
			streamDeck.logger.error(`Error in onKeyUp for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Error", "Error");
		}
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, ActionSettings>): Promise<void> {
		try {
			const payload = ev.payload as Record<string, unknown> | undefined;
			if (payload && payload.event === "getHosts") {
				const actionSettings = await ev.action.getSettings();
				const targetServerId = (payload.serverId as string) || actionSettings.serverId;
				if (targetServerId) {
					streamDeck.logger.info(`Handling getHosts for server ${targetServerId}`);
					try {
						const hosts = await this.cache.getSystems(targetServerId);
						await streamDeck.ui.sendToPropertyInspector({
							event: "hostList",
							hosts: hosts as unknown as JsonValue[],
						} as unknown as JsonObject);
					} catch (err) {
						const errorMsg = err instanceof Error ? err.message : String(err);
						streamDeck.logger.error(`Failed to get systems for ${targetServerId}: ${errorMsg}`);
						await streamDeck.ui.sendToPropertyInspector({
							event: "hostList",
							hosts: [],
							error: errorMsg,
						} as unknown as JsonObject);
					}
				}
			}
		} catch (err) {
			streamDeck.logger.error(`Error in onSendToPlugin for action ${ev.action.id}: ${String(err)}`);
		}
	}

	/**
	 * Short press: cycle through sub-metrics.
	 */
	protected async onShortPress(action: KeyAction<ActionSettings>, settings: ActionSettings): Promise<void> {
		try {
			const metrics = this.getSubMetrics();
			if (metrics.length === 0) {
				return;
			}

			const currentIndex = metrics.indexOf(settings.subMetric ?? metrics[0]);
			const nextIndex = (currentIndex + 1) % metrics.length;
			const nextMetric = metrics[nextIndex];

			const updatedSettings: ActionSettings = {
				...settings,
				subMetric: nextMetric,
			};

			await action.setSettings(updatedSettings);

			const latest =
				settings.serverId && settings.hostId
					? this.cache.getLatestStats(settings.serverId, settings.hostId)
					: null;
			const history =
				settings.serverId && settings.hostId ? this.cache.getHistory(settings.serverId, settings.hostId) : [];

			await this.renderKey(action, updatedSettings, latest, history);
		} catch (err) {
			streamDeck.logger.error(`Error in onShortPress for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Error", "Error");
		}
	}

	/**
	 * Long press: open host in Beszel dashboard.
	 */
	protected async onLongPress(_action: KeyAction<ActionSettings>, settings: ActionSettings): Promise<void> {
		try {
			const server = this.cache.getServerConfig(settings.serverId);
			if (!server?.url) {
				return;
			}

			const baseUrl = server.url.replace(/\/+$/, "");
			const url = settings.hostId ? `${baseUrl}/#/system/${settings.hostId}` : baseUrl;

			await streamDeck.system.openUrl(url);
		} catch (err) {
			streamDeck.logger.error(`Failed to open URL in onLongPress: ${String(err)}`);
		}
	}

	private async handleMetricsUpdated(
		serverId: string,
		hostId: string,
		latest: BeszelStatsRecord,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			// Iterate over active actions for this specific host
			for (const action of this.actions) {
				if (!action.isKey()) {
					continue;
				}

				const keyAction = action as KeyAction<ActionSettings>;
				try {
					const settings = await keyAction.getSettings();

					if (settings.serverId === serverId && settings.hostId === hostId) {
						await this.renderKey(keyAction, settings, latest, history);
					}
				} catch (err) {
					streamDeck.logger.error(`Error updating metric for key ${keyAction.id}: ${String(err)}`);
					await this.renderError(keyAction, "Error", "Error");
				}
			}
		} catch (err) {
			streamDeck.logger.error(`Error in handleMetricsUpdated for ${serverId}:${hostId}: ${String(err)}`);
		}
	}
}
