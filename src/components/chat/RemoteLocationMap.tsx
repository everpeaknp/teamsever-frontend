'use client';

import { useEffect, useRef } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  latitude: number;
  longitude: number;
  className?: string;
};

export function RemoteLocationMap({ latitude, longitude, className = 'h-36' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const point: L.LatLngExpression = [latitude, longitude];
    const map = L.map(containerRef.current, { center: point, zoom: 16, zoomControl: true, attributionControl: false, scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker(point, {
      icon: L.divIcon({ className: 'remote-location-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).addTo(map);
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return <div className="relative isolate z-0 min-w-0 overflow-hidden rounded-md border bg-muted">
    <div ref={containerRef} role="application" aria-label={`Map showing the requested remote location at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`} className={`${className} w-full`} />
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-1 z-[500] rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm hover:underline">© OpenStreetMap contributors</a>
    <style jsx global>{`
      .remote-location-pin { background: transparent; border: 0; }
      .remote-location-pin span { display: block; width: 20px; height: 20px; margin: 2px; border: 3px solid white; border-radius: 50%; background: #2563eb; box-shadow: 0 1px 6px #0008; }
    `}</style>
  </div>;
}
