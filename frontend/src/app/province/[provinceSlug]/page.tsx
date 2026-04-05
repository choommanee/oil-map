import OverviewDashboard from '@/components/OverviewDashboard';
import { getLiveFeed, getProvinceDetail } from '@/lib/api';
import type { MapResponse, OverviewResponse } from '@/lib/types';

interface ProvincePageProps {
  params: Promise<{ provinceSlug: string }>;
}

function emptyProvinceData(provinceSlug: string): { overview: OverviewResponse; map: MapResponse } {
  const scope = {
    title: `จังหวัด ${provinceSlug}`,
    subtitle: 'ยังไม่มีข้อมูลสถานีในระบบ',
    level: 'province' as const,
    province_slug: provinceSlug,
    province_name: provinceSlug,
  };
  return {
    overview: {
      scope,
      generated_at: new Date().toISOString(),
      kpis: [
        { label: 'สถานีทั้งหมด', value: 0, tone: 'info', helper: 'ยังไม่มีข้อมูล' },
        { label: 'พร้อมให้บริการ', value: '—', tone: 'neutral' },
        { label: 'จุดเฝ้าระวัง', value: 0, tone: 'neutral' },
        { label: 'จุดวิกฤต', value: 0, tone: 'success' },
      ],
      region_summaries: [],
      fuel_mix: [],
      alerts: [],
      featured_stations: [],
    },
    map: { scope, stations: [] },
  };
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
    // API unavailable or no data — still render the map zoomed to the province
    const fallback = emptyProvinceData(provinceSlug);
    return <OverviewDashboard overview={fallback.overview} map={fallback.map} feed={[]} />;
  }
}
