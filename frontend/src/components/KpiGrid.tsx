import { Activity, AlertTriangle, Gauge, MapPinned, type LucideIcon } from 'lucide-react';
import type { OverviewKpi } from '@/lib/types';

interface KpiGridProps {
  items: OverviewKpi[];
}

const keywordIconMap: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /เตือน|เสี่ยง|วิกฤต|critical|danger/i, icon: AlertTriangle },
  { pattern: /ครอบคลุม|พื้นที่|จังหวัด|อำเภอ|region|map|scope/i, icon: MapPinned },
  { pattern: /พร้อม|ปกติ|healthy|status|coverage/i, icon: Activity },
];

function getKpiIcon(label: string, helper?: string) {
  const text = `${label} ${helper ?? ''}`;

  return keywordIconMap.find(({ pattern }) => pattern.test(text))?.icon ?? Gauge;
}

export default function KpiGrid({ items }: KpiGridProps) {
  return (
    <section className="kpi-grid kpi-strip">
      {items.map((item) => {
        const Icon = getKpiIcon(item.label, item.helper);

        return (
          <article key={item.label} className={`metric-card metric-card-compact tone-${item.tone || 'neutral'}`}>
            <div className="metric-card-head">
              <span className="metric-icon">
                <Icon size={14} />
              </span>
              <span className="metric-label">{item.label}</span>
            </div>
            <div className="metric-value">{item.value}</div>
            {item.helper ? <p className="metric-helper">{item.helper}</p> : null}
          </article>
        );
      })}
    </section>
  );
}