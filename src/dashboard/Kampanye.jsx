import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { validateCampaign } from '../lib/validators.js'
import { TONE_OPTIONS } from '../lib/constants.js'

export default function Kampanye({ backPath }) {
  const { state, dispatch, selectedSponsors } = useStore()
  const navigate = useNavigate()
  const cam = state.campaign

  const [form, setForm] = useState({
    namaEvent: cam.namaEvent || '',
    tanggalEvent: cam.tanggalEvent || '',
    lokasiEvent: cam.lokasiEvent || '',
    penyelenggara: cam.penyelenggara || '',
    kebutuhanSponsorship: cam.kebutuhanSponsorship || '',
    toneEmail: cam.toneEmail || 'Formal',
    informasiTambahan: cam.informasiTambahan || '',
    namaPIC: cam.namaPIC || '',
    kontakPIC: cam.kontakPIC || '',
    emailPIC: cam.emailPIC || '',
    websiteAcara: cam.websiteAcara || '',
    linkProposal: cam.linkProposal || '',
    // Shared from search
    jenisEvent: cam.jenisEvent || state.search.jenisEvent || '',
    perkiraanPeserta: cam.perkiraanPeserta || state.search.perkiraanPeserta || '',
    catatanEvent: cam.catatanEvent || state.search.catatanEvent || '',
  })
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(e => ({ ...e, [name]: null }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const { valid, errors: errs } = validateCampaign(form)
    if (!valid) { setErrors(errs); return }
    dispatch({ type: 'SET_CAMPAIGN', payload: form })
    const draftPath = backPath?.includes('tambah') ? '/app/tambah-sponsor/draft' : '/app/cari-sponsor/draft'
    navigate(draftPath)
  }

  const isCariFlow = !backPath?.includes('tambah')

  return (
    <div style={s.root}>
      {/* Context box */}
      <div style={s.contextBox}>
        <div style={s.contextRow}>
          <span style={s.contextLabel}>Sponsor dipilih ({selectedSponsors.length}):</span>
          <div style={s.chips}>
            {selectedSponsors.map(sp => (
              <span key={sp.sponsor_name} style={s.chip}>{sp.sponsor_name}</span>
            ))}
          </div>
          <button style={s.backBtn} onClick={() => navigate(backPath || -1)}>← Kembali</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={s.form} noValidate>
        {/* Section: Konteks Event */}
        <Section title="Konteks Event">
          <Field label="Jenis Event *" error={errors.jenisEvent}>
            <input name="jenisEvent" value={form.jenisEvent} onChange={handleChange} style={{ ...s.input, ...(errors.jenisEvent ? s.inputErr : {}) }} />
          </Field>
          <Field label="Perkiraan Peserta *" error={errors.perkiraanPeserta}>
            <input name="perkiraanPeserta" value={form.perkiraanPeserta} onChange={handleChange} inputMode="numeric" style={{ ...s.input, ...(errors.perkiraanPeserta ? s.inputErr : {}) }} />
          </Field>
          <Field label="Catatan Event *" error={errors.catatanEvent}>
            <textarea name="catatanEvent" value={form.catatanEvent} onChange={handleChange} rows={3} style={{ ...s.input, ...s.textarea, ...(errors.catatanEvent ? s.inputErr : {}) }} />
          </Field>
        </Section>

        {/* Section: Detail Kampanye */}
        <Section title="Detail Kampanye">
          <div style={s.grid2}>
            <Field label="Nama Event *" error={errors.namaEvent}>
              <input name="namaEvent" value={form.namaEvent} onChange={handleChange} style={{ ...s.input, ...(errors.namaEvent ? s.inputErr : {}) }} />
            </Field>
            <Field label="Tanggal Event *" error={errors.tanggalEvent}>
              <input type="date" name="tanggalEvent" value={form.tanggalEvent} onChange={handleChange} style={{ ...s.input, ...(errors.tanggalEvent ? s.inputErr : {}) }} />
            </Field>
            <Field label="Lokasi Event *" error={errors.lokasiEvent}>
              <input name="lokasiEvent" value={form.lokasiEvent} onChange={handleChange} style={{ ...s.input, ...(errors.lokasiEvent ? s.inputErr : {}) }} />
            </Field>
            <Field label="Penyelenggara *" error={errors.penyelenggara}>
              <input name="penyelenggara" value={form.penyelenggara} onChange={handleChange} style={{ ...s.input, ...(errors.penyelenggara ? s.inputErr : {}) }} />
            </Field>
          </div>
          <Field label="Kebutuhan Sponsorship *" error={errors.kebutuhanSponsorship}>
            <textarea name="kebutuhanSponsorship" value={form.kebutuhanSponsorship} onChange={handleChange} rows={3} style={{ ...s.input, ...s.textarea, ...(errors.kebutuhanSponsorship ? s.inputErr : {}) }} />
          </Field>
          <Field label="Informasi Tambahan">
            <textarea name="informasiTambahan" value={form.informasiTambahan} onChange={handleChange} rows={2} style={{ ...s.input, ...s.textarea }} />
          </Field>
        </Section>

        {/* Section: PIC */}
        <Section title="Penanggung Jawab (PIC)">
          <div style={s.grid2}>
            <Field label="Nama PIC *" error={errors.namaPIC}>
              <input name="namaPIC" value={form.namaPIC} onChange={handleChange} style={{ ...s.input, ...(errors.namaPIC ? s.inputErr : {}) }} />
            </Field>
            <Field label="Kontak PIC *" error={errors.kontakPIC}>
              <input name="kontakPIC" value={form.kontakPIC} onChange={handleChange} placeholder="+62..." style={{ ...s.input, ...(errors.kontakPIC ? s.inputErr : {}) }} />
            </Field>
            <Field label="Email PIC *" error={errors.emailPIC}>
              <input type="email" name="emailPIC" value={form.emailPIC} onChange={handleChange} style={{ ...s.input, ...(errors.emailPIC ? s.inputErr : {}) }} />
            </Field>
          </div>
          <div style={s.grid2}>
            <Field label="Website Acara" error={errors.websiteAcara}>
              <input name="websiteAcara" value={form.websiteAcara} onChange={handleChange} placeholder="https://..." style={{ ...s.input, ...(errors.websiteAcara ? s.inputErr : {}) }} />
            </Field>
            <Field label="Link Proposal" error={errors.linkProposal}>
              <input name="linkProposal" value={form.linkProposal} onChange={handleChange} placeholder="https://..." style={{ ...s.input, ...(errors.linkProposal ? s.inputErr : {}) }} />
            </Field>
          </div>
        </Section>

        {/* Tone */}
        <Section title="Tone Email">
          <div style={s.toneRow}>
            {TONE_OPTIONS.map(t => (
              <label key={t} style={s.toneLabel}>
                <input
                  type="radio" name="toneEmail" value={t}
                  checked={form.toneEmail === t}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--brand-500)' }}
                />
                {t}
              </label>
            ))}
          </div>
        </Section>

        <div style={s.actions}>
          <button type="button" style={s.btnSecondary} onClick={() => navigate(backPath || -1)}>
            ← Kembali
          </button>
          <button type="submit" style={s.btnPrimary}>
            Generate Draft →
          </button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <p style={s.errText}>{error}</p>}
    </div>
  )
}

const s = {
  root: { maxWidth: 860, margin: '0 auto' },
  contextBox: {
    background: 'var(--brand-50)', border: '1px solid var(--brand-200)',
    borderRadius: 10, padding: '12px 18px', marginBottom: 20,
  },
  contextRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  contextLabel: { fontSize: 13, fontWeight: 600, color: 'var(--brand-500)', flexShrink: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: {
    fontSize: 12, padding: '3px 10px', borderRadius: 9999,
    background: 'var(--brand-100)', color: 'var(--brand-600)', fontWeight: 500,
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--brand-500)', fontSize: 13, marginLeft: 'auto', padding: 0,
  },
  form: {},
  section: {
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: 24, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0 20px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 12px', fontSize: 15,
    border: '1px solid var(--border-strong)', borderRadius: 8,
    outline: 'none', background: '#fff', color: 'var(--text-1)',
  },
  inputErr: { borderColor: 'var(--state-danger)' },
  textarea: { resize: 'vertical' },
  errText: { fontSize: 12, color: 'var(--state-danger)', marginTop: 4 },
  toneRow: { display: 'flex', gap: 20 },
  toneLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  actions: { display: 'flex', justifyContent: 'space-between', marginTop: 8 },
  btnPrimary: {
    padding: '10px 28px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  btnSecondary: {
    padding: '10px 20px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 9999, cursor: 'pointer', fontSize: 14,
  },
}
