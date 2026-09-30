import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import fs from 'node:fs/promises';
import { foregroundAppSupport, getForegroundProcessName } from './foregroundProcess';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedWebUrl, isSafeExternalUrl, isSameOriginNavigation } from './security';
import { canMonitorForegroundApps, isWaylandSession } from './tracker';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const developmentUrl = 'http://localhost:3000';
const apiUrl = process.env.TEAMSEVER_API_URL || 'http://localhost:5000';
const credentialPath = () => path.join(app.getPath('userData'), 'attendance-device.bin');
let activeShift: { workspaceId: string; timeEntryId: string; startTime: string; activityMonitoringEnabled: boolean } | null = null;
let trackerTimer: NodeJS.Timeout | null = null;
let foregroundSupport: { supported: boolean; reason?: string } = { supported: false };
let trackerBusy = false;
let deviceMonitoringConsent = false;

async function loadCredential(): Promise<string | null> {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(await fs.readFile(credentialPath()));
  } catch { return null; }
}

async function authorizedFetch(pathname: string, init: RequestInit = {}) {
  const credential = await loadCredential();
  if (!credential) throw new Error('This desktop installation is not connected. Sign in and reconnect this device.');
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api${pathname}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-TeamsEver-Device': credential, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Attendance API returned ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  const appUrl = getWebUrl();
  try { return !!appUrl && new URL(event.senderFrame?.url || '').origin === appUrl.origin; } catch { return false; }
}

function registerSecureIpc(): void {
  const register = (channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<unknown>) => {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!isTrustedSender(event)) throw new Error('Untrusted desktop renderer');
      return handler(event, ...args);
    });
  };
  const syncStatus = async () => {
    const result = await authorizedFetch('/attendance/desktop/status');
    activeShift = result.data?.clockedIn ? {
      workspaceId: String(result.data.workspaceId),
      timeEntryId: String(result.data.timeEntryId),
      startTime: String(result.data.startTime),
      activityMonitoringEnabled: !!result.data.activityMonitoringEnabled,
    } : null;
    deviceMonitoringConsent = !!result.data?.activityMonitoringEnabled;
    if (!activeShift?.activityMonitoringEnabled) activeShift = null;
    updateTracker();
    return result.data;
  };

  register('desktop:capabilities', async () => {
    foregroundSupport = await foregroundAppSupport(process.platform, isWaylandSession());
    updateTracker();
    return { platform: process.platform, credentialInstalled: !!(await loadCredential()), foregroundMonitoringSupported: foregroundSupport.supported, unavailableReason: foregroundSupport.reason };
  });
  register('desktop:store-credential', async (_event, credential: unknown) => {
    if (typeof credential !== 'string' || !/^td_[A-Za-z0-9_-]{40,100}$/.test(credential)) throw new Error('Invalid desktop authorization credential');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable. Enable the system keyring and retry.');
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(credentialPath(), safeStorage.encryptString(credential), { mode: 0o600 });
    await syncStatus().catch(() => undefined);
    return { stored: true };
  });
  register('desktop:forget-credential', async () => {
    await fs.rm(credentialPath(), { force: true });
    activeShift = null;
    deviceMonitoringConsent = false;
    updateTracker();
    return { forgotten: true };
  });
  register('desktop:set-monitoring', async (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid monitoring setting');
    deviceMonitoringConsent = enabled;
    if (activeShift) activeShift.activityMonitoringEnabled = enabled;
    updateTracker();
    return { enabled };
  });
  register('desktop:get-status', async () => syncStatus());
  register('desktop:toggle-clock', async (_event, input: any) => {
    if (!input || typeof input.workspaceId !== 'string' || !/^[a-f\d]{24}$/i.test(input.workspaceId) || !['active', 'inactive'].includes(input.status)) throw new Error('Invalid clock request');
    const result = await authorizedFetch(`/workspaces/${input.workspaceId}/clock/desktop-toggle`, { method: 'POST', body: JSON.stringify({ status: input.status, ...(input.locationFix ? { locationFix: input.locationFix } : {}) }) });
    if (input.status === 'inactive') {
      activeShift = null;
      updateTracker();
    } else {
      const entry = result.data?.timeEntry;
      if (entry?._id && entry?.startTime) {
        activeShift = { workspaceId: input.workspaceId, timeEntryId: String(entry._id), startTime: String(entry.startTime), activityMonitoringEnabled: deviceMonitoringConsent };
        updateTracker();
      }
    }
    await syncStatus().catch(() => undefined);
    return { data: result };
  });
}

function updateTracker(): void {
  const supported = foregroundSupport.supported;
  const enabled = !!activeShift && canMonitorForegroundApps({ enabled: activeShift.activityMonitoringEnabled, clockedIn: true, platform: process.platform, wayland: isWaylandSession() });
  if (!enabled || !supported) {
    if (trackerTimer) clearInterval(trackerTimer);
    trackerTimer = null;
    return;
  }
  if (trackerTimer) return;
  const sample = async () => {
    const shift = activeShift;
    if (!shift || trackerBusy || !foregroundSupport.supported) return;
    trackerBusy = true;
    try {
      const appId = await getForegroundProcessName();
      if (!appId) return;
      const endedAt = new Date();
      const shiftStart = Date.parse(shift.startTime);
      const startedAt = new Date(Math.max(endedAt.getTime() - 60_000, Number.isFinite(shiftStart) ? shiftStart : 0));
      await authorizedFetch('/attendance/desktop/activity', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: shift.workspaceId, timeEntryId: shift.timeEntryId, appId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString() }),
      });
    } catch (error) {
      console.warn('[Desktop presence] Sample unavailable:', error instanceof Error ? error.message : 'unknown error');
      if ((error as { status?: number })?.status === 401) {
        activeShift = null;
        updateTracker();
      }
    } finally { trackerBusy = false; }
  };
  trackerTimer = setInterval(() => void sample(), 60_000);
}

function getWebUrl(): URL | null {
  const configuredUrl = process.env.TEAMSEVER_WEB_URL;
  const value = configuredUrl || (app.isPackaged ? '' : developmentUrl);
  if (!value || !isAllowedWebUrl(value, app.isPackaged)) return null;
  return new URL(value);
}

async function openExternalUrl(value: string): Promise<void> {
  if (isSafeExternalUrl(value)) await shell.openExternal(value);
}

function createWindow(): BrowserWindow {
  const appUrl = getWebUrl();
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'TeamsEver Desktop',
    webPreferences: {
      preload: path.join(currentDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const appOrigin = appUrl?.origin;
  let showingFallback = false;
  window.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!appOrigin || !isSameOriginNavigation(url, appOrigin)) {
      event.preventDefault();
      void openExternalUrl(url);
    }
  });

  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    let requestingOrigin = '';
    try {
      requestingOrigin = new URL(details.requestingUrl).origin;
    } catch {
      callback(false);
      return;
    }
    callback(permission === 'geolocation' && requestingOrigin === appOrigin);
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.on('did-fail-load', (_event, errorCode, _description, _validatedUrl, isMainFrame) => {
    if (isMainFrame && appUrl && errorCode !== -3 && !showingFallback) {
      showingFallback = true;
      void window.loadFile(path.join(currentDirectory, '../renderer/index.html'));
    }
  });

  if (appUrl) {
    void window.loadURL(appUrl.toString());
  } else {
    void window.loadFile(path.join(currentDirectory, '../renderer/index.html'));
  }
  return window;
}

app.whenReady().then(() => {
  registerSecureIpc();
  createWindow();
  void (async () => {
    try {
      const credential = await loadCredential();
      if (!credential) return;
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/attendance/desktop/status`, { headers: { 'X-TeamsEver-Device': credential } });
      if (!response.ok) return;
      const result = await response.json();
      deviceMonitoringConsent = !!result.data?.activityMonitoringEnabled;
      activeShift = result.data?.clockedIn ? { workspaceId: String(result.data.workspaceId), timeEntryId: String(result.data.timeEntryId), startTime: String(result.data.startTime), activityMonitoringEnabled: deviceMonitoringConsent } : null;
      updateTracker();
    } catch { /* unpaired installation */ }
  })();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
