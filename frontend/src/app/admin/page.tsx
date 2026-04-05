'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Download,
  Shield,
  Users,
} from 'lucide-react';
import AlertCenter from '@/components/AlertCenter';
import TrendChart from '@/components/TrendChart';
import { getOverview, getAlerts, exportStations } from '@/lib/api';
import { getAuthUser, logout } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import type { OverviewKpi, RegionSummary, AlertCenterItem } from '@/lib/types';

/* ── Region mapping ───────────────────────────────────────────────────────── */

const REGION_ORDER = ['เหนือ', 'อีสาน', 'กลาง', 'ตะวันออก', 'ใต้'];

function regionLabel(raw: string): string {
  const map: Record<string, string> = {
    north: 'เหนือ',
    northeast: 'อีสาน',
    central: 'กลาง',
    east: 'ตะวันออก',
    south: 'ใต้',
    เหนือ: 'เหนือ',
    อีสาน: 'อีสาน',
    กลาง: 'กลาง',
    ตะวันออก: 'ตะวันออก',
    ใต้: 'ใต้',
  };
  return map[raw.toLowerCase()] || raw;
}

/* ── SVG Ring Gauge ───────────────────────────────────────────────────────── */

function RingGauge({ percent, size = 64, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent >= 70 ? '#69f0ae' : percent >= 40 ? '#ffd166' : '#ff6b6b';
  return (
    <svg width={size} height={size} className="adm-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.22} fontWeight="700">
        {percent}%
      </text>
    </svg>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [kpis, setKpis] = useState<OverviewKpi[]>([]);
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [critAlerts, setCritAlerts] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [now, setNow] = useState(new Date());

  // Auth guard
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      if (authUser?.role === 'staff') {
        router.replace('/');
      } else if (authUser?.role === 'province_manager') {
        router.replace(
          authUser.province_slug
            ? `/province/${authUser.province_slug}`
            : '/'
        );
      } else {
        router.replace('/');
      }
      return;
    }
    setUser(authUser);
  }, [router]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    Promise.all([
      getOverview({ level: 'national' }),
      getAlerts().catch(() => ({ alerts: [] as AlertCenterItem[] })),
    ])
      .then(([overview, alertData]) => {
        setKpis(overview.kpis);
        setRegions(overview.region_summaries);
        const sorted = [...alertData.alerts].sort((a, b) => b.critical_percent - a.critical_percent);
        setCritAlerts(sorted.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Derived values
  const totalStations = useMemo(() => {
    const k = kpis.find((k) => k.label === 'สถานีทั้งหมด');
    return typeof k?.value === 'number' ? k.value : 0;
  }, [kpis]);

  const healthyPct = useMemo(() => {
    const k = kpis.find((k) => k.label === 'พร้อมให้บริการ');
    if (!k) return 0;
    return typeof k.value === 'string' ? parseInt(k.value) : Number(k.value);
  }, [kpis]);

  const warningCount = useMemo(() => {
    const k = kpis.find((k) => k.label === 'จุดเฝ้าระวัง');
    return typeof k?.value === 'number' ? k.value : 0;
  }, [kpis]);

  const criticalCount = useMemo(() => {
    const k = kpis.find((k) => k.label === 'จุดวิกฤต');
    return typeof k?.value === 'number' ? k.value : 0;
  }, [kpis]);

  const critProvinces = useMemo(() => {
    return critAlerts.filter((a) => a.severity === 'critical').length;
  }, [critAlerts]);

  const lastUpdated = useMemo(() => {
    const k = kpis.find((k) => k.label === 'พร้อมให้บริการ');
    return k?.helper || '';
  }, [kpis]);

  const situationLevel = useMemo(() => {
    if (criticalCount >= 5 || critProvinces >= 3) return 'crisis';
    if (criticalCount > 0 || warningCount > 3) return 'watch';
    return 'normal';
  }, [criticalCount, warningCount, critProvinces]);

  const normalProvinces = useMemo(() => {
    const critSlugs = new Set(critAlerts.map((a) => a.province_slug));
    return 77 - critSlugs.size;
  }, [critAlerts]);

  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => {
      const ai = REGION_ORDER.indexOf(regionLabel(a.region));
      const bi = REGION_ORDER.indexOf(regionLabel(b.region));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [regions]);

  function handleLogout() {
    logout();
    router.replace('/');
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportStations('csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stations-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('ไม่สามารถ export ได้ กรุณาลองใหม่');
    } finally {
      setExporting(false);
    }
  }

  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!user) return null;

  return (
    <div className="adm-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div className="adm-header-left">
          <Shield size={22} className="adm-header-icon" />
          <div>
            <h1 className="adm-title">OilMap Command Center</h1>
            <p className="adm-subtitle">ศูนย์บัญชาการสถานการณ์น้ำมันแห่งชาติ</p>
          </div>
        </div>
        <div className="adm-header-right">
          <div className="adm-header-datetime">
            <span className="adm-date">{dateStr}</span>
            <span className="adm-time">{timeStr}</span>
          </div>
          <span className="adm-user">{user.name}</span>
          <button className="adm-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* ── National Status Banner ──────────────────────────────────────── */}
      <section className={`adm-status-banner adm-status-${situationLevel}`}>
        <div className="adm-status-content">
          <span className="adm-status-label">
            {situationLevel === 'normal' && 'สถานการณ์ปกติ'}
            {situationLevel === 'watch' && 'เฝ้าระวัง'}
            {situationLevel === 'crisis' && 'วิกฤต'}
          </span>
          <span className="adm-status-detail">
            {normalProvinces} จังหวัดปกติ จาก 77 จังหวัด
          </span>
        </div>
      </section>

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <section className="adm-kpi-row">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-kpi-card adm-kpi-loading">
              <div className="adm-kpi-skeleton" />
            </div>
          ))
        ) : (
          <>
            {/* 1. Total stations */}
            <div className="adm-kpi-card adm-kpi-info" style={{ animationDelay: '0s' }}>
              <span className="adm-kpi-label">สถานีทั้งหมด</span>
              <span className="adm-kpi-value">{totalStations.toLocaleString()}</span>
            </div>

            {/* 2. Healthy % with ring gauge */}
            <div className="adm-kpi-card adm-kpi-success" style={{ animationDelay: '0.05s' }}>
              <span className="adm-kpi-label">พร้อมให้บริการ</span>
              <div className="adm-kpi-ring-row">
                <RingGauge percent={healthyPct} size={58} stroke={5} />
              </div>
            </div>

            {/* 3. Warning */}
            <div className={`adm-kpi-card adm-kpi-warning ${warningCount > 0 ? '' : 'adm-kpi-ok'}`} style={{ animationDelay: '0.1s' }}>
              <span className="adm-kpi-label">ใกล้หมด</span>
              <span className="adm-kpi-value">{warningCount}</span>
            </div>

            {/* 4. Critical */}
            <div className={`adm-kpi-card adm-kpi-danger ${criticalCount > 0 ? 'adm-pulse-danger' : ''}`} style={{ animationDelay: '0.15s' }}>
              <span className="adm-kpi-label">หมดน้ำมัน</span>
              <span className="adm-kpi-value">{criticalCount}</span>
            </div>

            {/* 5. Critical provinces */}
            <div className={`adm-kpi-card adm-kpi-danger ${critProvinces > 0 ? 'adm-pulse-danger' : ''}`} style={{ animationDelay: '0.2s' }}>
              <span className="adm-kpi-label">จังหวัดวิกฤต</span>
              <span className="adm-kpi-value">{critProvinces}</span>
            </div>

            {/* 6. Last updated */}
            <div className="adm-kpi-card adm-kpi-neutral" style={{ animationDelay: '0.25s' }}>
              <span className="adm-kpi-label">อัปเดตล่าสุด</span>
              <span className="adm-kpi-value adm-kpi-value-sm">{lastUpdated || timeStr}</span>
            </div>
          </>
        )}
      </section>

      {/* ── Main 3-column grid ──────────────────────────────────────────── */}
      <div className="adm-columns">
        {/* Column 1: Region overview + Trend */}
        <div className="adm-col-1">
          <div className="adm-panel adm-region-panel">
            <h3 className="adm-panel-title">ภาพรวมรายภาค</h3>
            <div className="adm-region-list">
              {loading && <p className="adm-loading-text">กำลังโหลด...</p>}
              {!loading && sortedRegions.length === 0 && <p className="adm-empty-text">ไม่มีข้อมูล</p>}
              {!loading &&
                sortedRegions.map((r, i) => {
                  const label = regionLabel(r.region);
                  const healthColor =
                    r.healthy_percent >= 80 ? '#69f0ae' : r.healthy_percent >= 50 ? '#ffd166' : '#ff6b6b';
                  return (
                    <div key={i} className="adm-region-card" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="adm-region-top">
                        <span className="adm-region-name">{label}</span>
                        <span className="adm-region-stations">{r.station_count} สถานี</span>
                      </div>
                      <div className="adm-region-bar-wrap">
                        <div
                          className="adm-region-bar"
                          style={{ width: `${r.healthy_percent}%`, background: healthColor }}
                        />
                      </div>
                      <div className="adm-region-bottom">
                        <span className="adm-region-health" style={{ color: healthColor }}>
                          {r.healthy_percent}% พร้อม
                        </span>
                        {r.critical_count > 0 && (
                          <span className="adm-region-critical">{r.critical_count} วิกฤต</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="adm-panel">
            <h3 className="adm-panel-title">เทรนด์ 7 วัน</h3>
            <TrendChart />
          </div>
        </div>

        {/* Column 2: Critical provinces */}
        <div className="adm-col-2">
          <div className="adm-panel adm-watchlist-panel">
            <h3 className="adm-panel-title">จังหวัดเฝ้าระวัง</h3>
            <div className="adm-watchlist">
              {loading && <p className="adm-loading-text">กำลังโหลด...</p>}
              {!loading && critAlerts.length === 0 && (
                <div className="adm-watchlist-ok">
                  <Shield size={24} />
                  <span>ไม่มีจังหวัดเฝ้าระวัง</span>
                </div>
              )}
              {!loading &&
                critAlerts.map((alert, i) => (
                  <Link
                    key={`${alert.province_slug}-${i}`}
                    href={
                      alert.district_slug
                        ? `/province/${alert.province_slug}/district/${alert.district_slug}`
                        : `/province/${alert.province_slug}`
                    }
                    className={`adm-watch-item adm-watch-${alert.severity}`}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <span className="adm-watch-rank">{i + 1}</span>
                    <div className="adm-watch-body">
                      <span className="adm-watch-name">
                        {alert.province_name}
                        {alert.district_name && <span className="adm-watch-district"> / {alert.district_name}</span>}
                      </span>
                      <div className="adm-watch-stats">
                        <span className="adm-watch-pct">{alert.critical_percent.toFixed(0)}% วิกฤต</span>
                        <span className="adm-watch-count">{alert.critical_stations}/{alert.total_stations} สถานี</span>
                      </div>
                    </div>
                    <span className={`adm-watch-badge adm-watch-badge-${alert.severity}`}>
                      {alert.severity === 'critical' ? 'วิกฤต' : 'เตือน'}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>

        {/* Column 3: Alerts + Export + Users */}
        <div className="adm-col-3">
          <AlertCenter />

          <div className="adm-panel">
            <h3 className="adm-panel-title">ส่งออกข้อมูล</h3>
            <button
              className="adm-export-btn"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={15} />
              {exporting ? 'กำลัง export...' : 'ดาวน์โหลด CSV สถานีทั้งหมด'}
            </button>
          </div>

          <div className="adm-panel adm-users-panel">
            <h3 className="adm-panel-title">ผู้ใช้ในระบบ</h3>
            <div className="adm-users-mock">
              <Users size={20} />
              <span className="adm-users-count">12</span>
              <span className="adm-users-label">ผู้ใช้งาน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
