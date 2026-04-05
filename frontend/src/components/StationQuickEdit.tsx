'use client';

import { useState } from 'react';
import { Edit3, X, Check, Loader2 } from 'lucide-react';
import { updateStationFuel } from '@/lib/api';
import type { FuelLevel, Station } from '@/lib/types';

interface StationQuickEditProps {
  station: Station;
  onClose: () => void;
  onUpdate?: () => void;
}

const LEVEL_OPTIONS: { value: FuelLevel; label: string }[] = [
  { value: 'high', label: 'ปกติ (High)' },
  { value: 'medium', label: 'ปานกลาง (Medium)' },
  { value: 'low', label: 'ต่ำ (Low)' },
  { value: 'out', label: 'หมด (Out)' },
  { value: 'refilling', label: 'กำลังเติม (Refilling)' },
];

const LEVEL_COLOR: Record<string, string> = {
  high: '#69f0ae',
  medium: '#69f0ae',
  low: '#ffd166',
  out: '#ff6b6b',
  refilling: '#41d6e8',
};

export default function StationQuickEdit({ station, onClose, onUpdate }: StationQuickEditProps) {
  const [levels, setLevels] = useState<Record<string, FuelLevel>>(
    Object.fromEntries(station.fuels.map((f) => [f.fuel_type, f.status])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function handleLevelChange(fuelType: string, level: FuelLevel) {
    setLevels((prev) => ({ ...prev, [fuelType]: level }));
    setResult(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);

    try {
      for (const fuel of station.fuels) {
        const newLevel = levels[fuel.fuel_type];
        if (newLevel && newLevel !== fuel.status) {
          await updateStationFuel(station.id, {
            fuel_type: fuel.fuel_type,
            inventory_level: newLevel,
            price_per_liter: fuel.price_per_liter,
          });
        }
      }
      setResult({ type: 'success', message: 'อัปเดตสำเร็จ' });
      onUpdate?.();
    } catch {
      setResult({ type: 'error', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setSubmitting(false);
    }
  }

  const hasChanges = station.fuels.some((f) => levels[f.fuel_type] !== f.status);

  return (
    <div className="sqe-overlay">
      <div className="sqe-panel">
        <div className="sqe-header">
          <Edit3 size={14} />
          <h3 className="sqe-title">แก้ไขสถานะเชื้อเพลิง</h3>
          <button className="sqe-close" onClick={onClose} aria-label="ปิด">
            <X size={16} />
          </button>
        </div>

        <p className="sqe-station-name">{station.name}</p>

        <div className="sqe-fuel-list">
          {station.fuels.map((fuel) => (
            <div key={fuel.fuel_type} className="sqe-fuel-row">
              <span
                className="sqe-fuel-label"
                style={{ color: LEVEL_COLOR[levels[fuel.fuel_type]] ?? '#d9e6f2' }}
              >
                {fuel.fuel_type}
              </span>
              <select
                className="sqe-select"
                value={levels[fuel.fuel_type] ?? fuel.status}
                onChange={(e) => handleLevelChange(fuel.fuel_type, e.target.value as FuelLevel)}
                disabled={submitting}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {result && (
          <div className={`sqe-result sqe-result-${result.type}`}>
            {result.type === 'success' ? <Check size={14} /> : null}
            <span>{result.message}</span>
          </div>
        )}

        <div className="sqe-actions">
          <button className="sqe-btn sqe-btn-cancel" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </button>
          <button
            className="sqe-btn sqe-btn-submit"
            onClick={handleSubmit}
            disabled={submitting || !hasChanges}
          >
            {submitting ? <Loader2 size={14} className="sqe-spin" /> : null}
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
