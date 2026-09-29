'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Area = { _id?: string; name: string; kind: 'office' | 'remote'; latitude: number; longitude: number; radiusMeters: number; isActive: boolean };
type Member = { id: string; name: string; role: string; attendanceMode: 'onsite' | 'remote'; remoteAreaIds: string[] };

export function AttendanceLocationSettings({ workspaceId }: { workspaceId: string }) {
  const [policy, setPolicy] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Area>({ name: '', kind: 'office', latitude: 0, longitude: 0, radiusMeters: 150, isActive: true });

  const refresh = async () => {
    setLoading(true);
    try {
      const policyResponse = await api.get(`/attendance/workspace/${workspaceId}/location-policy`);
      const data = policyResponse.data.data;
      setPolicy(data);
      if (data.canManage) {
        const response = await api.get(`/attendance/workspace/${workspaceId}/location-policy/members`);
        setMembers(response.data.data.members || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load attendance locations');
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [workspaceId]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading location policy…</p>;
  if (!policy) return <p className="p-6 text-sm text-muted-foreground">Location policy is unavailable.</p>;
  if (!policy.canManage) return <p className="rounded-xl border p-4 text-sm text-muted-foreground">You do not have permission to manage attendance locations.</p>;

  const savePolicy = async (nextPolicy = policy.policy) => {
    setSaving(true);
    try {
      const response = await api.put(`/attendance/workspace/${workspaceId}/location-policy`, nextPolicy);
      setPolicy((current: any) => ({ ...current, policy: response.data.data.policy }));
      toast.success('Attendance location policy saved');
      return true;
    } catch (error: any) { await refresh(); toast.error(error.response?.data?.message || 'Could not save location policy'); return false; }
    finally { setSaving(false); }
  };

  const addArea = async () => {
    if (!draft.name.trim()) return toast.error('Enter a name for this area');
    const saved = await savePolicy({ ...policy.policy, areas: [...policy.policy.areas, { ...draft, name: draft.name.trim() }] });
    if (saved) setDraft({ name: '', kind: 'office', latitude: 0, longitude: 0, radiusMeters: 150, isActive: true });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('This browser does not provide location access');
    navigator.geolocation.getCurrentPosition((position) => setDraft((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude })), () => toast.error('Could not read this device location'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const updateMember = async (member: Member, changes: Partial<Member>) => {
    const next = { ...member, ...changes };
    setMembers((current) => current.map((row) => row.id === member.id ? next : row));
    try {
      await api.patch(`/attendance/workspace/${workspaceId}/location-policy/members/${member.id}`, { attendanceMode: next.attendanceMode, remoteAreaIds: next.remoteAreaIds });
      toast.success(`Saved attendance assignment for ${member.name}`);
    } catch (error: any) {
      setMembers((current) => current.map((row) => row.id === member.id ? member : row));
      toast.error(error.response?.data?.message || 'Could not save member assignment');
    }
  };

  const changeMode = async (member: Member, mode: Member['attendanceMode']) => {
    if (mode === 'remote' && !member.remoteAreaIds.length) {
      const firstRemoteArea = policy.policy.areas.find((area: Area) => area.kind === 'remote' && area.isActive);
      if (firstRemoteArea) return updateMember(member, { attendanceMode: mode, remoteAreaIds: [String(firstRemoteArea._id)] });
    }
    await updateMember(member, { attendanceMode: mode });
  };

  return <div className="space-y-6">
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Location enforcement</h2><p className="text-sm text-muted-foreground">Clock-in is checked by the server against the member’s assigned areas.</p></div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!policy.policy.enabled} onChange={(event) => setPolicy((current: any) => ({ ...current, policy: { ...current.policy, enabled: event.target.checked } }))} /> Enforce location at clock-in</label>
      </div>
      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">During a shift, checks run only while the attendance page stays open. If checks stop, Teamsever marks the location unavailable for review and leaves the clock and recorded time unchanged. Browser location can be spoofed on the device.</p>
      <Button type="button" disabled={saving} onClick={() => savePolicy()}>{saving ? 'Saving…' : 'Save enforcement setting'}</Button>
    </section>

    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div><h2 className="text-lg font-semibold">Office and remote areas</h2><p className="text-sm text-muted-foreground">Coordinates stay private from regular members and are not stored in location check history.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">Area name<Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Main office" /></label>
        <label className="text-sm">Area type<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Area['kind'] })}><option value="office">Office</option><option value="remote">Remote</option></select></label>
        <label className="text-sm">Radius (meters)<Input type="number" min={25} max={50000} value={draft.radiusMeters} onChange={(e) => setDraft({ ...draft, radiusMeters: Number(e.target.value) })} /></label>
        <label className="text-sm">Latitude<Input type="number" step="any" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: Number(e.target.value) })} /></label>
        <label className="text-sm">Longitude<Input type="number" step="any" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: Number(e.target.value) })} /></label>
        <div className="flex items-end gap-2"><Button type="button" variant="outline" onClick={useCurrentLocation}>Use my location</Button><Button type="button" disabled={saving} onClick={addArea}>Add area</Button></div>
      </div>
      <div className="space-y-2">{policy.policy.areas.map((area: Area) => <div key={area._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{area.name} <span className="text-xs text-muted-foreground">{area.kind} · {area.radiusMeters} m</span></p><p className="text-xs text-muted-foreground">{area.latitude}, {area.longitude}</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => savePolicy({ ...policy.policy, areas: policy.policy.areas.map((item: Area) => item._id === area._id ? { ...item, isActive: !item.isActive } : item) })}>{area.isActive ? 'Disable' : 'Enable'}</Button><Button type="button" size="sm" variant="destructive" onClick={() => savePolicy({ ...policy.policy, areas: policy.policy.areas.filter((item: Area) => item._id !== area._id) })}>Remove</Button></div></div>)}</div>
    </section>

    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div><h2 className="text-lg font-semibold">Member work modes</h2><p className="text-sm text-muted-foreground">On-site members use any active office. Remote members need at least one assigned active remote area.</p></div>
      {members.map((member) => <div key={member.id} className="rounded-lg border p-3 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.role}</p></div><select className="h-9 rounded-md border bg-background px-3 text-sm" value={member.attendanceMode} onChange={(e) => changeMode(member, e.target.value as Member['attendanceMode'])}><option value="onsite">On-site</option><option value="remote">Remote</option></select></div>{member.attendanceMode === 'remote' && <div className="grid gap-2 sm:grid-cols-2">{policy.policy.areas.filter((area: Area) => area.kind === 'remote' && area.isActive).map((area: Area) => <label key={area._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={member.remoteAreaIds.includes(String(area._id))} onChange={(e) => updateMember(member, { remoteAreaIds: e.target.checked ? [...member.remoteAreaIds, String(area._id)] : member.remoteAreaIds.filter((id) => id !== area._id) })} />{area.name}</label>)}{!policy.policy.areas.some((area: Area) => area.kind === 'remote' && area.isActive) && <p className="text-sm text-muted-foreground">Add an active remote area first.</p>}</div>}</div>)}
      {!members.length && <p className="text-sm text-muted-foreground">No workspace members were returned.</p>}
    </section>
  </div>;
}
