'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TrackingMapProps {
  latitude: number;
  longitude: number;
  seekerName: string;
}

export default function TrackingMap({ latitude, longitude, seekerName }: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [libLoaded, setLibLoaded] = useState(false);

  // 1. Dynamically load Leaflet CDN assets on the client
  useEffect(() => {
    // Check if Leaflet is already loaded globally
    if ((window as any).L) {
      setLibLoaded(true);
      return;
    }

    // Append Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Append Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLibLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script/link tags if needed
    };
  }, []);

  // 2. Initialize map once library is ready
  useEffect(() => {
    if (!libLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Reset previous instance
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Initialize Map centered at latitude, longitude
    const map = L.map(mapContainerRef.current).setView([latitude, longitude], 15);
    mapRef.current = map;

    // Load OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Customize marker icon to work without local image assets
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Create marker
    const marker = L.marker([latitude, longitude], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(`<b>${seekerName}</b><br/>Current Seeker Position`)
      .openPopup();
      
    markerRef.current = marker;

    // Fix map gray tiles resizing bug
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [libLoaded, seekerName]);

  // 3. Pan map and move marker when coordinates update
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !markerRef.current) return;

    // Update marker coordinates and center map
    markerRef.current.setLatLng([latitude, longitude]);
    mapRef.current.panTo([latitude, longitude]);
    
    // Refresh popup details
    markerRef.current.getPopup().setContent(`<b>${seekerName}</b><br/>Last Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`).openOn(mapRef.current);
    
  }, [latitude, longitude, seekerName]);

  return (
    <div className="w-full h-full relative bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
      {!libLoaded && (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin text-accent" size={24} />
          <span className="text-xs">Loading GPS Map...</span>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '350px' }}></div>
    </div>
  );
}
