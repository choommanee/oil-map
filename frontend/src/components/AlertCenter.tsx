'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getAlerts } from '@/lib/api';
import type { AlertCenterItem, ScopeMeta } from '@/lib/types';

interface AlertCenterProps {
  scope?: ScopeMeta;
}

export default function AlertCenter({ scope }: AlertCenterProps) {
  const [alerts, setAlerts] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAlerts()
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data.alerts].sort((a, b) => {
          if (a.severity === 'critical' && b.severity !== 'critical') return -1;
          if (a.severity !== 'critical' && b.severity === 'critical') return 1;
          return b.critical_percent - a.critical_percent;
        });
        // Filter by scope if province-level
        const filtered = scope?.province_slug
          ? sorted.filter((a) => a.province_slug === scope.province_slug)
          : sorted;
        setAlerts(filtered);
      })
      .catch(() => {
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลแจ้งเตือนได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [scope?.province_slug]);

  return (
    <div className="cmd-panel ac-panel">
      <div className="cmd-panel-head">
        <AlertTriangle size={14} />
        <h3 className="cmd-panel-title">ศูนย์แจ้งเตือน</h3>
      </div>

      <div className="ac-list">
        {loading && (
          <p className="ac-loading">กำลังโหลด...</p>
        )}

        {error && (
          <p className="ac-error">{error}</p>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="ac-ok">
            <ShieldCheck size={20} />
            <span>สถานการณ์ปกติ</span>
          </div>
        )}

        {!loading && !error && alerts.map((alert, i) => {
          const href = alert.district_slug
            ? `/province/${alert.province_slug}/district/${alert.district_slug}`
            : `/province/${alert.province_slug}`;

          return (
            <Link
              key={`${alert.province_slug}-${alert.district_slug ?? ''}-${i}`}
              href={href}
              className={`ac-item ac-${alert.severity}`}
            >
              <span className="ac-dot" />
              <div className="ac-body">
                <div className="ac-row-top">
                  <span className="ac-province">{alert.province_name}</span>
                  <span className={`ac-badge ac-badge-${alert.severity}`}>
                    {alert.severity === 'critical' ? 'วิกฤต' : 'เตือน'}
                  </span>
                </div>
                {alert.district_name && (
                  <span className="ac-district">{alert.district_name}</span>
                )}
                <div className="ac-stats">
                  <span className="ac-pct">{alert.critical_percent.toFixed(0)}% วิกฤต</span>
                  <span className="ac-sep">·</span>
                  <span className="ac-count">{alert.critical_stations}/{alert.total_stations} สถานี</span>
                </div>
                {alert.top_issues.length > 0 && (
                  <div className="ac-issues">
                    {alert.top_issues.slice(0, 2).map((issue, j) => (
                      <span key={j} className="ac-issue-chip">{issue}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
