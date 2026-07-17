# 📋 Absenio

**Absenio** adalah aplikasi absensi digital modern untuk sekolah, dirancang untuk mempermudah proses pencatatan kehadiran siswa oleh guru secara real-time.

## ✨ Fitur Utama

- 🎓 **Mode Guru** — Kelola absensi, rekap kehadiran, dan data siswa
- 🧑‍🎓 **Mode Siswa** — Siswa dapat melakukan absen secara mandiri
- 📍 **Validasi GPS** — Memastikan siswa absen dari lokasi yang benar
- 📊 **Panel Rekap** — Laporan kehadiran harian & bulanan
- 🖼️ **Lightbox Foto** — Bukti foto saat absensi
- 💾 **Penyimpanan Lokal** — Data tersimpan di browser

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan mode development
npm run dev

# Build untuk production
npm run build
```

## 🛠️ Teknologi

- **React 19** + Vite
- **Vanilla CSS** (tanpa framework)
- **Geolocation API** untuk validasi lokasi

## 📁 Struktur Proyek

```
src/
├── components/
│   ├── GuruMode/     # Komponen mode guru
│   ├── SiswaMode/    # Komponen mode siswa
│   └── UI/           # Komponen UI reusable
├── utils/            # Helper functions (geo, storage)
├── data/             # Data default siswa
└── App.jsx           # Root komponen
```

---

> Dibuat dengan ❤️ untuk kemudahan absensi sekolah digital
