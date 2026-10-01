import { useStore } from '../store/store.jsx'
import { RELATIONSHIP, DELIVERY } from '../lib/constants.js'
import { bucketByWeek, funnel, relationshipDist } from '../lib/analytics.js'
import { TrendChart, FunnelChart, DonutChart, REL_COLORS } from '../components/charts.jsx'

export default function DashboardHome() {
  const { state, outcomeCounts, setRelationship, checkReplies } = useStore()

  const total = state.history.length
  const queued = state.queue.filter(q => q.status !== DELIVERY.SENT).length
  const pctOf = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')

  const trend = bucketByWeek(state.history, 8)
  const funnelData = funnel(state.history)
  const donutData = relationshipDist(state.history)

  const recent = [...state.history].sort((a, b) => b.at - a.at).slice(0, 5)
  const sentList = state.history.filter(h => h.delivery === DELIVERY.SENT).sort((a, b) => b.at - a.at)

  const REL_OPTIONS = [
    RELATIONSHIP.DIBALAS, RELATIONSHIP.DITERIMA, RELATIONSHIP.DITOLAK, RELATIONSHIP.DIACUHKAN,
  ]

  return (
    <div style={s.root}>
      {/* Stat boxes */}
      <div style={s.boxes}>
        <StatBox label="Terkirim" value={outcomeCounts.terkirim} sub={`${total} riwayat`} color="var(--state-info)" bg="var(--state-info-bg)" />
        <StatBox label="Dibalas" value={outcomeCounts.dibalas} sub={`${pctOf(outcomeCounts.dibalas, outcomeCounts.terkirim)} dari terkirim`} color="var(--brand-500)" bg="var(--brand-100)" />
        <StatBox label="Diterima" value={outcomeCounts.diterima} sub={`${pctOf(outcomeCounts.diterima, outcomeCounts.dibalas)} dari dibalas`} color="var(--state-success)" bg="var(--state-success-bg)" />
        <StatBox label="Ditolak" value={outcomeCounts.ditolak} sub="cabang keluar funnel" color="var(--state-danger)" bg="var(--state-danger-bg)" />
        <StatBox label="Dalam Antrean" value={queued} sub="belum terkirim" color="var(--text-2)" bg="var(--surface-muted)" />
      </div>

      <div style={s.grid2}>
        {/* Tren pengiriman */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Tren Pengiriman</h3>
            <span style={s.cardSub}>8 minggu terakhir</span>
          </div>
          <TrendChart data={trend} />
        </div>

        {/* Funnel konversi */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Corong Konversi</h3>
            <span style={s.cardSub}>% terhadap tahap sebelumnya</span>
          </div>
          <FunnelChart data={funnelData} />
        </div>

        {/* Donut status */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Distribusi Status</h3>
            <span style={s.cardSub}>{total} total</span>
          </div>
          <DonutChart data={donutData} />
        </div>

      </div>

      <div style={s.grid2}>
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

        {/* Queue status */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Status Antrean</h3>
          {state.queue.length === 0 ? (
            <div style={s.empty}>Antrean kosong.</div>
          ) : (
            state.queue.slice(0, 6).map(q => (
              <div key={q.key} style={s.activityItem}>
                <div style={s.activityAvatar}>{(q.sponsor_name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.activitySponsor}>{q.sponsor_name}</div>
                  <div style={s.activityEvent}>{q.to}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                  background: q.status === DELIVERY.SENT ? 'var(--state-success-bg)' : 'var(--surface-muted)',
                  color: q.status === DELIVERY.SENT ? 'var(--state-success)' : 'var(--text-3)',
                }}>
                  {q.status}
                </span>
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

function StatBox({ label, value, sub, color, bg }) {
  return (
    <div style={{ ...s.statBox, background: bg }}>
      <span style={{ ...s.statVal, color }}>{value}</span>
      <span style={{ ...s.statLabel, color }}>{label}</span>
      {sub && <span style={{ ...s.statSub, color }}>{sub}</span>}
    </div>
  )
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
  boxes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 },
  statBox: {
    borderRadius: 12, padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statVal: { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 13, fontWeight: 500 },
  statSub: { fontSize: 11, opacity: 0.8 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 },
  card: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0 },
  cardSub: { fontSize: 12, color: 'var(--text-3)' },
  empty: { fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' },
  activityItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' },
  activityAvatar: { width: 32, height: 32, borderRadius: 8, background: 'var(--brand-100)', color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
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
