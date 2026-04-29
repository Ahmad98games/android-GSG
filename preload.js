// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge } = require('electron');



// Expose a very minimal bridge to the renderer
// Only add what is absolutely necessary for the Next.js UI to interact with Electron
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});

window.addEventListener('DOMContentLoaded', () => {
  console.info('[Preload] Context bridge established.');
});
