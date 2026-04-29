import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { verifyMasterPassword } from '@/lib/actions/settings';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('apk') as File | null;
    const version = formData.get('version') as string | null;
    const password = formData.get('password') as string | null;

    if (!password) {
      return NextResponse.json({ error: 'Master password is required.' }, { status: 401 });
    }

    const isValidPassword = await verifyMasterPassword(password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid master password.' }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No APK file provided.' }, { status: 400 });
    }
    
    if (!version) {
      return NextResponse.json({ error: 'No version string provided.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate SHA-256 Checksum
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buffer);
    const checksum = hashSum.digest('hex');

    // Ensure public/deploy directory exists
    const deployDir = join(process.cwd(), 'public', 'deploy');
    try {
      await mkdir(deployDir, { recursive: true });
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e;
    }

    // Save the APK
    const apkPath = join(deployDir, 'app-release.apk');
    await writeFile(apkPath, buffer);

    // Create/Update version.json
    const versionData = {
      version: version,
      timestamp: new Date().toISOString(),
      checksum: checksum,
      url: '/deploy/app-release.apk'
    };

    const versionPath = join(deployDir, 'version.json');
    await writeFile(versionPath, JSON.stringify(versionData, null, 2));

    return NextResponse.json({ success: true, versionData });

  } catch (error: any) {
    console.error('APK Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload APK.', details: error.message }, { status: 500 });
  }
}
