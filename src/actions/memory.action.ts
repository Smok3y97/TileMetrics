import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { extractMemoryMetrics } from "../utils/memory.utils.js";
import { evaluateThreshold, formatGigabytes } from "../utils/telemetry.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.memory" })
export class MemoryAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["RAM %", "RAM GB", "Swap %", "ZFS ARC"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "RAM");
				return;
			}

			const subMetric = settings.subMetric ?? "RAM %";
			const warnThresh = settings.warnThreshold ?? 75;
			const critThresh = settings.critThreshold ?? 90;
			const mem = extractMemoryMetrics(latest.stats);

			let displayValue = "--";
			let footerText = "Memory";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (subMetric === "RAM GB") {
				displayValue = formatGigabytes(mem.usedRamGb);
				footerText = "Used RAM";
				historyPoints = history.map((h) => extractMemoryMetrics(h.stats).usedRamGb);
				threshold = evaluateThreshold(mem.ramPct, warnThresh, critThresh);
			} else if (subMetric === "Swap %") {
				displayValue = `${mem.swapPct}%`;
				footerText = "Swap Usage";
				historyPoints = history.map((h) => extractMemoryMetrics(h.stats).swapPct);
				threshold = evaluateThreshold(mem.swapPct, warnThresh, critThresh);
			} else if (subMetric === "ZFS ARC") {
				displayValue = `${mem.zfsArcGb.toFixed(1)}G`;
				footerText = "ZFS ARC";
				historyPoints = history.map((h) => extractMemoryMetrics(h.stats).zfsArcGb);
				threshold = evaluateThreshold(mem.zfsArcGb, warnThresh, critThresh);
			} else {
				// Default: RAM %
				displayValue = `${mem.ramPct}%`;
				footerText = "RAM";
				historyPoints = history.map((h) => extractMemoryMetrics(h.stats).ramPct);
				threshold = evaluateThreshold(mem.ramPct, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: "RAM",
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: subMetric === "RAM GB" ? Math.max(16, ...historyPoints) : 100,
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering Memory key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "RAM", "Error");
		}
	}
}
