CREATE OR REPLACE FUNCTION sync_station_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_station_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON stations
FOR EACH ROW EXECUTE FUNCTION sync_station_geom();
