/**
 * GET /api/telemetry/snippet
 * 
 * Pillar 4: Local Video Bridge
 * Streams local .mp4 CCTV snippets to the browser for forensic audit.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  // Resolve path and ensure it exists
  // WARNING: In a production environment, we should restrict the base directory
  // to prevent arbitrary file read vulnerabilities.
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      // @ts-expect-error - ReadableStream conversion required for Node.js ReadStream in Next.js Response
      return new Response(file, { status: 206, headers: head });
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      const file = fs.createReadStream(filePath);
      // @ts-expect-error - ReadStream to BodyInit cast for video streaming
      return new Response(file, { status: 200, headers: head });
    }
  } catch (err) {
    console.error('[SnippetAPI] Error:', err);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
