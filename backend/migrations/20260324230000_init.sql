-- Create Gas Stations Table
CREATE TABLE IF NOT EXISTS gas_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    address TEXT,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create Fuel Status Table
CREATE TABLE IF NOT EXISTS fuel_status (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES gas_stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(50) NOT NULL,
    amount_liters DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Normal',
    price_per_liter DOUBLE PRECISION DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Data (Bangkok & Nearby)
INSERT INTO gas_stations (name, brand, address, province, district, latitude, longitude) VALUES
('PTT Station วิภาวดี', 'PTT', 'ถนนวิภาวดีรังสิต', 'กรุงเทพมหานคร', 'จตุจักร', 13.805, 100.555),
('Shell พระราม 9', 'Shell', 'พระราม 9', 'กรุงเทพมหานคร', 'ห้วยขวาง', 13.754, 100.578),
('Bangchak รามอินทรา', 'Bangchak', 'กม. 4', 'กรุงเทพมหานคร', 'บางเขน', 13.856, 100.627);

-- Seed Initial Fuel Status
INSERT INTO fuel_status (station_id, fuel_type, amount_liters, status, price_per_liter)
SELECT id, 'Gasohol 95', 5000, 'Normal', 38.5 FROM gas_stations;

INSERT INTO fuel_status (station_id, fuel_type, amount_liters, status, price_per_liter)
SELECT id, 'Gasohol 91', 3000, 'Low', 37.8 FROM gas_stations;

INSERT INTO fuel_status (station_id, fuel_type, amount_liters, status, price_per_liter)
SELECT id, 'Diesel B7', 8000, 'Normal', 32.9 FROM gas_stations;
