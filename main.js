const path = require('node:path');
const { app, BrowserWindow, Menu } = require('electron');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('enable-gpu-rasterization');

  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      minWidth: 800,
      minHeight: 450,
      useContentSize: true,
      center: true,
      show: false,
      resizable: true,
      backgroundColor: '#78c6e8',
      title: 'El Viaje de Anika',
      autoHideMenuBar: true,
      webPreferences: {
        devTools: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    mainWindow.setAspectRatio(16 / 9);
    mainWindow.setMenu(null);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
    mainWindow.webContents.setZoomFactor(1);
    mainWindow.webContents.on('zoom-changed', () => {
      mainWindow.webContents.setZoomFactor(1);
    });
    mainWindow.webContents.on('context-menu', (event) => event.preventDefault());
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      if (input.key === 'F11') {
        event.preventDefault();
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        return;
      }

      if (input.key === 'F12' || (input.control && ['+', '=', '-', '0'].includes(input.key))) {
        event.preventDefault();
      }
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    mainWindow.loadFile(path.join(__dirname, 'game', 'index.html'));
  }

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
  });

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}