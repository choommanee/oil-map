'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import { getFuelMeta } from '@/lib/fuelTypes';
import type { FeedItem, ScopeMeta } from '@/lib/types';

// Known brand prefixes to strip from station names
const BRAND_KEYS = ['PTT', 'SHELL', 'BANGCHAK', 'CALTEX', 'IRPC', 'PT', 'SUSCO', 'PURE', 'ESSO'];

function splitBrandFromName(stationName: string, brand?: string): { prefix: string | null; rest: string } {
  const candidates = brand
    ? [brand, ...BRAND_KEYS]
    : BRAND_KEYS;
  for (const b of candidates) {
    const pattern = new RegExp(`^(${b})\\s+`, 'i');
    const m = pattern.exec(stationName);
    if (m) {
      return { prefix: m[1], rest: stationName.slice(m[0].length) };
    }
  }
  return { prefix: null, rest: stationName };
}

interface FieldReportsFeedProps {
  feed: FeedItem[];
  scope?: ScopeMeta;
}

const STATUS_LABEL: Record<string, string> = {
  danger: 'วิกฤต',
  warning: 'เตือน',
  normal: 'ปกติ',
};

export default function FieldReportsFeed({ feed, scope }: FieldReportsFeedProps) {
  // Auto-filter by province when scope is province-level
  const filteredFeed = useMemo(
    () => scope?.province_slug
      ? feed.filter((f) => !f.province_slug || f.province_slug === scope.province_slug)
      : feed,
    [feed, scope?.province_slug],
  );

  const [items, setItems] = useState<FeedItem[]>(filteredFeed);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set(filteredFeed.map((f) => f.id)));

  useEffect(() => {
    const incoming = filteredFeed;
    const fresh = incoming.filter((f) => !prevIds.current.has(f.id)).map((f) => f.id);
    if (fresh.length > 0) {
      setNewIds(new Set(fresh));
      setTimeout(() => setNewIds(new Set()), 2000);
    }
    prevIds.current = new Set(incoming.map((f) => f.id));
    setItems(incoming);
  }, [filteredFeed]);

  const scopeLabel = scope?.province_name ?? scope?.province_slug?.replace(/-/g, ' ');

  return (
    <div className="cmd-panel fr-panel">
      <div className="cmd-panel-head">
        <Radio size={14} />
        <h3 className="cmd-panel-title">รายงานจากสนาม</h3>
        {scopeLabel ? (
          <span className="fr-scope-chip">{scopeLabel}</span>
        ) : (
          <span className="fr-live-chip">● LIVE</span>
        )}
      </div>
      <div className="fr-list">
        {items.slice(0, 9).map((item) => (
          <div
            key={item.id}
            className={`fr-item fr-${item.status}${newIds.has(item.id) ? ' fr-flash' : ''}`}
          >
            <span className="fr-dot" />
            <div className="fr-body">
              <div className="fr-row">
                <span className="fr-station">
                  {(() => {
                    const { prefix, rest } = splitBrandFromName(item.station_name, item.brand);
                    if (prefix) {
                      return (
                        <>
                          <span className="fr-station-logo-wrap" title={prefix}>
                            <img
                              src={getBrandLogoUrl(prefix)}
                              alt={prefix}
                              className="fr-station-logo"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brands/fallback.svg'; }}
                            />
                          </span>
                          {rest}
                        </>
                      );
                    }
                    return item.station_name;
                  })()}
                </span>
                <span className="fr-time">
                  {new Date(item.updated_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="fr-msg-row">
                {item.fuel_type && (() => {
                  const fm = getFuelMeta(item.fuel_type);
                  return (
                    <span className="fr-fuel-chip" style={{ '--fuel-color': fm.color } as React.CSSProperties}>
                      {fm.abbr}
                    </span>
                  );
                })()}
                <p className="fr-msg">{item.message}</p>
              </div>
              {(item.updated_by || (item.province_slug && !scope?.province_slug)) && (
                <div className="fr-sub">
                  {item.updated_by && (
                    <span className="fr-reporter">
                      <span className="fr-reporter-dot" />
                      {item.updated_by}
                    </span>
                  )}
                  {item.updated_by && item.province_slug && !scope?.province_slug && (
                    <span className="fr-sep">·</span>
                  )}
                  {item.province_slug && !scope?.province_slug && (
                    <span className="fr-province">
                      {item.province_slug.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className={`fr-badge fr-badge-${item.status}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="fr-empty">
            {scopeLabel ? `ไม่มีรายงานใหม่ใน${scopeLabel}` : 'ไม่มีรายงานใหม่'}
          </p>
        )}
      </div>
    </div>
  );
}
