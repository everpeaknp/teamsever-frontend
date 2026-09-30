import { contextBridge, ipcRenderer } from 'electron';

const desktop = Object.freeze({
  getCapabilities: () => ipcRenderer.invoke('desktop:capabilities'),
  storeCredential: (credential: string) => ipcRenderer.invoke('desktop:store-credential', credential),
  forgetCredential: () => ipcRenderer.invoke('desktop:forget-credential'),
  setMonitoringEnabled: (enabled: boolean) => ipcRenderer.invoke('desktop:set-monitoring', enabled),
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  toggleClock: (input: { workspaceId: string; status: 'active' | 'inactive'; locationFix?: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string } }) => ipcRenderer.invoke('desktop:toggle-clock', input),
});

contextBridge.exposeInMainWorld('teamseverDesktop', desktop);
