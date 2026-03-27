'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Fuel, Loader2, Search, X } from 'lucide-react';
import { searchNearbyStations } from '@/lib/api';
import type { NearbyStation } from '@/lib/types';

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), {
  ssr: false,
  loading: () => <div className="nv2-map-placeholder"><Loader2 size={22} className="mnv-spin" /></div>,
});

const RADII = [5, 10, 15, 25];

const scopeMeta = { title: 'ใกล้เคียง', subtitle: 'nearby', level: 'national' as const };

export default function MobileNearbyView() {
  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(true);
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
    const fallback = () => {
      const lat = 13.7563, lng = 100.5018;
      setOrigin({ lat, lng });
      void fetchNearby(lat, lng, radius);
    };
    if (!navigator.geolocation) { fallback(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setOrigin({ lat, lng });
        void fetchNearby(lat, lng, radius);
      },
      fallback,
      { timeout: 8000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRadiusChange(r: number) {
    setRadius(r);
    if (origin) void fetchNearby(origin.lat, origin.lng, r);
  }

  const displayed = searchQuery.trim()
    ? stations.filter((s) => {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.district_name.toLowerCase().includes(q);
      })
    : stations;

  const mapOrigin = origin ? { lat: origin.lat, lng: origin.lng, radiusKm: radius } : null;

  return (
    <div className="nv2-shell">
      {/* ── Navbar ── */}
      <header className="nv2-nav">
        <Link href="/" className="nv2-nav-brand">
          <Fuel size={16} />
          <span>ปั้มใกล้คุณ</span>
        </Link>
        <div className="nv2-nav-right">
          {!loading && <span className="nv2-nav-count">{stations.length} สถานี</span>}
          {loading && <Loader2 size={14} className="mnv-spin" />}
          <button
            type="button"
            className={`nv2-nav-search-btn ${showSearch ? 'nv2-nav-search-btn--active' : ''}`}
            onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearchQuery(''); }}
            aria-label="ค้นหา"
          >
            {showSearch ? <X size={16} /> : <Search size={16} />}
          </button>
        </div>
      </header>

      {/* ── Search overlay ── */}
      {showSearch && (
        <div className="nv2-search-bar">
          <Search size={13} className="nv2-search-icon" />
          <input
            className="nv2-search-input"
            placeholder="ค้นหาชื่อปั้ม, แบรนด์, อำเภอ..."
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="nv2-search-clear" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* ── Full screen map ── */}
      <div className="nv2-map">
        <DashboardMap stations={displayed} scope={scopeMeta} searchOrigin={mapOrigin} />

        {/* Floating radius chips */}
        <div className="nv2-radius-bar">
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              className={`nv2-radius-chip ${radius === r ? 'nv2-radius-chip--active' : ''}`}
              onClick={() => handleRadiusChange(r)}
              disabled={loading}
            >
              {r} กม.
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
