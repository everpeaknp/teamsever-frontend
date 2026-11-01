'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Fingerprint, Upload, Plus, Trash2, CheckCircle2, Clock, RefreshCw, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BiometricDevice {
  _id: string;
  name: string;
  deviceType: 'zkteco' | 'hikvision' | 'realtime' | 'biomax' | 'essl' | 'generic';
  deviceModel?: string;
  serialNumber: string;
  location?: string;
  ipAddress?: string;
  apiKey: string;
  isActive: boolean;
  lastSyncAt?: string;
  totalPunchesSynced: number;
}

interface BiometricTerminalsCardProps {
  workspaceId: string;
  canManage?: boolean;
}

export function BiometricTerminalsCard({ workspaceId, canManage = true }: BiometricTerminalsCardProps) {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedGuideDevice, setSelectedGuideDevice] = useState<BiometricDevice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New device form
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    deviceType: 'zkteco' as const,
    deviceModel: '',
    serialNumber: '',
    location: '',
    ipAddress: '',
  });

  // Log import form
  const [logContent, setLogContent] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${workspaceId}/hr/biometric/devices`);
      setDevices(res.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load biometric devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadDevices();
    }
  }, [workspaceId]);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForm.name.trim() || !deviceForm.serialNumber.trim()) {
      toast.error('Device name and serial number are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/workspaces/${workspaceId}/hr/biometric/devices`, deviceForm);
      toast.success('Biometric device registered successfully!');
      setShowAddModal(false);
      setDeviceForm({
        name: '',
        deviceType: 'zkteco',
        deviceModel: '',
        serialNumber: '',
        location: '',
        ipAddress: '',
      });
      await loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to register device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to remove the terminal "${deviceName}"?`)) return;

    try {
      await api.delete(`/workspaces/${workspaceId}/hr/biometric/devices/${deviceId}`);
      toast.success('Device removed');
      await loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete device');
    }
  };

  const handleImportLogs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logContent.trim()) {
      toast.error('Log content is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/workspaces/${workspaceId}/hr/biometric/import-logs`, {
        logContent,
        deviceId: selectedDeviceId || undefined,
      });

      toast.success(res.data.message || `Successfully processed punch logs!`);
      setShowImportModal(false);
      setLogContent('');
      await loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Log import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogContent((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Fingerprint className="h-5 w-5 text-primary" />
            Biometric Hardware Attendance Terminals
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Onsite employees punch via physical terminals (ZKTeco, Hikvision, Realtime, BioMax). Remote employees clock in via app. Both automatically unify into timesheets and payroll.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedGuideDevice(devices[0] || null);
                setShowGuideModal(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Terminal Setup Guide
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="gap-1.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Import offline logs
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-1.5 text-xs bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Register device
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading biometric hardware configuration...
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cpu className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-semibold">No Biometric Hardware Registered</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Add your office fingerprint or facial recognition terminals to synchronize onsite clock-ins automatically with software attendance.
            </p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="mt-4 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Register first terminal
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="p-2.5">Terminal Name</th>
                  <th className="p-2.5">Type & Model</th>
                  <th className="p-2.5">Serial Number</th>
                  <th className="p-2.5">Location / IP</th>
                  <th className="p-2.5">Sync Status</th>
                  <th className="p-2.5">Total Punches</th>
                  <th className="p-2.5">Push API Key</th>
                  {canManage && <th className="p-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {devices.map((device) => (
                  <tr key={device._id} className="hover:bg-muted/20">
                    <td className="p-2.5 font-medium">{device.name}</td>
                    <td className="p-2.5">
                      <span className="uppercase font-semibold text-primary/90">{device.deviceType}</span>
                      {device.deviceModel && ` (${device.deviceModel})`}
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">{device.serialNumber}</td>
                    <td className="p-2.5">
                      {device.location || 'HQ'}
                      {device.ipAddress && <span className="ml-1 text-muted-foreground">({device.ipAddress})</span>}
                    </td>
                    <td className="p-2.5">
                      {device.lastSyncAt ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {new Date(device.lastSyncAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Awaiting first punch</span>
                      )}
                    </td>
                    <td className="p-2.5 font-semibold">{device.totalPunchesSynced || 0}</td>
                    <td className="p-2.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                        {device.apiKey.slice(0, 10)}...
                      </code>
                    </td>
                    {canManage && (
                      <td className="p-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDevice(device._id, device.name)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Register Device Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3">
                <h3 className="text-base font-semibold">Register Physical Attendance Terminal</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>✕</Button>
              </div>
              <form onSubmit={handleCreateDevice} className="space-y-3.5 pt-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Terminal Name *</label>
                    <Input
                      required
                      placeholder="e.g. Kathmandu HQ Lobby Terminal"
                      value={deviceForm.name}
                      onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Device Brand *</label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                      value={deviceForm.deviceType}
                      onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value as any })}
                    >
                      <option value="zkteco">ZKTeco (Face / Fingerprint / RFID)</option>
                      <option value="hikvision">Hikvision MinMoe Access</option>
                      <option value="realtime">Realtime Biometrics</option>
                      <option value="biomax">BioMax Attendance</option>
                      <option value="essl">eSSL Security</option>
                      <option value="generic">Generic Network Biometric Terminal</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Serial Number *</label>
                    <Input
                      required
                      placeholder="e.g. ZK-SPEEDFACE-2026-X1"
                      value={deviceForm.serialNumber}
                      onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Model</label>
                    <Input
                      placeholder="e.g. SpeedFace V5L / K40 / K20"
                      value={deviceForm.deviceModel}
                      onChange={(e) => setDeviceForm({ ...deviceForm, deviceModel: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Location</label>
                    <Input
                      placeholder="e.g. Main Gate / 2nd Floor Office"
                      value={deviceForm.location}
                      onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">IP Address</label>
                    <Input
                      placeholder="e.g. 192.168.1.200"
                      value={deviceForm.ipAddress}
                      onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Automatic Webhook Configuration:</p>
                  <p className="mt-0.5">
                    Once created, the terminal will receive a persistent API token. Push HTTP punches to{' '}
                    <code className="text-primary font-mono">/api/workspaces/{workspaceId}/hr/biometric/push</code> with header{' '}
                    <code className="text-primary font-mono">x-device-token: &lt;key&gt;</code>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Registering...' : 'Register Device'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Offline Logs Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3">
                <h3 className="text-base font-semibold">Import Offline Biometric Attendance Logs</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>✕</Button>
              </div>
              <form onSubmit={handleImportLogs} className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Source Terminal (Optional)</label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    <option value="">-- Generic / Auto-assign --</option>
                    {devices.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Upload File (attlog.dat / CSV)</label>
                    <input
                      type="file"
                      accept=".dat,.csv,.txt"
                      onChange={handleFileUpload}
                      className="text-[11px] text-muted-foreground file:mr-2 file:rounded file:border file:bg-muted file:px-2 file:py-1 file:text-xs"
                    />
                  </div>
                  <textarea
                    rows={8}
                    className="w-full font-mono text-xs p-2.5 rounded-md border bg-background"
                    placeholder={`Paste log rows here or upload file.\nSupported formats:\n1) ZKTeco attlog.dat:\n101\t2026-10-30 09:00:15\t1\t0\n101\t2026-10-30 17:30:10\t1\t1\n\n2) CSV format:\nUserID,Timestamp,PunchType\n101,2026-10-30 09:00:00,check_in`}
                    value={logContent}
                    onChange={(e) => setLogContent(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Processing logs...' : 'Process & Apply Punches'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Hardware Guide Modal */}
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Physical Hardware Terminal Setup Guide</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowGuideModal(false)}>✕</Button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                    Direct Firmware Cloud / ADMS Setup (ZKTeco, eSSL, BioMax)
                  </h4>
                  <p className="text-muted-foreground">
                    On your physical machine, go to <strong>Menu &gt; Comm. &gt; Cloud Server / ADMS Server</strong> and configure:
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-background p-2.5 rounded border">
                    <div><span className="text-muted-foreground">Server Address:</span> {typeof window !== 'undefined' ? window.location.hostname : 'api.everacy.com'}</div>
                    <div><span className="text-muted-foreground">Server Port:</span> {typeof window !== 'undefined' ? (window.location.port || (window.location.protocol === 'https:' ? '443' : '80')) : '443'}</div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Push Server URL / Path:</span>
                      <div className="mt-1 flex items-center justify-between bg-muted/60 px-2 py-1 rounded">
                        <span className="truncate">/api/workspaces/{workspaceId}/hr/biometric/iclock/cdata</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={() => {
                            navigator.clipboard.writeText(`/api/workspaces/${workspaceId}/hr/biometric/iclock/cdata`);
                            toast.success('Path copied');
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                    Network Terminal Webhook Push (Hikvision, Dahua, Custom Devices)
                  </h4>
                  <p className="text-muted-foreground">
                    Configure the device HTTP notification endpoint or curl from an edge computer:
                  </p>
                  <div className="bg-background p-2.5 rounded border font-mono text-[11px] space-y-1.5">
                    <div><strong className="text-muted-foreground">Endpoint:</strong> /api/workspaces/{workspaceId}/hr/biometric/push</div>
                    <div><strong className="text-muted-foreground">Header:</strong> x-device-token: {selectedGuideDevice?.apiKey || 'bio_YOUR_DEVICE_API_KEY'}</div>
                    <div className="mt-1 flex items-center justify-between bg-muted/60 px-2 py-1 rounded">
                      <span className="truncate">curl -X POST -H &quot;x-device-token: {selectedGuideDevice?.apiKey || 'KEY'}&quot; ...</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const curl = `curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://api.everacy.com'}/api/workspaces/${workspaceId}/hr/biometric/push" -H "Content-Type: application/json" -H "x-device-token: ${selectedGuideDevice?.apiKey || 'KEY'}" -d '{"punches":[{"biometricUserId":"101","timestamp":"${new Date().toISOString()}","punchType":"auto"}]}'`;
                          navigator.clipboard.writeText(curl);
                          toast.success('Test curl command copied');
                        }}
                      >
                        Copy Test Curl
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
                    Employee Hardware PIN Mapping
                  </h4>
                  <p className="text-muted-foreground">
                    Ensure each employee’s <strong>Biometric Badge ID / PIN</strong> under <em>Human Resources &gt; Directory</em> matches the User ID registered on the terminal screen.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" onClick={() => setShowGuideModal(false)}>
                  Close Guide
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
