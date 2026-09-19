import streamDeck, { action, type KeyAction } from "@elgato/streamdeck";

import { SvgRenderer, type ThresholdState } from "../rendering/svg.renderer.js";
import type { BeszelStatsRecord } from "../types/beszel.types.js";
import type { ActionSettings } from "../types/settings.types.js";
import { evaluateInvertedThreshold } from "../utils/telemetry.utils.js";
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
			const stats = latest.stats;

			// Extract battery percentage from stats.bat [pct, state], stats.bats, or legacy stats.ups
			let hasBattery = false;
			let charge = 100;
			let stateStr = "OL";

			if (stats.bat && stats.bat.length > 0) {
				hasBattery = true;
				charge = Math.round(stats.bat[0] ?? 100);
				const rawState = stats.bat[1];
				stateStr = typeof rawState === "string" ? rawState : rawState === 1 ? "Charging" : "Discharging";
			} else if (stats.bats && Object.keys(stats.bats).length > 0) {
				hasBattery = true;
				charge = Math.round(Object.values(stats.bats)[0] ?? 100);
			} else if (stats.ups) {
				hasBattery = true;
				charge = Math.round(stats.ups.pct ?? 100);
				stateStr = stats.ups.status ?? "OL";
			}

			let displayValue = "--";
			let footerText = "UPS";
			let historyPoints: number[] = [];
			let threshold: ThresholdState = "normal";

			if (!hasBattery) {
				displayValue = "N/A";
				footerText = "No Battery";
			} else if (subMetric === "Status") {
				displayValue = stateStr;
				footerText = stats.ups?.runtime ? `${stats.ups.runtime}m left` : "Power Mode";
				if (
					!stateStr.includes("OL") &&
					!stateStr.toLowerCase().includes("online") &&
					!stateStr.includes("Charging")
				) {
					threshold = "warning";
				}
			} else {
				// Battery Capacity % (Inverted thresholds: low battery is critical)
				displayValue = `${charge}%`;
				footerText = "Battery";
				historyPoints = history.map((h) => {
					const s = h.stats;
					if (s.bat && s.bat.length > 0) return Math.round(s.bat[0] ?? 100);
					if (s.bats && Object.keys(s.bats).length > 0) return Math.round(Object.values(s.bats)[0] ?? 100);
					return Math.round(s.ups?.pct ?? 100);
				});

				const warnThresh = settings.warnThreshold ?? 40;
				const critThresh = settings.critThreshold ?? 20;
				threshold = evaluateInvertedThreshold(charge, warnThresh, critThresh);
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
