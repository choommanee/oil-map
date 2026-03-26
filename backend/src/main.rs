use std::env;
use std::time::Duration;

use axum::{
    extract::{ws::WebSocketUpgrade, State},
    http::header::{CACHE_CONTROL, HeaderValue},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;

use state::AppState;

mod handlers;
mod models;
mod realtime;
mod state;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(80)
        .min_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    // Run database migrations automatically on startup
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let realtime_hub = realtime::RealtimeHub::new();
    let app_state = AppState {
        pool,
        realtime_hub: realtime_hub.clone(),
    };

    // Routes that can be cached by CDN / browser (data changes at most every ~30s)
    let cached_routes = Router::new()
        .route("/api/map", get(handlers::get_map_data))
        .route("/api/map/viewport", get(handlers::get_viewport_stations))
        .route("/api/map/zone", get(handlers::get_zone_stations))
        .route("/api/overview", get(handlers::get_overview))
        .route("/api/stations", get(handlers::get_stations))
        .route("/api/provinces/{province_slug}", get(handlers::get_province_detail))
        .route(
            "/api/provinces/{province_slug}/districts/{district_slug}",
            get(handlers::get_district_detail),
        )
        .layer(SetResponseHeaderLayer::overriding(
            CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=30, stale-while-revalidate=60"),
        ));

    // Routes that must always be fresh (realtime data + mutations)
    let live_routes = Router::new()
        .route("/api/feeds/live", get(handlers::get_live_feed))
        .route("/api/chat/messages", get(handlers::get_chat_messages))
        .route("/api/chat/messages", post(handlers::post_chat_message))
        .route("/api/stations/search", get(handlers::search_nearby_stations))
        .route("/api/routes/available", get(handlers::get_available_route_stations))
        .route("/api/stations/{id}", get(handlers::get_station_detail))
        .route("/api/stations/{id}/update", post(handlers::update_fuel_status))
        .route("/api/auth/register", post(handlers::register))
        .route("/api/auth/login", post(handlers::login))
        .layer(SetResponseHeaderLayer::overriding(
            CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ));

    let app = Router::new()
        .route("/ws/realtime", get(realtime_ws_handler))
        .merge(cached_routes)
        .merge(live_routes)
        .layer(CompressionLayer::new())
        .layer(cors)
        .with_state(app_state);

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("Failed to bind port");
    tracing::info!("listening on {}", addr);

    axum::serve(listener, app).await.unwrap();
}

async fn realtime_ws_handler(
    ws: WebSocketUpgrade,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let realtime_hub = app_state.realtime_hub.clone();
    ws.on_upgrade(move |socket| async move {
        realtime::socket_handler(socket, realtime_hub).await;
    })
}
