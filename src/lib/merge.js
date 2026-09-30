import { scoreToLevel, MAX_SPONSORS } from './constants.js'

/**
 * Parse search flow response candidates into sponsor array.
 * Evaluates ALL candidates and keeps the one with the MOST valid sponsors
 * (previously: first validating candidate won, even with fewer sponsors).
 * Entries without sponsor_name are dropped and counted.
 * Returns { sponsors, summary, chosenIndex, counts[], raw }
 */
export function parseSearchOutput(candidates) {
  let best = null
  const counts = []

  for (let i = 0; i < candidates.length; i++) {
    const text = candidates[i]
    try {
      // Strip markdown fences
      let clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
      // Slice outer { ... }
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start === -1 || end === -1) {
        counts.push({ index: i, valid: 0, dropped: 0, ok: false, levels: {} })
        continue
      }
      clean = clean.slice(start, end + 1)

      const parsed = JSON.parse(clean)
      if (!parsed.sponsor || !Array.isArray(parsed.sponsor)) {
        counts.push({ index: i, valid: 0, dropped: 0, ok: false, levels: {} })
        continue
      }

      const rawCount = parsed.sponsor.length
      const named = parsed.sponsor
        .filter(s => s.sponsor_name && String(s.sponsor_name).trim())
      const sponsors = named
        .map(s => normalizeSponsors(s))
        .slice(0, MAX_SPONSORS)

      // Histogram level relevansi — untuk diagnosa sebaran per kandidat
      // (mis. prose lengkap tapi JSON hanya skor atas = parser memfilter)
      const levels = {}
      for (const s of sponsors) {
        const lv = s.relevance_level || '?'
        levels[lv] = (levels[lv] || 0) + 1
      }

      counts.push({ index: i, valid: sponsors.length, dropped: rawCount - named.length, ok: sponsors.length > 0, levels })
      if (sponsors.length === 0) continue

      if (!best || sponsors.length > best.sponsors.length) {
        best = {
          sponsors,
          summary: parsed.summary || '',
          chosenIndex: i,
          raw: text,
        }
      }
      // Can't do better than the cap — stop early
      if (best.sponsors.length >= MAX_SPONSORS) break
    } catch {
      counts.push({ index: i, valid: 0, dropped: 0, ok: false, levels: {}, parseError: true })
      continue
    }
  }

  if (best) return { ...best, counts }
  return { sponsors: [], summary: '', chosenIndex: -1, counts, raw: candidates.join('\n---\n') }
}

function normalizeSponsors(s) {
  let score = parseInt(s.relevance_score, 10)
  if (isNaN(score)) score = 0
  score = Math.min(100, Math.max(0, score))

  let supportType = s.support_type
  if (typeof supportType === 'string') {
    supportType = supportType.split(';').map(x => x.trim()).filter(Boolean)
  } else if (!Array.isArray(supportType)) {
    supportType = []
  }

  return {
    sponsor_name: String(s.sponsor_name).trim(),
    industry: s.industry || null,
    location: s.location || null,
    relevance_score: score,
    relevance_level: RELEVANCE_LEVEL_LIST.includes(s.relevance_level)
      ? s.relevance_level
      : scoreToLevel(score),
    reason: Array.isArray(s.reason) ? s.reason : [],
    support_type: supportType,
    contact_email: s.contact_email || null,
    website: s.website || null,
    source: 'ai',
  }
}

const RELEVANCE_LEVEL_LIST = ['Sangat Relevan', 'Relevan', 'Cukup Relevan', 'Kurang Relevan']

// ── Draft template parsing ────────────────────────────────────────────────────
/**
 * Split a raw draft string into { subject, body }.
 * Format: first line starting "Subjek: ..." then "Isi:" marker.
 */
export function parseDraftOutput(text) {
  const lines = text.split('\n')
  let subject = ''
  let bodyStart = -1

  for (let i = 0; i < lines.length; i++) {
    if (!subject && lines[i].startsWith('Subjek:')) {
      subject = lines[i].replace(/^Subjek:\s*/i, '').trim()
    }
    if (lines[i].trim() === 'Isi:' || lines[i].startsWith('Isi:')) {
      bodyStart = i + 1
      break
    }
  }

  const body = bodyStart >= 0 ? lines.slice(bodyStart).join('\n').trim() : text.trim()
  return { subject, body }
}

// ── Placeholder merger (whitelist + alias + fuzzy) ─────────────────────────────
// Mendukung [..], {..}, {{..}}, [[..]], snake_case, EN/ID synonym, typo ringan.
// Urutan cocok: (1) persis whitelist → (2) kamus alias varian AI →
// (3) fuzzy semantik lama → (4) tak dikenal = leftover (blokir kirim).
export const PLACEHOLDER_RE = /[\[{]+([^\[\]{}]+)[\]}]+/g

// Whitelist resmi template email (kurung siku, huruf kecil, underscore).
export const PLACEHOLDER_WHITELIST = [
  'nama_perusahaan',
  'nama_acara',
  'tanggal_acara',
  'lokasi_acara',
  'jumlah_peserta',
  'jenis_dukungan',
  'link_proposal',
  'nama_pic',
  'jabatan_pic',
  'telepon_pic',
  'email_pic',
  'website_event',
]

const STOPWORDS = /\b(masukkan|isi|tulis|cantumkan|silakan|harap|mohon|di sini|berikut|tersebut|yang|please|enter|write|fill)\b/gi

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(STOPWORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatTanggalID(value) {
  if (!value || !String(value).trim()) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value).trim()
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Nilai kanonis per placeholder. null = field tidak tersedia →
// leftover "(tidak tersedia)" (blokir kirim, jangan karang nilai).
// Pengecualian: nama_perusahaan selalu tersedia (sponsor_name wajib ada).
const CANONICAL_DEFS = {
  nama_perusahaan: { resolve: (c, s) => s?.sponsor_name?.trim() || null, alwaysAvailable: true },
  nama_acara: { resolve: (c) => c?.namaEvent?.trim() || null },
  tanggal_acara: { resolve: (c) => formatTanggalID(c?.tanggalEvent) },
  lokasi_acara: { resolve: (c) => c?.lokasiEvent?.trim() || null },
  jumlah_peserta: { resolve: (c) => c?.perkiraanPeserta ? String(c.perkiraanPeserta).trim() : null },
  jenis_dukungan: { resolve: (c) => c?.kebutuhanSponsorship?.trim() || null },
  link_proposal: { resolve: (c) => c?.linkProposal?.trim() || null },
  nama_pic: { resolve: (c) => c?.namaPIC?.trim() || null },
  jabatan_pic: { resolve: (c) => c?.jabatanPIC?.trim() || null },
  telepon_pic: { resolve: (c) => c?.kontakPIC?.trim() || null },
  email_pic: { resolve: (c) => c?.emailPIC?.trim() || null },
  website_event: { resolve: (c) => c?.websiteAcara?.trim() || null },
}

// Kamus alias: varian ejaan AI yang diamati/diprediksi per placeholder kanonis.
// Kuncilookup dinormalisasi (lowercase, _/- → spasi) agar varian kurung,
// kapital, dan pemisah otomatis tercakup.
const PLACEHOLDER_ALIASES = {
  nama_perusahaan: [
    'nama perusahaan sponsor', 'nama perusahaan', 'nama sponsor',
    'perusahaan sponsor', 'company name', 'sponsor name', 'nama company',
    'name perusahaan', 'company', 'sponsor', 'perusahaan',
  ],
  nama_acara: [
    'nama acara', 'nama event', 'name acara', 'event name',
    'acara', 'nama kegiatan', 'judul acara', 'judul event',
  ],
  tanggal_acara: [
    'tanggal acara', 'tanggal event', 'tanggal kegiatan', 'date acara',
    'event date', 'tanggal pelaksanaan', 'waktu pelaksanaan',
    'jadwal acara', 'hari tanggal acara',
  ],
  lokasi_acara: [
    'lokasi acara', 'lokasi event', 'tempat acara', 'tempat event',
    'venue acara', 'venue event', 'lokasi kegiatan', 'alamat acara',
  ],
  jumlah_peserta: [
    'jumlah peserta', 'perkiraan peserta', 'total peserta', 'target peserta',
    'peserta', 'jumlah pengunjung', 'estimasi peserta', 'number of participants',
  ],
  jenis_dukungan: [
    'jenis dukungan', 'bentuk dukungan', 'kebutuhan sponsorship',
    'kebutuhan sponsor', 'dukungan', 'jenis sponsorship',
    'bentuk sponsorship', 'dukungan yang dibutuhkan',
  ],
  link_proposal: [
    'link proposal', 'tautan proposal', 'url proposal', 'lampiran proposal',
    'dokumen proposal', 'file proposal', 'proposal link',
  ],
  nama_pic: [
    'nama pic', 'nama anda', 'nama penanggung jawab', 'nama lengkap',
    'nama pengirim', 'your name', 'nama kontak',
  ],
  jabatan_pic: [
    'jabatan pic', 'jabatan anda', 'posisi pic', 'posisi anda',
    'jabatan', 'position', 'jabatan penanggung jawab', 'role pic',
  ],
  telepon_pic: [
    'telepon pic', 'nomor kontak anda', 'nomor telepon', 'nomor hp',
    'nomor wa', 'telepon anda', 'kontak anda', 'phone number',
    'contact number', 'no hp', 'no wa', 'kontak pic', 'nomor kontak',
    'telepon', 'nomor telepon anda',
  ],
  email_pic: [
    'email pic', 'alamat email anda', 'email anda', 'alamat email',
    'email address', 'your email', 'email pengirim', 'email',
  ],
  website_event: [
    'website event', 'website acara', 'situs acara', 'link website',
    'tautan website', 'website resmi', 'event website', 'web acara',
  ],
}

const ALIAS_LOOKUP = new Map()
for (const [canon, list] of Object.entries(PLACEHOLDER_ALIASES)) {
  for (const alias of list) ALIAS_LOOKUP.set(normalize(alias), canon)
}

// Cek apakah token ternormalisasi memuat salah satu kata (word-boundary aware
// untuk token pendek seperti wa/hp/cp/pj agar "bawa" tidak match).
function hasWord(norm, ...words) {
  return words.some(w => {
    if (w.length <= 3) return new RegExp(`\\b${w}\\b`, 'i').test(norm)
    return norm.includes(w)
  })
}

function hasAll(norm, ...words) {
  return words.every(w => hasWord(norm, w))
}

function hasAny(norm, ...words) {
  return words.some(w => hasWord(norm, w))
}

/**
 * Klasifikasi placeholder ternormalisasi ke kunci kanonis.
 * Urutan spesifik → umum. Return null bila tidak dikenal.
 */
function classifyPlaceholder(norm) {
  if (!norm) return null

  // 1. Company: (nama|name) + (perusahaan|company|corp|pt|sponsor) atau tunggal
  //    Contoh: {nama_perusahaan}, {name_perusahaan}, {nama_perusahaan_sponsor},
  //    {{company_name}}, [Nama Perusahaan Sponsor], {sponsor}, {perusahaan}
  if (
    (hasAny(norm, 'nama', 'name') && hasAny(norm, 'perusahaan', 'company', 'corp', 'pt', 'sponsor')) ||
    ['perusahaan', 'company', 'sponsor', 'nama sponsor', 'sponsor name', 'company name', 'nama perusahaan'].includes(norm)
  ) {
    return 'company'
  }

  // 2. Contact email perusahaan — harus sebelum email PIC generik
  if (hasWord(norm, 'email') && hasAny(norm, 'perusahaan', 'company', 'sponsor')) return 'contactEmail'
  if (hasAll(norm, 'kontak', 'email')) return 'contactEmail'

  // 3. Kontak PIC: nomor/telepon/WA/HP/CP/PJ/contact/phone
  if (
    hasAny(norm, 'kontak', 'contact', 'telepon', 'telp', 'telephone', 'phone', 'whatsapp', 'wa', 'hp', 'cp', 'pj', 'nomor', 'number', 'nowa') ||
    (hasWord(norm, 'no') && hasAny(norm, 'hp', 'wa', 'telp', 'kontak', 'telepon'))
  ) {
    return 'kontakPIC'
  }

  // 4. Nama PIC: (nama|name) + (anda|you|your|pic|penanggung|pengirim|sender|lengkap)
  //    Token tunggal "nama"/"name"/"nama lengkap" → PIC (bukan perusahaan).
  if (hasAny(norm, 'nama', 'name')) return 'namaPIC'

  // 5. Email PIC generik
  if (hasWord(norm, 'email') || hasWord(norm, 'mail') || hasWord(norm, 'e-mail')) return 'emailPIC'

  // 6. Lokasi: kota/city/lokasi/location/domisili/alamat/address
  if (hasAny(norm, 'kota', 'city', 'town', 'lokasi', 'location', 'domisili', 'alamat', 'address', 'kabupaten', 'provinsi', 'daerah')) {
    return 'location'
  }

  // 7. Industri
  if (hasAny(norm, 'industri', 'industry', 'bidang', 'field', 'sektor', 'sector', 'bisnis', 'business', 'kategori', 'vertical')) {
    return 'industry'
  }

  // 9. Link proposal
  if (hasWord(norm, 'proposal') || hasWord(norm, 'prososal')) return 'linkProposal'

  // 10. Website acara
  if (hasAny(norm, 'website', 'site', 'situs', 'web', 'url acara', 'link acara')) return 'websiteAcara'
  if (hasAny(norm, 'tautan', 'link', 'url', 'lampiran') && hasAny(norm, 'website', 'site', 'situs', 'acara', 'event', 'resmi')) {
    return 'websiteAcara'
  }

  return null
}

// Pemetaan kunci fuzzy lama → kunci kanonis. Tiga konsep turunan sponsor
// (location/industry/contactEmail) tidak ada padanannya di whitelist —
// dipertahankan dengan fallback lama agar template gaya lama tetap jalan.
const LEGACY_TO_CANON = {
  company: 'nama_perusahaan',
  namaPIC: 'nama_pic',
  kontakPIC: 'telepon_pic',
  emailPIC: 'email_pic',
  linkProposal: 'link_proposal',
  websiteAcara: 'website_event',
}

function resolveLegacyValue(key, campaign, sponsor) {
  switch (key) {
    case 'location':
      return sponsor?.location || 'Indonesia'
    case 'industry':
      return sponsor?.industry || 'perusahaan terkemuka di bidangnya'
    case 'contactEmail':
      return sponsor?.contact_email || 'email resmi perusahaan'
    default:
      return null
  }
}

// Klasifikasi satu token placeholder ke { kind, key }:
// kind 'canonical' (whitelist/alias/fuzzy-terpetakan) atau 'legacy'
// (location/industry/contactEmail). null = tak dikenal.
function canonicalizePlaceholder(inner) {
  const core = String(inner).trim().toLowerCase()
  if (PLACEHOLDER_WHITELIST.includes(core)) {
    return { kind: 'canonical', key: core }
  }
  const norm = normalize(inner)
  if (!norm) return null
  if (ALIAS_LOOKUP.has(norm)) {
    return { kind: 'canonical', key: ALIAS_LOOKUP.get(norm) }
  }
  const legacy = classifyPlaceholder(norm)
  if (!legacy) return null
  if (LEGACY_TO_CANON[legacy]) {
    return { kind: 'canonical', key: LEGACY_TO_CANON[legacy] }
  }
  return { kind: 'legacy', key: legacy }
}

// Tokens that must STAY as leftovers — never auto-fill (dicek versi normalized)
const TRAP_PATTERNS = [
  /^nomor rekening$/i,
  /^no rekening$/i,
  /^paket sponsorship$/i,
  /^paket sponsor$/i,
  /^batas$/i,
  /^tautan$/i,
  /^link$/i,
  /^url$/i,
]

function isTrapped(tokenInner) {
  const norm = normalize(tokenInner)
  return TRAP_PATTERNS.some(p => p.test(norm) || p.test(tokenInner.trim()))
}

/**
 * Ketersediaan placeholder per data aktual. Dipakai untuk membangun
 * FIELD_TERSEDIA / FIELD_TIDAK_ADA dan untuk menilai leftover.
 * Returns { tersedia: ['[nama_acara]', ...], tidakAda: [...] }
 */
export function getAvailablePlaceholders(campaign, sponsor) {
  const tersedia = []
  const tidakAda = []
  for (const name of PLACEHOLDER_WHITELIST) {
    const value = CANONICAL_DEFS[name].resolve(campaign, sponsor)
    ;(value ? tersedia : tidakAda).push(`[${name}]`)
  }
  return { tersedia, tidakAda }
}

/**
 * Blok konteks {context} untuk prompt draft: daftar field tersedia/tidak-ada
 * dalam istilah whitelist agar AI hanya memakai placeholder yang diizinkan.
 */
export function buildDraftContext(campaign, sponsor) {
  const { tersedia, tidakAda } = getAvailablePlaceholders(campaign, sponsor)
  return [
    `FIELD_TERSEDIA: ${tersedia.join(', ') || '-'}`,
    `FIELD_TIDAK_ADA: ${tidakAda.join(', ') || '-'}`,
  ].join('\n')
}

/**
 * Merge teks (subject maupun body): ganti [..], {..}, {{..}} dengan
 * data campaign/sponsor. Returns { merged, leftovers[] }
 * - Field tersedia → diganti nilai.
 * - Placeholder field TIDAK tersedia → leftover "(tidak tersedia)"
 *   (blokir kirim; jangan karang nilai pengganti).
 * - Token tak dikenal → leftover (blokir kirim, highlight kuning).
 */
export function mergeText(text, campaign, sponsor) {
  if (!text) return { merged: text || '', leftovers: [] }
  const leftovers = []

  const merged = String(text).replace(PLACEHOLDER_RE, (match, inner) => {
    if (isTrapped(inner)) {
      leftovers.push(match)
      return match
    }

    const hit = canonicalizePlaceholder(inner)

    if (!hit) {
      // Unknown token → leftover
      leftovers.push(match)
      return match
    }

    if (hit.kind === 'legacy') {
      const value = resolveLegacyValue(hit.key, campaign, sponsor)
      if (value) return value
      leftovers.push(`${match}(kosong)`)
      return match
    }

    const def = CANONICAL_DEFS[hit.key]
    const value = def.resolve(campaign, sponsor)
    if (value) return value
    leftovers.push(def.alwaysAvailable ? `${match}(kosong)` : `${match}(tidak tersedia)`)
    return match
  })

  return { merged, leftovers }
}

/**
 * Merge subject + body sekaligus. Leftovers digabung (unik).
 * Tetap diekspor sebagai mergeDraft agar kompatibel dengan pemanggil lama.
 */
export function mergeDraft(body, campaign, sponsor) {
  return mergeText(body, campaign, sponsor)
}

export function mergeSubjectAndBody(subject, body, campaign, sponsor) {
  const s = mergeText(subject || '', campaign, sponsor)
  const b = mergeText(body || '', campaign, sponsor)
  const seen = new Set()
  const leftovers = [...s.leftovers, ...b.leftovers].filter(x => {
    if (seen.has(x)) return false
    seen.add(x)
    return true
  })
  return { subject: s.merged, body: b.merged, leftovers }
}

/**
 * Build the search input string (exactly 3 newline-joined lines).
 * Estimasi peserta diisi belakangan di Detail Kampanye — saat pencarian
 * baris ketiga dikirim '-' agar kontrak 3-baris flow Langflow tetap utuh.
 */
export function buildSearchInput({ jenisEvent, perkiraanPeserta, catatanEvent }) {
  const peserta = String(perkiraanPeserta || '').trim()
  return [
    `Jenis Event: ${jenisEvent}`,
    `Perkiraan Peserta: ${peserta || '-'}`,
    `Catatan Event: ${catatanEvent}`,
  ].join('\n')
}

/**
 * Build the draft input string per 01-CONTRACTS.md §7.
 */
export function buildDraftInput(campaign, sponsor) {
  const lines = [
    `Nama Event: ${campaign.namaEvent}`,
    `Jenis Event: ${campaign.jenisEvent}`,
    `Tanggal Event: ${campaign.tanggalEvent}`,
    `Lokasi Event: ${campaign.lokasiEvent}`,
    `Perkiraan Peserta: ${campaign.perkiraanPeserta}`,
    `Penyelenggara: ${campaign.penyelenggara}`,
    `Catatan Event: ${campaign.catatanEvent}`,
    `Kebutuhan Sponsorship: ${campaign.kebutuhanSponsorship}`,
    `Tone Email: ${campaign.toneEmail}`,
  ]

  if (campaign.informasiTambahan && campaign.informasiTambahan.trim()) {
    lines.push(`Informasi Tambahan: ${campaign.informasiTambahan}`)
  }
  if (campaign.jabatanPIC && campaign.jabatanPIC.trim()) {
    lines.push(`Jabatan PIC: ${campaign.jabatanPIC}`)
  }

  lines.push('')
  lines.push('Sponsor terpilih:')

  const parts = [`1. ${sponsor.sponsor_name}`]
  if (sponsor.industry) parts[0] += ` | Industri: ${sponsor.industry}`
  if (sponsor.location) parts[0] += ` | Lokasi: ${sponsor.location}`
  if (sponsor.reason?.length) parts[0] += ` | Relevansi: ${sponsor.reason.join('; ')}`
  if (sponsor.support_type?.length) parts[0] += ` | Dukungan: ${sponsor.support_type.join(', ')}`
  lines.push(parts[0])

  lines.push('')
  lines.push('Buatkan satu template email sponsorship dengan placeholder dalam kurung siku seperti [Nama Perusahaan Sponsor].')
  lines.push('')
  lines.push(buildDraftContext(campaign, sponsor))

  return lines.join('\n')
}

/**
 * Build input untuk mode "Buat Draft Manual": draft buatan pengguna dikirim
 * ke AI untuk dirapikan — AI wajib mempertahankan placeholder whitelist
 * persis, menghapus kalimat ber-field-tidak-ada, dan tidak mengisi nilai asli.
 */
export function buildManualDraftInput(templateSubject, templateBody, campaign, sponsor) {
  return [
    'Berikut draft email sponsorship buatan pengguna. Tugasmu: rapikan bahasa Indonesianya agar profesional dan persuasif untuk penawaran sponsorship.',
    'PERTAHANKAN semua placeholder whitelist PERSIS seperti aslinya (kurung siku, huruf kecil, underscore). Jangan ubah ejaan placeholder, jangan membuat placeholder baru, dan jangan mengganti placeholder dengan data asli.',
    'Hapus seluruh kalimat atau baris yang membutuhkan field di FIELD_TIDAK_ADA. Jangan tulis nilai asli field langsung di email.',
    '',
    buildDraftContext(campaign, sponsor),
    `Whitelist: ${PLACEHOLDER_WHITELIST.map(p => `[${p}]`).join(', ')}`,
    '',
    `Subjek (draft pengguna): ${templateSubject?.trim() || '-'}`,
    'Isi (draft pengguna):',
    `${templateBody?.trim() || ''}`,
    '',
    'Keluarkan hasil dengan format persis:',
    'Subjek: ...',
    '',
    'Isi:',
    '...',
  ].join('\n')
}
