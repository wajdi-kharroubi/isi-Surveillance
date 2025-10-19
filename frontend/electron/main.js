const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;
let backendReady = false;

// Démarrer le backend Python
function startPythonBackend() {
  const isDev = !app.isPackaged;
  
  return new Promise((resolve, reject) => {
    if (isDev) {
      // En développement: lancer Python directement
      console.log('🐍 Démarrage du backend Python (mode développement)...');
      const backendDir = path.join(__dirname, '..', '..', 'backend');
      pythonProcess = spawn('python', ['main.py'], {
        cwd: backendDir,
        env: { ...process.env }
      });
    } else {
      // En production: lancer l'exécutable PyInstaller
      const backendExe = path.join(process.resourcesPath, 'backend', 'surveillance_backend.exe');
      const backendDir = path.join(process.resourcesPath, 'backend');
      
      console.log('🐍 Démarrage du backend (mode production)...');
      console.log('Backend exe:', backendExe);
      console.log('Backend dir:', backendDir);
      
      // Vérifier que l'exécutable existe
      if (!fs.existsSync(backendExe)) {
        console.error('❌ surveillance_backend.exe not found:', backendExe);
        reject(new Error('Backend executable not found'));
        return;
      }
      
      // Lancer l'exécutable PyInstaller
      pythonProcess = spawn(backendExe, [], {
        cwd: backendDir,
        env: { ...process.env },
        windowsHide: true // Hide console window on Windows
      });
    }
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Backend: ${output}`);
      
      // Détecter quand le serveur est prêt
      if (output.includes('Uvicorn running') || output.includes('Application startup complete') || output.includes('📡 API disponible')) {
        backendReady = true;
        resolve();
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Backend Error: ${output}`);
      
      // Uvicorn logs to stderr even for normal messages
      if (output.includes('Uvicorn running') || output.includes('Application startup complete') || output.includes('📡 API disponible')) {
        backendReady = true;
        resolve();
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendReady = false;
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });
    
    // Timeout de sécurité - give more time for backend startup
    setTimeout(() => {
      if (!backendReady) {
        console.log('⚠️  Backend started but not responding yet, continuing anyway...');
        resolve();
      }
    }, 8000);
  });
}

// Créer la fenêtre principale
function createWindow() {
  let iconPath;
  if (app.isPackaged) {
    // Try multiple possible locations for the icon
    const possiblePaths = [
      path.join(process.resourcesPath, 'app.asar', 'public', 'icon.png'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'icon.png'),
      path.join(__dirname, 'icon.png')
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        iconPath = p;
        break;
      }
    }
    
    if (!iconPath) {
      console.warn('Icon not found in packaged app');
      iconPath = path.join(__dirname, '../public/icon.png'); // fallback
    }
  } else {
    iconPath = path.join(__dirname, '../public/icon.png');
  }
    
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
    icon: iconPath,
    title: 'Gestion des Surveillances',
    show: false,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true, // Cacher la barre de menu par défaut
  });

  // Charger l'application
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, files are inside app.asar
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Lifecycle de l'application
app.whenReady().then(async () => {
  console.log('🚀 Application starting...');
  
  try {
    // Démarrer le backend et attendre qu'il soit prêt
    await startPythonBackend();
    console.log('✅ Backend ready');
    
    // Attendre un peu plus pour être sûr
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Créer la fenêtre
    createWindow();
    console.log('✅ Window created');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    // Créer la fenêtre quand même pour afficher une erreur à l'utilisateur
    createWindow();
  }

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
