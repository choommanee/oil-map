import type {
  AlertCenterItem,
  AlertItem,
  AuthResponse,
  DistrictDetailResponse,
  FeedItem,
  FuelLevel,
  FuelMixItem,
  FuelType,
  MapResponse,
  NearbySearchResponse,
  NearbyStation,
  OverviewKpi,
  OverviewLevel,
  OverviewResponse,
  ProvinceDetailResponse,
  RegionSummary,
  RouteAvailableResponse,
  ScopeMeta,
  Station,
  StationHistoryData,
  StationUpdatePayload,
  TrendData,
} from '@/lib/types';
import { getAuthToken } from '@/lib/auth';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

function getRealtimeSocketUrl() {
  const explicitBase = process.env.NEXT_PUBLIC_WS_BASE_URL;

  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}/ws/realtime`;
  }

  if (typeof window !== 'undefined') {
    const apiUrl = new URL(API_BASE_URL);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = apiUrl.hostname === 'localhost' ? window.location.hostname : apiUrl.hostname;
    const port = apiUrl.port || (protocol === 'wss:' ? '443' : '80');

    return `${protocol}//${hostname}:${port}/ws/realtime`;
  }

  return `${API_BASE_URL.replace(/^http/, 'ws')}/ws/realtime`;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  query?: QueryParams,
): Promise<T> {
  const url = new URL(path, API_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

type QueryValue = string | number | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface BackendInventoryCounts {
  high: number;
  medium: number;
  low: number;
  out: number;
  refilling: number;
}

interface BackendFuelStatusView {
  fuel_type: FuelType;
  inventory_level: FuelLevel;
  amount_liters: number;
  price_per_liter: number;
  last_updated: string;
}

interface BackendStationSummary {
  id: number;
  name: string;
  brand: string;
  brand_key: string;
  region: string;
  province: string;
  province_slug: string;
  district: string;
  district_slug: string;
  address: string;
  latitude: number;
  longitude: number;
  last_updated: string;
  fuel_statuses: BackendFuelStatusView[];
}

interface BackendOverviewTotals {
  stations_total: number;
  provinces_total: number;
  districts_total: number;
  updates_last_24h: number;
  inventory_counts: BackendInventoryCounts;
  avg_price_per_liter: number;
}

interface BackendFuelMixSummary {
  fuel_type: FuelType;
  stations_with_fuel: number;
  inventory_counts: BackendInventoryCounts;
  avg_price_per_liter: number;
}

interface BackendAreaBreakdown {
  area_name: string;
  area_slug: string;
  stations_count: number;
  low_or_out_count: number;
  updates_last_24h: number;
}

interface BackendOverviewResponse {
  scope_level: OverviewLevel;
  scope_name: string;
  region?: string | null;
  province_slug?: string | null;
  district_slug?: string | null;
  generated_at: string;
  totals: BackendOverviewTotals;
  fuel_mix: BackendFuelMixSummary[];
  breakdown: BackendAreaBreakdown[];
}

interface BackendFeedItem {
  station_id: number;
  station_name: string;
  brand: string;
  province: string;
  province_slug: string;
  district: string;
  district_slug: string;
  fuel_type: FuelType;
  inventory_level: string;
  amount_liters: number;
  last_updated: string;
  alert_level: string;
  message: string;
  updated_by?: string | null;
}

interface BackendLiveFeedResponse {
  generated_at: string;
  items: BackendFeedItem[];
}

interface BackendNearbyStationResult {
  station_id: number;
  station_name: string;
  brand: string;
  region: string;
  province: string;
  province_slug: string;
  district: string;
  district_slug: string;
  address: string;
  latitude: number;
  longitude: number;
  fuel_type: FuelType;
  inventory_level: FuelLevel;
  amount_liters: number;
  price_per_liter: number;
  last_updated: string;
  distance_km: number;
}

interface BackendNearbySearchResponse {
  origin_lat: number;
  origin_lng: number;
  radius_km: number;
  fuel_type?: string | null;
  results: BackendNearbyStationResult[];
}

interface BackendViewportResponse {
  nearby_stations: BackendNearbyStationResult[];
}

interface BackendProvinceDetailResponse {
  id: number;
  name: string;
  slug: string;
  region: string;
  district_count: number;
  station_count: number;
  districts: Array<{
    id: number;
    name: string;
    slug: string;
    station_count: number;
  }>;
  stations: BackendStationSummary[];
}

interface BackendDistrictDetailResponse {
  province: {
    name: string;
    slug: string;
    region: string;
  };
  district: {
    id: number;
    name: string;
    slug: string;
    station_count: number;
  };
  stations: BackendStationSummary[];
}

function buildScopeMeta(input: {
  level: OverviewLevel;
  name: string;
  region?: string | null;
  province_slug?: string | null;
  district_slug?: string | null;
}): ScopeMeta {
  const titleMap: Record<OverviewLevel, string> = {
    national: 'ภาพรวมทั่วประเทศ',
    region: `โฟกัสระดับภูมิภาค: ${input.name}`,
    province: `จังหวัด ${input.name}`,
    district: `อำเภอ ${input.name}`,
  };

  const subtitleMap: Record<OverviewLevel, string> = {
    national: 'ติดตามความพร้อมน้ำมันและความเสี่ยงระดับประเทศแบบ near realtime',
    region: 'ติดตามจังหวัดภายในภูมิภาคที่เลือก',
    province: 'วิเคราะห์ภาพรวมระดับจังหวัดและสถานีเด่น',
    district: 'ติดตามสถานีและความพร้อมเชื้อเพลิงระดับอำเภอ',
  };

  return {
    title: titleMap[input.level],
    subtitle: subtitleMap[input.level],
    level: input.level,
    region: input.region || undefined,
    province_slug: input.province_slug || undefined,
    district_slug: input.district_slug || undefined,
    province_name: input.level === 'province' ? input.name : undefined,
    district_name: input.level === 'district' ? input.name : undefined,
  };
}

function inferStationStatus(fuels: BackendFuelStatusView[]): FuelLevel {
  if (fuels.some((fuel) => fuel.inventory_level === 'out')) return 'out';
  if (fuels.some((fuel) => fuel.inventory_level === 'low')) return 'low';
  if (fuels.some((fuel) => fuel.inventory_level === 'refilling')) return 'refilling';
  if (fuels.some((fuel) => fuel.inventory_level === 'medium')) return 'medium';
  return 'high';
}

function mapStation(station: BackendStationSummary): Station {
  return {
    id: station.id,
    name: station.name,
    brand: station.brand,
    brand_key: station.brand_key,
    region: station.region,
    province_name: station.province,
    province_slug: station.province_slug,
    district_name: station.district,
    district_slug: station.district_slug,
    address: station.address,
    lat: station.latitude,
    lng: station.longitude,
    last_updated: station.last_updated,
    status: inferStationStatus(station.fuel_statuses),
    fuels: station.fuel_statuses.map((fuel) => ({
      fuel_type: fuel.fuel_type,
      status: fuel.inventory_level,
      liters: fuel.amount_liters,
      price_per_liter: fuel.price_per_liter,
      updated_at: fuel.last_updated,
    })),
  };
}

function groupNearbyResults(results: BackendNearbyStationResult[]): NearbyStation[] {
  const byId = new Map<number, { base: BackendNearbyStationResult; fuels: BackendFuelStatusView[] }>();
  for (const row of results) {
    const entry = byId.get(row.station_id);
    const fuel: BackendFuelStatusView = {
      fuel_type: row.fuel_type,
      inventory_level: row.inventory_level,
      amount_liters: row.amount_liters,
      price_per_liter: row.price_per_liter,
      last_updated: row.last_updated,
    };
    if (entry) {
      entry.fuels.push(fuel);
    } else {
      byId.set(row.station_id, { base: row, fuels: [fuel] });
    }
  }
  return Array.from(byId.values()).map(({ base, fuels }) => ({
    ...mapStation({
      id: base.station_id,
      name: base.station_name,
      brand: base.brand,
      brand_key: base.brand,
      region: base.region,
      province: base.province,
      province_slug: base.province_slug,
      district: base.district,
      district_slug: base.district_slug,
      address: base.address,
      latitude: base.latitude,
      longitude: base.longitude,
      last_updated: base.last_updated,
      fuel_statuses: fuels,
    }),
    distance_km: base.distance_km,
    primary_fuel_type: base.fuel_type,
    primary_status: base.inventory_level,
  }));
}

function buildKpis(totals: BackendOverviewTotals): OverviewKpi[] {
  const inventoryTotal =
    totals.inventory_counts.high +
    totals.inventory_counts.medium +
    totals.inventory_counts.low +
    totals.inventory_counts.out +
    totals.inventory_counts.refilling;

  const healthyPercent = inventoryTotal > 0 ? Math.round(((totals.inventory_counts.high + totals.inventory_counts.medium) / inventoryTotal) * 100) : 0;
  const warningCount = totals.inventory_counts.low + totals.inventory_counts.refilling;
  const criticalCount = totals.inventory_counts.out;

  return [
    {
      label: 'สถานีทั้งหมด',
      value: totals.stations_total,
      tone: 'info',
      helper: `${totals.provinces_total} จังหวัด • ${totals.districts_total} อำเภอ`,
    },
    {
      label: 'พร้อมให้บริการ',
      value: `${healthyPercent}%`,
      tone: healthyPercent >= 70 ? 'success' : healthyPercent >= 40 ? 'warning' : 'danger',
      helper: `อัปเดตล่าสุด ${totals.updates_last_24h} รายการ / 24 ชม.`,
    },
    {
      label: 'จุดเฝ้าระวัง',
      value: warningCount,
      tone: warningCount > 0 ? 'warning' : 'neutral',
      helper: 'ระดับ low และ refilling',
    },
    {
      label: 'จุดวิกฤต',
      value: criticalCount,
      tone: criticalCount > 0 ? 'danger' : 'success',
      helper: 'สถานะ out',
    },
  ];
}

function buildRegionSummaries(overview: BackendOverviewResponse): RegionSummary[] {
  if (overview.scope_level === 'national') {
    return overview.breakdown.map((item) => ({
      region: item.area_name,
      area_slug: item.area_slug,
      station_count: item.stations_count,
      healthy_percent: Math.max(0, Math.min(100, Math.round(((item.stations_count - item.low_or_out_count) / Math.max(item.stations_count, 1)) * 100))),
      warning_count: Math.max(0, item.low_or_out_count - Math.floor(item.low_or_out_count / 2)),
      critical_count: Math.floor(item.low_or_out_count / 2),
    }));
  }

  // For province/district level: breakdown items are districts
  if (overview.breakdown.length > 0) {
    return overview.breakdown.map((item) => ({
      region: item.area_name,
      area_slug: item.area_slug,
      station_count: item.stations_count,
      healthy_percent: Math.max(0, Math.min(100, Math.round(((item.stations_count - item.low_or_out_count) / Math.max(item.stations_count, 1)) * 100))),
      warning_count: Math.max(0, item.low_or_out_count - Math.floor(item.low_or_out_count / 2)),
      critical_count: Math.floor(item.low_or_out_count / 2),
    }));
  }

  return [
    {
      region: overview.scope_name,
      station_count: overview.totals.stations_total,
      healthy_percent: Math.round(
        ((overview.totals.inventory_counts.high + overview.totals.inventory_counts.medium) /
          Math.max(
            overview.totals.inventory_counts.high +
              overview.totals.inventory_counts.medium +
              overview.totals.inventory_counts.low +
              overview.totals.inventory_counts.out +
              overview.totals.inventory_counts.refilling,
            1,
          )) *
          100,
      ),
      warning_count: overview.totals.inventory_counts.low + overview.totals.inventory_counts.refilling,
      critical_count: overview.totals.inventory_counts.out,
    },
  ];
}

function buildFuelMix(items: BackendFuelMixSummary[]): FuelMixItem[] {
  return items.map((item) => {
    const total =
      item.inventory_counts.high +
      item.inventory_counts.medium +
      item.inventory_counts.low +
      item.inventory_counts.out +
      item.inventory_counts.refilling;

    return {
      fuel_type: item.fuel_type,
      available_percent: total > 0 ? Math.round(((item.inventory_counts.high + item.inventory_counts.medium) / total) * 100) : 0,
      station_count: item.stations_with_fuel,
      average_price: item.avg_price_per_liter,
    };
  });
}

function buildAlerts(overview: BackendOverviewResponse): AlertItem[] {
  return overview.breakdown
    .filter((item) => item.low_or_out_count > 0)
    .slice(0, 6)
    .map((item, index) => ({
      id: `${overview.scope_level}-${item.area_slug}-${index}`,
      title: item.area_name,
      message: `มี ${item.low_or_out_count} จุดที่อยู่ในสถานะ low/out`,
      severity: item.low_or_out_count >= 3 ? 'danger' : 'warning',
      province_slug: overview.scope_level === 'region' ? item.area_slug : overview.province_slug || undefined,
      district_slug: overview.scope_level === 'province' ? item.area_slug : overview.district_slug || undefined,
      updated_at: overview.generated_at,
    }));
}

function mapOverview(response: BackendOverviewResponse, stations: Station[]): OverviewResponse {
  return {
    scope: buildScopeMeta({
      level: response.scope_level,
      name: response.scope_name,
      region: response.region,
      province_slug: response.province_slug,
      district_slug: response.district_slug,
    }),
    generated_at: response.generated_at,
    kpis: buildKpis(response.totals),
    region_summaries: buildRegionSummaries(response),
    fuel_mix: buildFuelMix(response.fuel_mix),
    alerts: buildAlerts(response),
    featured_stations: stations.slice(0, 6),
  };
}

export interface OverviewParams {
  level: OverviewLevel;
  region?: string;
  province_slug?: string;
  district_slug?: string;
}

export interface MapParams {
  region?: string;
  province_slug?: string;
  district_slug?: string;
  brand?: string;
  fuel_type?: string;
  status?: string;
  limit?: number;
}

export interface SearchNearbyParams {
  lat: number;
  lng: number;
  radius_km: number;
  fuel_type?: string;
}

export interface RouteSearchParams {
  origin_lat: number;
  origin_lng: number;
  fuel_type: string;
}

export interface AuthPayload {
  name?: string;
  email: string;
  password: string;
  station_id?: number;
  // role removed: backend always assigns 'staff' on registration
}

export async function getOverview(params: OverviewParams): Promise<OverviewResponse> {
  try {
    const [overview, stations] = await Promise.all([
      requestJson<BackendOverviewResponse>('/api/overview', undefined, params as unknown as QueryParams),
      requestJson<BackendStationSummary[]>('/api/map', undefined, params as unknown as QueryParams),
    ]);
    const mappedStations = stations.map(mapStation);
    return mapOverview(overview, mappedStations);
  } catch {
    const { MOCK_OVERVIEW } = await import('./mockData');
    return MOCK_OVERVIEW;
  }
}

export async function getMap(params: MapParams): Promise<MapResponse> {
  try {
    const stations = await requestJson<BackendStationSummary[]>('/api/map', undefined, params as unknown as QueryParams);
    return {
      scope: buildScopeMeta({
        level: params.district_slug ? 'district' : params.province_slug ? 'province' : params.region ? 'region' : 'national',
        name: params.district_slug || params.province_slug || params.region || 'Thailand',
        region: params.region,
        province_slug: params.province_slug,
        district_slug: params.district_slug,
      }),
      stations: stations.map(mapStation),
    };
  } catch {
    const { MOCK_MAP } = await import('./mockData');
    return MOCK_MAP;
  }
}

export interface ViewportParams {
  north: number;
  south: number;
  east: number;
  west: number;
  fuel_type?: string;
  status?: string;
  brand?: string;
  limit?: number;
}

export async function getViewportStations(params: ViewportParams): Promise<Station[]> {
  const data = await requestJson<BackendViewportResponse>('/api/map/viewport', undefined, params as unknown as QueryParams);
  const byId = new Map<number, BackendStationSummary>();
  for (const row of data.nearby_stations) {
    const entry = byId.get(row.station_id);
    const fuel: BackendFuelStatusView = {
      fuel_type: row.fuel_type,
      inventory_level: row.inventory_level,
      amount_liters: row.amount_liters,
      price_per_liter: row.price_per_liter,
      last_updated: row.last_updated,
    };
    if (entry) {
      entry.fuel_statuses.push(fuel);
    } else {
      byId.set(row.station_id, {
        id: row.station_id,
        name: row.station_name,
        brand: row.brand,
        brand_key: row.brand,
        region: row.region,
        province: row.province,
        province_slug: row.province_slug,
        district: row.district,
        district_slug: row.district_slug,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        last_updated: row.last_updated,
        fuel_statuses: [fuel],
      });
    }
  }
  return Array.from(byId.values()).map(mapStation);
}

export async function searchNearbyStations(params: SearchNearbyParams): Promise<NearbySearchResponse> {
  try {
    const response = await requestJson<BackendNearbySearchResponse>('/api/stations/search', undefined, params as unknown as QueryParams);
    return {
      origin: { lat: response.origin_lat, lng: response.origin_lng, radius_km: response.radius_km },
      stations: groupNearbyResults(response.results),
    };
  } catch {
    const { MOCK_NEARBY_STATIONS } = await import('./mockData');
    const filtered = MOCK_NEARBY_STATIONS.filter((s) => s.distance_km <= params.radius_km);
    return { origin: { lat: params.lat, lng: params.lng, radius_km: params.radius_km }, stations: filtered };
  }
}

export async function getAvailableRoutes(params: RouteSearchParams): Promise<RouteAvailableResponse> {
  const response = await requestJson<{
    origin_lat: number;
    origin_lng: number;
    fuel_type: FuelType;
    stations: BackendNearbyStationResult[];
  }>('/api/routes/available', undefined, params as unknown as QueryParams);

  return {
    origin: {
      lat: response.origin_lat,
      lng: response.origin_lng,
    },
    fuel_type: response.fuel_type,
    stations: groupNearbyResults(response.stations),
  };
}

export async function getLiveFeed(): Promise<FeedItem[]> {
  try {
    const response = await requestJson<BackendLiveFeedResponse>('/api/feeds/live');
    return response.items.map((item) => ({
      id: `${item.station_id}-${item.fuel_type}-${item.last_updated}`,
      station_id: item.station_id,
      station_name: item.station_name,
      province_slug: item.province_slug,
      district_slug: item.district_slug,
      fuel_type: item.fuel_type,
      message: item.message,
      status: item.alert_level,
      updated_at: item.last_updated,
      brand: item.brand,
      updated_by: item.updated_by ?? undefined,
    }));
  } catch {
    const { MOCK_FEED } = await import('./mockData');
    return MOCK_FEED;
  }
}

export async function getProvinceDetail(provinceSlug: string): Promise<ProvinceDetailResponse> {
  const [provinceDetail, feedOverview] = await Promise.all([
    requestJson<BackendProvinceDetailResponse>(`/api/provinces/${provinceSlug}`),
    requestJson<BackendOverviewResponse>('/api/overview', undefined, {
      level: 'province',
      province_slug: provinceSlug,
    }),
  ]);

  const stations = provinceDetail.stations.map(mapStation);
  const overview = mapOverview(feedOverview, stations);

  return {
    scope: {
      ...overview.scope,
      province_slug: provinceDetail.slug,
      province_name: provinceDetail.name,
      region: provinceDetail.region,
      title: `จังหวัด ${provinceDetail.name}`,
      subtitle: `รวม ${provinceDetail.station_count} สถานี ใน ${provinceDetail.district_count} อำเภอ`,
    },
    overview,
    map: {
      scope: {
        ...overview.scope,
        province_slug: provinceDetail.slug,
        province_name: provinceDetail.name,
        region: provinceDetail.region,
      },
      stations,
    },
  };
}

export async function getDistrictDetail(provinceSlug: string, districtSlug: string): Promise<DistrictDetailResponse> {
  const [districtDetail, overviewResponse] = await Promise.all([
    requestJson<BackendDistrictDetailResponse>(`/api/provinces/${provinceSlug}/districts/${districtSlug}`),
    requestJson<BackendOverviewResponse>('/api/overview', undefined, {
      level: 'district',
      province_slug: provinceSlug,
      district_slug: districtSlug,
    }),
  ]);

  const stations = districtDetail.stations.map(mapStation);
  const overview = mapOverview(overviewResponse, stations);

  return {
    scope: {
      ...overview.scope,
      region: districtDetail.province.region,
      province_slug: districtDetail.province.slug,
      province_name: districtDetail.province.name,
      district_slug: districtDetail.district.slug,
      district_name: districtDetail.district.name,
      title: `อำเภอ ${districtDetail.district.name}`,
      subtitle: `รวม ${districtDetail.district.station_count} สถานีในพื้นที่`,
    },
    overview,
    map: {
      scope: {
        ...overview.scope,
        region: districtDetail.province.region,
        province_slug: districtDetail.province.slug,
        province_name: districtDetail.province.name,
        district_slug: districtDetail.district.slug,
        district_name: districtDetail.district.name,
      },
      stations,
    },
  };
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  sender: string;
  role: string;
  avatar: string;
  province_slug?: string | null;
  text: string;
  sent_at: string;
}

export interface PostChatPayload {
  sender: string;
  role?: string;
  avatar?: string;
  province_slug?: string;
  text: string;
}

export async function getChatMessages(params?: { province_slug?: string; limit?: number }): Promise<ChatMessage[]> {
  return requestJson<ChatMessage[]>('/api/chat/messages', undefined, params as QueryParams);
}

export async function postChatMessage(payload: PostChatPayload): Promise<ChatMessage> {
  return requestJson<ChatMessage>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: AuthPayload): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: AuthPayload): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStationFuel(stationId: number, payload: StationUpdatePayload): Promise<{ success: boolean; message?: string }> {
  const response = await requestJson<{ message: string }>(`/api/stations/${stationId}/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    success: true,
    message: response.message,
  };
}

export async function getAlerts(): Promise<{ alerts: AlertCenterItem[] }> {
  return requestJson<{ alerts: AlertCenterItem[] }>('/api/alerts');
}

export async function getTrends(provinceSlug?: string, days?: number): Promise<TrendData> {
  const query: QueryParams = {};
  if (provinceSlug) query.province_slug = provinceSlug;
  if (days) query.days = days;
  return requestJson<TrendData>('/api/trends', undefined, query);
}

export async function getStationHistory(stationId: number): Promise<StationHistoryData> {
  return requestJson<StationHistoryData>(`/api/stations/${stationId}/history`);
}

export async function exportStations(format: 'csv', provinceSlug?: string): Promise<string> {
  const url = new URL('/api/export/stations', API_BASE_URL);
  url.searchParams.set('format', format);
  if (provinceSlug) url.searchParams.set('province_slug', provinceSlug);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url.toString(), { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`Export failed with status ${response.status}`);
  return response.text();
}
