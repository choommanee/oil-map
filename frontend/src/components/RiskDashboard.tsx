import type { RegionSummary } from '@/lib/types';

interface RiskDashboardProps {
  regions: RegionSummary[];
}

const regionLabels: Record<string, string> = {
  central: 'ภาคกลาง',
  north: 'ภาคเหนือ',
  northeast: 'ภาคตะวันออกเฉียงเหนือ',
  south: 'ภาคใต้',
};

function getRiskTone(summary: RegionSummary) {
  if (summary.critical_count > 0) {
    return 'danger';
  }

  if (summary.warning_count > 0) {
    return 'warning';
  }

  return 'success';
}

export default function RiskDashboard({ regions }: RiskDashboardProps) {
  return (
    <section className="panel intel-panel compact-panel">
      <div className="panel-heading panel-heading-tight">
        <div>
          <p className="eyebrow">Regional Risk</p>
          <h3 className="panel-title">วิเคราะห์ความเสี่ยงรายภูมิภาค</h3>
        </div>
      </div>

      <div className="risk-grid risk-grid-compact">
        {regions.map((summary) => {
          const tone = getRiskTone(summary);

          return (
            <article key={summary.region} className="risk-card">
              <div className="risk-card-header">
                <span className="eyebrow">{regionLabels[summary.region] || summary.region}</span>
                <span className={`status-pill tone-${tone}`}>
                  {tone === 'danger' ? 'วิกฤต' : tone === 'warning' ? 'เฝ้าระวัง' : 'เสถียร'}
                </span>
              </div>

              <div className="risk-value">{summary.healthy_percent}%</div>

              <div className="progress-rail">
                <div className={`progress-fill tone-${tone}`} style={{ width: `${summary.healthy_percent}%` }} />
              </div>

              <div className="risk-meta">
                <span>{summary.station_count} สถานี</span>
                <span>เตือน {summary.warning_count}</span>
                <span>วิกฤต {summary.critical_count}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}