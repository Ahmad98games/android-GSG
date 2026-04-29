import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import store from './store';
import { initUpdater } from './updater';
import { autoUpdater } from 'electron-updater';
import pino from 'pino';

// Initialize Logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayMenu: Menu | null = null;
let isQuitting = false;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: store.get('windowBounds.width'),
    height: store.get('windowBounds.height'),
    x: store.get('windowBounds.x'),
    y: store.get('windowBounds.y'),
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    backgroundColor: '#121417',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: path.join(__dirname, '../assets/icons/noxis-icon.ico')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../out/index.html');
    mainWindow.loadFile(indexPath);
  }

  const minSplashTime = 2500;
  const startTime = Date.now();

  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minSplashTime - elapsed);

    setTimeout(() => {
      if (splashWindow) {
        splashWindow.webContents.executeJavaScript('window.fadeOut()');
        setTimeout(() => {
          splashWindow?.close();
          splashWindow = null;
          mainWindow?.show();
          initUpdater(mainWindow);
        }, 300);
      } else {
        mainWindow?.show();
        initUpdater(mainWindow);
      }
    }, remaining);
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    } else {
      // Save window bounds
      const bounds = mainWindow?.getBounds();
      if (bounds) {
        store.set('windowBounds', bounds);
      }
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icons/noxis-tray.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  trayMenu = Menu.buildFromTemplate([
    { label: 'Open Noxis Dashboard', click: () => mainWindow?.show() },
    { 
      label: 'Node Status', 
      submenu: [
        { label: 'Nodes Connected: 0', enabled: false, id: 'node-count' }
      ] 
    },
    { 
      label: 'Sync Status', 
      submenu: [
        { label: 'Last Sync: Never', enabled: false, id: 'last-sync' },
        { label: 'Pending Queue: 0', enabled: false, id: 'pending-count' }
      ] 
    },
    { type: 'separator' },
    { label: 'Restart TCP Bridge', click: () => mainWindow?.webContents.send('restart-tcp-bridge') },
    { type: 'separator' },
    { label: 'Quit Noxis', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('Noxis v9.0 — Mesh Active');
  tray.setContextMenu(trayMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// IPC Handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.hide());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized());

ipcMain.on('store-set', (event, key, value) => store.set(key, value));
ipcMain.handle('store-get', (event, key) => store.get(key));
ipcMain.on('store-delete', (event, key) => store.delete(key));

ipcMain.on('shell-open-external', (event, url) => shell.openExternal(url));

ipcMain.on('tray-set-status', (event, status) => {
  const color = status === 'online' ? 'green' : status === 'degraded' ? 'amber' : 'red';
  const iconPath = path.join(__dirname, `../assets/icons/noxis-tray-${color}.png`);
  if (fs.existsSync(iconPath)) {
    tray?.setImage(nativeImage.createFromPath(iconPath));
  }
});

ipcMain.on('tray-set-node-count', (event, count) => {
  const item = trayMenu?.getMenuItemById('node-count');
  if (item) {
    item.label = `Nodes Connected: ${count}`;
    tray?.setContextMenu(trayMenu!);
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

app.on('ready', () => {
  logger.info('Noxis OS v9.0 — Booting Industrial Kernel');
  createSplash();
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
