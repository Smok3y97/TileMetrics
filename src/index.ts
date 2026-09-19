import streamDeck from "@elgato/streamdeck";

// Top-level crash prevention: ensure unhandled async errors or exceptions never terminate the Node process
process.on("uncaughtException", (error: Error) => {
	streamDeck.logger.error(`[Process] Uncaught Exception: ${error?.stack ?? error?.message ?? String(error)}`);
});

process.on("unhandledRejection", (reason: unknown) => {
	const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
	streamDeck.logger.error(`[Process] Unhandled Promise Rejection: ${message}`);
});

export * from "./plugin.js";
