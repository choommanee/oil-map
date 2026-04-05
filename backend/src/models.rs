use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct StationMapRow {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub region: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub address: String,
    pub latitude: f64,
    pub longitude: f64,
    pub last_updated: DateTime<Utc>,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub price_per_liter: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FuelStatusView {
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub price_per_liter: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StationSummary {
    pub id: i32,
    pub name: String,
    pub brand: String,
    pub brand_key: String,
    pub region: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub address: String,
    pub latitude: f64,
    pub longitude: f64,
    pub last_updated: DateTime<Utc>,
    pub fuel_statuses: Vec<FuelStatusView>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProvinceDistrictRow {
    pub province_id: i32,
    pub province_name: String,
    pub province_slug: String,
    pub region_name: String,
    pub district_id: i32,
    pub district_name: String,
    pub district_slug: String,
    pub district_station_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProvinceStationRow {
    pub province_id: i32,
    pub province_name: String,
    pub province_slug: String,
    pub region_name: String,
    pub district_name: String,
    pub district_slug: String,
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub address: String,
    pub latitude: f64,
    pub longitude: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DistrictSummary {
    pub id: i32,
    pub name: String,
    pub slug: String,
    pub station_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProvinceDetailResponse {
    pub id: i32,
    pub name: String,
    pub slug: String,
    pub region: String,
    pub district_count: usize,
    pub station_count: usize,
    pub districts: Vec<DistrictSummary>,
    pub stations: Vec<StationSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DistrictDetailResponse {
    pub province: ProvinceRef,
    pub district: DistrictSummary,
    pub stations: Vec<StationSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProvinceRef {
    pub name: String,
    pub slug: String,
    pub region: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct OverviewRow {
    pub stations_total: i64,
    pub provinces_total: i64,
    pub districts_total: i64,
    pub updates_last_24h: i64,
    pub high_count: i64,
    pub medium_count: i64,
    pub low_count: i64,
    pub out_count: i64,
    pub refilling_count: i64,
    pub avg_price_per_liter: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct FuelMixRow {
    pub fuel_type: String,
    pub stations_with_fuel: i64,
    pub high_count: i64,
    pub medium_count: i64,
    pub low_count: i64,
    pub out_count: i64,
    pub refilling_count: i64,
    pub avg_price_per_liter: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ScopeBreakdownRow {
    pub area_name: String,
    pub area_slug: String,
    pub stations_count: i64,
    pub low_or_out_count: i64,
    pub updates_last_24h: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryCounts {
    pub high: i64,
    pub medium: i64,
    pub low: i64,
    pub out: i64,
    pub refilling: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FuelMixSummary {
    pub fuel_type: String,
    pub stations_with_fuel: i64,
    pub inventory_counts: InventoryCounts,
    pub avg_price_per_liter: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AreaBreakdown {
    pub area_name: String,
    pub area_slug: String,
    pub stations_count: i64,
    pub low_or_out_count: i64,
    pub updates_last_24h: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OverviewResponse {
    pub scope_level: String,
    pub scope_name: String,
    pub region: Option<String>,
    pub province_slug: Option<String>,
    pub district_slug: Option<String>,
    pub generated_at: DateTime<Utc>,
    pub totals: OverviewTotals,
    pub fuel_mix: Vec<FuelMixSummary>,
    pub breakdown: Vec<AreaBreakdown>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OverviewTotals {
    pub stations_total: i64,
    pub provinces_total: i64,
    pub districts_total: i64,
    pub updates_last_24h: i64,
    pub inventory_counts: InventoryCounts,
    pub avg_price_per_liter: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct FeedRow {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub note: Option<String>,
    pub updated_by: Option<String>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedItem {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub last_updated: DateTime<Utc>,
    pub alert_level: String,
    pub message: String,
    pub updated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LiveFeedResponse {
    pub generated_at: DateTime<Utc>,
    pub items: Vec<FeedItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct SearchRow {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub region: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub address: String,
    pub latitude: f64,
    pub longitude: f64,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub price_per_liter: f64,
    pub last_updated: DateTime<Utc>,
    pub distance_km: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NearbyStationResult {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub region: String,
    pub province: String,
    pub province_slug: String,
    pub district: String,
    pub district_slug: String,
    pub address: String,
    pub latitude: f64,
    pub longitude: f64,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub price_per_liter: f64,
    pub last_updated: DateTime<Utc>,
    pub distance_km: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NearbySearchResponse {
    pub origin_lat: f64,
    pub origin_lng: f64,
    pub radius_km: f64,
    pub fuel_type: Option<String>,
    pub results: Vec<NearbyStationResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouteAvailableResponse {
    pub origin_lat: f64,
    pub origin_lng: f64,
    pub fuel_type: String,
    pub total_results: usize,
    pub stations: Vec<NearbyStationResult>,
}

#[derive(Debug, Deserialize)]
pub struct StationFilterQuery {
    pub region: Option<String>,
    pub province_slug: Option<String>,
    pub district_slug: Option<String>,
    pub brand: Option<String>,
    pub status: Option<String>,
    pub fuel_type: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub radius_km: Option<f64>,
    pub limit: Option<i64>,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OverviewQuery {
    pub level: Option<String>,
    pub region: Option<String>,
    pub province_slug: Option<String>,
    pub district_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NearbySearchQuery {
    pub lat: f64,
    pub lng: f64,
    pub radius_km: Option<f64>,
    pub fuel_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RouteQuery {
    pub origin_lat: f64,
    pub origin_lng: f64,
    pub fuel_type: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub station_id: Option<i32>,
    // role intentionally removed: all registrations land as 'staff'
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: AuthUser,
}

#[derive(Debug, Serialize)]
pub struct AuthUser {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub role: String,
    pub station_id: Option<i32>,
    pub province_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StationUpdateRequest {
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: Option<f64>,  // optional: frontend no longer sends liters
    pub price_per_liter: f64,
    // updated_by removed: derived from JWT claims in handler
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct AppUser {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub station_id: Option<i32>,
    pub province_slug: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiMessage {
    pub message: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ViewportQuery {
    pub north: f64,
    pub south: f64,
    pub east: f64,
    pub west: f64,
    pub fuel_type: Option<String>,
    pub status: Option<String>,
    pub brand: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ZoneStationsQuery {
    pub region: Option<String>,
    pub province_slug: Option<String>,
    pub district_slug: Option<String>,
    pub fuel_type: Option<String>,
    pub status: Option<String>,
    pub brand: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MapViewportResponse {
    pub scope_type: String,
    pub scope_name: String,
    pub north: f64,
    pub south: f64,
    pub east: f64,
    pub west: f64,
    pub generated_at: DateTime<Utc>,
    pub total_stations: i64,
    pub returned_stations: usize,
    pub nearby_stations: Vec<NearbyStationResult>,
    pub inventory_counts: InventoryCounts,
    pub latest_update_at: Option<DateTime<Utc>>,
    pub average_price_per_liter: f64,
}

// ── Chat ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ChatMessage {
    pub id: i64,
    pub sender: String,
    pub role: String,
    pub avatar: String,
    pub province_slug: Option<String>,
    pub text: String,
    pub sent_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct PostChatMessage {
    pub sender: String,
    pub role: Option<String>,
    pub avatar: Option<String>,
    pub province_slug: Option<String>,
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatQuery {
    pub province_slug: Option<String>,
    pub limit: Option<i64>,
}

// ── Alerts ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlertItem {
    pub province_name: String,
    pub province_slug: String,
    pub district_name: Option<String>,
    pub district_slug: Option<String>,
    pub total_stations: i64,
    pub critical_stations: i64,
    pub critical_percent: f64,
    pub severity: String,
    pub top_issues: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlertsResponse {
    pub alerts: Vec<AlertItem>,
}

#[derive(Debug, FromRow)]
pub struct AlertRow {
    pub province_name: String,
    pub province_slug: String,
    pub district_name: Option<String>,
    pub district_slug: Option<String>,
    pub total_stations: i64,
    pub critical_stations: i64,
    pub critical_percent: f64,
}

#[derive(Debug, FromRow)]
pub struct AlertIssueRow {
    pub province_slug: String,
    pub district_slug: Option<String>,
    pub fuel_type: String,
    pub inventory_level: String,
    pub cnt: i64,
}

// ── Trends ───────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct TrendsQuery {
    pub province_slug: Option<String>,
    pub days: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrendDay {
    pub date: String,
    pub ok: i64,
    pub low: i64,
    pub out: i64,
    pub refilling: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrendsResponse {
    pub province: String,
    pub days: Vec<TrendDay>,
}

// ── Station history ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub fuel_type: String,
    pub old_level: Option<String>,
    pub new_level: String,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StationHistoryResponse {
    pub station_id: i32,
    pub station_name: String,
    pub history: Vec<HistoryEntry>,
}

#[derive(Debug, FromRow)]
pub struct HistoryRow {
    pub fuel_type: String,
    pub inventory_level: String,
    pub last_updated: DateTime<Utc>,
    pub updated_by: Option<String>,
}

// ── Export ────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>,
    pub province_slug: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct ExportRow {
    pub station_id: i32,
    pub station_name: String,
    pub brand: String,
    pub province: String,
    pub district: String,
    pub latitude: f64,
    pub longitude: f64,
    pub fuel_type: String,
    pub inventory_level: String,
    pub amount_liters: f64,
    pub price_per_liter: f64,
}

pub fn brand_key(brand: &str) -> String {
    match brand.to_lowercase().as_str() {
        "ptt" => "PTT".to_string(),
        "shell" => "Shell".to_string(),
        "bangchak" => "Bangchak".to_string(),
        "esso" => "Esso".to_string(),
        "pt" => "PT".to_string(),
        "caltex" => "Caltex".to_string(),
        "irpc" => "IRPC".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.collect::<String>()),
                None => "Unknown".to_string(),
            }
        }
    }
}

pub fn build_station_summaries(rows: Vec<StationMapRow>) -> Vec<StationSummary> {
    let mut stations: Vec<StationSummary> = Vec::new();

    for row in rows {
        if let Some(existing) = stations.iter_mut().find(|station| station.id == row.station_id) {
            existing.fuel_statuses.push(FuelStatusView {
                fuel_type: row.fuel_type,
                inventory_level: row.inventory_level,
                amount_liters: row.amount_liters,
                price_per_liter: row.price_per_liter,
                last_updated: row.last_updated,
            });
        } else {
            stations.push(StationSummary {
                id: row.station_id,
                name: row.station_name,
                brand_key: brand_key(&row.brand),
                brand: row.brand,
                region: row.region,
                province: row.province,
                province_slug: row.province_slug,
                district: row.district,
                district_slug: row.district_slug,
                address: row.address,
                latitude: row.latitude,
                longitude: row.longitude,
                last_updated: row.last_updated,
                fuel_statuses: vec![FuelStatusView {
                    fuel_type: row.fuel_type,
                    inventory_level: row.inventory_level,
                    amount_liters: row.amount_liters,
                    price_per_liter: row.price_per_liter,
                    last_updated: row.last_updated,
                }],
            });
        }
    }

    stations
}