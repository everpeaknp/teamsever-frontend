'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BatteryCharging,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Gauge,
  Loader2,
  MapPin,
  Maximize2,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Users,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import type { FieldSiteVisitMapItem, FieldWorkerMapItem } from './FieldTrackingMap';

const FieldTrackingMap = dynamic(
  () => import('./FieldTrackingMap').then((mod) => mod.FieldTrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />,
  }
);

interface FieldWorker extends FieldWorkerMapItem {
  email?: string;
  avatar?: string;
  role?: string;
  shiftStartTime?: string;
  attendanceMode?: string;
}

interface RouteStopDetail {
  _id?: string;
  stopId?: string;
  name: string;
  sequence: number;
  status?: 'pending' | 'arrived' | 'completed' | 'skipped';
  address?: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  photos?: string[];
  signatureUrl?: string;
  unplanned?: boolean;
}

interface SiteVisitItem extends FieldSiteVisitMapItem {
  address?: string;
  notes?: string;
  checkInTime?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  assignmentMode?: 'point_visit' | 'route' | 'territory' | 'roaming_field';
  routeStops?: RouteStopDetail[];
  territoryName?: string;
  checkOutTime?: string;
  durationMinutes?: number;
  totalPausedMinutes?: number;
  cancellationReason?: string;
  user?: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
    profilePicture?: string;
  };
}

const PURPOSE_LABELS: Record<string, string> = {
  site_visit: 'Site Inspection / Visit',
  meeting: 'Client Meeting',
  inspection: 'Quality / Safety Inspection',
  delivery: 'Material / Goods Delivery',
  maintenance: 'Repair / Maintenance',
  survey: 'Field Survey',
  other: 'Other Field Duty',
};

function readCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Browser geolocation is not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function FieldTrackingTab({ workspaceId }: { workspaceId: string }) {
  const { socket } = useSocket();
  const [workers, setWorkers] = useState<FieldWorker[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showPastVisitsOnMap, setShowPastVisitsOnMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'en_route' | 'active' | 'paused' | 'completed' | 'cancelled'>('all');
  const [actingVisitId, setActingVisitId] = useState<string | null>(null);

  // Ping / Check-in state
  const [pinging, setPinging] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
  const [clientName, setClientName] = useState('');
  const [purpose, setPurpose] = useState('site_visit');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const loadData = useCallback(
    async (silent = false) => {
      if (!workspaceId) return;
      if (!silent) setLoading(true);
      try {
        const [liveRes, visitsRes] = await Promise.allSettled([
          api.get(`/attendance/workspace/${workspaceId}/field-tracking/live`),
          api.get(`/attendance/workspace/${workspaceId}/field-tracking/site-visits`),
        ]);

        if (liveRes.status === 'fulfilled') {
          const rawWorkers = liveRes.value.data?.data?.workers;
          setWorkers(Array.isArray(rawWorkers) ? rawWorkers : []);
        }
        if (visitsRes.status === 'fulfilled') {
          const rawVisits = visitsRes.value.data?.data;
          setSiteVisits(Array.isArray(rawVisits) ? rawVisits : []);
        }
      } catch {
        if (!silent) toast.error('Could not load field GPS tracking data');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    void loadData(false);
    const timer = window.setInterval(() => {
      void loadData(true);
    }, 25000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    if (!socket || !workspaceId) return;
    const handleTrackerUpdate = (payload: any) => {
      if (payload?.workspaceId && String(payload.workspaceId) !== String(workspaceId)) return;
      void loadData(true);
    };
    socket.on('FIELD_TRACKER_UPDATE', handleTrackerUpdate);
    return () => {
      socket.off('FIELD_TRACKER_UPDATE', handleTrackerUpdate);
    };
  }, [socket, workspaceId, loadData]);

  const handleSelectWorker = useCallback(
    async (userId: string, dateOverride?: string) => {
      setSelectedWorkerId(userId);
      setLoadingRoute(true);
      setRoutePoints([]);
      const targetDate = dateOverride || selectedDate;
      try {
        const res = await api.get(
          `/attendance/workspace/${workspaceId}/field-tracking/routes/${userId}?date=${targetDate}`
        );
        const route = res.data?.data?.route;
        if (Array.isArray(route)) {
          setRoutePoints(
            route
              .filter(
                (p: any) =>
                  Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
              )
              .map((p: any) => ({
                latitude: Number(p.latitude),
                longitude: Number(p.longitude),
              }))
          );
        }
      } catch {
        setRoutePoints([]);
      } finally {
        setLoadingRoute(false);
      }
    },
    [workspaceId]
  );

  const handleBroadcastLocation = async () => {
    setPinging(true);
    try {
      const pos = await readCurrentPosition();
      const speedKmh =
        pos.coords.speed != null && Number.isFinite(pos.coords.speed)
          ? Math.max(0, Math.min(200, pos.coords.speed * 3.6))
          : 0;
      await api.post(`/attendance/workspace/${workspaceId}/field-tracking/ping`, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || 10,
        speed: speedKmh,
        heading: pos.coords.heading || 0,
        batteryLevel: 100,
        isMoving: speedKmh > 1,
      });
      toast.success('Live GPS location updated');
      await loadData(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Could not broadcast current GPS location'
      );
    } finally {
      setPinging(false);
    }
  };

  const handleFillMyCoordinates = async () => {
    try {
      const pos = await readCurrentPosition();
      setManualLat(pos.coords.latitude.toFixed(6));
      setManualLng(pos.coords.longitude.toFixed(6));
      toast.success('Captured your current GPS coordinates');
    } catch (err: any) {
      toast.error(err?.message || 'Could not capture device coordinates');
    }
  };

  const handleCreateSiteVisit = async () => {
    if (!siteName.trim()) {
      toast.error('Site or client location name is required');
      return;
    }
    setSubmittingVisit(true);
    try {
      let latitude = Number(manualLat);
      let longitude = Number(manualLng);

      if (!manualLat.trim() || !manualLng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const pos = await readCurrentPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }

      await api.post(`/attendance/workspace/${workspaceId}/field-tracking/site-visits`, {
        siteName: siteName.trim(),
        clientName: clientName.trim() || undefined,
        purpose,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        latitude,
        longitude,
      });

      toast.success(`Checked in at ${siteName.trim()}`);
      setCheckInOpen(false);
      setSiteName('');
      setClientName('');
      setPurpose('site_visit');
      setAddress('');
      setNotes('');
      setManualLat('');
      setManualLng('');
      await loadData(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Could not check in to site visit. Enter coordinates or allow location access.'
      );
    } finally {
      setSubmittingVisit(false);
    }
  };

  const handleCompleteVisit = async (visitId: string) => {
    setCompletingVisitId(visitId);
    try {
      await api.patch(
        `/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/complete`,
        {}
      );
      toast.success('Site visit completed and checked out');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete site visit');
    } finally {
      setCompletingVisitId(null);
    }
  };

  const handleStartScheduledVisit = async (visit: SiteVisitItem) => {
    setStartingVisitId(visit._id);
    try {
      const pos = await readCurrentPosition();
      await api.post(
        `/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visit._id}/start`,
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
        }
      );
      toast.success(`Started ${visit.siteName}`);
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not start this field assignment');
    } finally {
      setStartingVisitId(null);
    }
  };

  const handleSetEnRoute = async (visit: SiteVisitItem) => {
    setActingVisitId(visit._id);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      let accuracy: number | undefined;
      try {
        const pos = await readCurrentPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      } catch {}

      await api.post(
        `/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visit._id}/en-route`,
        { latitude, longitude, accuracy }
      );
      toast.success(`En route to ${visit.siteName}`);
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update to en-route');
    } finally {
      setActingVisitId(null);
    }
  };

  const handlePauseVisit = async (visitId: string) => {
    setActingVisitId(visitId);
    try {
      await api.post(`/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/pause`, {});
      toast.success('Assignment paused (break)');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not pause assignment');
    } finally {
      setActingVisitId(null);
    }
  };

  const handleResumeVisit = async (visitId: string) => {
    setActingVisitId(visitId);
    try {
      await api.post(`/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/resume`, {});
      toast.success('Assignment resumed');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not resume assignment');
    } finally {
      setActingVisitId(null);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    setActingVisitId(visitId);
    try {
      await api.post(`/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/cancel`, {
        reason: 'Cancelled via dashboard',
      });
      toast.success('Assignment cancelled');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not cancel assignment');
    } finally {
      setActingVisitId(null);
    }
  };

  const handleCheckInStop = async (visitId: string, stopId: string) => {
    setActingVisitId(`${visitId}_${stopId}`);
    try {
      const pos = await readCurrentPosition();
      await api.post(
        `/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/stops/${stopId}/check-in`,
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
        }
      );
      toast.success('Checked in at stop');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not check in at stop');
    } finally {
      setActingVisitId(null);
    }
  };

  const handleCompleteStop = async (visitId: string, stopId: string) => {
    setActingVisitId(`${visitId}_${stopId}`);
    try {
      await api.post(
        `/attendance/workspace/${workspaceId}/field-tracking/site-visits/${visitId}/stops/${stopId}/complete`,
        { notes: 'Completed stop' }
      );
      toast.success('Stop marked completed');
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not complete stop');
    } finally {
      setActingVisitId(null);
    }
  };

  const selectedWorker = workers.find((w) => w.userId === selectedWorkerId) || null;
  const activeVisitsCount = siteVisits.filter((v) => v.status === 'active').length;
  const liveWorkersCount = workers.filter((w) => w.isLive).length;
  const filteredVisits = siteVisits.filter((v) =>
    statusFilter === 'all' ? true : v.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Summary & Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {liveWorkersCount} Live GPS {liveWorkersCount === 1 ? 'worker' : 'workers'}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5 text-rose-500" />
            {activeVisitsCount} Active on-site {activeVisitsCount === 1 ? 'visit' : 'visits'}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            {siteVisits.length} Total recorded visits
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData(false)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBroadcastLocation}
            disabled={pinging}
            className="gap-1.5"
          >
            {pinging ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5 text-emerald-600" />
            )}
            Broadcast My GPS
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setCheckInOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Check-in Site Visit
          </Button>
        </div>
      </div>

      {/* Live Map + Active Field Roster */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4 text-primary" />
                Live Field Map & Site Pins
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Green/blue badges show clocked-in field members; red pins show active site visits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showPastVisitsOnMap ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowPastVisitsOnMap((prev) => !prev)}
                className="gap-1.5 text-xs h-8"
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${showPastVisitsOnMap ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                {showPastVisitsOnMap ? 'Hide Past Visits' : 'Show Past Visits'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Expand field map"
                onClick={() => setIsMapExpanded(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Expand Map
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isMapExpanded && (
              <FieldTrackingMap
                workers={workers}
                siteVisits={siteVisits}
                routePoints={routePoints}
                selectedWorkerId={selectedWorkerId}
                onSelectWorker={handleSelectWorker}
                showCompletedVisits={showPastVisitsOnMap}
                className="h-80 sm:h-96"
              />
            )}

            {selectedWorker && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    user={{
                      _id: selectedWorker.userId,
                      name: selectedWorker.name,
                      avatar: selectedWorker.avatar,
                    }}
                    className="h-9 w-9"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{selectedWorker.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          selectedWorker.isLive
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                            : ''
                        }
                      >
                        {selectedWorker.isLive ? 'Live GPS' : 'Active Shift'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {selectedWorker.activeSiteVisit?.siteName
                        ? `On site: ${selectedWorker.activeSiteVisit.siteName}`
                        : 'In transit / field shift'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Gauge className="h-3.5 w-3.5 text-primary" />
                    {Math.round(selectedWorker.currentLocation?.speed || 0)} km/h
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                    {selectedWorker.currentLocation?.batteryLevel ?? 100}%
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Route className="h-3.5 w-3.5 text-primary" />
                    {loadingRoute ? 'Loading trail…' : `${routePoints.length} GPS points`}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedDate(next);
                        if (selectedWorker.userId) {
                          void handleSelectWorker(selectedWorker.userId, next);
                        }
                      }}
                      className="h-7 rounded border border-border bg-background px-1.5 text-xs font-medium text-foreground"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedWorkerId(null);
                      setRoutePoints([]);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Workers Sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Active Field Roster ({workers.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Click a member to center the map and trace today&apos;s route.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading active field roster…
              </div>
            ) : workers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                No members are currently clocked in or on an active site visit.
              </div>
            ) : (
              <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {workers.map((worker) => {
                  const isSelected = selectedWorkerId === worker.userId;
                  return (
                    <button
                      key={worker.userId}
                      type="button"
                      onClick={() => void handleSelectWorker(worker.userId)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border/70 hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar
                            user={{
                              _id: worker.userId,
                              name: worker.name,
                              avatar: worker.avatar,
                            }}
                            className="h-8 w-8 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {worker.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {worker.activeSiteVisit?.siteName
                                ? `@ ${worker.activeSiteVisit.siteName}`
                                : worker.currentLocation
                                  ? `${worker.currentLocation.latitude.toFixed(4)}, ${worker.currentLocation.longitude.toFixed(4)}`
                                  : 'Awaiting GPS ping'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            worker.isLive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={worker.isLive ? 'Live GPS' : 'Idle'}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Site Visits Log (Approved & Checked-in Visits) */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Site Visits & Approved Field Destinations</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Approved site visit requests and on-site field check-ins appear here automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { key: 'all', label: 'All' },
              { key: 'scheduled', label: 'Scheduled' },
              { key: 'en_route', label: 'En Route' },
              { key: 'active', label: 'Active' },
              { key: 'paused', label: 'Paused' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ] as const).map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={statusFilter === tab.key ? 'default' : 'outline'}
                onClick={() => setStatusFilter(tab.key)}
                className="h-8 text-xs capitalize"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading site visits…
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No site visits match this filter yet.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredVisits.map((visit) => {
                const isScheduled = visit.status === 'scheduled';
                const isEnRoute = visit.status === 'en_route';
                const isActive = visit.status === 'active';
                const isPaused = visit.status === 'paused';
                const isCompleted = visit.status === 'completed';
                const isCancelled = visit.status === 'cancelled';

                return (
                  <article
                    key={visit._id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-sm"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar
                            user={
                              visit.user || {
                                _id: 'member',
                                name: 'Workspace Member',
                              }
                            }
                            className="h-9 w-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {visit.siteName}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                              {visit.user?.name || 'Member'}
                              {visit.clientName ? ` · Client: ${visit.clientName}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isScheduled
                              ? 'shrink-0 border-blue-500/30 bg-blue-500/10 text-blue-600'
                              : isEnRoute
                              ? 'shrink-0 border-indigo-500/30 bg-indigo-500/10 text-indigo-600'
                              : isActive
                              ? 'shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                              : isPaused
                              ? 'shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-600'
                              : isCancelled
                              ? 'shrink-0 border-rose-500/30 bg-rose-500/10 text-rose-600'
                              : 'shrink-0'
                          }
                        >
                          {isScheduled
                            ? 'SCHEDULED'
                            : isEnRoute
                            ? 'EN ROUTE'
                            : isActive
                            ? 'ON SITE NOW'
                            : isPaused
                            ? 'PAUSED'
                            : isCancelled
                            ? 'CANCELLED'
                            : 'COMPLETED'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Checked in:{' '}
                          {visit.checkInTime
                            ? new Date(visit.checkInTime).toLocaleString()
                            : visit.plannedStartDate
                              ? `Planned: ${new Date(visit.plannedStartDate).toLocaleDateString()}`
                              : 'Not started'}
                        </span>
                        <span>
                          Duration:{' '}
                          {visit.durationMinutes && visit.durationMinutes > 0
                            ? `${visit.durationMinutes} mins`
                            : isActive || isPaused
                              ? 'In progress'
                              : '—'}
                        </span>
                        {visit.assignmentMode && visit.assignmentMode !== 'point_visit' && (
                          <span className="capitalize">Mode: {visit.assignmentMode.replaceAll('_', ' ')}</span>
                        )}
                        {Number.isFinite(visit.latitude) && Number.isFinite(visit.longitude) && (
                          <span>
                            GPS: {Number(visit.latitude).toFixed(5)},{' '}
                            {Number(visit.longitude).toFixed(5)}
                          </span>
                        )}
                      </div>

                      {visit.address && (
                        <p className="text-xs text-muted-foreground">Address: {visit.address}</p>
                      )}
                      {visit.notes && (
                        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground">
                          {visit.notes}
                        </p>
                      )}

                      {/* Route Stops display */}
                      {Array.isArray(visit.routeStops) && visit.routeStops.length > 0 && (
                        <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Route Stops ({visit.routeStops.filter(s => s.status === 'completed').length}/{visit.routeStops.length} Completed)
                          </p>
                          <div className="space-y-1">
                            {visit.routeStops.map((stop, idx) => {
                              const sId = stop._id || stop.stopId || String(idx);
                              const isStopDone = stop.status === 'completed';
                              const isStopArrived = stop.status === 'arrived';
                              const isStopLoading = actingVisitId === `${visit._id}_${sId}`;

                              return (
                                <div
                                  key={sId}
                                  className="flex items-center justify-between gap-2 rounded border border-border/40 bg-card px-2.5 py-1.5 text-xs"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                      {stop.sequence || idx + 1}
                                    </span>
                                    <span className={`truncate ${isStopDone ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}`}>
                                      {stop.name}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] capitalize py-0 px-1.5"
                                    >
                                      {stop.status || 'pending'}
                                    </Badge>
                                    {(isActive || isEnRoute) && !isStopDone && (
                                      <>
                                        {!isStopArrived ? (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isStopLoading}
                                            onClick={() => void handleCheckInStop(visit._id, sId)}
                                            className="h-6 px-2 text-[10px]"
                                          >
                                            {isStopLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Arrive'}
                                          </Button>
                                        ) : (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isStopLoading}
                                            onClick={() => void handleCompleteStop(visit._id, sId)}
                                            className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                                          >
                                            {isStopLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Complete'}
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    {!isCompleted && !isCancelled && (
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                        {isScheduled && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actingVisitId === visit._id}
                              onClick={() => void handleSetEnRoute(visit)}
                              className="text-xs"
                            >
                              En Route
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={startingVisitId === visit._id}
                              onClick={() => void handleStartScheduledVisit(visit)}
                              className="gap-1.5 text-xs"
                            >
                              {startingVisitId === visit._id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Start with GPS
                            </Button>
                          </>
                        )}

                        {isEnRoute && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={startingVisitId === visit._id}
                            onClick={() => void handleStartScheduledVisit(visit)}
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {startingVisitId === visit._id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Arrive & Check In
                          </Button>
                        )}

                        {isActive && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actingVisitId === visit._id}
                              onClick={() => void handlePauseVisit(visit._id)}
                              className="gap-1.5 text-xs"
                            >
                              Pause (Break)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={completingVisitId === visit._id}
                              onClick={() => void handleCompleteVisit(visit._id)}
                              className="gap-1.5 text-xs text-emerald-600"
                            >
                              {completingVisitId === visit._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Complete Visit
                            </Button>
                          </>
                        )}

                        {isPaused && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={actingVisitId === visit._id}
                              onClick={() => void handleResumeVisit(visit._id)}
                              className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              Resume Work
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={completingVisitId === visit._id}
                              onClick={() => void handleCompleteVisit(visit._id)}
                              className="gap-1.5 text-xs"
                            >
                              Finish & Check-out
                            </Button>
                          </>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={actingVisitId === visit._id}
                          onClick={() => void handleCancelVisit(visit._id)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Map Dialog */}
      <Dialog open={isMapExpanded} onOpenChange={setIsMapExpanded}>
        <DialogContent
          aria-label="Fullscreen field GPS tracking map"
          className="z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto p-3 sm:p-5"
        >
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle>Live Field GPS Visits & Active Workers</DialogTitle>
              <DialogDescription>
                Real-time worker locations, approved/checked-in client site pins, and breadcrumb trails.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant={showPastVisitsOnMap ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowPastVisitsOnMap((prev) => !prev)}
              className="mr-6 gap-1.5 text-xs h-8"
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${showPastVisitsOnMap ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              {showPastVisitsOnMap ? 'Hide Past Visits' : 'Show Past Visits'}
            </Button>
          </DialogHeader>
          <FieldTrackingMap
            workers={workers}
            siteVisits={siteVisits}
            routePoints={routePoints}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={handleSelectWorker}
            showCompletedVisits={showPastVisitsOnMap}
            className="h-[min(74dvh,48rem)]"
          />
        </DialogContent>
      </Dialog>

      {/* On-Site Visit Check-In Dialog */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>On-Site Visit Check-In</DialogTitle>
            <DialogDescription>
              Record your arrival at a client site or field project location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Site / Location Name *</label>
              <Input
                placeholder="e.g. Apex Hospital Site C"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Client / Account (Optional)</label>
                <Input
                  placeholder="e.g. Nabil Bank"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Purpose</label>
                <select
                  aria-label="Purpose of visit"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Address (Optional)</label>
              <Input
                placeholder="Street or landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Latitude</label>
                <Input
                  placeholder="Auto from GPS"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Longitude</label>
                <Input
                  placeholder="Auto from GPS"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleFillMyCoordinates}>
                Use GPS
              </Button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Visit Notes / Remarks</label>
              <Textarea
                rows={2}
                placeholder="Summary of objectives or contacts met..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckInOpen(false)}
              disabled={submittingVisit}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateSiteVisit} disabled={submittingVisit}>
              {submittingVisit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Site Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FieldTrackingTab;
