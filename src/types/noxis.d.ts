export interface NoxisAPI {
  app: {
    version: string;
    platform: string;
    getPath: (name: string) => Promise<string>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (cb: (isMaximized: boolean) => void) => void;
  };
  tray: {
    setStatus: (status: 'online' | 'degraded' | 'offline') => void;
    setNodeCount: (n: number) => void;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
  };
  whatsapp: {
    openChat: (phone: string, message: string) => void;
    isLinked: () => Promise<boolean>;
  };
  updater: {
    checkForUpdates: () => void;
    onUpdateAvailable: (cb: (version: string) => void) => void;
    onUpdateDownloaded: (cb: (version: string) => void) => void;
    installUpdate: () => void;
  };
  shell: {
    openExternal: (url: string) => void;
  };
}

declare global {
  interface Window {
    noxis: NoxisAPI;
  }
}
