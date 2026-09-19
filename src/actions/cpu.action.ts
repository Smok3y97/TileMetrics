import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { extractCpuMetrics } from "../utils/cpu.utils.js";
import { formatTemperature } from "../utils/temperature.utils.js";
import { evaluateThreshold } from "../utils/telemetry.utils.js";
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
			const cpu = extractCpuMetrics(latest.stats);

			let displayValue = "--";
			let footerText = "CPU";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (subMetric === "Load Avg") {
				displayValue = cpu.load1m.toFixed(2);
				footerText = "1m Load";
				historyPoints = history.map((h) => extractCpuMetrics(h.stats).load1m);
			} else if (subMetric === "Temp") {
				const unit = this.cache.getGlobalSettings().tempUnit ?? "C";
				if (cpu.tempC !== undefined) {
					displayValue = formatTemperature(cpu.tempC, unit);
					footerText = "Package Temp";
					threshold = evaluateThreshold(cpu.tempC, warnThresh, critThresh);
				} else {
					displayValue = "--";
					footerText = "No Sensor";
					threshold = "normal";
				}
				historyPoints = history.map((h) => extractCpuMetrics(h.stats).tempC ?? 0);
			} else {
				// Default: CPU Total Usage %
				displayValue = `${cpu.usagePct}%`;
				footerText = "Usage";
				historyPoints = history.map((h) => extractCpuMetrics(h.stats).usagePct);
				threshold = evaluateThreshold(cpu.usagePct, warnThresh, critThresh);
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
