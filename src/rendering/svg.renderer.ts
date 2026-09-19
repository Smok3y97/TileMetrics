export type ThresholdState = "critical" | "normal" | "warning";

export interface SvgRenderOptions {
	title: string;
	value: string;
	footer?: string;
	history?: number[];
	historyMin?: number;
	historyMax?: number;
	threshold?: ThresholdState;
	isOffline?: boolean;
}

const COLOR_NORMAL = "#10b981"; // Emerald
const COLOR_WARNING = "#f59e0b"; // Amber
const COLOR_CRITICAL = "#ef4444"; // Red
const COLOR_OFFLINE = "#64748b"; // Slate

/**
 * High-performance, zero-disk 144x144 SVG generator for Stream Deck key displays.
 */
export class SvgRenderer {
	/**
	 * Renders a full 144x144 key frame and returns a Base64 Data-URI.
	 */
	public static render(options: SvgRenderOptions): string {
		const { title, value, footer, history = [], threshold = "normal", isOffline = false } = options;

		let accentColor = COLOR_NORMAL;
		if (isOffline) {
			accentColor = COLOR_OFFLINE;
		} else if (threshold === "critical") {
			accentColor = COLOR_CRITICAL;
		} else if (threshold === "warning") {
			accentColor = COLOR_WARNING;
		}

		// Calculate sparkline coordinates
		const sparklineSvg = this.generateSparkline(
			history,
			options.historyMin,
			options.historyMax,
			accentColor,
			isOffline,
		);

		// Determine dynamic font size based on value string length
		let valueFontSize = 32;
		if (value.length > 8) {
			valueFontSize = 20;
		} else if (value.length > 5) {
			valueFontSize = 25;
		}

		const truncatedTitle = this.escapeXml(title.length > 13 ? `${title.slice(0, 12)}…` : title);
		const truncatedFooter = footer ? this.escapeXml(footer.length > 14 ? `${footer.slice(0, 13)}…` : footer) : "";
		const escapedValue = this.escapeXml(value);

		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
	<defs>
		<linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#1e293b"/>
			<stop offset="100%" stop-color="#0f172a"/>
		</linearGradient>
		<linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
			<stop offset="100%" stop-color="${accentColor}" stop-opacity="0.0"/>
		</linearGradient>
	</defs>

	<!-- Background Plate -->
	<rect width="144" height="144" rx="14" fill="url(#bgGrad)"/>

	<!-- Sparkline History Layer -->
	${sparklineSvg}

	<!-- Title Header -->
	<text x="72" y="24" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif">
		${truncatedTitle}
	</text>

	<!-- Main Metric Display -->
	<text x="72" y="78" text-anchor="middle" fill="#ffffff" font-size="${valueFontSize}" font-weight="700" font-family="system-ui, -apple-system, sans-serif" style="font-variant-numeric: tabular-nums;">
		${escapedValue}
	</text>

	<!-- Status Badge & Dot -->
	<circle cx="20" cy="122" r="4" fill="${accentColor}"/>
	<text x="76" y="126" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="500" font-family="system-ui, -apple-system, sans-serif">
		${isOffline ? "OFFLINE" : truncatedFooter}
	</text>
</svg>`;

		const base64 = Buffer.from(svg).toString("base64");
		return `data:image/svg+xml;base64,${base64}`;
	}

	/**
	 * Computes sparkline polylines and polygons bounded within the key.
	 */
	private static generateSparkline(
		history: number[],
		minBound?: number,
		maxBound?: number,
		color: string = COLOR_NORMAL,
		isOffline: boolean = false,
	): string {
		if (history.length < 2 || isOffline) {
			return "";
		}

		const boxX = 8;
		const boxY = 32;
		const boxW = 128;
		const boxH = 56;

		const min = minBound ?? Math.min(...history);
		let max = maxBound ?? Math.max(...history);

		if (min === max) {
			max = min + 1;
		}

		const stepX = boxW / (history.length - 1);
		const points: string[] = [];

		for (let i = 0; i < history.length; i++) {
			const x = boxX + i * stepX;
			const normalized = Math.max(0, Math.min(1, (history[i] - min) / (max - min)));
			const y = boxY + boxH - normalized * boxH;
			points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
		}

		const linePoints = points.join(" ");
		const areaPoints = `${boxX},${boxY + boxH} ${linePoints} ${boxX + boxW},${boxY + boxH}`;

		return `
		<polygon points="${areaPoints}" fill="url(#sparkGrad)"/>
		<polyline points="${linePoints}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
		`;
	}

	private static escapeXml(unsafe: string): string {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}
}
