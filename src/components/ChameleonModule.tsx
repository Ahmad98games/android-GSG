'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface ChameleonModuleProps {
  moduleName: string;
  allowedProfiles: string[];
  children: React.ReactNode;
}

/**
 * Chameleon Component: Visible only if the Active_Profile matches.
 * Pillar 4: Industrial Hierarchy.
 */
export const ChameleonModule: React.FC<ChameleonModuleProps> = ({ 
  moduleName, 
  allowedProfiles, 
  children 
}) => {
  const { data: manifest, isLoading } = useQuery({
    queryKey: ['ui-manifest'],
    queryFn: async () => {
      const res = await fetch('/api/config/ui-manifest');
      return res.json();
    }
  });

  if (isLoading) return null;

  const currentProfile = manifest?.profile || 'GENERAL';
  const isVisible = allowedProfiles.includes(currentProfile);

  if (!isVisible) return null;

  return (
    <div className="module-container border border-slate-800 bg-[#181B1F] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{moduleName}</h3>
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      </div>
      {children}
    </div>
  );
};
