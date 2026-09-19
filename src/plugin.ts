import streamDeck from "@elgato/streamdeck";

import { CpuAction } from "./actions/cpu.action.js";
import { GpuAction } from "./actions/gpu.action.js";
import { MemoryAction } from "./actions/memory.action.js";
import { NetworkAction } from "./actions/network.action.js";
import { StorageAction } from "./actions/storage.action.js";
import { UpsAction } from "./actions/ups.action.js";
import { MetricsCacheService } from "./services/metrics-cache.service.js";
import type { GlobalSettings } from "./types/settings.types.js";
// Top-level crash prevention: ensure unhandled async errors or exceptions never terminate the Node process
process.on("uncaughtException", (error: Error) => {
	streamDeck.logger.error(`[Process] Uncaught Exception: ${error?.stack ?? error?.message ?? String(error)}`);
});

process.on("unhandledRejection", (reason: unknown) => {
	const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
	streamDeck.logger.error(`[Process] Unhandled Promise Rejection: ${message}`);
});

const cacheService = MetricsCacheService.getInstance();

// Register all telemetry actions with Stream Deck SDK
streamDeck.actions.registerAction(new CpuAction());
streamDeck.actions.registerAction(new MemoryAction());
streamDeck.actions.registerAction(new StorageAction());
streamDeck.actions.registerAction(new NetworkAction());
streamDeck.actions.registerAction(new GpuAction());
streamDeck.actions.registerAction(new UpsAction());

// Handle global settings synchronization
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
	cacheService.setGlobalSettings(ev.settings);
});

// Connect to Stream Deck application first, then request initial global settings
streamDeck
	.connect()
	.then(async () => {
		try {
			const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
			if (settings) {
				cacheService.setGlobalSettings(settings);
			}
		} catch (err) {
			streamDeck.logger.warn(`Could not fetch initial global settings: ${String(err)}`);
		}
	})
	.catch((err) => {
		streamDeck.logger.error(`Failed to connect to Stream Deck: ${String(err)}`);
	});
