import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { evaluateThreshold, formatByteThroughput } from "../utils/telemetry.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.storage" })
export class StorageAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["Capacity", "Read I/O", "Write I/O"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "Disk");
				return;
			}

			const subMetric = settings.subMetric ?? "Capacity";
			const warnThresh = settings.warnThreshold ?? 75;
			const critThresh = settings.critThreshold ?? 90;
			const stats = latest.stats;

			// Determine target filesystem: check extra filesystems or fallback to root disk
			let diskName = "Root";
			let totalGb = stats.d ?? 0;
			let usedGb = stats.du ?? 0;
			let pct = Math.round(stats.dp ?? (totalGb > 0 ? (usedGb / totalGb) * 100 : 0));
			let readMb = stats.dr ?? 0;
			let writeMb = stats.dw ?? 0;

			const targetMount = settings.interfaceOrMount?.trim();
			if (targetMount && stats.efs && stats.efs[targetMount]) {
				const efs = stats.efs[targetMount];
				diskName = targetMount;
				totalGb = efs.d ?? 0;
				usedGb = efs.du ?? 0;
				pct = Math.round(totalGb > 0 ? (usedGb / totalGb) * 100 : 0);
			} else if (stats.disk && stats.disk.length > 0) {
				// Legacy fallback
				const legacy = stats.disk.find((d) => d.disk === targetMount) ?? stats.disk[0];
				if (legacy) {
					diskName = legacy.disk;
					totalGb = legacy.total;
					usedGb = legacy.used;
					pct = Math.round(legacy.pct ?? (totalGb > 0 ? (usedGb / totalGb) * 100 : 0));
					readMb = (legacy.read ?? 0) / (1024 * 1024);
					writeMb = (legacy.write ?? 0) / (1024 * 1024);
				}
			}

			let displayValue = "--";
			let footerText = diskName;
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (totalGb === 0 && pct === 0 && readMb === 0 && writeMb === 0) {
				displayValue = "N/A";
			} else if (subMetric === "Read I/O") {
				displayValue = formatByteThroughput(readMb * 1024 * 1024);
				footerText = "Read Speed";
				historyPoints = history.map((h) => {
					const s = h.stats;
					return s.dr ?? 0;
				});
			} else if (subMetric === "Write I/O") {
				displayValue = formatByteThroughput(writeMb * 1024 * 1024);
				footerText = "Write Speed";
				historyPoints = history.map((h) => {
					const s = h.stats;
					return s.dw ?? 0;
				});
			} else {
				// Capacity %
				displayValue = `${pct}%`;
				footerText = `${diskName} Used`;
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (targetMount && s.efs && s.efs[targetMount]) {
						const e = s.efs[targetMount];
						return Math.round(e.d && e.d > 0 ? ((e.du ?? 0) / e.d) * 100 : 0);
					}
					return Math.round(s.dp ?? (s.d && s.d > 0 ? ((s.du ?? 0) / s.d) * 100 : 0));
				});
				threshold = evaluateThreshold(pct, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: diskName,
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: subMetric === "Capacity" ? 100 : Math.max(10, ...historyPoints),
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering Storage key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Disk", "Error");
		}
	}
}
