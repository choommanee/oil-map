-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add Geometry column to stations
-- Using 4326 (WGS 84) for standard lat/lng
ALTER TABLE stations ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- 3. Populate geom from existing latitude and longitude
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;

-- 4. Create Spatial Index (GiST) for fast spatial queries
CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom);

-- 5. Add a constraint to keep latitude/longitude in sync with geom if updated manually (optional)
-- Or we can rely on application-level triggers/logic.
