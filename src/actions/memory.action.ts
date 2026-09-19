import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
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
			const stats = latest.stats;

			let displayValue = "--";
			let footerText = "Memory";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (subMetric === "RAM GB") {
				const usedGb =
					stats.mu ??
					(stats.mem ? (stats.mem > 1024 * 1024 ? stats.mem / (1024 * 1024 * 1024) : stats.mem) : 0);
				displayValue = formatGigabytes(usedGb);
				footerText = "Used RAM";
				historyPoints = history.map((h) => {
					return (
						h.stats.mu ??
						(h.stats.mem ? (h.stats.mem > 1024 * 1024 ? h.stats.mem / (1024 * 1024 * 1024) : h.stats.mem) : 0)
					);
				});
				const memPct = stats.mp ?? stats.mem_pct ?? 0;
				threshold = evaluateThreshold(memPct, warnThresh, critThresh);
			} else if (subMetric === "Swap %") {
				const swapPct = Math.round(
					stats.swap_pct ?? (stats.s && stats.s > 0 ? ((stats.su ?? 0) / stats.s) * 100 : 0),
				);
				displayValue = `${swapPct}%`;
				footerText = "Swap Usage";
				historyPoints = history.map((h) => {
					return Math.round(
						h.stats.swap_pct ?? (h.stats.s && h.stats.s > 0 ? ((h.stats.su ?? 0) / h.stats.s) * 100 : 0),
					);
				});
				threshold = evaluateThreshold(swapPct, warnThresh, critThresh);
			} else if (subMetric === "ZFS ARC") {
				const arcGb = stats.mz ?? stats.zfs_arc_pct ?? 0;
				displayValue = `${arcGb.toFixed(1)}G`;
				footerText = "ZFS ARC";
				historyPoints = history.map((h) => h.stats.mz ?? h.stats.zfs_arc_pct ?? 0);
				threshold = evaluateThreshold(arcGb, warnThresh, critThresh);
			} else {
				// Default: RAM %
				const ramPct = Math.round(
					stats.mp ?? stats.mem_pct ?? (stats.m && stats.m > 0 ? ((stats.mu ?? 0) / stats.m) * 100 : 0),
				);
				displayValue = `${ramPct}%`;
				footerText = "RAM";
				historyPoints = history.map((h) => {
					return Math.round(
						stats.mp ??
							stats.mem_pct ??
							(h.stats.m && h.stats.m > 0 ? ((h.stats.mu ?? 0) / h.stats.m) * 100 : 0),
					);
				});
				threshold = evaluateThreshold(ramPct, warnThresh, critThresh);
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
