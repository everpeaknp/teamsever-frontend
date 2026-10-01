'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { disconnectDesktopDevice, ensureTrustedDesktopDevice, setDesktopActivityConsent } from '@/lib/desktopAttendance';
import { toast } from 'sonner';

export function DesktopAttendanceControls() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.teamseverDesktop) { setLoading(false); return; }
    let cancelled = false;
    void (async () => {
      try {
        const device = await ensureTrustedDesktopDevice();
        if (!device || cancelled) return;
        const response = await api.get('/attendance/desktop-devices');
        const activeDevices = (response.data.data || []).filter((item: any) => !item.revokedAt);
        const saved = activeDevices.find((item: any) => String(item._id) === device.deviceId || String(item.id) === device.deviceId);
        if (cancelled) return;
        setDeviceId(device.deviceId);
        setDevices(activeDevices);
        setMonitoringEnabled(!!saved?.activityMonitoringEnabled);
        setMessage([device.capabilities.foregroundMonitoringSupported ? 'Foreground app names can be detected.' : 'Foreground app detection is unavailable: ' + (device.capabilities.foregroundUnavailableReason || 'unsupported on this platform.'), device.capabilities.idleDetectionSupported ? 'AFK detection is available.' : 'AFK detection is unavailable: ' + (device.capabilities.idleDetectionUnavailableReason || 'the operating system did not provide an idle signal.')].join(' '));
        await window.teamseverDesktop?.setMonitoringEnabled(!!saved?.activityMonitoringEnabled);
      } catch (error: any) {
        if (!cancelled) setMessage(error?.response?.data?.message || error.message || 'Could not connect this desktop device.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (typeof window === 'undefined') return null;
  if (!window.teamseverDesktop) return null;

  const handleConsent = async (enabled: boolean) => {
    if (!deviceId) return;
    try {
      await setDesktopActivityConsent(deviceId, enabled);
      setMonitoringEnabled(enabled);
      toast.success(enabled ? 'Desktop presence tracking enabled for clocked-in shifts.' : 'Desktop presence tracking paused.');
    } catch (error: any) { toast.error(error?.response?.data?.message || error.message || 'Could not update desktop tracking consent.'); }
  };

  const handleDisconnect = async () => {
    if (!deviceId) return;
    try {
      await disconnectDesktopDevice(deviceId);
      setDeviceId(null);
      setMonitoringEnabled(false);
      setMessage('This desktop device has been disconnected and revoked.');
      setDevices((current) => current.filter((item) => String(item._id || item.id) !== deviceId));
    } catch (error: any) { toast.error(error?.response?.data?.message || error.message || 'Could not disconnect this device.'); }
  };

  const revokeDevice = async (id: string) => {
    try {
      await api.delete(`/attendance/desktop-devices/${id}`);
      setDevices((current) => current.filter((item) => String(item._id || item.id) !== id));
      if (id === deviceId) {
        await window.teamseverDesktop?.forgetCredential();
        localStorage.removeItem('teamseverDesktopDeviceId');
        setDeviceId(null);
        setMonitoringEnabled(false);
        setMessage('This desktop device has been revoked. Reconnect it to use desktop clocking again.');
      }
    } catch (error: any) { toast.error(error?.response?.data?.message || error.message || 'Could not revoke desktop device.'); }
  };

  return <section className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs" aria-label="Desktop presence settings">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="font-medium">Trusted desktop {deviceId ? 'connected' : loading ? 'connecting…' : 'not connected'}</p>
        <p className="text-muted-foreground">{message || 'Preparing secure device connection…'}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2" title="Share foreground app names and active/AFK state only while clocked in. No key presses, mouse counts, window titles, or document content are recorded.">
          <input type="checkbox" checked={monitoringEnabled} disabled={!deviceId || loading} onChange={(event) => void handleConsent(event.target.checked)} />
          Share app and active/AFK presence while clocked in
        </label>
        <Button type="button" variant="outline" size="sm" disabled={!deviceId || loading} onClick={() => void handleDisconnect()}>Disconnect</Button>
      </div>
    </div>
    {monitoringEnabled && <p className="mt-1 text-muted-foreground">Only the foreground app name and active/AFK state are reported. Keyboard and mouse details are never recorded. Tracking stops when clocked out or consent is withdrawn. Activity gaps never change attendance times.</p>}
    {devices.length > 1 && <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">{devices.map((device) => <li key={String(device._id || device.id)} className="flex items-center justify-between gap-2"><span>{device.name} · {device.platform}{device.lastSeenAt ? ` · last seen ${new Date(device.lastSeenAt).toLocaleString()}` : ''}</span>{String(device._id || device.id) !== deviceId && <Button type="button" variant="outline" size="sm" onClick={() => void revokeDevice(String(device._id || device.id))}>Revoke</Button>}</li>)}</ul>}
  </section>;
}
