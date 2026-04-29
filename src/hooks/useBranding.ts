'use client';

import { useIndustryVocabulary } from '@/providers/IndustryProvider';

/**
 * HUB_OS — Branding Engine Hook
 * Provides dynamic white-labeling data across the application.
 */
export function useBranding() {
  const { factoryName, companyLogo } = useIndustryVocabulary();

  return {
    currentName: factoryName || 'SYSTEM_HUB',
    currentLogo: companyLogo, // Base64 or null
    isWhiteLabeled: !!companyLogo,
    founderSignature: process.env.NEXT_PUBLIC_FOUNDER_MODE === 'true' 
      ? 'CORE_ENGINE_v9' 
      : null
  };
}
