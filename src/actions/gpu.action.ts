import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { evaluateThreshold, formatTemperature } from "../utils/telemetry.utils.js";
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
			const stats = latest.stats;

			// Extract primary GPU from stats.g (native Beszel) or stats.gpu (legacy)
			let gpuName = "GPU";
			let usagePct = 0;
			let vramPct = 0;
			let powerW = 0;
			let tempC = 0;
			let hasGpu = false;

			if (stats.g && Object.keys(stats.g).length > 0) {
				hasGpu = true;
				const firstKey = Object.keys(stats.g)[0];
				const gpu = stats.g[firstKey];
				gpuName = gpu.n || "GPU";
				usagePct = Math.round(gpu.u ?? 0);
				if (gpu.mt && gpu.mt > 0) {
					vramPct = Math.round(((gpu.mu ?? 0) / gpu.mt) * 100);
				}
				powerW = Math.round(gpu.p ?? 0);
				tempC = gpu.temp ?? 0;
			} else if (stats.gpu && stats.gpu.length > 0) {
				hasGpu = true;
				const gpu = stats.gpu[0];
				gpuName = gpu.name || "GPU";
				usagePct = Math.round(gpu.pct ?? 0);
				vramPct = Math.round(gpu.mem_pct ?? 0);
				powerW = Math.round(gpu.power ?? 0);
				tempC = gpu.temp ?? 0;
			}

			let displayValue = "--";
			let footerText = "GPU";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (!hasGpu) {
				displayValue = "N/A";
				footerText = "No GPU";
			} else if (subMetric === "VRAM") {
				displayValue = `${vramPct}%`;
				footerText = "VRAM Usage";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (s.g && Object.keys(s.g).length > 0) {
						const g = s.g[Object.keys(s.g)[0]];
						return g.mt && g.mt > 0 ? Math.round(((g.mu ?? 0) / g.mt) * 100) : 0;
					}
					return (s.gpu ?? [])[0]?.mem_pct ?? 0;
				});
				threshold = evaluateThreshold(vramPct, warnThresh, critThresh);
			} else if (subMetric === "Power") {
				displayValue = `${powerW}W`;
				footerText = "Power Draw";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (s.g && Object.keys(s.g).length > 0) {
						return Math.round(s.g[Object.keys(s.g)[0]].p ?? 0);
					}
					return (s.gpu ?? [])[0]?.power ?? 0;
				});
			} else if (subMetric === "Temp") {
				const unit = this.cache.getGlobalSettings().tempUnit ?? "C";
				displayValue = formatTemperature(tempC, unit);
				footerText = "GPU Temp";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (s.g && Object.keys(s.g).length > 0) {
						return s.g[Object.keys(s.g)[0]].temp ?? 0;
					}
					return (s.gpu ?? [])[0]?.temp ?? 0;
				});
				threshold = evaluateThreshold(tempC, warnThresh, critThresh);
			} else {
				// Core Load %
				displayValue = `${usagePct}%`;
				footerText = "Core Load";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (s.g && Object.keys(s.g).length > 0) {
						return Math.round(s.g[Object.keys(s.g)[0]].u ?? 0);
					}
					return (s.gpu ?? [])[0]?.pct ?? 0;
				});
				threshold = evaluateThreshold(usagePct, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: gpuName ? gpuName.replace(/NVIDIA|GeForce|AMD|Radeon/gi, "").trim() : "GPU",
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
