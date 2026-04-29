'use server';

import { db } from '@/lib/prisma';
import { IndustryType } from '@/lib/constants/vocabulary';
import { getHubServer } from '@/lib/mesh/node-server';

// GOLD SHE MESH — Production Branding Engine (v2.0)

/**
 * GOLD SHE MESH — Settings Actions
 * READ FROM LOCAL TRUTH (SQLite)
 */

export async function getSystemSettings() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (db.systemSettings as any).findUnique({
      where: { id: 1 },
    });


    if (!settings) return null;

    return {
      factoryName: settings.factoryName,
      companyLogo: settings.companyLogo,
      themeId: settings.themeId,
      industryType: settings.industryType as IndustryType,
      onboardingComplete: settings.onboardingComplete,
      // We don't return the password to the client, but we need to check it in other actions
    };
  } catch (error) {
    console.error('[Settings Action] Fetch failed:', error);
    return null;
  }
}

export async function verifyMasterPassword(password: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (db.systemSettings as any).findUnique({
      where: { id: 1 },
      select: { masterPassword: true }
    });


    if (!settings?.masterPassword) return true; // Auto-pass if not set (for initial setup)
    return settings.masterPassword === password;
  } catch {
    return false;
  }
}

export async function completeOnboarding(data: {
  factoryName: string,
  industryType: IndustryType,
  companyLogo?: string,
  themeId?: string,
  masterPassword?: string,
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (db.systemSettings as any).upsert({
      where: { id: 1 },

      update: { 
        industryType: data.industryType, 
        factoryName: data.factoryName,
        companyLogo: data.companyLogo,
        themeId: data.themeId || 'onyx-gold',
        masterPassword: data.masterPassword,
        onboardingComplete: true 
      },
      create: { 
        id: 1, 
        industryType: data.industryType, 
        factoryName: data.factoryName,
        companyLogo: data.companyLogo,
        themeId: data.themeId || 'onyx-gold',
        masterPassword: data.masterPassword,
        onboardingComplete: true 
      },
    });




    // Notify Mesh Network of Vocabulary Change
    try {
      const hub = getHubServer();
      hub.broadcastVocabulary(data.industryType);
    } catch (err) {
      console.warn('[Settings Action] Could not broadcast vocabulary:', err);
    }

    return { success: true, settings };
  } catch (error) {
    console.error('[Settings Action] Onboarding failed:', error);
    return { success: false, error: 'DATABASE_WRITE_ERROR' };
  }
}