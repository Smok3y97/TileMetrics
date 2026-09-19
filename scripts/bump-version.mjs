/**
 * Centralized Version Bump Script for TileMetrics (Beszel)
 * 
 * Synchronizes the 4-part Elgato Stream Deck specification version across:
 * 1. version.json ("version": "X.Y.Z.B")
 * 2. manifest.json ("Version": "X.Y.Z.B")
 * 3. package.json ("version": "X.Y.Z.B")
 * 4. package-lock.json ("version": "X.Y.Z.B")
 * 
 * Usage:
 *   node scripts/bump-version.mjs 0.1.1.0
 *   npm run bump 0.1.1.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const versionRegex = /^(0|[1-9]\d*)(\.(0|[1-9]\d*)){3}$/;

// 1. Determine target version
let targetVersion = process.argv[2];

const versionJsonPath = path.join(rootDir, 'version.json');

if (!targetVersion) {
	if (fs.existsSync(versionJsonPath)) {
		try {
			const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
			targetVersion = vJson.version;
		} catch { }
	}
}

if (!targetVersion) {
	console.error('❌ Error: No version specified.');
	console.error('Usage: npm run bump <major.minor.patch.build> (e.g. npm run bump 0.1.1.0)');
	process.exit(1);
}

targetVersion = targetVersion.trim().replace(/^v/i, '');

// If 3 parts provided (e.g. 0.1.1), automatically append .0 for 4-digit Elgato standard
const parts = targetVersion.split('.');
if (parts.length === 3) {
	targetVersion = `${targetVersion}.0`;
}

if (!versionRegex.test(targetVersion)) {
	console.error(`❌ Error: Invalid version format '${targetVersion}'.`);
	console.error('Expected strictly 4 numeric parts matching regex ^(0|[1-9]\\d*)(\\.(0|[1-9]\\d*)){3}$ (e.g. 0.1.1.0).');
	process.exit(1);
}

console.log(`\n🏷️ Bumping TileMetrics version to: ${targetVersion}`);

let updatedCount = 0;

// 1. Update version.json
if (fs.existsSync(versionJsonPath)) {
	const content = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
	content.version = targetVersion;
	fs.writeFileSync(versionJsonPath, JSON.stringify(content, null, 4) + '\n', 'utf8');
	console.log(`  ✓ Updated version.json`);
	updatedCount++;
}

// 2. Update manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
	const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	content.Version = targetVersion;
	fs.writeFileSync(manifestPath, JSON.stringify(content, null, 4) + '\n', 'utf8');
	console.log(`  ✓ Updated manifest.json`);
	updatedCount++;
}

// 3. Update package.json
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
	const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	content.version = targetVersion;
	fs.writeFileSync(pkgPath, JSON.stringify(content, null, 4) + '\n', 'utf8');
	console.log(`  ✓ Updated package.json`);
	updatedCount++;
}

// 4. Update package-lock.json if present
const pkgLockPath = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(pkgLockPath)) {
	try {
		const content = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
		content.version = targetVersion;
		if (content.packages && content.packages['']) {
			content.packages[''].version = targetVersion;
		}
		fs.writeFileSync(pkgLockPath, JSON.stringify(content, null, 4) + '\n', 'utf8');
		console.log(`  ✓ Updated package-lock.json`);
		updatedCount++;
	} catch (e) {
		console.warn(`  ⚠️ Could not update package-lock.json: ${e.message}`);
	}
}

console.log(`\n✅ Successfully synchronized ${updatedCount} version files to ${targetVersion}!\n`);
