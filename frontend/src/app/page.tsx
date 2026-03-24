import DashboardMap from '@/components/DashboardMap';
import RiskDashboard from '@/components/RiskDashboard';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/DashboardMap'), { 
  ssr: false,
  loading: () => <div className="map-loading">Loading Map...</div>
});

export default function Home() {
  return (
    <main className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⛽</span>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>ศูนย์บัญชาการสถานการณ์น้ำมันระดับประเทศ</h1>
        </div>
        <div style={{ color: '#8b949e' }}>
          LIVE: {new Date().toLocaleTimeString()} | 24 มี.ค. 2569
        </div>
      </header>

      {/* Sidebar - Regional Analysis */}
      <aside className="sidebar">
        <RiskDashboard />

        <div style={{ marginTop: '20px' }} />

        <div>
          <h2 className="label">ประเภทน้ำมันคงคลัง</h2>
          <div className="card">
            <p className="label">แก๊สโซฮอล์ 95</p>
            <div style={{ height: '4px', background: '#30363d', marginTop: '8px' }}>
              <div style={{ width: '70%', height: '100%', background: 'var(--success-color)' }}></div>
            </div>
          </div>
          <div className="card">
            <p className="label">ดีเซล B7</p>
            <div style={{ height: '4px', background: '#30363d', marginTop: '8px' }}>
              <div style={{ width: '20%', height: '100%', background: 'var(--danger-color)' }}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Map Content */}
      <section className="main-content">
        <div className="map-container">
          <Map />
        </div>
      </section>

      {/* Right Panel - Station Details & Alerts */}
      <aside className="stats-panel">
        <h2 className="label">สถานีที่ต้องเฝ้าระวัง (Alerts)</h2>
        <div className="card" style={{ borderLeft: '4px solid var(--danger-color)' }}>
          <p style={{ fontWeight: 600 }}>Shell - ข้าวสารนา</p>
          <p className="label">น้ำมันหมด 3 ชนิด | ETA รถส่ง: 2 ชม.</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--warning-color)' }}>
          <p style={{ fontWeight: 600 }}>PTT - อยุธยาซิตี้พาร์ค</p>
          <p className="label">{"ดีเซลเหลือ < 10%"}</p>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h2 className="label">เครื่องมือสำหรับเจ้าหน้าที่</h2>
          <button style={{ 
            width: '100%', 
            padding: '12px', 
            background: 'var(--info-color)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            marginBottom: '8px',
            cursor: 'pointer'
          }}>
            ลงข้อมูลน้ำมันประจำวัน
          </button>
          <button style={{ 
            width: '100%', 
            padding: '12px', 
            background: 'transparent', 
            color: 'var(--text-bright)', 
            border: '1px solid var(--card-border)', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            เปิดประตูศูนย์สั่งการจังหวัด
          </button>
        </div>
      </aside>
    </main>
  );
}
