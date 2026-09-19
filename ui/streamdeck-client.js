/**
 * Stream Deck Property Inspector SDK WebSocket Client Bridge
 * Bridges HTML Property Inspector views with the Stream Deck plugin WebSocket backend.
 */

class StreamDeckClientBridge {
	constructor() {
		this.websocket = null;
		this.openerBridge = null;
		this.uuid = null;
		this.actionInfo = null;
		this.info = null;
		this.actionUuid = null;
		this.context = null;
		this.isConnected = false;

		this._sendQueue = [];
		this._didReceiveSettingsListeners = [];
		this._didReceiveGlobalSettingsListeners = [];
		this._sendToPropertyInspectorListeners = [];
		this._connectedListeners = [];

		this.initOpenerBridge();
	}

	/**
	 * Automatically connects via window.opener if opened as a child/popup window.
	 */
	initOpenerBridge() {
		try {
			if (window.opener && window.opener.StreamDeckClient) {
				const parent = window.opener.StreamDeckClient;
				this.openerBridge = parent;

				const syncFromParent = () => {
					this.isConnected = parent.isConnected;
					this.uuid = parent.uuid;
					this.context = parent.context;
					this.info = parent.info;
					this.actionInfo = parent.actionInfo;
					this.actionUuid = parent.actionUuid;

					if (this.info?.application?.language && window.i18n) {
						window.i18n.setLanguage(this.info.application.language);
					}

					for (const listener of this._connectedListeners) {
						try {
							listener(this.actionInfo, this.info);
						} catch (err) {
							console.error("[StreamDeckClient] Error in openerBridge onConnected callback:", err);
						}
					}

					if (window.opener.currentGlobalSettings) {
						for (const cb of this._didReceiveGlobalSettingsListeners) {
							cb(window.opener.currentGlobalSettings);
						}
					}
				};

				parent.onDidReceiveGlobalSettings((settings) => {
					for (const cb of this._didReceiveGlobalSettingsListeners) {
						cb(settings);
					}
				});

				if (parent.isConnected) {
					setTimeout(syncFromParent, 50);
				} else {
					parent.onConnected(() => {
						syncFromParent();
					});
				}
			}
		} catch (e) {
			console.warn("[StreamDeckClient] Could not access window.opener:", e);
		}
	}

	/**
	 * Initializes WebSocket connection with local Stream Deck application.
	 * Invoked automatically by Stream Deck via window.connectElgatoStreamDeckSocket.
	 */
	connect(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
		this.uuid = inPropertyInspectorUUID;
		this.context = inPropertyInspectorUUID;

		try {
			this.info = typeof inInfo === "string" ? JSON.parse(inInfo) : inInfo;
		} catch (_e) {
			this.info = null;
		}

		try {
			this.actionInfo = typeof inActionInfo === "string" && inActionInfo.length > 0 ? JSON.parse(inActionInfo) : null;
			this.actionUuid = this.actionInfo?.action || null;
		} catch (_e) {
			this.actionInfo = null;
		}

		// Update i18n language if available
		if (this.info?.application?.language && window.i18n) {
			window.i18n.setLanguage(this.info.application.language);
		}

		this.websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

		this.websocket.onopen = () => {
			this.isConnected = true;

			// Register Property Inspector with Stream Deck
			this.websocket.send(
				JSON.stringify({
					event: inRegisterEvent,
					uuid: inPropertyInspectorUUID,
				}),
			);

			// Query current settings and global settings
			this.getSettings();
			this.getGlobalSettings();

			// Flush any queued outbound messages
			while (this._sendQueue.length > 0) {
				const item = this._sendQueue.shift();
				if (item) {
					this.websocket.send(JSON.stringify(item));
				}
			}

			// Fire onConnected listeners
			for (const listener of this._connectedListeners) {
				try {
					listener(this.actionInfo, this.info);
				} catch (err) {
					console.error("[StreamDeckClient] Error in onConnected callback:", err);
				}
			}
		};

		this.websocket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const { event: evt, payload } = data;

				if (evt === "didReceiveSettings") {
					const settings = payload?.settings ?? payload ?? {};
					for (const cb of this._didReceiveSettingsListeners) {
						cb(settings, data);
					}
				} else if (evt === "didReceiveGlobalSettings") {
					const globalSettings = payload?.settings ?? payload ?? {};
					for (const cb of this._didReceiveGlobalSettingsListeners) {
						cb(globalSettings, data);
					}
				} else if (evt === "sendToPropertyInspector") {
					for (const cb of this._sendToPropertyInspectorListeners) {
						cb(payload, data);
					}
				}
			} catch (err) {
				console.error("[StreamDeckClient] Failed to parse incoming WebSocket message:", err);
			}
		};

		this.websocket.onclose = () => {
			this.isConnected = false;
		};

		this.websocket.onerror = (err) => {
			console.error("[StreamDeckClient] WebSocket connection error:", err);
		};
	}

	/**
	 * Sends a JSON payload over the WebSocket, queuing if not yet open.
	 */
	_send(message) {
		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(JSON.stringify(message));
		} else {
			this._sendQueue.push(message);
		}
	}

	/**
	 * Requests current action settings from the Stream Deck software.
	 */
	getSettings() {
		this._send({
			event: "getSettings",
			context: this.uuid,
		});
	}

	/**
	 * Persists action-specific settings.
	 */
	setSettings(settings) {
		this._send({
			event: "setSettings",
			context: this.uuid,
			payload: settings,
		});
	}

	/**
	 * Requests global plugin settings.
	 */
	getGlobalSettings() {
		if (this.openerBridge) {
			this.openerBridge.getGlobalSettings();
			return;
		}
		this._send({
			event: "getGlobalSettings",
			context: this.uuid,
		});
	}

	/**
	 * Persists global plugin settings.
	 */
	setGlobalSettings(settings) {
		if (this.openerBridge) {
			this.openerBridge.setGlobalSettings(settings);
			return;
		}
		this._send({
			event: "setGlobalSettings",
			context: this.uuid,
			payload: settings,
		});
	}

	/**
	 * Dispatches a message to the active action instance in the Node.js plugin.
	 */
	sendToPlugin(payload) {
		this._send({
			event: "sendToPlugin",
			action: this.actionUuid,
			context: this.uuid,
			payload,
		});
	}

	/**
	 * Requests Stream Deck host application to open an external URL.
	 */
	openUrl(url) {
		this._send({
			event: "openUrl",
			payload: { url },
		});
	}

	/**
	 * Registers a listener for action settings updates.
	 */
	onDidReceiveSettings(callback) {
		this._didReceiveSettingsListeners.push(callback);
	}

	/**
	 * Registers a listener for global settings updates.
	 */
	onDidReceiveGlobalSettings(callback) {
		this._didReceiveGlobalSettingsListeners.push(callback);
	}

	/**
	 * Registers a listener for direct plugin messages (`sendToPropertyInspector`).
	 */
	onSendToPropertyInspector(callback) {
		this._sendToPropertyInspectorListeners.push(callback);
	}

	/**
	 * Registers a listener for successful WebSocket connection establishment.
	 */
	onConnected(callback) {
		this._connectedListeners.push(callback);
		if (this.isConnected) {
			try {
				callback(this.actionInfo, this.info);
			} catch (err) {
				console.error("[StreamDeckClient] Error in onConnected callback:", err);
			}
		}
	}
}

// Global Singleton Instance
const streamDeckInstance = new StreamDeckClientBridge();
window.streamDeck = streamDeckInstance;
window.StreamDeckClient = streamDeckInstance;

/**
 * Official Stream Deck entry point callback invoked when PI loads.
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
	streamDeckInstance.connect(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo);
}
