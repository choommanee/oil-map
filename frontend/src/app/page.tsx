import OverviewDashboard from '@/components/OverviewDashboard';
import { getLiveFeed, getMap, getOverview, searchNearbyStations } from '@/lib/api';

// ISR: revalidate every 30s
export const revalidate = 30;

const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;
const DEFAULT_RADIUS_KM = 35;

export default async function HomePage() {
  const [overview, map, feed, nearby] = await Promise.all([
    getOverview({ level: 'national' }),
    getMap({ limit: 500 }),
    getLiveFeed(),
    searchNearbyStations({
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      radius_km: DEFAULT_RADIUS_KM,
    }),
  ]);

  return (
    <OverviewDashboard
      overview={overview}
      map={map}
      feed={feed}
      nearby={nearby}
      defaultLocation={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG, radiusKm: DEFAULT_RADIUS_KM }}
    />
  );
}
