-- ============================================================
-- Absenio: Migrasi fitur Pelanggaran Atribut
-- Jalankan sekali di Supabase SQL Editor
-- ============================================================

-- Satu baris = satu atribut yang tidak dibawa siswa pada satu tanggal
CREATE TABLE IF NOT EXISTS violations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  type        TEXT NOT NULL,     -- Topi | ID Card | Nametag | ...
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, type)
);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON violations FOR ALL USING (true) WITH CHECK (true);
