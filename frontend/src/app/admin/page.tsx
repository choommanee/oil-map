'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  Download,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import AlertCenter from '@/components/AlertCenter';
import TrendChart from '@/components/TrendChart';
import { getOverview, exportStations } from '@/lib/api';
import { getAuthUser, logout } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import type { OverviewKpi, RegionSummary } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [kpis, setKpis] = useState<OverviewKpi[]>([]);
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  // Fetch overview data
  useEffect(() => {
    if (!user) return;

    getOverview({ level: 'national' })
      .then((data) => {
        setKpis(data.kpis);
        setRegions(data.region_summaries);
      })
      .catch(() => {
        // silently fail — KPIs will stay empty
      })
      .finally(() => setLoading(false));
  }, [user]);

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

  const kpiIcons = [
    <Building2 key="b" size={18} />,
    <ShieldCheck key="s" size={18} />,
    <AlertTriangle key="a" size={18} />,
    <MapPin key="m" size={18} />,
  ];

  function kpiToneClass(tone?: string) {
    switch (tone) {
      case 'success': return 'adm-kpi-success';
      case 'warning': return 'adm-kpi-warning';
      case 'danger':  return 'adm-kpi-danger';
      case 'info':    return 'adm-kpi-info';
      default:        return 'adm-kpi-neutral';
    }
  }

  if (!user) return null;

  return (
    <div className="adm-page">
      {/* Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <LayoutDashboard size={18} />
          <h1 className="adm-title">Admin Dashboard</h1>
        </div>
        <div className="adm-header-right">
          <span className="adm-user">{user.name}</span>
          <Link href="/" className="adm-back-link">
            <MapPin size={14} />
            กลับแผนที่
          </Link>
          <button className="adm-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <section className="adm-kpi-row">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="adm-kpi-card adm-kpi-neutral adm-kpi-loading">
                <div className="adm-kpi-skeleton" />
              </div>
            ))
          : kpis.map((kpi, i) => (
              <div key={i} className={`adm-kpi-card ${kpiToneClass(kpi.tone)}`}>
                <div className="adm-kpi-icon">{kpiIcons[i]}</div>
                <div className="adm-kpi-body">
                  <span className="adm-kpi-value">{kpi.value}</span>
                  <span className="adm-kpi-label">{kpi.label}</span>
                  {kpi.helper && <span className="adm-kpi-helper">{kpi.helper}</span>}
                </div>
              </div>
            ))}
      </section>

      {/* Two-column layout */}
      <div className="adm-columns">
        {/* Left column 60% */}
        <div className="adm-col-left">
          <AlertCenter />
          <TrendChart />
        </div>

        {/* Right column 40% */}
        <div className="adm-col-right">
          {/* Province / Region list */}
          <div className="adm-region-panel">
            <div className="adm-panel-head">
              <Activity size={14} />
              <h3 className="adm-panel-title">ภาพรวมรายจังหวัด / ภูมิภาค</h3>
            </div>
            <div className="adm-region-list">
              {loading && <p className="adm-loading-text">กำลังโหลด...</p>}
              {!loading && regions.length === 0 && (
                <p className="adm-empty-text">ไม่มีข้อมูล</p>
              )}
              {!loading &&
                regions.map((r, i) => (
                  <Link
                    key={i}
                    href={r.area_slug ? `/province/${r.area_slug}` : '#'}
                    className="adm-region-card"
                  >
                    <div className="adm-region-name">{r.region}</div>
                    <div className="adm-region-stats">
                      <span className="adm-region-stations">
                        {r.station_count} สถานี
                      </span>
                      <span className="adm-region-health">
                        {r.healthy_percent}% พร้อม
                      </span>
                      {r.critical_count > 0 && (
                        <span className="adm-region-critical">
                          {r.critical_count} วิกฤต
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          {/* Export section */}
          <div className="adm-export-panel">
            <div className="adm-panel-head">
              <Download size={14} />
              <h3 className="adm-panel-title">ส่งออกข้อมูล</h3>
            </div>
            <button
              className="adm-export-btn"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={14} />
              {exporting ? 'กำลัง export...' : 'ดาวน์โหลด CSV สถานีทั้งหมด'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
