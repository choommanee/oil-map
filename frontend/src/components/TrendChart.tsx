'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  // Compute trend summary
  const trend = days.length >= 2
    ? { first: days[0], last: days[days.length - 1] }
    : null;
  const outDelta = trend ? trend.last.out - trend.first.out : 0;

  // SVG line chart dimensions
  const W = 320;
  const H = 120;
  const PX = 36; // left padding for labels
  const PY = 12; // top/bottom padding

  function buildPath(values: number[], maxVal: number): string {
    if (values.length === 0) return '';
    const stepX = (W - PX - 8) / (values.length - 1);
    const scaleY = (H - PY * 2) / Math.max(maxVal, 1);
    return values.map((v, i) => {
      const x = PX + i * stepX;
      const y = H - PY - v * scaleY;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  function buildArea(values: number[], maxVal: number): string {
    const path = buildPath(values, maxVal);
    if (!path) return '';
    const stepX = (W - PX - 8) / (values.length - 1);
    const lastX = PX + (values.length - 1) * stepX;
    return `${path} L${lastX.toFixed(1)},${(H - PY).toFixed(1)} L${PX},${(H - PY).toFixed(1)} Z`;
  }

  const okVals = days.map((d) => d.ok);
  const lowVals = days.map((d) => d.low);
  const outVals = days.map((d) => d.out);
  const allMax = Math.max(...days.map((d) => Math.max(d.ok, d.low, d.out)), 1);

  // Y-axis ticks
  const yTicks = [0, Math.round(allMax / 2), allMax];
  const scaleY = (H - PY * 2) / Math.max(allMax, 1);

  return (
    <div className="cmd-panel tc-panel">
      <div className="cmd-panel-head">
        <TrendingUp size={14} />
        <h3 className="cmd-panel-title">เทรนด์ 7 วัน</h3>
        {trend && (
          <span className={`tc-trend-badge ${outDelta > 0 ? 'tc-trend-up' : outDelta < 0 ? 'tc-trend-down' : 'tc-trend-flat'}`}>
            {outDelta > 0 ? <TrendingUp size={11} /> : outDelta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {outDelta > 0 ? `+${outDelta}` : outDelta < 0 ? `${outDelta}` : '0'} หมด
          </span>
        )}
      </div>

      <div className="tc-body">
        {loading && <p className="tc-loading">กำลังโหลด...</p>}
        {error && <p className="tc-error">{error}</p>}

        {!loading && !error && days.length === 0 && (
          <p className="tc-empty">ไม่มีข้อมูลแนวโน้ม</p>
        )}

        {!loading && !error && days.length > 0 && (
          <>
            {/* Summary cards */}
            <div className="tc-summary">
              <div className="tc-sum-card tc-sum-ok">
                <span className="tc-sum-num">{days[days.length - 1].ok}</span>
                <span className="tc-sum-label">ปกติ</span>
              </div>
              <div className="tc-sum-card tc-sum-low">
                <span className="tc-sum-num">{days[days.length - 1].low}</span>
                <span className="tc-sum-label">ใกล้หมด</span>
              </div>
              <div className="tc-sum-card tc-sum-out">
                <span className="tc-sum-num">{days[days.length - 1].out}</span>
                <span className="tc-sum-label">หมด</span>
              </div>
            </div>

            {/* Line chart */}
            <div className="tc-chart-wrap">
              <svg className="tc-line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                {/* Grid lines + Y labels */}
                {yTicks.map((v) => {
                  const y = H - PY - v * scaleY;
                  return (
                    <g key={v}>
                      <line x1={PX} y1={y} x2={W - 4} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                      <text x={PX - 4} y={y + 3} textAnchor="end" className="tc-axis-label">{v}</text>
                    </g>
                  );
                })}

                {/* X labels */}
                {days.map((d, i) => {
                  const stepX = (W - PX - 8) / (days.length - 1);
                  const x = PX + i * stepX;
                  return (
                    <text key={d.date} x={x} y={H - 1} textAnchor="middle" className="tc-axis-label">
                      {formatDate(d.date)}
                    </text>
                  );
                })}

                {/* Out area fill (danger zone) */}
                <path d={buildArea(outVals, allMax)} fill="rgba(255,107,107,0.12)" />

                {/* Lines */}
                <path d={buildPath(okVals, allMax)} fill="none" stroke="#69f0ae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={buildPath(lowVals, allMax)} fill="none" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={buildPath(outVals, allMax)} fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots on last day */}
                {[
                  { vals: okVals, color: '#69f0ae' },
                  { vals: lowVals, color: '#ffd166' },
                  { vals: outVals, color: '#ff6b6b' },
                ].map(({ vals, color }) => {
                  if (vals.length === 0) return null;
                  const stepX = (W - PX - 8) / (vals.length - 1);
                  const x = PX + (vals.length - 1) * stepX;
                  const y = H - PY - vals[vals.length - 1] * scaleY;
                  return <circle key={color} cx={x} cy={y} r="3" fill={color} stroke="#0d1117" strokeWidth="1.5" />;
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="tc-legend">
              <span className="tc-legend-item"><span className="tc-legend-line" style={{ background: '#69f0ae' }} />ปกติ</span>
              <span className="tc-legend-item"><span className="tc-legend-line" style={{ background: '#ffd166' }} />ใกล้หมด</span>
              <span className="tc-legend-item"><span className="tc-legend-line" style={{ background: '#ff6b6b' }} />หมด</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
