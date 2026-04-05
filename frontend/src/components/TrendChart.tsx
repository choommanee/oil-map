'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { getTrends } from '@/lib/api';
import type { TrendDay } from '@/lib/types';

interface TrendChartProps {
  provinceSlug?: string;
}

export default function TrendChart({ provinceSlug }: TrendChartProps) {
  const [days, setDays] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTrends(provinceSlug, 7)
      .then((data) => {
        if (!cancelled) setDays(data.days);
      })
      .catch(() => {
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลแนวโน้มได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [provinceSlug]);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="cmd-panel tc-panel">
      <div className="cmd-panel-head">
        <TrendingUp size={14} />
        <h3 className="cmd-panel-title">แนวโน้ม 7 วัน</h3>
      </div>

      <div className="tc-body">
        {loading && <p className="tc-loading">กำลังโหลด...</p>}
        {error && <p className="tc-error">{error}</p>}

        {!loading && !error && days.length === 0 && (
          <p className="tc-empty">ไม่มีข้อมูลแนวโน้ม</p>
        )}

        {!loading && !error && days.length > 0 && (
          <div className="tc-chart">
            {days.map((day) => {
              const total = day.ok + day.low + day.out + day.refilling;
              if (total === 0) return null;
              const pOk = (day.ok / total) * 100;
              const pLow = (day.low / total) * 100;
              const pOut = (day.out / total) * 100;
              const pRefilling = (day.refilling / total) * 100;

              return (
                <div key={day.date} className="tc-row">
                  <span className="tc-date">{formatDate(day.date)}</span>
                  <div className="tc-bar-wrap">
                    <svg className="tc-bar" viewBox="0 0 200 12" preserveAspectRatio="none">
                      <rect x="0" y="0" width={pOk * 2} height="12" fill="#69f0ae" rx="1" />
                      <rect x={pOk * 2} y="0" width={pLow * 2} height="12" fill="#ffd166" rx="1" />
                      <rect x={(pOk + pLow) * 2} y="0" width={pOut * 2} height="12" fill="#ff6b6b" rx="1" />
                      <rect x={(pOk + pLow + pOut) * 2} y="0" width={pRefilling * 2} height="12" fill="#41d6e8" rx="1" />
                    </svg>
                  </div>
                </div>
              );
            })}
            <div className="tc-legend">
              <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#69f0ae' }} />ปกติ</span>
              <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#ffd166' }} />ต่ำ</span>
              <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#ff6b6b' }} />หมด</span>
              <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#41d6e8' }} />เติม</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
