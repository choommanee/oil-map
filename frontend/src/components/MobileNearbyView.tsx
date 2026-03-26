'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRight, Clock, Crosshair, Fuel, Loader2, MapPin,
  Navigation2, Search, Wifi, X,
} from 'lucide-react';
import { searchNearbyStations } from '@/lib/api';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { NearbyStation } from '@/lib/types';

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="mnv-map-placeholder">
      <Loader2 size={22} className="mnv-spin" />
    </div>
  ),
});

const FILTERS = [
  { key: 'all',       label: 'ทั้งหมด',    color: '#67a6ff' },
  { key: 'high',      label: 'ปกติ',       color: '#2fe08d' },
  { key: 'low',       label: 'ใกล้หมด',   color: '#ffcc52' },
  { key: 'out',       label: 'หมด',        color: '#ff4f70' },
  { key: 'refilling', label: 'กำลังเติม', color: '#32d9ff' },
];

const RADII = [5, 10, 15, 25];

const STATUS_LABEL: Record<string, string> = {
  high: 'ปกติ', medium: 'ปานกลาง', low: 'ใกล้หมด', out: 'หมด', refilling: 'กำลังเติม',
};
const STATUS_COLOR: Record<string, string> = {
  high: '#2fe08d', medium: '#ffd166', low: '#ffcc52', out: '#ff4f70', refilling: '#32d9ff',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'เมื่อกี้';
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  return `${Math.floor(diff / 60)} ชม.ที่แล้ว`;
}

function etaMin(distKm: number): number {
  return Math.round((distKm / 40) * 60); // 40 km/h avg
}

export default function MobileNearbyView() {
  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [radius, setRadius] = useState(10);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const locateRef = useRef(false);

  async function fetchNearby(lat: number, lng: number, r: number) {
    setLoading(true);
    try {
      const res = await searchNearbyStations({ lat, lng, radius_km: r });
      setStations(res.stations);
    } catch {
      setStations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (locateRef.current) return;
    locateRef.current = true;
    if (!navigator.geolocation) {
      const lat = 13.7563, lng = 100.5018;
      setOrigin({ lat, lng });
      setLocationName('กรุงเทพมหานคร (ค่าเริ่มต้น)');
      setLocating(false);
      void fetchNearby(lat, lng, radius);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOrigin({ lat, lng });
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocating(false);
        void fetchNearby(lat, lng, radius);
      },
      () => {
        const lat = 13.7563, lng = 100.5018;
        setOrigin({ lat, lng });
        setLocationName('กรุงเทพมหานคร (ค่าเริ่มต้น)');
        setLocating(false);
        void fetchNearby(lat, lng, radius);
      },
      { timeout: 8000 },
    );
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleRadiusChange(r: number) {
    setRadius(r);
    if (origin) void fetchNearby(origin.lat, origin.lng, r);
  }

  const displayed = useMemo(() => {
    let list = filter === 'all' ? stations : stations.filter((s) => s.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.district_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [stations, filter, searchQuery]);

  const scopeMeta = useMemo(() => ({
    title: 'ใกล้เคียง',
    subtitle: 'nearby',
    level: 'national' as const,
  }), []);

  const mapOrigin = origin ? { lat: origin.lat, lng: origin.lng, radiusKm: radius } : null;

  return (
    <div className="mnv-shell">
      {/* ── HEADER ── */}
      <header className="mnv-header">
        <Link href="/" className="mnv-header-brand">
          <Fuel size={18} className="mnv-header-icon" />
          <span className="mnv-header-title">ปั้มใกล้คุณ</span>
        </Link>
        <button
          className="mnv-header-btn"
          type="button"
          onClick={() => setShowSearch((v) => !v)}
          aria-label="ค้นหา"
        >
          {showSearch ? <X size={17} /> : <Search size={17} />}
        </button>
      </header>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <div className="mnv-searchbar-wrap">
          <Search size={14} className="mnv-searchbar-icon" />
          <input
            className="mnv-searchbar-input"
            placeholder="ค้นหาชื่อปั้ม, แบรนด์, อำเภอ..."
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="mnv-searchbar-clear" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── CONTENT (split on desktop) ── */}
      <div className="mnv-content">
        {/* ── LEFT PANEL: location + filters + map + legend ── */}
        <div className="mnv-left-panel">
          {/* ── LOCATION BAR ── */}
          <div className="mnv-location-bar">
            <div className="mnv-location-left">
              <MapPin size={16} className="mnv-location-pin" />
              <div className="mnv-location-text">
                <span className="mnv-location-label">ตำแหน่งปัจจุบัน</span>
                <span className="mnv-location-value">
                  {locating ? 'กำลังระบุตำแหน่ง...' : locationName}
                  {!locating && <ChevronRight size={11} />}
                </span>
              </div>
            </div>
            <button
              className="mnv-location-edit"
              type="button"
              onClick={() => {
                locateRef.current = false;
                setLocating(true);
                window.location.reload();
              }}
            >
              <Crosshair size={12} />
              <span>รีเฟรช</span>
            </button>
          </div>

          {/* ── FILTER CHIPS ── */}
          <div className="mnv-filters">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? stations.length : stations.filter((s) => s.status === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`mnv-chip ${filter === f.key ? 'mnv-chip-active' : ''}`}
                  style={{ '--chip-c': f.color } as React.CSSProperties}
                  onClick={() => setFilter(f.key)}
                >
                  <span className="mnv-chip-dot" style={{ background: f.color }} />
                  <span className="mnv-chip-label">{f.label}</span>
                  {count > 0 && <span className="mnv-chip-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* ── MAP ── */}
          <div className="mnv-map-wrap">
            <DashboardMap
              stations={displayed}
              scope={scopeMeta}
              searchOrigin={mapOrigin}
            />
            {(loading || locating) && (
              <div className="mnv-map-loading-overlay">
                <Loader2 size={20} className="mnv-spin" />
              </div>
            )}
          </div>

          {/* ── MAP LEGEND + RADIUS ── */}
          <div className="mnv-map-footer">
            <div className="mnv-legend">
              {FILTERS.slice(1).map((f) => (
                <span key={f.key} className="mnv-legend-item">
                  <span className="mnv-legend-dot" style={{ background: f.color }} />
                  <span>{f.label}</span>
                </span>
              ))}
            </div>
            <span className="mnv-map-radius-label">
              <Navigation2 size={10} />
              {radius} กม.
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL: radius selector + station list ── */}
        <div className="mnv-right-panel">
          {/* ── RADIUS SELECTOR ROW ── */}
          <div className="mnv-radius-row">
            <div className="mnv-radius-label-wrap">
              <MapPin size={13} />
              <span>แสดงรัศมี {radius} กม.</span>
              {!loading && <span className="mnv-radius-count">{stations.length} สถานี</span>}
            </div>
            <div className="mnv-radius-btns">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`mnv-radius-btn ${radius === r ? 'active' : ''}`}
                  onClick={() => handleRadiusChange(r)}
                  disabled={loading}
                >
                  {r} กม.
                </button>
              ))}
            </div>
          </div>

          {/* ── STATION LIST ── */}
          <div className="mnv-list">
        {loading && (
          <div className="mnv-list-loading">
            <Loader2 size={18} className="mnv-spin" />
            <span>กำลังค้นหา...</span>
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="mnv-empty">
            <Fuel size={32} style={{ opacity: 0.3 }} />
            <span>ไม่พบสถานีในรัศมี {radius} กม.</span>
          </div>
        )}

        {!loading && displayed.map((s) => {
          const mainFuel = s.fuels.find((f) => f.status !== 'out') ?? s.fuels[0];
          const eta = etaMin(s.distance_km);
          return (
            <div key={s.id} className="mnv-card">
              {/* Logo */}
              <div className="mnv-card-logo">
                <Image
                  src={getBrandLogoUrl(s.brand)}
                  alt={s.brand}
                  width={44}
                  height={44}
                  unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brands/fallback.svg'; }}
                />
              </div>

              {/* Body */}
              <div className="mnv-card-body">
                {/* Row 1: name + status */}
                <div className="mnv-card-row1">
                  <span className="mnv-card-name">{s.name}</span>
                  <span
                    className="mnv-card-status"
                    style={{
                      background: `${STATUS_COLOR[s.status] ?? '#888'}22`,
                      color: STATUS_COLOR[s.status] ?? '#888',
                      borderColor: `${STATUS_COLOR[s.status] ?? '#888'}55`,
                    }}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>

                {/* Row 2: fuel info */}
                {mainFuel && (
                  <div className="mnv-card-row2">
                    <span className="mnv-card-fuel-dot" style={{ background: mainFuel.status !== 'out' ? STATUS_COLOR[mainFuel.status] : STATUS_COLOR.out }} />
                    <span className="mnv-card-fuel-liters">
                      {mainFuel.liters.toLocaleString()} L
                    </span>
                    <span className="mnv-card-fuel-sep">|</span>
                    <span className="mnv-card-fuel-type">{mainFuel.fuel_type}</span>
                    {s.fuels.length > 1 && (
                      <span className="mnv-card-fuel-more">+{s.fuels.length - 1}</span>
                    )}
                  </div>
                )}

                {/* Row 3: ETA */}
                <div className="mnv-card-row3">
                  <Wifi size={10} style={{ opacity: 0.5 }} />
                  <span className="mnv-card-eta">น. {eta} นาที</span>
                </div>
              </div>

              {/* Right */}
              <div className="mnv-card-right">
                <span className="mnv-card-dist">{s.distance_km.toFixed(1)}<small>km</small></span>
                <span className="mnv-card-time">
                  <Clock size={9} />
                  {timeAgo(s.last_updated)}
                </span>
              </div>
            </div>
          );
        })}
          </div>
          {/* end mnv-list */}
        </div>
        {/* end mnv-right-panel */}
      </div>
      {/* end mnv-content */}

      {/* ── FOOTER ── */}
      <footer className="mnv-footer">
        <span>© 2025 Fuel Crisis Management System</span>
        <span>·</span>
        <span>กระทรวงพลังงาน</span>
      </footer>
    </div>
  );
}
