import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { validateCampaign } from '../lib/validators.js'
import { TONE_OPTIONS } from '../lib/constants.js'

const EMPTY_ROW = () => ({ name: '', email: '', _id: Math.random() })

export default function TambahSponsor() {
  const { state, dispatch, removeManualSponsor, toggleSelected, selectedSponsors } = useStore()
  const navigate = useNavigate()

  // ── Seksi 1: Input rows ─────────────────────────────────────────────────────
  const [rows, setRows] = useState([EMPTY_ROW()])
  const [rowErrors, setRowErrors] = useState({})
  const [editingId, setEditingId] = useState(null) // sponsor_name being edited
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [editErrors, setEditErrors] = useState({})

  // ── Seksi 3: Kampanye form ──────────────────────────────────────────────────
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
    kontakPIC: cam.kontakPIC || '',
    emailPIC: cam.emailPIC || '',
    websiteAcara: cam.websiteAcara || '',
    linkProposal: cam.linkProposal || '',
    jenisEvent: cam.jenisEvent || '',
    perkiraanPeserta: cam.perkiraanPeserta || '',
    catatanEvent: cam.catatanEvent || '',
  })
  const [campErrors, setCampErrors] = useState({})

  const listRef = useRef(null)
  const kampanyeRef = useRef(null)

  const manualSponsors = state.manualSponsors
  const hasSponsors = manualSponsors.length > 0
  const hasSelection = state.selected.length > 0
  // Only count manual sponsors in selection
  const manualSelected = state.selected.filter(n => manualSponsors.some(s => s.sponsor_name === n))

  // ── Row input handlers ──────────────────────────────────────────────────────
  function handleRowChange(id, field, value) {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row))
    setRowErrors(e => ({ ...e, [id]: { ...e[id], [field]: null } }))
  }

  function addRow() { setRows(r => [...r, EMPTY_ROW()]) }

  function removeRow(id) {
    if (rows.length === 1) { setRows([EMPTY_ROW()]); return }
    setRows(r => r.filter(row => row._id !== id))
    setRowErrors(e => { const n = { ...e }; delete n[id]; return n })
  }

  function handleAddSponsors(e) {
    e.preventDefault()
    const filled = rows.filter(r => r.name.trim() || r.email.trim())
    if (filled.length === 0) return

    const existingNames = manualSponsors.map(s => s.sponsor_name)
    const errors = {}
    let allValid = true
    const seenNames = [...existingNames]

    for (const row of filled) {
      const errs = {}
      if (!row.name.trim() || row.name.trim().length < 3) {
        errs.name = 'Nama sponsor minimal 3 karakter.'
      } else if (seenNames.some(n => n.toLowerCase() === row.name.trim().toLowerCase())) {
        errs.name = 'Nama sponsor sudah ada (duplikat).'
      }
      if (!row.email.trim()) {
        errs.email = 'Email wajib diisi.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        errs.email = 'Format email tidak valid.'
      }
      if (Object.keys(errs).length > 0) {
        errors[row._id] = errs
        allValid = false
      } else {
        seenNames.push(row.name.trim())
      }
    }

    if (!allValid) { setRowErrors(errors); return }

    const newSponsors = filled.map(r => ({
      sponsor_name: r.name.trim(),
      contact_email: r.email.trim(),
      industry: null, location: null,
      relevance_score: null, relevance_level: null,
      reason: [], support_type: [], website: null,
      source: 'manual',
    }))

    dispatch({ type: 'ADD_MANUAL_SPONSORS', sponsors: newSponsors })
    setRows([EMPTY_ROW()])
    setRowErrors({})

    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  // ── Edit handlers ───────────────────────────────────────────────────────────
  function startEdit(sp) {
    setEditingId(sp.sponsor_name)
    setEditForm({ name: sp.sponsor_name, email: sp.contact_email })
    setEditErrors({})
  }

  function saveEdit(originalName) {
    const errs = {}
    if (!editForm.name.trim() || editForm.name.trim().length < 3) errs.name = 'Nama minimal 3 karakter.'
    if (!editForm.email.trim()) errs.email = 'Email wajib diisi.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) errs.email = 'Format email tidak valid.'

    const duplicate = manualSponsors.find(s =>
      s.sponsor_name.toLowerCase() === editForm.name.trim().toLowerCase() &&
      s.sponsor_name !== originalName
    )
    if (duplicate) errs.name = 'Nama sudah ada (duplikat).'

    if (Object.keys(errs).length > 0) { setEditErrors(errs); return }

    // Update in store: remove old, add new
    dispatch({ type: 'REMOVE_MANUAL_SPONSOR', name: originalName })
    dispatch({
      type: 'ADD_MANUAL_SPONSORS', sponsors: [{
        sponsor_name: editForm.name.trim(),
        contact_email: editForm.email.trim(),
        industry: null, location: null,
        relevance_score: null, relevance_level: null,
        reason: [], support_type: [], website: null,
        source: 'manual',
      }]
    })
    setEditingId(null)
  }

  function cancelEdit() { setEditingId(null) }

  // ── Campaign handlers ───────────────────────────────────────────────────────
  function handleCampChange(e) {
    const { name, value } = e.target
    setCampForm(f => ({ ...f, [name]: value }))
    if (campErrors[name]) setCampErrors(err => ({ ...err, [name]: null }))
  }

  function handleGenerateDraft(e) {
    e.preventDefault()
    const { valid, errors } = validateCampaign(campForm)
    if (!valid) { setCampErrors(errors); return }
    dispatch({ type: 'SET_CAMPAIGN', payload: campForm })
    navigate('/app/tambah-sponsor/draft')
  }

  return (
    <div style={s.root}>

      {/* ══ SEKSI 1: Tambah Sponsor ══ */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionNum}>1</div>
          <h2 style={s.sectionTitle}>Tambah Sponsor Manual</h2>
          {hasSponsors && <span style={s.sectionBadge}>✓ {manualSponsors.length} sponsor ditambahkan</span>}
        </div>
        <p style={s.sub}>Tambahkan perusahaan yang sudah kamu kenal. Nama tidak boleh duplikat.</p>

        <form onSubmit={handleAddSponsors} noValidate>
          <div style={s.tableHead}>
            <span style={s.colLabel}>Nama Perusahaan *</span>
            <span style={s.colLabel}>Email Kontak *</span>
            <span />
          </div>

          {rows.map(row => {
            const errs = rowErrors[row._id] || {}
            return (
              <div key={row._id} style={s.tableRow}>
                <div>
                  <input value={row.name}
                    onChange={e => handleRowChange(row._id, 'name', e.target.value)}
                    placeholder="Nama perusahaan"
                    style={{ ...s.input, ...(errs.name ? s.inputErr : {}) }} />
                  {errs.name && <p style={s.errText}>{errs.name}</p>}
                </div>
                <div>
                  <input value={row.email}
                    onChange={e => handleRowChange(row._id, 'email', e.target.value)}
                    placeholder="email@perusahaan.com"
                    style={{ ...s.input, ...(errs.email ? s.inputErr : {}) }} />
                  {errs.email && <p style={s.errText}>{errs.email}</p>}
                </div>
                <button type="button" style={s.iconBtn} onClick={() => removeRow(row._id)} title="Hapus baris">
                  ✕
                </button>
              </div>
            )
          })}

          <div style={s.rowActions}>
            <button type="button" style={s.addRowBtn} onClick={addRow}>+ Tambah Baris</button>
            <button type="submit" style={s.btnPrimary}>Tambahkan →</button>
          </div>
        </form>
      </div>

      {/* ══ SEKSI 2: Daftar & Pilih Sponsor ══ */}
      {hasSponsors && (
        <div style={s.section} ref={listRef}>
          <div style={s.sectionHeader}>
            <div style={s.sectionNum}>2</div>
            <h2 style={s.sectionTitle}>Daftar Sponsor</h2>
            <span style={s.sectionSub}>{manualSelected.length} dipilih</span>
          </div>

          <div style={s.sponsorList}>
            {manualSponsors.map(sp => {
              const isSelected = state.selected.includes(sp.sponsor_name)
              const isEditing = editingId === sp.sponsor_name

              return (
                <div key={sp.sponsor_name}
                  style={{ ...s.sponsorItem, ...(isSelected ? s.sponsorItemSelected : {}) }}>
                  {isEditing ? (
                    /* Edit mode */
                    <div style={s.editRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input value={editForm.name}
                          onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setEditErrors(e => ({ ...e, name: null })) }}
                          style={{ ...s.input, ...(editErrors.name ? s.inputErr : {}), marginBottom: 6 }}
                          placeholder="Nama perusahaan" />
                        {editErrors.name && <p style={s.errText}>{editErrors.name}</p>}
                        <input value={editForm.email}
                          onChange={e => { setEditForm(f => ({ ...f, email: e.target.value })); setEditErrors(e => ({ ...e, email: null })) }}
                          style={{ ...s.input, ...(editErrors.email ? s.inputErr : {}) }}
                          placeholder="email@perusahaan.com" />
                        {editErrors.email && <p style={s.errText}>{editErrors.email}</p>}
                      </div>
                      <div style={s.editActions}>
                        <button style={s.btnSave} onClick={() => saveEdit(sp.sponsor_name)}>✓ Simpan</button>
                        <button style={s.btnCancel} onClick={cancelEdit}>Batal</button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <input type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(sp.sponsor_name)}
                        style={s.checkbox} />
                      <div style={s.avatar}>{sp.sponsor_name[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.sponsorName}>{sp.sponsor_name}</div>
                        <div style={s.sponsorEmail}>{sp.contact_email}</div>
                      </div>
                      <span style={s.manualBadge}>Manual</span>
                      <button style={s.editBtn} onClick={() => startEdit(sp)} title="Edit">✏</button>
                      <button style={s.deleteBtn} onClick={() => removeManualSponsor(sp.sponsor_name)} title="Hapus">🗑</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {manualSelected.length > 0 && (
            <div style={s.selectionBar}>
              <span style={s.selectionText}>✓ {manualSelected.length} sponsor dipilih</span>
              <button style={s.btnPrimary}
                onClick={() => setTimeout(() => kampanyeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)}>
                Isi Detail Kampanye ↓
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ SEKSI 3: Detail Kampanye ══ */}
      {manualSelected.length > 0 && (
        <div style={s.section} ref={kampanyeRef}>
          <div style={s.sectionHeader}>
            <div style={s.sectionNum}>3</div>
            <h2 style={s.sectionTitle}>Detail Kampanye</h2>
          </div>

          <div style={s.chips}>
            {manualSponsors.filter(sp => state.selected.includes(sp.sponsor_name)).map(sp => (
              <span key={sp.sponsor_name} style={s.chip}>{sp.sponsor_name}</span>
            ))}
          </div>

          <form onSubmit={handleGenerateDraft} noValidate>
            <Block title="Konteks Event">
              <div style={s.formGrid}>
                <Field label="Jenis Event *" error={campErrors.jenisEvent}>
                  <input name="jenisEvent" value={campForm.jenisEvent} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.jenisEvent ? s.inputErr : {}) }} />
                </Field>
                <Field label="Perkiraan Peserta *" error={campErrors.perkiraanPeserta}>
                  <input name="perkiraanPeserta" value={campForm.perkiraanPeserta} onChange={handleCampChange}
                    inputMode="numeric"
                    style={{ ...s.input, ...(campErrors.perkiraanPeserta ? s.inputErr : {}) }} />
                </Field>
              </div>
              <Field label="Catatan Event *" error={campErrors.catatanEvent}>
                <textarea name="catatanEvent" value={campForm.catatanEvent} onChange={handleCampChange}
                  rows={3} style={{ ...s.input, ...s.textarea, ...(campErrors.catatanEvent ? s.inputErr : {}) }} />
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
                <Field label="Kontak PIC *" error={campErrors.kontakPIC}>
                  <input name="kontakPIC" value={campForm.kontakPIC} onChange={handleCampChange}
                    placeholder="+62..." style={{ ...s.input, ...(campErrors.kontakPIC ? s.inputErr : {}) }} />
                </Field>
                <Field label="Email PIC *" error={campErrors.emailPIC}>
                  <input type="email" name="emailPIC" value={campForm.emailPIC} onChange={handleCampChange}
                    style={{ ...s.input, ...(campErrors.emailPIC ? s.inputErr : {}) }} />
                </Field>
                <Field label="Website Acara" error={campErrors.websiteAcara}>
                  <input name="websiteAcara" value={campForm.websiteAcara} onChange={handleCampChange}
                    placeholder="https://..." style={{ ...s.input, ...(campErrors.websiteAcara ? s.inputErr : {}) }} />
                </Field>
                <Field label="Link Proposal" error={campErrors.linkProposal}>
                  <input name="linkProposal" value={campForm.linkProposal} onChange={handleCampChange}
                    placeholder="https://..." style={{ ...s.input, ...(campErrors.linkProposal ? s.inputErr : {}) }} />
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
              <button type="submit" style={s.btnPrimaryLg}>
                ✉ Generate Draft Email →
              </button>
            </div>
          </form>
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

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <p style={s.errText}>{error}</p>}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: { maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 },
  section: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 28 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionNum: {
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    background: 'var(--brand-500)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
  },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-1)', margin: 0, flex: 1 },
  sectionBadge: { fontSize: 12, fontWeight: 600, color: 'var(--state-success)', background: 'var(--state-success-bg)', padding: '3px 10px', borderRadius: 9999 },
  sectionSub: { fontSize: 13, color: 'var(--brand-500)', fontWeight: 600 },
  sub: { fontSize: 13, color: 'var(--text-3)', marginBottom: 20 },

  tableHead: {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 36px',
    gap: 12, marginBottom: 6,
  },
  colLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  tableRow: {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 36px',
    gap: 12, marginBottom: 8, alignItems: 'start',
  },
  input: {
    width: '100%', padding: '9px 12px', fontSize: 15,
    border: '1px solid var(--border-strong)', borderRadius: 8, outline: 'none',
    background: '#fff', color: 'var(--text-1)',
  },
  inputErr: { borderColor: 'var(--state-danger)' },
  textarea: { resize: 'vertical' },
  errText: { fontSize: 12, color: 'var(--state-danger)', marginTop: 3 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginTop: 2,
  },
  rowActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  addRowBtn: {
    background: 'none', border: '1px dashed var(--border-strong)',
    color: 'var(--brand-500)', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
  btnPrimary: {
    padding: '9px 22px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  btnPrimaryLg: {
    padding: '12px 32px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 15, fontWeight: 700,
  },

  sponsorList: { display: 'flex', flexDirection: 'column', gap: 8 },
  sponsorItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', background: 'var(--page)',
    border: '1px solid var(--border-subtle)', borderRadius: 10,
  },
  sponsorItemSelected: { borderColor: 'var(--brand-400)', background: '#fff', boxShadow: '0 0 0 2px var(--brand-100)' },
  checkbox: { accentColor: 'var(--brand-500)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' },
  avatar: {
    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
  },
  sponsorName: { fontSize: 14, fontWeight: 600, color: 'var(--text-1)' },
  sponsorEmail: { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  manualBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--brand-100)', color: 'var(--brand-500)', flexShrink: 0 },
  editBtn: {
    background: 'none', border: '1px solid var(--border-strong)', borderRadius: 7,
    padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', flexShrink: 0,
  },
  deleteBtn: {
    background: 'none', border: '1px solid var(--border-strong)', borderRadius: 7,
    padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--state-danger)', flexShrink: 0,
  },

  editRow: { display: 'flex', gap: 12, width: '100%', alignItems: 'flex-start' },
  editActions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 },
  btnSave: {
    padding: '6px 14px', background: 'var(--state-success)', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
  },
  btnCancel: {
    padding: '6px 14px', background: 'var(--surface-muted)', color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
  },

  selectionBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    marginTop: 16, padding: '12px 16px',
    background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 10,
  },
  selectionText: { fontSize: 14, fontWeight: 600, color: 'var(--brand-600)' },

  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  chip: { fontSize: 12, padding: '4px 12px', borderRadius: 9999, background: 'var(--brand-100)', color: 'var(--brand-600)', fontWeight: 500 },

  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 },
  formGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0 20px' },
  toneRow: { display: 'flex', gap: 20 },
  toneLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  campActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
}

const bc = {
  block: { background: 'var(--page)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 20, marginBottom: 12 },
  title: { fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' },
}
