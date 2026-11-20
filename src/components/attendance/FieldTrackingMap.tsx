'use client';

import { useEffect, useRef } from 'react';
import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface FieldWorkerMapItem {
  userId: string;
  name: string;
  isLive?: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    speed?: number;
    batteryLevel?: number;
    lastPingAt?: string;
  } | null;
  activeSiteVisit?: {
    _id?: string;
    siteName?: string;
    clientName?: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

export interface FieldSiteVisitMapItem {
  _id: string;
  siteName: string;
  clientName?: string;
  purpose?: string;
  latitude: number;
  longitude: number;
  status: string;
  assignmentMode?: string;
  routeStops?: Array<{
    name: string;
    latitude?: number;
    longitude?: number;
    sequence?: number;
    status?: string;
  }>;
  user?: {
    _id?: string;
    name?: string;
  };
}

interface FieldTrackingMapProps {
  workers: FieldWorkerMapItem[];
  siteVisits: FieldSiteVisitMapItem[];
  routePoints?: Array<{ latitude: number; longitude: number }>;
  selectedWorkerId?: string | null;
  onSelectWorker?: (userId: string) => void;
  className?: string;
  showCompletedVisits?: boolean;
}

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324]; // Kathmandu default

export function FieldTrackingMap({
  workers,
  siteVisits,
  routePoints = [],
  selectedWorkerId,
  onSelectWorker,
  className = 'h-96',
  showCompletedVisits = false,
}: FieldTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const boundsPoints: Array<[number, number]> = [];

    // 1. Render active & scheduled site visit destination pins
    for (const visit of siteVisits) {
      if (Number.isFinite(visit.latitude) && Number.isFinite(visit.longitude)) {
        const isCompleted = visit.status === 'completed';
        const isCancelled = visit.status === 'cancelled';
        if (!showCompletedVisits && (isCompleted || isCancelled)) {
          continue;
        }

        const coords: [number, number] = [visit.latitude, visit.longitude];
        if (visit.status === 'active' || visit.status === 'en_route') {
          boundsPoints.push(coords);
        }

        const isActive = visit.status === 'active';
        const isScheduled = visit.status === 'scheduled';
        const isEnRoute = visit.status === 'en_route';
        const isPaused = visit.status === 'paused';

        let badgeBg = '#64748b';
        let badgeIcon = '';
        let statusBadge = '<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">PAST VISIT</span>';

        if (isActive) {
          badgeBg = '#e11d48';
          badgeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';
          statusBadge = '<span style="background:#ffe4e6;color:#e11d48;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">● ACTIVE VISIT</span>';
        } else if (isEnRoute) {
          badgeBg = '#f97316';
          badgeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
          statusBadge = '<span style="background:#ffedd5;color:#ea580c;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">EN ROUTE</span>';
        } else if (isScheduled) {
          badgeBg = '#3b82f6';
          badgeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
          statusBadge = '<span style="background:#dbeafe;color:#2563eb;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">SCHEDULED</span>';
        } else if (isPaused) {
          badgeBg = '#eab308';
          badgeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
          statusBadge = '<span style="background:#fef9c3;color:#ca8a04;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">PAUSED</span>';
        } else if (isCompleted) {
          badgeBg = '#059669';
          badgeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          statusBadge = '<span style="background:#d1fae5;color:#059669;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">✓ COMPLETED</span>';
        }

        const marker = L.marker(coords, {
          icon: L.divIcon({
            className: 'field-visit-pin',
            html: `<div style="background:${badgeBg};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2.5px solid white;">${badgeIcon}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        });

        marker.bindPopup(
          `<div style="font-family:inherit;min-width:180px;padding:4px 2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              ${statusBadge}
              ${visit.assignmentMode ? `<span style="font-size:9.5px;color:#64748b;text-transform:uppercase;font-weight:600;">${visit.assignmentMode.replace('_', ' ')}</span>` : ''}
            </div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;margin-bottom:4px;">${visit.siteName}</div>
            ${visit.clientName ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;"><strong>Client:</strong> ${visit.clientName}</div>` : ''}
            ${visit.user?.name ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;"><strong>Member:</strong> ${visit.user.name}</div>` : ''}
            ${visit.purpose ? `<div style="font-size:10.5px;color:#64748b;margin-top:4px;">Purpose: ${visit.purpose}</div>` : ''}
          </div>`
        );
        marker.addTo(group);
      }

      // If visit has route stops, render stop pins and dashed connecting polyline
      if (Array.isArray(visit.routeStops) && visit.routeStops.length > 0) {
        const validStops = visit.routeStops.filter(
          (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
        );
        if (validStops.length > 0) {
          const stopCoords: Array<[number, number]> = [];
          validStops.forEach((stop, idx) => {
            const sCoords: [number, number] = [stop.latitude!, stop.longitude!];
            stopCoords.push(sCoords);
            if (visit.status === 'active' || visit.status === 'en_route') {
              boundsPoints.push(sCoords);
            }

            const isDone = stop.status === 'completed';
            const isArrived = stop.status === 'arrived';
            const badgeBg = isDone ? '#10b981' : isArrived ? '#f59e0b' : '#3b82f6';

            const stopMarker = L.marker(sCoords, {
              icon: L.divIcon({
                className: 'route-stop-pin',
                html: `<div style="background:${badgeBg};color:white;font-size:10px;font-weight:700;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);border:2px solid white;">${stop.sequence || idx + 1}</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              }),
            });
            stopMarker.bindTooltip(`Stop ${stop.sequence || idx + 1}: ${stop.name} (${(stop.status || 'pending').toUpperCase()})`, {
              direction: 'top',
              offset: [0, -10],
            });
            stopMarker.addTo(group);
          });

          if (stopCoords.length > 1) {
            L.polyline(stopCoords, {
              color: '#6366f1',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.75,
            }).addTo(group);
          }
        }
      }
    }

    // 2. Render active field workers
    for (const worker of workers) {
      const lat = worker.currentLocation?.latitude ?? worker.activeSiteVisit?.latitude;
      const lng = worker.currentLocation?.longitude ?? worker.activeSiteVisit?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const coords: [number, number] = [lat!, lng!];
      boundsPoints.push(coords);
      const isSelected = selectedWorkerId === worker.userId;
      const initials = (worker.name || 'W')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const marker = L.marker(coords, {
        icon: L.divIcon({
          className: 'field-worker-pin',
          html: `<div class="field-worker-badge ${worker.isLive ? 'is-live' : ''} ${isSelected ? 'is-selected' : ''}">${initials}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      });

      marker.on('click', () => {
        onSelectWorker?.(worker.userId);
      });

      marker.bindTooltip(
        `${worker.name}${worker.activeSiteVisit?.siteName ? ` · @ ${worker.activeSiteVisit.siteName}` : ''}`,
        { direction: 'top', offset: [0, -14] }
      );
      marker.addTo(group);
    }

    // 3. Render selected worker breadcrumb route
    if (routePoints.length > 1) {
      const latLngs: Array<[number, number]> = routePoints
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => [p.latitude, p.longitude]);
      if (latLngs.length > 1) {
        L.polyline(latLngs, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.85,
        }).addTo(group);
        boundsPoints.push(...latLngs);
      }
    }

    if (selectedWorkerId) {
      const selected = workers.find((w) => w.userId === selectedWorkerId);
      const sLat = selected?.currentLocation?.latitude ?? selected?.activeSiteVisit?.latitude;
      const sLng = selected?.currentLocation?.longitude ?? selected?.activeSiteVisit?.longitude;
      if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
        map.setView([sLat!, sLng!], Math.max(map.getZoom(), 15));
        return;
      }
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 15);
    } else if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [36, 36], maxZoom: 16 });
    }
  }, [workers, siteVisits, routePoints, selectedWorkerId, onSelectWorker]);

  return (
    <div className="relative isolate z-0 min-w-0 overflow-hidden rounded-xl border bg-muted">
      <div
        ref={containerRef}
        role="application"
        aria-label="Live field GPS tracking map"
        className={`${className} w-full`}
      />
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1.5 right-1.5 z-[500] rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm hover:underline"
      >
        © OpenStreetMap contributors
      </a>
      <style>{`
        .field-visit-pin,
        .field-worker-pin {
          background: transparent;
          border: 0;
        }
        .field-visit-pin span {
          display: block;
          width: 18px;
          height: 18px;
          margin: 3px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
        }
        .field-visit-pin .field-visit-pin-active {
          background: #e11d48;
        }
        .field-visit-pin .field-visit-pin-completed {
          background: #64748b;
        }
        .field-worker-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: #1d4ed8;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }
        .field-worker-badge.is-live {
          background: #059669;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0, 0, 0, 0.35);
        }
        .field-worker-badge.is-selected {
          border-color: #f59e0b;
          transform: scale(1.08);
        }
      `}</style>
    </div>
  );
}
export default FieldTrackingMap;
