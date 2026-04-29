import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export function initUpdater(mainWindow: BrowserWindow | null) {
  // Check for updates after 3s delay
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info.version);
    logger.info(`Update available: ${info.version}`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info.version);
    logger.info(`Update downloaded: ${info.version}`);
  });

  autoUpdater.on('error', (err) => {
    logger.error(err, 'Update error');
  });
}
