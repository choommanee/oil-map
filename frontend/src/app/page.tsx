import OverviewDashboard from '@/components/OverviewDashboard';
import OilPriceBar from '@/components/OilPriceBar';
import { getLiveFeed, getMap, getOverview, searchNearbyStations } from '@/lib/api';
import { getBangchakPrices } from '@/lib/bangchak';

// ISR: revalidate every 30s — ทุก user ที่เข้าใน 30s แรกได้ HTML cached
// Next render จะทำใน background โดยไม่บล็อก user ใหม่
export const revalidate = 30;

const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;
const DEFAULT_RADIUS_KM = 35;

export default async function HomePage() {
  const [overview, map, feed, nearby, oilPrices] = await Promise.all([
    getOverview({ level: 'national' }),
    getMap({}),
    getLiveFeed(),
    searchNearbyStations({
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      radius_km: DEFAULT_RADIUS_KM,
    }),
    getBangchakPrices(),
  ]);

  return (
    <>
      {oilPrices && <OilPriceBar data={oilPrices} />}
      <OverviewDashboard
        overview={overview}
        map={map}
        feed={feed}
        nearby={nearby}
        defaultLocation={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG, radiusKm: DEFAULT_RADIUS_KM }}
      />
    </>
  );
}
