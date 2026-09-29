# Contracts (LAW — never invent shapes; on mismatch SHOW raw)

> CONTEXT: Vite 6 + React 19 + Express 4. Flows search `5d9c3617`, draft
> `45313891`, `input_type:"chat"` ALWAYS. Relevance
> Sangat Relevan/Relevan/Cukup Relevan/Kurang Relevan. Limits: max 5 sponsors,
> max 10 emails/session (warn, never silent-cut). Draft = `Subjek:` + `Isi:`
> with Indonesian `[brackets]` (never `{{}}`).

## 1. Langflow run contract

```text
POST {BASE}/api/v1/run/{flow_id}
Headers: Content-Type: application/json, x-api-key: <key>
Body: { "input_request": {
  "input_value": "<combined text>",
  "input_type": "chat",
  "output_type": "text" } }
```

Response: `{ session_id, outputs: [{ inputs, outputs: [{
results: { message: { text } }, artifacts, ... }] }] }`.
Timeout 120s (AbortController). Functions never throw — return `{ok, ...}`.

**Why `"chat"`:** flows expose Chat Input nodes only (no Text Input). With
`"text"`, input arrives empty and the flow politely returns "no data".

**Search emits TWO outputs** (structured prose + JSON parser); order is NOT
guaranteed → try parsing each candidate, keep the first validating as sponsor
JSON. **Draft emits ONE output** (template text).

## 2. Search output contract (pick the candidate parsing as THIS)

```json
{
  "summary": "string (may be empty)",
  "sponsor": [{
    "sponsor_name": "string (required — drop entry if missing)",
    "industry": "string | null",
    "location": "string | null",
    "relevance_score": "integer 0-100 (coerce+clamp, default 0)",
    "relevance_level": "Sangat Relevan | Relevan | Cukup Relevan | Kurang Relevan (else derive from score)",
    "reason": ["string"],
    "support_type": ["string"] (if a string arrives, split on `;`),
    "contact_email": "string | null",
    "website": "string | null"
  }]
}
```

Max 5 (slice). Parse defensively: strip markdown fences, slice outer `{...}`,
validate shape. Nulls hide in UI (except support → *tidak diketahui*).
Score bands: 80–100 / 60–79 / 40–59 / 0–39.

## 3. Draft output contract (REAL shape)

Single text: first `Subjek: ...` line → subject; everything after the `Isi:`
marker → body. Placeholders are Indonesian `[brackets]` — the LLM invents
phrasings every run, so NEVER exact-match (see §4).

| Token pattern | Source | When empty |
|---|---|---|
| `[Nama Perusahaan Sponsor]` (+ company+nama variants) | `sponsor_name` | Never (required) |
| `[Kota/Lokasi …]`, kota/lokasi/domisili | `location` | `Indonesia` |
| `industri/bidang/sektor …` | `industry` | `perusahaan terkemuka di bidangnya` |
| `[Tanggal Deadline]`, deadline/tenggat | `deadlineRespons` (id-ID date) | `yang akan kami konfirmasi lebih lanjut` |
| `[Nama Anda]`, nama+PIC/penanggung | `namaPIC` | Required (validated) |
| `[Nomor Kontak …]`, kontak/telp/WA/HP family | `kontakPIC` | Required (validated) |
| `[Alamat Email …]`, email+PIC | `emailPIC` | Required + format (validated) |
| `[Tautan … Proposal …]`, link+proposal | `linkProposal` | `akan kami kirimkan menyusul` |
| `[Tautan … Website …]`, link+website | `websiteAcara` | `website resmi acara kami` |
| email+perusahaan mention | `contact_email` | `email resmi perusahaan` |

## 4. Placeholder matching rules (fuzzy, ordered)

1. Normalize: lowercase, `/ -` → space, strip stopwords (`masukkan, isi,
   tulis, cantumkan, silakan, harap, mohon, di sini, berikut, tersebut, yang`).
2. Rules specific→general: company-name first, then email, contact, personal
   name, location, industry, deadline, links.
3. Short patterns (`wa/hp/cp/pj`) use word boundaries (`bawa` must NOT match).
4. Unknown token → leftover (blocks that draft's send, highlighted yellow).
   Required-but-empty → leftover flagged `(kosong)`.
5. Traps that MUST stay leftover: `[Nomor Rekening]`, `[Paket Sponsorship]`,
   `[Batas]`, `[Tautan]` alone.

## 5. Validation rules (exact messages, Indonesian)

- Search: Jenis Event min 3 (`Jenis event wajib diisi, minimal 3 karakter.`);
  Peserta digits only ≥10; Catatan 30–2000 with live counter.
- Campaign: nama/tanggal/lokasi/penyelenggara/kebutuhan required; tanggal not
  past; namaPIC/kontakPIC/emailPIC required (+email format); website/proposal
  must start `http(s)://` if filled; tone default Formal. Same 3 event-context
  rules as search (shared validator).
- Manual sponsor rows: name min 3, email format; duplicate names rejected
  (case-insensitive, vs AI + manual).
- Draft queue gate per draft: valid `to` (manual fill allowed/required when AI
  returned null) + zero unresolved `[..]` leftovers.

## 6. Status enums (fixed — no new strings without updating this file)

- Relationship: `Belum Dihubungi → Terkirim → Dibalas → Diterima/Ditolak/Diacuhkan`
  (`Deal` retired). `Dibalas` ONLY from reply-check; the other three manual.
- Delivery (independent, technical): `Queued → Sending → Sent / Failed`.
- Boxes: Terkirim = `delivery Sent`; others exact relationship match.
- `Diacuhkan` stored + neutral chip, excluded from the 4 boxes.

## 7. Input builders (verbatim — do not reorder/reword)

Search (exactly 3 `\n`-joined lines):

```text
Jenis Event: {jenisEvent}
Perkiraan Peserta: {perkiraanPeserta}
Catatan Event: {catatanEvent}
```

Draft (exact order; omit `Informasi Tambahan` line when empty; sponsor
segments appended only when data exists):

```text
Nama Event: {namaEvent}
Jenis Event: {jenisEvent}
Tanggal Event: {tanggalEvent}
Lokasi Event: {lokasiEvent}
Perkiraan Peserta: {perkiraanPeserta}
Penyelenggara: {penyelenggara}
Catatan Event: {catatanEvent}
Kebutuhan Sponsorship: {kebutuhanSponsorship}
Tone Email: {toneEmail}
[Informasi Tambahan: {...}]

Sponsor terpilih:
1. {name}[ | Industri: {industry}][ | Lokasi: {location}][ | Relevansi: {reason joined "; "}][ | Dukungan: {support joined ", "}]

Buatkan satu template email sponsorship dengan placeholder dalam kurung siku seperti [Nama Perusahaan Sponsor].
```

## 8. Real samples (trimmed; shapes normative, values demo)

Search sponsor entry:

```json
{
  "sponsor_name": "Indodax",
  "industry": "Fintech / crypto technology",
  "location": "Jakarta",
  "relevance_score": 88,
  "relevance_level": "Sangat Relevan",
  "reason": ["Industri fintech/technology sangat selaras …"],
  "support_type": ["Confirmed partnership route; …"],
  "contact_email": "marketing@indodax.com",
  "website": "https://indodax.com/"
}
```

Nulls occur in the wild (`contact_email: null` seen) — hide, don't invent.
Draft template excerpt:

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
 "relationship":"Terkirim","threadId":"19b… (may be null — tolerate)"}
```
