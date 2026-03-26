import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import OverviewDashboard from '@/components/OverviewDashboard';
import { getLiveFeed, getProvinceDetail } from '@/lib/api';

interface ProvincePageProps {
  params: Promise<{ provinceSlug: string }>;
}

export default async function ProvincePage({ params }: ProvincePageProps) {
  const { provinceSlug } = await params;

  try {
    const [provinceDetail, feed] = await Promise.all([
      getProvinceDetail(provinceSlug),
      getLiveFeed(),
    ]);

    return <OverviewDashboard overview={provinceDetail.overview} map={provinceDetail.map} feed={feed} />;
  } catch {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'var(--bg)', color: 'var(--text)',
        fontFamily: 'var(--sans)',
      }}>
        <MapPin size={40} style={{ color: 'var(--text-muted)' }} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>ยังไม่มีข้อมูลจังหวัดนี้ในระบบ</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <code style={{ color: 'var(--accent)' }}>{provinceSlug}</code> — ยังไม่ถูกเพิ่มเข้าระบบ
        </p>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)',
          color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
        }}>
          <ArrowLeft size={14} />
          กลับหน้าภาพรวม
        </Link>
      </main>
    );
  }
}
