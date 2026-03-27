DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE $s$
      CREATE OR REPLACE FUNCTION sync_station_geom()
      RETURNS TRIGGER LANGUAGE plpgsql AS $f$
      BEGIN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        RETURN NEW;
      END;
      $f$
    $s$;
    EXECUTE 'DROP TRIGGER IF EXISTS trg_station_geom ON stations';
    EXECUTE $s$
      CREATE TRIGGER trg_station_geom
      BEFORE INSERT OR UPDATE OF latitude, longitude ON stations
      FOR EACH ROW EXECUTE FUNCTION sync_station_geom()
    $s$;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Geom trigger skipped: %', SQLERRM;
END;
$$;
