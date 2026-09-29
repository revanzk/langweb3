import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import { RELATIONSHIP, RELATIONSHIP_LIST, DELIVERY } from '../lib/constants.js'

const REL_COLORS = {
  'Belum Dihubungi': { bg: '#f3f4f6', color: '#9A97AC' },
  'Terkirim': { bg: 'var(--state-info-bg)', color: 'var(--state-info)' },
  'Dibalas': { bg: 'var(--brand-100)', color: 'var(--brand-500)' },
  'Diterima': { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
  'Ditolak': { bg: 'var(--state-danger-bg)', color: 'var(--state-danger)' },
  'Diacuhkan': { bg: '#f3f4f6', color: '#9A97AC' },
}
const DEL_COLORS = {
  Queued: { bg: 'var(--surface-muted)', color: 'var(--text-3)' },
  Sending: { bg: 'var(--state-info-bg)', color: 'var(--state-info)' },
  Sent: { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
  Failed: { bg: 'var(--state-danger-bg)', color: 'var(--state-danger)' },
}

export default function Riwayat() {
  const { state, setRelationship, checkReplies, outcomeCounts } = useStore()
  const [relFilter, setRelFilter] = useState('Semua')

  const filtered = state.history.filter(h =>
    relFilter === 'Semua' ? true : h.relationship === relFilter
  )

  const REL_OPTIONS = [RELATIONSHIP.DIBALAS, RELATIONSHIP.DITERIMA, RELATIONSHIP.DITOLAK, RELATIONSHIP.DIACUHKAN]

  return (
    <div style={s.root}>
      {/* Outcome boxes */}
      <div style={s.boxes}>
        <OutcomeBox label="Terkirim" value={outcomeCounts.terkirim} color="var(--state-info)" bg="var(--state-info-bg)" />
        <OutcomeBox label="Dibalas" value={outcomeCounts.dibalas} color="var(--brand-500)" bg="var(--brand-100)" />
        <OutcomeBox label="Diterima" value={outcomeCounts.diterima} color="var(--state-success)" bg="var(--state-success-bg)" />
        <OutcomeBox label="Ditolak" value={outcomeCounts.ditolak} color="var(--state-danger)" bg="var(--state-danger-bg)" />
      </div>

      {/* Filters */}
      <div style={s.toolbar}>
        <div style={s.filters}>
          {['Semua', ...RELATIONSHIP_LIST].map(r => (
            <button
              key={r}
              style={{ ...s.filterChip, ...(relFilter === r ? s.filterChipActive : {}) }}
              onClick={() => setRelFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          style={s.btnSecondary}
          onClick={() => checkReplies()}
          disabled={state.checkingReplies}
        >
          {state.checkingReplies ? 'Memeriksa...' : '↺ Cek Semua Balasan'}
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={s.empty}>Belum ada riwayat pengiriman.</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Sponsor', 'Event', 'Delivery', 'Relationship', 'Aksi', 'Updated'].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const rc = REL_COLORS[h.relationship] || REL_COLORS['Belum Dihubungi']
                const dc = DEL_COLORS[h.delivery] || DEL_COLORS.Queued
                return (
                  <tr key={h.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.sponsorCell}>{h.sponsor}</div>
                      {h.reply && (
                        <div style={s.replySnippet}>↩ {h.reply.from} — {h.reply.snippet}</div>
                      )}
                    </td>
                    <td style={s.td}>{h.event}</td>
                    <td style={s.td}>
                      <span style={{ ...s.chip, background: dc.bg, color: dc.color }}>{h.delivery}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.chip, background: rc.bg, color: rc.color }}>{h.relationship}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.actionRow}>
                        {REL_OPTIONS.filter(r => r !== h.relationship).map(r => (
                          <button key={r} style={s.outcomeBtn} onClick={() => setRelationship(h.id, r)}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.timeText}>
                        {h.updated ? new Date(h.updated).toLocaleDateString('id-ID') : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OutcomeBox({ label, value, color, bg }) {
  return (
    <div style={{ ...s.box, background: bg }}>
      <span style={{ ...s.boxVal, color }}>{value}</span>
      <span style={{ ...s.boxLabel, color }}>{label}</span>
    </div>
  )
}

const s = {
  root: { maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  boxes: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 },
  box: { borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  boxVal: { fontSize: 30, fontWeight: 700, lineHeight: 1 },
  boxLabel: { fontSize: 13, fontWeight: 500 },
  toolbar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 14px',
  },
  filters: { display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 },
  filterChip: {
    padding: '4px 12px', borderRadius: 9999, fontSize: 12,
    border: '1px solid var(--border-strong)', background: 'var(--surface)',
    color: 'var(--text-2)', cursor: 'pointer',
  },
  filterChipActive: { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' },
  btnSecondary: {
    padding: '6px 14px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
  },
  empty: { textAlign: 'center', padding: 48, color: 'var(--text-3)', fontSize: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', minWidth: 900, borderCollapse: 'collapse' },
  th: { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface)' },
  tr: { borderBottom: '1px solid var(--border-subtle)', height: 48 },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--text-1)', verticalAlign: 'top' },
  sponsorCell: { fontWeight: 600 },
  replySnippet: { fontSize: 11, color: 'var(--brand-500)', fontStyle: 'italic', marginTop: 2, overflowWrap: 'anywhere' },
  chip: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, display: 'inline-block' },
  actionRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  outcomeBtn: { fontSize: 11, padding: '3px 8px', borderRadius: 9999, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer' },
  timeText: { fontSize: 12, color: 'var(--text-3)' },
}
