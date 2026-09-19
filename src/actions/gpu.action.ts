import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { extractGpuMetrics } from "../utils/gpu.utils.js";
import { formatTemperature } from "../utils/temperature.utils.js";
import { evaluateThreshold } from "../utils/telemetry.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.gpu" })
export class GpuAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["Core Load", "VRAM", "Power", "Temp"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "GPU");
				return;
			}

			const subMetric = settings.subMetric ?? "Core Load";
			const warnThresh = settings.warnThreshold ?? 75;
			const critThresh = settings.critThreshold ?? 90;
			const gpu = extractGpuMetrics(latest.stats);

			let displayValue = "--";
			let footerText = "GPU";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (!gpu.hasGpu) {
				displayValue = "N/A";
				footerText = "No GPU";
			} else if (subMetric === "VRAM") {
				displayValue = `${gpu.vramPct}%`;
				footerText = "VRAM Usage";
				historyPoints = history.map((h) => extractGpuMetrics(h.stats).vramPct);
				threshold = evaluateThreshold(gpu.vramPct, warnThresh, critThresh);
			} else if (subMetric === "Power") {
				displayValue = `${gpu.powerW}W`;
				footerText = "Power Draw";
				historyPoints = history.map((h) => extractGpuMetrics(h.stats).powerW);
			} else if (subMetric === "Temp") {
				const unit = this.cache.getGlobalSettings().tempUnit ?? "C";
				if (gpu.tempC !== undefined) {
					displayValue = formatTemperature(gpu.tempC, unit);
					footerText = "GPU Temp";
					threshold = evaluateThreshold(gpu.tempC, warnThresh, critThresh);
				} else {
					displayValue = "--";
					footerText = "No Sensor";
					threshold = "normal";
				}
				historyPoints = history.map((h) => extractGpuMetrics(h.stats).tempC ?? 0);
			} else {
				// Core Load %
				displayValue = `${gpu.usagePct}%`;
				footerText = "Core Load";
				historyPoints = history.map((h) => extractGpuMetrics(h.stats).usagePct);
				threshold = evaluateThreshold(gpu.usagePct, warnThresh, critThresh);
			}

			const cleanGpuName = gpu.name.replace(/NVIDIA|GeForce|AMD|Radeon/gi, "").trim() || "GPU";

			const svg = SvgRenderer.render({
				title: cleanGpuName,
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: subMetric === "Power" ? Math.max(100, ...historyPoints) : 100,
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering GPU key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "GPU", "Error");
		}
	}
}
