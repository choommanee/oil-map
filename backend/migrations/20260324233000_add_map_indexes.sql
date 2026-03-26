CREATE INDEX IF NOT EXISTS idx_provinces_region_id_slug ON provinces (region_id, slug);
CREATE INDEX IF NOT EXISTS idx_districts_province_id_slug ON districts (province_id, slug);
CREATE INDEX IF NOT EXISTS idx_stations_district_id_last_updated ON stations (district_id, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_stations_latitude_longitude ON stations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fuel_status_station_id_last_updated ON fuel_status (station_id, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_status_fuel_type_inventory_level_last_updated ON fuel_status (fuel_type, inventory_level, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_status_inventory_level_last_updated ON fuel_status (inventory_level, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);