import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { evaluateInvertedThreshold } from "../utils/telemetry.utils.js";
import { extractUpsMetrics } from "../utils/ups.utils.js";
import { BaseMetricAction } from "./base.action.js";

@action({ UUID: "com.smok3y97.tilemetrics.beszel.ups" })
export class UpsAction extends BaseMetricAction {
	public getSubMetrics(): string[] {
		return ["Battery %", "Status"];
	}

	public async renderKey(
		action: KeyAction<ActionSettings>,
		settings: ActionSettings,
		latest: BeszelStatsRecord | null,
		history: BeszelStatsRecord[],
	): Promise<void> {
		try {
			if (!latest) {
				await this.renderOffline(action, "UPS");
				return;
			}

			const subMetric = settings.subMetric ?? "Battery %";
			const ups = extractUpsMetrics(latest.stats);

			let displayValue = "--";
			let footerText = "UPS";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (!ups.hasBattery) {
				displayValue = "N/A";
				footerText = "No Battery";
			} else if (subMetric === "Status") {
				displayValue = ups.stateStr;
				footerText = ups.runtimeMinutes ? `${ups.runtimeMinutes}m left` : "Power Mode";
				if (
					!ups.stateStr.includes("OL") &&
					!ups.stateStr.toLowerCase().includes("online") &&
					!ups.stateStr.includes("Charging")
				) {
					threshold = "warning";
				}
			} else {
				// Battery Capacity % (Inverted thresholds: low battery is critical)
				displayValue = `${ups.chargePct}%`;
				footerText = "Battery";
				historyPoints = history.map((h) => extractUpsMetrics(h.stats).chargePct);

				const warnThresh = settings.warnThreshold ?? 40;
				const critThresh = settings.critThreshold ?? 20;
				threshold = evaluateInvertedThreshold(ups.chargePct, warnThresh, critThresh);
			}

			const svg = SvgRenderer.render({
				title: "UPS",
				value: displayValue,
				footer: footerText,
				history: settings.enableHistory !== false ? historyPoints : [],
				historyMin: 0,
				historyMax: 100,
				threshold,
			});

			await action.setImage(svg);
		} catch (err) {
			streamDeck.logger.error(`Error rendering UPS key for action ${action.id}: ${String(err)}`);
			await this.renderError(action, "UPS", "Error");
		}
	}
}
