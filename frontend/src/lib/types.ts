export type FuelLevel = 'high' | 'medium' | 'low' | 'out' | 'refilling';
export type OverviewLevel = 'national' | 'region' | 'province' | 'district';
export type FuelType = string;
export type StationAvailabilityStatus = FuelLevel;
export type SummaryTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface ScopeMeta {
  title: string;
  subtitle: string;
  level: OverviewLevel;
  region?: string;
  province_slug?: string;
  province_name?: string;
  district_slug?: string;
  district_name?: string;
}

export interface FuelStatusItem {
  fuel_type: FuelType;
  status: FuelLevel;
  liters: number;
  price_per_liter: number;
  updated_at: string;
}

export interface Station {
  id: number;
  name: string;
  brand: string;
  brand_key: string;
  region: string;
  province_name: string;
  province_slug: string;
  district_name: string;
  district_slug: string;
  address: string;
  lat: number;
  lng: number;
  last_updated: string;
  status: StationAvailabilityStatus;
  fuels: FuelStatusItem[];
  distance_km?: number;
}

export interface NearbyStation extends Station {
  distance_km: number;
  primary_fuel_type?: FuelType;
  primary_status?: FuelLevel;
}

export interface SummaryCard {
  label: string;
  value: number | string;
  tone?: SummaryTone;
  helper?: string;
}

export interface OverviewKpi extends SummaryCard {}

export interface RegionSummary {
  region: string;
  area_slug?: string;
  station_count: number;
  healthy_percent: number;
  warning_count: number;
  critical_count: number;
}

export interface FuelMixItem {
  fuel_type: FuelType;
  available_percent: number;
  station_count: number;
  average_price: number;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  station_id?: number;
  station_name?: string;
  province_slug?: string;
  district_slug?: string;
  updated_at?: string;
}

export interface FeedItem {
  id: string;
  station_id?: number;
  station_name: string;
  province_slug?: string;
  district_slug?: string;
  fuel_type?: string;
  message: string;
  status: string;
  updated_at: string;
  brand?: string;
  updated_by?: string;
}

export interface OverviewResponse {
  scope: ScopeMeta;
  generated_at: string;
  kpis: OverviewKpi[];
  region_summaries: RegionSummary[];
  fuel_mix: FuelMixItem[];
  alerts: AlertItem[];
  featured_stations: Station[];
}

export interface MapResponse {
  scope: ScopeMeta;
  stations: Station[];
}

export interface NearbySearchOrigin {
  lat: number;
  lng: number;
  radius_km: number;
}

export interface NearbySearchResponse {
  origin: NearbySearchOrigin;
  stations: NearbyStation[];
}

export interface RouteAvailableResponse {
  origin: {
    lat: number;
    lng: number;
  };
  fuel_type: FuelType;
  stations: NearbyStation[];
}

export interface ProvinceDetailResponse {
  scope: ScopeMeta;
  overview: OverviewResponse;
  map: MapResponse;
}

export interface DistrictDetailResponse {
  scope: ScopeMeta;
  overview: OverviewResponse;
  map: MapResponse;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string | number;
    name: string;
    email: string;
    role: string;
    station_id?: number;
    province_slug?: string;
  };
}

export interface StationUpdatePayload {
  fuel_type: FuelType;
  inventory_level: FuelLevel;
  price_per_liter: number;
  note?: string;
  // amount_liters and updated_by removed: handled server-side
}