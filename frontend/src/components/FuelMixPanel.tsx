import type { FuelMixItem } from '@/lib/types';

interface FuelMixPanelProps {
  items: FuelMixItem[];
}

export default function FuelMixPanel({ items }: FuelMixPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Fuel Mix</p>
          <h3 className="panel-title">ประเภทเชื้อเพลิงคงคลัง</h3>
        </div>
      </div>

      <div className="stack-list">
        {items.map((item) => (
          <article key={item.fuel_type} className="list-card">
            <div className="list-card-head">
              <strong>{item.fuel_type}</strong>
              <span>{item.available_percent}% พร้อมจ่าย</span>
            </div>
            <div className="progress-rail">
              <div
                className={`progress-fill ${item.available_percent < 30 ? 'tone-danger' : item.available_percent < 60 ? 'tone-warning' : 'tone-success'}`}
                style={{ width: `${item.available_percent}%` }}
              />
            </div>
            <p className="subtle-text">{item.station_count} สถานีที่มีเชื้อเพลิงชนิดนี้พร้อมให้บริการ</p>
          </article>
        ))}
      </div>
    </section>
  );
}