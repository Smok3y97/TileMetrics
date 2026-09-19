import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { extractStorageMetrics } from "../utils/storage.utils.js";
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
			const storage = extractStorageMetrics(latest.stats, settings.interfaceOrMount);

			let displayValue = "--";
			let footerText = storage.diskName;
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (storage.totalGb === 0 && storage.pct === 0 && storage.readMb === 0 && storage.writeMb === 0) {
				displayValue = "N/A";
			} else if (subMetric === "Read I/O") {
				displayValue = formatByteThroughput(storage.readMb * 1024 * 1024);
				footerText = "Read Speed";
				historyPoints = history.map((h) => extractStorageMetrics(h.stats, settings.interfaceOrMount).readMb);
			} else if (subMetric === "Write I/O") {
				displayValue = formatByteThroughput(storage.writeMb * 1024 * 1024);
				footerText = "Write Speed";
				historyPoints = history.map((h) => extractStorageMetrics(h.stats, settings.interfaceOrMount).writeMb);
			} else {
				// Capacity %
				displayValue = `${storage.pct}%`;
				footerText = `${storage.diskName} Used`;
				historyPoints = history.map((h) => extractStorageMetrics(h.stats, settings.interfaceOrMount).pct);
				threshold = evaluateThreshold(storage.pct, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: storage.diskName,
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: subMetric.includes("I/O") ? Math.max(10, ...historyPoints) : 100,
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering Storage key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "Disk", "Error");
		}
	}
}
