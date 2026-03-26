import OverviewDashboard from '@/components/OverviewDashboard';
import { getDistrictDetail, getLiveFeed } from '@/lib/api';

interface DistrictPageProps {
  params: Promise<{
    provinceSlug: string;
    districtSlug: string;
  }>;
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { provinceSlug, districtSlug } = await params;
  const [districtDetail, feed] = await Promise.all([getDistrictDetail(provinceSlug, districtSlug), getLiveFeed()]);

  return <OverviewDashboard overview={districtDetail.overview} map={districtDetail.map} feed={feed} />;
}