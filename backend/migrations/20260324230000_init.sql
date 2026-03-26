DROP TABLE IF EXISTS fuel_status CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    UNIQUE (province_id, slug)
);

CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fuel_status (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(80) NOT NULL,
    inventory_level VARCHAR(20) NOT NULL CHECK (inventory_level IN ('high', 'medium', 'low', 'out', 'refilling')),
    amount_liters DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_per_liter DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_by VARCHAR(120),
    note TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, fuel_type)
);

CREATE TABLE app_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(160) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provinces_region_id ON provinces(region_id);
CREATE INDEX idx_districts_province_id ON districts(province_id);
CREATE INDEX idx_districts_slug ON districts(slug);
CREATE INDEX idx_stations_district_id ON stations(district_id);
CREATE INDEX idx_stations_location ON stations(latitude, longitude);
CREATE INDEX idx_stations_last_updated ON stations(last_updated DESC);
CREATE INDEX idx_fuel_status_station_id ON fuel_status(station_id);
CREATE INDEX idx_fuel_status_fuel_type ON fuel_status(fuel_type);
CREATE INDEX idx_fuel_status_inventory_level ON fuel_status(inventory_level);
CREATE INDEX idx_fuel_status_last_updated ON fuel_status(last_updated DESC);
CREATE INDEX idx_app_users_station_id ON app_users(station_id);

INSERT INTO regions (name) VALUES
('North'),
('Northeast'),
('Central'),
('East'),
('South');

INSERT INTO provinces (region_id, name, slug) VALUES
((SELECT id FROM regions WHERE name = 'Central'), 'Bangkok', 'bangkok'),
((SELECT id FROM regions WHERE name = 'Central'), 'Nonthaburi', 'nonthaburi'),
((SELECT id FROM regions WHERE name = 'North'), 'Chiang Mai', 'chiang-mai'),
((SELECT id FROM regions WHERE name = 'Northeast'), 'Khon Kaen', 'khon-kaen'),
((SELECT id FROM regions WHERE name = 'East'), 'Chonburi', 'chonburi'),
((SELECT id FROM regions WHERE name = 'South'), 'Phuket', 'phuket');

INSERT INTO districts (province_id, name, slug) VALUES
((SELECT id FROM provinces WHERE slug = 'bangkok'), 'Chatuchak', 'chatuchak'),
((SELECT id FROM provinces WHERE slug = 'bangkok'), 'Huai Khwang', 'huai-khwang'),
((SELECT id FROM provinces WHERE slug = 'bangkok'), 'Bang Khen', 'bang-khen'),
((SELECT id FROM provinces WHERE slug = 'nonthaburi'), 'Mueang Nonthaburi', 'mueang-nonthaburi'),
((SELECT id FROM provinces WHERE slug = 'nonthaburi'), 'Pak Kret', 'pak-kret'),
((SELECT id FROM provinces WHERE slug = 'chiang-mai'), 'Mueang Chiang Mai', 'mueang-chiang-mai'),
((SELECT id FROM provinces WHERE slug = 'chiang-mai'), 'Hang Dong', 'hang-dong'),
((SELECT id FROM provinces WHERE slug = 'khon-kaen'), 'Mueang Khon Kaen', 'mueang-khon-kaen'),
((SELECT id FROM provinces WHERE slug = 'khon-kaen'), 'Ban Phai', 'ban-phai'),
((SELECT id FROM provinces WHERE slug = 'chonburi'), 'Mueang Chonburi', 'mueang-chonburi'),
((SELECT id FROM provinces WHERE slug = 'chonburi'), 'Si Racha', 'si-racha'),
((SELECT id FROM provinces WHERE slug = 'phuket'), 'Mueang Phuket', 'mueang-phuket'),
((SELECT id FROM provinces WHERE slug = 'phuket'), 'Kathu', 'kathu');

INSERT INTO stations (district_id, name, brand, address, latitude, longitude, last_updated) VALUES
((SELECT id FROM districts WHERE slug = 'chatuchak' AND province_id = (SELECT id FROM provinces WHERE slug = 'bangkok')), 'PTT Vibhavadi Hub', 'PTT', 'Vibhavadi Rangsit Road, Chatuchak, Bangkok', 13.8050, 100.5550, NOW() - INTERVAL '12 minutes'),
((SELECT id FROM districts WHERE slug = 'huai-khwang' AND province_id = (SELECT id FROM provinces WHERE slug = 'bangkok')), 'Shell Rama 9 Energy Point', 'Shell', 'Rama 9 Road, Huai Khwang, Bangkok', 13.7540, 100.5780, NOW() - INTERVAL '35 minutes'),
((SELECT id FROM districts WHERE slug = 'bang-khen' AND province_id = (SELECT id FROM provinces WHERE slug = 'bangkok')), 'Bangchak Ram Inthra Green Fuel', 'Bangchak', 'Ram Inthra Road, Bang Khen, Bangkok', 13.8560, 100.6270, NOW() - INTERVAL '2 hours'),
((SELECT id FROM districts WHERE slug = 'mueang-nonthaburi' AND province_id = (SELECT id FROM provinces WHERE slug = 'nonthaburi')), 'Esso Rattanathibet Connect', 'Esso', 'Rattanathibet Road, Mueang Nonthaburi, Nonthaburi', 13.8607, 100.5148, NOW() - INTERVAL '55 minutes'),
((SELECT id FROM districts WHERE slug = 'pak-kret' AND province_id = (SELECT id FROM provinces WHERE slug = 'nonthaburi')), 'PT Chaeng Watthana Northgate', 'PT', 'Chaeng Watthana Road, Pak Kret, Nonthaburi', 13.9123, 100.4982, NOW() - INTERVAL '28 minutes'),
((SELECT id FROM districts WHERE slug = 'mueang-chiang-mai' AND province_id = (SELECT id FROM provinces WHERE slug = 'chiang-mai')), 'Caltex Superhighway Chiang Mai', 'Caltex', 'Chiang Mai Superhighway, Mueang Chiang Mai, Chiang Mai', 18.7961, 98.9793, NOW() - INTERVAL '16 minutes'),
((SELECT id FROM districts WHERE slug = 'hang-dong' AND province_id = (SELECT id FROM provinces WHERE slug = 'chiang-mai')), 'PTT Hang Dong Gateway', 'PTT', 'Hang Dong Road, Hang Dong, Chiang Mai', 18.6871, 98.9196, NOW() - INTERVAL '1 hour 10 minutes'),
((SELECT id FROM districts WHERE slug = 'mueang-khon-kaen' AND province_id = (SELECT id FROM provinces WHERE slug = 'khon-kaen')), 'IRPC Mittraphap Khon Kaen', 'IRPC', 'Mittraphap Road, Mueang Khon Kaen, Khon Kaen', 16.4322, 102.8236, NOW() - INTERVAL '48 minutes'),
((SELECT id FROM districts WHERE slug = 'ban-phai' AND province_id = (SELECT id FROM provinces WHERE slug = 'khon-kaen')), 'Shell Ban Phai Logistics', 'Shell', 'Ban Phai District, Khon Kaen', 16.0583, 102.7301, NOW() - INTERVAL '3 hours'),
((SELECT id FROM districts WHERE slug = 'mueang-chonburi' AND province_id = (SELECT id FROM provinces WHERE slug = 'chonburi')), 'Bangchak Chonburi Coastal', 'Bangchak', 'Sukhumvit Road, Mueang Chonburi, Chonburi', 13.3611, 100.9847, NOW() - INTERVAL '14 minutes'),
((SELECT id FROM districts WHERE slug = 'si-racha' AND province_id = (SELECT id FROM provinces WHERE slug = 'chonburi')), 'PTT Sriracha Port Access', 'PTT', 'Sriracha-Nong Kho Road, Si Racha, Chonburi', 13.1737, 100.9305, NOW() - INTERVAL '23 minutes'),
((SELECT id FROM districts WHERE slug = 'mueang-phuket' AND province_id = (SELECT id FROM provinces WHERE slug = 'phuket')), 'Caltex Phuket Bypass', 'Caltex', 'Thep Krasattri Road, Mueang Phuket, Phuket', 7.8804, 98.3923, NOW() - INTERVAL '18 minutes'),
((SELECT id FROM districts WHERE slug = 'kathu' AND province_id = (SELECT id FROM provinces WHERE slug = 'phuket')), 'Esso Kathu Hillside', 'Esso', 'Phra Phuket Kaew Road, Kathu, Phuket', 7.9175, 98.3332, NOW() - INTERVAL '1 hour 45 minutes');

INSERT INTO fuel_status (station_id, fuel_type, inventory_level, amount_liters, price_per_liter, updated_by, note, last_updated) VALUES
(1, 'Gasohol 95', 'high', 9200, 38.90, 'system_seed', 'Strong city inventory', NOW() - INTERVAL '12 minutes'),
(1, 'Gasohol 91', 'medium', 4800, 37.80, 'system_seed', 'Balanced demand', NOW() - INTERVAL '18 minutes'),
(1, 'Diesel B7', 'high', 11000, 31.90, 'system_seed', 'Fleet demand covered', NOW() - INTERVAL '10 minutes'),
(2, 'Gasohol 95', 'low', 1800, 39.20, 'system_seed', 'Rush hour pressure', NOW() - INTERVAL '35 minutes'),
(2, 'Gasohol 91', 'medium', 4200, 38.10, 'system_seed', 'Stable flow', NOW() - INTERVAL '35 minutes'),
(2, 'Diesel B7', 'medium', 5600, 32.20, 'system_seed', 'Evening restock planned', NOW() - INTERVAL '32 minutes'),
(3, 'Gasohol 95', 'refilling', 900, 38.70, 'system_seed', 'Truck on site', NOW() - INTERVAL '2 hours'),
(3, 'Gasohol 91', 'low', 1400, 37.60, 'system_seed', 'Lower-than-usual reserve', NOW() - INTERVAL '1 hour 55 minutes'),
(3, 'Diesel B7', 'high', 9800, 31.70, 'system_seed', 'Commercial stock healthy', NOW() - INTERVAL '1 hour 52 minutes'),
(4, 'Gasohol 95', 'medium', 5100, 38.60, 'system_seed', 'Suburban traffic normal', NOW() - INTERVAL '55 minutes'),
(4, 'Gasohol 91', 'high', 7600, 37.50, 'system_seed', 'Good reserve', NOW() - INTERVAL '53 minutes'),
(4, 'Diesel B7', 'medium', 6200, 31.80, 'system_seed', 'Normal demand', NOW() - INTERVAL '52 minutes'),
(5, 'Gasohol 95', 'high', 8700, 38.50, 'system_seed', 'Corridor demand supported', NOW() - INTERVAL '28 minutes'),
(5, 'Gasohol 91', 'medium', 3900, 37.40, 'system_seed', 'Moderate demand', NOW() - INTERVAL '28 minutes'),
(5, 'Diesel B7', 'high', 9300, 31.60, 'system_seed', 'Truck lane volume strong', NOW() - INTERVAL '26 minutes'),
(6, 'Gasohol 95', 'high', 8000, 39.40, 'system_seed', 'Tourism corridor active', NOW() - INTERVAL '16 minutes'),
(6, 'Gasohol 91', 'medium', 3500, 38.40, 'system_seed', 'Steady urban consumption', NOW() - INTERVAL '15 minutes'),
(6, 'Diesel B7', 'medium', 4700, 32.40, 'system_seed', 'Good enough for now', NOW() - INTERVAL '14 minutes'),
(7, 'Gasohol 95', 'medium', 4400, 39.10, 'system_seed', 'Southern ring users', NOW() - INTERVAL '1 hour 10 minutes'),
(7, 'Gasohol 91', 'low', 1600, 38.20, 'system_seed', 'Promotions increased drawdown', NOW() - INTERVAL '1 hour 8 minutes'),
(7, 'Diesel B7', 'high', 8400, 32.10, 'system_seed', 'Agricultural routes covered', NOW() - INTERVAL '1 hour 5 minutes'),
(8, 'Gasohol 95', 'medium', 4900, 38.80, 'system_seed', 'Regional hub stable', NOW() - INTERVAL '48 minutes'),
(8, 'Gasohol 91', 'medium', 4100, 37.90, 'system_seed', 'Normal use', NOW() - INTERVAL '47 minutes'),
(8, 'Diesel B7', 'high', 12000, 31.50, 'system_seed', 'Heavy logistics ready', NOW() - INTERVAL '46 minutes'),
(9, 'Gasohol 95', 'out', 0, 39.00, 'system_seed', 'Awaiting refill truck', NOW() - INTERVAL '3 hours'),
(9, 'Gasohol 91', 'low', 700, 37.95, 'system_seed', 'Village route depletion', NOW() - INTERVAL '2 hours 40 minutes'),
(9, 'Diesel B7', 'medium', 5200, 31.70, 'system_seed', 'Commercial traffic ongoing', NOW() - INTERVAL '2 hours 35 minutes'),
(10, 'Gasohol 95', 'high', 9100, 38.70, 'system_seed', 'Coastal demand healthy', NOW() - INTERVAL '14 minutes'),
(10, 'Gasohol 91', 'medium', 4600, 37.70, 'system_seed', 'Weekend load manageable', NOW() - INTERVAL '13 minutes'),
(10, 'Diesel B7', 'medium', 6000, 31.85, 'system_seed', 'Industrial corridor demand', NOW() - INTERVAL '12 minutes'),
(11, 'Gasohol 95', 'medium', 5200, 38.90, 'system_seed', 'Port commuter flow', NOW() - INTERVAL '23 minutes'),
(11, 'Gasohol 91', 'high', 7000, 37.80, 'system_seed', 'Restocked overnight', NOW() - INTERVAL '22 minutes'),
(11, 'Diesel B7', 'high', 11500, 31.95, 'system_seed', 'Freight corridor reserve', NOW() - INTERVAL '20 minutes'),
(12, 'Gasohol 95', 'high', 8300, 39.60, 'system_seed', 'Airport-side travel demand', NOW() - INTERVAL '18 minutes'),
(12, 'Gasohol 91', 'medium', 3800, 38.55, 'system_seed', 'Steady local usage', NOW() - INTERVAL '17 minutes'),
(12, 'Diesel B7', 'low', 1500, 32.50, 'system_seed', 'Refill window tonight', NOW() - INTERVAL '16 minutes'),
(13, 'Gasohol 95', 'medium', 4300, 39.50, 'system_seed', 'Resort traffic normal', NOW() - INTERVAL '1 hour 45 minutes'),
(13, 'Gasohol 91', 'low', 1200, 38.45, 'system_seed', 'High afternoon draw', NOW() - INTERVAL '1 hour 42 minutes'),
(13, 'Diesel B7', 'medium', 5600, 32.30, 'system_seed', 'Tour van demand steady', NOW() - INTERVAL '1 hour 41 minutes');

INSERT INTO app_users (name, email, password, role, station_id) VALUES
('Bangkok Staff', 'staff@ptt-vibhavadi.demo', 'demo1234', 'staff', 1),
('Regional Manager', 'manager@fuelops.demo', 'demo1234', 'manager', NULL),
('Phuket Staff', 'staff@phuket-bypass.demo', 'demo1234', 'staff', 12);