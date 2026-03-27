use crate::realtime::RealtimeHub;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub realtime_hub: RealtimeHub,
    pub jwt_secret: String,
}
