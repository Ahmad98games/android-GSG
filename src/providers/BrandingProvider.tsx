'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BrandingContextType {
  businessName: string;
  businessLogo: string;
  updateBranding: (name: string, logo: string) => Promise<void>;
  isLoaded: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessName, setBusinessName] = useState('Noxis Sentinel');
  const [businessLogo, setBusinessLogo] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      if (typeof window !== 'undefined' && window.noxis) {
        const name = await window.noxis.store.get('businessName');
        const logo = await window.noxis.store.get('businessLogo');
        if (typeof name === 'string') setBusinessName(name);
        if (typeof logo === 'string') setBusinessLogo(logo);
      }
      setIsLoaded(true);
    }
    loadBranding();
  }, []);

  const updateBranding = async (name: string, logo: string) => {
    setBusinessName(name);
    setBusinessLogo(logo);
    if (window.noxis) {
      await window.noxis.store.set('businessName', name);
      await window.noxis.store.set('businessLogo', logo);
    }
  };

  return (
    <BrandingContext.Provider value={{ businessName, businessLogo, updateBranding, isLoaded }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
