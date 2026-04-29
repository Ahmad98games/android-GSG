import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * GLOBAL SETTINGS STORE (v1.0.0)
 * 
 * Manages user preferences and developer overrides.
 */

interface SettingsState {
  developerMode: boolean;
  setDeveloperMode: (active: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      developerMode: false,
      setDeveloperMode: (active) => set({ developerMode: active }),
    }),
    {
      name: 'omnora-settings',
    }
  )
);
