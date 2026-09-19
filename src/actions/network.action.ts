import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
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
				await this.renderOffline(action, "NET");
				return;
			}

			const subMetric = settings.subMetric ?? "Throughput";
			const stats = latest.stats;

			let ifaceName = "NET";
			let rxBytesSec = 0;
			let txBytesSec = 0;

			const targetIface = settings.interfaceOrMount?.trim();
			if (targetIface && stats.ni && stats.ni[targetIface]) {
				ifaceName = targetIface;
				const ifc = stats.ni[targetIface];
				txBytesSec = ifc[0] ?? 0;
				rxBytesSec = ifc[1] ?? 0;
			} else if (stats.net && stats.net.length > 0) {
				// Legacy array support
				const matched =
					stats.net.find((i) => i.name === targetIface) ??
					stats.net.find((i) => (i.rx ?? 0) + (i.tx ?? 0) > 0) ??
					stats.net[0];
				if (matched) {
					ifaceName = matched.name;
					rxBytesSec = matched.rx ?? 0;
					txBytesSec = matched.tx ?? 0;
				}
			} else {
				// Native Beszel system-wide network bandwidth
				// stats.nr and stats.ns are in MB/s
				rxBytesSec = (stats.nr ?? 0) * 1024 * 1024;
				txBytesSec = (stats.ns ?? 0) * 1024 * 1024;
				if (stats.b && rxBytesSec === 0 && txBytesSec === 0) {
					txBytesSec = stats.b[0] ?? 0;
					rxBytesSec = stats.b[1] ?? 0;
				}
			}

			let displayValue = "--";
			let footerText = ifaceName;
			let historyPoints: number[] = [];

			if (subMetric === "Download (RX)") {
				displayValue = formatNetworkBandwidth(rxBytesSec);
				footerText = "Download";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (targetIface && s.ni && s.ni[targetIface]) {
						return (s.ni[targetIface][1] ?? 0) / (1024 * 1024);
					}
					return s.nr ?? 0;
				});
			} else if (subMetric === "Upload (TX)") {
				displayValue = formatNetworkBandwidth(txBytesSec);
				footerText = "Upload";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (targetIface && s.ni && s.ni[targetIface]) {
						return (s.ni[targetIface][0] ?? 0) / (1024 * 1024);
					}
					return s.ns ?? 0;
				});
			} else {
				// Total throughput (RX + TX)
				const total = rxBytesSec + txBytesSec;
				displayValue = formatNetworkBandwidth(total);
				footerText = "Total I/O";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (targetIface && s.ni && s.ni[targetIface]) {
						return ((s.ni[targetIface][0] ?? 0) + (s.ni[targetIface][1] ?? 0)) / (1024 * 1024);
					}
					return (s.nr ?? 0) + (s.ns ?? 0);
				});
			}

			const svg = SvgRenderer.render({
				title: ifaceName,
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: Math.max(1, ...historyPoints),
				threshold: "normal",
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering Network key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "NET", "Error");
		}
	}
}
