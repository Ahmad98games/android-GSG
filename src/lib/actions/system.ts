'use server';

import { db } from '@/lib/prisma';
import fs from 'node:fs';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { verifyMasterPassword } from './settings';

/**
 * GOLD SHE MESH — Nuclear Launch Protocol (v2.0)
 * Destructive System Management Actions
 */

/**
 * SOFT RESET: SHIFT CHANGE
 * Clears transactional data but keeps system configuration.
 */
export async function softResetShift(password: string) {
  const isAuthorized = await verifyMasterPassword(password);
  if (!isAuthorized) return { success: false, error: 'UNAUTHORIZED' };

  try {
    // 1. Wipe Khata Entries
    await db.khataEntry.deleteMany({});
    
    // 2. Clear Audit Logs
    await db.auditLog.deleteMany({ where: { entity: 'KHATA' } });

    // 3. Delete physical CCTV snippets
    const snippetsDir = path.join(process.cwd(), 'public', 'snippets');
    if (fs.existsSync(snippetsDir)) {
      const files = fs.readdirSync(snippetsDir);
      for (const file of files) {
        if (file.endsWith('.mp4')) {
          fs.unlinkSync(path.join(snippetsDir, file));
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[System Action] Soft Reset Failed:', err);
    return { success: false, error: 'SYSTEM_FAULT' };
  }
}

/**
 * HARD RESET: THE FRESH START
 * Completely wipes the local instance and returns to onboarding.
 */
export async function hardResetSystem(password: string) {
  const isAuthorized = await verifyMasterPassword(password);
  if (!isAuthorized) return { success: false, error: 'UNAUTHORIZED' };

  try {
    // 1. Wipe all tables in order
    await db.syncQueue.deleteMany({});
    await db.auditLog.deleteMany({});
    await db.khataEntry.deleteMany({});
    await db.nodeRegistration.deleteMany({});
    await db.systemSettings.deleteMany({});

    // 2. Clear all physical snippets
    const snippetsDir = path.join(process.cwd(), 'public', 'snippets');
    if (fs.existsSync(snippetsDir)) {
      const files = fs.readdirSync(snippetsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(snippetsDir, file));
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[System Action] Hard Reset Failed:', err);
    return { success: false, error: 'SYSTEM_FAULT' };
  }
}
