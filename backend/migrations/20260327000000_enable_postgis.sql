CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE stations ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;

CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom);
