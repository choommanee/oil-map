use serde::{Serialize, Deserialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct GasStation {
    pub id: i32,
    pub name: String,
    pub brand: String, // PTT, Shell, Bangchak, etc.
    pub address: String,
    pub province: String,
    pub district: String,
    pub latitude: f64,
    pub longitude: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct FuelStatus {
    pub id: i32,
    pub station_id: i32,
    pub fuel_type: String, // Gasohol 95, 91, E20, E85, Benzine 95, Diesel B7, B20, Premium
    pub amount_liters: f64,
    pub status: String, // Normal, Low, Out of Stock, Refilling
    pub price_per_liter: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StationWithFuel {
    #[serde(flatten)]
    pub station: GasStation,
    pub fuels: Vec<FuelStatus>,
}
