const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const waitOn = require('wait-on');

let win;
let isMaximized = false;

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    maxWidth: 1920,
    maxHeight: 1080,
    resizable: true,
    fullscreenable: false,
    frame: true,
    icon: path.join(__dirname, 'src', 'assets', 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  Menu.setApplicationMenu(null);

  if (process.env.NODE_ENV === 'development') {
    await waitOn({ resources: ['http://localhost:5173'] });
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('maximize', () => {
    isMaximized = true;
  });

  win.on('unmaximize', () => {
    isMaximized = false;
    win.setBounds({ width: 1000, height: 800 });
  });

  // ESC 눌렀을 때 복원되도록
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && isMaximized) {
      win.unmaximize();
    }
  });

  win.on('will-resize', (event, newBounds) => {
    if (!isMaximized) {
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
