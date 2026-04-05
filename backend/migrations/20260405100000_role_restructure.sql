-- Restructure roles:
-- admin       = system admin (ผู้ดูแลระบบ)
-- official    = province government officer (ข้าราชการจังหวัด / พลังงานจังหวัด)
-- manager     = station owner/manager (เจ้าของปั้ม / ผู้จัดการปั้ม) — can have multiple stations
-- staff       = station worker (พนักงานปั้ม)

-- Rename province_manager → official
UPDATE app_users SET role = 'official' WHERE role = 'province_manager';

-- Add manager demo users (station owners with multiple stations)
INSERT INTO app_users (name, email, password, role, station_id, province_slug)
VALUES
  ('PTT Khon Kaen Owner', 'owner@ptt-khonkaen.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'manager', 11201, 'khon-kaen'),
  ('Bangchak Loei Owner', 'owner@bangchak-loei.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'manager', 14655, 'loei')
ON CONFLICT (email) DO NOTHING;
