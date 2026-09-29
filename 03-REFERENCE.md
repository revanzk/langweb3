# Reference: Prompts, Outputs, Design, Debug, Demo

> CONTEXT: Vite 6 + React 19 + Express 4. Flows search `5d9c3617`, draft
> `45313891`. Draft = `Subjek:`+`Isi:` with `[brackets]`. Full contracts in
> `01-CONTRACTS.md`.

## 1. Search flow graph (`5d9c3617` "tama flow", 17 nodes / 13 edges)

`ChatInput.message` fans out to matching-prompt `user_input` AND vector
`search_query`. `search_results → Parser → sponsor_results`. Ranker LLM →
prose (ChatOutput#1) AND → JSON-parser chain (ChatOutput#2). File→Split→Astra
ingestion branch exists. One disconnected `LLMSelector` node is harmless —
delete it if confusing. Model temps observed: 0.1/0.1/0.02.

Draft flow (`45313891` "draft email"): 4 nodes linear —
`ChatInput → Prompt → LanguageModel → ChatOutput`. Single text output.

## 2. Prompt verbatim (rebuild Langflow with THESE)

### 2.1 Query planner (observed in flow, 532 chars, full text)

```text
Kamu adalah Query Planner untuk platform pencari sponsor event.

Input event dari user:
{user_input}

Ubah input tersebut menjadi SATU search query yang optimal untuk vector database sponsor.

Prioritaskan informasi yang tersedia tentang:

jenis event

target audiens

lokasi

jumlah peserta

kebutuhan sponsorship

kategori industri perusahaan yang relevan

Jangan menyebut nama perusahaan.
Jangan memberikan rekomendasi sponsor.
Jangan mengarang informasi.
Jangan menjelaskan prosesmu.

Output HANYA search query dalam teks biasa.
```

### 2.2 Sponsor ranker (from spec, full text)

```text
Kamu adalah AI Sponsor Matching Assistant. Tugasmu adalah memilih dan merangking calon sponsor yang paling relevan untuk sebuah event berdasarkan data yang tersedia.

INFORMASI ACARA / KEBUTUHAN PENGGUNA:
{user_input}

HASIL PENCARIAN DATABASE SPONSOR:
{sponsor_results}
---

TUGAS:
Pilih maksimal 5 calon sponsor yang paling relevan dari data di atas. Jika tidak ada yang cukup relevan, pilih lebih sedikit atau nyatakan tidak ada kandidat yang memadai.

KRITERIA PENILAIAN RELEVANSI:
1. Kesesuaian industri dengan tema/jenis acara
2. Kesesuaian target audiens sponsor dengan peserta acara
3. Kesesuaian jenis acara dengan preferred_event_types sponsor
4. Adanya sinyal kemitraan atau rekam jejak sponsorship
5. Kesesuaian lokasi (jika tersedia dan relevan)

SKALA MATCH SCORE (0–100):
- 80–100: Sangat Relevan
- 60–79: Relevan
- 40–59: Cukup Relevan
- 0–39: Kurang Relevan

ATURAN KETAT:
- Gunakan HANYA informasi dari {user_input} dan {sponsor_results}.
- Jangan mengarang fakta, nama, kontak, atau link yang tidak ada di data.
- Jika field tertentu (lokasi, industri, dsb.) bernilai null atau kosong, tetap bisa pilih sponsor asalkan field "text" mengandung informasi yang cukup relevan.
- Untuk field yang memang tidak ada datanya, tulis "Informasi tidak tersedia" — jangan skip atau isi dengan asumsi.
- Jangan pilih sponsor hanya karena namanya terdengar relevan tanpa dasar data.
- Jangan tampilkan proses berpikir atau analisis internal.

FORMAT OUTPUT (ikuti persis, jangan tambah atau kurangi field):

Rekomendasi Sponsor untuk [nama/jenis acara dari user_input]

[Satu paragraf singkat: kenapa kelompok sponsor ini dipilih secara umum, berdasarkan karakteristik acara.]

---

1. [Nama Perusahaan]
   Match Score: [XX/100]
   Tingkat Relevansi: [Sangat Relevan / Relevan / Cukup Relevan / Kurang Relevan]
   Industri: [dari data, atau "Informasi tidak tersedia"]
   Lokasi: [dari data, atau "Informasi tidak tersedia"]
   Alasan Relevansi:
   - [alasan 1 berbasis data]
   - [alasan 2 berbasis data]
   Bentuk Dukungan yang Cocok:
   - [dari sponsorship_types / text, atau "Informasi tidak tersedia"]
   Kontak: [contact_email dari data, atau "Informasi tidak tersedia"]
   Website: [website dari data, atau "Informasi tidak tersedia"]

2. [ulangi struktur yang sama]

...

---
Rekomendasi ini didasarkan pada data sponsor yang tersedia di database.
```

### 2.3 JSON parser (LLM temp 0.1, full text — structured-output failed, this shortcut is proven)

```text
Kamu adalah AI Sponsor Matching Assistant.
Tugas: Cocokkan event user dengan database sponsor, lalu hasilkan output LANGSUNG dalam format JSON murni.

Data dan Permintaan:
{input_data}

ATURAN STRUKTUR JSON (WAJIB PERSIS):
Output harus berupa JSON dengan field:
- summary: teks ringkasan (string)
- sponsor: list of object, tiap object berisi:
    * sponsor_name: nama perusahaan (string)
    * industry: industri perusahaan (string/null)
    * location: kota lokasi (string/null)
    * relevance_score: integer 0-100
    * relevance_level: string (Sangat Relevan / Relevan / Cukup Relevan)
    * reason: array of string
    * support_type: array of string
    * contact_email: string email (atau null)
    * website: string link (atau null)

DILARANG menambahkan teks pembuka, penutup, atau markdown backticks. Mulai langsung dengan kurung kurawal pembuka JSON.
```

### 2.4 Draft flow prompt

No finalized prompt text on record — the live flow takes combined event +
sponsor context and returns the `Subjek:`/`Isi:` template with `[brackets]`
(see real sample §3). If rebuilding: instruct one template, bracket
placeholders only, Indonesian formal tone input as a variable.

## 3. Real outputs (trimmed; shapes normative)

Search sponsor entry (real run: Indodax, 88, Sangat Relevan):

```json
{"sponsor_name":"Indodax","industry":"Fintech / crypto technology",
 "location":"Jakarta","relevance_score":88,"relevance_level":"Sangat Relevan",
 "reason":["Industri fintech/technology sangat selaras …"],
 "support_type":["Confirmed partnership route; …"],
 "contact_email":"marketing@indodax.com","website":"https://indodax.com/"}
```

Nulls occur in the wild (`contact_email:null` seen) — hide, don't invent.
Draft template excerpt (real, 2552 chars):

```text
Subjek: Penawaran Kerja Sama Sponsorship Hackathon AI … – [Nama Perusahaan Sponsor]

Isi:
Yth. Tim Sponsorship & CSR [Nama Perusahaan Sponsor]
di [Kota Perusahaan Sponsor]
…
Hormat kami,
[Nama Anda]
Nomor Telepon/WhatsApp: [Nomor Kontak Anda]
Alamat Email: [Alamat Email Anda]
…
[Tautan Proposal Sponsorship]
```

History row after send:

```json
{"sponsor":"Indodax","event":"Hackathon AI 2026","delivery":"Sent",
 "relationship":"Terkirim","threadId":"19b… (nullable — tolerate)"}
```

## 4. Design tokens (compact — apply LAST, styling only)

```css
--brand-500:#6D5AE6; --brand-600:#5A48D6; --brand-400:#8B7BF0;
--brand-200:#C9BEF8; --brand-100:#EEEBFF; --brand-50:#F6F4FF;
--accent-pink:#F49AC1; --accent-cyan:#2DD4BF; --accent-coral:#FF7A59;
--surface:#FFFFFF; --page:#FAFAFF; --surface-muted:#F1EEFB;
--text-1:#1B1733; --text-2:#5B5772; --text-3:#9A97AC;
--border-subtle:#E7E4F2; --border-strong:#D7D3E8;
--state-success:#12805c/#e3f6ee; --state-info:#1c64f2/#e8f0fe;
--state-warning:#b45309/#fdf1dc; --state-danger:#b42318/#fdeceb;
```

Radius 8/12/24/32/pill-9999. Violet-tinted shadows
(sm/md/lg + glow). Plus Jakarta Sans display + Inter body. Spacing 4→120.
Motion 150/250/400ms + stagger; honor `prefers-reduced-motion`.
Patterns: white cards + 1px border; pill buttons (primary glow hover);
chips per status + brand Manual; sponsor card (avatar, meta ellipsis, score,
reasons+expander, support, dashed contact); 12px muted table headers, 48px
rows; sidebar 240px + 64px blur topbar (drawer <1024px). Relevance colors
always WITH text labels. Inputs 16px on mobile (blocks iOS auto-zoom);
touch targets ≥40px.

Layout laws (proven): every grid (multi AND implicit single-column) uses
`minmax(0,1fr)`; flex text children get `min-width:0`; AI-fed text gets
`overflow-wrap:anywhere`; equal heights via track stretch + inner 100%.

## 5. Debug playbook

| Symptom | Cause (proven) | Fix |
|---|---|---|
| "no data" output | `input_type:"text"` on Chat-Input-only flows | Always `"chat"` |
| No JSON candidate | Prompt changed / parser failed | Read FULL raw, extend parser + test |
| No placeholders | Draft emits `[brackets]`, never `{{}}` | Merge follows brackets |
| Placeholder never resolves | LLM invents phrasings per run | Fuzzy matcher + Merge-Ulang |
| White screen on navigate | Dangling router ref without import | Grep-audit after refactors |
| Overlap/cut cards | Implicit-grid max-content growth | `minmax(0,1fr)` everywhere (never fixed widths) |
| Toggle moves, view doesn't | Stale dev bundle | Kill all node dev, fresh run, hard refresh, zoom 100% |
| Looks "zoomed" | iOS auto-zoom / browser / OS zoom | 16px inputs; Ctrl+0; OS scale |
| `Sent` never appears | Gmail disconnected / backend down | Connect card → statuses → logs |
| Port busy | Zombie vite | Kill node dev (keep `server/index.js`) |

Debug panel spec: collapsible, auto-opens on failure; endpoint, flow ID, sent
input, ms, HTTP status, candidate list + chosen index, FULL text, FULL raw
(scrollable + count + copy), component-trace button (explicit 1-run re-run
with `output_type:"debug"`). localStorage: `sf_last_run`, `sf_debug`,
`sf_view`. Overflow finder (console):
`[...document.querySelectorAll('.hasil-item *')].filter(e=>e.scrollWidth>e.clientWidth+3)`

## 6. Demo script (7 minutes)

| # | Do | Say |
|---|---|---|
| 0 | Landing scroll (if built) | "Committees spend days finding sponsors. One flow does it." |
| 1 | Fill event → submit | "One description — never re-typed." Narrate during AI wait |
| 2 | Results: score/chip/reasons/filter/sort/Card-List | "Max five, every claim attached, nothing invented." |
| 3 | Select → campaign (reused context) → PIC/links | "Context carries over; PIC fills the signature." |
| 4 | Generate → tabs | "One AI call per campaign, merged instantly." |
| 5 | Draft: yellow `[..]` demo, manual email | "Unresolved blocks sending — named and fixable." |
| 6 | Connect (pre-connected = green) | "Real OAuth; credentials never touch our code." |
| 7 | Pre-send → Kirim → queue → Riwayat | "Ten per session, per-recipient status, history recorded." |
| 8 | Boxes + outcome buttons + statuses | "Outcomes user-tracked; every AI step inspectable." |

Fallbacks: AI slow → narrate debug panel. Send must not fire → stop after
pre-send check.
