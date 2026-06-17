import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

import { logger } from './util/logger';
import { ServiceHub } from './services/ServiceHub';
import { registerIpc } from './ipc/register';

let mainWindow: BrowserWindow | null = null;
let hub: ServiceHub | null = null;

const isDev = !!process.env['ELECTRON_RENDERER_URL'];

function createWindow(): void {
  const bounds = hub?.getWindowBounds();
  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1200,
    height: bounds?.height ?? 820,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0A0A0B',
    title: 'TriTone Labs · X32 Reaper Sync',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      hub?.saveWindowBounds(mainWindow.getBounds());
    }
  });

  // Open external links in the system browser; block in-app navigation.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault();
  });

  if (isDev) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.tritonelabs.x32reapersync');

    hub = new ServiceHub((channel, payload) => {
      mainWindow?.webContents.send(channel, payload);
    });
    registerIpc(hub);
    createWindow();
    logger.info('X32 Reaper Sync Tool started');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    hub?.dispose();
  });
}
