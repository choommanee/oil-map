import OverviewDashboard from '@/components/OverviewDashboard';
import { getDistrictDetail, getLiveFeed } from '@/lib/api';
import type { MapResponse, OverviewResponse } from '@/lib/types';

interface DistrictPageProps {
  params: Promise<{
    provinceSlug: string;
    districtSlug: string;
  }>;
}

function emptyDistrictData(provinceSlug: string, districtSlug: string): { overview: OverviewResponse; map: MapResponse } {
  const scope = {
    title: `อำเภอ ${districtSlug}`,
    subtitle: 'ยังไม่มีข้อมูลสถานีในระบบ',
    level: 'district' as const,
    province_slug: provinceSlug,
    province_name: provinceSlug,
    district_slug: districtSlug,
    district_name: districtSlug,
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

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { provinceSlug, districtSlug } = await params;

  try {
    const [districtDetail, feed] = await Promise.all([
      getDistrictDetail(provinceSlug, districtSlug),
      getLiveFeed(),
    ]);
    return <OverviewDashboard overview={districtDetail.overview} map={districtDetail.map} feed={feed} />;
  } catch {
    // No data for this district — still show the map zoomed to the province
    const fallback = emptyDistrictData(provinceSlug, districtSlug);
    return <OverviewDashboard overview={fallback.overview} map={fallback.map} feed={[]} />;
  }
}