'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, MapPin, Home, Building2 } from 'lucide-react';
import { getAuthUser, logout } from '@/lib/auth';
import { getProvinceDetail } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { Station, ScopeMeta } from '@/lib/types';
import TrendChart from '@/components/TrendChart';
import AlertCenter from '@/components/AlertCenter';

type SortKey = 'status' | 'name' | 'brand' | 'district' | 'updated';

const STATUS_ORDER: Record<string, number> = {
  out: 0,
  low: 1,
  refilling: 2,
  medium: 3,
  high: 4,
};

const STATUS_LABEL: Record<string, string> = {
  high: 'ปกติ',
  medium: 'ปานกลาง',
  low: 'ต่ำ',
  out: 'หมด',
  refilling: 'กำลังเติม',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [provinceName, setProvinceName] = useState('');
  const [provinceSlug, setProvinceSlug] = useState('');
  const [districtCount, setDistrictCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);

  // Auth guard
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'province_manager') {
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

  // Fetch province data
  useEffect(() => {
    if (!provinceSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getProvinceDetail(provinceSlug)
      .then((data) => {
        if (cancelled) return;
        setStations(data.map.stations);
        setProvinceName(data.scope.province_name || provinceSlug);
        setDistrictCount(
          data.overview.region_summaries?.length || 0
        );
      })
      .catch(() => {
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลจังหวัดได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [provinceSlug]);

  // Sorted stations
  const sortedStations = useMemo(() => {
    const sorted = [...stations];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5);
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name, 'th');
          break;
        case 'brand':
          cmp = a.brand.localeCompare(b.brand, 'th');
          break;
        case 'district':
          cmp = a.district_name.localeCompare(b.district_name, 'th');
          break;
        case 'updated':
          cmp = new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [stations, sortKey, sortAsc]);

  // Stats
  const healthyCount = stations.filter(
    (s) => s.status === 'high' || s.status === 'medium'
  ).length;
  const healthyPercent =
    stations.length > 0 ? Math.round((healthyCount / stations.length) * 100) : 0;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleLogout() {
    logout();
    router.replace('/');
  }

  const scope: ScopeMeta | undefined = provinceSlug
    ? {
        title: `จังหวัด ${provinceName}`,
        subtitle: '',
        level: 'province',
        province_slug: provinceSlug,
        province_name: provinceName,
      }
    : undefined;

  if (!user) return null;

  return (
    <div className="mgr-page">
      {/* Header */}
      <header className="mgr-header">
        <div className="mgr-header-left">
          <Building2 size={18} />
          <h1 className="mgr-title">จัดการจังหวัด {provinceName}</h1>
        </div>
        <div className="mgr-header-right">
          <span className="mgr-user">{user.name}</span>
          <Link href={`/province/${provinceSlug}`} className="mgr-nav-link">
            <MapPin size={14} />
            <span>แผนที่</span>
          </Link>
          <Link href="/" className="mgr-nav-link">
            <Home size={14} />
            <span>หน้าหลัก</span>
          </Link>
          <button className="mgr-logout" onClick={handleLogout}>
            <LogOut size={14} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div className="mgr-body">
        {/* Main content */}
        <div className="mgr-main">
          {/* Province info cards */}
          <div className="mgr-info-bar">
            <div className="mgr-info-card">
              <span className="mgr-info-label">สถานีทั้งหมด</span>
              <span className="mgr-info-value">{stations.length}</span>
            </div>
            <div className="mgr-info-card">
              <span className="mgr-info-label">อำเภอ</span>
              <span className="mgr-info-value">{districtCount}</span>
            </div>
            <div className="mgr-info-card">
              <span className="mgr-info-label">พร้อมให้บริการ</span>
              <span
                className={`mgr-info-value ${
                  healthyPercent >= 70
                    ? 'mgr-tone-success'
                    : healthyPercent >= 40
                    ? 'mgr-tone-warning'
                    : 'mgr-tone-danger'
                }`}
              >
                {healthyPercent}%
              </span>
            </div>
          </div>

          {/* Loading / error */}
          {loading && <p className="mgr-loading">กำลังโหลดข้อมูลสถานี...</p>}
          {error && <p className="mgr-error">{error}</p>}

          {/* Station table */}
          {!loading && !error && (
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead>
                  <tr>
                    <th className="mgr-th" onClick={() => handleSort('name')}>
                      ชื่อ {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="mgr-th" onClick={() => handleSort('brand')}>
                      แบรนด์ {sortKey === 'brand' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="mgr-th" onClick={() => handleSort('district')}>
                      อำเภอ {sortKey === 'district' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="mgr-th" onClick={() => handleSort('status')}>
                      สถานะ {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="mgr-th" onClick={() => handleSort('updated')}>
                      อัพเดทล่าสุด {sortKey === 'updated' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStations.map((station) => (
                    <tr
                      key={station.id}
                      className="mgr-tr"
                      onClick={() =>
                        router.push(`/staff/update?station_id=${station.id}`)
                      }
                    >
                      <td className="mgr-td mgr-td-name">{station.name}</td>
                      <td className="mgr-td">{station.brand}</td>
                      <td className="mgr-td">{station.district_name}</td>
                      <td className="mgr-td">
                        <span className={`mgr-badge mgr-badge-${station.status}`}>
                          {STATUS_LABEL[station.status] ?? station.status}
                        </span>
                      </td>
                      <td className="mgr-td mgr-td-time">
                        {formatDate(station.last_updated)}
                      </td>
                    </tr>
                  ))}
                  {sortedStations.length === 0 && (
                    <tr>
                      <td className="mgr-td mgr-td-empty" colSpan={5}>
                        ไม่พบสถานีในจังหวัดนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="mgr-side">
          <TrendChart provinceSlug={provinceSlug} />
          <AlertCenter scope={scope} />
        </aside>
      </div>
    </div>
  );
}
