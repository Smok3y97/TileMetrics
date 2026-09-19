/**
 * PocketBase and Beszel API telemetry structures.
 */

export interface BeszelSystemInfo {
	h?: string; // hostname
	k?: string; // kernel
	m?: string; // model / OS
	c?: number; // cpu cores
	t?: number; // total memory (bytes)
	d?: number; // disk total (bytes)
	u?: number; // uptime (seconds)
	v?: string; // agent version
	g?: string; // GPU model
}

export interface BeszelSystem {
	id: string;
	name: string;
	status: string | "down" | "paused" | "up";
	info?: BeszelSystemInfo;
	host?: string;
	port?: string;
	created?: string;
	updated?: string;
}

export interface BeszelSystemListResponse {
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	items: BeszelSystem[];
}

export interface BeszelDiskStat {
	disk: string; // mountpoint or device e.g. "/" or "/mnt/data"
	total: number; // total capacity in bytes or GB
	used: number; // used capacity in bytes or GB
	pct?: number; // percentage (0-100)
	read?: number; // read throughput bytes/s
	write?: number; // write throughput bytes/s
}

export interface BeszelNetStat {
	name: string; // interface name e.g. "eth0"
	rx: number; // received bytes/s
	tx: number; // transmitted bytes/s
}

export interface BeszelGpuStat {
	name?: string;
	pct?: number; // core load %
	mem_pct?: number; // vram %
	mem_used?: number;
	mem_total?: number;
	temp?: number; // temp in Celsius
	power?: number; // power in Watts
	fan?: number; // fan speed %
}

export interface BeszelUpsStat {
	pct?: number; // charge %
	status?: string; // e.g. "Online", "On Battery", "OL", "OB"
	runtime?: number; // minutes remaining
	load?: number; // load %
}

export interface BeszelGpuEntry {
	n?: string; // name
	u?: number; // usage %
	mu?: number; // memory used (MB)
	mt?: number; // memory total (MB)
	p?: number; // power (W)
	temp?: number; // temperature
}

export interface BeszelExtraFsEntry {
	d?: number; // disk total (GB)
	du?: number; // disk used (GB)
	tr?: number; // total read
	tw?: number; // total write
}

export interface BeszelStatsData {
	// CPU metrics
	cpu?: number; // CPU total %
	cpum?: number; // peak CPU %
	cpub?: number[]; // cpu breakdown
	cpus?: number[]; // per-core cpu
	la?: [number, number, number]; // 1m, 5m, 15m load average
	loadavg?: [number, number, number];
	t?: Record<string, number>; // temperatures map
	cpu_temp?: number;

	// Memory metrics
	m?: number; // Total memory (GB)
	mu?: number; // Used memory (GB)
	mp?: number; // Memory percentage %
	mb?: number; // Buffer/cache (GB)
	mz?: number; // ZFS ARC (GB)
	s?: number; // Swap total (GB)
	su?: number; // Swap used (GB)
	mem?: number;
	mem_pct?: number;
	swap_pct?: number;
	zfs_arc_pct?: number;

	// Storage & Disks
	d?: number; // Root disk total (GB)
	du?: number; // Root disk used (GB)
	dp?: number; // Root disk percentage %
	dr?: number; // Root disk read MB/s
	dw?: number; // Root disk write MB/s
	efs?: Record<string, BeszelExtraFsEntry>; // Extra filesystems
	disk?: BeszelDiskStat[];
	disks?: BeszelDiskStat[];

	// Network
	ns?: number; // Network sent (MB/s)
	nr?: number; // Network received (MB/s)
	b?: [number, number]; // Bandwidth bytes [sent, recv]
	ni?: Record<string, [number, number, number, number]>; // [upload bytes, download bytes, total upload, total download]
	net?: BeszelNetStat[];
	interfaces?: BeszelNetStat[];

	// GPU
	g?: Record<string, BeszelGpuEntry>; // map of GPU ID to GPUData
	gpu?: BeszelGpuStat[];
	gpus?: BeszelGpuStat[];

	// UPS / Battery
	bat?: [number, number | string]; // [percent, state]
	bats?: Record<string, number>;
	ups?: BeszelUpsStat;
}

export interface BeszelStatsRecord {
	id: string;
	system: string; // System ID reference
	created: string; // ISO 8601 timestamp
	updated?: string;
	stats: BeszelStatsData;
}

export interface BeszelStatsListResponse {
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	items: BeszelStatsRecord[];
}

export interface BeszelAuthResponse {
	token: string;
	record?: {
		id: string;
		email?: string;
		username?: string;
	};
}
