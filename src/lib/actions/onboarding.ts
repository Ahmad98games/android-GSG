'use server';

import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase'; // Cloud Bridge
import { IndustryType } from '@/lib/constants/vocabulary';

/**
 * GOLD SHE MESH — Onboarding Action
 * PRIMARY WRITE: SQLite (Pillar 6)
 * SECONDARY SYNC: Supabase (Optional)
 */

export async function completeOnboarding(factoryName: string, industryType: string) {
  try {
    // 1. Write to LOCAL SOURCE OF TRUTH (SQLite)
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        factoryName,
        industryType,
        onboardingComplete: true,
      },
      create: {
        id: 1,
        factoryName,
        industryType,
        onboardingComplete: true,
      },
    });

    // 2. Log the Audit Event (Rule 4)
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_CHANGE',
        entity: 'SETTINGS',
        details: `Industry set to ${industryType} for ${factoryName}`,
      },
    });

    // 3. ASYNC CLOUD BRIDGE SYNC (Pillar 6)
    // We do NOT await this or block the UI on it.
    syncToCloud(factoryName, industryType).catch(err => {
      console.warn('[Cloud Bridge] Deferred sync failed:', err);
    });

    return { success: true, settings };
  } catch (error) {
    console.error('[Onboarding Action] Local write failed:', error);
    return { success: false, error: 'Internal Database Error' };
  }
}

/**
 * Background Sync to Supabase
 * Marks the hybrid nature of the ecosystem.
 */
async function syncToCloud(factoryName: string, industryType: string) {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      factory_name: factoryName,
      industry_type: industryType,
      onboarding_complete: true,
      singleton_key: 1
    }, { onConflict: 'singleton_key' });

  if (error) throw error;
}
