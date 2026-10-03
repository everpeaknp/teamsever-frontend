import { app, BrowserWindow, dialog, ipcMain, powerMonitor, safeStorage, shell } from 'electron';
import electronUpdater from 'electron-updater';
import fs from 'node:fs/promises';
import { foregroundAppSupport, getForegroundProcessName } from './foregroundProcess';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedWebUrl, isFirebaseAuthPopupUrl, isSafeExternalUrl, isSameOriginNavigation } from './security';
import { detectPresenceCapabilities, isWaylandSession } from './tracker';
import { DesktopPresenceSession, type DesktopPresenceAuthorization } from './desktopPresenceSession';
import { DesktopUpdaterController } from './desktopUpdater';
import type { DesktopUpdateState } from '../../../src/types/desktop';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const developmentUrl = 'http://localhost:3000';
const apiUrl = process.env.TEAMSEVER_API_URL || 'http://localhost:5000';
const credentialPath = () => path.join(app.getPath('userData'), 'attendance-device.bin');
const { autoUpdater } = electronUpdater;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowPrerelease = false;
let activeShift: { workspaceId: string; timeEntryId: string; startTime: string; activityMonitoringEnabled: boolean } | null = null;
let trackerTimer: NodeJS.Timeout | null = null;
let statusSyncTimer: NodeJS.Timeout | null = null;
let foregroundSupport: { supported: boolean; reason?: string } = { supported: false };
let trackerBusy = false;
let trackerStarting = false;
let trackerGeneration = 0;
let deviceMonitoringConsent = false;
let allowNormalQuitAfterUpdateCheck = false;
let updateCheckTimer: NodeJS.Timeout | null = null;
let companionPromptOpen = false;
const dismissedMobileEntries = new Set<string>();
const presenceSession = new DesktopPresenceSession({
  getAuthorization: async () => {
    const result = await authorizedFetch('/attendance/desktop/status');
    const data = result.data;
    if (!data?.presenceTrackingActive || !data.timeEntryId || !data.workspaceId || !data.startTime || !data.activityMonitoringEnabled) return null;
    return { workspaceId: String(data.workspaceId), timeEntryId: String(data.timeEntryId), startTime: String(data.startTime), activityMonitoringEnabled: true, clockedIn: true };
  },
  getAfkThresholdMinutes: async (workspaceId) => {
    const result = await authorizedFetch('/attendance/workspace/' + workspaceId + '/desktop-presence-policy');
    return Number(result.data?.policy?.afkThresholdMinutes);
  },
  readIdleSeconds: () => powerMonitor.getSystemIdleTime(),
  readForegroundApp: async () => foregroundSupport.supported ? getForegroundProcessName() : null,
  foregroundAppSupported: () => foregroundSupport.supported,
  sendHeartbeat: async (event) => authorizedFetch('/attendance/desktop/activity', { method: 'POST', body: JSON.stringify(event) }),
});
const desktopUpdater = new DesktopUpdaterController({
  updater: autoUpdater,
  getClockedIn: async () => {
    const result = await authorizedFetch('/attendance/desktop/status', { signal: AbortSignal.timeout(5_000) });
    return result.data?.clockedIn;
  },
  publish: (state: DesktopUpdateState) => {
    const origin = getWebUrl()?.origin;
    if (!origin) return;
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) continue;
      try {
        if (new URL(window.webContents.getURL()).origin === origin) window.webContents.send('desktop:update-state', state);
      } catch { /* Ignore windows without a loaded trusted URL. */ }
    }
  },
});

function scheduleDesktopUpdateChecks(): void {
  if (!app.isPackaged || updateCheckTimer) return;
  void desktopUpdater.checkForUpdates();
  updateCheckTimer = setInterval(() => void desktopUpdater.checkForUpdates(), 6 * 60 * 60 * 1000);
  updateCheckTimer.unref();
}

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

async function promptForMobileShift(pending: { timeEntryId: string; workspaceId: string; startTime: string } | null | undefined): Promise<void> {
  if (!pending || dismissedMobileEntries.has(pending.timeEntryId) || companionPromptOpen || BrowserWindow.getAllWindows().length === 0) return;
  companionPromptOpen = true;
  dismissedMobileEntries.add(pending.timeEntryId);
  try {
    const options: Electron.MessageBoxOptions = {
      type: 'question',
      title: 'Mobile shift found',
      message: 'You are clocked in from the TeamsEver mobile app on this network. Sync desktop presence for this shift?',
      detail: 'When synced, TeamsEver records foreground app names and active/AFK state on this trusted desktop. It does not record keys, text, window titles, or screenshots.',
      buttons: ['Sync this time', 'Always sync future mobile shifts', 'Not now'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    };
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const answer = focusedWindow ? await dialog.showMessageBox(focusedWindow, options) : await dialog.showMessageBox(options);
    const action = answer.response === 0 ? 'sync_once' : answer.response === 1 ? 'always' : 'not_now';
    await authorizedFetch(`/attendance/desktop/companion/${encodeURIComponent(pending.timeEntryId)}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    if (action === 'sync_once' || action === 'always') await syncDesktopStatus();
  } catch (error) {
    dismissedMobileEntries.delete(pending.timeEntryId);
    console.warn('[Desktop companion] Could not sync mobile shift:', error instanceof Error ? error.message : 'unknown error');
  } finally {
    companionPromptOpen = false;
  }
}

async function syncDesktopStatus(): Promise<any> {
  const result = await authorizedFetch('/attendance/desktop/status');
  activeShift = result.data?.presenceTrackingActive ? {
    workspaceId: String(result.data.workspaceId),
    timeEntryId: String(result.data.timeEntryId),
    startTime: String(result.data.startTime),
    activityMonitoringEnabled: !!result.data.activityMonitoringEnabled,
  } : null;
  deviceMonitoringConsent = !!result.data?.activityMonitoringEnabled;
  updateTracker();
  void promptForMobileShift(result.data?.pendingMobileShift);
  return { ...result.data, currentSession: presenceSession.currentSession };
}

function ensureStatusSyncTimer(): void {
  if (statusSyncTimer) return;
  statusSyncTimer = setInterval(() => {
    if (presenceSession.isRunning || trackerStarting) return;
    void syncDesktopStatus().catch((error) => {
      if ((error as { status?: number })?.status === 401) {
        activeShift = null;
        deviceMonitoringConsent = false;
        updateTracker();
      }
    });
  }, 30_000);
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
  const syncStatus = syncDesktopStatus;

  register('desktop:capabilities', async () => {
    const capabilities = await detectPresenceCapabilities(
      () => foregroundAppSupport(process.platform, isWaylandSession()),
      () => powerMonitor.getSystemIdleTime(),
    );
    foregroundSupport = capabilities.foregroundApp;
    updateTracker();
    return {
      platform: process.platform,
      credentialInstalled: !!(await loadCredential()),
      foregroundMonitoringSupported: capabilities.foregroundApp.supported,
      foregroundUnavailableReason: capabilities.foregroundApp.reason,
      idleDetectionSupported: capabilities.idleDetection.supported,
      idleDetectionUnavailableReason: capabilities.idleDetection.reason,
    };
  });
  register('desktop:store-credential', async (_event, credential: unknown) => {
    if (typeof credential !== 'string' || !/^td_[A-Za-z0-9_-]{40,100}$/.test(credential)) throw new Error('Invalid desktop authorization credential');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable. Enable the system keyring and retry.');
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(credentialPath(), safeStorage.encryptString(credential), { mode: 0o600 });
    ensureStatusSyncTimer();
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
  register('desktop:pair-mobile-code', async (_event, code: unknown) => {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code shown in the mobile app.');
    const result = await authorizedFetch('/attendance/desktop/companion/pair', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    await syncDesktopStatus();
    return result.data;
  });
  register('desktop:get-current-presence', async () => presenceSession.currentSession);
  register('desktop:attach-presence-to-active-shift', async () => {
    const result = await authorizedFetch('/attendance/desktop/presence-session', { method: 'POST', body: JSON.stringify({ consent: true }) });
    await syncDesktopStatus();
    return { attached: !!result.data?.presenceTrackingActive };
  });
  register('desktop:get-update-state', async () => desktopUpdater.currentState);
  register('desktop:check-updates', async () => {
    if (app.isPackaged) await desktopUpdater.checkForUpdates();
    return desktopUpdater.currentState;
  });
  register('desktop:install-update', async () => desktopUpdater.installDownloadedUpdate());
  register('desktop:open-latest-download', async () => {
    const asset = process.platform === 'win32' ? 'TeamsEver-Setup.exe' : process.platform === 'linux' ? 'TeamsEver.AppImage' : null;
    if (!asset) throw new Error('Desktop downloads are available for Windows and Linux only.');
    await shell.openExternal(`https://github.com/everpeaknp/teamsever-frontend/releases/latest/download/${asset}`);
    return { opened: true };
  });
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
  const enabled = !!activeShift && activeShift.activityMonitoringEnabled && deviceMonitoringConsent;
  if (!enabled || !activeShift) {
    trackerGeneration += 1;
    trackerStarting = false;
    if (trackerTimer) clearInterval(trackerTimer);
    trackerTimer = null;
    presenceSession.stop();
    return;
  }
  if (presenceSession.isRunning || trackerStarting) return;
  trackerStarting = true;
  const generation = ++trackerGeneration;
  const shift: DesktopPresenceAuthorization = { ...activeShift, activityMonitoringEnabled: true, clockedIn: true };
  let didStart = false;
  void presenceSession.start(shift).then((started) => {
    didStart = started;
    if (generation !== trackerGeneration || !started || !activeShift || activeShift.timeEntryId !== shift.timeEntryId || !activeShift.activityMonitoringEnabled || !deviceMonitoringConsent) {
      presenceSession.stop();
      return;
    }
    if (!trackerTimer) {
      trackerTimer = setInterval(() => void samplePresence(), 15_000);
      void samplePresence();
    }
  }).finally(() => {
    trackerStarting = false;
    const stillEnabled = !!activeShift && activeShift.activityMonitoringEnabled && deviceMonitoringConsent;
    if (didStart && stillEnabled && !presenceSession.isRunning && (generation !== trackerGeneration || activeShift?.timeEntryId !== shift.timeEntryId)) updateTracker();
  });
}

async function samplePresence(): Promise<void> {
  if (trackerBusy || !presenceSession.isRunning) return;
  trackerBusy = true;
  try { await presenceSession.sample(); }
  catch (error) { console.warn('[Desktop presence] Sample unavailable:', error instanceof Error ? error.message : 'unknown error'); }
  finally {
    trackerBusy = false;
    if (!presenceSession.isRunning && trackerTimer) { clearInterval(trackerTimer); trackerTimer = null; }
  }
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
    // Firebase signInWithPopup requires its handler to run in an Electron child window.
    // Sending this URL to the system browser makes Firebase report auth/popup-blocked.
    if (isFirebaseAuthPopupUrl(url)) return { action: 'allow' };
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
  scheduleDesktopUpdateChecks();
  void (async () => {
    try {
      const credential = await loadCredential();
      if (!credential) return;
      const capabilities = await detectPresenceCapabilities(
        () => foregroundAppSupport(process.platform, isWaylandSession()),
        () => powerMonitor.getSystemIdleTime(),
      );
      foregroundSupport = capabilities.foregroundApp;
      const result = await authorizedFetch('/attendance/desktop/status');
      deviceMonitoringConsent = !!result.data?.activityMonitoringEnabled;
      activeShift = result.data?.presenceTrackingActive ? { workspaceId: String(result.data.workspaceId), timeEntryId: String(result.data.timeEntryId), startTime: String(result.data.startTime), activityMonitoringEnabled: deviceMonitoringConsent } : null;
      ensureStatusSyncTimer();
      updateTracker();
    } catch { /* unpaired installation */ }
  })();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (event) => {
  if (!app.isPackaged || allowNormalQuitAfterUpdateCheck || desktopUpdater.isInstalling || !desktopUpdater.hasDownloadedUpdate) return;
  event.preventDefault();
  void desktopUpdater.installDownloadedUpdate().then((installed) => {
    if (!installed) {
      allowNormalQuitAfterUpdateCheck = true;
      app.quit();
    }
  }).catch(() => {
    allowNormalQuitAfterUpdateCheck = true;
    app.quit();
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
