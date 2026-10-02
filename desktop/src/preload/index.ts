import { contextBridge, ipcRenderer } from 'electron';

const desktop = Object.freeze({
  getCapabilities: () => ipcRenderer.invoke('desktop:capabilities'),
  storeCredential: (credential: string) => ipcRenderer.invoke('desktop:store-credential', credential),
  forgetCredential: () => ipcRenderer.invoke('desktop:forget-credential'),
  setMonitoringEnabled: (enabled: boolean) => ipcRenderer.invoke('desktop:set-monitoring', enabled),
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  getCurrentPresence: () => ipcRenderer.invoke('desktop:get-current-presence'),
  attachPresenceToActiveShift: () => ipcRenderer.invoke('desktop:attach-presence-to-active-shift'),
  toggleClock: (input: { workspaceId: string; status: 'active' | 'inactive'; locationFix?: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string } }) => ipcRenderer.invoke('desktop:toggle-clock', input),
  onUpdateState: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on('desktop:update-state', listener);
    return () => ipcRenderer.removeListener('desktop:update-state', listener);
  },
  getUpdateState: () => ipcRenderer.invoke('desktop:get-update-state'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-updates'),
  openLatestDownload: () => ipcRenderer.invoke('desktop:open-latest-download'),
});

contextBridge.exposeInMainWorld('teamseverDesktop', desktop);
