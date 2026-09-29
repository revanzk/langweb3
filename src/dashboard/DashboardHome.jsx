import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import { RELATIONSHIP, DELIVERY } from '../lib/constants.js'

const METRICS = ['Dikirim', 'Dibalas', 'Diterima', 'Ditolak']

export default function DashboardHome() {
  const { state, outcomeCounts, setRelationship, checkReplies } = useStore()
  const [metric, setMetric] = useState('Dikirim')

  const total = state.history.length
  const metricCount = {
    Dikirim: outcomeCounts.terkirim,
    Dibalas: outcomeCounts.dibalas,
    Diterima: outcomeCounts.diterima,
    Ditolak: outcomeCounts.ditolak,
  }
  const count = metricCount[metric] || 0
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  // Group by event for SVG chart
  const eventGroups = {}
  for (const h of state.history) {
    const ev = h.event || 'Tidak diketahui'
    if (!eventGroups[ev]) eventGroups[ev] = 0
    if (h.delivery === DELIVERY.SENT) eventGroups[ev]++
  }
  const chartEvents = Object.entries(eventGroups).slice(-6) // last 6 events
  const maxVal = Math.max(...chartEvents.map(([, v]) => v), 1)

  const recent = [...state.history].sort((a, b) => b.at - a.at).slice(0, 5)
  const sentList = state.history.filter(h => h.delivery === DELIVERY.SENT).sort((a, b) => b.at - a.at)

  const REL_OPTIONS = [
    RELATIONSHIP.DIBALAS, RELATIONSHIP.DITERIMA, RELATIONSHIP.DITOLAK, RELATIONSHIP.DIACUHKAN,
  ]

  return (
    <div style={s.root}>
      {/* Stat boxes */}
      <div style={s.boxes}>
        <StatBox label="Terkirim" value={outcomeCounts.terkirim} color="var(--state-info)" bg="var(--state-info-bg)" />
        <StatBox label="Dibalas" value={outcomeCounts.dibalas} color="var(--brand-500)" bg="var(--brand-100)" />
        <StatBox label="Diterima" value={outcomeCounts.diterima} color="var(--state-success)" bg="var(--state-success-bg)" />
        <StatBox label="Ditolak" value={outcomeCounts.ditolak} color="var(--state-danger)" bg="var(--state-danger-bg)" />
      </div>

      <div style={s.grid2}>
        {/* Analytics */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Analitik</h3>
            <div style={s.metricTabs}>
              {METRICS.map(m => (
                <button
                  key={m}
                  style={{ ...s.metricTab, ...(metric === m ? s.metricTabActive : {}) }}
                  onClick={() => setMetric(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {total === 0 ? (
            <div style={s.empty}>Belum ada data. Kirim email pertama kamu!</div>
          ) : (
            <>
              <div style={s.bigNum}>
                <span style={s.bigNumVal}>{count}</span>
                <span style={s.bigNumPct}>{pct}%</span>
              </div>

              {/* SVG bar chart */}
              {chartEvents.length > 0 && (
                <svg width="100%" height="120" style={{ overflow: 'visible', marginTop: 12 }}>
                  {chartEvents.map(([ev, val], i) => {
                    const barH = (val / maxVal) * 80
                    const x = (i / chartEvents.length) * 100
                    const barW = (1 / chartEvents.length) * 100 - 2
                    return (
                      <g key={ev}>
                        <rect
                          x={`${x}%`} y={80 - barH} width={`${barW}%`} height={barH}
                          fill="var(--brand-400)" rx="3"
                        />
                        <text
                          x={`${x + barW / 2}%`} y={100}
                          textAnchor="middle" fontSize="9" fill="var(--text-3)"
                          style={{ overflow: 'hidden' }}
                        >
                          {ev.slice(0, 10)}
                        </text>
                        <text
                          x={`${x + barW / 2}%`} y={74 - barH}
                          textAnchor="middle" fontSize="10" fill="var(--brand-500)" fontWeight="600"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}
            </>
          )}
        </div>

        {/* Recent activity */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Aktivitas Terbaru</h3>
          {recent.length === 0 ? (
            <div style={s.empty}>Belum ada aktivitas.</div>
          ) : (
            recent.map(h => (
              <div key={h.id} style={s.activityItem}>
                <div style={s.activityAvatar}>{(h.sponsor || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.activitySponsor}>{h.sponsor}</div>
                  <div style={s.activityEvent}>{h.event}</div>
                </div>
                <RelChip rel={h.relationship} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sent list */}
      {sentList.length > 0 && (
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Daftar Terkirim</h3>
            <button
              style={s.btnSecondary}
              onClick={() => checkReplies()}
              disabled={state.checkingReplies}
            >
              {state.checkingReplies ? 'Memeriksa...' : '↺ Cek Semua Balasan'}
            </button>
          </div>
          {sentList.map(h => (
            <div key={h.id} style={s.sentItem}>
              <div style={s.sentInfo}>
                <span style={s.sentSponsor}>{h.sponsor}</span>
                <span style={s.sentEvent}>{h.event}</span>
                {h.reply && (
                  <span style={s.replySnippet}>↩ {h.reply.snippet}</span>
                )}
              </div>
              <div style={s.sentActions}>
                <RelChip rel={h.relationship} />
                {REL_OPTIONS.map(r => (
                  h.relationship !== r && (
                    <button key={r} style={s.outcomeBtn} onClick={() => setRelationship(h.id, r)}>
                      {r}
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ ...s.statBox, background: bg }}>
      <span style={{ ...s.statVal, color }}>{value}</span>
      <span style={{ ...s.statLabel, color }}>{label}</span>
    </div>
  )
}

const REL_COLORS = {
  'Belum Dihubungi': '#9A97AC',
  'Terkirim': '#1c64f2',
  'Dibalas': '#6D5AE6',
  'Diterima': '#12805c',
  'Ditolak': '#b42318',
  'Diacuhkan': '#9A97AC',
}

function RelChip({ rel }) {
  const color = REL_COLORS[rel] || '#9A97AC'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: color + '20', color }}>
      {rel}
    </span>
  )
}

const s = {
  root: { maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  boxes: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 },
  statBox: {
    borderRadius: 12, padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statVal: { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 13, fontWeight: 500 },
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 },
  card: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)' },
  metricTabs: { display: 'flex', gap: 4 },
  metricTab: {
    padding: '4px 10px', borderRadius: 9999, fontSize: 12,
    border: '1px solid var(--border-subtle)', background: 'var(--surface-muted)',
    color: 'var(--text-3)', cursor: 'pointer',
  },
  metricTabActive: { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' },
  empty: { fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' },
  bigNum: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0' },
  bigNumVal: { fontSize: 48, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 },
  bigNumPct: { fontSize: 18, color: 'var(--text-3)' },
  activityItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' },
  activityAvatar: { width: 32, height: 32, borderRadius: 8, background: 'var(--brand-100)', color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 },
  activitySponsor: { fontSize: 13, fontWeight: 600, color: 'var(--text-1)' },
  activityEvent: { fontSize: 12, color: 'var(--text-3)' },
  sentItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', gap: 12, flexWrap: 'wrap' },
  sentInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  sentSponsor: { fontSize: 14, fontWeight: 600, color: 'var(--text-1)' },
  sentEvent: { fontSize: 12, color: 'var(--text-3)' },
  replySnippet: { fontSize: 12, color: 'var(--brand-500)', fontStyle: 'italic', overflowWrap: 'anywhere' },
  sentActions: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  outcomeBtn: {
    fontSize: 11, padding: '3px 10px', borderRadius: 9999,
    border: '1px solid var(--border-strong)', background: 'var(--surface)',
    color: 'var(--text-2)', cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 14px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
  },
}
