use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use axum::body::Body;
use chrono::{Duration, Utc};
use sqlx::Row;

use crate::auth::AuthClaims;
use crate::models::{
    build_station_summaries, brand_key, ApiMessage, AppUser, AreaBreakdown, AuthResponse, AuthUser,
    ChatMessage, ChatQuery, DistrictDetailResponse, DistrictSummary, FeedItem, FeedRow, FuelMixRow,
    FuelMixSummary, InventoryCounts, LiveFeedResponse, LoginRequest, MapViewportResponse,
    NearbySearchQuery, NearbySearchResponse, NearbyStationResult, OverviewQuery, OverviewResponse,
    OverviewRow, OverviewTotals, PostChatMessage, ProvinceDetailResponse, ProvinceDistrictRow,
    ProvinceRef, RegisterRequest, RouteAvailableResponse, RouteQuery, ScopeBreakdownRow, SearchRow,
    StationFilterQuery, StationMapRow, StationSummary, StationUpdateRequest, ViewportQuery,
    ZoneStationsQuery,
};
use crate::state::AppState;

fn sanitize_scope(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn sanitize_limit(value: Option<i64>, default_value: i64, max_value: i64) -> i64 {
    value.map(|item| item.max(1).min(max_value)).unwrap_or(default_value)
}

fn sanitize_float(value: f64) -> f64 {
    if value.is_finite() {
        value
    } else {
        0.0
    }
}

fn build_station_filter_clause(filters: &StationFilterQuery) -> String {
    let mut clauses = vec!["1=1".to_string()];

    if let Some(region) = sanitize_scope(&filters.region) {
        clauses.push(format!("r.name = '{}'", region.replace('\'', "''")));
    }
    if let Some(province_slug) = sanitize_scope(&filters.province_slug) {
        clauses.push(format!("p.slug = '{}'", province_slug.replace('\'', "''")));
    }
    if let Some(district_slug) = sanitize_scope(&filters.district_slug) {
        clauses.push(format!("d.slug = '{}'", district_slug.replace('\'', "''")));
    }
    if let Some(brand) = sanitize_scope(&filters.brand) {
        clauses.push(format!("LOWER(s.brand) = LOWER('{}')", brand.replace('\'', "''")));
    }
    if let Some(status) = sanitize_scope(&filters.status) {
        clauses.push(format!("LOWER(fs.inventory_level) = LOWER('{}')", status.replace('\'', "''")));
    }
    if let Some(fuel_type) = sanitize_scope(&filters.fuel_type) {
        clauses.push(format!("LOWER(fs.fuel_type) = LOWER('{}')", fuel_type.replace('\'', "''")));
    }
    if let (Some(lat), Some(lng), Some(radius_km)) = (filters.lat, filters.lng, filters.radius_km) {
        clauses.push(format!(
            "(6371 * acos(LEAST(1, GREATEST(-1, cos(radians({lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians({lng})) + sin(radians({lat})) * sin(radians(s.latitude)))))) <= {radius_km}"
        ));
    }
    if let Some(name) = sanitize_scope(&filters.name) {
        let safe = name.replace('\'', "''");
        clauses.push(format!(
            "(s.name ILIKE '%{safe}%' OR s.brand ILIKE '%{safe}%' OR p.name ILIKE '%{safe}%' OR d.name ILIKE '%{safe}%')"
        ));
    }

    clauses.join(" AND ")
}

fn build_scope_clause(
    region: &Option<String>,
    province_slug: &Option<String>,
    district_slug: &Option<String>,
) -> String {
    let mut clauses = vec!["1=1".to_string()];

    if let Some(value) = sanitize_scope(region) {
        clauses.push(format!("r.name = '{}'", value.replace('\'', "''")));
    }
    if let Some(value) = sanitize_scope(province_slug) {
        clauses.push(format!("p.slug = '{}'", value.replace('\'', "''")));
    }
    if let Some(value) = sanitize_scope(district_slug) {
        clauses.push(format!("d.slug = '{}'", value.replace('\'', "''")));
    }

    clauses.join(" AND ")
}

fn to_inventory_counts(row: &OverviewRow) -> InventoryCounts {
    InventoryCounts {
        high: row.high_count,
        medium: row.medium_count,
        low: row.low_count,
        out: row.out_count,
        refilling: row.refilling_count,
    }
}

fn to_fuel_mix(rows: Vec<FuelMixRow>) -> Vec<FuelMixSummary> {
    rows.into_iter()
        .map(|row| FuelMixSummary {
            fuel_type: row.fuel_type,
            stations_with_fuel: row.stations_with_fuel,
            inventory_counts: InventoryCounts {
                high: row.high_count,
                medium: row.medium_count,
                low: row.low_count,
                out: row.out_count,
                refilling: row.refilling_count,
            },
            avg_price_per_liter: row.avg_price_per_liter.unwrap_or(0.0),
        })
        .collect()
}

fn build_map_response(
    scope_type: String,
    scope_name: String,
    north: f64,
    south: f64,
    east: f64,
    west: f64,
    rows: Vec<NearbyStationResult>,
) -> MapViewportResponse {
    let total_stations = rows
        .iter()
        .map(|row| row.station_id)
        .collect::<std::collections::HashSet<_>>()
        .len() as i64;
    let latest_update_at = rows.iter().map(|row| row.last_updated).max();
    let total_price = rows.iter().map(|row| row.price_per_liter).sum::<f64>();
    let count = rows.len() as f64;
    let mut inventory_counts = InventoryCounts {
        high: 0,
        medium: 0,
        low: 0,
        out: 0,
        refilling: 0,
    };

    for row in &rows {
        match row.inventory_level.as_str() {
            "high" => inventory_counts.high += 1,
            "medium" => inventory_counts.medium += 1,
            "low" => inventory_counts.low += 1,
            "out" => inventory_counts.out += 1,
            "refilling" => inventory_counts.refilling += 1,
            _ => {}
        }
    }

    MapViewportResponse {
        scope_type,
        scope_name,
        north,
        south,
        east,
        west,
        generated_at: Utc::now(),
        total_stations,
        returned_stations: rows.len(),
        nearby_stations: rows,
        inventory_counts,
        latest_update_at,
        average_price_per_liter: if count > 0.0 { total_price / count } else { 0.0 },
    }
}

pub async fn get_stations(
    State(state): State<AppState>,
    Query(filters): Query<StationFilterQuery>,
) -> Result<Json<Vec<StationSummary>>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let clause = build_station_filter_clause(&filters);
    let limit_clause = match filters.limit {
        Some(n) if n > 0 => format!(" LIMIT {}", n.min(5000)),
        _ => String::new(),
    };
    let sql = format!(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} ORDER BY s.last_updated DESC, s.id ASC{limit_clause}"
    );

    let rows = sqlx::query_as::<_, StationMapRow>(&sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    Ok(Json(build_station_summaries(rows)))
}

pub async fn get_map_data(
    state: State<AppState>,
    Query(mut filters): Query<StationFilterQuery>,
) -> Result<Json<Vec<StationSummary>>, (StatusCode, Json<ApiMessage>)> {
    // Cap at 500 for homepage overview — MVT tiles handle full station rendering
    if filters.limit.is_none() {
        filters.limit = Some(500);
    }
    get_stations(state, Query(filters)).await
}

pub async fn get_viewport_stations(
    State(state): State<AppState>,
    Query(query): Query<ViewportQuery>,
) -> Result<Json<MapViewportResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let north = sanitize_float(query.north);
    let south = sanitize_float(query.south);
    let east = sanitize_float(query.east);
    let west = sanitize_float(query.west);
    let limit = sanitize_limit(query.limit, 200, 2000);
    let lat = (north + south) / 2.0;
    let lng = (east + west) / 2.0;

    let mut clauses = vec![
        format!("s.latitude BETWEEN {south} AND {north}"),
        format!("s.longitude BETWEEN {west} AND {east}"),
    ];

    if let Some(brand) = sanitize_scope(&query.brand) {
        clauses.push(format!("LOWER(s.brand) = LOWER('{}')", brand.replace('\'', "''")));
    }
    if let Some(status) = sanitize_scope(&query.status) {
        clauses.push(format!("LOWER(fs.inventory_level) = LOWER('{}')", status.replace('\'', "''")));
    }
    if let Some(fuel_type) = sanitize_scope(&query.fuel_type) {
        clauses.push(format!("LOWER(fs.fuel_type) = LOWER('{}')", fuel_type.replace('\'', "''")));
    }

    let where_clause = clauses.join(" AND ");
    let sql = format!(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter, (6371 * acos(LEAST(1, GREATEST(-1, cos(radians({lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians({lng})) + sin(radians({lat})) * sin(radians(s.latitude)))))) AS distance_km FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {where_clause} ORDER BY distance_km ASC, s.last_updated DESC LIMIT {limit}"
    );

    let rows = sqlx::query_as::<_, SearchRow>(&sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    let nearby_stations = rows.into_iter().map(search_row_to_result).collect::<Vec<_>>();
    Ok(Json(build_map_response(
        "viewport".to_string(),
        format!("{north:.4},{south:.4},{east:.4},{west:.4}"),
        north,
        south,
        east,
        west,
        nearby_stations,
    )))
}

pub async fn get_zone_stations(
    State(state): State<AppState>,
    Query(query): Query<ZoneStationsQuery>,
) -> Result<Json<MapViewportResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let region = sanitize_scope(&query.region);
    let province_slug = sanitize_scope(&query.province_slug);
    let district_slug = sanitize_scope(&query.district_slug);
    let limit = sanitize_limit(query.limit, 60, 200);

    let mut clauses = vec!["1=1".to_string()];
    if let Some(region_value) = &region {
        clauses.push(format!("r.name = '{}'", region_value.replace('\'', "''")));
    }
    if let Some(province_value) = &province_slug {
        clauses.push(format!("p.slug = '{}'", province_value.replace('\'', "''")));
    }
    if let Some(district_value) = &district_slug {
        clauses.push(format!("d.slug = '{}'", district_value.replace('\'', "''")));
    }
    if let Some(brand) = sanitize_scope(&query.brand) {
        clauses.push(format!("LOWER(s.brand) = LOWER('{}')", brand.replace('\'', "''")));
    }
    if let Some(status) = sanitize_scope(&query.status) {
        clauses.push(format!("LOWER(fs.inventory_level) = LOWER('{}')", status.replace('\'', "''")));
    }
    if let Some(fuel_type) = sanitize_scope(&query.fuel_type) {
        clauses.push(format!("LOWER(fs.fuel_type) = LOWER('{}')", fuel_type.replace('\'', "''")));
    }

    let sql = format!(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter, 0.0::float8 AS distance_km FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {where_clause} ORDER BY s.last_updated DESC, s.id ASC LIMIT {limit}",
        where_clause = clauses.join(" AND ")
    );

    let rows = sqlx::query_as::<_, SearchRow>(&sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    let nearby_stations = rows.into_iter().map(search_row_to_result).collect::<Vec<_>>();
    let scope_name = province_slug
        .clone()
        .or(region.clone())
        .or(district_slug.clone())
        .unwrap_or_else(|| "selected zone".to_string());

    Ok(Json(build_map_response(
        "zone".to_string(),
        scope_name,
        0.0,
        0.0,
        0.0,
        0.0,
        nearby_stations,
    )))
}

pub async fn get_station_detail(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<StationSummary>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let rows = sqlx::query_as::<_, StationMapRow>(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE s.id = $1 ORDER BY fs.last_updated DESC"
    )
    .bind(id)
    .fetch_all(pool)
    .await
    .map_err(internal_error)?;

    let station = build_station_summaries(rows)
        .into_iter()
        .next()
        .ok_or_else(not_found_station)?;

    Ok(Json(station))
}

pub async fn get_province_detail(
    State(state): State<AppState>,
    Path(province_slug): Path<String>,
) -> Result<Json<ProvinceDetailResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let district_rows = sqlx::query_as::<_, ProvinceDistrictRow>(
        "SELECT p.id AS province_id, p.name AS province_name, p.slug AS province_slug, r.name AS region_name, d.id AS district_id, d.name AS district_name, d.slug AS district_slug, COUNT(s.id) AS district_station_count FROM provinces p JOIN regions r ON p.region_id = r.id JOIN districts d ON d.province_id = p.id LEFT JOIN stations s ON s.district_id = d.id WHERE p.slug = $1 GROUP BY p.id, p.name, p.slug, r.name, d.id, d.name, d.slug ORDER BY d.name ASC"
    )
    .bind(&province_slug)
    .fetch_all(pool)
    .await
    .map_err(internal_error)?;

    if district_rows.is_empty() {
        return Err(not_found("province not found"));
    }

    let station_rows = sqlx::query_as::<_, StationMapRow>(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE p.slug = $1 ORDER BY s.name ASC, fs.fuel_type ASC"
    )
    .bind(&province_slug)
    .fetch_all(pool)
    .await
    .map_err(internal_error)?;

    let head = &district_rows[0];
    let districts = district_rows
        .iter()
        .map(|row| DistrictSummary {
            id: row.district_id,
            name: row.district_name.clone(),
            slug: row.district_slug.clone(),
            station_count: row.district_station_count,
        })
        .collect::<Vec<_>>();
    let stations = build_station_summaries(station_rows);

    Ok(Json(ProvinceDetailResponse {
        id: head.province_id,
        name: head.province_name.clone(),
        slug: head.province_slug.clone(),
        region: head.region_name.clone(),
        district_count: districts.len(),
        station_count: stations.len(),
        districts,
        stations,
    }))
}

pub async fn get_district_detail(
    State(state): State<AppState>,
    Path((province_slug, district_slug)): Path<(String, String)>,
) -> Result<Json<DistrictDetailResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let district_meta = sqlx::query(
        "SELECT p.name AS province_name, p.slug AS province_slug, r.name AS region_name, d.id AS district_id, d.name AS district_name, d.slug AS district_slug, COUNT(s.id) AS station_count FROM districts d JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id LEFT JOIN stations s ON s.district_id = d.id WHERE p.slug = $1 AND d.slug = $2 GROUP BY p.name, p.slug, r.name, d.id, d.name, d.slug"
    )
    .bind(&province_slug)
    .bind(&district_slug)
    .fetch_optional(pool)
    .await
    .map_err(internal_error)?;

    let district_meta = district_meta.ok_or_else(|| not_found("district not found"))?;

    let station_rows = sqlx::query_as::<_, StationMapRow>(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, s.last_updated, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE p.slug = $1 AND d.slug = $2 ORDER BY s.last_updated DESC"
    )
    .bind(&province_slug)
    .bind(&district_slug)
    .fetch_all(pool)
    .await
    .map_err(internal_error)?;

    Ok(Json(DistrictDetailResponse {
        province: ProvinceRef {
            name: district_meta.get::<String, _>("province_name"),
            slug: district_meta.get::<String, _>("province_slug"),
            region: district_meta.get::<String, _>("region_name"),
        },
        district: DistrictSummary {
            id: district_meta.get::<i32, _>("district_id"),
            name: district_meta.get::<String, _>("district_name"),
            slug: district_meta.get::<String, _>("district_slug"),
            station_count: district_meta.get::<i64, _>("station_count"),
        },
        stations: build_station_summaries(station_rows),
    }))
}

pub async fn get_overview(
    State(state): State<AppState>,
    Query(query): Query<OverviewQuery>,
) -> Result<Json<OverviewResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let level = query.level.clone().unwrap_or_else(|| "national".to_string());
    let clause = build_scope_clause(&query.region, &query.province_slug, &query.district_slug);

    let totals_sql = format!(
        "SELECT COUNT(DISTINCT s.id) AS stations_total, COUNT(DISTINCT p.id) AS provinces_total, COUNT(DISTINCT d.id) AS districts_total, COUNT(*) FILTER (WHERE fs.last_updated >= NOW() - INTERVAL '24 HOURS') AS updates_last_24h, COUNT(*) FILTER (WHERE fs.inventory_level = 'high') AS high_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'medium') AS medium_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'low') AS low_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'out') AS out_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'refilling') AS refilling_count, AVG(fs.price_per_liter) AS avg_price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause}"
    );

    let totals = sqlx::query_as::<_, OverviewRow>(&totals_sql)
        .fetch_one(pool)
        .await
        .map_err(internal_error)?;

    let fuel_mix_sql = format!(
        "SELECT fs.fuel_type, COUNT(DISTINCT fs.station_id) AS stations_with_fuel, COUNT(*) FILTER (WHERE fs.inventory_level = 'high') AS high_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'medium') AS medium_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'low') AS low_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'out') AS out_count, COUNT(*) FILTER (WHERE fs.inventory_level = 'refilling') AS refilling_count, AVG(fs.price_per_liter) AS avg_price_per_liter FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} GROUP BY fs.fuel_type ORDER BY fs.fuel_type ASC"
    );

    let fuel_mix_rows = sqlx::query_as::<_, FuelMixRow>(&fuel_mix_sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    let breakdown_sql = match level.as_str() {
        "region" => format!(
            "SELECT p.name AS area_name, p.slug AS area_slug, COUNT(DISTINCT s.id) AS stations_count, COUNT(*) FILTER (WHERE fs.inventory_level IN ('low', 'out')) AS low_or_out_count, COUNT(*) FILTER (WHERE fs.last_updated >= NOW() - INTERVAL '24 HOURS') AS updates_last_24h FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} GROUP BY p.name, p.slug ORDER BY stations_count DESC, p.name ASC"
        ),
        "province" => format!(
            "SELECT d.name AS area_name, d.slug AS area_slug, COUNT(DISTINCT s.id) AS stations_count, COUNT(fs.id) FILTER (WHERE fs.inventory_level IN ('low', 'out')) AS low_or_out_count, COUNT(fs.id) FILTER (WHERE fs.last_updated >= NOW() - INTERVAL '24 HOURS') AS updates_last_24h FROM districts d JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id LEFT JOIN stations s ON s.district_id = d.id LEFT JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} GROUP BY d.name, d.slug ORDER BY stations_count DESC, d.name ASC"
        ),
        "district" => format!(
            "SELECT s.name AS area_name, CAST(s.id AS TEXT) AS area_slug, 1::BIGINT AS stations_count, COUNT(*) FILTER (WHERE fs.inventory_level IN ('low', 'out')) AS low_or_out_count, COUNT(*) FILTER (WHERE fs.last_updated >= NOW() - INTERVAL '24 HOURS') AS updates_last_24h FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} GROUP BY s.id, s.name ORDER BY updates_last_24h DESC, s.name ASC"
        ),
        _ => format!(
            "SELECT r.name AS area_name, LOWER(REPLACE(r.name, ' ', '-')) AS area_slug, COUNT(DISTINCT s.id) AS stations_count, COUNT(*) FILTER (WHERE fs.inventory_level IN ('low', 'out')) AS low_or_out_count, COUNT(*) FILTER (WHERE fs.last_updated >= NOW() - INTERVAL '24 HOURS') AS updates_last_24h FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE {clause} GROUP BY r.name ORDER BY stations_count DESC, r.name ASC"
        ),
    };

    let breakdown_rows = sqlx::query_as::<_, ScopeBreakdownRow>(&breakdown_sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    let scope_name = match level.as_str() {
        "district" => query.district_slug.clone().unwrap_or_else(|| "district".to_string()),
        "province" => query.province_slug.clone().unwrap_or_else(|| "province".to_string()),
        "region" => query.region.clone().unwrap_or_else(|| "region".to_string()),
        _ => "Thailand".to_string(),
    };

    Ok(Json(OverviewResponse {
        scope_level: level,
        scope_name,
        region: query.region.clone(),
        province_slug: query.province_slug.clone(),
        district_slug: query.district_slug.clone(),
        generated_at: Utc::now(),
        totals: OverviewTotals {
            stations_total: totals.stations_total,
            provinces_total: totals.provinces_total,
            districts_total: totals.districts_total,
            updates_last_24h: totals.updates_last_24h,
            inventory_counts: to_inventory_counts(&totals),
            avg_price_per_liter: totals.avg_price_per_liter.unwrap_or(0.0),
        },
        fuel_mix: to_fuel_mix(fuel_mix_rows),
        breakdown: breakdown_rows
            .into_iter()
            .map(|row| AreaBreakdown {
                area_name: row.area_name,
                area_slug: row.area_slug,
                stations_count: row.stations_count,
                low_or_out_count: row.low_or_out_count,
                updates_last_24h: row.updates_last_24h,
            })
            .collect(),
    }))
}

pub async fn search_nearby_stations(
    State(state): State<AppState>,
    Query(query): Query<NearbySearchQuery>,
) -> Result<Json<NearbySearchResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let radius = query.radius_km.unwrap_or(25.0);
    let fuel_clause = if let Some(fuel_type) = sanitize_scope(&query.fuel_type) {
        format!("AND LOWER(fs.fuel_type) = LOWER('{}')", fuel_type.replace('\'', "''"))
    } else {
        String::new()
    };

    let sql = format!(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter, fs.last_updated, (6371 * acos(LEAST(1, GREATEST(-1, cos(radians({lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians({lng})) + sin(radians({lat})) * sin(radians(s.latitude)))))) AS distance_km FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE fs.inventory_level IN ('high', 'medium', 'low', 'refilling') {fuel_clause} AND (6371 * acos(LEAST(1, GREATEST(-1, cos(radians({lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians({lng})) + sin(radians({lat})) * sin(radians(s.latitude)))))) <= {radius} ORDER BY distance_km ASC, fs.last_updated DESC LIMIT 25",
        lat = query.lat,
        lng = query.lng,
        radius = radius,
    );

    let rows = sqlx::query_as::<_, SearchRow>(&sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    Ok(Json(NearbySearchResponse {
        origin_lat: query.lat,
        origin_lng: query.lng,
        radius_km: radius,
        fuel_type: query.fuel_type.clone(),
        results: rows.into_iter().map(search_row_to_result).collect(),
    }))
}

pub async fn get_available_route_stations(
    State(state): State<AppState>,
    Query(query): Query<RouteQuery>,
) -> Result<Json<RouteAvailableResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let sql = format!(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, r.name AS region, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, s.address, s.latitude, s.longitude, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.price_per_liter, fs.last_updated, (6371 * acos(LEAST(1, GREATEST(-1, cos(radians({lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians({lng})) + sin(radians({lat})) * sin(radians(s.latitude)))))) AS distance_km FROM stations s JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id JOIN regions r ON p.region_id = r.id JOIN fuel_status fs ON fs.station_id = s.id WHERE LOWER(fs.fuel_type) = LOWER('{fuel_type}') AND fs.inventory_level IN ('high', 'medium', 'refilling', 'low') ORDER BY distance_km ASC, fs.amount_liters DESC LIMIT 20",
        lat = query.origin_lat,
        lng = query.origin_lng,
        fuel_type = query.fuel_type.replace('\'', "''"),
    );

    let rows = sqlx::query_as::<_, SearchRow>(&sql)
        .fetch_all(pool)
        .await
        .map_err(internal_error)?;

    let stations = rows.into_iter().map(search_row_to_result).collect::<Vec<_>>();

    Ok(Json(RouteAvailableResponse {
        origin_lat: query.origin_lat,
        origin_lng: query.origin_lng,
        fuel_type: query.fuel_type,
        total_results: stations.len(),
        stations,
    }))
}

pub async fn get_live_feed(
    State(state): State<AppState>,
) -> Result<Json<LiveFeedResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let rows = sqlx::query_as::<_, FeedRow>(
        "SELECT s.id AS station_id, s.name AS station_name, s.brand, p.name AS province, p.slug AS province_slug, d.name AS district, d.slug AS district_slug, fs.fuel_type, fs.inventory_level, fs.amount_liters, fs.note, fs.updated_by, fs.last_updated FROM fuel_status fs JOIN stations s ON fs.station_id = s.id JOIN districts d ON s.district_id = d.id JOIN provinces p ON d.province_id = p.id ORDER BY fs.last_updated DESC LIMIT 30"
    )
    .fetch_all(pool)
    .await
    .map_err(internal_error)?;

    let items = rows
        .into_iter()
        .map(|row| {
            let (alert_level, auto_message) = match row.inventory_level.as_str() {
                "out" => (
                    "danger".to_string(),
                    format!("{} หมด {}", row.station_name, row.fuel_type),
                ),
                "low" => (
                    "warning".to_string(),
                    format!("{} {} เหลือน้อย ({:.0} ลิตร)", row.station_name, row.fuel_type, row.amount_liters),
                ),
                "refilling" => (
                    "normal".to_string(),
                    format!("{} กำลังเติม {}", row.station_name, row.fuel_type),
                ),
                "medium" => (
                    "warning".to_string(),
                    format!("{} {} เหลือปานกลาง", row.station_name, row.fuel_type),
                ),
                _ => (
                    "normal".to_string(),
                    format!("{} อัปเดต {} ({:.0} ลิตร)", row.station_name, row.fuel_type, row.amount_liters),
                ),
            };

            // Use staff note as message if available and meaningful
            let message = row.note
                .as_deref()
                .filter(|n| !n.is_empty() && *n != "manual dashboard update")
                .map(|n| n.to_string())
                .unwrap_or(auto_message);

            FeedItem {
                station_id: row.station_id,
                station_name: row.station_name,
                brand: row.brand,
                province: row.province,
                province_slug: row.province_slug,
                district: row.district,
                district_slug: row.district_slug,
                fuel_type: row.fuel_type,
                inventory_level: row.inventory_level,
                amount_liters: row.amount_liters,
                last_updated: row.last_updated,
                alert_level,
                message,
                updated_by: row.updated_by,
            }
        })
        .collect();

    Ok(Json(LiveFeedResponse {
        generated_at: Utc::now(),
        items,
    }))
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM app_users WHERE email = $1")
        .bind(&payload.email)
        .fetch_one(pool)
        .await
        .map_err(internal_error)?;

    if existing > 0 {
        return Err((StatusCode::CONFLICT, Json(ApiMessage { message: "email already exists".to_string() })));
    }

    let password = payload.password.clone();
    let hashed = tokio::task::spawn_blocking(move || bcrypt::hash(password, bcrypt::DEFAULT_COST))
        .await
        .map_err(|_| internal_error(sqlx::Error::RowNotFound))?
        .map_err(|_| internal_error(sqlx::Error::RowNotFound))?;

    let user = sqlx::query_as::<_, AppUser>(
        "INSERT INTO app_users (name, email, password, role, station_id) VALUES ($1, $2, $3, 'staff', $4) RETURNING id, name, email, password, role, station_id, province_slug, created_at"
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&hashed)
    .bind(payload.station_id)
    .fetch_one(pool)
    .await
    .map_err(internal_error)?;

    let claims = crate::auth::Claims {
        sub: user.id,
        name: user.name.clone(),
        role: user.role.clone(),
        station_id: user.station_id,
        province_slug: user.province_slug.clone(),
        exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
    };
    let token = crate::auth::encode_token(&claims, &state.jwt_secret)
        .map_err(|_| internal_error(sqlx::Error::RowNotFound))?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: AuthUser {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                station_id: user.station_id,
                province_slug: user.province_slug,
            },
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let user = sqlx::query_as::<_, AppUser>(
        "SELECT id, name, email, password, role, station_id, province_slug, created_at FROM app_users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_optional(pool)
    .await
    .map_err(internal_error)?;

    let invalid = || (StatusCode::UNAUTHORIZED, Json(ApiMessage { message: "invalid credentials".to_string() }));

    let user = user.ok_or_else(invalid)?;

    let password_input = payload.password.clone();
    let hash = user.password.clone();
    let valid = tokio::task::spawn_blocking(move || bcrypt::verify(password_input, &hash))
        .await
        .map_err(|_| invalid())?
        .unwrap_or(false);

    if !valid {
        return Err(invalid());
    }

    let claims = crate::auth::Claims {
        sub: user.id,
        name: user.name.clone(),
        role: user.role.clone(),
        station_id: user.station_id,
        province_slug: user.province_slug.clone(),
        exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
    };
    let token = crate::auth::encode_token(&claims, &state.jwt_secret)
        .map_err(|_| invalid())?;

    Ok(Json(AuthResponse {
        token,
        user: AuthUser {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            station_id: user.station_id,
            province_slug: user.province_slug,
        },
    }))
}

pub async fn update_fuel_status(
    AuthClaims(claims): AuthClaims,
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<StationUpdateRequest>,
) -> Result<Json<ApiMessage>, (StatusCode, Json<ApiMessage>)> {
    let pool = &state.pool;
    let realtime = &state.realtime_hub;

    // Scope enforcement
    let allowed = match claims.role.as_str() {
        "admin" => true,
        "province_manager" => {
            let station_province = sqlx::query_scalar::<_, String>(
                "SELECT p.slug FROM stations s \
                 JOIN districts d ON s.district_id = d.id \
                 JOIN provinces p ON d.province_id = p.id \
                 WHERE s.id = $1"
            )
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(internal_error)?;
            station_province.as_deref() == claims.province_slug.as_deref()
        }
        "staff" => claims.station_id == Some(id),
        _ => false,
    };

    if !allowed {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ApiMessage { message: "unauthorized for this station".to_string() }),
        ));
    }

    let valid_level = matches!(
        payload.inventory_level.as_str(),
        "high" | "medium" | "low" | "out" | "refilling"
    );
    if !valid_level {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiMessage {
                message: "inventory_level must be high, medium, low, out, or refilling".to_string(),
            }),
        ));
    }

    let station_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM stations WHERE id = $1")
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(internal_error)?;

    if station_exists == 0 {
        return Err(not_found("station not found"));
    }

    let amount_liters = payload.amount_liters.unwrap_or(0.0);

    sqlx::query(
        "INSERT INTO fuel_status (station_id, fuel_type, inventory_level, amount_liters, price_per_liter, updated_by, note, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (station_id, fuel_type) DO UPDATE SET inventory_level = EXCLUDED.inventory_level, amount_liters = EXCLUDED.amount_liters, price_per_liter = EXCLUDED.price_per_liter, updated_by = EXCLUDED.updated_by, note = EXCLUDED.note, last_updated = NOW()"
    )
    .bind(id)
    .bind(&payload.fuel_type)
    .bind(&payload.inventory_level)
    .bind(amount_liters)
    .bind(payload.price_per_liter)
    .bind(&claims.name)
    .bind(payload.note.clone().unwrap_or_else(|| "manual dashboard update".to_string()))
    .execute(pool)
    .await
    .map_err(internal_error)?;

    sqlx::query("UPDATE stations SET last_updated = NOW() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(internal_error)?;

    let refresh_scope = serde_json::json!({
        "station_id": id,
        "fuel_type": payload.fuel_type,
        "inventory_level": payload.inventory_level,
        "price_per_liter": payload.price_per_liter,
        "updated_by": claims.name,
        "note": payload.note,
    })
    .to_string();

    realtime
        .publish_update(
            id,
            "fuel_status_updated",
            "map:station",
            format!("station {} fuel status updated", id),
        )
        .await;
    realtime
        .publish_snapshot("station:update", "map:station", Some(id), refresh_scope)
        .await;

    Ok(Json(ApiMessage {
        message: "fuel status updated".to_string(),
    }))
}

fn search_row_to_result(row: SearchRow) -> NearbyStationResult {
    NearbyStationResult {
        station_id: row.station_id,
        station_name: row.station_name,
        brand: brand_key(&row.brand),
        region: row.region,
        province: row.province,
        province_slug: row.province_slug,
        district: row.district,
        district_slug: row.district_slug,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        fuel_type: row.fuel_type,
        inventory_level: row.inventory_level,
        amount_liters: row.amount_liters,
        price_per_liter: row.price_per_liter,
        last_updated: row.last_updated,
        distance_km: row.distance_km,
    }
}

fn internal_error(error: sqlx::Error) -> (StatusCode, Json<ApiMessage>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiMessage {
            message: format!("database error: {error}"),
        }),
    )
}

fn not_found(message: &str) -> (StatusCode, Json<ApiMessage>) {
    (
        StatusCode::NOT_FOUND,
        Json(ApiMessage {
            message: message.to_string(),
        }),
    )
}

fn not_found_station() -> (StatusCode, Json<ApiMessage>) {
    not_found("station not found")
}
// ── Chat handlers ─────────────────────────────────────────────────────────────

pub async fn get_chat_messages(
    State(app_state): State<AppState>,
    Query(params): Query<ChatQuery>,
) -> Result<Json<Vec<ChatMessage>>, StatusCode> {
    let limit = sanitize_limit(params.limit, 50, 200);

    let messages = match sanitize_scope(&params.province_slug) {
        Some(slug) => sqlx::query_as::<_, ChatMessage>(
            "SELECT id, sender, role, avatar, province_slug, text, sent_at
             FROM chat_messages
             WHERE province_slug = $1 OR province_slug IS NULL
             ORDER BY sent_at ASC
             LIMIT $2",
        )
        .bind(slug)
        .bind(limit)
        .fetch_all(&app_state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,

        None => sqlx::query_as::<_, ChatMessage>(
            "SELECT id, sender, role, avatar, province_slug, text, sent_at
             FROM chat_messages
             ORDER BY sent_at ASC
             LIMIT $1",
        )
        .bind(limit)
        .fetch_all(&app_state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
    };

    Ok(Json(messages))
}

pub async fn post_chat_message(
    State(app_state): State<AppState>,
    Json(payload): Json<PostChatMessage>,
) -> Result<Json<ChatMessage>, StatusCode> {
    let text: String = payload.text.trim().chars().take(500).collect();
    if text.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let sender: String = payload.sender.trim().chars().take(100).collect();
    let role: String = payload
        .role
        .unwrap_or_else(|| "เจ้าหน้าที่".to_string())
        .trim()
        .chars()
        .take(100)
        .collect();
    let default_avatar = sender.chars().next().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string());
    let avatar: String = payload
        .avatar
        .unwrap_or(default_avatar)
        .trim()
        .chars()
        .take(10)
        .collect();

    let msg = sqlx::query_as::<_, ChatMessage>(
        "INSERT INTO chat_messages (sender, role, avatar, province_slug, text)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, sender, role, avatar, province_slug, text, sent_at",
    )
    .bind(&sender)
    .bind(&role)
    .bind(&avatar)
    .bind(&payload.province_slug)
    .bind(&text)
    .fetch_one(&app_state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    app_state
        .realtime_hub
        .publish_chat(
            msg.id,
            &msg.sender,
            &msg.role,
            &msg.avatar,
            msg.province_slug.clone(),
            &msg.text,
            msg.sent_at,
        )
        .await;

    Ok(Json(msg))
}

// ── Pure-Rust MVT encoder (no PostGIS required) ──────────────────────────────

fn mvt_varint(mut v: u64) -> Vec<u8> {
    let mut out = Vec::with_capacity(10);
    loop {
        let b = (v & 0x7f) as u8;
        v >>= 7;
        if v == 0 { out.push(b); break; }
        out.push(b | 0x80);
    }
    out
}
fn mvt_zigzag(v: i64) -> u64 { ((v << 1) ^ (v >> 63)) as u64 }

/// Write protobuf field: wire-type 0 (varint)
fn pb_u64(field: u32, v: u64) -> Vec<u8> {
    let mut b = mvt_varint(((field as u64) << 3) | 0);
    b.extend(mvt_varint(v)); b
}
/// Write protobuf field: wire-type 2 (length-delimited)
fn pb_bytes(field: u32, data: &[u8]) -> Vec<u8> {
    let mut b = mvt_varint(((field as u64) << 3) | 2);
    b.extend(mvt_varint(data.len() as u64));
    b.extend_from_slice(data); b
}
/// Packed repeated uint32
fn pb_packed(field: u32, vals: &[u32]) -> Vec<u8> {
    let mut data = Vec::new();
    for &v in vals { data.extend(mvt_varint(v as u64)); }
    pb_bytes(field, &data)
}

/// Convert tile (z,x,y) → (lat_min, lat_max, lon_min, lon_max)
fn tile_to_bbox(z: i32, x: i32, y: i32) -> (f64, f64, f64, f64) {
    use std::f64::consts::PI;
    let n = (1u64 << (z as u32)) as f64;
    let lon_min = x as f64 / n * 360.0 - 180.0;
    let lon_max = (x as f64 + 1.0) / n * 360.0 - 180.0;
    let lat_max = (PI * (1.0 - 2.0 * y as f64 / n)).sinh().atan().to_degrees();
    let lat_min = (PI * (1.0 - 2.0 * (y as f64 + 1.0) / n)).sinh().atan().to_degrees();
    (lat_min, lat_max, lon_min, lon_max)
}

/// Project lat/lng → tile pixel coords (0..4096)
fn project(lat: f64, lon: f64, lat_min: f64, lat_max: f64, lon_min: f64, lon_max: f64) -> (i32, i32) {
    let tx = ((lon - lon_min) / (lon_max - lon_min) * 4096.0) as i32;
    let ty = ((1.0 - (lat - lat_min) / (lat_max - lat_min)) * 4096.0) as i32;
    (tx.clamp(0, 4095), ty.clamp(0, 4095))
}

/// Build a complete MVT binary from station rows
fn build_mvt(rows: &[(i64, String, String, f64, f64)],
             lat_min: f64, lat_max: f64, lon_min: f64, lon_max: f64) -> Vec<u8> {
    // Shared value pool (string_value = proto field 1)
    let mut pool: Vec<Vec<u8>> = Vec::new();
    let mut pool_idx: std::collections::HashMap<String, u32> = Default::default();
    let mut intern = |pool: &mut Vec<Vec<u8>>,
                      idx: &mut std::collections::HashMap<String, u32>,
                      s: &str| -> u32 {
        if let Some(&i) = idx.get(s) { return i; }
        let i = pool.len() as u32;
        pool.push(pb_bytes(1, s.as_bytes())); // string_value field 1
        idx.insert(s.to_string(), i);
        i
    };

    let mut features: Vec<Vec<u8>> = Vec::new();
    for &(id, ref brand, ref status, lat, lon) in rows {
        let (tx, ty) = project(lat, lon, lat_min, lat_max, lon_min, lon_max);
        let id_s = id.to_string();
        let vi = intern(&mut pool, &mut pool_idx, &id_s);
        let vb = intern(&mut pool, &mut pool_idx, brand);
        let vs = intern(&mut pool, &mut pool_idx, status);

        // tags: [key_idx, val_idx, ...]  keys: 0=id 1=brand 2=status
        let tags = [0u32, vi, 1, vb, 2, vs];
        // POINT geometry: MoveTo(1) + zigzag(tx) + zigzag(ty)
        let geom = [9u32, mvt_zigzag(tx as i64) as u32, mvt_zigzag(ty as i64) as u32];

        let mut feat = Vec::new();
        feat.extend(pb_u64(1, id as u64));   // id
        feat.extend(pb_packed(2, &tags));     // tags
        feat.extend(pb_u64(3, 1));            // type = POINT
        feat.extend(pb_packed(4, &geom));     // geometry
        features.push(feat);
    }

    let mut layer = Vec::new();
    layer.extend(pb_u64(15, 2));                          // version = 2
    layer.extend(pb_bytes(1, b"stations"));               // name
    layer.extend(pb_u64(5, 4096));                        // extent
    for key in &["id", "brand", "status"] {
        layer.extend(pb_bytes(3, key.as_bytes()));        // keys
    }
    for v in &pool {
        layer.extend(pb_bytes(4, v));                     // values
    }
    for f in &features {
        layer.extend(pb_bytes(2, f));                     // features
    }
    pb_bytes(3, &layer) // Tile.layers field 3
}

/// GET /api/tiles/{z}/{x}/{y}
/// Pure-Rust MVT encoder — no PostGIS dependency.
pub async fn get_station_tile(
    State(state): State<AppState>,
    Path((z, x, y)): Path<(i32, i32, i32)>,
) -> Response<Body> {
    let (lat_min, lat_max, lon_min, lon_max) = tile_to_bbox(z, x, y);

    let rows = sqlx::query_as::<_, (i64, String, String, f64, f64)>(
        r#"
        SELECT
            s.id,
            s.brand,
            COALESCE(
                CASE
                    WHEN bool_or(fs.inventory_level = 'out')       THEN 'out'
                    WHEN bool_or(fs.inventory_level = 'low')       THEN 'low'
                    WHEN bool_or(fs.inventory_level = 'refilling') THEN 'refilling'
                    ELSE 'ok'
                END,
                'unknown'
            ) AS status,
            s.latitude,
            s.longitude
        FROM stations s
        LEFT JOIN fuel_status fs ON fs.station_id = s.id
        WHERE s.latitude  BETWEEN $1 AND $2
          AND s.longitude BETWEEN $3 AND $4
        GROUP BY s.id, s.brand, s.latitude, s.longitude
        "#,
    )
    .bind(lat_min)
    .bind(lat_max)
    .bind(lon_min)
    .bind(lon_max)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let bytes = build_mvt(&rows, lat_min, lat_max, lon_min, lon_max);
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/x-protobuf")
                .header("Cache-Control", "public, max-age=30, stale-while-revalidate=60")
                .body(Body::from(bytes))
                .unwrap()
        }
        Err(e) => {
            tracing::error!("MVT tile error z={z} x={x} y={y}: {e}");
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::empty())
                .unwrap()
        }
    }
}
