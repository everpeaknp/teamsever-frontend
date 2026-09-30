'use client';

import { useEffect, useRef } from 'react';
import L, { type Circle, type Map as LeafletMap, type Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  latitude: number;
  longitude: number;
  hasSelection: boolean;
  radiusMeters: number;
  onSelect: (latitude: number, longitude: number) => void;
};

const FALLBACK_CENTER: L.LatLngExpression = [20, 0];

export function AttendanceLocationMapPicker({ latitude, longitude, hasSelection, radiusMeters, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const radiusRef = useRef<Circle | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialCenter: L.LatLngExpression = hasSelection ? [latitude, longitude] : FALLBACK_CENTER;
    const map = L.map(containerRef.current, { center: initialCenter, zoom: hasSelection ? 15 : 2, scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      onSelectRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;
    const resize = () => map.invalidateSize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      radiusRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasSelection) {
      markerRef.current?.remove();
      radiusRef.current?.remove();
      markerRef.current = null;
      radiusRef.current = null;
      return;
    }

    const point: L.LatLngExpression = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(point, {
        draggable: true,
        icon: L.divIcon({ className: 'attendance-location-pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] })
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const selected = markerRef.current?.getLatLng();
        if (selected) onSelectRef.current(selected.lat, selected.lng);
      });
    } else {
      markerRef.current.setLatLng(point);
    }
    if (!radiusRef.current) {
      radiusRef.current = L.circle(point, { radius: radiusMeters, color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.16, weight: 2 }).addTo(map);
    } else {
      radiusRef.current.setLatLng(point);
      radiusRef.current.setRadius(radiusMeters);
    }
    if (map.getZoom() < 10 || !map.getBounds().contains(L.latLng(latitude, longitude))) map.setView(point, 15);
  }, [latitude, longitude, hasSelection, radiusMeters]);

  return <div className="overflow-hidden rounded-lg border">
    <div ref={containerRef} role="application" aria-label="Pick an attendance area on the map" className="h-[320px] w-full bg-muted" />
    <p className="border-t px-3 py-2 text-xs text-muted-foreground">Click the map or drag the pin to choose the area center. The circle shows its allowed radius.</p>
    <style jsx global>{`
      .attendance-location-pin { background: transparent; border: 0; }
      .attendance-location-pin span { display: block; width: 18px; height: 18px; margin: 2px; border: 3px solid white; border-radius: 50%; background: #2563eb; box-shadow: 0 1px 6px #0008; }
    `}</style>
  </div>;
}
