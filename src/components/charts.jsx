// ── Grafik SVG/div kustom (tanpa dependensi), mengikuti CSS var tema ─────────────

export const REL_COLORS = {
  'Belum Dihubungi': '#9A97AC',
  'Terkirim': '#1c64f2',
  'Dibalas': '#6D5AE6',
  'Diterima': '#12805c',
  'Ditolak': '#b42318',
  'Diacuhkan': '#9A97AC',
}

function Empty({ text }) {
  return <div style={c.empty}>{text || 'Belum ada data.'}</div>
}

// ── Tren area+line pengiriman per minggu ────────────────────────────────────────
export function TrendChart({ data }) {
  const vals = (data || []).map(d => d.count)
  if (vals.length === 0 || vals.every(v => v === 0)) {
    return <Empty text="Belum ada pengiriman." />
  }
  const W = 600, H = 190, PL = 30, PR = 8, PT = 14, PB = 30
  const max = Math.max(...vals, 1)
  const n = vals.length
  const x = i => PL + (n === 1 ? (W - PL - PR) / 2 : (i / (n - 1)) * (W - PL - PR))
  const y = v => PT + (1 - v / max) * (H - PT - PB)
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${PL},${y(0)} ${pts} ${x(n - 1)},${y(0)}`
  const ticks = [0, Math.ceil(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x={PL - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)">{t}</text>
        </g>
      ))}
      <polygon points={area} fill="var(--brand-100)" opacity="0.7" />
      <polyline points={pts} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="4" fill="var(--brand-500)" stroke="#fff" strokeWidth="1.5">
            <title>{data[i].label}: {v} terkirim</title>
          </circle>
          {(n <= 8 || i % 2 === 0) && (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="var(--text-3)">{data[i].label}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

// ── Corong konversi ───────────────────────────────────────────────────────────
export function FunnelChart({ data }) {
  if (!data || data.stages.every(s => s.count === 0)) {
    return <Empty text="Belum ada pengiriman." />
  }
  const max = Math.max(...data.stages.map(s => s.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {data.stages.map((s, i) => (
        <div key={s.key}>
          <div style={c.funnelTop}>
            <span style={c.funnelLabel}>{i + 1}. {s.label}</span>
            <span style={c.funnelVal}>
              {s.count}
              {s.rate !== null && s.rate !== undefined && (
                <span style={c.funnelRate}> · {s.rate}%</span>
              )}
            </span>
          </div>
          <div style={c.funnelTrack}>
            <div
              style={{ ...c.funnelFill, width: `${Math.max((s.count / max) * 100, s.count > 0 ? 4 : 0)}%` }}
            >
              <title>{s.label}: {s.count}{s.rate != null ? ` (${s.rate}% dari tahap sebelumnya)` : ''}</title>
            </div>
          </div>
        </div>
      ))}
      {(data.ditolak > 0 || data.diacuhkan > 0) && (
        <div style={c.funnelSide}>
          {data.ditolak > 0 && <span>Ditolak: <strong>{data.ditolak}</strong></span>}
          {data.diacuhkan > 0 && <span>Diacuhkan: <strong>{data.diacuhkan}</strong></span>}
        </div>
      )}
    </div>
  )
}

// ── Donut distribusi ──────────────────────────────────────────────────────────
export function DonutChart({ data }) {
  const total = (data || []).reduce((a, d) => a + d.value, 0)
  if (total === 0) return <Empty text="Belum ada data." />
  const R = 60, C = 2 * Math.PI * R
  let acc = 0
  const segs = data.filter(d => d.value > 0).map(d => {
    const frac = d.value / total
    const seg = { ...d, dash: frac * C, offset: acc }
    acc += frac * C
    return seg
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 150 150" width="140" height="140" style={{ flexShrink: 0 }}>
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--surface-muted)" strokeWidth="18" />
        {segs.map(s => (
          <circle
            key={s.label}
            cx="75" cy="75" r={R} fill="none"
            stroke={REL_COLORS[s.label] || '#9A97AC'}
            strokeWidth="18"
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 75 75)"
            strokeLinecap="butt"
          >
            <title>{s.label}: {s.value}</title>
          </circle>
        ))}
        <text x="75" y="72" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-1)">{total}</text>
        <text x="75" y="88" textAnchor="middle" fontSize="10" fill="var(--text-3)">total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
        {data.filter(d => d.value > 0).map(d => (
          <div key={d.label} style={c.legendRow}>
            <span style={{ ...c.dot, background: REL_COLORS[d.label] || '#9A97AC' }} />
            <span style={c.legendLabel}>{d.label}</span>
            <span style={c.legendVal}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const c = {
  empty: { fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' },
  funnelTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  funnelLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-1)' },
  funnelVal: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)' },
  funnelRate: { fontSize: 12, fontWeight: 600, color: 'var(--brand-500)' },
  funnelTrack: { height: 12, borderRadius: 9999, background: 'var(--surface-muted)', overflow: 'hidden' },
  funnelFill: { height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg, var(--brand-400), var(--brand-500))' },
  funnelSide: { display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 10 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  legendLabel: { color: 'var(--text-2)', flex: 1 },
  legendVal: { fontWeight: 700, color: 'var(--text-1)' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
}
