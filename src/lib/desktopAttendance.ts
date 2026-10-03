import { api } from '@/lib/axios';

const DEVICE_ID_KEY = 'teamseverDesktopDeviceId';
let ensurePromise: Promise<{ deviceId: string; capabilities: Awaited<ReturnType<NonNullable<Window['teamseverDesktop']>['getCapabilities']>> } | null> | null = null;

export function ensureTrustedDesktopDevice() {
  if (typeof window === 'undefined' || !window.teamseverDesktop) return Promise.resolve(null);
  if (!ensurePromise) ensurePromise = provision().finally(() => { ensurePromise = null; });
  return ensurePromise;
}

async function provision() {
  const bridge = window.teamseverDesktop;
  if (!bridge) return null;
  const capabilities = await bridge.getCapabilities();
  if (!['win32', 'linux', 'darwin'].includes(capabilities.platform)) throw new Error('TeamsEver desktop attendance is unavailable on this platform.');
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!capabilities.credentialInstalled || !deviceId) {
    if (deviceId) await api.delete(`/attendance/desktop-devices/${deviceId}`).catch(() => undefined);
    const platform = capabilities.platform === 'win32' ? 'windows' : capabilities.platform === 'darwin' ? 'macos' : 'linux';
    const response = await api.post('/attendance/desktop-devices', { name: `TeamsEver Desktop (${platform})`, platform });
    deviceId = String(response.data.data.device.id);
    try {
      await bridge.storeCredential(response.data.data.credential);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch (error) {
      await api.delete(`/attendance/desktop-devices/${deviceId}`).catch(() => undefined);
      throw error;
    }
  }
  return { deviceId, capabilities };
}

export async function setDesktopActivityConsent(deviceId: string, enabled: boolean) {
  await api.patch(`/attendance/desktop-devices/${deviceId}/activity-consent`, { enabled });
  await window.teamseverDesktop?.setMonitoringEnabled(enabled);
}

export async function disconnectDesktopDevice(deviceId: string) {
  await api.delete(`/attendance/desktop-devices/${deviceId}`);
  await window.teamseverDesktop?.forgetCredential();
  localStorage.removeItem(DEVICE_ID_KEY);
}

export async function setDesktopAutoSync(deviceId: string, enabled: boolean) {
  await api.patch(`/attendance/desktop-devices/${deviceId}/auto-sync-mobile-shifts`, { enabled });
}

export { DEVICE_ID_KEY };
