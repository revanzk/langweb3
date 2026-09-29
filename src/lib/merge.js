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

// ── Fuzzy placeholder merger ──────────────────────────────────────────────────
const STOPWORDS = /\b(masukkan|isi|tulis|cantumkan|silakan|harap|mohon|di sini|berikut|tersebut|yang)\b/gi

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[/\-]/g, ' ')
    .replace(STOPWORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build fallback map from campaign + sponsor data.
 * Returns Map<bracketToken, replacementValue>
 */
function buildFallbackMap(campaign, sponsor) {
  return {
    // Company name — multiple phrasings
    company: {
      patterns: [/nama perusahaan sponsor/i, /nama perusahaan/i, /nama sponsor/i],
      value: sponsor?.sponsor_name || null,
    },
    location: {
      patterns: [/kota[/ ]?(?:perusahaan|sponsor|lokasi)?/i, /lokasi/i, /domisili/i],
      value: sponsor?.location || 'Indonesia',
    },
    industry: {
      patterns: [/industri|bidang|sektor/i],
      value: sponsor?.industry || 'perusahaan terkemuka di bidangnya',
    },
    deadline: {
      patterns: [/tanggal deadline|deadline|tenggat/i],
      value: campaign?.deadlineRespons
        ? new Date(campaign.deadlineRespons).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'yang akan kami konfirmasi lebih lanjut',
    },
    namaPIC: {
      patterns: [/nama anda|nama.*pic|penanggung/i],
      value: campaign?.namaPIC || null,
    },
    kontakPIC: {
      patterns: [/nomor kontak|kontak anda|nomor telepon|whatsapp|telp|\bwa\b|\bhp\b|\bcp\b|\bpj\b/i],
      value: campaign?.kontakPIC || null,
    },
    emailPIC: {
      patterns: [/alamat email|email anda|email.*pic/i],
      value: campaign?.emailPIC || null,
    },
    linkProposal: {
      patterns: [/tautan.*proposal|link.*proposal/i],
      value: campaign?.linkProposal || 'akan kami kirimkan menyusul',
    },
    websiteAcara: {
      patterns: [/tautan.*website|link.*website|website resmi/i],
      value: campaign?.websiteAcara || 'website resmi acara kami',
    },
    contactEmail: {
      patterns: [/email.*perusahaan|kontak.*email/i],
      value: sponsor?.contact_email || 'email resmi perusahaan',
    },
  }
}

// Tokens that must STAY as leftovers — never auto-fill
const TRAP_PATTERNS = [
  /^nomor rekening$/i,
  /^paket sponsorship$/i,
  /^batas$/i,
  /^tautan$/i,
]

function isTrapped(tokenInner) {
  return TRAP_PATTERNS.some(p => p.test(tokenInner.trim()))
}

/**
 * Merge a draft body: replace [bracket] tokens with campaign/sponsor values.
 * Returns { merged, leftovers[] }
 */
export function mergeDraft(body, campaign, sponsor) {
  const fallbackMap = buildFallbackMap(campaign, sponsor)
  const leftovers = []

  const merged = body.replace(/\[([^\]]+)\]/g, (match, inner) => {
    if (isTrapped(inner)) {
      leftovers.push(match)
      return match
    }

    const norm = normalize(inner)

    // Try each rule in specificity order
    for (const [, rule] of Object.entries(fallbackMap)) {
      for (const pattern of rule.patterns) {
        if (pattern.test(norm) || pattern.test(inner)) {
          if (rule.value) return rule.value
          // Required but empty
          leftovers.push(`${match}(kosong)`)
          return match
        }
      }
    }

    // Unknown token → leftover
    leftovers.push(match)
    return match
  })

  return { merged, leftovers }
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
