/**
 * GET /api/ecosystem/mesh/messages
 *
 * Paginated message history from the hub's SQLite store.
 *
 * Query params:
 *   conversationId  — required, the conversation to fetch
 *   limit           — optional, default 50, max 200
 *   before          — optional, Unix ms timestamp for cursor pagination
 *
 * Returns messages oldest-first for UI rendering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const limitStr = searchParams.get('limit');
    const beforeStr = searchParams.get('before');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId query param required' },
        { status: 400 }
      );
    }

    const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 200);
    const before = beforeStr ? parseInt(beforeStr, 10) : undefined;

    const hub = getHubServer();
    const messages = hub.store.getMessageHistory(conversationId, limit, before);


    return NextResponse.json({
      conversationId,
      messages,
      count: messages.length,
      hasMore: messages.length === limit,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
