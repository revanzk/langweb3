import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { validateCampaign } from '../lib/validators.js'
import { RELEVANCE_LEVEL_LIST, TONE_OPTIONS, JENIS_EVENT_OPTIONS } from '../lib/constants.js'
import { PLACEHOLDER_WHITELIST } from '../lib/merge.js'
import DebugPanel from '../components/DebugPanel.jsx'

const CATATAN_MIN = 30
const CATATAN_MAX = 2000

const LEVEL_COLORS = {
  'Sangat Relevan': { bg: '#e3f6ee', color: '#12805c' },
  'Relevan': { bg: '#e8f0fe', color: '#1c64f2' },
  'Cukup Relevan': { bg: '#fdf1dc', color: '#b45309' },
  'Kurang Relevan': { bg: 'var(--surface-muted)', color: 'var(--text-3)' },
  'Manual': { bg: 'var(--brand-100)', color: 'var(--brand-500)' },
}

export default function CariSponsor() {
  const { state, runSearch, runManualDraft, dispatch, allSponsors, selectedSponsors, toggleSelected } = useStore()
  const navigate = useNavigate()

  const hasResults = state.results.length > 0
  const hasSelection = state.selected.length > 0

  // ── Search form ─────────────────────────────────────────────────────────────
  const [searchForm, setSearchForm] = useState({
    jenisEvent: state.search.jenisEvent || '',
    perkiraanPeserta: state.search.perkiraanPeserta || '',
    catatanEvent: state.search.catatanEvent || '',
  })
  const [searchErrors, setSearchErrors] = useState({})
  const [showDebug, setShowDebug] = useState(false)
  const isSearching = state.searchPhase === 'searching' || state.searchPhase === 'waiting'

  // ── Hasil filters ───────────────────────────────────────────────────────────
  const [filter, setFilter] = useState('Semua')
  const [sort, setSort] = useState('score_desc')
  const [view, setView] = useState(() => localStorage.getItem('sf_view') || 'card')

  // ── Campaign form ───────────────────────────────────────────────────────────
  const cam = state.campaign
  const [campForm, setCampForm] = useState({
    namaEvent: cam.namaEvent || '',
    tanggalEvent: cam.tanggalEvent || '',
    lokasiEvent: cam.lokasiEvent || '',
    penyelenggara: cam.penyelenggara || '',
    kebutuhanSponsorship: cam.kebutuhanSponsorship || '',
    toneEmail: cam.toneEmail || 'Formal',
    informasiTambahan: cam.informasiTambahan || '',
    namaPIC: cam.namaPIC || '',
    jabatanPIC: cam.jabatanPIC || '',
    kontakPIC: cam.kontakPIC || '',
    emailPIC: cam.emailPIC || '',
    websiteAcara: cam.websiteAcara || '',
    linkProposal: cam.linkProposal || '',
    jenisEvent: cam.jenisEvent || state.search.jenisEvent || '',
    perkiraanPeserta: cam.perkiraanPeserta || state.search.perkiraanPeserta || '',
    catatanEvent: cam.catatanEvent || state.search.catatanEvent || '',
  })
  const [campErrors, setCampErrors] = useState({})

  // Sync shared fields when results arrive (peserta diisi manual di Seksi 3)
  useEffect(() => {
    if (hasResults) {
      setCampForm(f => ({
        ...f,
        jenisEvent: f.jenisEvent || state.search.jenisEvent || '',
        catatanEvent: f.catatanEvent || state.search.catatanEvent || '',
      }))
    }
  }, [hasResults])

  // ── Scroll refs ─────────────────────────────────────────────────────────────
  const hasilRef = useRef(null)
  const kampanyeRef = useRef(null)

  // ── Search handlers ─────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    const { name, value } = e.target
    setSearchForm(f => ({ ...f, [name]: value }))
    if (searchErrors[name]) setSearchErrors(err => ({ ...err, [name]: null }))
  }

  async function doSearch() {
    // Pass form directly — dispatch is async so state.search won't be updated yet
    const result = await runSearch(searchForm)
    if (!result) return
    if (!result.valid) { setSearchErrors(result.errors); return }
    // Persist to store after successful validation
    dispatch({ type: 'SET_SEARCH', payload: searchForm })
    if (!result.ok) { setShowDebug(true); return }
    setTimeout(() => hasilRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function handleSearch(e) {
    e.preventDefault()
    await doSearch()
  }

  function switchView(v) {
    setView(v)
    localStorage.setItem('sf_view', v)
  }

  // ── Campaign handlers ───────────────────────────────────────────────────────
  function handleCampChange(e) {
    const { name, value } = e.target
    setCampForm(f => ({ ...f, [name]: value }))
    if (campErrors[name]) setCampErrors(err => ({ ...err, [name]: null }))
  }

  const hasDrafts = (state.drafts || []).length > 0

  function handleGenerateDraft(e) {
    e.preventDefault()
    const { valid, errors } = validateCampaign(campForm)
    if (!valid) { setCampErrors(errors); return }
    dispatch({ type: 'SET_CAMPAIGN', payload: campForm })
    if (hasDrafts) {
      // Sudah pernah generate dan kembali: paksa regenerate di halaman draft.
      // "Lihat Draft" (di bawah) navigasi tanpa force sehingga draft lama dipakai ulang.
      dispatch({ type: 'SET_DRAFT_PHASE', payload: 'idle' })
      dispatch({ type: 'SET_DRAFTS', drafts: [] })
      navigate('/app/cari-sponsor/draft', { state: { force: true } })
    } else {
      navigate('/app/cari-sponsor/draft')
    }
  }

  function handleViewDraft() {
    const { valid } = validateCampaign(campForm)
    // Tetap simpan kampanye agar kembali ke draft konsisten, tapi jangan clear/force.
    if (valid) dispatch({ type: 'SET_CAMPAIGN', payload: campForm })
    navigate('/app/cari-sponsor/draft')
  }

  // ── Draft manual (template buatan user → dirapikan AI) ─────────────────────
  const [showManual, setShowManual] = useState(false)
  const [manualSubject, setManualSubject] = useState('')
  const [manualBody, setManualBody] = useState('')
  const [manualSending, setManualSending] = useState(false)
  const [manualError, setManualError] = useState(null)
  const manualBodyRef = useRef(null)

  function insertManualPlaceholder(name) {
    const token = `[${name}]`
    const el = manualBodyRef.current
    if (!el) {
      setManualBody(b => (b ? `${b} ${token}` : token))
      return
    }
    const start = el.selectionStart ?? manualBody.length
    const end = el.selectionEnd ?? manualBody.length
    const next = `${manualBody.slice(0, start)}${token}${manualBody.slice(end)}`
    setManualBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    const { valid, errors } = validateCampaign(campForm)
    if (!valid) { setCampErrors(errors); return }
    if (!manualBody.trim()) {
      setManualError('Isi draft manual masih kosong.')
      return
    }
    dispatch({ type: 'SET_CAMPAIGN', payload: campForm })
    setManualSending(true)
    setManualError(null)
    const res = await runManualDraft(manualSubject, manualBody)
    setManualSending(false)
    if (!res?.ok) {
      setManualError(res?.error || 'Gagal memproses draft manual.')
      return
    }
    navigate('/app/cari-sponsor/draft')
  }

  // ── Hasil display logic — hanya hasil AI, manual tidak muncul di sini ───────
  const filters = ['Semua', ...RELEVANCE_LEVEL_LIST]
  const filtered = state.results.filter(sp => {
    if (filter === 'Semua') return true
    return sp.relevance_level === filter
  })
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'score_desc') return (b.relevance_score ?? -1) - (a.relevance_score ?? -1)
    if (sort === 'score_asc') return (a.relevance_score ?? 101) - (b.relevance_score ?? 101)
    return a.sponsor_name.localeCompare(b.sponsor_name)
  })
  const display = sorted

  const phaseLabel = state.searchPhase === 'searching'
    ? (state.searchNote || 'Menghubungi AI...')
    : state.searchPhase === 'waiting'
      ? 'Menunggu hasil...'
      : null

  return (
    <div style={s.root}>

      {/* ══ SEKSI 1: Form Pencarian ══ */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionNum}>1</div>
          <h2 style={s.sectionTitle}>Cari Sponsor</h2>
          {hasResults && <span style={s.sectionBadge}>✓ {allSponsors.length} sponsor ditemukan</span>}
        </div>

        <form onSubmit={handleSearch} noValidate>
          <Field label="Jenis Event *" error={searchErrors.jenisEvent}>
            <select name="jenisEvent" value={searchForm.jenisEvent} onChange={handleSearchChange}
              disabled={isSearching}
              style={{ ...s.input, ...s.selectInput, ...(searchErrors.jenisEvent ? s.inputErr : {}) }}>
              <option value="">— Pilih jenis event —</option>
              {JENIS_EVENT_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Catatan Event *" error={searchErrors.catatanEvent}
            hint={`${searchForm.catatanEvent.length} / ${CATATAN_MAX} karakter (min ${CATATAN_MIN})`}>
            <textarea name="catatanEvent" value={searchForm.catatanEvent} onChange={handleSearchChange}
              disabled={isSearching} rows={4} maxLength={CATATAN_MAX}
              placeholder="Ceritakan detail event: tema, tujuan, target audiens, kebutuhan sponsor, lokasi, dll..."
              style={{ ...s.input, ...s.textarea, ...(searchErrors.catatanEvent ? s.inputErr : {}) }} />
          </Field>

          {state.searchPhase === 'error' && (
            <div style={s.errorBanner}>
              ⚠ {state.searchError}
              <button type="button" style={s.linkBtn} onClick={doSearch} disabled={isSearching}>
                {isSearching ? 'Mencoba...' : 'Coba Lagi'}
              </button>
              <button type="button" style={s.linkBtn} onClick={() => setShowDebug(v => !v)}>
                {showDebug ? 'Sembunyikan Debug' : 'Lihat Debug'}
              </button>
            </div>
          )}
          {phaseLabel && (
            <div style={s.phaseBanner}><span style={s.spinner} />{phaseLabel}</div>
          )}

          <div style={s.searchActions}>
            <button type="submit" style={s.btnPrimary} disabled={isSearching}>
              {isSearching ? 'Mencari...' : hasResults ? '↺ Cari Ulang' : 'Cari Sponsor →'}
            </button>
          </div>
        </form>

        {showDebug && state.lastRun && (
          <DebugPanel data={state.lastRun} onClose={() => setShowDebug(false)} />
        )}
      </div>

      {/* ══ SEKSI 2: Hasil & Pilih Sponsor ══ */}
      {hasResults && (
        <div style={s.section} ref={hasilRef}>
          <div style={s.sectionHeader}>
            <div style={s.sectionNum}>2</div>
            <h2 style={s.sectionTitle}>Pilih Sponsor</h2>
            <span style={s.sectionSub}>{state.selected.length} dipilih</span>
          </div>

          {state.summary && (
            <div style={s.summaryBanner}>
              <span style={s.summaryLabel}>Ringkasan AI:</span> {state.summary}
            </div>
          )}

          {/* Toolbar */}
          <div style={s.toolbar}>
            <div style={s.filterRow}>
              {filters.map(f => (
                <button key={f}
                  style={{ ...s.filterChip, ...(filter === f ? s.filterChipActive : {}) }}
                  onClick={() => setFilter(f)}>{f}
                </button>
              ))}
            </div>
            <div style={s.toolbarRight}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={s.select}>
                <option value="score_desc">Skor Tertinggi</option>
                <option value="score_asc">Skor Terendah</option>
                <option value="name_asc">Nama A–Z</option>
              </select>
              <button style={{ ...s.viewBtn, ...(view === 'card' ? s.viewBtnActive : {}) }} onClick={() => switchView('card')}>▦ Kartu</button>
              <button style={{ ...s.viewBtn, ...(view === 'list' ? s.viewBtnActive : {}) }} onClick={() => switchView('list')}>☰ Daftar</button>
            </div>
          </div>

          {view === 'card' && (
            <div style={s.grid}>
              {display.map(sp => (
                <SponsorCard key={sp.sponsor_name} sponsor={sp}
                  selected={state.selected.includes(sp.sponsor_name)}
                  onToggle={() => toggleSelected(sp.sponsor_name)} />
              ))}
            </div>
          )}
          {view === 'list' && (
            <div style={s.listContainer}>
              {display.map(sp => (
                <SponsorRow key={sp.sponsor_name} sponsor={sp}
                  selected={state.selected.includes(sp.sponsor_name)}
                  onToggle={() => toggleSelected(sp.sponsor_name)} />
              ))}
            </div>
          )}

          {hasSelection && (
            <div style={s.selectionBar}>
              <span style={s.selectionText}>✓ {state.selected.length} sponsor dipilih</span>
              <button style={s.btnPrimary}
                onClick={() => setTimeout(() => kampanyeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)}>
                Isi Detail Kampanye ↓
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ SEKSI 3: Detail Kampanye ══ */}
      {hasSelection && (
        <div style={s.section} ref={kampanyeRef}>
          <div style={s.sectionHeader}>
            <div style={s.sectionNum}>3</div>
            <h2 style={s.sectionTitle}>Detail Kampanye</h2>
          </div>

          <div style={s.selectedChips}>
            {selectedSponsors.map(sp => (
              <span key={sp.sponsor_name} style={s.chip}>{sp.sponsor_name}</span>
            ))}
          </div>

          <form onSubmit={handleGenerateDraft} noValidate>
            <Block title="Konteks Event">
              <div style={s.lockedRow}>
                <span style={s.lockedLabel}>Jenis Event</span>
                <span style={s.lockedValue}>{campForm.jenisEvent || '—'}</span>
              </div>
              <div style={s.lockedRow}>
                <span style={s.lockedLabel}>Catatan Event</span>
                <span style={s.lockedValue}>{campForm.catatanEvent || '—'}</span>
              </div>
              <Field label="Estimasi Peserta *" error={campErrors.perkiraanPeserta}
                hint="Jumlah perkiraan peserta acara (angka, minimal 10)">
                <input name="perkiraanPeserta" value={campForm.perkiraanPeserta} onChange={handleCampChange}
                  inputMode="numeric" placeholder="cth. 500"
                  style={{ ...s.input, ...(campErrors.perkiraanPeserta ? s.inputErr : {}) }} />
              </Field>
            </Block>

            <Block title="Detail Event">
              <div style={s.formGrid}>
                <Field label="Nama Event *" error={campErrors.namaEvent}>
                  <input name="namaEvent" value={campForm.namaEvent} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.namaEvent ? s.inputErr : {}) }} />
                </Field>
                <Field label="Tanggal Event *" error={campErrors.tanggalEvent}>
                  <input type="date" name="tanggalEvent" value={campForm.tanggalEvent} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.tanggalEvent ? s.inputErr : {}) }} />
                </Field>
                <Field label="Lokasi Event *" error={campErrors.lokasiEvent}>
                  <input name="lokasiEvent" value={campForm.lokasiEvent} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.lokasiEvent ? s.inputErr : {}) }} />
                </Field>
                <Field label="Penyelenggara *" error={campErrors.penyelenggara}>
                  <input name="penyelenggara" value={campForm.penyelenggara} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.penyelenggara ? s.inputErr : {}) }} />
                </Field>
              </div>
              <Field label="Kebutuhan Sponsorship *" error={campErrors.kebutuhanSponsorship}>
                <textarea name="kebutuhanSponsorship" value={campForm.kebutuhanSponsorship} onChange={handleCampChange}
                  rows={3} style={{ ...s.input, ...s.textarea, ...(campErrors.kebutuhanSponsorship ? s.inputErr : {}) }} />
              </Field>
              <Field label="Informasi Tambahan">
                <input name="informasiTambahan" value={campForm.informasiTambahan} onChange={handleCampChange} style={s.input} />
              </Field>
            </Block>

            <Block title="Penanggung Jawab (PIC)">
              <div style={s.formGrid}>
                <Field label="Nama PIC *" error={campErrors.namaPIC}>
                  <input name="namaPIC" value={campForm.namaPIC} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.namaPIC ? s.inputErr : {}) }} />
                </Field>
                <Field label="Jabatan PIC">
                  <input name="jabatanPIC" value={campForm.jabatanPIC} onChange={handleCampChange}
                    placeholder="cth. Ketua Panitia"
                    style={s.input} />
                </Field>
                <Field label="Kontak PIC *" error={campErrors.kontakPIC}>
                  <input name="kontakPIC" value={campForm.kontakPIC} onChange={handleCampChange}
                    placeholder="+62..."
                    style={{ ...s.input, ...(campErrors.kontakPIC ? s.inputErr : {}) }} />
                </Field>
                <Field label="Email PIC *" error={campErrors.emailPIC}>
                  <input type="email" name="emailPIC" value={campForm.emailPIC} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.emailPIC ? s.inputErr : {}) }} />
                </Field>
                <Field label="Website Acara" error={campErrors.websiteAcara}>
                  <input name="websiteAcara" value={campForm.websiteAcara} onChange={handleCampChange}
                    placeholder="https://..."
                    style={{ ...s.input, ...(campErrors.websiteAcara ? s.inputErr : {}) }} />
                </Field>
                <Field label="Link Proposal" error={campErrors.linkProposal}>
                  <input name="linkProposal" value={campForm.linkProposal} onChange={handleCampChange}
                    placeholder="https://..."
                    style={{ ...s.input, ...(campErrors.linkProposal ? s.inputErr : {}) }} />
                </Field>
              </div>
            </Block>

            <Block title="Tone Email">
              <div style={s.toneRow}>
                {TONE_OPTIONS.map(t => (
                  <label key={t} style={s.toneLabel}>
                    <input type="radio" name="toneEmail" value={t}
                      checked={campForm.toneEmail === t} onChange={handleCampChange}
                      style={{ accentColor: 'var(--brand-500)' }} />
                    {t}
                  </label>
                ))}
              </div>
            </Block>

            <div style={s.campActions}>
              {hasDrafts && (
                <button type="button" style={s.btnSecondaryLg} onClick={handleViewDraft}>
                  ← Lihat Draft ({state.drafts.length})
                </button>
              )}
              <button type="button" style={s.btnSecondaryLg} onClick={() => setShowManual(v => !v)}>
                {showManual ? '✎ Tutup Draft Manual' : '✎ Buat Draft Manual'}
              </button>
              <button type="submit" style={s.btnPrimaryLg}>
                {hasDrafts ? '↺ Generate Ulang Draft →' : '✉ Generate Draft Email →'}
              </button>
            </div>
          </form>

          {showManual && (
            <form onSubmit={handleManualSubmit} noValidate style={s.manualBox}>
              <p style={s.manualTitle}>Draft Manual — tulis dengan bahasamu sendiri</p>
              <p style={s.manualHint}>
                AI akan merapikan bahasanya tanpa mengubah placeholder. Klik chip untuk menyisipkan placeholder resmi:
              </p>
              <div style={s.chipsRow}>
                {PLACEHOLDER_WHITELIST.map(p => (
                  <button key={p} type="button" style={s.chipBtn} onClick={() => insertManualPlaceholder(p)}>
                    [{p}]
                  </button>
                ))}
              </div>
              <Field label="Subjek (boleh berisi placeholder)">
                <input value={manualSubject} onChange={e => setManualSubject(e.target.value)}
                  disabled={manualSending}
                  placeholder="cth. Penawaran Sponsorship [nama_acara] untuk [nama_perusahaan]"
                  style={s.input} />
              </Field>
              <Field label="Isi Email *">
                <textarea ref={manualBodyRef} value={manualBody} onChange={e => setManualBody(e.target.value)}
                  disabled={manualSending} rows={12}
                  placeholder="Tulis draft email di sini, pakai placeholder seperti [nama_perusahaan], [nama_acara], [nama_pic]..."
                  style={{ ...s.input, ...s.textarea }} />
              </Field>
              {manualError && <p style={s.errText}>{manualError}</p>}
              <div style={s.campActions}>
                <button type="submit" style={s.btnPrimaryLg} disabled={manualSending}>
                  {manualSending ? 'Memproses ke AI...' : 'Kirim ke AI →'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Block({ title, children }) {
  return (
    <div style={bc.block}>
      <p style={bc.title}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint && !error && <p style={s.hint}>{hint}</p>}
      {error && <p style={s.errText}>{error}</p>}
    </div>
  )
}

function SponsorCard({ sponsor, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const isManual = sponsor.source === 'manual'
  const lc = isManual ? LEVEL_COLORS.Manual : (LEVEL_COLORS[sponsor.relevance_level] || LEVEL_COLORS['Kurang Relevan'])
  const score = isManual ? '–/100' : `${sponsor.relevance_score}/100`

  return (
    <div style={{ ...s.card, ...(selected ? s.cardSelected : {}) }}>
      <div style={s.cardHeader}>
        <input type="checkbox" checked={selected} onChange={onToggle} style={s.checkbox} />
        <div style={s.avatar}>{sponsor.sponsor_name[0].toUpperCase()}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={s.sponsorName}>{sponsor.sponsor_name}</div>
          <div style={s.sponsorMeta}>
            {sponsor.industry && <span style={s.metaItem}>{sponsor.industry}</span>}
            {sponsor.location && <span style={s.metaItem}>📍 {sponsor.location}</span>}
          </div>
        </div>
        <div style={s.scoreBox}>
          <span style={s.scoreNum}>{score}</span>
          <span style={{ ...s.levelChip, background: lc.bg, color: lc.color }}>
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
              {expanded ? 'Sembunyikan ▲' : `+${sponsor.reason.length - 3} lainnya ▼`}
            </button>
          )}
        </div>
      )}
      <div style={s.support}>
        {sponsor.support_type?.length > 0
          ? sponsor.support_type.map((t, i) => <span key={i} style={s.supportChip}>{t}</span>)
          : <span style={s.noData}>tidak diketahui</span>}
      </div>
      {(sponsor.contact_email || sponsor.website) && (
        <div style={s.contactRow}>
          {sponsor.contact_email && <a href={`mailto:${sponsor.contact_email}`} style={s.contactLink}>{sponsor.contact_email}</a>}
          {sponsor.website && <a href={sponsor.website} target="_blank" rel="noopener noreferrer" style={s.contactLink}>🔗 Website</a>}
        </div>
      )}
    </div>
  )
}

function SponsorRow({ sponsor, selected, onToggle }) {
  const isManual = sponsor.source === 'manual'
  const lc = isManual ? LEVEL_COLORS.Manual : (LEVEL_COLORS[sponsor.relevance_level] || LEVEL_COLORS['Kurang Relevan'])
  return (
    <div style={{ ...s.listRow, ...(selected ? s.listRowSelected : {}) }}>
      <input type="checkbox" checked={selected} onChange={onToggle} style={s.checkbox} />
      <div style={s.rowAvatar}>{sponsor.sponsor_name[0].toUpperCase()}</div>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sponsor.sponsor_name}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>
        {isManual ? '–' : sponsor.relevance_score}
      </span>
      <span style={{ ...s.levelChip, background: lc.bg, color: lc.color, flexShrink: 0 }}>
        {isManual ? 'Manual' : sponsor.relevance_level}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: { maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 },

  section: {
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 16, padding: 28,
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionNum: {
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    background: 'var(--brand-500)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-1)', margin: 0, flex: 1 },
  sectionBadge: { fontSize: 12, fontWeight: 600, color: 'var(--state-success)', background: 'var(--state-success-bg)', padding: '3px 10px', borderRadius: 9999 },
  sectionSub: { fontSize: 13, color: 'var(--brand-500)', fontWeight: 600 },

  formGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0 20px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 12px', fontSize: 15,
    border: '1px solid var(--border-strong)', borderRadius: 8,
    outline: 'none', background: '#fff', color: 'var(--text-1)',
    transition: 'border-color 150ms',
  },
  inputErr: { borderColor: 'var(--state-danger)' },
  textarea: { resize: 'vertical' },
  selectInput: { cursor: 'pointer' },
  lockedRow: { marginBottom: 12 },
  lockedLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 },
  lockedValue: {
    display: 'block', fontSize: 14, color: 'var(--text-1)',
    background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)',
    borderRadius: 8, padding: '9px 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
  },
  hint: { fontSize: 12, color: 'var(--text-3)', marginTop: 3 },
  errText: { fontSize: 12, color: 'var(--state-danger)', marginTop: 3 },

  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    border: '1px solid #f5c6c5', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 12,
  },
  phaseBanner: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--brand-50)', color: 'var(--brand-500)',
    border: '1px solid var(--brand-200)', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 12,
  },
  spinner: {
    width: 14, height: 14, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
    border: '2px solid var(--brand-200)', borderTopColor: 'var(--brand-500)',
    animation: 'spin 0.8s linear infinite',
  },
  searchActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  linkBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--state-danger)', textDecoration: 'underline', fontSize: 12, padding: 0 },
  btnPrimary: {
    padding: '10px 24px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  btnPrimaryLg: {
    padding: '12px 32px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 15, fontWeight: 700,
  },
  btnSecondaryLg: {
    padding: '12px 28px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  manualBox: {
    marginTop: 16, background: 'var(--page)', border: '1px dashed var(--border-strong)',
    borderRadius: 10, padding: 20,
  },
  manualTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' },
  manualHint: { fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' },
  chipsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chipBtn: {
    fontSize: 11, fontFamily: 'monospace', padding: '3px 9px', borderRadius: 9999,
    border: '1px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-600)',
    cursor: 'pointer',
  },

  summaryBanner: {
    background: 'var(--brand-50)', border: '1px solid var(--brand-200)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-2)', marginBottom: 14,
  },
  summaryLabel: { fontWeight: 600, color: 'var(--brand-500)' },
  toolbar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    marginBottom: 16, padding: '10px 14px',
    background: 'var(--page)', border: '1px solid var(--border-subtle)', borderRadius: 10,
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 },
  filterChip: {
    padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
    border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
  },
  filterChipActive: { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 6 },
  select: {
    padding: '5px 10px', fontSize: 13, border: '1px solid var(--border-strong)',
    borderRadius: 8, background: '#fff', color: 'var(--text-2)', cursor: 'pointer',
  },
  viewBtn: {
    padding: '5px 10px', fontSize: 12, border: '1px solid var(--border-strong)',
    borderRadius: 8, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
  },
  viewBtnActive: { background: 'var(--brand-50)', color: 'var(--brand-500)', borderColor: 'var(--brand-200)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  listContainer: { display: 'flex', flexDirection: 'column', gap: 6 },

  card: {
    background: 'var(--page)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
  },
  cardSelected: { borderColor: 'var(--brand-400)', boxShadow: '0 0 0 2px var(--brand-100)', background: '#fff' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  checkbox: { marginTop: 3, accentColor: 'var(--brand-500)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' },
  avatar: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
  },
  sponsorName: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflowWrap: 'anywhere' },
  sponsorMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  metaItem: { fontSize: 11, color: 'var(--text-3)' },
  scoreBox: { marginLeft: 'auto', textAlign: 'right', flexShrink: 0 },
  scoreNum: { display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' },
  levelChip: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, display: 'inline-block' },
  reasons: { display: 'flex', flexDirection: 'column', gap: 3 },
  reason: { fontSize: 12, color: 'var(--text-2)' },
  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-500)', fontSize: 11, padding: 0, marginTop: 2 },
  support: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  supportChip: { fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'var(--surface-muted)', color: 'var(--text-2)' },
  noData: { fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' },
  contactRow: { display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px dashed var(--border-subtle)', paddingTop: 8 },
  contactLink: { fontSize: 11, color: 'var(--brand-500)', textDecoration: 'underline' },

  listRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', background: 'var(--page)',
    border: '1px solid var(--border-subtle)', borderRadius: 8, minWidth: 0,
  },
  listRowSelected: { borderColor: 'var(--brand-400)', background: '#fff' },
  rowAvatar: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12,
  },

  selectionBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    marginTop: 16, padding: '12px 16px',
    background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 10,
  },
  selectionText: { fontSize: 14, fontWeight: 600, color: 'var(--brand-600)' },

  selectedChips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  chip: { fontSize: 12, padding: '4px 12px', borderRadius: 9999, background: 'var(--brand-100)', color: 'var(--brand-600)', fontWeight: 500 },

  toneRow: { display: 'flex', gap: 20 },
  toneLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  campActions: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 },
}

const bc = {
  block: {
    background: 'var(--page)', border: '1px solid var(--border-subtle)',
    borderRadius: 10, padding: 20, marginBottom: 12,
  },
  title: { fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' },
}
