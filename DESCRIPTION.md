# SponsorQu

> Platform cerdas berbasis AI untuk membantu panitia event menemukan sponsor yang relevan, menyusun email sponsorship yang dipersonalisasi, dan mengelola seluruh kampanye penjangkauan sponsor, dalam satu alur kerja yang terintegrasi.

---

## ✨ Tentang Proyek

**SponsorQu** adalah aplikasi web yang dirancang untuk menyederhanakan proses pencarian dan penghubungan sponsor bagi panitia event. Dengan menggabungkan kecerdasan buatan (AI), vector database sponsor, dan integrasi Gmail, SponsorQu memungkinkan panitia untuk:

- Menemukan calon sponsor yang relevan hanya dengan mendeskripsikan event mereka
- Mendapatkan rekomendasi sponsor berperingkat berdasarkan skor relevansi
- Menghasilkan draft email sponsorship yang dipersonalisasi per perusahaan secara otomatis
- Mengirim email langsung melalui akun Gmail yang terhubung
- Memantau status respons dan hasil kampanye secara real-time

---

## 💡 Latar Belakang

SponsorQu lahir dari masalah nyata yang kami dengar berulang kali dari kalangan panitia event mahasiswa dan organisasi kemahasiswaan di Indonesia.

Kami mengetahui bahwa setiap kali sebuah organisasi menyelenggarakan event, tantangan terbesar yang mereka hadapi bukan soal konsep acara, bukan soal teknis, melainkan soal **sponsorship**. Kami mendengar langsung betapa panjang dan melelahkannya prosesnya: mencari calon sponsor satu per satu secara manual, menyusun email dari nol untuk setiap perusahaan, menunggu balasan tanpa tahu apakah email bahkan sudah dibaca, lalu kehilangan jejak karena tidak ada sistem terpusat untuk memantaunya.

Kami melihat betapa panitia dengan puluhan target sponsor harus membuka LinkedIn, Google, dan berbagai referensi hanya untuk menemukan satu kontak yang tepat, dan ini dikerjakan oleh divisi sponsorship yang seringkali hanya terdiri dari 2 hingga 3 orang (Showcare, 2026). Kami memahami bahwa email yang seharusnya dipersonalisasi akhirnya menjadi generik karena keterbatasan waktu dan tenaga, ditulis terburu-buru di sela-sela tanggung jawab kepanitiaan lain yang tidak kalah banyaknya. Dan kami menyadari bahwa ketika semua email sudah terkirim pun, tidak ada cara mudah untuk tahu siapa yang sudah membalas, siapa yang belum, dan mana yang perlu di-follow up, karena tidak ada sistem, hanya thread email yang berserakan.

**SponsorQu dibangun untuk mengakhiri siklus itu.** Cukup deskripsikan event sekali, biarkan AI yang merangking sponsor yang benar-benar relevan, menyusun email yang dipersonalisasi per perusahaan, dan mencatat setiap respons, semuanya dalam satu alur yang tidak mengharuskan panitia mengetik ulang data dari awal.

---

## 🎯 Target Pasar

SponsorQu dirancang untuk menjawab kebutuhan segmen yang sangat spesifik namun luas:

### Pengguna Utama (User)
| Segmen | Deskripsi |
|---|---|
| **Panitia Event Mahasiswa** | BEM, HIMA, UKM, dan komunitas kampus yang aktif menyelenggarakan seminar, lomba, atau festival |
| **Event Organizer Indie** | Tim kecil yang menggelar konser, pameran, atau gathering komunitas dengan anggaran terbatas |
| **Startup & Komunitas Teknologi** | Penyelenggara hackathon, bootcamp, dan meetup yang membutuhkan sponsor industri tech |
| **Panitia Event Sosial & Olahraga** | Komunitas yang menggelar kompetisi, bakti sosial, atau event komunitas reguler |

### Pembeli / Pengambil Keputusan (Buyer)
| Segmen | Peran |
|---|---|
| **Ketua Divisi Sponsorship** | Pengguna langsung yang paling merasakan pain point |
| **Ketua Umum Organisasi** | Pengambil keputusan pembelian paket berbayar |
| **Manajer Program Kampus** | Universitas yang ingin memfasilitasi UKM dengan tool manajemen event |

### Ukuran Pasar
Indonesia memiliki lebih dari **4.500 perguruan tinggi** dengan ribuan organisasi kemahasiswaan aktif, ditambah ekosistem komunitas dan startup yang terus berkembang. Rata-rata setiap organisasi mengadakan 2-6 event per tahun, dan hampir semua membutuhkan sponsorship. Ini adalah pasar yang besar, underserved, dan belum pernah disentuh oleh solusi yang benar-benar terintegrasi.

---

## 🚀 Ekspansi & Skalabilitas Bisnis

SponsorQu dibangun dengan visi jangka panjang melampaui tools sederhana.

### Fase 1 - MVP (Saat Ini)
Fokus pada alur inti: **Cari sponsor → Draft email → Kirim → Pantau**. Target pengguna awal adalah panitia event mahasiswa dan komunitas kecil yang paling merasakan pain point ini. Model monetisasi dimulai dari tier Starter gratis untuk membangun basis pengguna.

### Fase 2 - Pertumbuhan
- **Ekspansi database sponsor**: Memperluas vector database ke ratusan hingga ribuan perusahaan dari berbagai industri
- **Kolaborasi tim**: Fitur multi-user agar seluruh divisi sponsorship bisa bekerja dalam satu workspace
- **Template library**: Koleksi template email per industri (FMCG, Fintech, Telko, F&B) yang sudah terbukti efektif
- **Analytics lanjutan**: Conversion rate per industri, waktu respons rata-rata, dan benchmark antar event

### Fase 3 - Skalabilitas Platform
- **Open Sponsor Board**: Papan posting dua arah, panitia bisa post kebutuhan sponsorship, perusahaan bisa post program open sponsorship mereka, keduanya bisa saling menemukan tanpa perantara
- **API untuk integrasi**: Memungkinkan platform manajemen event lain (seperti Eventbrite-style lokal) untuk mengintegrasikan fitur pencarian sponsor SponsorQu
- **White-label untuk kampus**: Universitas bisa mengadopsi SponsorQu sebagai platform resmi untuk seluruh unit kegiatan mahasiswanya
- **Ekspansi Nasional**: Mulai memperluas database ke seluruh Indonesia

### Model Bisnis
| Sumber Pendapatan | Mekanisme |
|---|---|
| **Freemium (Starter)** | Akuisisi pengguna gratis, konversi ke berbayar setelah merasakan nilai |
| **Subscription (Elevate)** | Rp49.000/bulan per organisasi, recurring revenue yang stabil |
| **Enterprise (Executive)** | Kontrak tahunan dengan kampus atau EO besar, custom pricing |
| **Sponsor Featured Listing** | Perusahaan membayar untuk muncul lebih tinggi dalam rekomendasi relevan (jangka panjang) |
| **Open Sponsor Board Premium** | Perusahaan membayar untuk listing Open Sponsorship yang lebih menonjol dan menjangkau lebih banyak panitia |



## 🎯 Fitur Utama

### 1. 🔍 Cari Sponsor (AI-Powered)
Panitia cukup mengisi tiga informasi dasar jenis event, perkiraan peserta, dan catatan singkat. AI kemudian melakukan pencarian ke vector database sponsor dan merekomendasikan **maksimal 5 calon sponsor** yang paling relevan, lengkap dengan:
- **Match Score** (0–100) dan Tingkat Relevansi
- Alasan relevansi berbasis data nyata
- Informasi kontak dan website

### 2. ➕ Tambah Sponsor Manual
Selain rekomendasi AI, pengguna dapat menambahkan sponsor secara manual (misalnya sponsor langganan atau hasil networking pribadi) yang langsung masuk ke dalam alur yang sama.

### 3. 📋 Kampanye Sponsorship
Setelah memilih sponsor, pengguna mengisi konteks kampanye (nama event, tanggal, lokasi, informasi PIC, dll.). Data ini dipakai oleh AI untuk menghasilkan email yang kontekstual dan spesifik per sponsor.

### 4. ✉️ Draft & Kirim Email
- AI membuat **satu template email per kampanye**, yang kemudian di-*merge* secara otomatis untuk setiap sponsor terpilih
- Placeholder yang belum terisi disorot kuning dan **memblokir pengiriman** hingga diselesaikan, mencegah email setengah jadi terkirim
- Email dikirim melalui **OAuth Gmail (Composio)**, kredensial tidak pernah tersimpan di kode

### 5. 📊 Dashboard & Riwayat
- 4 kotak status: **Terkirim, Dibalas, Diterima, Ditolak**
- Grafik analitik SVG per event
- Riwayat lengkap per sponsor dengan tombol update status
- Pengecekan balasan email otomatis

### 6. 📌 Open Sponsor Board *(Fitur Mendatang)*
Fitur papan posting dua arah yang menghubungkan panitia event dengan perusahaan sponsor secara langsung dan transparan.

**Dari sisi Panitia / Event Organizer:**
- Posting kebutuhan sponsorship event secara publik: jenis event, tanggal, lokasi, estimasi peserta, dan jenis dukungan yang dibutuhkan
- Postingan tampil di board terbuka yang bisa ditemukan oleh perusahaan yang sedang mencari event untuk disponsori
- Terima tawaran langsung dari perusahaan tanpa harus mengirim email terlebih dahulu

**Dari sisi Perusahaan / Sponsor:**
- Posting pengumuman *open sponsorship*: industri event yang diminati, rentang anggaran, jenis dukungan yang ditawarkan (dana tunai, produk, media partner, dll.)
- Panitia yang relevan bisa langsung mengajukan proposal melalui platform
- Perusahaan mendapatkan eksposur organik ke komunitas event yang aktif

> Fitur ini mengubah SponsorQu dari tools satu arah menjadi **platform marketplace dua arah** yang mempertemukan supply dan demand sponsorship secara efisien.

---

## 🌐 Landing Page

SponsorQu dilengkapi landing page publik (`/`) sebagai pintu masuk sebelum pengguna masuk ke dashboard aplikasi. Landing page terdiri dari beberapa seksi:

| Seksi | Konten |
|---|---|
| **Hero** | Tagline, CTA utama, dan mock-up kartu sponsor + preview draft email |
| **Fitur** | 4 kartu fitur utama (Cari Sponsor, Draft Otomatis, Kirim via Gmail, Dashboard) |
| **Cara Kerja** | 4 langkah alur dari deskripsi event sampai email terkirim |
| **Demo** | Preview statis hasil AI, draft email, dan status antrean pengiriman |
| **Harga** | 3 tier paket (lihat bagian berikut) |
| **FAQ** | 5 pertanyaan umum seputar keamanan, batas, dan cara pakai |
| **Footer** | Navigasi produk, link aplikasi, dan kredit |

Route: `/` menampilkan landing page; `/app` membuka dashboard aplikasi.

---

## 💰 Paket Harga

SponsorQu tersedia dalam tiga tier, semua memakai alur AI yang sama tanpa kartu kredit untuk mencoba.

### Starter - Rp0 (Free)
> Untuk mencoba alur lengkap tanpa biaya.

- 3-5 sponsor per pencarian, 3x pencarian per hari
- Draft email + kirim otomatis
- Kirim maksimal **5 email per sesi**
- Monitoring hingga **10 sponsor**

---

### Elevate - Rp49.000/bulan ⭐ Paling Dipilih
> Untuk kepanitiaan aktif dengan banyak target sponsor.

- 10+ sponsor per pencarian
- Limit 2-3x lipat dari Starter
- Kirim maksimal **20 email per sesi**
- Monitoring hingga **50 sponsor**
- Notifikasi langsung saat ada balasan

---

### Executive - Hubungi Kami
> Untuk tim, kampus, dan organisasi multi-event.

- Semua fitur Elevate
- SSO (Single Sign-On)
- Dukungan prioritas
- Pendampingan mencari sponsor
- Onboarding dan template email khusus

---

## 🏗️ Arsitektur & Stack Teknologi

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│  Vite 6 + React 19 + React Router 7 ,  Port :5173     │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│              Express Backend ,  Port :5000             │
│   /api/health  /api/composio/*  /api/send-email         │
│   /api/check-replies                                    │
└────────┬───────────────────────────────┬────────────────┘
         │ Langflow API                  │ Composio API
┌────────▼─────────┐           ┌─────────▼───────────────┐
│  Langflow :7860  │           │  Gmail via Composio     │
│  Flow Search     │           │  (OAuth Managed Auth)   │
│  Flow Draft      │           └─────────────────────────┘
└──────────────────┘
```

| Layer | Teknologi |
|---|---|
| Frontend | React 19, React Router 7, Vite 6 |
| Backend | Express 4, Node.js |
| AI Orchestration | Langflow (self-hosted) |
| Vector Database | Astra DB (via Langflow) |
| Email Integration | Composio + Gmail OAuth |
| Styling | Vanilla CSS + CSS Variables |

---

## 📁 Struktur Proyek

```
SponsorQu/
├── src/
│   ├── App.jsx                  # Router & route guards
│   ├── main.jsx                 # Entry point
│   ├── index.css                # Design system & tokens
│   ├── components/
│   │   └── Shell.jsx            # Sidebar + topbar layout
│   ├── dashboard/
│   │   ├── DashboardHome.jsx    # Statistik & analitik
│   │   ├── CariSponsor.jsx      # Form pencarian AI
│   │   ├── Hasil.jsx            # Daftar hasil sponsor
│   │   ├── Kampanye.jsx         # Form konteks kampanye
│   │   ├── Draft.jsx            # Preview, edit & kirim email
│   │   ├── TambahSponsor.jsx    # Tambah sponsor manual
│   │   ├── Riwayat.jsx          # Histori pengiriman
│   │   └── Setting.jsx          # Konfigurasi & debug
│   ├── store/
│   │   └── store.jsx            # Central state management
│   └── lib/
│       ├── constants.js         # Enums & batas sistem
│       ├── validators.js        # Validasi form
│       ├── langflow.js          # Langflow API client
│       ├── merge.js             # Placeholder merger
│       └── analytics.js        # Kalkulasi statistik
├── server/
│   ├── index.js                 # Express server & endpoints
│   └── composio.js              # Composio client
├── .env.example                 # Template environment variables
├── vite.config.js
└── package.json
```

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js >= 18
- Langflow berjalan di `localhost:7860`
- Akun Composio dengan project API key

### 1. Clone & Install Dependensi

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm --prefix server install
```

### 2. Konfigurasi Environment

Salin file `.env.example` menjadi `.env`, lalu isi nilainya:

```ini
# URL Langflow (biasanya localhost)
VITE_LANGFLOW_URL=http://localhost:7860
VITE_LANGFLOW_API_KEY=<api-key-dari-langflow>

# Flow IDs (dari Langflow UI -> Flow Settings)
VITE_LANGFLOW_SEARCH_FLOW_ID=<flow-id-pencarian>
VITE_LANGFLOW_DRAFT_FLOW_ID=<flow-id-draft>

# URL Express backend
VITE_COMPOSIO_BACKEND_URL=http://localhost:5000

# Composio API key (server-side only -- JANGAN tambahkan VITE_)
COMPOSIO_API_KEY=<api-key-dari-composio>

# Mode debug (true | false)
VITE_DEBUG_LANGFLOW=true
```

> **Keamanan**: `COMPOSIO_API_KEY` tidak boleh menggunakan prefix `VITE_`, kunci ini hanya boleh ada di sisi server dan tidak pernah terekspos ke browser.

### 3. Jalankan Aplikasi

Buka **dua terminal** secara bersamaan:

```bash
# Terminal 1, Backend Express
npm run server

# Terminal 2, Frontend Vite
npm run dev
```

### 4. Verifikasi Health Check

```bash
# Langflow
curl http://localhost:7860/health
# -> {"status":"ok"}

# Backend
curl http://localhost:5000/api/health
# -> {"ok":true,"composioKey":true}
```

Buka browser ke `http://localhost:5173`, aplikasi siap digunakan.

---

## 🔄 Alur Kerja Pengguna

```
[Deskripsikan Event]
        |
[AI mencari & meranking sponsor] <-- Langflow Search Flow
        |
[Pilih Sponsor (maks. 5)]
        |
[Isi Konteks Kampanye & Info PIC]
        |
[AI generate template email] <-- Langflow Draft Flow
        |
[Review & edit draft per sponsor]
        |
[Hubungkan Gmail via OAuth]
        |
[Kirim email (maks. 10/sesi)]
        |
[Pantau status & respons]
```

---

## 🤖 Integrasi AI (Langflow)

Aplikasi menggunakan dua Langflow flow:

### Search Flow
- Menerima deskripsi event dalam format teks
- Membuat query optimal untuk vector database sponsor
- Meranking sponsor berdasarkan 5 kriteria relevansi
- Menghasilkan dua output (prose + JSON), aplikasi mem-parse keduanya secara defensif dan mengambil kandidat JSON yang valid

### Draft Flow
- Menerima konteks event lengkap + data sponsor terpilih
- Menghasilkan satu template email dengan **placeholder dalam kurung siku** (`[Nama Perusahaan Sponsor]`, dll.)
- Template kemudian di-*merge* secara fuzzy dengan data nyata per sponsor

---

## 📊 Skala Relevansi Sponsor

| Skor | Tingkat |
|---|---|
| 80 – 100 | Sangat Relevan |
| 60 – 79  | Relevan |
| 40 – 59  | Cukup Relevan |
| 0 – 39   | Kurang Relevan |

---

## 🔒 Status & Enumerasi

### Status Hubungan (Relationship)
`Belum Dihubungi` → `Terkirim` → `Dibalas` → `Diterima` / `Ditolak` / `Diacuhkan`

### Status Pengiriman (Delivery)
`Queued` → `Sending` → `Sent` / `Failed`

---

## ⚙️ Batas Sistem

| Parameter | Nilai |
|---|---|
| Maksimum sponsor per kampanye | 5 |
| Maksimum email per sesi | 10 |
| Timeout Langflow request | 120 detik |

---

## 🛠️ Scripts

```bash
npm run dev          # Jalankan frontend (Vite :5173)
npm run server       # Jalankan backend (Express :5000)
npm run build        # Build produksi
npm run preview      # Preview build produksi
```

---

## 🐛 Debug

Aktifkan debug panel melalui **Setting** → Mode Debug, atau set `VITE_DEBUG_LANGFLOW=true` di `.env`.

Panel debug menampilkan:
- Endpoint & Flow ID yang dipanggil
- Input yang dikirim ke Langflow
- Waktu respons (ms) & HTTP status
- Raw response lengkap (dapat disalin)

---

## 📝 Catatan Teknis

- Semua UI dan copy ditulis dalam **Bahasa Indonesia**
- State aplikasi dipersistensikan ke `localStorage` (`sf_state_v1`) dengan debounce ~500ms
- Tidak ada TypeScript, kode murni JavaScript (ES Modules)
- Tidak ada dependency UI library eksternal, semua komponen dibangun dari scratch
- Design system menggunakan CSS custom properties (violet/purple brand palette)

---

*SponsorQu, Dari deskripsi event ke email sponsor, dalam satu alur kerja.*
