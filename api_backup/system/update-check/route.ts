import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * OMNORA OTA UPDATE API (v1.0.0)
 * 
 * Serves the latest mobile version info and download path.
 */

const DEPLOY_DIR = path.join(process.cwd(), 'public', 'deploy');
const VERSION_FILE = path.join(DEPLOY_DIR, 'version.json');

export async function GET() {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      return NextResponse.json({
        latest_version: "1.0.0",
        release_notes: "Initial industrial release.",
        download_url: null,
        sha256: null
      });
    }

    const data = fs.readFileSync(VERSION_FILE, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch update info' }, { status: 500 });
  }
}
