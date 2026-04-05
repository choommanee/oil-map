'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Crosshair, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { searchNearbyStations } from '@/lib/api';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { NearbyStation } from '@/lib/types';

const RADIUS_OPTIONS = [5, 10, 15, 25];
const FUEL_OPTIONS = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'diesel_b7', label: 'ดีเซล B7' },
  { value: 'gasohol_95', label: 'แก๊สโซฮอล์ 95' },
  { value: 'gasohol_91', label: 'แก๊สโซฮอล์ 91' },
  { value: 'e20', label: 'E20' },
  { value: 'premium_diesel', label: 'ดีเซล พรีเมียม' },
];

const STATUS_TONE: Record<string, string> = {
  high: '#2fe08d', medium: '#ffcc52', low: '#ff9a3d', out: '#ff4f70', refilling: '#32d9ff',
};
const STATUS_LABEL: Record<string, string> = {
  high: 'ปกติ', medium: 'พอใช้', low: 'ใกล้หมด', out: 'หมด', refilling: 'กำลังเติม',
};

interface NearbySearchPanelProps {
  onResult?: (stations: NearbyStation[], origin: { lat: number; lng: number; radiusKm: number }) => void;
  onStationClick?: (station: NearbyStation) => void;
  onClear?: () => void;
}

export default function NearbySearchPanel({ onResult, onStationClick, onClear }: NearbySearchPanelProps) {
  const [radius, setRadius] = useState(10);
  const [fuelType, setFuelType] = useState('');
  const [results, setResults] = useState<NearbyStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  async function runSearch(lat: number, lng: number) {
    setLoading(true);
    setError('');
    try {
      const data = await searchNearbyStations({
        lat, lng, radius_km: radius,
        fuel_type: fuelType || undefined,
      });
      setResults(data.stations);
      onResult?.(data.stations, { lat, lng, radiusKm: radius });
      if (data.stations.length === 0) setError('ไม่พบสถานีในรัศมีที่เลือก');
    } catch {
      setError('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoading(false);
    }
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ Geolocation');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOrigin({ lat, lng });
        setLocating(false);
        void runSearch(lat, lng);
      },
      () => {
        setLocating(false);
        // Fallback: Bangkok center
        const lat = 13.7563;
        const lng = 100.5018;
        setOrigin({ lat, lng });
        void runSearch(lat, lng);
      },
      { timeout: 6000 },
    );
  }

  return (
    <div className="ns-shell">
      <div className="ns-header">
        <Search size={13} />
        <h3 className="ns-title">ค้นหาปั้มใกล้เคียง</h3>
      </div>

      {/* Controls */}
      <div className="ns-controls">
        <div className="ns-radius-row">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`ns-radius-btn ${radius === r ? 'active' : ''}`}
              onClick={() => setRadius(r)}
            >
              {r} กม.
            </button>
          ))}
        </div>

        <select
          className="ns-fuel-select"
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value)}
        >
          {FUEL_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="ns-locate-btn"
          onClick={handleLocate}
          disabled={loading || locating}
        >
          {locating || loading
            ? <Loader2 size={14} className="ns-spin" />
            : <Crosshair size={14} />}
          {locating ? 'กำลังระบุตำแหน่ง...' : loading ? 'กำลังค้นหา...' : 'ค้นหาจากตำแหน่งปัจจุบัน'}
        </button>
      </div>

      {error && <p className="ns-error">{error}</p>}

      {origin && !loading && (
        <div className="ns-origin-row">
          <p className="ns-origin-label">
            <Navigation size={10} />
            ตำแหน่งอ้างอิง {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
          </p>
          {results.length > 0 && (
            <button
              type="button"
              className="ns-clear-btn"
              onClick={() => { setResults([]); setOrigin(null); setError(''); onClear?.(); }}
            >
              ล้าง
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="ns-results">
          {results.slice(0, 8).map((s, i) => (
            <button
              key={`${s.id}-${i}`}
              type="button"
              className="ns-item"
              onClick={() => onStationClick?.(s)}
            >
              <div className="ns-item-logo">
                <Image src={getBrandLogoUrl(s.brand)} alt={s.brand} width={28} height={28} unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="ns-item-body">
                <span className="ns-item-name">{s.name}</span>
                <span className="ns-item-loc">
                  <MapPin size={9} />
                  {s.district_name} · {s.province_name}
                </span>
              </div>
              <div className="ns-item-right">
                <span className="ns-item-dist">{s.distance_km.toFixed(1)} กม.</span>
                <span
                  className="ns-item-status"
                  style={{ color: STATUS_TONE[s.status] ?? '#aaa', borderColor: STATUS_TONE[s.status] ?? '#aaa' }}
                >
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
