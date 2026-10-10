# sponsorQu

> Platform pencari sponsor event berbasis AI untuk panitia: deskripsikan event sekali,
> AI merangking sponsor yang relevan, draft email otomatis terpersonalisasi per perusahaan,
> kirim via Gmail, dan pantau balasan — dalam satu alur tanpa ketik ulang.

Dokumen ini ditulis untuk **juri/evaluator**: berisi cara menjalankan aplikasi dari nol
dan daftar lengkap fungsionalitas yang bisa diuji.

---

## Daftar Isi

- [Paket Harga](#paket-harga)
- [Yang Bisa Dilakukan](#yang-bisa-dilakukan)
- [Prasyarat](#prasyarat)
- [Cara Menjalankan](#cara-menjalankan)
- [Environment Variables](#environment-variables)
- [Scripts npm](#scripts-npm)
- [Struktur Proyek](#struktur-proyek)
- [Demo Script 7 Menit](#demo-script-7-menit)
- [Stack Teknologi](#stack-teknologi)
- [Batas Sistem & Enum](#batas-sistem--enum)
- [Troubleshooting](#troubleshooting)
- [Keamanan](#keamanan)
- [Dokumen Internal](#dokumen-internal)

---

## Paket Harga

| Tier | Harga | Isi |
|---|---|---|
| **Starter** | Rp0 (free tier) | 3–5 sponsor per pencarian, 3x pencarian/hari, draft + email otomatis, kirim maks 5 email/sesi, monitoring 10 sponsor |
| **Elevate** | Rp49.000/bulan | 10+ sponsor per pencarian, limit 2–3x lipat Starter, kirim 20 email/sesi, monitoring 50 sponsor, notifikasi langsung |
| **Executive** | Hubungi kami | Semua fitur Elevate + SSO, dukungan prioritas, pendampingan mencari sponsor, onboarding & template khusus |

---

## Yang Bisa Dilakukan

### Halaman & Rute

| Rute | Halaman | Fungsi — apa yang bisa dilakukan juri |
|---|---|---|
| `/` | Landing page publik | Lihat hero + mock hasil AI, marquee industri, 4 fitur, 4 langkah cara kerja, demo tab interaktif (Hasil AI / Draft Email / Antrean), statistik, harga, FAQ, CTA ke aplikasi |
| `/app` | Dashboard | Lihat 4 kotak outcome (Terkirim, Dibalas, Diterima, Ditolak), grafik pengiriman per tanggal (7/14/30 hari), donut distribusi status, corong konversi, 5 aktivitas terbaru, status antrean, daftar terkirim dengan tombol outcome + info balasan, tombol global Cek Balasan |
| `/app/cari-sponsor` | Cari Sponsor (3 langkah satu halaman) | **1)** Isi form pencarian (jenis event + catatan event, min 30 karakter) lalu Cari — AI merangking **maks 5 sponsor** dengan skor 0–100, level relevansi, alasan, bentuk dukungan; filter level, sortir, toggle Kartu/Daftar; centang sponsor. **2)** Isi Detail Kampanye (12 field: nama/tanggal/lokasi/penyelenggara event, kebutuhan sponsorship, tone email, info tambahan, nama/jabatan/kontak/email PIC, website acara, link proposal) — konteks event terbawa otomatis. **3)** Generate Draft Email |
| `/app/cari-sponsor/draft` | Draft & Kirim | Lihat tab draft per sponsor; kolom `To` selalu bisa diedit; placeholder `[kurung]` yang belum terisi ditandai kuning dan **memblokir tombol kirim**; Merge Ulang (tanpa AI) vs Generate Ulang (AI, perlu konfirmasi); hubungkan Gmail via OAuth; pre-send check (jumlah, penerima, warning >10); antrean `Queued → Sending → Sent/Failed` + retry per item; riwayat terisi otomatis |
| `/app/tambah-sponsor` | Tambah Sponsor manual | Tambah sponsor yang sudah dikenal lewat baris bulk (nama + email, tambah/hapus baris, error per baris, **tolak duplikat** case-insensitive); sponsor manual tampil dengan badge `Manual` dan skor `–/100`; otomatis terpilih |
| `/app/riwayat` | Riwayat | Lihat 4 kotak outcome, filter 6 status hubungan + Semua, tabel (Sponsor/Event/Draft/Delivery/Relationship/Aksi/Updated), ubah outcome per baris (Dibalas/Diterima/Ditolak/Diacuhkan), Cek Balasan per baris & global, snippet balasan |
| `/app/setting` | Pengaturan | Lihat status live Langflow (`:7860`) & backend (`:5000`), atur mode debug panel (env/selalu/sembunyi), lihat batas sistem, reset alur (riwayat tetap) atau reset semua |

### Aturan main yang dijaga aplikasi

- Rekomendasi AI **maks 5 sponsor**; tidak ada data yang dikarang — field kosong disembunyikan (dukungan kosong → *tidak diketahui*).
- Email hanya terkirim bila `To` terisi **dan** tidak ada placeholder tersisa (`leftover` memblokir kirim).
- Maks **10 email per sesi** — diperingatkan, tidak pernah dipotong diam-diam.
- Status pengiriman `Sent` hanya setelah provider Gmail sukses; retry per penerima.
- Semua state tersimpan di `localStorage` — **refresh tidak menghilangkan data**.

---

## Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Node.js 20+ dan npm | Terverifikasi di Node v24 / npm v11 |
| **Langflow lokal di `:7860`** | Wajib untuk alur AI (cari sponsor + draft email). Lihat [Cara Menjalankan](#cara-menjalankan) langkah 2 |
| Akun Composio (opsional) | Hanya dibutuhkan untuk **mengirim email asli** via Gmail. Tanpa ini, juri tetap bisa menguji Cari → Kampanye → Draft sampai pre-send check |

---

## Cara Menjalankan

Jalankan perintah dari folder root repo.

### 1. Clone & install dependensi

```bash
git clone https://github.com/revanzk/sponsorQU.git
cd sponsorQU

# Install frontend
npm install

# Install backend (Express)
npm run server:install
```

### 2. Siapkan Langflow (wajib untuk alur AI)

Aplikasi memanggil **2 flow** di Langflow lokal (`http://localhost:7860`)
plus **1 file dataset sponsor** yang harus dimasukkan ke vector database:

| Jenis | File | Fungsi |
|---|---|---|
| Search flow | `langflow/SponsorQu Flow.json` | Query planner + vector search + ranker + JSON parser → rekomendasi sponsor |
| Draft flow | `langflow/draft email.json` | Merapikan template menjadi draft `Subjek:` + `Isi:` dengan placeholder `[kurung]` |
| Dataset sponsor | `langflow/sponsor_database_audited_final.txt` | Daftar sponsor (array JSON: nama, industri, lokasi, audiens, kontak, dll) — dimasukkan ke Astra DB lewat cabang ingest |

Langkah:

```text
1. Jalankan Langflow dan buka http://localhost:7860
2. Import kedua file JSON di atas (drag & drop ke kanvas Langflow)
   sehingga menjadi 2 flow terpisah: search dan draft
3. Isi vector database sponsor (WAJIB sebelum pencarian bisa jalan):
   a. Buka flow search, cari cabang ingest:
      Read File -> Split Text -> Ingest Data -> Astra DB
   b. Pada komponen Read File, arahkan ke file:
      langflow/sponsor_database_audited_final.txt
   c. Jalankan cabang ingest (tombol Run pada komponen Ingest Data):
      file dibaca -> di-split -> di-embed -> masuk ke Astra DB
   d. Tunggu status sukses, lalu verifikasi collection Astra DB sudah terisi
4. Catat Flow ID masing-masing flow (ada di Flow Settings) — dipakai di langkah 3
```

> Tanpa 2 flow ini, pencarian dan draft akan gagal dengan pesan error + panel debug
> terbuka otomatis. Semua halaman lain (landing, dashboard, tambah manual, riwayat,
> pengaturan) tetap bisa dibuka.

### 3. Buat file `.env`

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Lalu isi minimal 4 nilai ini di `.env` (lihat tabel [Environment Variables](#environment-variables)):

```ini
VITE_LANGFLOW_URL=http://localhost:7860
VITE_LANGFLOW_API_KEY=<api-key-langflow-kamu>
VITE_LANGFLOW_SEARCH_FLOW_ID=<flow-id-search>
VITE_LANGFLOW_DRAFT_FLOW_ID=<flow-id-draft>
```

> **Penting:** setelah membuat/mengubah `.env`, **restart** `npm run dev`
> karena Vite menanam variabel `VITE_*` sekali saat start.

### 4. Jalankan aplikasi (2 terminal)

```bash
# Terminal 1 — backend Express (:5000)
npm run server

# Terminal 2 — frontend Vite (:5173)
npm run dev
```

### 5. Verifikasi health check

```bash
# Langflow — harus {"status":"ok"}
curl http://localhost:7860/health

# Backend — harus {"ok":true,"composioKey":true,...}
curl http://localhost:5000/api/health
```

`composioKey: true` berarti `COMPOSIO_API_KEY` terdeteksi (wajib untuk kirim email asli).

### 6. Buka aplikasi

```text
http://localhost:5173
```

> Selalu buka lewat `localhost:5173` (bukan `127.0.0.1` atau IP LAN) —
> backend hanya mengizinkan origin `localhost` (CORS).

---

## Environment Variables

| Nama | Dibaca oleh | Wajib? | Contoh / Keterangan |
|---|---|---|---|
| `VITE_LANGFLOW_URL` | Frontend | Ya | `http://localhost:7860` |
| `VITE_LANGFLOW_API_KEY` | Frontend | Jika flow butuh `x-api-key` | Diambil dari Settings Langflow |
| `VITE_LANGFLOW_SEARCH_FLOW_ID` | Frontend | Ya | Dari Flow Settings flow search |
| `VITE_LANGFLOW_DRAFT_FLOW_ID` | Frontend | Ya | Dari Flow Settings flow draft |
| `VITE_LANGFLOW_FLOW_ID` | Frontend | Tidak | Legacy, fallback bila search ID kosong |
| `VITE_DEBUG_LANGFLOW` | Frontend | Tidak | `true` = debug panel ikut tampil |
| `VITE_COMPOSIO_BACKEND_URL` | Frontend | Ya (default `http://localhost:5000`) | Tanpa slash di akhir |
| `VITE_COMPOSIO_API_KEY` | Frontend | Tidak | Hanya indikator, bukan untuk kirim |
| `COMPOSIO_API_KEY` | Backend saja | Ya, untuk kirim email | **Tanpa prefix `VITE_`** — jangan taruh di frontend |
| `COMPOSIO_GMAIL_AUTH_CONFIG_ID` | Backend saja | Tidak (default `ac_Im0mILtarfgb`) | Dari dashboard Composio → Auth Configs → Gmail |
| `COMPOSIO_GMAIL_VERSION` | Backend saja | Tidak (default `20260915_00`) | Pin versi toolkit Gmail |
| `COMPOSIO_PORT` | Backend saja | Tidak (default `5000`) | Port Express |

---

## Scripts npm

| Command | Fungsi |
|---|---|
| `npm run dev` | Jalankan frontend Vite di `:5173` |
| `npm run server` | Jalankan backend Express di `:5000` |
| `npm run server:install` | Install dependensi backend (`server/`) |
| `npm run build` | Build produksi (harus hijau) |
| `npm run preview` | Preview hasil build produksi |

---

## Struktur Proyek

```text
.
├── index.html              # Title + meta sponsorQu
├── vite.config.js          # Vite 6, port 5173
├── .env.example            # Template env (aman di-commit)
├── server/
│   ├── index.js            # Express: health, Composio OAuth, kirim email, cek balasan
│   ├── composio.js         # Client @composio/core (API key tidak pernah keluar server)
│   └── package.json
├── langflow/               # Template flow + dataset (diimport ke Langflow lokal)
│   ├── SponsorQu Flow.json # Flow search + scoring sponsor
│   ├── draft email.json    # Flow generate draft email
│   └── sponsor_database_audited_final.txt  # Dataset sponsor → Read File → Astra DB
└── src/
    ├── main.jsx            # Entry + ErrorBoundary
    ├── App.jsx             # Router / + /app/* + guards
    ├── index.css           # Design tokens (brand ungu #6D5AE6)
    ├── landing/            # Landing.jsx, landing.css, useReveal.js
    ├── components/         # Shell (sidebar+topbar), DebugPanel, charts
    ├── dashboard/          # DashboardHome, CariSponsor, Draft, Hasil,
    │                       # Kampanye, TambahSponsor, Riwayat, Setting
    ├── lib/                # constants, validators, langflow, merge
    └── store/              # store.jsx — state global + actions + localStorage
```

---

## Demo Script 7 Menit

| # | Klik | Ucapkan |
|---|---|---|
| 0 | Scroll landing `/` | "Panitia habiskan berhari-hari cari sponsor. Satu alur membereskannya." |
| 1 | Isi event → Cari | "Satu deskripsi — tidak pernah diketik ulang." Narasikan selagi AI bekerja |
| 2 | Hasil: skor/chip/alasan/filter/sortir/Kartu-Daftar | "Maks lima, setiap klaim ada alasannya, tidak ada yang dikarang." |
| 3 | Pilih → isi kampanye (konteks terbawa) → PIC/link | "Konteks terbawa otomatis; data PIC mengisi tanda tangan email." |
| 4 | Generate → tab draft | "Satu panggilan AI per kampanye, langsung di-merge per sponsor." |
| 5 | Tunjukkan `[..]` kuning, email manual | "Yang belum terisi diberi nama dan memblokir kirim — bisa diperbaiki." |
| 6 | Hubungkan Gmail (OAuth asli) | "OAuth asli; kredensial tidak pernah menyentuh kode kami." |
| 7 | Pre-send → Kirim → antrean → Riwayat | "Sepuluh per sesi, status per penerima, riwayat tercatat." |
| 8 | Kotak outcome + tombol status | "Outcome dilacak user; setiap langkah AI bisa diinspeksi." |

Fallback: AI lambat → narasikan panel debug. Kirim tidak boleh jalan → berhenti setelah pre-send check.

---

## Stack Teknologi

| Lapisan | Teknologi | Versi |
|---|---|---|
| Build | Vite | 6 |
| UI | React + React DOM | 19 |
| Routing | React Router | 7 |
| Backend | Express + cors + dotenv | 4 |
| AI | Langflow (lokal `:7860`) | — |
| Email | Composio `@composio/core` + Gmail OAuth | 0.22 |
| Styling | CSS murni + design token (tanpa library UI) | — |

---

## Batas Sistem & Enum

| Aturan | Nilai |
|---|---|
| Maks sponsor per pencarian AI | 5 |
| Maks email per sesi kirim | 10 (diperingatkan, tidak dipotong diam-diam) |
| Timeout request Langflow | 120 detik |
| `input_type` Langflow | **Selalu `"chat"`**, tidak pernah `"text"` |
| Format draft | Baris `Subjek:` + body `Isi:` dengan placeholder `[kurung]` (tidak pernah `{{}}`) |
| Tingkat relevansi | Sangat Relevan (80–100) / Relevan (60–79) / Cukup Relevan (40–59) / Kurang Relevan (0–39) |
| Status hubungan | Belum Dihubungi / Terkirim / Dibalas / Diterima / Ditolak / Diacuhkan |
| Status pengiriman | Queued / Sending / Sent / Failed |

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `Failed to fetch` / `CORS error` saat hubungkan Gmail | Backend `:5000` tidak terjangkau dari browser, atau port dipakai proses lain (`EADDRINUSE`) | Pastikan `npm run server` jalan dan banner-nya `:5000`; buka lewat `localhost:5173`; cek tab Network DevTools |
| Output Langflow "no data" | `input_type:"text"` pada flow yang hanya punya Chat Input | Kode selalu memakai `"chat"` (`src/lib/langflow.js`) — jangan diubah |
| Pencarian gagal / hasil kosong | Flow ID salah, Langflow mati, atau API key salah | Cek Pengaturan → status Langflow; buka panel debug untuk raw response |
| Placeholder tidak pernah terisi | LLM mengarang frasa placeholder tiap run | Pakai tombol Merge Ulang di halaman draft |
| `.env` diubah tapi tidak berpengaruh | Vite menanam `VITE_*` saat start | Restart `npm run dev` |
| Layar putih setelah navigasi | Referensi router menggantung | Cek console + `ErrorBoundary` (`src/main.jsx`) |
| Status `Sent` tidak pernah muncul | Gmail belum terhubung / backend mati | Ikuti kartu Connect di halaman draft → cek status → cek log server |

---

## Keamanan

- **Jangan pernah commit `.env`.** File `.gitignore` repo ini sudah mengabaikan `.env`, `node_modules/`, dan `dist/`. Yang di-commit hanya `.env.example` (berisi placeholder).
- Bila API key pernah bocor ke publik: **putar ulang (regenerate) key** di dashboard Composio/Langflow, lalu isi ulang `.env` lokal.
- `COMPOSIO_API_KEY` (tanpa prefix `VITE_`) hanya dibaca `server/` — tidak pernah dikirim ke browser.

---

## Dokumen Internal

Spesifikasi lengkap untuk pengembang ada di repo:

- `00-START-HERE.md` — urutan build & iron rules
- `01-CONTRACTS.md` — kontrak data, validator, enum
- `02-APP.md` — panduan setup, shell, halaman, backend
- `03-REFERENCE.md` — prompt Langflow verbatim, graf flow, token desain, debug playbook
