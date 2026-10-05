// Electron Preload Script for Connect Pro
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getSources: () => ipcRenderer.invoke('get-sources'),
  sendNativeInput: (inputEvent) => ipcRenderer.invoke('send-native-input', inputEvent),
});
