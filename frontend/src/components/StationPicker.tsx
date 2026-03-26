'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Fuel, MapPin, Search, X } from 'lucide-react';
import { getMap } from '@/lib/api';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import type { Station } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  high:      { label: 'ปกติ',        cls: 'sp-s-high' },
  medium:    { label: 'พอใช้',       cls: 'sp-s-medium' },
  low:       { label: 'ใกล้หมด',     cls: 'sp-s-low' },
  out:       { label: 'หมด',         cls: 'sp-s-out' },
  refilling: { label: 'กำลังเติม',   cls: 'sp-s-refilling' },
};

export default function StationPicker() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMap({})
      .then((r) => setStations(r.stations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.province_name.toLowerCase().includes(q) ||
        s.district_name.toLowerCase().includes(q),
    );
  }, [stations, query]);

  function handleSelect(station: Station) {
    router.push(`/staff/update?station_id=${station.id}&name=${encodeURIComponent(station.name)}`);
  }

  return (
    <div className="sp-shell">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-header-icon"><Fuel size={18} /></div>
        <div>
          <p className="sp-kicker">เจ้าหน้าที่ปั้มน้ำมัน</p>
          <h2 className="sp-title">เลือกสถานีที่จะบันทึกข้อมูล</h2>
        </div>
      </div>

      {/* Search box */}
      <div className="sp-search-wrap">
        <Search size={14} className="sp-search-icon" />
        <input
          className="sp-search-input"
          type="text"
          placeholder="ค้นหาสถานี ชื่อ / แบรนด์ / จังหวัด / อำเภอ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button type="button" className="sp-search-clear" onClick={() => setQuery('')}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Station list */}
      <div className="sp-list">
        {loading && (
          <div className="sp-empty">
            <span className="sp-loading-dot" />
            <span>กำลังโหลดรายชื่อสถานี...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="sp-empty">
            <Search size={22} style={{ opacity: 0.3 }} />
            <span>ไม่พบสถานีที่ตรงกับ &ldquo;{query}&rdquo;</span>
          </div>
        )}

        {!loading && filtered.map((station) => {
          const s = STATUS_LABEL[station.status] ?? { label: station.status, cls: '' };
          return (
            <button
              key={station.id}
              type="button"
              className="sp-item"
              onClick={() => handleSelect(station)}
            >
              <div className="sp-item-logo">
                <Image
                  src={getBrandLogoUrl(station.brand)}
                  alt={station.brand}
                  width={32}
                  height={32}
                  unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="sp-item-body">
                <span className="sp-item-name">{station.name}</span>
                <span className="sp-item-loc">
                  <MapPin size={10} />
                  {station.district_name} · {station.province_name}
                </span>
              </div>
              <div className="sp-item-right">
                <span className={`sp-status-badge ${s.cls}`}>{s.label}</span>
                <span className="sp-item-id">#{station.id}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && stations.length > 0 && (
        <p className="sp-count">{filtered.length} / {stations.length} สถานี</p>
      )}
    </div>
  );
}
