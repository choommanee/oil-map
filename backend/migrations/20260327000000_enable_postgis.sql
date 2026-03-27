DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS not available — spatial column skipped';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326)';
    EXECUTE 'UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom)';
  END IF;
END;
$$;
