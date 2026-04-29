/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require('electron');
const { getHardwareTier } = require('./hardware-utils');

// Tier-Based Initialization
const tier = getHardwareTier();
console.info(`[Electron] Detected Hardware Tier: ${tier}`);

if (tier === 'LITE') {
  console.warn('[Electron] LITE Tier detected. Forcing DISABLE_HARDWARE_ACCELERATION = true.');
  app.disableHardwareAcceleration();
}

// Process Singleton: Implement requestSingleInstanceLock to prevent "Zombies"
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');

// Crash Logging: Uncaught Exceptions
process.on('uncaughtException', (error) => {
  try {
    fs.appendFileSync(path.join(__dirname, 'crash-report.txt'), `[${new Date().toISOString()}] Uncaught Exception: ${error.stack || error}\n`);
  } catch (err) {
    console.error('Failed to write to crash-report.txt', err);
  }
});

// Handle Squirrel events for Windows
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Load environment variables for industrial services
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();


const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Gold She Hub",
    autoHideMenuBar: true,
    show: false, // Smart Show
    backgroundColor: '#121417', // AESTHETIC: Slate v9.0
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Smart Show: Triggered when fully painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.maximize();
  });

  // Crash Logging: Web Contents Fail Load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    try {
      fs.appendFileSync(path.join(__dirname, 'crash-report.txt'), `[${new Date().toISOString()}] WebContents failed to load: ${errorCode} - ${errorDescription} at ${validatedURL}\n`);
    } catch (err) {
      console.error('Failed to write to crash-report.txt', err);
    }
  });

  // Load the Next.js app via custom server
  const port = process.env.PORT || 3000;
  mainWindow.loadURL(`http://localhost:${port}`);
  if (!app.isPackaged) {
    // Open the DevTools for debugging
    mainWindow.webContents.openDevTools();
  }
};


app.on('ready', async () => {
  console.info('[Electron] Booting system services...');
  
  try {
    // Pillar 5: Production Efficiency
    // If packaged, we run the compiled JS server. Otherwise, we use ts-node.
    if (app.isPackaged) {
      console.info('[Electron] Running in Production Mode. Loading compiled server...');
      // Ensure we are loading from the asar or the resources folder
      const serverPath = path.join(__dirname, 'dist', 'server.js');
      try {
        require(serverPath);
      } catch (err) {
        console.error('[Electron] Failed to load compiled server:', err);
      }
    } else {
      console.info('[Electron] Running in Development Mode. Loading TypeScript server...');
      // Register TS support for the server
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
          module: "CommonJS",
          target: "ESNext",
          allowJs: true,
          esModuleInterop: true
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./server.ts');
    }
    
    // Pillar 4: Industrial Resilience — Wait for Next.js to be fully ready
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const net = require('node:net');
    const checkPort = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        console.info('[Electron] Next.js Server Detected. Launching Dashboard...');
        createWindow();
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(checkPort, 1000); // Retry every second
      });
      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(checkPort, 1000);
      });
      const port = process.env.PORT || 3000;
      socket.connect(port, '127.0.0.1');
    };

    console.info('[Electron] Waiting for Next.js initialization...');
    checkPort();
    
  } catch (err) {
    console.error('[Electron] Failed to start background server:', err);
  }
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
