import React from 'react';

interface RiskStat {
  region: string;
  status: 'normal' | 'warning' | 'danger';
  percentage: number;
}

const riskStats: RiskStat[] = [
  { region: 'ภาคกลาง', status: 'normal', percentage: 85 },
  { region: 'ภาคอีสาน', status: 'warning', percentage: 45 },
  { region: 'ภาคเหนือ', status: 'normal', percentage: 72 },
  { region: 'ภาคใต้', status: 'danger', percentage: 12 },
];

export default function RiskDashboard() {
  return (
    <div className="risk-dashboard">
      <h2 className="label" style={{ marginBottom: '16px' }}>วิเคราะห์ความเสี่ยงรายภูมิภาค</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {riskStats.map((stat) => (
          <div key={stat.region} className="card">
            <p className="label">{stat.region}</p>
            <p className={`value status-${stat.status}`}>
              {stat.status === 'normal' ? 'ปกติ' : stat.status === 'warning' ? 'เฝ้าระวัง' : 'วิกฤต'}
            </p>
            <div style={{ 
              height: '4px', 
              background: '#30363d', 
              marginTop: '8px',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${stat.percentage}%`, 
                height: '100%', 
                background: `var(--${stat.status === 'normal' ? 'success' : stat.status === 'warning' ? 'warning' : 'danger'}-color)` 
              }}></div>
            </div>
            <p style={{ fontSize: '10px', marginTop: '4px', textAlign: 'right', color: '#8b949e' }}>
              ระดับน้ำมันเฉลี่ย: {stat.percentage}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
