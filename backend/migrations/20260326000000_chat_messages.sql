CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL    PRIMARY KEY,
  sender     VARCHAR(100) NOT NULL DEFAULT 'เจ้าหน้าที่',
  role       VARCHAR(100) NOT NULL DEFAULT 'เจ้าหน้าที่',
  avatar     VARCHAR(10)  NOT NULL DEFAULT '?',
  province_slug VARCHAR(100),
  text       TEXT         NOT NULL,
  sent_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON chat_messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_province ON chat_messages (province_slug);

-- Seed messages
INSERT INTO chat_messages (sender, role, avatar, province_slug, text, sent_at) VALUES
  ('สมชาย ป.',    'ผจก.สถานี',           'ส', 'chiang-mai', 'PTT เชียงใหม่ ดีเซลเหลือ 20% ขอรถเติมด่วน',                        NOW() - INTERVAL '31 minutes'),
  ('วรรณา ก.',    'เจ้าหน้าที่จังหวัด',  'ว', 'chiang-mai', 'รับทราบ ประสานรถขนส่งแล้ว ETA ประมาณ 2 ชม.',                       NOW() - INTERVAL '28 minutes'),
  ('นิรันดร์ ส.', 'ส่วนกลาง',            'น', NULL,         'ภาคเหนือวันนี้ใช้สูงกว่าปกติ 35% ให้เฝ้าระวังสถานีในเขตอำเภอเมือง', NOW() - INTERVAL '24 minutes'),
  ('สมชาย ป.',    'ผจก.สถานี',           'ส', 'lampang',    'Shell ลำปาง ก็แจ้งขอเติมเช่นกัน กลัวหมดก่อนรถถึง',                 NOW() - INTERVAL '15 minutes'),
  ('ประเสริฐ ว.', 'ผจก.สถานี',           'ป', 'bangkok',    'กรุงเทพฯ โซนลาดพร้าว สต็อก B7 ปกติดี แต่ G95 เริ่มน้อย',           NOW() - INTERVAL '10 minutes'),
  ('อรพรรณ ท.',   'เจ้าหน้าที่จังหวัด',  'อ', 'chiang-mai', 'จัดส่งรถน้ำมันเพิ่มเติมไปเชียงใหม่ 2 คัน กำลังออกเดินทาง',        NOW() - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;
