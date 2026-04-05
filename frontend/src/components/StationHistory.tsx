'use client';

import { useEffect, useState } from 'react';
import { Clock, User } from 'lucide-react';
import { getStationHistory } from '@/lib/api';
import type { HistoryEntry } from '@/lib/types';

interface StationHistoryProps {
  stationId: number;
}

const LEVEL_COLOR: Record<string, string> = {
  high: '#69f0ae',
  medium: '#69f0ae',
  low: '#ffd166',
  out: '#ff6b6b',
  refilling: '#41d6e8',
};

const LEVEL_LABEL: Record<string, string> = {
  high: 'ปกติ',
  medium: 'ปานกลาง',
  low: 'ต่ำ',
  out: 'หมด',
  refilling: 'กำลังเติม',
};

export default function StationHistory({ stationId }: StationHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stationName, setStationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStationHistory(stationId)
      .then((data) => {
        if (cancelled) return;
        setHistory(data.history);
        setStationName(data.station_name);
      })
      .catch(() => {
        if (!cancelled) setError('ไม่สามารถโหลดประวัติได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [stationId]);

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="cmd-panel sh-panel">
      <div className="cmd-panel-head">
        <Clock size={14} />
        <h3 className="cmd-panel-title">ประวัติการอัปเดต</h3>
      </div>

      {stationName && <p className="sh-station-name">{stationName}</p>}

      <div className="sh-timeline">
        {loading && <p className="sh-loading">กำลังโหลด...</p>}
        {error && <p className="sh-error">{error}</p>}

        {!loading && !error && history.length === 0 && (
          <p className="sh-empty">ยังไม่มีประวัติการอัปเดต</p>
        )}

        {!loading && !error && history.map((entry, i) => (
          <div key={i} className="sh-entry">
            <div className="sh-line-track">
              <span className="sh-node" />
              {i < history.length - 1 && <span className="sh-connector" />}
            </div>
            <div className="sh-content">
              <div className="sh-row-top">
                <span className="sh-fuel-type">{entry.fuel_type}</span>
                <span className="sh-time">{formatTime(entry.updated_at)}</span>
              </div>
              <div className="sh-change">
                <span className="sh-level" style={{ color: LEVEL_COLOR[entry.old_level] ?? '#d9e6f2' }}>
                  {LEVEL_LABEL[entry.old_level] ?? entry.old_level}
                </span>
                <span className="sh-arrow">→</span>
                <span className="sh-level" style={{ color: LEVEL_COLOR[entry.new_level] ?? '#d9e6f2' }}>
                  {LEVEL_LABEL[entry.new_level] ?? entry.new_level}
                </span>
              </div>
              <div className="sh-who">
                <User size={11} />
                <span>{entry.updated_by}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
