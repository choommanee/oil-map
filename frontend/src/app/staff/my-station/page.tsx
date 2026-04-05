'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, Map, Pencil, RefreshCw, MapPin, Clock } from 'lucide-react';
import { getAuthUser, logout } from '@/lib/auth';
import { getStation } from '@/lib/api';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import StationHistory from '@/components/StationHistory';
import type { Station, FuelStatusItem, FuelLevel } from '@/lib/types';

const FUEL_COLORS: Record<string, string> = {
  diesel_b7: '#ffd166',
  gasohol_95: '#69f0ae',
  gasohol_91: '#67a6ff',
  e20: '#ff9d43',
  premium_diesel: '#41d6e8',
};

const FUEL_LABELS: Record<string, string> = {
  diesel_b7: 'ดีเซล B7',
  gasohol_95: 'แก๊สโซฮอล์ 95',
  gasohol_91: 'แก๊สโซฮอล์ 91',
  e20: 'E20',
  premium_diesel: 'ดีเซล พรีเมียม',
};

const STATUS_LABEL: Record<string, string> = {
  high: 'ปกติ',
  medium: 'ปานกลาง',
  low: 'ใกล้หมด',
  out: 'หมด',
  refilling: 'กำลังเติม',
};

const STATUS_CLASS: Record<string, string> = {
  high: 'mys-badge-ok',
  medium: 'mys-badge-ok',
  low: 'mys-badge-low',
  out: 'mys-badge-out',
  refilling: 'mys-badge-refill',
};

function levelToPercent(level: FuelLevel): number {
  switch (level) {
    case 'high': return 85;
    case 'medium': return 50;
    case 'low': return 25;
    case 'out': return 5;
    case 'refilling': return 40;
  }
}

function levelToBarClass(level: FuelLevel): string {
  switch (level) {
    case 'high': return 'mys-bar-ok';
    case 'medium': return 'mys-bar-ok';
    case 'low': return 'mys-bar-low';
    case 'out': return 'mys-bar-out';
    case 'refilling': return 'mys-bar-refill';
  }
}

function formatLastUpdated(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' น.';
}

export default function MyStationPage() {
  const router = useRouter();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [stationId, setStationId] = useState<number | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    if (!user) { router.replace('/auth/login'); return; }
    if (user.role !== 'staff') { router.replace('/'); return; }
    if (!user.station_id) { router.replace('/staff/update'); return; }
    setUserName(user.name);
    setStationId(user.station_id);

    setLoading(true);
    setError(null);
    getStation(user.station_id)
      .then((data) => setStation(data))
      .catch(() => setError('ไม่สามารถโหลดข้อมูลสถานีได้'))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <main className="mys-shell">
        <div className="mys-loading">
          <RefreshCw size={20} className="cmd-map-loading-icon" />
          <span>กำลังโหลดข้อมูลสถานี...</span>
        </div>
      </main>
    );
  }

  if (error || !station || !stationId) {
    return (
      <main className="mys-shell">
        <div className="mys-error">{error ?? 'ไม่พบข้อมูลสถานี'}</div>
      </main>
    );
  }

  return (
    <main className="mys-shell">
      <div className="mys-container">
        {/* Header */}
        <header className="mys-header">
          <div className="mys-header-left">
            <span className="mys-user-greeting">สวัสดี, {userName}</span>
          </div>
          <div className="mys-header-right">
            <Link href="/" className="mys-header-link">
              <Map size={15} />
              <span>แผนที่</span>
            </Link>
            <button onClick={handleLogout} className="mys-header-link mys-logout-btn">
              <LogOut size={15} />
              <span>ออก</span>
            </button>
          </div>
        </header>

        {/* Station Status Card */}
        <section className="mys-station-card">
          <div className="mys-station-logo">
            <Image
              src={getBrandLogoUrl(station.brand_key)}
              alt={station.brand}
              width={48}
              height={48}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h2 className="mys-station-name">{station.name}</h2>
          <p className="mys-station-location">
            <MapPin size={13} />
            <span>{station.district_name} &middot; {station.province_name}</span>
          </p>
          <span className={`mys-overall-badge ${STATUS_CLASS[station.status] ?? 'mys-badge-ok'}`}>
            {STATUS_LABEL[station.status] ?? station.status}
          </span>
          {station.last_updated && (
            <p className="mys-last-updated">
              <Clock size={12} />
              <span>อัปเดตล่าสุด: {formatLastUpdated(station.last_updated)}</span>
            </p>
          )}
        </section>

        {/* Fuel Cards */}
        <section className="mys-section">
          <h3 className="mys-section-title">สถานะเชื้อเพลิง</h3>
          <div className="mys-fuel-stack">
            {station.fuels.map((fuel: FuelStatusItem) => {
              const color = FUEL_COLORS[fuel.fuel_type] ?? '#67a6ff';
              const pct = levelToPercent(fuel.status);
              const barClass = levelToBarClass(fuel.status);
              return (
                <div key={fuel.fuel_type} className="mys-fuel-card" style={{ borderLeftColor: color }}>
                  <div className="mys-fuel-card-head">
                    <span className="mys-fuel-name">
                      {FUEL_LABELS[fuel.fuel_type] ?? fuel.fuel_type}
                    </span>
                    <span className={`mys-fuel-badge ${STATUS_CLASS[fuel.status] ?? 'mys-badge-ok'}`}>
                      {STATUS_LABEL[fuel.status] ?? fuel.status}
                    </span>
                  </div>
                  <div className="mys-fuel-bar-wrap">
                    <div className={`mys-fuel-bar ${barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mys-fuel-card-details">
                    <span className="mys-fuel-liters">
                      {fuel.liters.toLocaleString('th-TH')} ลิตร
                    </span>
                    <span className="mys-fuel-price">
                      ฿{fuel.price_per_liter.toFixed(2)}/ล.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mys-actions">
          <Link
            href={`/staff/update?station_id=${stationId}&name=${encodeURIComponent(station.name)}`}
            className="mys-btn-primary"
          >
            <Pencil size={18} />
            <span>อัปเดตสถานะน้ำมัน</span>
          </Link>
          <Link href="/" className="mys-btn-secondary">
            <Map size={18} />
            <span>ดูบนแผนที่</span>
          </Link>
        </section>

        {/* History */}
        <section className="mys-section">
          <StationHistory stationId={stationId} />
        </section>
      </div>
    </main>
  );
}
