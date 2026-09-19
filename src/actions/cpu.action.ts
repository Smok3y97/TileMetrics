import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { evaluateThreshold, formatTemperature } from "../utils/telemetry.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.cpu" })
export class CpuAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["Usage", "Load Avg", "Temp"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "CPU");
				return;
			}

			const subMetric = settings.subMetric ?? "Usage";
			const warnThresh = settings.warnThreshold ?? 75;
			const critThresh = settings.critThreshold ?? 90;
			const stats = latest.stats;

			let displayValue = "--";
			let footerText = "CPU";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (subMetric === "Load Avg") {
				const load1m = stats.la?.[0] ?? stats.loadavg?.[0] ?? 0;
				displayValue = load1m.toFixed(2);
				footerText = "1m Load";
				historyPoints = history.map((h) => h.stats.la?.[0] ?? h.stats.loadavg?.[0] ?? 0);
			} else if (subMetric === "Temp") {
				const tempValues = stats.t ? Object.values(stats.t) : [];
				const tempC = stats.cpu_temp ?? (tempValues.length > 0 ? Math.max(...tempValues) : 0);
				const unit = this.cache.getGlobalSettings().tempUnit ?? "C";
				displayValue = formatTemperature(tempC, unit);
				footerText = "Package Temp";
				historyPoints = history.map((h) => {
					const vals = h.stats.t ? Object.values(h.stats.t) : [];
					return h.stats.cpu_temp ?? (vals.length > 0 ? Math.max(...vals) : 0);
				});
				threshold = evaluateThreshold(tempC, warnThresh, critThresh);
			} else {
				// Default: CPU Total Usage %
				const usage = Math.round(stats.cpu ?? 0);
				displayValue = `${usage}%`;
				footerText = "Usage";
				historyPoints = history.map((h) => h.stats.cpu ?? 0);
				threshold = evaluateThreshold(usage, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: "CPU",
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: subMetric === "Load Avg" ? Math.max(4, ...historyPoints) : 100,
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering CPU key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "CPU", "Error");
		}
	}
}
