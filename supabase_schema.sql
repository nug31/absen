-- ============================================================
-- Absenio: Schema Supabase
-- Jalankan SQL ini di Supabase SQL Editor
-- Project: https://kshlsenwwkxkqoknydoj.supabase.co
-- ============================================================

-- 1. Tabel Siswa
CREATE TABLE IF NOT EXISTS students (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  nis      TEXT NOT NULL UNIQUE
);

-- 2. Tabel Absensi Harian
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  status        TEXT,            -- H | S | I | A
  time          TEXT,
  distance      FLOAT,
  within_radius BOOLEAN,
  pending       BOOLEAN DEFAULT false,
  self_checkin  BOOLEAN DEFAULT false,
  lat           FLOAT,
  lng           FLOAT,
  selfie_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- 3. Tabel Konfigurasi App
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- 4. Seed konfigurasi default
INSERT INTO config (key, value) VALUES ('pin', '1234') ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. Row Level Security (buka akses publik - app tanpa auth)
-- ============================================================
ALTER TABLE students   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE config     ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi (anon key, tanpa login)
CREATE POLICY "public_all" ON students   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON config     FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Storage Bucket untuk Foto Selfie (Buka Akses Publik)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('absenio', 'absenio', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy: izinkan upload/baca gambar untuk bucket 'absenio'
CREATE POLICY "public_storage_all" ON storage.objects 
  FOR ALL USING (bucket_id = 'absenio') WITH CHECK (bucket_id = 'absenio');
