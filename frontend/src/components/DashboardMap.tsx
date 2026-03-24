'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function DashboardMap() {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // In a real app, fetch actual Thai boundaries GeoJSON
    // For now, this is a placeholder for the logic
  }, []);

  return (
    <MapContainer 
      center={[13.736717, 100.523186]} 
      zoom={6} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap'
      />
      
      {/* Example Marker for a PTT station */}
      <Marker position={[13.805, 100.555]} icon={L.icon({
        iconUrl: process.env.NEXT_PUBLIC_LOGO_PTT || '/markers/marker-icon.png',
        iconSize: [32, 32],
        className: 'brand-marker'
      })}>
        <Popup>
          <div style={{ color: '#000' }}>
            <strong>PTT Station วิภาวดี</strong><br/>
            ดีเซล: ปกติ (80%)<br/>
            แก๊สโซฮอล์ 95: ใกล้หมด (15%)
          </div>
        </Popup>
      </Marker>

      {/* Example Marker for a Shell station */}
      <Marker position={[13.754, 100.578]} icon={L.icon({
        iconUrl: process.env.NEXT_PUBLIC_LOGO_SHELL || '/markers/marker-icon.png',
        iconSize: [32, 32],
        className: 'brand-marker'
      })}>
        <Popup>
          <div style={{ color: '#000' }}>
            <strong>Shell พระราม 9</strong><br/>
            ดีเซล: ปกติ (90%)<br/>
            แก๊สโซฮอล์ 95: ปกติ (85%)
          </div>
        </Popup>
      </Marker>

      {geoData && <GeoJSON data={geoData} style={{ color: '#58a6ff', weight: 1, fillOpacity: 0.1 }} />}
    </MapContainer>
  );
}
