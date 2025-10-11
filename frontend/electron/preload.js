const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  platform: process.platform
});
