'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle, Home, RefreshCw, Send } from 'lucide-react';
import { updateStationFuel } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
import type { FuelLevel } from '@/lib/types';

const FUEL_TYPES: { key: string; label: string; color: string }[] = [
  { key: 'diesel_b7',       label: 'ดีเซล B7',         color: '#ffd166' },
  { key: 'gasohol_95',      label: 'แก๊สโซฮอล์ 95',    color: '#69f0ae' },
  { key: 'gasohol_91',      label: 'แก๊สโซฮอล์ 91',    color: '#67a6ff' },
  { key: 'e20',             label: 'E20',               color: '#ff9d43' },
  { key: 'premium_diesel',  label: 'ดีเซล พรีเมียม',   color: '#41d6e8' },
];

const STATUS_OPTIONS: { key: FuelLevel; label: string; sub: string }[] = [
  { key: 'high',       label: 'มีน้ำมัน',    sub: '> 60%'    },
  { key: 'medium',     label: 'ปานกลาง',    sub: '40–60%'   },
  { key: 'low',        label: 'ใกล้หมด',    sub: '10–40%'   },
  { key: 'out',        label: 'หมด',        sub: '< 10%'    },
  { key: 'refilling',  label: 'กำลังเติม',  sub: 'Refill'   },
];

interface FuelStatusEditorProps {
  stationId: number;
  stationName?: string;
}

interface FuelEntry {
  status: FuelLevel;
  price: string;
}

const DEFAULT_ENTRY: FuelEntry = { status: 'high', price: '32.90' };

export default function FuelStatusEditor({ stationId, stationName }: FuelStatusEditorProps) {
  const [entries, setEntries] = useState<Record<string, FuelEntry>>(
    Object.fromEntries(FUEL_TYPES.map((f) => [f.key, { ...DEFAULT_ENTRY }])),
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function setStatus(fuelKey: string, status: FuelLevel) {
    setEntries((prev) => ({ ...prev, [fuelKey]: { ...prev[fuelKey], status } }));
  }

  function setPrice(fuelKey: string, value: string) {
    setEntries((prev) => ({ ...prev, [fuelKey]: { ...prev[fuelKey], price: value } }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      for (const fuel of FUEL_TYPES) {
        const entry = entries[fuel.key];
        await updateStationFuel(stationId, {
          fuel_type: fuel.key,
          inventory_level: entry.status,
          price_per_liter: Number(entry.price) || 0,
          note,
        });
      }
      setResult({ ok: true, msg: 'อัปเดตข้อมูลสำเร็จ ✓' });
    } catch {
      setResult({ ok: false, msg: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="staff-editor" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="staff-editor-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {(() => {
              const u = getAuthUser();
              const backHref = u?.role === 'admin' ? '/admin'
                : u?.role === 'province_manager' ? '/manager'
                : u?.station_id ? '/staff/my-station'
                : '/staff/update';
              const backLabel = u?.station_id ? 'กลับหน้าสถานี' : 'เปลี่ยนสถานี';
              return (
                <>
                  <Link href={backHref} className="staff-back-btn">
                    <ArrowLeft size={12} />
                    {backLabel}
                  </Link>
                  <Link href="/" className="staff-back-btn">
                    <Home size={12} />
                    แผนที่
                  </Link>
                </>
              );
            })()}
          </div>
          <p className="staff-editor-kicker">อัปเดตสถานะน้ำมัน</p>
          <h2 className="staff-editor-title">
            {stationName ?? `สถานีบริการ #${stationId}`}
          </h2>
          <p className="staff-editor-meta">รหัสสถานี: #{stationId} · อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
        </div>
        <div className="staff-editor-live">
          <span className="cmd-live-dot" />
          <span>เปิดให้บริการ</span>
        </div>
      </div>

      {/* Fuel sections */}
      <div className="staff-fuel-list">
        {FUEL_TYPES.map((fuel) => {
          const entry = entries[fuel.key];
          return (
            <div key={fuel.key} className="staff-fuel-row">
              <div className="staff-fuel-head">
                <div className="staff-fuel-dot" style={{ background: fuel.color }} />
                <span className="staff-fuel-name">{fuel.label}</span>
                <span className={`staff-fuel-current status-${entry.status}`}>
                  {entry.status === 'high' ? 'มีน้ำมัน' : entry.status === 'medium' ? 'ปานกลาง' : entry.status === 'low' ? 'ใกล้หมด' : entry.status === 'out' ? 'หมด' : entry.status === 'refilling' ? 'กำลังเติม' : entry.status}
                </span>
              </div>

              {/* Status toggle */}
              <div className="staff-status-row">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStatus(fuel.key, opt.key)}
                    className={`staff-status-btn ${entry.status === opt.key ? `active-${opt.key}` : ''}`}
                  >
                    <span className="staff-status-btn-label">{opt.label}</span>
                    <span className="staff-status-btn-sub">{opt.sub}</span>
                  </button>
                ))}
              </div>

              {/* Price input only */}
              <div className="staff-fuel-inputs">
                <label className="staff-input-wrap">
                  <span className="staff-input-label">ราคา (บาท/ล.)</span>
                  <input
                    className="staff-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.price}
                    onChange={(e) => setPrice(fuel.key, e.target.value)}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <label className="staff-note-wrap">
        <span className="staff-input-label">
          <AlertTriangle size={12} />
          รายงานปัญหาเร่งด่วน (ถ้ามี)
        </span>
        <textarea
          className="staff-textarea"
          value={note}
          rows={2}
          placeholder="เช่น ปั๊มขัดข้อง, รถน้ำมันล่าช้า..."
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {/* Submit — minimal icon button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="submit"
          className="staff-submit-btn-icon"
          disabled={submitting}
          title={submitting ? 'กำลังส่ง...' : 'บันทึก'}
          aria-label={submitting ? 'กำลังส่ง...' : 'บันทึก'}
        >
          {submitting
            ? <RefreshCw size={14} className="cmd-map-loading-icon" />
            : <Send size={14} />}
        </button>
        <span className="staff-submit-label">
          {submitting ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
        </span>
      </div>

      {result && (
        <div className={`staff-result ${result.ok ? 'staff-result-ok' : 'staff-result-err'}`}>
          {result.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          <span>{result.msg}</span>
        </div>
      )}
    </form>
  );
}
