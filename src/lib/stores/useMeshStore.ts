import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encryptMessage, decryptMessage } from '@/lib/crypto';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  type: 'text' | 'voice' | 'alert';
  status: 'sent' | 'delivered' | 'pending';
}

interface MeshState {
  messages: Message[];
  addMessage: (content: string, type?: 'text' | 'voice' | 'alert') => Promise<void>;
  clearHistory: () => void;
}

/**
 * NOXIS MESH_STORE: Persistent P2P State Management
 */
export const useMeshStore = create<MeshState>()(
  persist(
    (set, get) => ({
      messages: [],

      addMessage: async (content, type = 'text') => {
        const encrypted = await encryptMessage(content);
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'Self',
          content: encrypted,
          timestamp: Date.now(),
          type,
          status: 'sent'
        };

        set((state) => ({
          messages: [...state.messages, newMessage]
        }));
      },

      clearHistory: () => set({ messages: [] })
    }),
    {
      name: 'noxis-mesh-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
