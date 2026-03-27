-- Add province_slug to scope province_manager role
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS province_slug VARCHAR(120);

-- Rename 'manager' -> 'province_manager' and assign demo province (Chiang Mai)
UPDATE app_users
SET role = 'province_manager', province_slug = 'chiang-mai'
WHERE role = 'manager';

-- Re-hash seed user passwords from plaintext to bcrypt (cost 12, hash of 'demo1234')
UPDATE app_users
SET password = '$2b$12$AkhJlRjqOAF/kSWvaYwgnuPyDUywupwE5Sd1OzKsRXH2t8vG7NATS'
WHERE email IN (
    'staff@ptt-vibhavadi.demo',
    'manager@fuelops.demo',
    'staff@phuket-bypass.demo'
);
