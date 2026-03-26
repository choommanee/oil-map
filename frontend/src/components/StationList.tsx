import Image from 'next/image';
import { MapPin, Clock3 } from 'lucide-react';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { Station } from '@/lib/types';

interface StationListProps {
  title: string;
  stations: Station[];
  onSelect?: (station: Station) => void;
}

export default function StationList({ title, stations, onSelect }: StationListProps) {
  return (
    <section className="panel intel-panel compact-panel">
      <div className="panel-heading panel-heading-tight">
        <div>
          <p className="eyebrow">Station Watchlist</p>
          <h3 className="panel-title">{title}</h3>
        </div>
        <span className="subtle-text">{stations.length} items</span>
      </div>

      <div className="stack-list stack-list-dense">
        {stations.map((station) => (
          <button key={station.id} type="button" className="station-row station-row-compact" onClick={() => onSelect?.(station)}>
            <div className="station-row-brand">
              <Image
                src={getBrandLogoUrl(station.brand) || '/brands/default.svg'}
                alt={station.brand}
                width={34}
                height={34}
                className="brand-logo"
                unoptimized
              />
              <div>
                <strong>{station.name}</strong>
                <p>{station.brand} • {station.province_name}</p>
              </div>
            </div>
            <div className="station-row-meta">
              <span><MapPin size={13} /> {station.district_name}</span>
              <span><Clock3 size={13} /> {station.last_updated ? new Date(station.last_updated).toLocaleTimeString('th-TH') : 'ล่าสุด'}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
