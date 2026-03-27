'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Bell, Droplets, Fuel, Gauge, MapPin, RefreshCw, ShieldAlert, Truck, X, Zap } from 'lucide-react';
import { getLiveFeed } from '@/lib/api';
import { createRealtimeSubscription } from '@/lib/realtime';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import NearbySearchPanel from '@/components/NearbySearchPanel';
import FieldReportsFeed from '@/components/FieldReportsFeed';
import OperationsChat from '@/components/OperationsChat';
import type { FeedItem, MapResponse, NearbySearchResponse, NearbyStation, OverviewResponse, RegionSummary, Station } from '@/lib/types';
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
  const [visible, setVisible] = useState(true);

  if (districts.length === 0) return null;

  function toneClass(pct: number) {
    if (pct >= 65) return 'do-high';
    if (pct >= 40) return 'do-medium';
    return 'do-low';
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
          onClick={() => setVisible((v) => !v)}
          title={visible ? 'ซ่อน' : 'แสดง'}
        >
          {visible ? <X size={11} /> : <span style={{ fontSize: '0.65rem' }}>แสดง</span>}
        </button>
      </div>

      {visible && (
        <div className="district-overlay-grid">
          {districts.map((d) => {
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
            return href ? (
              <Link key={d.region} href={href} className="do-link">{inner}</Link>
            ) : (
              <div key={d.region}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function OverviewDashboard({ overview, map, feed }: OverviewDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>(feed);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set(['summary', 'live', 'search']));

  // On mobile close all panels by default so they don't cover the map
  useEffect(() => {
    if (window.innerWidth <= 640) {
      setOpenPanels(new Set());
    }
  }, []);

  function togglePanel(key: string) {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
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

  const panelSummaryOpen = openPanels.has('summary');
  const panelLiveOpen    = openPanels.has('live');
  const panelChatOpen    = openPanels.has('chat');
  const panelSearchOpen  = openPanels.has('search');

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

      {/* ── PANEL TOGGLE TOOLBAR ── */}
      <div className="cmd-panel-toolbar">
        <button
          type="button"
          className={`cmd-ptb-btn ${panelSummaryOpen ? 'cmd-ptb-btn--on' : ''}`}
          onClick={() => togglePanel('summary')}
          title="สรุปภาพรวม"
        >
          <Gauge size={14} />
          <span>สรุป</span>
          {alertCount > 0 && <span className="cmd-ptb-badge">{alertCount}</span>}
        </button>
        <button
          type="button"
          className={`cmd-ptb-btn ${panelLiveOpen ? 'cmd-ptb-btn--on' : ''}`}
          onClick={() => togglePanel('live')}
          title="รายงานสนาม"
        >
          <Droplets size={14} />
          <span>Live</span>
          {criticalFeedCount > 0 && <span className="cmd-ptb-badge cmd-ptb-badge--warn">{criticalFeedCount}</span>}
        </button>
        <button
          type="button"
          className={`cmd-ptb-btn ${panelChatOpen ? 'cmd-ptb-btn--on' : ''}`}
          onClick={() => togglePanel('chat')}
          title="แชทปฏิบัติการ"
        >
          <Bell size={14} />
          <span>แชท</span>
        </button>
        <button
          type="button"
          className={`cmd-ptb-btn ${panelSearchOpen ? 'cmd-ptb-btn--on' : ''}`}
          onClick={() => togglePanel('search')}
          title="ค้นหาปั้มใกล้เคียง"
        >
          <MapPin size={14} />
          <span>ค้นหา</span>
        </button>
      </div>

      {/* ── FULL MAP AREA ── */}
      <div className="cmd-fullmap-wrap">

        {/* Map */}
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
            onSelectStation={setSelectedStation}
            searchOrigin={searchOrigin}
            useViewportLoad={map.scope.level === 'national' || map.scope.level === 'region'}
          />
          {(map.scope.level === 'province' || map.scope.level === 'district') && (
            <DistrictOverlay districts={overview.region_summaries} provinceSlug={map.scope.province_slug} />
          )}
        </div>

        {/* ── Floating: Summary panel ── */}
        {panelSummaryOpen && (
          <div className="cmd-float-panel cmd-float-panel--summary">
            <div className="cmd-float-panel-head">
              <Gauge size={13} /><span>สรุปภาพรวม</span>
              <button type="button" className="cmd-float-close" onClick={() => togglePanel('summary')}><X size={13} /></button>
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

        {/* ── Floating: Live feed ── */}
        {panelLiveOpen && (
          <div className="cmd-float-panel cmd-float-panel--live">
            <button type="button" className="cmd-float-close cmd-float-close--abs" onClick={() => togglePanel('live')}><X size={13} /></button>
            <FieldReportsFeed feed={sortedFeed} scope={map.scope} />
          </div>
        )}

        {/* ── Floating: Chat ── */}
        {panelChatOpen && (
          <div className="cmd-float-panel cmd-float-panel--chat">
            <button type="button" className="cmd-float-close cmd-float-close--abs" onClick={() => togglePanel('chat')}><X size={13} /></button>
            <OperationsChat scope={map.scope} />
          </div>
        )}

        {/* ── Floating: Nearby Search ── */}
        {panelSearchOpen && (
          <div className="cmd-float-panel cmd-float-panel--search">
            <div className="cmd-float-panel-head">
              <MapPin size={13} /><span>ค้นหาปั้มใกล้เคียง</span>
              <button type="button" className="cmd-float-close" onClick={() => togglePanel('search')}><X size={13} /></button>
            </div>
            <NearbySearchPanel
              onResult={(stations, origin) => {
                setNearbyStations(stations);
                setSearchOrigin(origin);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
