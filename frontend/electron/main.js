const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

// Démarrer le backend Python
function startPythonBackend() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // En développement: lancer Python directement
    console.log('🐍 Démarrage du backend Python (mode développement)...');
    pythonProcess = spawn('python', ['../backend/main.py'], {
      cwd: __dirname
    });
  } else {
    // En production: lancer l'exécutable Python
    const backendPath = path.join(process.resourcesPath, 'backend', 'main.exe');
    console.log('🐍 Démarrage du backend Python (mode production)...');
    pythonProcess = spawn(backendPath);
  }
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

// Créer la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Gestion des Surveillances',
    show: false
  });

  // Charger l'application
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Lifecycle de l'application
app.whenReady().then(() => {
  // Démarrer le backend
  startPythonBackend();
  
  // Attendre que le backend soit prêt (2 secondes)
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Arrêter le processus Python
  if (pythonProcess) {
    console.log('🛑 Arrêt du backend Python...');
    pythonProcess.kill();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-backend-url', () => {
  return 'http://localhost:8000';
});
