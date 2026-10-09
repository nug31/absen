-- ============================================================
-- Absenio: Migrasi fitur Pantauan Orang Tua
-- Jalankan sekali di Supabase SQL Editor
-- ============================================================

-- Kode unik per siswa untuk link orang tua (/?ortu=KODE)
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_code TEXT UNIQUE;
