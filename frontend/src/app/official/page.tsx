'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  Building2,
  Download,
  Printer,
  RefreshCw,
  Clock,
  MapPin,
  Activity,
} from 'lucide-react';
import { getAuthUser, logout } from '@/lib/auth';
import { getProvinceDetail, getAlerts, getTrends, exportStations } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { Station, AlertCenterItem, TrendDay } from '@/lib/types';
import TrendChart from '@/components/TrendChart';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const STATUS_ORDER: Record<string, number> = {
  out: 0, low: 1, refilling: 2, medium: 3, high: 4,
};

function stationIsHealthy(s: Station) {
  return s.status === 'high' || s.status === 'medium';
}

function stationIsLow(s: Station) {
  return s.status === 'low';
}

function stationIsOut(s: Station) {
  return s.status === 'out';
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(d: Date): string {
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ── SVG progress ring ───────────────────────────────────────────────────── */

function ProgressRing({ percent, size = 72, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  const color = percent >= 70 ? '#2fe08d' : percent >= 40 ? '#ffd166' : '#ff4f70';

  return (
    <svg width={size} height={size} className="off-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="1.1rem"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {percent}%
      </text>
    </svg>
  );
}

/* ── district heat row data ──────────────────────────────────────────────── */

interface DistrictRow {
  name: string;
  slug: string;
  total: number;
  healthy: number;
  low: number;
  out: number;
  healthyPct: number;
  criticalPct: number;
}

/* ── brand summary ───────────────────────────────────────────────────────── */

interface BrandSummary {
  brand: string;
  total: number;
  healthy: number;
  critical: number;
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function OfficialDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [provinceName, setProvinceName] = useState('');
  const [provinceSlug, setProvinceSlug] = useState('');
  const [alerts, setAlerts] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [exporting, setExporting] = useState(false);
  const [visible, setVisible] = useState(false);

  /* clock tick */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* fade-in trigger */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* auth guard */
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser || (authUser.role !== 'official' && authUser.role !== 'province_manager' && authUser.role !== 'admin')) {
      router.replace('/');
      return;
    }
    if (!authUser.province_slug) {
      router.replace('/');
      return;
    }
    setUser(authUser);
    setProvinceSlug(authUser.province_slug);
  }, [router]);

  /* data fetch */
  const fetchData = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const [provinceData, alertData] = await Promise.all([
        getProvinceDetail(slug),
        getAlerts(),
      ]);
      setStations(provinceData.map.stations);
      setProvinceName(provinceData.scope.province_name || slug);

      const filtered = alertData.alerts
        .filter((a) => a.province_slug === slug)
        .sort((a, b) => {
          if (a.severity === 'critical' && b.severity !== 'critical') return -1;
          if (a.severity !== 'critical' && b.severity === 'critical') return 1;
          return b.critical_percent - a.critical_percent;
        });
      setAlerts(filtered);
      setLastRefresh(new Date());
    } catch {
      setError('ไม่สามารถโหลดข้อมูลจังหวัดได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (provinceSlug) fetchData(provinceSlug);
  }, [provinceSlug, fetchData]);

  /* auto-refresh every 5 min */
  useEffect(() => {
    if (!provinceSlug) return;
    const t = setInterval(() => fetchData(provinceSlug), 5 * 60_000);
    return () => clearInterval(t);
  }, [provinceSlug, fetchData]);

  /* computed KPIs */
  const totalStations = stations.length;
  const healthyCount = stations.filter(stationIsHealthy).length;
  const healthyPct = totalStations > 0 ? Math.round((healthyCount / totalStations) * 100) : 0;
  const lowCount = stations.filter(stationIsLow).length;
  const outCount = stations.filter(stationIsOut).length;

  /* district rows */
  const districtRows: DistrictRow[] = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; stations: Station[] }>();
    for (const s of stations) {
      const key = s.district_slug;
      if (!map.has(key)) map.set(key, { name: s.district_name, slug: s.district_slug, stations: [] });
      map.get(key)!.stations.push(s);
    }
    return Array.from(map.values())
      .map((d) => {
        const h = d.stations.filter(stationIsHealthy).length;
        const l = d.stations.filter(stationIsLow).length;
        const o = d.stations.filter(stationIsOut).length;
        return {
          name: d.name,
          slug: d.slug,
          total: d.stations.length,
          healthy: h,
          low: l,
          out: o,
          healthyPct: d.stations.length > 0 ? Math.round((h / d.stations.length) * 100) : 100,
          criticalPct: d.stations.length > 0 ? Math.round((o / d.stations.length) * 100) : 0,
        };
      })
      .sort((a, b) => a.healthyPct - b.healthyPct); // worst first
  }, [stations]);

  const watchDistricts = districtRows.filter((d) => d.out > 0 || d.low > 0).length;

  /* brand summary */
  const brandSummaries: BrandSummary[] = useMemo(() => {
    const map = new Map<string, { total: number; healthy: number; critical: number }>();
    for (const s of stations) {
      const key = s.brand;
      if (!map.has(key)) map.set(key, { total: 0, healthy: 0, critical: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (stationIsHealthy(s)) entry.healthy++;
      if (stationIsOut(s)) entry.critical++;
    }
    return Array.from(map.entries())
      .map(([brand, data]) => ({ brand, ...data }))
      .sort((a, b) => b.critical - a.critical || b.total - a.total);
  }, [stations]);

  /* situation level */
  const maxCriticalPct = alerts.length > 0 ? Math.max(...alerts.map((a) => a.critical_percent)) : 0;
  const situationLevel: 'normal' | 'risk' | 'crisis' =
    maxCriticalPct >= 30 ? 'crisis' : maxCriticalPct >= 10 ? 'risk' : 'normal';

  /* export handler */
  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportStations('csv', provinceSlug);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stations-${provinceSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleLogout() {
    logout();
    router.replace('/');
  }

  if (!user) return null;

  return (
    <div className={`off-page ${visible ? 'off-visible' : ''}`}>
      {/* ── 1. Header Banner ──────────────────────────────────────────── */}
      <header className="off-header">
        <div className="off-header-glow" />
        <div className="off-header-inner">
          <div className="off-header-left">
            <div className="off-header-icon">
              <Fuel size={28} />
            </div>
            <div className="off-header-text">
              <h1 className="off-header-province">{provinceName || 'กำลังโหลด...'}</h1>
              <p className="off-header-subtitle">ศูนย์ติดตามสถานการณ์พลังงาน</p>
            </div>
          </div>
          <div className="off-header-right">
            <div className="off-header-meta">
              <span className="off-header-user">
                <Building2 size={14} />
                {user.name}
              </span>
              <span className="off-header-datetime">
                <Clock size={13} />
                {formatFullDate(now)} {formatTime(now)} น.
              </span>
            </div>
            <button className="off-header-logout" onClick={handleLogout}>
              <LogOut size={15} />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Situation Status Bar ───────────────────────────────────── */}
      <div className={`off-situation off-situation-${situationLevel}`}>
        <span className="off-situation-dot" />
        <span className="off-situation-label">
          {situationLevel === 'normal' && 'สถานการณ์ปกติ'}
          {situationLevel === 'risk' && 'มีความเสี่ยง'}
          {situationLevel === 'crisis' && 'สถานการณ์วิกฤต'}
        </span>
        <span className="off-situation-detail">
          {situationLevel === 'normal' && 'ไม่พบพื้นที่ที่ต้องเฝ้าระวังเป็นพิเศษ'}
          {situationLevel === 'risk' && `พบ ${watchDistricts} อำเภอที่ต้องเฝ้าระวัง`}
          {situationLevel === 'crisis' && `พบ ${outCount} สถานีหมดน้ำมัน ใน ${watchDistricts} อำเภอ`}
        </span>
      </div>

      {/* ── 3. KPI Cards ──────────────────────────────────────────────── */}
      <div className="off-kpis">
        {/* Total stations */}
        <div className="off-kpi off-kpi-blue" style={{ animationDelay: '0.05s' }}>
          <div className="off-kpi-icon"><Fuel size={22} /></div>
          <div className="off-kpi-body">
            <span className="off-kpi-number">{totalStations}</span>
            <span className="off-kpi-label">สถานีทั้งหมด</span>
          </div>
        </div>

        {/* Healthy % with ring */}
        <div className="off-kpi off-kpi-green" style={{ animationDelay: '0.12s' }}>
          <ProgressRing percent={healthyPct} />
          <div className="off-kpi-body">
            <span className="off-kpi-label">พร้อมให้บริการ</span>
            <span className="off-kpi-sub">{healthyCount} จาก {totalStations} สถานี</span>
          </div>
        </div>

        {/* Low */}
        <div className="off-kpi off-kpi-yellow" style={{ animationDelay: '0.19s' }}>
          <div className="off-kpi-icon"><TrendingDown size={22} /></div>
          <div className="off-kpi-body">
            <span className="off-kpi-number">{lowCount}</span>
            <span className="off-kpi-label">ใกล้หมด</span>
          </div>
        </div>

        {/* Out */}
        <div className={`off-kpi off-kpi-red ${outCount > 0 ? 'off-kpi-pulse' : ''}`} style={{ animationDelay: '0.26s' }}>
          <div className="off-kpi-icon"><AlertTriangle size={22} /></div>
          <div className="off-kpi-body">
            <span className="off-kpi-number">{outCount}</span>
            <span className="off-kpi-label">หมดน้ำมัน</span>
          </div>
        </div>

        {/* Watch districts */}
        <div className="off-kpi off-kpi-cyan" style={{ animationDelay: '0.33s' }}>
          <div className="off-kpi-icon"><MapPin size={22} /></div>
          <div className="off-kpi-body">
            <span className="off-kpi-number">{watchDistricts}</span>
            <span className="off-kpi-label">อำเภอเฝ้าระวัง</span>
          </div>
        </div>
      </div>

      {/* ── Loading / Error ───────────────────────────────────────────── */}
      {loading && (
        <div className="off-loading">
          <RefreshCw size={20} className="off-spin" />
          กำลังโหลดข้อมูล...
        </div>
      )}
      {error && <div className="off-error">{error}</div>}

      {/* ── 4. Two-column Main ────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="off-columns">
          {/* Left 65% */}
          <div className="off-col-left">
            {/* District heatmap table */}
            <div className="off-panel">
              <div className="off-panel-head">
                <Activity size={16} />
                <h2 className="off-panel-title">แผนที่ความร้อนรายอำเภอ</h2>
                <span className="off-panel-count">{districtRows.length} อำเภอ</span>
              </div>
              <div className="off-district-list">
                {districtRows.map((d, i) => (
                  <Link
                    key={d.slug}
                    href={`/province/${provinceSlug}/district/${d.slug}`}
                    className="off-district-row"
                    style={{ animationDelay: `${0.04 * i}s` }}
                  >
                    <div className="off-district-info">
                      <span className={`off-district-dot ${d.out > 0 ? 'off-dot-red' : d.low > 0 ? 'off-dot-yellow' : 'off-dot-green'}`} />
                      <span className="off-district-name">{d.name}</span>
                      <span className="off-district-count">{d.total} สถานี</span>
                    </div>
                    <div className="off-district-bar-wrap">
                      <div className="off-district-bar">
                        <div
                          className="off-district-bar-ok"
                          style={{ width: `${d.healthyPct}%` }}
                        />
                        {d.criticalPct > 0 && (
                          <div
                            className="off-district-bar-crit"
                            style={{ width: `${d.criticalPct}%` }}
                          />
                        )}
                      </div>
                      <span className="off-district-pct">{d.healthyPct}%</span>
                    </div>
                  </Link>
                ))}
                {districtRows.length === 0 && (
                  <div className="off-empty">ไม่พบข้อมูลอำเภอ</div>
                )}
              </div>
            </div>

            {/* Trend chart */}
            <div className="off-panel off-panel-trend">
              <div className="off-panel-head">
                <Activity size={16} />
                <h2 className="off-panel-title">เทรนด์ 7 วัน</h2>
              </div>
              <TrendChart provinceSlug={provinceSlug} />
            </div>
          </div>

          {/* Right 35% */}
          <div className="off-col-right">
            {/* Urgent alerts */}
            <div className="off-panel">
              <div className="off-panel-head">
                <AlertTriangle size={16} />
                <h2 className="off-panel-title">แจ้งเตือนเร่งด่วน</h2>
              </div>
              <div className="off-alerts">
                {alerts.length === 0 && (
                  <div className="off-alert-ok">
                    <ShieldCheck size={24} />
                    <span>ไม่มีแจ้งเตือน - สถานการณ์ปกติ</span>
                  </div>
                )}
                {alerts.map((alert, i) => {
                  const href = alert.district_slug
                    ? `/province/${alert.province_slug}/district/${alert.district_slug}`
                    : `/province/${alert.province_slug}`;
                  return (
                    <Link
                      key={`${alert.province_slug}-${alert.district_slug ?? ''}-${i}`}
                      href={href}
                      className={`off-alert-card off-alert-${alert.severity}`}
                    >
                      <div className="off-alert-top">
                        <span className="off-alert-name">
                          {alert.district_name || alert.province_name}
                        </span>
                        <span className={`off-alert-badge off-alert-badge-${alert.severity}`}>
                          {alert.severity === 'critical' ? 'วิกฤต' : 'เตือน'}
                        </span>
                      </div>
                      <div className="off-alert-stats">
                        <span>{alert.critical_percent.toFixed(0)}% วิกฤต</span>
                        <span className="off-alert-sep">|</span>
                        <span>{alert.critical_stations}/{alert.total_stations} สถานี</span>
                      </div>
                      {alert.top_issues.length > 0 && (
                        <div className="off-alert-issues">
                          {alert.top_issues.slice(0, 2).map((issue, j) => (
                            <span key={j} className="off-alert-chip">{issue}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Brand breakdown */}
            <div className="off-panel">
              <div className="off-panel-head">
                <Fuel size={16} />
                <h2 className="off-panel-title">สรุปตามแบรนด์</h2>
              </div>
              <div className="off-brands">
                {brandSummaries.map((b) => (
                  <div key={b.brand} className="off-brand-card">
                    <div className="off-brand-top">
                      <span className="off-brand-name">{b.brand}</span>
                      <span className="off-brand-total">{b.total} สถานี</span>
                    </div>
                    <div className="off-brand-bar-wrap">
                      <div className="off-brand-bar">
                        <div
                          className="off-brand-bar-ok"
                          style={{ width: `${b.total > 0 ? (b.healthy / b.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="off-brand-stats">
                      <span className="off-brand-stat off-brand-stat-ok">{b.healthy} ปกติ</span>
                      {b.critical > 0 && (
                        <span className="off-brand-stat off-brand-stat-crit">{b.critical} วิกฤต</span>
                      )}
                    </div>
                  </div>
                ))}
                {brandSummaries.length === 0 && (
                  <div className="off-empty">ไม่พบข้อมูลแบรนด์</div>
                )}
              </div>
            </div>

            {/* Export */}
            <div className="off-panel">
              <div className="off-panel-head">
                <Download size={16} />
                <h2 className="off-panel-title">ส่งออกรายงาน</h2>
              </div>
              <div className="off-export-actions">
                <button className="off-export-btn off-export-csv" onClick={handleExport} disabled={exporting}>
                  <Download size={16} />
                  {exporting ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
                </button>
                <button className="off-export-btn off-export-print" onClick={handlePrint}>
                  <Printer size={16} />
                  พิมพ์รายงาน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Footer ─────────────────────────────────────────────────── */}
      <footer className="off-footer">
        <span className="off-footer-time">
          <Clock size={13} />
          ข้อมูล ณ เวลา {formatTime(lastRefresh)} น.
        </span>
        <span className="off-footer-refresh">
          <RefreshCw size={13} className="off-spin-slow" />
          รีเฟรชอัตโนมัติทุก 5 นาที
        </span>
      </footer>
    </div>
  );
}
