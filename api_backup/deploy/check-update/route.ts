import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const versionPath = join(process.cwd(), 'public', 'deploy', 'version.json');
    const data = await readFile(versionPath, 'utf-8');
    const versionData = JSON.parse(data);
    
    // Add full host URL logic if needed, but relative should be fine 
    // if the mobile app resolves it against the hub's IP
    return NextResponse.json(versionData);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // No updates uploaded yet
      return NextResponse.json({
        version: '0.0.0',
        timestamp: new Date().toISOString(),
        checksum: '',
        url: ''
      });
    }
    console.error('Update Check Error:', error);
    return NextResponse.json({ error: 'Failed to check update status.' }, { status: 500 });
  }
}
