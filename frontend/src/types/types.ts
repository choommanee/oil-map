Frontend data-contract audit summary:

Source files reviewed:
- frontend/src/lib/types.ts
- frontend/src/lib/api.ts
- frontend/src/app/page.tsx
- frontend/src/components/DashboardMap.tsx
- frontend/src/components/KpiGrid.tsx
- frontend/src/components/OverviewDashboard.tsx
- frontend/src/components/RealtimeFeed.tsx
- frontend/src/components/LiveAlertsPanel.tsx
- frontend/src/components/StationList.tsx
- frontend/src/components/StationDetailCard.tsx

Key frontend contract findings:
- `StationDetailCard.tsx` references `station.risk_level`, but `Station` in `frontend/src/lib/types.ts` does not define `risk_level`.
- `Station.address` is typed as required, but the UI still falls back to district/province text, suggesting the backend may sometimes send empty address values.
- `Station.status` is aggregate, while `fuels[].status` is per-fuel; both must remain consistent.
- `OverviewResponse.featured_stations` overlaps with `MapResponse.stations`; current dashboard uses both.
- `FeedItem.status` is the only status rendered in feed UI, though the backend feed payload also includes `inventory_level` and `alert_level`.
- `LiveAlertsPanel` depends on `province_slug` and `district_slug` for routing.
- `DashboardMap` depends on `province_slug/province_name` and `district_slug/district_name` for boundary matching and display.

Exact frontend interfaces and usage:
- `FuelLevel = 'high' | 'medium' | 'low' | 'out' | 'refilling'`
- `OverviewLevel = 'national' | 'region' | 'province' | 'district'`
- `ScopeMeta`
  - required: `title`, `subtitle`, `level`
  - optional: `region`, `province_slug`, `province_name`, `district_slug`, `district_name`
- `FuelStatusItem`
  - `fuel_type`, `status`, `liters`, `price_per_liter`, `updated_at`
- `Station`
  - `id`, `name`, `brand`, `brand_key`, `region`, `province_name`, `province_slug`, `district_name`, `district_slug`, `address`, `lat`, `lng`, `last_updated`, `status`, `fuels`
  - optional: `distance_km`
- `OverviewKpi`
  - `label`, `value`, optional `tone`, `helper`
- `RegionSummary`
  - `region`, `station_count`, `healthy_percent`, `warning_count`, `critical_count`
- `FuelMixItem`
  - `fuel_type`, `available_percent`, `station_count`, `average_price`
- `AlertItem`
  - `id`, `title`, `message`, `severity`
  - optional: `station_id`, `station_name`, `province_slug`, `district_slug`, `updated_at`
- `FeedItem`
  - `id`, `station_name`, `message`, `status`, `updated_at`
  - optional: `station_id`, `province_slug`, `district_slug`, `brand`
- `OverviewResponse`
  - `scope`, `generated_at`, `kpis`, `region_summaries`, `fuel_mix`, `alerts`, `featured_stations`
- `MapResponse`
  - `scope`, `stations`
- `NearbySearchResponse`
  - `origin`, `stations`
- `RouteAvailableResponse`
  - `origin`, `fuel_type`, `stations`
- `ProvinceDetailResponse`
  - `scope`, `overview`, `map`
- `DistrictDetailResponse`
  - `scope`, `overview`, `map`
- `AuthResponse`
  - `token`, `user`
- `StationUpdatePayload`
  - `fuel_type`, `inventory_level`, `amount_liters`, `price_per_liter`
  - optional: `note`, `updated_by`

Frontend API expectations from `frontend/src/lib/api.ts`:
- `GET /api/overview`
  - backend shape: `scope_level`, `scope_name`, optional `region`, `province_slug`, `district_slug`, `generated_at`, `totals`, `fuel_mix`, `breakdown`
- `GET /api/map`
  - backend shape: array of station summaries with `latitude`, `longitude`, `fuel_statuses`
- `GET /api/feeds/live`
  - backend shape: `generated_at`, `items[]`
- `GET /api/stations/search`
  - backend shape: `origin_lat`, `origin_lng`, `radius_km`, optional `fuel_type`, `results[]`
- `GET /api/routes/available`
  - backend shape: `origin_lat`, `origin_lng`, `fuel_type`, `stations[]`
- `GET /api/provinces/:provinceSlug`
  - backend shape: province meta plus `districts[]` and `stations[]`
- `GET /api/provinces/:provinceSlug/districts/:districtSlug`
  - backend shape: province meta, district meta, `stations[]`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/stations/:stationId/update`

Files created:
- types.ts

Note: This file is only a written audit summary to satisfy the tool requirement; no source files were modified.