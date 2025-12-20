const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;
let backendReady = false;

// Fonction pour s'assurer que la structure de dossiers existe
function ensureDataFolderStructure() {
  if (!app.isPackaged) {
    // Ne rien faire en mode développement
    return;
  }

  try {
    const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const dataFolder = path.join(appData, 'GestionSurveillancesISI');
    
    // Créer le dossier et les sous-dossiers s'ils n'existent pas
    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true });
      console.log('Created data folder');
    }
    
    const subFolders = ['database', 'uploads', 'exports'];
    for (const folder of subFolders) {
      const folderPath = path.join(dataFolder, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Created ${folder} folder`);
      }
    }
  } catch (error) {
    console.error('Error ensuring data folder structure:', error);
  }
}

// Fonction pour tuer le processus backend de manière robuste
function killBackendProcess() {
  if (!pythonProcess) {
    return;
  }

  console.log('Stopping backend process...');
  
  if (process.platform === 'win32') {
    // Sur Windows, utiliser taskkill pour tuer le processus et ses enfants
    try {
      const { execSync } = require('child_process');
      execSync(`taskkill /pid ${pythonProcess.pid} /T /F`, { stdio: 'ignore' });
      console.log('Backend process killed successfully');
    } catch (error) {
      console.error('Error killing backend process:', error);
      // Fallback: essayer kill simple
      try {
        pythonProcess.kill('SIGKILL');
      } catch (e) {
        console.error('Fallback kill failed:', e);
      }
    }
  } else {
    // Sur Unix/Mac, utiliser SIGTERM puis SIGKILL si nécessaire
    try {
      pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (pythonProcess && !pythonProcess.killed) {
          pythonProcess.kill('SIGKILL');
        }
      }, 1000);
    } catch (error) {
      console.error('Error killing backend process:', error);
    }
  }
  
  pythonProcess = null;
}

// Démarrer le backend Python
function startPythonBackend() {
  const isDev = !app.isPackaged;
  let resolved = false; // Flag to prevent multiple resolves
  
  return new Promise((resolve, reject) => {
    if (isDev) {
      // En développement: lancer Python directement
      console.log('Starting backend (development mode)...');
      const backendDir = path.join(__dirname, '..', '..', 'backend');
      pythonProcess = spawn('python', ['main.py'], {
        cwd: backendDir,
        env: { ...process.env }
      });
    } else {
      // En production: lancer l'exécutable PyInstaller
      const backendExe = path.join(process.resourcesPath, 'backend', 'surveillance_backend.exe');
      const backendDir = path.join(process.resourcesPath, 'backend');
      
      // Vérifier que l'exécutable existe
      if (!fs.existsSync(backendExe)) {
        console.error('Backend executable not found:', backendExe);
        reject(new Error('Backend executable not found'));
        return;
      }
      
      // Lancer l'exécutable PyInstaller
      pythonProcess = spawn(backendExe, [], {
        cwd: backendDir,
        env: { ...process.env },
        windowsHide: true // Hide console window in production
      });
    }
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Only log in development mode
      if (!app.isPackaged) {
        console.log(`[Backend]: ${output}`);
      }
      
      // Détecter quand le serveur est prêt
      if (!resolved && (output.includes('Uvicorn running') || 
          output.includes('Application startup complete') || 
          output.includes('API disponible') ||
          output.includes('started server process'))) {
        backendReady = true;
        resolved = true;
        resolve();
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Only log in development mode
      if (!app.isPackaged) {
        console.log(`[Backend]: ${output}`);
      }
      
      // Uvicorn logs to stderr even for normal messages
      if (!resolved && (output.includes('Uvicorn running') || 
          output.includes('Application startup complete') || 
          output.includes('API disponible') ||
          output.includes('started server process'))) {
        backendReady = true;
        resolved = true;
        resolve();
      }
      
      // Log critical errors even in production
      if (output.toLowerCase().includes('error') || 
          output.toLowerCase().includes('exception') ||
          output.toLowerCase().includes('traceback')) {
        console.error('Backend error:', output);
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendReady = false;
      
      if (code !== 0 && code !== null) {
        console.error(`Backend crashed with exit code ${code}`);
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
    
    // Timeout de sécurité - give more time for backend startup
    setTimeout(() => {
      if (!resolved && !backendReady) {
        // Try to ping the backend to see if it's actually running
        const http = require('http');
        const options = {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/health',
          method: 'GET',
          timeout: 2000
        };
        
        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            backendReady = true;
            if (!resolved) {
              resolved = true;
              resolve();
            }
          } else {
            if (!resolved) {
              resolved = true;
              resolve(); // Continue anyway
            }
          }
        });
        
        req.on('error', (e) => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Backend failed to start: ' + e.message));
          }
        });
        
        req.on('timeout', () => {
          req.destroy();
          if (!resolved) {
            resolved = true;
            reject(new Error('Backend health check timeout'));
          }
        });
        
        req.end();
      } else if (!resolved && backendReady) {
        // Backend is ready but somehow not resolved yet
        resolved = true;
        resolve();
      }
    }, 10000); // 10 seconds timeout
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
    // Tuer le backend quand la fenêtre principale est fermée
    killBackendProcess();
  });
}

// Lifecycle de l'application
app.whenReady().then(async () => {
  try {
    // S'assurer que la structure de dossiers existe
    ensureDataFolderStructure();
    
    // Démarrer le backend et attendre qu'il soit prêt
    await startPythonBackend();
    
    // Attendre un peu pour être sûr que le serveur est complètement démarré
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Créer la fenêtre
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
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
  // Tuer le backend avant de quitter
  killBackendProcess();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  // Arrêter le processus Python de manière robuste
  killBackendProcess();
});

app.on('will-quit', () => {
  // Dernière tentative pour s'assurer que le backend est arrêté
  killBackendProcess();
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-backend-url', () => {
  return 'http://localhost:8000';
});

// OAuth Gmail - Open authorization window and capture callback
ipcMain.handle('open-oauth-window', async (event, authUrl) => {
  return new Promise((resolve, reject) => {
    const oauthWindow = new BrowserWindow({
      width: 600,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      parent: mainWindow,
      modal: true,
      show: false,
      title: 'Connexion Google'
    });

    oauthWindow.once('ready-to-show', () => {
      oauthWindow.show();
    });

    // Load the authorization URL
    oauthWindow.loadURL(authUrl);

    // Listen for navigation to capture the callback URL
    oauthWindow.webContents.on('will-redirect', (event, url) => {
      handleOAuthCallback(url, oauthWindow, resolve, reject);
    });

    oauthWindow.webContents.on('did-navigate', (event, url) => {
      handleOAuthCallback(url, oauthWindow, resolve, reject);
    });

    // Handle window closed before auth completes
    oauthWindow.on('closed', () => {
      reject(new Error('OAuth window was closed'));
    });
  });
});

function handleOAuthCallback(url, window, resolve, reject) {
  // Check if this is the callback URL
  if (url.includes('oauth2callback') || url.includes('localhost:5173')) {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        window.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        window.close();
        resolve({ code, state: urlObj.searchParams.get('state') });
      }
    } catch (err) {
      console.error('Error parsing OAuth callback:', err);
      window.close();
      reject(err);
    }
  }
}
