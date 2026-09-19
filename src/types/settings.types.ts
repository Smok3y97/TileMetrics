/**
 * Global and Action-specific Stream Deck plugin settings.
 */

export interface BeszelServerConfig {
	id: string;
	name: string;
	url: string;
	username?: string;
	password?: string;
	token?: string;
	rejectUnauthorized?: boolean;
	[key: string]: boolean | string | undefined;
}

export interface GlobalSettings {
	servers?: BeszelServerConfig[];
	globalInterval?: number; // Polling cadence in seconds (default: 30)
	tempUnit?: "C" | "F"; // Temperature display unit (default: 'C')
	[key: string]: BeszelServerConfig[] | number | "C" | "F" | undefined;
}

export interface ActionSettings {
	serverId?: string;
	hostId?: string;
	subMetric?: string;
	interfaceOrMount?: string;
	enableHistory?: boolean;
	historyPoints?: number; // 15, 30, 60 (default: 20)
	warnThreshold?: number; // Default 75
	critThreshold?: number; // Default 90
	[key: string]: boolean | number | string | undefined;
}
