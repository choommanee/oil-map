'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Bell, Droplets, Fuel, Gauge, MapPin, RefreshCw, ShieldAlert, Truck, Zap } from 'lucide-react';
import { getLiveFeed } from '@/lib/api';
import { createRealtimeSubscription } from '@/lib/realtime';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import NearbySearchPanel from '@/components/NearbySearchPanel';
import FieldReportsFeed from '@/components/FieldReportsFeed';
import OperationsChat from '@/components/OperationsChat';
import type { FeedItem, MapResponse, NearbySearchResponse, NearbyStation, OverviewResponse, Station } from '@/lib/types';

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="cmd-map-loading">
      <div className="cmd-map-loading-inner">
        <Gauge size={22} className="cmd-map-loading-icon" />
        <span>กำลังโหลดแผนที่...</span>
      </div>
    </div>
  ),
});

interface OverviewDashboardProps {
  overview: OverviewResponse;
  map: MapResponse;
  feed: FeedItem[];
  nearby?: NearbySearchResponse;
  defaultLocation?: { lat: number; lng: number; radiusKm: number };
}

const FUEL_FILTERS = [
  { key: 'all',       label: 'ทั้งหมด',   color: '#67a6ff' },
  { key: 'high',      label: 'ปกติ',       color: '#69f0ae' },
  { key: 'low',       label: 'ใกล้หมด',   color: '#ffd166' },
  { key: 'out',       label: 'หมด',        color: '#ff6b6b' },
  { key: 'refilling', label: 'กำลังเติม',  color: '#41d6e8' },
];

const KPI_ICONS = [Fuel, Gauge, AlertTriangle, ShieldAlert];

/* ── Live Clock ──────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState('--:--:--');
  const [date, setDate] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(n.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="cmd-clock">
      <span className="cmd-live-dot" />
      <span className="cmd-live-label">LIVE</span>
      <span className="cmd-clock-time">{time}</span>
      <span className="cmd-clock-date">{date}</span>
    </div>
  );
}

/* ── Brand Distribution Strip ─────────────────────────────────────── */
interface BrandStat { key: string; brand: string; total: number; ok: number; low: number; out: number }

function BrandStrip({ stations }: { stations: Station[] }) {
  const brands = useMemo<BrandStat[]>(() => {
    const acc: Record<string, BrandStat> = {};
    for (const s of stations) {
      const key = (s.brand_key ?? s.brand).trim().toUpperCase();
      if (!acc[key]) acc[key] = { key, brand: s.brand, total: 0, ok: 0, low: 0, out: 0 };
      acc[key].total++;
      if (s.status === 'high' || s.status === 'refilling') acc[key].ok++;
      else if (s.status === 'low') acc[key].low++;
      else if (s.status === 'out') acc[key].out++;
    }
    return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [stations]);

  if (brands.length === 0) return null;

  return (
    <div className="cmd-brand-strip">
      <div className="cmd-brand-strip-label">
        <Droplets size={12} />
        <span>สถานีแยกตามแบรนด์</span>
      </div>
      <div className="cmd-brand-strip-scroll">
        {brands.map((b) => (
          <div key={b.key} className="cmd-brand-item" title={b.brand}>
            <div className="cmd-brand-logo-wrap">
              <img
                src={getBrandLogoUrl(b.brand)}
                alt={b.brand}
                className="cmd-brand-logo-img"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brands/fallback.svg'; }}
              />
            </div>
            <div className="cmd-brand-pills">
              {b.ok  > 0 && <span className="cbp cbp-g">{b.ok}</span>}
              {b.low > 0 && <span className="cbp cbp-y">{b.low}</span>}
              {b.out > 0 && <span className="cbp cbp-r">{b.out}</span>}
            </div>
            <span className="cmd-brand-total">{b.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Situation Badge ─────────────────────────────────────────────── */
function SituationBadge({ alertCount }: { alertCount: number }) {
  if (alertCount > 3) return <span className="cmd-situation-badge badge-critical"><span className="cmd-sit-dot" />วิกฤต</span>;
  if (alertCount > 0) return <span className="cmd-situation-badge badge-warning"><span className="cmd-sit-dot" />มีแจ้งเตือน</span>;
  return <span className="cmd-situation-badge badge-normal"><span className="cmd-sit-dot" />สถานการณ์ปกติ</span>;
}

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function OverviewDashboard({ overview, map, feed }: OverviewDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>(feed);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const feedLock = useRef(false);
  const lastFetch = useRef(0);
  const jitterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Fetch with jitter — spreads 10k simultaneous WS events over MAX_JITTER_MS
    // preventing thundering herd on /api/feeds/live
    const MAX_JITTER_MS = 8_000; // 10k users × random(0–8s) = ~1,250 req/sec
    const MIN_INTERVAL_MS = 15_000; // each client refetches at most every 15s

    function scheduleFeedRefetch() {
      if (jitterTimer.current) return; // already scheduled
      const elapsed = Date.now() - lastFetch.current;
      if (elapsed < MIN_INTERVAL_MS) return; // too soon
      const delay = Math.random() * MAX_JITTER_MS;
      jitterTimer.current = setTimeout(() => {
        jitterTimer.current = null;
        if (feedLock.current) return;
        feedLock.current = true;
        lastFetch.current = Date.now();
        void getLiveFeed()
          .then(setLiveFeed)
          .finally(() => { feedLock.current = false; });
      }, delay);
    }

    const sub = createRealtimeSubscription(
      () => scheduleFeedRefetch(),
      () => scheduleFeedRefetch(),
    );
    return () => {
      sub.cleanup();
      if (jitterTimer.current) clearTimeout(jitterTimer.current);
    };
  }, []);

  const alertCount = useMemo(
    () => overview.alerts.filter((a) => a.severity !== 'info').length,
    [overview.alerts],
  );

  const sortedFeed = useMemo(() => {
    const order: Record<string, number> = { danger: 0, warning: 1, normal: 2 };
    return [...liveFeed].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
  }, [liveFeed]);

  const criticalFeedCount = useMemo(
    () => liveFeed.filter((f) => f.status === 'danger' || f.status === 'warning').length,
    [liveFeed],
  );

  const displayStations = useMemo(() => {
    const base = nearbyStations.length > 0 ? nearbyStations : map.stations;
    if (activeFilter === 'all') return base;
    return base.filter((s) => s.status === activeFilter);
  }, [map.stations, nearbyStations, activeFilter]);

  // Fuel mix totals for stats bar
  const statusCounts = useMemo(() => ({
    high:      map.stations.filter((s) => s.status === 'high').length,
    low:       map.stations.filter((s) => s.status === 'low').length,
    out:       map.stations.filter((s) => s.status === 'out').length,
    refilling: map.stations.filter((s) => s.status === 'refilling').length,
    total:     map.stations.length,
  }), [map.stations]);

  return (
    <div className="cmd-shell">

      {/* ── HEADER ── */}
      <header className="cmd-header">
        <div className="cmd-header-brand">
          <div className="cmd-brand-logo">
            <Fuel size={18} />
          </div>
          <div className="cmd-brand-text">
            <h1 className="cmd-brand-title">OilMap Command</h1>
            <p className="cmd-brand-sub">ศูนย์บัญชาการสถานการณ์น้ำมัน</p>
          </div>
          <SituationBadge alertCount={alertCount} />
        </div>

        <div className="cmd-header-right mobile-hidden">
          <LiveClock />
          <div className="cmd-update-chip">
            <RefreshCw size={11} />
            <span>{new Date(overview.generated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
          <button className="cmd-icon-btn" aria-label="notifications" type="button">
            <Bell size={15} />
            {alertCount > 0 && <span className="cmd-notif-badge">{alertCount}</span>}
          </button>
          <div className="cmd-user-pill">
            <div className="cmd-user-ava">A</div>
            <div className="cmd-user-info">
              <span className="cmd-user-name">Admin</span>
              <span className="cmd-user-role">ผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI STRIP ── */}
      <section className="cmd-kpi-strip">
        {overview.kpis.slice(0, 4).map((kpi, i) => {
          const Icon = KPI_ICONS[i] ?? Fuel;
          const toneMap: Record<string, string> = {
            success: 'kpi-success',
            warning: 'kpi-warning',
            danger:  'kpi-danger',
            info:    'kpi-info',
          };
          return (
            <div key={kpi.label} className={`cmd-kpi-card ${toneMap[kpi.tone ?? ''] ?? 'kpi-neutral'}`}>
              <div className="cmd-kpi-icon-wrap">
                <Icon size={22} />
              </div>
              <div className="cmd-kpi-body">
                <div className="cmd-kpi-label">{kpi.label}</div>
                <div className="cmd-kpi-value">{kpi.value}</div>
                {kpi.helper && <div className="cmd-kpi-helper">{kpi.helper}</div>}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── BRAND DISTRIBUTION STRIP ── */}
      <BrandStrip stations={map.stations} />

      {/* ── MAIN GRID ── */}
      <div className="cmd-main-grid">

        {/* MAP COLUMN */}
        <div className="cmd-map-col">
          <div className="cmd-map-bar">
            <p className="cmd-map-bar-label">
              <MapPin size={12} />
              <span>แผนที่ Real-time</span>
            </p>
            <div className="cmd-map-filters">
              {FUEL_FILTERS.map((f) => {
                const count = f.key === 'all'
                  ? map.stations.length
                  : map.stations.filter((s) => s.status === f.key).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key)}
                    className={`cmd-filter-chip ${activeFilter === f.key ? 'active' : ''}`}
                    style={{ '--chip-color': f.color } as React.CSSProperties}
                    title={f.label}
                  >
                    <span className="cmd-filter-dot" style={{ background: f.color }} />
                    <span className="cmd-filter-label">{f.label}</span>
                    <span className="cmd-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cmd-map-wrap">
            <DashboardMap
              stations={displayStations}
              scope={map.scope}
              onSelectStation={setSelectedStation}
              searchOrigin={searchOrigin}
            />
            {selectedStation && (
              <div className="cmd-station-popup">
                <div className="cmd-station-popup-head">
                  <strong>{selectedStation.name}</strong>
                  <span className={`status-pill status-${selectedStation.status}`}>{selectedStation.status}</span>
                </div>
                <p className="cmd-station-popup-addr">{selectedStation.address}</p>
                <div className="cmd-station-popup-fuels">
                  {selectedStation.fuels.map((fuel) => (
                    <span key={fuel.fuel_type} className={`cmd-fuel-tag status-${fuel.status}`}>
                      {fuel.fuel_type}
                    </span>
                  ))}
                </div>
                {selectedStation.distance_km ? (
                  <p className="cmd-station-popup-dist">{selectedStation.distance_km.toFixed(1)} กม.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="cmd-right-col" style={{ overflowY: 'auto' }}>
          <FieldReportsFeed feed={liveFeed} scope={map.scope} />
          <OperationsChat scope={map.scope} />
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="cmd-status-bar">
        <div className="cmd-status-segment">
          <span className="cmd-status-dot csb-green" />
          <span className="cmd-status-label">ปกติ</span>
          <span className="cmd-status-val">{statusCounts.high}</span>
          <div className="cmd-status-track">
            <div
              className="cmd-status-fill csf-green"
              style={{ width: `${Math.round((statusCounts.high / Math.max(statusCounts.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="cmd-status-segment">
          <span className="cmd-status-dot csb-yellow" />
          <span className="cmd-status-label">ใกล้หมด</span>
          <span className="cmd-status-val">{statusCounts.low}</span>
          <div className="cmd-status-track">
            <div
              className="cmd-status-fill csf-yellow"
              style={{ width: `${Math.round((statusCounts.low / Math.max(statusCounts.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="cmd-status-segment">
          <span className="cmd-status-dot csb-red" />
          <span className="cmd-status-label">หมด</span>
          <span className="cmd-status-val">{statusCounts.out}</span>
          <div className="cmd-status-track">
            <div
              className="cmd-status-fill csf-red"
              style={{ width: `${Math.round((statusCounts.out / Math.max(statusCounts.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="cmd-status-segment">
          <span className="cmd-status-dot csb-cyan" />
          <span className="cmd-status-label">กำลังเติม</span>
          <span className="cmd-status-val">{statusCounts.refilling}</span>
          <div className="cmd-status-track">
            <div
              className="cmd-status-fill csf-cyan"
              style={{ width: `${Math.round((statusCounts.refilling / Math.max(statusCounts.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="cmd-status-total">
          <Gauge size={14} />
          <span className="cmd-status-total-num">{statusCounts.total}</span>
          <span className="cmd-status-total-label">สถานีทั้งหมด</span>
        </div>
      </div>

      {/* ── BOTTOM GRID ── */}
      <div className="cmd-bottom-grid">

        {/* Nearby Search */}
        <NearbySearchPanel
          onResult={(stations, origin) => {
            setNearbyStations(stations);
            setSearchOrigin(origin);
          }}
        />

        {/* Governor Command Center */}
        <div className="cmd-panel cmd-command-center">
          <div className="cmd-command-head">
            <Zap size={14} />
            <span>GOVERNOR COMMAND</span>
            <span className="cmd-command-sub">ศูนย์สั่งการ</span>
          </div>
          <div className="cmd-command-grid">
            <button className="cmd-action-btn btn-danger" type="button">
              <ShieldAlert size={15} />
              <div>
                <span className="btn-label">จำกัดการเติม</span>
                <span className="btn-sub">ตั้งวงเงิน/คัน</span>
              </div>
            </button>
            <button className="cmd-action-btn btn-warning" type="button">
              <Bell size={15} />
              <div>
                <span className="btn-label">แจ้งเตือน</span>
                <span className="btn-sub">ส่งทุกช่องทาง</span>
              </div>
            </button>
            <button className="cmd-action-btn btn-blue" type="button">
              <Truck size={15} />
              <div>
                <span className="btn-label">ส่งรถด่วน</span>
                <span className="btn-sub">จัดสรรรถ</span>
              </div>
            </button>
            <button className="cmd-action-btn btn-teal" type="button">
              <Fuel size={15} />
              <div>
                <span className="btn-label">เปิดสำรอง</span>
                <span className="btn-sub">น้ำมันสำรอง</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
