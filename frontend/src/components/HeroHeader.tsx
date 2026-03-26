import Link from 'next/link';
import { Activity, Building2, Clock3, Fuel, LogIn, MapPinned, ShieldAlert } from 'lucide-react';
import type { ScopeMeta } from '@/lib/types';

interface HeroHeaderProps {
  scope: ScopeMeta;
  generatedAt?: string;
}

const scopeLevelLabel: Record<ScopeMeta['level'], string> = {
  national: 'ประเทศ',
  region: 'ภูมิภาค',
  province: 'จังหวัด',
  district: 'อำเภอ',
};

export default function HeroHeader({ scope, generatedAt }: HeroHeaderProps) {
  const locationLabel =
    scope.district_name ??
    scope.province_name ??
    scope.region ??
    'ประเทศไทย';

  return (
    <section className="hero-shell hero-shell-compact">
      <div className="hero-status-strip">
        <div className="hero-badge">
          <Activity size={14} />
          <span>Oil Watch</span>
        </div>

        <div className="hero-status-pill">
          <MapPinned size={14} />
          <span className="hero-pill-label">ระดับ</span>
          <strong>{scopeLevelLabel[scope.level]}</strong>
        </div>

        <div className="hero-status-pill">
          <Fuel size={14} />
          <span>{locationLabel}</span>
        </div>

        <div className="hero-status-pill hero-status-pill-risk">
          <ShieldAlert size={14} />
          <span>เฝ้าระวังสด</span>
        </div>

        {generatedAt ? (
          <div className="hero-status-pill">
            <Clock3 size={14} />
            <span>{new Date(generatedAt).toLocaleString('th-TH')}</span>
          </div>
        ) : null}
      </div>

      <div className="hero-main-row">
        <div className="hero-copy">
          <p className="eyebrow">ภาพรวม</p>
          <h1 className="hero-title">{scope.title}</h1>
          <p className="hero-subtitle">{scope.subtitle}</p>
        </div>

        <div className="hero-actions">
          <Link href="/auth/login" className="primary-button">
            <LogIn size={16} />
            <span>เข้าสู่ระบบ</span>
          </Link>
          <Link href="/staff/update" className="secondary-button">
            <Building2 size={16} />
            <span>อัปเดตสต็อก</span>
          </Link>
        </div>
      </div>
    </section>
  );
}