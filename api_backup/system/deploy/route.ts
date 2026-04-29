import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * OMNORA DEPLOYMENT API (v1.0.0)
 * 
 * Handles APK uploads, SHA-256 generation, and version.json updates.
 */

const DEPLOY_DIR = path.join(process.cwd(), 'public', 'deploy');
const VERSION_FILE = path.join(DEPLOY_DIR, 'version.json');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('apk') as File;
    const version = formData.get('version') as string;
    const notes = formData.get('notes') as string;

    if (!file || !version) {
      return NextResponse.json({ error: 'Missing APK or version string' }, { status: 400 });
    }

    // Ensure deploy directory exists
    if (!fs.existsSync(DEPLOY_DIR)) {
      fs.mkdirSync(DEPLOY_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Generate SHA-256 for integrity verification
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Save APK to public/deploy
    const fileName = `omnora-node-v${version}.apk`;
    const filePath = path.join(DEPLOY_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // 3. Update version.json
    const versionData = {
      latest_version: version,
      release_notes: notes || "System improvements.",
      download_url: `/deploy/${fileName}`,
      sha256: hash,
      updated_at: new Date().toISOString()
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));

    console.info(`[OTA-Deploy] New version ${version} deployed. Hash: ${hash}`);

    return NextResponse.json({ success: true, version: versionData });

  } catch (err) {
    console.error('[OTA-Deploy] Upload failed:', err);
    return NextResponse.json({ error: 'Deployment failed' }, { status: 500 });
  }
}
