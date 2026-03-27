'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Fuel, Locate, MapPin, Search, X } from 'lucide-react';
import { searchNearbyStations } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { NearbyStation } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  high:      { label: 'ปกติ',        cls: 'sp-s-high' },
  medium:    { label: 'พอใช้',       cls: 'sp-s-medium' },
  low:       { label: 'ใกล้หมด',     cls: 'sp-s-low' },
  out:       { label: 'หมด',         cls: 'sp-s-out' },
  refilling: { label: 'กำลังเติม',   cls: 'sp-s-refilling' },
};

interface PickerStation {
  id: number;
  name: string;
  brand: string;
  province_name: string;
  district_name: string;
  status: string;
  distance_km?: number;
}

async function fetchByText(q: string, provinceSlug?: string): Promise<PickerStation[]> {
  const params = new URLSearchParams({ name: q, limit: '30' });
  if (provinceSlug) params.set('province_slug', provinceSlug);
  const res = await fetch(`${API_URL}/api/stations?${params}`);
  if (!res.ok) return [];
  const rows: Array<{ station_id: number; station_name: string; brand: string; province: string; district: string; fuel_statuses: Array<{ inventory_level: string }> }> = await res.json();
  return rows.map((r) => ({
    id: r.station_id,
    name: r.station_name,
    brand: r.brand,
    province_name: r.province,
    district_name: r.district,
    status: r.fuel_statuses?.[0]?.inventory_level ?? 'unknown',
  }));
}

export default function StationPicker() {
  const router = useRouter();
  const [results, setResults] = useState<PickerStation[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<'idle' | 'nearby' | 'search'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = useRef(getAuthUser());
  const provinceSlug = user.current?.role === 'province_manager' ? user.current.province_slug : undefined;

  // Staff with assigned station — skip picker
  useEffect(() => {
    const u = user.current;
    if (u?.role === 'staff' && u.station_id) {
      router.push(`/staff/update?station_id=${u.station_id}`);
    }
  }, [router]);

  // Auto-locate on mount
  useEffect(() => {
    handleLocate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setMode('nearby');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setLoading(true);
          const res = await searchNearbyStations({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radius_km: 5,
            ...(provinceSlug ? { province_slug: provinceSlug } : {}),
          });
          setResults(res.stations.map((s: NearbyStation) => ({
            id: s.id,
            name: s.name,
            brand: s.brand,
            province_name: s.province_name,
            district_name: s.district_name,
            status: s.status,
            distance_km: s.distance_km,
          })));
        } finally {
          setLoading(false);
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setMode('idle');
      },
      { timeout: 8000 },
    );
  }, [provinceSlug]);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setMode('idle');
      setResults([]);
      return;
    }
    setMode('search');
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await fetchByText(q.trim(), provinceSlug);
        setResults(rows);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [provinceSlug]);

  function handleSelect(station: PickerStation) {
    router.push(`/staff/update?station_id=${station.id}&name=${encodeURIComponent(station.name)}`);
  }

  const showList = mode !== 'idle' || results.length > 0;

  return (
    <div className="sp-shell">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-header-icon"><Fuel size={18} /></div>
        <div>
          <p className="sp-kicker">เจ้าหน้าที่ปั้มน้ำมัน</p>
          <h2 className="sp-title">เลือกสถานีที่จะบันทึกข้อมูล</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="sp-controls">
        <div className="sp-search-wrap">
          <Search size={14} className="sp-search-icon" />
          <input
            className="sp-search-input"
            type="text"
            placeholder="ค้นหาชื่อปั้ม / แบรนด์ / จังหวัด..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" className="sp-search-clear" onClick={() => handleQueryChange('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`sp-locate-btn ${locating ? 'sp-locate-btn--active' : ''}`}
          onClick={handleLocate}
          disabled={locating}
          title="ค้นหาปั้มใกล้ฉัน"
        >
          <Locate size={15} />
        </button>
      </div>

      {/* Station list */}
      <div className="sp-list">
        {loading && (
          <div className="sp-empty">
            <span className="sp-loading-dot" />
            <span>{locating ? 'กำลังระบุตำแหน่ง...' : 'กำลังค้นหา...'}</span>
          </div>
        )}

        {!loading && showList && results.length === 0 && (
          <div className="sp-empty">
            <Search size={22} style={{ opacity: 0.3 }} />
            <span>ไม่พบสถานีที่ตรงกับ &ldquo;{query}&rdquo;</span>
          </div>
        )}

        {!loading && !showList && (
          <div className="sp-empty">
            <Locate size={22} style={{ opacity: 0.3 }} />
            <span>กดปุ่ม <strong>ตำแหน่งของฉัน</strong> หรือพิมพ์ชื่อสถานี</span>
          </div>
        )}

        {!loading && results.map((station) => {
          const s = STATUS_LABEL[station.status] ?? { label: station.status, cls: '' };
          return (
            <button
              key={station.id}
              type="button"
              className="sp-item"
              onClick={() => handleSelect(station)}
            >
              <div className="sp-item-logo">
                <Image
                  src={getBrandLogoUrl(station.brand)}
                  alt={station.brand}
                  width={32}
                  height={32}
                  unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="sp-item-body">
                <span className="sp-item-name">{station.name}</span>
                <span className="sp-item-loc">
                  <MapPin size={10} />
                  {station.district_name} · {station.province_name}
                  {station.distance_km !== undefined && (
                    <span style={{ marginLeft: 4, opacity: 0.6 }}>
                      · {station.distance_km < 1
                        ? `${Math.round(station.distance_km * 1000)} ม.`
                        : `${station.distance_km.toFixed(1)} กม.`}
                    </span>
                  )}
                </span>
              </div>
              <div className="sp-item-right">
                <span className={`sp-status-badge ${s.cls}`}>{s.label}</span>
                <span className="sp-item-id">#{station.id}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && results.length > 0 && (
        <p className="sp-count">
          {mode === 'nearby' ? `${results.length} สถานีใกล้ฉัน (5 กม.)` : `${results.length} ผลการค้นหา`}
        </p>
      )}
    </div>
  );
}
