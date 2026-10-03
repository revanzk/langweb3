import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { RELEVANCE_LEVEL_LIST } from '../lib/constants.js'

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Skor Tertinggi' },
  { value: 'score_asc', label: 'Skor Terendah' },
  { value: 'name_asc', label: 'Nama A–Z' },
]

const LEVEL_COLORS = {
  'Sangat Relevan': { bg: '#e3f6ee', color: '#12805c' },
  'Relevan': { bg: '#e8f0fe', color: '#1c64f2' },
  'Cukup Relevan': { bg: '#fdf1dc', color: '#b45309' },
  'Kurang Relevan': { bg: 'var(--surface-muted)', color: 'var(--text-3)' },
  'Manual': { bg: 'var(--brand-100)', color: 'var(--brand-500)' },
}

export default function Hasil() {
  const { state, allSponsors, selectedSponsors, toggleSelected } = useStore()
  const navigate = useNavigate()

  const [filter, setFilter] = useState('Semua')
  const [sort, setSort] = useState('score_desc')
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('sq_view') || localStorage.getItem('sf_view') || 'card'
    } catch {
      return 'card'
    }
  })

  function switchView(v) {
    setView(v)
    try {
      localStorage.setItem('sq_view', v)
      localStorage.removeItem('sf_view')
    } catch { /* ignore */ }
  }

  const filters = ['Semua', ...RELEVANCE_LEVEL_LIST, 'Manual']

  const filtered = allSponsors.filter(sp => {
    if (filter === 'Semua') return true
    if (filter === 'Manual') return sp.source === 'manual'
    return sp.relevance_level === filter
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'score_desc') return (b.relevance_score ?? -1) - (a.relevance_score ?? -1)
    if (sort === 'score_asc') return (a.relevance_score ?? 101) - (b.relevance_score ?? 101)
    return a.sponsor_name.localeCompare(b.sponsor_name)
  })
  // Manual sorted last within card view
  const display = [...sorted.filter(s => s.source !== 'manual'), ...sorted.filter(s => s.source === 'manual')]

  return (
    <div style={s.root}>
      {/* Summary banner */}
      {state.summary && (
        <div style={s.summaryBanner}>
          <span style={s.summaryLabel}>Ringkasan AI:</span> {state.summary}
        </div>
      )}

      {/* Context strip */}
      <div style={s.contextStrip}>
        <span style={s.contextItem}>🎯 {state.search.jenisEvent}</span>
        {String(state.search.perkiraanPeserta || '').trim() && (
          <span style={s.contextItem}>👥 {state.search.perkiraanPeserta} peserta</span>
        )}
        <button style={s.backLink} onClick={() => navigate('/app/cari-sponsor')}>← Ubah pencarian</button>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.filterRow}>
          {filters.map(f => (
            <button
              key={f}
              style={{ ...s.filterChip, ...(filter === f ? s.filterChipActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={s.toolbarRight}>
          <select value={sort} onChange={e => setSort(e.target.value)} style={s.select}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button style={{ ...s.viewBtn, ...(view === 'card' ? s.viewBtnActive : {}) }} onClick={() => switchView('card')}>
            ▦ Kartu
          </button>
          <button style={{ ...s.viewBtn, ...(view === 'list' ? s.viewBtnActive : {}) }} onClick={() => switchView('list')}>
            ☰ Daftar
          </button>
          <span style={s.viewMode}>mode: {view}</span>
        </div>
      </div>

      {/* Empty state */}
      {display.length === 0 && (
        <div style={s.empty}>
          <p>Tidak ada sponsor yang cocok dengan filter ini.</p>
        </div>
      )}

      {/* Cards */}
      {view === 'card' && display.length > 0 && (
        <div style={s.grid}>
          {display.map(sp => (
            <SponsorCard
              key={sp.sponsor_name}
              sponsor={sp}
              selected={state.selected.includes(sp.sponsor_name)}
              onToggle={() => toggleSelected(sp.sponsor_name)}
            />
          ))}
        </div>
      )}

      {/* Spacer so sticky footer doesn't cover last card */}
      <div style={{ height: 80 }} />

      {/* List */}
      {view === 'list' && display.length > 0 && (
        <div style={s.listContainer}>
          {display.map(sp => (
            <SponsorRow
              key={sp.sponsor_name}
              sponsor={sp}
              selected={state.selected.includes(sp.sponsor_name)}
              onToggle={() => toggleSelected(sp.sponsor_name)}
            />
          ))}
        </div>
      )}

      {/* Sticky footer */}
      <div style={s.stickyFooter}>
        <span style={s.selectedCount}>
          {state.selected.length} dipilih
        </span>
        <button
          style={{ ...s.btnPrimary, ...(state.selected.length === 0 ? s.btnDisabled : {}) }}
          disabled={state.selected.length === 0}
          onClick={() => navigate('/app/cari-sponsor/kampanye')}
        >
          Lanjut ke Kampanye →
        </button>
      </div>
    </div>
  )
}

function SponsorCard({ sponsor, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const isManual = sponsor.source === 'manual'
  const levelColor = isManual ? LEVEL_COLORS['Manual'] : (LEVEL_COLORS[sponsor.relevance_level] || LEVEL_COLORS['Kurang Relevan'])
  const score = isManual ? '–/100' : `${sponsor.relevance_score}/100`

  return (
    <div style={{ ...s.card, ...(selected ? s.cardSelected : {}) }}>
      <div style={s.cardHeader}>
        <input type="checkbox" checked={selected} onChange={onToggle} style={s.checkbox} />
        <div style={s.avatar}>{sponsor.sponsor_name[0].toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={s.sponsorName}>{sponsor.sponsor_name}</div>
          <div style={s.sponsorMeta}>
            {sponsor.industry && <span style={s.metaItem}>{sponsor.industry}</span>}
            {sponsor.location && <span style={s.metaItem}>📍 {sponsor.location}</span>}
          </div>
        </div>
        <div style={s.scoreBox}>
          <span style={s.scoreNum}>{score}</span>
          <span style={{ ...s.levelChip, background: levelColor.bg, color: levelColor.color }}>
            {isManual ? 'Manual' : sponsor.relevance_level}
          </span>
        </div>
      </div>

      {!isManual && sponsor.reason?.length > 0 && (
        <div style={s.reasons}>
          {(expanded ? sponsor.reason : sponsor.reason.slice(0, 3)).map((r, i) => (
            <div key={i} style={s.reason}>• {r}</div>
          ))}
          {sponsor.reason.length > 3 && (
            <button style={s.expandBtn} onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Sembunyikan ▲' : `+${sponsor.reason.length - 3} alasan lainnya ▼`}
            </button>
          )}
        </div>
      )}

      <div style={s.support}>
        {sponsor.support_type?.length > 0
          ? sponsor.support_type.map((t, i) => <span key={i} style={s.supportChip}>{t}</span>)
          : <span style={s.noData}>tidak diketahui</span>
        }
      </div>

      {(sponsor.contact_email || sponsor.website) && (
        <div style={s.contactRow}>
          {sponsor.contact_email && (
            <a href={`mailto:${sponsor.contact_email}`} style={s.contactLink}>{sponsor.contact_email}</a>
          )}
          {sponsor.website && (
            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" style={s.contactLink}>
              🔗 Website
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function SponsorRow({ sponsor, selected, onToggle }) {
  const isManual = sponsor.source === 'manual'
  const levelColor = isManual ? LEVEL_COLORS['Manual'] : (LEVEL_COLORS[sponsor.relevance_level] || LEVEL_COLORS['Kurang Relevan'])

  return (
    <div style={{ ...s.listRow, ...(selected ? s.listRowSelected : {}) }}>
      <input type="checkbox" checked={selected} onChange={onToggle} style={s.checkbox} />
      <div style={s.rowAvatar}>{sponsor.sponsor_name[0].toUpperCase()}</div>
      <span style={{ ...s.sponsorName, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sponsor.sponsor_name}
      </span>
      <span style={s.scoreSmall}>{isManual ? '–' : sponsor.relevance_score}</span>
      <span style={{ ...s.levelChip, background: levelColor.bg, color: levelColor.color }}>
        {isManual ? 'Manual' : sponsor.relevance_level}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: { maxWidth: 1000, margin: '0 auto', paddingBottom: 80 },
  summaryBanner: {
    background: 'var(--brand-50)', border: '1px solid var(--brand-200)',
    borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--text-2)',
    marginBottom: 12,
  },
  summaryLabel: { fontWeight: 600, color: 'var(--brand-500)' },
  contextStrip: {
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    fontSize: 13, color: 'var(--text-2)', marginBottom: 16,
  },
  contextItem: { display: 'flex', alignItems: 'center', gap: 4 },
  backLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--brand-500)', fontSize: 13, padding: 0, marginLeft: 'auto',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    marginBottom: 20, padding: '12px 16px',
    background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 10,
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 },
  filterChip: {
    padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
    border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-2)',
    cursor: 'pointer',
  },
  filterChipActive: {
    background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)',
  },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  select: {
    padding: '5px 10px', fontSize: 13, border: '1px solid var(--border-strong)',
    borderRadius: 8, background: '#fff', color: 'var(--text-2)', cursor: 'pointer',
  },
  viewBtn: {
    padding: '5px 12px', fontSize: 12, border: '1px solid var(--border-strong)',
    borderRadius: 8, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
  },
  viewBtnActive: { background: 'var(--brand-50)', color: 'var(--brand-500)', borderColor: 'var(--brand-200)' },
  viewMode: { fontSize: 11, color: 'var(--text-3)' },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-3)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  listContainer: { display: 'flex', flexDirection: 'column', gap: 2 },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardSelected: { borderColor: 'var(--brand-400)', boxShadow: '0 0 0 2px var(--brand-100)' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  checkbox: { marginTop: 4, accentColor: 'var(--brand-500)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' },
  avatar: {
    width: 40, height: 40, borderRadius: 10,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  sponsorName: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)', overflowWrap: 'anywhere' },
  sponsorMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaItem: { fontSize: 12, color: 'var(--text-3)' },
  scoreBox: { marginLeft: 'auto', textAlign: 'right', flexShrink: 0 },
  scoreNum: { display: 'block', fontSize: 18, fontWeight: 700, color: 'var(--text-1)' },
  levelChip: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, display: 'inline-block' },
  reasons: { display: 'flex', flexDirection: 'column', gap: 4 },
  reason: { fontSize: 13, color: 'var(--text-2)' },
  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-500)', fontSize: 12, padding: 0, marginTop: 4 },
  support: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  supportChip: { fontSize: 12, padding: '3px 10px', borderRadius: 9999, background: 'var(--surface-muted)', color: 'var(--text-2)' },
  noData: { fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' },
  contactRow: { display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px dashed var(--border-subtle)', paddingTop: 10 },
  contactLink: { fontSize: 12, color: 'var(--brand-500)', textDecoration: 'underline' },
  listRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', background: 'var(--surface)',
    border: '1px solid var(--border-subtle)', borderRadius: 8,
    minWidth: 0,
  },
  listRowSelected: { borderColor: 'var(--brand-400)', background: 'var(--brand-50)' },
  rowAvatar: {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  scoreSmall: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 },
  stickyFooter: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 32px', zIndex: 40,
  },
  selectedCount: { fontSize: 14, fontWeight: 600, color: 'var(--text-1)' },
  btnPrimary: {
    padding: '10px 28px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
}
