import { scoreToLevel } from './constants.js'

/**
 * Parse search flow response candidates into sponsor array.
 * Tries each candidate in order; keeps first that validates as sponsor JSON.
 * Returns { sponsors, summary, chosenIndex, raw }
 */
export function parseSearchOutput(candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const text = candidates[i]
    try {
      // Strip markdown fences
      let clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
      // Slice outer { ... }
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start === -1 || end === -1) continue
      clean = clean.slice(start, end + 1)

      const parsed = JSON.parse(clean)
      if (!parsed.sponsor || !Array.isArray(parsed.sponsor)) continue

      const sponsors = parsed.sponsor
        .filter(s => s.sponsor_name && String(s.sponsor_name).trim())
        .map(s => normalizeSponsors(s))
        .slice(0, 5)

      if (sponsors.length === 0) continue

      return {
        sponsors,
        summary: parsed.summary || '',
        chosenIndex: i,
        raw: text,
      }
    } catch {
      continue
    }
  }
  return { sponsors: [], summary: '', chosenIndex: -1, raw: candidates.join('\n---\n') }
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

// ── Fuzzy placeholder merger (toleran lebar) ────────────────────────────────────
// Mendukung [..], {..}, {{..}}, [[..]], snake_case, EN/ID synonym, typo ringan.
export const PLACEHOLDER_RE = /[\[{]+([^\[\]{}]+)[\]}]+/g

const STOPWORDS = /\b(masukkan|isi|tulis|cantumkan|silakan|harap|mohon|di sini|berikut|tersebut|yang|please|enter|write|fill)\b/gi

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(STOPWORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
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

  // 8. Deadline (trap "batas"/"tautan" tunggal sudah disaring sebelum ini)
  if (hasAny(norm, 'deadline', 'tenggat', 'due', 'closing', 'tenggat waktu', 'batas waktu', 'batas akhir', 'tanggal deadline')) {
    return 'deadline'
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

function resolveValue(key, campaign, sponsor) {
  switch (key) {
    case 'company':
      return sponsor?.sponsor_name || null
    case 'location':
      return sponsor?.location || 'Indonesia'
    case 'industry':
      return sponsor?.industry || 'perusahaan terkemuka di bidangnya'
    case 'deadline':
      return campaign?.deadlineRespons
        ? new Date(campaign.deadlineRespons).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'yang akan kami konfirmasi lebih lanjut'
    case 'namaPIC':
      return campaign?.namaPIC || null
    case 'kontakPIC':
      return campaign?.kontakPIC || null
    case 'emailPIC':
      return campaign?.emailPIC || null
    case 'linkProposal':
      return campaign?.linkProposal || 'akan kami kirimkan menyusul'
    case 'websiteAcara':
      return campaign?.websiteAcara || 'website resmi acara kami'
    case 'contactEmail':
      return sponsor?.contact_email || 'email resmi perusahaan'
    default:
      return null
  }
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
 * Merge teks (subject maupun body): ganti [..], {..}, {{..}} dengan
 * data campaign/sponsor. Returns { merged, leftovers[] }
 */
export function mergeText(text, campaign, sponsor) {
  if (!text) return { merged: text || '', leftovers: [] }
  const leftovers = []

  const merged = String(text).replace(PLACEHOLDER_RE, (match, inner) => {
    if (isTrapped(inner)) {
      leftovers.push(match)
      return match
    }

    const norm = normalize(inner)
    const key = classifyPlaceholder(norm)

    if (key) {
      const value = resolveValue(key, campaign, sponsor)
      if (value) return value
      leftovers.push(`${match}(kosong)`)
      return match
    }

    // Unknown token → leftover (blokir kirim, highlight kuning)
    leftovers.push(match)
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
 */
export function buildSearchInput({ jenisEvent, perkiraanPeserta, catatanEvent }) {
  return [
    `Jenis Event: ${jenisEvent}`,
    `Perkiraan Peserta: ${perkiraanPeserta}`,
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

  return lines.join('\n')
}
