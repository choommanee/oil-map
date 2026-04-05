-- Demo users for all role groups
-- Password for all: demo1234

-- Fix existing staff: assign station
UPDATE app_users SET station_id = 6117 WHERE email = 'staff@ptt-vibhavadi.demo' AND station_id IS NULL;

-- Admin
INSERT INTO app_users (name, email, password, role, station_id, province_slug)
VALUES (
  'System Admin',
  'admin@oilmap.demo',
  '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
  'admin', NULL, NULL
) ON CONFLICT (email) DO NOTHING;

-- Province Managers
INSERT INTO app_users (name, email, password, role, station_id, province_slug)
VALUES
  ('Khon Kaen Manager', 'manager@khonkaen.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'province_manager', NULL, 'khon-kaen'),
  ('Loei Manager', 'manager@loei.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'province_manager', NULL, 'loei')
ON CONFLICT (email) DO NOTHING;

-- Staff
INSERT INTO app_users (name, email, password, role, station_id, province_slug)
VALUES
  ('Khon Kaen Staff', 'staff@khonkaen.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'staff', 11201, NULL),
  ('Loei Staff', 'staff@loei.demo',
   '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS',
   'staff', 14655, NULL)
ON CONFLICT (email) DO NOTHING;
