// ── Pure analytics helpers (no React, unit-testable) ────────────────────────────
// Sumber data: state.history entries { sponsor, event, delivery, relationship, at }

export const REL_ORDER = ['Terkirim', 'Dibalas', 'Diterima', 'Ditolak', 'Diacuhkan', 'Belum Dihubungi']

function toDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}

// Kiriman (delivery Sent) per tanggal, n hari terakhir termasuk hari ini.
// Returns [{ key: 'YYYY-MM-DD', label: '12 Jan', count }] — hari kosong tetap
// ada dengan count 0. Entri tanpa tanggal valid dilewati.
export function bucketByDay(history, n = 14, now = new Date()) {
  const days = []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      count: 0,
    })
  }
  const byKey = new Map(days.map(d => [d.key, d]))
  for (const h of history || []) {
    if (h.delivery !== 'Sent') continue
    const d = toDate(h.at)
    if (!d) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const slot = byKey.get(key)
    if (slot) slot.count++
  }
  return days
}

// Corong: Terkirim → Dibalas → Diterima. rate = pangsa tahap sebelumnya
// (null bila penyebut 0 agar UI tampil '—', bukan NaN).
export function funnel(history) {
  const list = history || []
  const terkirim = list.filter(h => h.delivery === 'Sent').length
  const dibalas = list.filter(h =>
    h.relationship === 'Dibalas' || h.relationship === 'Diterima' || h.relationship === 'Ditolak'
  ).length
  const diterima = list.filter(h => h.relationship === 'Diterima').length
  const ditolak = list.filter(h => h.relationship === 'Ditolak').length
  const diacuhkan = list.filter(h => h.relationship === 'Diacuhkan').length
  const rate = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
  return {
    stages: [
      { key: 'terkirim', label: 'Terkirim', count: terkirim, rate: null },
      { key: 'dibalas', label: 'Dibalas', count: dibalas, rate: rate(dibalas, terkirim) },
      { key: 'diterima', label: 'Diterima', count: diterima, rate: rate(diterima, dibalas) },
    ],
    ditolak,
    diacuhkan,
  }
}

// Distribusi relationship untuk donut. Kunci nol tetap ada (legend lengkap).
export function relationshipDist(history) {
  const counts = {}
  for (const r of REL_ORDER) counts[r] = 0
  for (const h of history || []) {
    const r = h.relationship || 'Belum Dihubungi'
    counts[r] = (counts[r] || 0) + 1
  }
  return REL_ORDER.map(label => ({ label, value: counts[label] || 0 }))
}

