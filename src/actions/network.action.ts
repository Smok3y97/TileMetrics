import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { extractNetworkMetrics } from "../utils/network.utils.js";
import { formatNetworkBandwidth } from "../utils/telemetry.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.network" })
export class NetworkAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["Throughput", "Download (RX)", "Upload (TX)"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "Network");
				return;
			}

			const subMetric = settings.subMetric ?? "Throughput";
			const net = extractNetworkMetrics(latest.stats, settings.interfaceOrMount);

			let displayValue = "--";
			let footerText = net.ifaceName;
			let historyPoints: number[] = [];

			if (subMetric === "Download (RX)") {
				displayValue = formatNetworkBandwidth(net.rxBytesSec);
				footerText = "Download";
				historyPoints = history.map((h) => extractNetworkMetrics(h.stats, settings.interfaceOrMount).rxMbSec);
			} else if (subMetric === "Upload (TX)") {
				displayValue = formatNetworkBandwidth(net.txBytesSec);
				footerText = "Upload";
				historyPoints = history.map((h) => extractNetworkMetrics(h.stats, settings.interfaceOrMount).txMbSec);
			} else {
				// Total throughput (RX + TX)
				displayValue = formatNetworkBandwidth(net.totalBytesSec);
				footerText = "Total I/O";
				historyPoints = history.map((h) => extractNetworkMetrics(h.stats, settings.interfaceOrMount).totalMbSec);
			}

			const svg = SvgRenderer.render({
				title: net.ifaceName,
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: Math.max(10, ...historyPoints),
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering Network key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Network", "Error");
		}
	}
}
