// ── Pure analytics helpers (no React, unit-testable) ────────────────────────────
// Sumber data: state.history entries { sponsor, event, delivery, relationship, at }

export const REL_ORDER = ['Terkirim', 'Dibalas', 'Diterima', 'Ditolak', 'Diacuhkan', 'Belum Dihubungi']

function toDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7 // Senin = 0
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

// Kiriman (delivery Sent) per minggu, n minggu terakhir termasuk minggu ini.
// Returns [{ key, label, count }] — minggu kosong tetap ada dengan count 0.
export function bucketByWeek(history, n = 8, now = new Date()) {
  const weeks = []
  const base = startOfWeekMonday(now)
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(base)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    weeks.push({
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      start: start.getTime(),
      end: end.getTime(),
      count: 0,
    })
  }
  for (const h of history || []) {
    if (h.delivery !== 'Sent') continue
    const d = toDate(h.at)
    if (!d) continue
    const t = d.getTime()
    const w = weeks.find(w => t >= w.start && t < w.end)
    if (w) w.count++
  }
  return weeks.map(({ key, label, count }) => ({ key, label, count }))
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

