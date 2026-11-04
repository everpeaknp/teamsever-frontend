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
}

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324]; // Kathmandu default

export function FieldTrackingMap({
  workers,
  siteVisits,
  routePoints = [],
  selectedWorkerId,
  onSelectWorker,
  className = 'h-96',
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

    // 1. Render active site visit destination pins
    for (const visit of siteVisits) {
      if (!Number.isFinite(visit.latitude) || !Number.isFinite(visit.longitude)) continue;
      const coords: [number, number] = [visit.latitude, visit.longitude];
      if (visit.status === 'active') {
        boundsPoints.push(coords);
      }

      const isActive = visit.status === 'active';
      const marker = L.marker(coords, {
        icon: L.divIcon({
          className: 'field-visit-pin',
          html: `<span class="${isActive ? 'field-visit-pin-active' : 'field-visit-pin-completed'}" title="${visit.siteName}"></span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.4">
          <strong>${visit.siteName}</strong>
          ${visit.clientName ? `<br/>Client: ${visit.clientName}` : ''}
          ${visit.user?.name ? `<br/>Member: ${visit.user.name}` : ''}
          <br/>Status: ${isActive ? 'On Site Now' : 'Completed'}
        </div>`
      );
      marker.addTo(group);
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
      <style jsx global>{`
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
