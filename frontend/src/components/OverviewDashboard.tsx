'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AlertTriangle, BarChart3, Bell, ChevronLeft, ChevronRight, Clock, Download, Droplets, Fuel, Gauge, MapPin, Navigation, Navigation2, Pencil, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { getLiveFeed, exportStations } from '@/lib/api';
import { createRealtimeSubscription } from '@/lib/realtime';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import { getFuelMeta } from '@/lib/fuelTypes';
import NearbySearchPanel from '@/components/NearbySearchPanel';
import FieldReportsFeed from '@/components/FieldReportsFeed';
import OperationsChat from '@/components/OperationsChat';
import AlertCenter from '@/components/AlertCenter';
import TrendChart from '@/components/TrendChart';
import StationHistory from '@/components/StationHistory';
import type { FeedItem, MapResponse, NearbySearchResponse, NearbyStation, OverviewResponse, RegionSummary, Station } from '@/lib/types';
import { getAuthUser, logout } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import Link from 'next/link';

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

type SidebarTab = 'summary' | 'search' | 'alerts' | 'trends' | 'live' | 'chat';

const SIDEBAR_TABS: { key: SidebarTab; label: string; icon: typeof Fuel }[] = [
  { key: 'summary', label: 'สรุป',     icon: Gauge },
  { key: 'search',  label: 'ค้นหา',    icon: Search },
  { key: 'alerts',  label: 'แจ้งเตือน', icon: ShieldAlert },
  { key: 'trends',  label: 'เทรนด์',   icon: BarChart3 },
  { key: 'live',    label: 'Live',      icon: Droplets },
  { key: 'chat',    label: 'แชท',      icon: Bell },
];

const STATUS_LABEL: Record<string, string> = {
  high: 'ปกติ', ok: 'ปกติ', low: 'ใกล้หมด', out: 'หมด', refilling: 'กำลังเติม', unknown: 'ไม่ทราบ',
};

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

/* ── District Summary Overlay ─────────────────────────────────────── */
interface DistrictOverlayProps {
  districts: RegionSummary[];
  provinceSlug?: string;
}

function DistrictOverlay({ districts, provinceSlug }: DistrictOverlayProps) {
  const [visible, setVisible] = useState(false);

  if (districts.length === 0) return null;

  function toneClass(pct: number) {
    if (pct >= 65) return 'do-high';
    if (pct >= 40) return 'do-medium';
    return 'do-low';
  }

  if (!visible) {
    return (
      <button
        type="button"
        className="district-overlay-mini"
        onClick={() => setVisible(true)}
        title="แสดงสถานะรายอำเภอ"
      >
        <MapPin size={12} />
        <span>อำเภอ ({districts.length})</span>
      </button>
    );
  }

  return (
    <div className="district-overlay">
      <div className="district-overlay-header">
        <span className="district-overlay-title">
          <MapPin size={11} />
          สถานะรายอำเภอ
          <span style={{ opacity: 0.5, fontWeight: 400 }}>({districts.length})</span>
        </span>
        <button
          type="button"
          className="district-overlay-toggle"
          onClick={() => setVisible(false)}
          title="ซ่อน"
        >
          <X size={11} />
        </button>
      </div>

      <div className="district-overlay-grid">
        {districts.map((d, i) => {
          const cls = toneClass(d.healthy_percent);
          const href =
            provinceSlug && d.area_slug
              ? `/province/${provinceSlug}/district/${d.area_slug}`
              : undefined;
          const inner = (
            <div className={`district-overlay-card ${cls}`}>
              <span className="do-name">{d.region}</span>
              <span className="do-pct">{d.healthy_percent}%</span>
              <div className="do-bar-track">
                <div className="do-bar-fill" style={{ width: `${d.healthy_percent}%` }} />
              </div>
            </div>
          );
          const key = `${d.region}-${d.area_slug ?? i}`;
          return href ? (
            <Link key={key} href={href} className="do-link">{inner}</Link>
          ) : (
            <div key={key}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Station Detail Panel (in sidebar) ───────────────────────────── */
function StationDetail({ station, searchOrigin, onClose }: {
  station: Station;
  searchOrigin?: { lat: number; lng: number; radiusKm: number } | null;
  onClose: () => void;
}) {
  const statusLabel = STATUS_LABEL[station.status] ?? station.status;
  return (
    <div className="sb-station-detail">
      <div className="sb-station-head">
        <div className="sb-station-logo">
          <Image src={getBrandLogoUrl(station.brand)} alt={station.brand}
            width={40} height={40} unoptimized
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div className="sb-station-info">
          <strong className="sb-station-name">{station.name}</strong>
          <span className="sb-station-loc">
            <MapPin size={10} />
            {station.district_name} · {station.province_name}
          </span>
        </div>
        <button type="button" className="sb-station-close" onClick={onClose} aria-label="ปิด">
          <X size={14} />
        </button>
      </div>

      <span className={`sb-station-badge sb-badge-${station.status}`}>{statusLabel}</span>

      {station.fuels && station.fuels.length > 0 && (
        <div className="sb-station-fuels">
          <span className="sb-station-fuels-title">สถานะน้ำมัน</span>
          {station.fuels.slice(0, 6).map((f, i) => {
            const fm = getFuelMeta(f.fuel_type);
            return (
              <div key={i} className={`sb-fuel-row fb-${f.status}`}>
                <span className="sb-fuel-dot" style={{ background: fm.color }} />
                <span className="sb-fuel-name">{fm.label}</span>
                <span className="sb-fuel-liters">{f.liters >= 1000 ? `${(f.liters / 1000).toFixed(1)}k` : f.liters} L</span>
                {f.price_per_liter > 0 && <span className="sb-fuel-price">฿{f.price_per_liter.toFixed(2)}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="sb-station-actions">
        {searchOrigin && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${searchOrigin.lat},${searchOrigin.lng}&destination=${station.lat},${station.lng}&travelmode=driving`}
            target="_blank" rel="noopener noreferrer"
            className="sb-nav-btn"
          >
            <Navigation size={14} />
            นำทาง Google Maps
          </a>
        )}
        <Link href={`/staff/update?station_id=${station.id}&name=${encodeURIComponent(station.name)}`}
          className="sb-edit-btn">
          บันทึกข้อมูล
        </Link>
      </div>

      <StationHistory stationId={station.id} />
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function OverviewDashboard({ overview, map, feed }: OverviewDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [focusStation, setFocusStation] = useState<Station | null>(null);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>(feed);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>('summary');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Client-only init
  useEffect(() => {
    setAuthUser(getAuthUser());
    // Desktop: open sidebar by default
    if (window.innerWidth > 768) setSidebarOpen(true);
    // Trigger map resize after sidebar state settles
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }, []);

  const feedLock = useRef(false);
  const lastFetch = useRef(0);
  const jitterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const MAX_JITTER_MS = 8_000;
    const MIN_INTERVAL_MS = 15_000;

    function scheduleFeedRefetch() {
      if (jitterTimer.current) return;
      const elapsed = Date.now() - lastFetch.current;
      if (elapsed < MIN_INTERVAL_MS) return;
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

  const statusCounts = useMemo(() => ({
    high:      map.stations.filter((s) => s.status === 'high').length,
    low:       map.stations.filter((s) => s.status === 'low').length,
    out:       map.stations.filter((s) => s.status === 'out').length,
    refilling: map.stations.filter((s) => s.status === 'refilling').length,
    total:     map.stations.length,
  }), [map.stations]);

  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  const handleSearchStationClick = useCallback((s: NearbyStation) => {
    setSelectedStation(s);
    // Use a new object reference each time so useEffect triggers even for same station
    setFocusStation({ ...s });
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, []);

  const clearSelectedStation = useCallback(() => {
    setSelectedStation(null);
    setFocusStation(null);
  }, []);

  return (
    <div className="cmd-shell cmd-shell--fullmap">

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

        {/* Fuel price ticker — all types */}
        <div className="cmd-price-ticker mobile-hidden">
          {(() => {
            // Build price map from API data
            const priceMap: Record<string, number> = {};
            for (const f of overview.fuel_mix) priceMap[f.fuel_type] = f.average_price;
            // All fuel types to display with reference prices as fallback
            const allFuels = [
              { key: 'diesel_b7', ref: 29.99 },
              { key: 'premium_diesel', ref: 32.99 },
              { key: 'gasohol_91', ref: 36.58 },
              { key: 'gasohol_95', ref: 37.95 },
              { key: 'e20', ref: 34.89 },
              { key: 'E85', ref: 25.14 },
              { key: 'NGV', ref: 17.59 },
              { key: 'LPG', ref: 20.29 },
            ];
            return allFuels.map(({ key, ref }) => {
              const fm = getFuelMeta(key);
              const price = priceMap[key] ?? ref;
              const delta = priceMap[key] ? null : true; // mark as ref if no real data
              return (
                <div key={key} className="cmd-price-item" title={fm.label}>
                  <span className="cmd-price-flag" style={{ background: fm.color }} />
                  <span className="cmd-price-name">{fm.abbr}</span>
                  <span className={`cmd-price-val ${delta ? 'cmd-price-ref' : ''}`}>฿{price.toFixed(2)}</span>
                </div>
              );
            });
          })()}
        </div>

        <div className="cmd-header-right mobile-hidden">
          <Link href="/nearby" className="cmd-header-link">
            <Navigation2 size={13} />
            <span>ปั้มใกล้ฉัน</span>
          </Link>
          {authUser && (
            <Link
              href={authUser.station_id ? `/staff/update?station_id=${authUser.station_id}` : '/staff/update'}
              className="cmd-header-link"
            >
              <Pencil size={13} />
              <span>บันทึกข้อมูล</span>
            </Link>
          )}
          <LiveClock />
          <div className="cmd-update-chip">
            <RefreshCw size={11} />
            <span suppressHydrationWarning>{new Date(overview.generated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
          <button className="cmd-icon-btn" aria-label="notifications" type="button">
            <Bell size={15} />
            {alertCount > 0 && <span className="cmd-notif-badge">{alertCount}</span>}
          </button>
          {authUser ? (
            <div className="cmd-user-pill" title={`${authUser.email} — ${authUser.role}`}>
              <div className="cmd-user-ava">{authUser.name.charAt(0).toUpperCase()}</div>
              <div className="cmd-user-info">
                <span className="cmd-user-name">{authUser.name}</span>
                <span className="cmd-user-role">
                  {authUser.role === 'admin' ? 'ผู้ดูแลระบบ' : authUser.role === 'province_manager' ? `ผู้จัดการ${authUser.province_slug ? ` (${authUser.province_slug})` : ''}` : 'เจ้าหน้าที่'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { logout(); window.location.href = '/auth/login'; }}
                title="ออกจากระบบ"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
              >✕</button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              style={{ padding: '5px 14px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT: Sidebar + Map ── */}
      <div className="cmd-main-layout">

        {/* ── LEFT SIDEBAR ── */}
        <aside className={`cmd-sidebar ${sidebarOpen ? 'cmd-sidebar--open' : 'cmd-sidebar--closed'}`}>

          {/* Sidebar tabs */}
          <div className="cmd-sidebar-tabs">
            {SIDEBAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const badge = tab.key === 'live' && criticalFeedCount > 0 ? criticalFeedCount
                          : tab.key === 'summary' && alertCount > 0 ? alertCount
                          : 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`cmd-sidebar-tab ${activeTab === tab.key ? 'cmd-sidebar-tab--active' : ''}`}
                  onClick={() => { setActiveTab(tab.key); if (!sidebarOpen) setSidebarOpen(true); }}
                  title={tab.label}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {badge > 0 && <span className="cmd-sidebar-tab-badge">{badge}</span>}
                </button>
              );
            })}
          </div>

          {/* Sidebar content */}
          <div className="cmd-sidebar-content">

            {/* Station detail overlay — shows on top of any tab */}
            {selectedStation && (
              <StationDetail
                station={selectedStation}
                searchOrigin={searchOrigin}
                onClose={clearSelectedStation}
              />
            )}

            {/* Tab: Summary */}
            {activeTab === 'summary' && !selectedStation && (
              <div className="cmd-sidebar-panel">
                <div className="cmd-sidebar-panel-head">
                  <Gauge size={13} /><span>สรุปภาพรวม</span>
                </div>
                <div className="cmd-float-kpis">
                  {overview.kpis.slice(0, 4).map((kpi, i) => {
                    const Icon = KPI_ICONS[i] ?? Fuel;
                    const toneMap: Record<string, string> = { success: 'kpi-success', warning: 'kpi-warning', danger: 'kpi-danger', info: 'kpi-info' };
                    return (
                      <div key={kpi.label} className={`cmd-kpi-card ${toneMap[kpi.tone ?? ''] ?? 'kpi-neutral'}`}>
                        <div className="cmd-kpi-icon-wrap"><Icon size={20} /></div>
                        <div className="cmd-kpi-body">
                          <div className="cmd-kpi-label">{kpi.label}</div>
                          <div className="cmd-kpi-value">{kpi.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <BrandStrip stations={map.stations} />
                <div className="cmd-status-bar">
                  {(['high','low','out','refilling'] as const).map((k) => {
                    const dotCls = k === 'high' ? 'csb-green' : k === 'low' ? 'csb-yellow' : k === 'out' ? 'csb-red' : 'csb-cyan';
                    const fillCls = k === 'high' ? 'csf-green' : k === 'low' ? 'csf-yellow' : k === 'out' ? 'csf-red' : 'csf-cyan';
                    const label = k === 'high' ? 'ปกติ' : k === 'low' ? 'ใกล้หมด' : k === 'out' ? 'หมด' : 'กำลังเติม';
                    const val = statusCounts[k];
                    return (
                      <div key={k} className="cmd-status-segment">
                        <span className={`cmd-status-dot ${dotCls}`} />
                        <span className="cmd-status-label">{label}</span>
                        <span className="cmd-status-val">{val}</span>
                        <div className="cmd-status-track">
                          <div className={`cmd-status-fill ${fillCls}`} style={{ width: `${Math.round((val / Math.max(statusCounts.total, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="cmd-status-total">
                    <Gauge size={14} />
                    <span className="cmd-status-total-num">{statusCounts.total}</span>
                    <span className="cmd-status-total-label">สถานีทั้งหมด</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Search */}
            {activeTab === 'search' && !selectedStation && (
              <div className="cmd-sidebar-panel">
                <NearbySearchPanel
                  onResult={(stations, origin) => {
                    setNearbyStations(stations);
                    setSearchOrigin(origin);
                  }}
                  onStationClick={handleSearchStationClick}
                  onClear={() => {
                    setNearbyStations([]);
                    setSearchOrigin(null);
                    clearSelectedStation();
                  }}
                />
              </div>
            )}

            {/* Tab: Alerts */}
            {activeTab === 'alerts' && !selectedStation && (
              <div className="cmd-sidebar-panel">
                <AlertCenter scope={map.scope} />
              </div>
            )}

            {/* Tab: Trends */}
            {activeTab === 'trends' && !selectedStation && (
              <div className="cmd-sidebar-panel">
                <div className="cmd-sidebar-panel-head">
                  <BarChart3 size={13} /><span>แนวโน้มสถานะน้ำมัน</span>
                  <button
                    type="button"
                    className="cmd-export-btn"
                    onClick={async () => {
                      try {
                        const csv = await exportStations('csv', map.scope.province_slug);
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `oil-map-export-${map.scope.province_slug || 'all'}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch { /* ignore */ }
                    }}
                    title="ส่งออก CSV"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                </div>
                <TrendChart provinceSlug={map.scope.province_slug} />
              </div>
            )}

            {/* Tab: Live Feed */}
            {activeTab === 'live' && !selectedStation && (
              <div className="cmd-sidebar-panel">
                <FieldReportsFeed feed={sortedFeed} scope={map.scope} />
              </div>
            )}

            {/* Tab: Chat */}
            {activeTab === 'chat' && !selectedStation && (
              <div className="cmd-sidebar-panel cmd-sidebar-panel--chat">
                <OperationsChat scope={map.scope} />
              </div>
            )}
          </div>
        </aside>

        {/* Sidebar collapse toggle */}
        <button
          type="button"
          className="cmd-sidebar-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'ปิดแถบด้านข้าง' : 'เปิดแถบด้านข้าง'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* ── MAP AREA ── */}
        <div className="cmd-fullmap-wrap">
          <div className="cmd-map-wrap" style={{ position: 'relative', width: '100%', height: '100%' }}>

            {/* Filter chips floating on map */}
            <div className="cmd-map-filter-float">
              {FUEL_FILTERS.map((f) => {
                const count = f.key === 'all' ? map.stations.length : map.stations.filter((s) => s.status === f.key).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key)}
                    className={`cmd-filter-chip ${activeFilter === f.key ? 'active' : ''}`}
                    style={{ '--chip-color': f.color } as React.CSSProperties}
                  >
                    <span className="cmd-filter-dot" style={{ background: f.color }} />
                    <span className="cmd-filter-label">{f.label}</span>
                    <span className="cmd-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <DashboardMap
              stations={displayStations}
              scope={map.scope}
              onSelectStation={handleStationSelect}
              onDismissStation={clearSelectedStation}
              searchOrigin={searchOrigin}
              useViewportLoad={map.scope.level === 'national' || map.scope.level === 'region'}
              focusStation={focusStation}
              districtStats={(map.scope.level === 'province' || map.scope.level === 'district') ? overview.region_summaries : []}
            />
            {(map.scope.level === 'province' || map.scope.level === 'district') && (
              <DistrictOverlay districts={overview.region_summaries} provinceSlug={map.scope.province_slug} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
