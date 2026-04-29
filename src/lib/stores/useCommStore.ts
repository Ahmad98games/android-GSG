import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CommLogEntry {
  id: string;
  recipient: string;
  message: string;
  timestamp: number;
  status: 'sent' | 'failed';
  type: 'whatsapp';
}

interface CommState {
  logs: CommLogEntry[];
  addLog: (entry: Omit<CommLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

/**
 * NOXIS COMM_STORE: Local Communications Log
 */
export const useCommStore = create<CommState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (entry) => set((state) => ({
        logs: [
          {
            ...entry,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
          },
          ...state.logs
        ].slice(0, 100) // Keep last 100 logs
      })),
      clearLogs: () => set({ logs: [] })
    }),
    {
      name: 'noxis-comm-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
