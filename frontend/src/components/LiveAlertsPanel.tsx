import Link from 'next/link';
import { BellRing, ChevronRight } from 'lucide-react';
import type { AlertItem } from '@/lib/types';

interface LiveAlertsPanelProps {
  alerts: AlertItem[];
}

export default function LiveAlertsPanel({ alerts }: LiveAlertsPanelProps) {
  return (
    <section className="panel intel-panel compact-panel">
      <div className="panel-heading panel-heading-tight">
        <div>
          <p className="eyebrow">Live Alerts</p>
          <h3 className="panel-title">สถานีที่ต้องเฝ้าระวัง</h3>
        </div>
        <BellRing size={16} className="text-accent" />
      </div>

      <div className="stack-list stack-list-dense">
        {alerts.map((alert) => {
          const href = alert.province_slug
            ? alert.district_slug
              ? `/province/${alert.province_slug}/district/${alert.district_slug}`
              : `/province/${alert.province_slug}`
            : '/';

          return (
            <article key={String(alert.id)} className={`alert-card alert-card-compact tone-${alert.severity}`}>
              <div className="alert-card-head">
                <strong>{alert.title}</strong>
                <span className={`status-pill tone-${alert.severity}`}>{alert.severity}</span>
              </div>
              <p>{alert.message}</p>
              <div className="alert-card-footer">
                <span>{alert.updated_at ? new Date(alert.updated_at).toLocaleString('th-TH') : 'สดล่าสุด'}</span>
                <Link href={href} className="mini-link">
                  เปิดพื้นที่
                  <ChevronRight size={14} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}