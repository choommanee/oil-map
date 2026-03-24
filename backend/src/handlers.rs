use axum::{
    extract::{Path, State},
    Json,
    http::StatusCode,
};
use sqlx::PgPool;
use crate::models::{GasStation, FuelStatus, StationWithFuel};

pub async fn get_stations(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<GasStation>>, (StatusCode, String)> {
    let stations = sqlx::query_as::<_, GasStation>("SELECT * FROM gas_stations")
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(stations))
}

pub async fn get_station_detail(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<StationWithFuel>, (StatusCode, String)> {
    let station = sqlx::query_as::<_, GasStation>("SELECT * FROM gas_stations WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    let fuels = sqlx::query_as::<_, FuelStatus>("SELECT * FROM fuel_status WHERE station_id = $1")
        .bind(id)
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StationWithFuel { station, fuels }))
}

pub async fn update_fuel_status(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<FuelStatus>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query(
        "UPDATE fuel_status SET amount_liters = $1, status = $2, last_updated = NOW() WHERE station_id = $3 AND fuel_type = $4"
    )
    .bind(payload.amount_liters)
    .bind(payload.status)
    .bind(id)
    .bind(payload.fuel_type)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}
