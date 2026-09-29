import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import DebugPanel from '../components/DebugPanel.jsx'

const CATATAN_MIN = 30
const CATATAN_MAX = 2000

export default function CariSponsor() {
  const { state, runSearch, dispatch } = useStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    jenisEvent: state.search.jenisEvent || '',
    perkiraanPeserta: state.search.perkiraanPeserta || '',
    catatanEvent: state.search.catatanEvent || '',
  })
  const [errors, setErrors] = useState({})
  const [showDebug, setShowDebug] = useState(false)

  const isSearching = state.searchPhase === 'searching' || state.searchPhase === 'waiting'

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(e => ({ ...e, [name]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Sync form to store
    dispatch({ type: 'SET_SEARCH', payload: form })
    const result = await runSearch()
    if (!result) return
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    if (result.ok) {
      navigate('/app/cari-sponsor/hasil')
    } else {
      setShowDebug(true)
    }
  }

  const phaseLabel = state.searchPhase === 'searching'
    ? 'Menghubungi AI...'
    : state.searchPhase === 'waiting'
      ? 'Menunggu hasil...'
      : null

  return (
    <div style={s.root}>
      {/* Stepper */}
      <Stepper active={0} steps={['Cari', 'Hasil', 'Kampanye', 'Draft']} />

      <div style={s.layout}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={s.card} noValidate>
          <h2 style={s.cardTitle}>Informasi Event</h2>
          <p style={s.cardSub}>Deskripsikan event kamu agar AI bisa menemukan sponsor yang paling relevan.</p>

          <Field
            label="Jenis Event *"
            error={errors.jenisEvent}
          >
            <input
              name="jenisEvent"
              value={form.jenisEvent}
              onChange={handleChange}
              placeholder="cth. Hackathon teknologi, Konser musik indie, Seminar nasional..."
              style={{ ...s.input, ...(errors.jenisEvent ? s.inputErr : {}) }}
              disabled={isSearching}
            />
          </Field>

          <Field
            label="Perkiraan Peserta *"
            error={errors.perkiraanPeserta}
          >
            <input
              name="perkiraanPeserta"
              value={form.perkiraanPeserta}
              onChange={handleChange}
              placeholder="cth. 500"
              inputMode="numeric"
              style={{ ...s.input, ...(errors.perkiraanPeserta ? s.inputErr : {}) }}
              disabled={isSearching}
            />
          </Field>

          <Field
            label="Catatan Event *"
            error={errors.catatanEvent}
            hint={`${form.catatanEvent.length} / ${CATATAN_MAX} karakter (min ${CATATAN_MIN})`}
          >
            <textarea
              name="catatanEvent"
              value={form.catatanEvent}
              onChange={handleChange}
              placeholder="Ceritakan detail event: tema, tujuan, target audiens, kebutuhan sponsor, dll..."
              rows={6}
              maxLength={CATATAN_MAX}
              style={{ ...s.input, ...s.textarea, ...(errors.catatanEvent ? s.inputErr : {}) }}
              disabled={isSearching}
            />
          </Field>

          {state.searchPhase === 'error' && (
            <div style={s.errorBanner}>
              <span>⚠ {state.searchError}</span>
              <button type="button" style={s.linkBtn} onClick={() => setShowDebug(v => !v)}>
                {showDebug ? 'Sembunyikan Debug' : 'Lihat Debug'}
              </button>
            </div>
          )}

          {phaseLabel && (
            <div style={s.phaseBanner}>
              <span style={s.spinner} />
              {phaseLabel}
            </div>
          )}

          <div style={s.actions}>
            <button type="submit" style={s.btnPrimary} disabled={isSearching}>
              {isSearching ? 'Mencari...' : 'Cari Sponsor →'}
            </button>
          </div>
        </form>

        {/* Tips aside */}
        <aside style={s.aside}>
          <h3 style={s.asideTitle}>💡 Tips</h3>
          <ul style={s.tipsList}>
            <li>Sertakan jenis event dan target audiens yang jelas.</li>
            <li>Sebutkan kota/lokasi penyelenggaraan jika ada.</li>
            <li>Jelaskan kebutuhan sponsorship: tunai, produk, promosi?</li>
            <li>AI akan menemukan maks. 5 sponsor paling relevan.</li>
            <li>Kamu bisa tambah sponsor manual di halaman Tambah Sponsor.</li>
          </ul>
        </aside>
      </div>

      {showDebug && state.lastRun && (
        <DebugPanel data={state.lastRun} onClose={() => setShowDebug(false)} />
      )}
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint && !error && <p style={s.hint}>{hint}</p>}
      {error && <p style={s.errText}>{error}</p>}
    </div>
  )
}

function Stepper({ active, steps }) {
  return (
    <div style={s.stepper}>
      {steps.map((step, i) => (
        <div key={step} style={s.stepItem}>
          <div style={{
            ...s.stepCircle,
            ...(i === active ? s.stepActive : i < active ? s.stepDone : {}),
          }}>
            {i < active ? '✓' : i + 1}
          </div>
          <span style={{ ...s.stepLabel, ...(i === active ? { color: 'var(--brand-500)' } : {}) }}>
            {step}
          </span>
          {i < steps.length - 1 && <div style={s.stepLine} />}
        </div>
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: { maxWidth: 900, margin: '0 auto' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 24, marginTop: 24 },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: 28,
  },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  cardSub: { fontSize: 13, color: 'var(--text-3)', marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', fontSize: 15,
    border: '1px solid var(--border-strong)', borderRadius: 8,
    outline: 'none', background: '#fff', color: 'var(--text-1)',
    transition: 'border-color 150ms',
  },
  inputErr: { borderColor: 'var(--state-danger)' },
  textarea: { resize: 'vertical', minHeight: 120 },
  hint: { fontSize: 12, color: 'var(--text-3)', marginTop: 4 },
  errText: { fontSize: 12, color: 'var(--state-danger)', marginTop: 4 },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    border: '1px solid #f5c6c5', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  phaseBanner: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--brand-50)', color: 'var(--brand-500)',
    border: '1px solid var(--brand-200)', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  spinner: {
    width: 14, height: 14,
    border: '2px solid var(--brand-200)',
    borderTopColor: 'var(--brand-500)',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
  btnPrimary: {
    padding: '10px 28px',
    background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999,
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
    opacity: 1, transition: 'opacity 150ms',
  },
  linkBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--state-danger)', textDecoration: 'underline', fontSize: 12, padding: 0,
  },
  aside: {
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: 20, alignSelf: 'start',
  },
  asideTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 },
  tipsList: { paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-2)' },
  stepper: { display: 'flex', alignItems: 'center', gap: 0 },
  stepItem: { display: 'flex', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'var(--surface-muted)', color: 'var(--text-3)',
    fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid var(--border-subtle)',
  },
  stepActive: { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' },
  stepDone: { background: 'var(--state-success-bg)', color: 'var(--state-success)', borderColor: 'var(--state-success)' },
  stepLabel: { fontSize: 13, color: 'var(--text-3)', fontWeight: 500 },
  stepLine: { width: 32, height: 2, background: 'var(--border-subtle)', margin: '0 4px' },
}
