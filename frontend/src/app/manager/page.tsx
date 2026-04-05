'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  MapPin,
  Fuel,
  FileBarChart,
  RefreshCw,
  Car,
  TrendingUp,
  Clock,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { getAuthUser, logout } from '@/lib/auth';
import { getStation } from '@/lib/api';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { AuthUser } from '@/lib/auth';
import type { Station, FuelStatusItem, FuelLevel } from '@/lib/types';
import StationHistory from '@/components/StationHistory';

/* ── helpers ───────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  high: 'พร้อมให้บริการ',
  medium: 'ปานกลาง',
  low: 'ระดับต่ำ',
  out: 'หมดสต็อก',
  refilling: 'กำลังเติม',
};

const STATUS_COLOR: Record<string, string> = {
  high: '#69f0ae',
  medium: '#ffd166',
  low: '#ff9d43',
  out: '#ff6b6b',
  refilling: '#41d6e8',
};

const FUEL_COLORS: Record<string, string> = {
  diesel: '#41d6e8',
  diesel_b7: '#41d6e8',
  gasohol_95: '#69f0ae',
  gasohol_91: '#67a6ff',
  e20: '#ffd166',
  e85: '#ff9d43',
  premium: '#c084fc',
  lpg: '#f472b6',
  ngv: '#34d399',
};

function fuelColor(fuelType: string): string {
  const key = fuelType.toLowerCase().replace(/[\s-]/g, '_');
  return FUEL_COLORS[key] ?? '#67a6ff';
}

function levelToPercent(level: FuelLevel): number {
  switch (level) {
    case 'high': return 85;
    case 'medium': return 50;
    case 'low': return 25;
    case 'refilling': return 40;
    case 'out': return 5;
    default: return 0;
  }
}

function gaugeColor(pct: number): string {
  if (pct > 60) return '#69f0ae';
  if (pct > 20) return '#ffd166';
  return '#ff6b6b';
}

function fuelLabel(fuelType: string): string {
  const map: Record<string, string> = {
    diesel: 'ดีเซล',
    diesel_b7: 'ดีเซล B7',
    gasohol_95: 'แก๊สโซฮอล์ 95',
    gasohol_91: 'แก๊สโซฮอล์ 91',
    e20: 'E20',
    e85: 'E85',
    premium: 'พรีเมียม',
    lpg: 'LPG',
    ngv: 'NGV',
  };
  const key = fuelType.toLowerCase().replace(/[\s-]/g, '_');
  return map[key] ?? fuelType;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ชั่วโมงที่แล้ว`;
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('th-TH');
}

/* ── Gauge SVG ─────────────────────────────────────────────────────────── */

function FuelGauge({
  percent,
  color,
  size = 120,
  strokeWidth = 10,
}: {
  percent: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  const gaugeRef = useRef<SVGCircleElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger fill animation on mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="own-gauge-svg"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Colored fill */}
      <circle
        ref={gaugeRef}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? dashOffset : circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="own-gauge-fill"
        style={{
          filter: `drop-shadow(0 0 6px ${color}40)`,
        }}
      />
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="22"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {percent}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(255,255,255,0.4)"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        ระดับคงเหลือ
      </text>
    </svg>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

export default function ManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'manager') {
      router.replace('/');
      return;
    }
    if (!authUser.station_id) {
      router.replace('/');
      return;
    }
    setUser(authUser);
  }, [router]);

  // Fetch station data
  useEffect(() => {
    if (!user?.station_id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStation(user.station_id)
      .then((data) => {
        if (!cancelled) setStation(data);
      })
      .catch(() => {
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลสถานีได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/');
  }, [router]);

  if (!user) return null;

  // Mock daily summary data
  const dailySales = 47_850;
  const dailyVolume = 3_215;
  const dailyCars = 189;

  const overallStatus = station?.status ?? 'high';

  return (
    <div className="own-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="own-header">
        <div className="own-header-left">
          {station && (
            <Image
              src={getBrandLogoUrl(station.brand_key)}
              alt={station.brand}
              width={60}
              height={60}
              className="own-brand-logo"
              unoptimized
            />
          )}
          <div className="own-header-info">
            <h1 className="own-station-name">
              {station?.name ?? 'กำลังโหลด...'}
            </h1>
            <span className="own-subtitle">ระบบจัดการสถานีบริการ</span>
          </div>
        </div>
        <div className="own-header-right">
          {station && (
            <span
              className="own-status-badge"
              style={{
                background: `${STATUS_COLOR[overallStatus]}18`,
                color: STATUS_COLOR[overallStatus],
                borderColor: `${STATUS_COLOR[overallStatus]}30`,
              }}
            >
              {STATUS_LABEL[overallStatus]}
            </span>
          )}
          <span className="own-user-name">{user.name}</span>
          <button className="own-logout-btn" onClick={handleLogout}>
            <LogOut size={15} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* ── Loading / Error ─────────────────────────────────────────────── */}
      {loading && (
        <div className="own-loading">
          <RefreshCw size={20} className="own-spin" />
          <span>กำลังโหลดข้อมูลสถานี...</span>
        </div>
      )}
      {error && <div className="own-error">{error}</div>}

      {station && !loading && (
        <div className="own-content">
          {/* ── Real-time Status Banner ──────────────────────────────────── */}
          <div className="own-status-banner">
            <div className="own-status-banner-left">
              <div className="own-status-indicator">
                <span
                  className="own-pulse-dot"
                  style={{ background: STATUS_COLOR[overallStatus] }}
                />
                <span
                  className="own-status-text"
                  style={{ color: STATUS_COLOR[overallStatus] }}
                >
                  {STATUS_LABEL[overallStatus]}
                </span>
              </div>
              <span className="own-last-updated">
                <Clock size={12} />
                อัปเดตล่าสุด: {formatTime(station.last_updated)}
              </span>
            </div>
            <Link
              href={`/staff/update?station_id=${station.id}`}
              className="own-update-action"
            >
              <RefreshCw size={14} />
              อัปเดตสถานะ
            </Link>
          </div>

          {/* ── Fuel Gauge Cards ─────────────────────────────────────────── */}
          <div className="own-fuel-row">
            {station.fuels.map((fuel) => {
              const pct = levelToPercent(fuel.status);
              const color = gaugeColor(pct);
              const accent = fuelColor(fuel.fuel_type);
              return (
                <div key={fuel.fuel_type} className="own-fuel-card">
                  <div className="own-fuel-card-header">
                    <span
                      className="own-fuel-dot"
                      style={{ background: accent }}
                    />
                    <span className="own-fuel-name">
                      {fuelLabel(fuel.fuel_type)}
                    </span>
                  </div>
                  <div className="own-gauge-wrap">
                    <FuelGauge percent={pct} color={color} />
                  </div>
                  <div className="own-fuel-stats">
                    <div className="own-fuel-stat-row">
                      <span className="own-fuel-stat-label">คงเหลือ</span>
                      <span className="own-fuel-stat-value">
                        {formatNumber(fuel.liters)}{' '}
                        <small>ลิตร</small>
                      </span>
                    </div>
                    <div className="own-fuel-stat-row">
                      <span className="own-fuel-stat-label">ราคา</span>
                      <span className="own-fuel-stat-value">
                        {fuel.price_per_liter.toFixed(2)}{' '}
                        <small>บาท/ลิตร</small>
                      </span>
                    </div>
                  </div>
                  <div
                    className="own-fuel-status-bar"
                    style={{
                      background: `${STATUS_COLOR[fuel.status]}14`,
                      color: STATUS_COLOR[fuel.status],
                    }}
                  >
                    {STATUS_LABEL[fuel.status]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Two-column Layout ────────────────────────────────────────── */}
          <div className="own-columns">
            {/* Left (60%) */}
            <div className="own-col-left">
              {/* Daily summary */}
              <div className="own-section-title">
                <TrendingUp size={16} />
                รายได้/ปริมาณวันนี้
              </div>
              <div className="own-daily-grid">
                <div className="own-daily-card">
                  <span className="own-daily-icon own-daily-icon-sales">
                    ฿
                  </span>
                  <div className="own-daily-info">
                    <span className="own-daily-label">ยอดขายวันนี้</span>
                    <span className="own-daily-value">
                      {formatNumber(dailySales)}
                    </span>
                    <span className="own-daily-unit">บาท</span>
                  </div>
                </div>
                <div className="own-daily-card">
                  <span className="own-daily-icon own-daily-icon-volume">
                    <Fuel size={18} />
                  </span>
                  <div className="own-daily-info">
                    <span className="own-daily-label">ปริมาณจ่ายรวม</span>
                    <span className="own-daily-value">
                      {formatNumber(dailyVolume)}
                    </span>
                    <span className="own-daily-unit">ลิตร</span>
                  </div>
                </div>
                <div className="own-daily-card">
                  <span className="own-daily-icon own-daily-icon-cars">
                    <Car size={18} />
                  </span>
                  <div className="own-daily-info">
                    <span className="own-daily-label">จำนวนรถ</span>
                    <span className="own-daily-value">
                      {formatNumber(dailyCars)}
                    </span>
                    <span className="own-daily-unit">คัน</span>
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="own-section-title own-section-title-mt">
                <Clock size={16} />
                ประวัติการอัปเดต
              </div>
              <div className="own-history-wrap">
                <StationHistory stationId={station.id} />
              </div>
            </div>

            {/* Right (40%) */}
            <div className="own-col-right">
              {/* Station details */}
              <div className="own-detail-card">
                <h3 className="own-detail-title">ข้อมูลสถานี</h3>
                <div className="own-detail-rows">
                  <div className="own-detail-row">
                    <span className="own-detail-label">แบรนด์</span>
                    <span className="own-detail-value">{station.brand}</span>
                  </div>
                  <div className="own-detail-row">
                    <span className="own-detail-label">ที่อยู่</span>
                    <span className="own-detail-value">{station.address}</span>
                  </div>
                  <div className="own-detail-row">
                    <span className="own-detail-label">อำเภอ</span>
                    <span className="own-detail-value">
                      {station.district_name}
                    </span>
                  </div>
                  <div className="own-detail-row">
                    <span className="own-detail-label">จังหวัด</span>
                    <span className="own-detail-value">
                      {station.province_name}
                    </span>
                  </div>
                  <div className="own-detail-row">
                    <span className="own-detail-label">พิกัด</span>
                    <span className="own-detail-value own-detail-coord">
                      {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
                      <button
                        type="button"
                        className="own-copy-btn"
                        title="คัดลอกพิกัด"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `${station.lat}, ${station.lng}`
                          )
                        }
                      >
                        <Copy size={11} />
                      </button>
                    </span>
                  </div>
                  <div className="own-detail-row">
                    <span className="own-detail-label">Station ID</span>
                    <span className="own-detail-value own-detail-mono">
                      #{station.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="own-quick-card">
                <h3 className="own-detail-title">ลิงก์ด่วน</h3>
                <div className="own-quick-links">
                  <Link
                    href={`/staff/update?station_id=${station.id}`}
                    className="own-quick-link own-quick-link-primary"
                  >
                    <RefreshCw size={16} />
                    อัปเดตสถานะน้ำมัน
                  </Link>
                  <Link href="/" className="own-quick-link">
                    <MapPin size={16} />
                    ดูบนแผนที่
                    <ExternalLink size={12} className="own-quick-ext" />
                  </Link>
                  <button
                    type="button"
                    className="own-quick-link"
                    onClick={() => {
                      alert('ฟีเจอร์ส่งออกรายงานจะเปิดให้ใช้งานเร็ว ๆ นี้');
                    }}
                  >
                    <FileBarChart size={16} />
                    ส่งออกรายงาน
                    <ExternalLink size={12} className="own-quick-ext" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
