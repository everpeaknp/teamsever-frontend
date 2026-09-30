'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getGeolocationErrorMessage } from './geolocationErrorMessage';

const AttendanceLocationMapPicker = dynamic(() => import('./AttendanceLocationMapPicker').then((module) => module.AttendanceLocationMapPicker), { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-lg border bg-muted" /> });
type Area = { _id?: string; name: string; kind: 'office' | 'remote'; latitude: number; longitude: number; radiusMeters: number; isActive: boolean; networkIp?: string };
type Member = { id: string; name: string; role: string; attendanceMode: 'onsite' | 'remote'; remoteAreas: Area[] };

export function AttendanceLocationSettings({ workspaceId }: { workspaceId: string }) {
  const [policy, setPolicy] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [editingRemoteAreaId, setEditingRemoteAreaId] = useState<string | null>(null);
  const [hasMapSelection, setHasMapSelection] = useState(false);
  const [draft, setDraft] = useState<Area>({ name: '', kind: 'remote', latitude: 27.7172, longitude: 85.324, radiusMeters: 60, isActive: true, networkIp: '' });

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/workspace/${workspaceId}/location-policy`);
      setPolicy(data.data);
      if (data.data.canManage) {
        const memberResponse = await api.get(`/attendance/workspace/${workspaceId}/location-policy/members`);
        const list = memberResponse.data.data.members || [];
        setMembers(list);
        setSelectedMemberId((current) => current || list[0]?.id || '');
      }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not load attendance locations'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [workspaceId]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading location settings…</p>;
  if (!policy) return <p className="p-6 text-sm text-muted-foreground">Location settings are unavailable.</p>;
  if (!policy.canManage) return <p className="rounded-xl border p-4 text-sm text-muted-foreground">You need Manage Addresses permission to edit these locations.</p>;

  const office = (policy.policy.areas || []).find((area: Area) => area.kind === 'office');
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const editingRemoteArea = selectedMember?.remoteAreas.find((area) => area._id === editingRemoteAreaId);
  const savePolicy = async (next: any) => {
    setSaving(true);
    try {
      const response = await api.put(`/attendance/workspace/${workspaceId}/location-policy`, next);
      setPolicy((current: any) => ({ ...current, policy: response.data.data.policy }));
      toast.success('Attendance settings saved');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not save settings'); }
    finally { setSaving(false); }
  };
  const saveOffice = async (point: { latitude: number; longitude: number }) => {
    const area = { _id: office?._id, name: draft.name.trim() || office?.name || 'Simalchaur office', kind: 'office', latitude: point.latitude, longitude: point.longitude, radiusMeters: 60, isActive: true };
    await savePolicy({ ...policy.policy, areas: [area] });
  };
  const getCurrentLocation = (done: (latitude: number, longitude: number) => void) => {
    if (!navigator.geolocation) return toast.error('This browser does not provide location access');
    navigator.geolocation.getCurrentPosition(({ coords }) => done(coords.latitude, coords.longitude), (error) => toast.error(getGeolocationErrorMessage(error)), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  const editRemoteArea = (area: Area) => {
    setEditingRemoteAreaId(String(area._id));
    setDraft({ ...area });
    setHasMapSelection(true);
  };
  const saveRemoteArea = async (point: { latitude: number; longitude: number }, area?: Area) => {
    if (!selectedMember) return toast.error('Choose a member first');
    const areas = selectedMember.remoteAreas || [];
    const nextArea = { ...area, name: draft.name.trim() || area?.name || `Remote place ${areas.length + 1}`, kind: 'remote' as const, latitude: point.latitude, longitude: point.longitude, radiusMeters: Number(draft.radiusMeters) || area?.radiusMeters || 60, isActive: true, networkIp: draft.networkIp?.trim() || undefined };
    const next = area?._id ? areas.map((item) => item._id === area._id ? nextArea : item) : [...areas, nextArea];
    setSaving(true);
    try {
      const response = await api.put(`/attendance/workspace/${workspaceId}/location-policy/members/${selectedMember.id}/remote-areas`, { areas: next });
      const savedAreas: Area[] = response.data.data.member.remoteAreas;
      setMembers((current) => current.map((member) => member.id === selectedMember.id ? { ...member, remoteAreas: savedAreas } : member));
      setEditingRemoteAreaId(null);
      setDraft({ name: '', kind: 'remote', latitude: point.latitude, longitude: point.longitude, radiusMeters: 60, isActive: true, networkIp: '' });
      setHasMapSelection(false);
      toast.success(`Private remote location saved for ${selectedMember.name}`);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not save private remote location'); }
    finally { setSaving(false); }
  };
  const removeRemoteArea = async (areaId: string) => {
    if (!selectedMember) return;
    const areas = selectedMember.remoteAreas.filter((area) => area._id !== areaId);
    try {
      await api.put(`/attendance/workspace/${workspaceId}/location-policy/members/${selectedMember.id}/remote-areas`, { areas });
      setMembers((current) => current.map((member) => member.id === selectedMember.id ? { ...member, remoteAreas: areas } : member));
      toast.success('Private remote location removed');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not remove location'); }
  };
  const changeMode = async (member: Member, mode: Member['attendanceMode']) => {
    try {
      await api.patch(`/attendance/workspace/${workspaceId}/location-policy/members/${member.id}`, { attendanceMode: mode, remoteAreaIds: [] });
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, attendanceMode: mode } : item));
      toast.success(`Saved work mode for ${member.name}`);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not save work mode'); }
  };

  return <div className="space-y-6">
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Fixed On-site office</h2><p className="text-sm text-muted-foreground">One shared office geofence. On-site clock-in is allowed within 60 m.</p></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!policy.policy.enabled} onChange={(event) => setPolicy((current: any) => ({ ...current, policy: { ...current.policy, enabled: event.target.checked } }))} /> Enforce location at clock-in</label></div>
      <AttendanceLocationMapPicker latitude={office?.latitude ?? draft.latitude} longitude={office?.longitude ?? draft.longitude} hasSelection={hasMapSelection || !!office} radiusMeters={60} onSelect={(latitude, longitude) => { setDraft((current) => ({ ...current, latitude, longitude })); setHasMapSelection(true); }} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><Input aria-label="Office name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder={office?.name || 'Simalchaur office'} /><Button type="button" variant="outline" disabled={saving} onClick={() => getCurrentLocation((latitude, longitude) => { setDraft((current) => ({ ...current, latitude, longitude })); setHasMapSelection(true); })}>Center on my location</Button><Button type="button" disabled={saving || !hasMapSelection} onClick={() => saveOffice(draft)}>{office ? 'Update office pin' : 'Set office pin'}</Button></div>
      {office && <p className="text-xs text-muted-foreground">Office pin: {office.latitude.toFixed(5)}, {office.longitude.toFixed(5)} · 60 m</p>}
      <div className="max-w-md space-y-1"><label htmlFor="max-location-uncertainty" className="text-sm font-medium">Maximum location uncertainty (meters)</label><Input id="max-location-uncertainty" aria-label="Maximum location uncertainty (meters)" type="number" min={1} max={1000} value={policy.policy.maxAccuracyMeters ?? 100} onChange={(event) => setPolicy((current: any) => ({ ...current, policy: { ...current.policy, maxAccuracyMeters: Number(event.target.value) } }))} /><p className="text-xs text-muted-foreground">A higher limit accepts less precise device readings; it does not expand the 60 m office or private remote areas. Save the location policy after changing this value.</p></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => getCurrentLocation((latitude, longitude) => void saveOffice({ latitude, longitude }))}>Quick set office to my location</Button><Button type="button" disabled={saving} onClick={() => savePolicy({ ...policy.policy })}>{saving ? 'Saving…' : `Save enforcement ${policy.policy.enabled ? 'on' : 'off'}`}</Button></div>
      <p className="text-xs text-muted-foreground">If browser location checks stop during a shift, the shift stays active and is marked unavailable for review.</p>
    </section>

    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div><h2 className="text-lg font-semibold">Each member’s private Remote places</h2><p className="text-sm text-muted-foreground">Addresses are stored per person. A place assigned to one member never authorizes another member’s clock-in.</p></div>
      <label className="block max-w-lg text-sm">Choose member<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={selectedMemberId} onChange={(event) => { setSelectedMemberId(event.target.value); setEditingRemoteAreaId(null); setHasMapSelection(false); setDraft({ name: '', kind: 'remote', latitude: 27.7172, longitude: 85.324, radiusMeters: 60, isActive: true, networkIp: '' }); }}><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></label>
      {selectedMember && <>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{selectedMember.name}</p><p className="text-xs text-muted-foreground">Normal work mode</p></div><select aria-label={`${selectedMember.name} work mode`} className="h-9 rounded-md border bg-background px-3 text-sm" value={selectedMember.attendanceMode} onChange={(event) => void changeMode(selectedMember, event.target.value as Member['attendanceMode'])}><option value="onsite">On-site</option><option value="remote">Remote</option></select></div>
        <AttendanceLocationMapPicker latitude={draft.latitude} longitude={draft.longitude} hasSelection={hasMapSelection} radiusMeters={draft.radiusMeters} onSelect={(latitude, longitude) => { setDraft((current) => ({ ...current, latitude, longitude })); setHasMapSelection(true); }} />
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto_auto_auto]"><Input aria-label="Private remote place name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder={`e.g. ${selectedMember.name} home`} /><Input aria-label="Remote area radius in meters" type="number" min={25} value={draft.radiusMeters} onChange={(event) => setDraft((current) => ({ ...current, radiusMeters: Number(event.target.value) }))} /><Button type="button" variant="outline" onClick={() => getCurrentLocation((latitude, longitude) => { setDraft((current) => ({ ...current, latitude, longitude })); setHasMapSelection(true); })}>Center map on my location</Button><Button type="button" disabled={saving || !hasMapSelection} onClick={() => void saveRemoteArea(draft, editingRemoteArea)}>{saving ? 'Saving…' : editingRemoteAreaId ? 'Save changes' : 'Add private Remote place'}</Button>{editingRemoteAreaId && <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditingRemoteAreaId(null); setHasMapSelection(false); setDraft({ name: '', kind: 'remote', latitude: 27.7172, longitude: 85.324, radiusMeters: 60, isActive: true, networkIp: '' }); }}>Cancel</Button>}</div>
        <div className="max-w-xl space-y-1"><label htmlFor="remote-area-network-ip" className="text-sm font-medium">Optional registered public IP</label><Input id="remote-area-network-ip" aria-label="Optional registered public IP" inputMode="decimal" autoComplete="off" value={draft.networkIp || ''} onChange={(event) => setDraft((current) => ({ ...current, networkIp: event.target.value }))} placeholder="e.g. 203.0.113.10" /><p className="text-xs text-muted-foreground">Used only when GPS accuracy is too low, the reading’s uncertainty circle overlaps this geofence, and uncertainty is 250 m or better. An IP alone cannot authorize clock-in. Leave blank to use GPS only.</p></div>
        {!editingRemoteAreaId && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3"><span className="text-sm font-medium">Quick add at my current location:</span><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => getCurrentLocation((latitude, longitude) => void saveRemoteArea({ latitude, longitude }))}>Add to {selectedMember.name}</Button></div>}
        <div className="space-y-2">{selectedMember.remoteAreas.map((area) => <div key={area._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><button type="button" aria-label={`View ${area.name} on map`} className="min-w-0 flex-1 text-left" onClick={() => editRemoteArea(area)}><p className="font-medium">{area.name} <span className="text-xs text-muted-foreground">· {area.radiusMeters} m</span></p><p className="text-xs text-muted-foreground">Private to {selectedMember.name} · {area.latitude.toFixed(5)}, {area.longitude.toFixed(5)}</p></button><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => editRemoteArea(area)}>Edit</Button><Button type="button" size="sm" variant="destructive" disabled={saving} onClick={() => void removeRemoteArea(String(area._id))}>Remove</Button></div></div>)}{!selectedMember.remoteAreas.length && <p className="text-sm text-muted-foreground">No approved private remote places yet.</p>}</div>
      </>}
    </section>
  </div>;
}
