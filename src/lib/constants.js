// ── Limits ────────────────────────────────────────────────────────────────────
export const MAX_SPONSORS = 5
export const MIN_SPONSORS = 3
export const MAX_EMAILS = 10

// ── Relevance enum ────────────────────────────────────────────────────────────
export const RELEVANCE_LEVELS = {
  SANGAT_RELEVAN: 'Sangat Relevan',
  RELEVAN: 'Relevan',
  CUKUP_RELEVAN: 'Cukup Relevan',
  KURANG_RELEVAN: 'Kurang Relevan',
}

export const RELEVANCE_LEVEL_LIST = [
  RELEVANCE_LEVELS.SANGAT_RELEVAN,
  RELEVANCE_LEVELS.RELEVAN,
  RELEVANCE_LEVELS.CUKUP_RELEVAN,
  RELEVANCE_LEVELS.KURANG_RELEVAN,
]

/** Derive relevance level from numeric score */
export function scoreToLevel(score) {
  const n = Number(score) || 0
  if (n >= 80) return RELEVANCE_LEVELS.SANGAT_RELEVAN
  if (n >= 60) return RELEVANCE_LEVELS.RELEVAN
  if (n >= 40) return RELEVANCE_LEVELS.CUKUP_RELEVAN
  return RELEVANCE_LEVELS.KURANG_RELEVAN
}

// ── Relationship enum ─────────────────────────────────────────────────────────
export const RELATIONSHIP = {
  BELUM: 'Belum Dihubungi',
  TERKIRIM: 'Terkirim',
  DIBALAS: 'Dibalas',
  DITERIMA: 'Diterima',
  DITOLAK: 'Ditolak',
  DIACUHKAN: 'Diacuhkan',
}

export const RELATIONSHIP_LIST = [
  RELATIONSHIP.BELUM,
  RELATIONSHIP.TERKIRIM,
  RELATIONSHIP.DIBALAS,
  RELATIONSHIP.DITERIMA,
  RELATIONSHIP.DITOLAK,
  RELATIONSHIP.DIACUHKAN,
]

// ── Delivery enum ─────────────────────────────────────────────────────────────
export const DELIVERY = {
  QUEUED: 'Queued',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed',
}

// ── Tone enum ─────────────────────────────────────────────────────────────────
export const TONE_OPTIONS = ['Formal', 'Santai', 'Antusias']
export const TONE_DEFAULT = 'Formal'

// ── Jenis event (dropdown pencarian) ──────────────────────────────────────────
export const JENIS_EVENT_OPTIONS = [
  'Seminar',
  'Workshop',
  'Hackathon',
  'Kompetisi',
  'Festival',
  'Konser',
  'Webinar',
  'Pameran',
  'Bakti Sosial',
  'Olahraga',
  'Lainnya',
]

// ── Langflow flow IDs ─────────────────────────────────────────────────────────
export const FLOW_SEARCH = import.meta.env.VITE_LANGFLOW_SEARCH_FLOW_ID || '5d9c3617'
export const FLOW_DRAFT = import.meta.env.VITE_LANGFLOW_DRAFT_FLOW_ID || '45313891'
