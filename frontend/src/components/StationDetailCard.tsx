import Image from 'next/image';
import {
  Activity,
  Fuel,
  Gauge,
  MapPinned,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { FuelLevel, Station } from '@/lib/types';

interface StationDetailCardProps {
  station: Station | null;
}

const statusMeta: Record<FuelLevel, { label: string; tone: 'success' | 'warning' | 'danger' | 'info'; icon: typeof ShieldCheck }> = {
  high: { label: 'ปกติ', tone: 'success', icon: ShieldCheck },
  medium: { label: 'เฝ้าระวัง', tone: 'warning', icon: Activity },
  low: { label: 'ต่ำ', tone: 'warning', icon: ShieldAlert },
  out: { label: 'หมด', tone: 'danger', icon: ShieldAlert },
  refilling: { label: 'เติมอยู่', tone: 'info', icon: Wrench },
};

export default function StationDetailCard({ station }: StationDetailCardProps) {
  if (!station) {
    return (
      <section className="panel station-detail-empty compact-panel">
        <p className="eyebrow">Station Detail</p>
        <h3 className="panel-title">เลือกสถานีจากแผนที่หรือรายการ</h3>
      </section>
    );
  }

  const stationStatus = statusMeta[station.status] || statusMeta.high;

  return (
    <section className="panel station-detail-card compact-panel">
      <div className="station-detail-header station-detail-header-compact">
        <div className="station-row-brand">
          <Image
            src={getBrandLogoUrl(station.brand) || '/brands/default.svg'}
            alt={station.brand}
            width={38}
            height={38}
            className="brand-logo"
            unoptimized
          />
          <div>
            <p className="eyebrow">Station</p>
            <h3 className="panel-title">{station.name}</h3>
          </div>
        </div>
        <span className={`status-pill tone-${stationStatus.tone}`}>
          <stationStatus.icon size={12} />
          {stationStatus.label}
        </span>
      </div>

      <div className="station-detail-location">
        <span className="compact-meta-chip">
          <MapPinned size={12} />
          {station.region}
        </span>
        <span className="compact-meta-chip">
          <MapPin size={12} />
          {station.district_name}, {station.province_name}
        </span>
      </div>

      <p className="subtle-text station-detail-address">{station.address || `${station.district_name}, ${station.province_name}`}</p>

      <div className="fuel-chip-grid fuel-chip-grid-compact">
        {station.fuels.map((fuel) => {
          const fuelStatus = statusMeta[fuel.status] || statusMeta.high;

          return (
            <div key={fuel.fuel_type} className="fuel-chip fuel-chip-compact">
              <div className="fuel-chip-topline">
                <span className="fuel-chip-label">
                  <Fuel size={12} />
                  {fuel.fuel_type}
                </span>
                <small className={`status-pill status-pill-inline tone-${fuelStatus.tone}`}>
                  <fuelStatus.icon size={11} />
                  {fuelStatus.label}
                </small>
              </div>
              <strong className="fuel-chip-value">
                <Gauge size={12} />
                {fuel.liters.toLocaleString()} L
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
