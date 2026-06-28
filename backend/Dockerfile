# ---- Build stage ----
# rust:1-slim-bookworm tracks the latest Rust 1.x stable (>= 1.85),
# so edition-2024 deps (e.g. time 0.3.47) compile fine.
FROM rust:1-slim-bookworm AS builder
WORKDIR /app

# C toolchain + pkg-config for crates that build native code (ring via jsonwebtoken)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# migrations/ are embedded at compile time via sqlx::migrate!("./migrations")
RUN cargo build --release

# ---- Runtime stage ----
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# Railway injects PORT at runtime; main.rs falls back to 8080 and binds 0.0.0.0
CMD ["backend"]
