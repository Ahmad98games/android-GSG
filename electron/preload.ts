import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('noxis', {
  app: {
    version: process.env.npm_package_version || '9.0.0',
    platform: process.platform,
    getPath: (name: string) => ipcRenderer.invoke('app-get-path', name)
  },
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximizeChange: (cb: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window-maximize-change', (_, isMaximized) => cb(isMaximized));
    }
  },
  tray: {
    setStatus: (status: 'online' | 'degraded' | 'offline') => ipcRenderer.send('tray-set-status', status),
    setNodeCount: (n: number) => ipcRenderer.send('tray-set-node-count', n)
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: unknown) => ipcRenderer.send('store-set', key, value),
    delete: (key: string) => ipcRenderer.send('store-delete', key)
  },
  whatsapp: {
    openChat: (phone: string, message: string) => {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      ipcRenderer.send('shell-open-external', url);
    },
    isLinked: async () => {
      const number = await ipcRenderer.invoke('store-get', 'whatsappBusinessNumber');
      return !!number;
    }
  },
  updater: {
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    onUpdateAvailable: (cb: (version: string) => void) => {
      ipcRenderer.on('update-available', (_, version) => cb(version));
    },
    onUpdateDownloaded: (cb: (version: string) => void) => {
      ipcRenderer.on('update-downloaded', (_, version) => cb(version));
    },
    installUpdate: () => ipcRenderer.send('install-update')
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.send('shell-open-external', url)
  }
});
