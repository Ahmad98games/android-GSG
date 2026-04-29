'use client';

import React, { useState, useEffect } from 'react';
import { Rocket, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '@/providers/BrandingProvider';

export const UpdateBanner = () => {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; status: 'available' | 'downloaded' } | null>(null);
  const [visible, setVisible] = useState(false);
  const { businessName } = useBranding();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.noxis) {
      window.noxis.updater.onUpdateAvailable((version: string) => {
        setUpdateInfo({ version, status: 'available' });
        setVisible(true);
      });

      window.noxis.updater.onUpdateDownloaded((version: string) => {
        setUpdateInfo({ version, status: 'downloaded' });
        setVisible(true);
      });
    }
  }, []);

  const handleInstall = () => {
    if (typeof window !== 'undefined' && window.noxis) {
      window.noxis.updater.installUpdate();
    }
  };

  return (
    <AnimatePresence>
      {visible && updateInfo && (
        <motion.div 
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`h-10 w-full flex items-center justify-between px-6 z-[900] ${
            updateInfo.status === 'downloaded' ? 'bg-[#60A5FA] text-[#121417]' : 'bg-[#C5A059] text-[#121417]'
          }`}
        >
          <div className="flex items-center gap-3">
            {updateInfo.status === 'downloaded' ? <Rocket className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {updateInfo.status === 'available' 
                ? `${businessName} v${updateInfo.version} is available — downloading in background...`
                : `Update ready! Restart to apply ${businessName} v${updateInfo.version}`
              }
            </span>
          </div>

          <div className="flex items-center gap-4">
            {updateInfo.status === 'downloaded' && (
              <button 
                onClick={handleInstall}
                className="bg-[#121417] text-white px-4 py-1 rounded-md text-[8px] font-black uppercase hover:scale-105 transition-all"
              >
                RESTART NOW
              </button>
            )}
            <button 
              onClick={() => setVisible(false)}
              className="p-1 hover:bg-black/10 rounded-md transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
