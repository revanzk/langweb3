import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { DELIVERY, getDebugMode, isDebugEnabled } from '../lib/constants.js'
import DebugPanel from '../components/DebugPanel.jsx'

// Track which campaign+sponsors combo was last generated so we can detect "new"
function makeDraftKey(campaign, selected) {
  return [campaign?.namaEvent || '', ...selected].join('|')
}

export default function Draft() {
  const {
    state, dispatch, selectedSponsors,
    runDraft, regenerateDraft, regenerateManyDrafts, updateDraft,
    enqueueDrafts, sendQueue, retryQueueItem,
    refreshComposio, linkComposio, pollComposioAccount,
  } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [showDebug, setShowDebug] = useState(() => isDebugEnabled())
  const debugMode = getDebugMode()
  const [regenName, setRegenName] = useState(null)
  const [regenAll, setRegenAll] = useState(false)
  const [regenError, setRegenError] = useState(null)
  const pollRef = useRef(null)
  const didGenerate = useRef(false)

  // Auto-generate on mount — regenerate saat campaign/seleksi berubah
  // atau saat navigasi membawa state { force: true } (tombol Generate Ulang
  // dari halaman cari-sponsor). Tombol "Lihat Draft" tidak membawa force
  // sehingga draft lama dipakai ulang tanpa regenerate.
  useEffect(() => {
    if (!didGenerate.current && selectedSponsors.length > 0) {
      didGenerate.current = true
      const currentKey = makeDraftKey(state.campaign, state.selected)
      const lastKey = state.lastDraftKey || ''
      const force = location.state?.force === true
      if (force || currentKey !== lastKey || state.drafts.length === 0) {
        // New campaign / new selection / force — clear old drafts and regenerate
        dispatch({ type: 'SET_DRAFT_PHASE', payload: 'idle' })
        dispatch({ type: 'SET_DRAFTS', drafts: [] })
        runDraft(currentKey)
        // Hapus flag force agar back-forward tidak trigger ulang
        if (force) window.history.replaceState({}, '')
      }
    }
  }, [])

  // Poll composio when waiting
  useEffect(() => {
    if (state.composio?.status === 'waiting') {
      pollRef.current = setInterval(async () => {
        await pollComposioAccount()
      }, 3000)
    } else {
      clearInterval(pollRef.current)
    }
    return () => clearInterval(pollRef.current)
  }, [state.composio?.status])

  const isGenerating = state.draftPhase === 'generating'
  const drafts = state.drafts || []
  const safeTab = drafts.length > 0 ? Math.min(activeTab, drafts.length - 1) : 0
  const draft = drafts[safeTab]

  // Sisa placeholder mentah di body = leftover (belum ter-merge).
  // Yang asalnya "(tidak tersedia)" ditandai merah, sisanya kuning.
  function renderBodyWithHighlights(body, leftovers = []) {
    if (!body) return null
    // Pecah dengan regex universal agar [..], {..}, {{..}} semua ter-highlight.
    // Hindari capture-group ganda dari PLACEHOLDER_RE (inner group ikut ter-split).
    const splitRe = /([\[{]+[^\[\]{}]+[\]}]+)/g
    const testRe = /^[\[{]+[^\[\]{}]+[\]}]+$/
    const forbidden = new Set(
      leftovers
        .filter(l => l.endsWith('(tidak tersedia)'))
        .map(l => l.replace(/\(tidak tersedia\)$/, ''))
    )
    const parts = body.split(splitRe)
    return parts.map((p, i) =>
      testRe.test(p)
        ? <mark key={i} style={forbidden.has(p) ? s.highlightForbidden : s.highlight}>{p}</mark>
        : <span key={i}>{p}</span>
    )
  }

  const failedNames = drafts.filter(d => !d.subject && !d.body).map(d => d.sponsor_name)
  const hasFailed = state.draftPhase === 'error' || failedNames.length > 0

  async function handleRegenActive() {
    if (!draft || regenName || regenAll || isGenerating) return
    if (!window.confirm('Generate ulang akan menggantikan draft ini. Lanjutkan?')) return
    setRegenName(draft.sponsor_name)
    setRegenError(null)
    const res = await regenerateDraft(draft.sponsor_name)
    setRegenName(null)
    if (!res?.ok) setRegenError(res?.error || 'Generate ulang gagal.')
  }

  async function handleRegenAll() {
    if (regenName || regenAll || isGenerating) return
    if (!window.confirm(`Generate ulang SEMUA ${drafts.length} draft? Draft yang sudah diedit akan ditimpa. Lanjutkan?`)) return
    setRegenAll(true)
    setRegenError(null)
    const res = await regenerateManyDrafts()
    setRegenAll(false)
    if (!res?.ok) setRegenError(res?.error || 'Generate ulang semua gagal.')
  }

  async function handleRetryFailed() {
    if (regenName || regenAll || isGenerating) return
    const names = failedNames.length > 0 ? failedNames : undefined
    setRegenAll(true)
    setRegenError(null)
    const res = names
      ? await regenerateManyDrafts(names)
      : await runDraft(makeDraftKey(state.campaign, state.selected))
    setRegenAll(false)
    if (!res?.ok) setRegenError(res?.error || 'Coba lagi gagal.')
  }

  const queuedCount = state.queue.filter(q => q.status === DELIVERY.QUEUED).length
  const sentCount = state.queue.filter(q => q.status === DELIVERY.SENT).length

  return (
    <div style={s.root}>
      {/* Tabs */}
      {drafts.length > 0 && (
        <div style={s.tabs}>
          {drafts.map((d, i) => (
            <button
              key={d.sponsor_name}
              style={{ ...s.tab, ...(i === safeTab ? s.tabActive : {}) }}
              onClick={() => { setActiveTab(i); setEditMode(false) }}
            >
              {d.sponsor_name}
              {d.manual && <span style={s.manualBadge} title="Draft manual (template buatanmu, dirapikan AI)">✎</span>}
              {d.leftovers?.length > 0 && (
                <span style={s.flagBadge}>{d.leftovers.length} ⚠</span>
              )}
              {d.edited && <span style={s.editedDot} title="Diedit">✏</span>}
              {!d.to && <span style={s.missingEmail} title="Email kosong">✉?</span>}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton while generating */}
      {isGenerating && (
        <div style={s.skeleton}>
          <div style={s.skeletonLine} />
          <div style={{ ...s.skeletonLine, width: '70%' }} />
          <div style={{ ...s.skeletonLine, width: '90%' }} />
          <p style={s.skeletonText}>Menghasilkan draft email...</p>
        </div>
      )}

      {/* Error */}
      {(state.draftPhase === 'error' || regenError) && (
        <div style={s.errorBanner}>
          ⚠ {regenError || state.draftError}
          <button style={s.linkBtn} onClick={handleRetryFailed} disabled={regenAll || isGenerating}>
            {regenAll ? 'Mencoba...' : 'Coba Lagi'}
          </button>
          <button style={s.linkBtn} onClick={() => setShowDebug(v => !v)}>Debug</button>
        </div>
      )}

      {/* Draft detail */}
      {draft && !isGenerating && (
        <div style={s.draftCard}>
          {/* To field */}
          <div style={s.toRow}>
            <span style={s.toLabel}>Kepada:</span>
            <input
              value={draft.to || ''}
              onChange={e => updateDraft(draft.sponsor_name, { to: e.target.value })}
              placeholder="email@perusahaan.com (wajib diisi)"
              style={{ ...s.toInput, ...((!draft.to) ? s.toInputMissing : {}) }}
            />
          </div>

          {/* Subject */}
          <div style={s.subjectRow}>
            <span style={s.toLabel}>Subjek:</span>
            {editMode
              ? <input value={draft.subject} onChange={e => updateDraft(draft.sponsor_name, { subject: e.target.value })} style={s.subjectInput} />
              : <span style={s.subjectText}>{draft.subject}</span>
            }
          </div>

          {/* Leftovers warning */}
          {draft.leftovers?.length > 0 && (
            <div style={s.leftoverBanner}>
              ⚠ {draft.leftovers.length} placeholder belum terisi — email tidak dapat dikirim:
              {draft.leftovers.map((l, i) => (
                <code key={i} style={l.endsWith('(tidak tersedia)') ? s.leftoverForbiddenCode : s.leftoverCode}>{l}</code>
              ))}
              {draft.leftovers.some(l => l.endsWith('(tidak tersedia)')) && (
                <span style={s.leftoverHint}>
                  Bertanda (tidak tersedia) = datanya kosong. Lengkapi data kampanye lalu generate ulang, atau hapus kalimatnya manual lewat Edit.
                </span>
              )}
            </div>
          )}

          {/* Body */}
          <div style={s.bodyArea}>
            {editMode
              ? <textarea
                  value={draft.body}
                  onChange={e => updateDraft(draft.sponsor_name, { body: e.target.value })}
                  style={s.bodyTextarea}
                  rows={20}
                />
              : <div style={s.bodyPreview}>{renderBodyWithHighlights(draft.body, draft.leftovers)}</div>
            }
          </div>

          {/* Draft actions */}
          <div style={s.draftActions}>
            <button style={s.btnSecondary} onClick={() => setEditMode(e => !e)}>
              {editMode ? '✓ Selesai Edit' : '✏ Edit'}
            </button>
            <button
              style={{ ...s.btnSecondary, ...(regenName ? s.btnDisabled : {}) }}
              onClick={handleRegenActive}
              disabled={!!regenName || regenAll || isGenerating}
            >
              {regenName === draft.sponsor_name ? '...Menggenerate...' : '↺ Generate Ulang'}
            </button>
            <button
              style={{ ...s.btnSecondary, ...(regenAll ? s.btnDisabled : {}) }}
              onClick={handleRegenAll}
              disabled={!!regenName || regenAll || isGenerating}
              title="Generate ulang semua draft sponsor terpilih"
            >
              {regenAll ? '...Menggenerate...' : `↺ Generate Semua (${drafts.length})`}
            </button>
            {hasFailed && (
              <button
                style={s.btnSecondary}
                onClick={handleRetryFailed}
                disabled={!!regenName || regenAll || isGenerating}
              >
                ↺ Coba yang Gagal
              </button>
            )}
            <button style={s.btnSecondary} onClick={() => navigate('/app/cari-sponsor')}>
              ← Kembali
            </button>
          </div>
        </div>
      )}

      {state.lastRun && debugMode !== 'never' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={s.linkBtn} onClick={() => setShowDebug(v => !v)}>
            {showDebug ? 'Sembunyikan Debug' : 'Lihat Debug'}
          </button>
        </div>
      )}

      {/* Gmail Connect card */}
      <ConnectCard />

      {/* Pre-send & Queue */}
      {drafts.length > 0 && state.composio?.status === 'active' && (
        <SendPanel />
      )}

      {showDebug && state.lastRun && (
        <DebugPanel data={state.lastRun} onClose={() => setShowDebug(false)} />
      )}
    </div>
  )
}

function ConnectCard() {
  const { state, refreshComposio, linkComposio } = useStore()
  const { status, accountEmail, error } = state.composio || {}

  const STATUS_CONFIG = {
    idle: { label: 'Periksa koneksi Gmail', action: 'Periksa', fn: refreshComposio, color: 'var(--text-3)' },
    checking: { label: 'Memeriksa koneksi...', color: 'var(--text-3)' },
    disconnected: { label: 'Gmail belum terhubung', action: 'Hubungkan Gmail', fn: linkComposio, color: 'var(--state-warning)' },
    linking: { label: 'Mengarahkan ke halaman OAuth...', color: 'var(--brand-500)' },
    waiting: { label: 'Menunggu konfirmasi OAuth... (polling setiap 3s)', action: 'Cek Manual', fn: refreshComposio, color: 'var(--brand-500)' },
    active: { label: `Gmail terhubung${accountEmail ? `: ${accountEmail}` : ''}`, color: 'var(--state-success)' },
    error: { label: `Error: ${error}`, action: 'Coba Lagi', fn: refreshComposio, color: 'var(--state-danger)' },
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle

  return (
    <div style={{ ...s.connectCard, borderColor: cfg.color === 'var(--state-success)' ? '#12805c' : 'var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{status === 'active' ? '✅' : '📧'}</span>
        <span style={{ fontSize: 13, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
      </div>
      {cfg.action && (
        <button style={s.btnSecondary} onClick={cfg.fn}>{cfg.action}</button>
      )}
    </div>
  )
}

function SendPanel() {
  const { state, enqueueDrafts, sendQueue, retryQueueItem, cancelQueueItem, cancelAllQueued } = useStore()
  const [enqueueResult, setEnqueueResult] = useState(null)
  const drafts = state.drafts
  const pendingDrafts = drafts.filter(d => d.to && (!d.leftovers || d.leftovers.length === 0))
  const blockedDrafts = drafts.filter(d => !d.to || (d.leftovers && d.leftovers.length > 0))
  const totalQueued = state.queue.length
  const queuedItems = state.queue.filter(q => q.status === DELIVERY.QUEUED)

  function handleEnqueue() {
    const result = enqueueDrafts()
    setEnqueueResult(result)
  }

  function handleCancelAll() {
    if (queuedItems.length === 0) return
    if (!window.confirm(`Batalkan ${queuedItems.length} email yang masih antre (belum terkirim)?`)) return
    cancelAllQueued()
  }

  const DELIVERY_COLORS = {
    Queued: { bg: 'var(--surface-muted)', color: 'var(--text-3)' },
    Sending: { bg: 'var(--state-info-bg)', color: 'var(--state-info)' },
    Sent: { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
    Failed: { bg: 'var(--state-danger-bg)', color: 'var(--state-danger)' },
  }

  return (
    <div style={s.sendPanel}>
      <h3 style={s.sendTitle}>Kirim Email</h3>

      {blockedDrafts.length > 0 && (
        <div style={s.warningBanner}>
          ⚠ {blockedDrafts.length} draft terblokir (email kosong atau ada placeholder belum terisi):
          {blockedDrafts.map(d => <span key={d.sponsor_name} style={s.blockedChip}>{d.sponsor_name}</span>)}
        </div>
      )}

      <div style={s.preSendRow}>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {pendingDrafts.length} siap kirim • {totalQueued} di antrean
        </span>
        {totalQueued >= 10 && (
          <span style={s.capWarning}>⚠ Batas 10 email/sesi mendekati</span>
        )}
        <button style={s.btnPrimary} onClick={handleEnqueue} disabled={pendingDrafts.length === 0}>
          Masukkan ke Antrean
        </button>
        <button
          style={{ ...s.btnPrimary, background: 'var(--state-success)' }}
          onClick={sendQueue}
          disabled={state.sending || queuedItems.length === 0}
        >
          {state.sending ? 'Mengirim...' : 'Kirim Semua →'}
        </button>
        {queuedItems.length > 0 && (
          <button
            style={s.btnDanger}
            onClick={handleCancelAll}
          >
            ✕ Batalkan Semua ({queuedItems.length})
          </button>
        )}
      </div>

      {enqueueResult && !enqueueResult.ok && (
        <div style={s.errorBanner}>{enqueueResult.error}</div>
      )}

      {/* Queue list */}
      {state.queue.length > 0 && (
        <div style={s.queueList}>
          {state.queue.map(item => {
            const dc = DELIVERY_COLORS[item.status] || DELIVERY_COLORS.Queued
            return (
              <div key={item.key} style={s.queueItem}>
                <span style={s.queueName}>{item.sponsor_name}</span>
                <span style={s.queueTo}>{item.to}</span>
                <span style={{ ...s.queueStatus, background: dc.bg, color: dc.color }}>{item.status}</span>
                {item.error && <span style={s.queueError}>{item.error}</span>}
                {item.status === DELIVERY.QUEUED && (
                  <button style={s.cancelBtn} onClick={() => cancelQueueItem(item.key)}>✕ Batal</button>
                )}
                {item.status === 'Failed' && (
                  <button style={s.retryBtn} onClick={() => retryQueueItem(item.key)}>↺ Retry</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  root: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  tabs: { display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 },
  tab: {
    padding: '7px 16px', borderRadius: '8px 8px 0 0',
    border: '1px solid transparent', background: 'var(--surface-muted)',
    cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6,
  },
  tabActive: { background: 'var(--surface)', borderColor: 'var(--border-subtle)', color: 'var(--brand-500)', fontWeight: 600, borderBottomColor: '#fff' },
  flagBadge: { fontSize: 11, background: 'var(--state-warning-bg)', color: 'var(--state-warning)', padding: '1px 6px', borderRadius: 9999 },
  editedDot: { fontSize: 11, color: 'var(--text-3)' },
  missingEmail: { fontSize: 11, color: 'var(--state-danger)' },
  skeleton: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 28 },
  skeletonLine: { height: 14, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 10, width: '100%', animation: 'pulse 1.5s ease-in-out infinite' },
  skeletonText: { fontSize: 13, color: 'var(--text-3)', marginTop: 12 },
  errorBanner: {
    background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    border: '1px solid #f5c6c5', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12,
  },
  draftCard: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 },
  toRow: { display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 },
  toLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-3)', flexShrink: 0 },
  toInput: { flex: 1, padding: '7px 10px', fontSize: 15, border: '1px solid var(--border-strong)', borderRadius: 8, outline: 'none' },
  toInputMissing: { borderColor: 'var(--state-danger)', background: 'var(--state-danger-bg)' },
  subjectRow: { display: 'flex', alignItems: 'center', gap: 10 },
  subjectInput: { flex: 1, padding: '7px 10px', fontSize: 14, border: '1px solid var(--border-strong)', borderRadius: 8, outline: 'none' },
  subjectText: { fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1, overflowWrap: 'anywhere' },
  leftoverBanner: {
    background: 'var(--state-warning-bg)', color: 'var(--state-warning)',
    border: '1px solid #f9d67a', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
  },
  leftoverCode: { background: '#fff3cd', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 },
  leftoverForbiddenCode: { background: '#fde2e2', color: '#b42318', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 },
  leftoverHint: { fontSize: 12, color: 'var(--state-danger)', flexBasis: '100%' },
  highlight: { background: '#fff3cd', color: '#92400e', borderRadius: 3, padding: '0 2px' },
  highlightForbidden: { background: '#fde2e2', color: '#b42318', borderRadius: 3, padding: '0 2px' },
  manualBadge: { fontSize: 11, color: 'var(--brand-500)', fontWeight: 700 },
  bodyArea: {},
  bodyPreview: { fontSize: 14, color: 'var(--text-1)', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  bodyTextarea: { width: '100%', fontSize: 14, padding: 12, border: '1px solid var(--border-strong)', borderRadius: 8, lineHeight: 1.8, resize: 'vertical', outline: 'none' },
  draftActions: { display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 },
  connectCard: {
    background: 'var(--surface)', border: '1px solid',
    borderRadius: 12, padding: '14px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  sendPanel: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 },
  sendTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 },
  warningBanner: {
    background: 'var(--state-warning-bg)', color: 'var(--state-warning)',
    border: '1px solid #f9d67a', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
  },
  blockedChip: { background: '#fff3cd', padding: '1px 8px', borderRadius: 9999, fontSize: 12 },
  preSendRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  capWarning: { fontSize: 12, color: 'var(--state-warning)', fontWeight: 500 },
  queueList: { display: 'flex', flexDirection: 'column', gap: 6 },
  queueItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--page)', borderRadius: 8, flexWrap: 'wrap' },
  queueName: { fontWeight: 600, fontSize: 13, color: 'var(--text-1)', minWidth: 120 },
  queueTo: { fontSize: 12, color: 'var(--text-3)', flex: 1, overflowWrap: 'anywhere' },
  queueStatus: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999 },
  queueError: { fontSize: 12, color: 'var(--state-danger)' },
  retryBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-500)', fontSize: 12 },
  cancelBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--state-danger)', fontSize: 12 },
  btnDanger: {
    padding: '8px 20px', background: 'transparent', color: 'var(--state-danger)',
    border: '1px solid var(--state-danger)', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  btnPrimary: {
    padding: '8px 20px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  btnSecondary: {
    padding: '7px 16px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 9999, cursor: 'pointer', fontSize: 13,
  },
  btnDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  linkBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--state-danger)', textDecoration: 'underline', fontSize: 12, padding: 0 },
}
