'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Filter,
  LocateFixed,
  Map as MapIcon,
  MapPinned,
  ShieldAlert,
  Warehouse,
} from 'lucide-react';
import type { OverviewResponse } from '@/lib/types';

const regionLabels: Record<string, string> = {
  central: 'ภาคกลาง',
  north: 'ภาคเหนือ',
  northeast: 'อีสาน',
  south: 'ภาคใต้',
};

const regionIcons: Record<string, typeof MapPinned> = {
  central: LocateFixed,
  north: MapPinned,
  northeast: Warehouse,
  south: MapIcon,
};

interface ScopeNavigatorProps {
  overview: OverviewResponse;
}

export default function ScopeNavigator({ overview }: ScopeNavigatorProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const featuredByRegion = useMemo(() => {
    const grouped = new Map<string, string>();
    overview.featured_stations.forEach((station) => {
      if (!grouped.has(station.region)) {
        grouped.set(station.region, station.province_slug);
      }
    });
    return grouped;
  }, [overview.featured_stations]);

  return (
    <section className="panel compact-panel scope-panel-compact">
      <div className="panel-heading panel-heading-tight">
        <div>
          <p className="eyebrow">Navigator</p>
          <h3 className="panel-title">เลือกพื้นที่</h3>
        </div>
      </div>

      <div className="region-tabs region-tabs-compact">
        {overview.region_summaries.map((region) => {
          const href = featuredByRegion.get(region.region)
            ? `/province/${featuredByRegion.get(region.region)}`
            : '/';
          const active = selectedRegion === region.region;
          const RegionIcon = regionIcons[region.region] || MapPinned;

          return (
            <button
              key={region.region}
              type="button"
              className={`region-tab region-tab-compact ${active ? 'active' : ''}`}
              onClick={() => setSelectedRegion(region.region)}
            >
              <div className="region-tab-main">
                <span className="region-tab-label">
                  <RegionIcon size={14} />
                  {regionLabels[region.region] || region.region}
                </span>
                <span className="region-tab-meta">
                  <Warehouse size={12} />
                  {region.station_count}
                </span>
              </div>

              <div className="region-tab-trend">
                <span className="compact-meta-chip compact-meta-chip-warning">
                  <ShieldAlert size={12} />
                  {region.warning_count + region.critical_count}
                </span>
                <Link href={href} className="mini-link mini-link-compact" onClick={(event) => event.stopPropagation()}>
                  จังหวัดนำร่อง
                  <ChevronRight size={14} />
                </Link>
              </div>
            </button>
          );
        })}
      </div>

      {selectedRegion ? (
        <div className="scope-highlight scope-highlight-compact">
          <div className="scope-highlight-title">
            <span className="compact-meta-chip">
              <MapIcon size={12} />
              {regionLabels[selectedRegion] || selectedRegion}
            </span>
          </div>
          <div className="scope-highlight-actions">
            <Filter size={14} />
            โฟกัสบนแผนที่
          </div>
        </div>
      ) : null}
    </section>
  );
}