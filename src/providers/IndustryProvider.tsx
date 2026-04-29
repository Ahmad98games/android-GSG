'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
// import { getSystemSettings } from '@/lib/actions/settings';
import { Capacitor } from '@capacitor/core';
import { VOCABULARIES, Vocabulary, IndustryType } from '@/lib/constants/vocabulary';

import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

interface IndustryContextType {
  industry: IndustryType;
  t: Vocabulary;
  loading: boolean;
  factoryName: string;
  companyLogo: string | null;
  themeId: string;
}

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

export function IndustryProvider({ children }: { children: React.ReactNode }) {
  const [industry, setIndustry] = useState<IndustryType>('logistics');
  const [factoryName, setFactoryName] = useState('SYSTEM_HUB');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<string>('onyx-gold');
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      // For Static Export / Capacitor, we rely on LocalStorage
      const storedIndustry = localStorage.getItem('INDUSTRY_TYPE') as IndustryType;
      const storedTheme = localStorage.getItem('THEME_PRESET');
      const storedFactory = localStorage.getItem('FACTORY_NAME');
      const storedOnboarding = localStorage.getItem('ONBOARDING_COMPLETE');

      if (storedIndustry) {
        setIndustry(storedIndustry);
        setFactoryName(storedFactory || 'SYSTEM_HUB');
        setThemeId(storedTheme || 'onyx-gold');
        setOnboardingComplete(storedOnboarding === 'true');
      } else {
        // Only try server if not on native Capacitor
        if (!Capacitor.isNativePlatform()) {
           // This will be stripped or fail gracefully in static export
           // For now, we assume onboarding is needed if no localStorage
           setOnboardingComplete(false);
        } else {
           setOnboardingComplete(false);
        }
      }
    } catch (err) {
      console.error('[IndustryProvider] Failed to fetch system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleOnboardingComplete = (newIndustry: IndustryType) => {
    setIndustry(newIndustry);
    setOnboardingComplete(true);
    void fetchSettings();
  };

  const value = useMemo(() => ({
    industry,
    t: VOCABULARIES[industry] || VOCABULARIES.logistics,
    loading,
    factoryName,
    companyLogo,
    themeId
  }), [industry, loading, factoryName, companyLogo, themeId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0B0D0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-32 bg-[#1C2028] rounded-full overflow-hidden">
            <div className="h-full bg-[#60A5FA] animate-progress-loading" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#60A5FA]">Initializing Mesh...</span>
        </div>
      </div>
    );
  }

  return (
    <IndustryContext.Provider value={value}>
      {!onboardingComplete && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {children}
    </IndustryContext.Provider>
  );
}

/**
 * useIndustryVocabulary Hook
 * 
 * Access dynamic, industry-specific terminology across the application.
 * 
 * Example:
 *   const { t } = useIndustryVocabulary();
 *   return <div>Total {t.unit} {t.action}</div>;
 */
export function useIndustryVocabulary() {
  const context = useContext(IndustryContext);
  if (context === undefined) {
    throw new Error('useIndustryVocabulary must be used within an IndustryProvider');
  }
  return context;
}
