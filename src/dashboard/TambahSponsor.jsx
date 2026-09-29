import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { validateManualRow } from '../lib/validators.js'

const EMPTY_ROW = () => ({ name: '', email: '', _id: Math.random() })

export default function TambahSponsor() {
  const { state, allSponsors, addManualSponsors, removeManualSponsor } = useStore()
  const navigate = useNavigate()

  const [rows, setRows] = useState([EMPTY_ROW()])
  const [rowErrors, setRowErrors] = useState({})
  const [added, setAdded] = useState(false)

  const existingNames = allSponsors.map(s => s.sponsor_name)

  function handleRowChange(id, field, value) {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row))
    setRowErrors(e => ({ ...e, [id]: { ...e[id], [field]: null } }))
  }

  function addRow() {
    setRows(r => [...r, EMPTY_ROW()])
  }

  function removeRow(id) {
    if (rows.length === 1) return
    setRows(r => r.filter(row => row._id !== id))
    setRowErrors(e => { const next = { ...e }; delete next[id]; return next })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errors = {}
    let allValid = true
    const currentNames = [...existingNames]

    for (const row of rows) {
      if (!row.name.trim() && !row.email.trim()) continue // skip blank rows
      const { valid, errors: errs } = validateManualRow({ name: row.name, email: row.email }, currentNames)
      if (!valid) {
        errors[row._id] = errs
        allValid = false
      } else {
        currentNames.push(row.name.trim())
      }
    }

    if (!allValid) { setRowErrors(errors); return }

    const validRows = rows.filter(r => r.name.trim())
    const added = addManualSponsors(validRows.map(r => ({ name: r.name.trim(), email: r.email.trim() })))

    if (added.length > 0) {
      setAdded(true)
      setRows([EMPTY_ROW()])
      setRowErrors({})
    }
  }

  return (
    <div style={s.root}>
      <h2 style={s.title}>Tambah Sponsor Manual</h2>
      <p style={s.sub}>Tambahkan perusahaan yang sudah kamu kenali sebagai sponsor. Nama tidak boleh sama dengan hasil AI maupun sponsor yang sudah ditambahkan.</p>

      <form onSubmit={handleSubmit} style={s.formCard} noValidate>
        <div style={s.header}>
          <span style={s.colName}>Nama Perusahaan *</span>
          <span style={s.colEmail}>Email Kontak *</span>
          <span style={s.colAction} />
        </div>

        {rows.map(row => {
          const errs = rowErrors[row._id] || {}
          return (
            <div key={row._id} style={s.row}>
              <div style={s.colName}>
                <input
                  value={row.name}
                  onChange={e => handleRowChange(row._id, 'name', e.target.value)}
                  placeholder="Nama perusahaan"
                  style={{ ...s.input, ...(errs.name ? s.inputErr : {}) }}
                />
                {errs.name && <p style={s.errText}>{errs.name}</p>}
              </div>
              <div style={s.colEmail}>
                <input
                  value={row.email}
                  onChange={e => handleRowChange(row._id, 'email', e.target.value)}
                  placeholder="email@perusahaan.com"
                  style={{ ...s.input, ...(errs.email ? s.inputErr : {}) }}
                />
                {errs.email && <p style={s.errText}>{errs.email}</p>}
              </div>
              <div style={s.colAction}>
                <button type="button" style={s.removeBtn} onClick={() => removeRow(row._id)} disabled={rows.length === 1}>
                  ✕
                </button>
              </div>
            </div>
          )
        })}

        <div style={s.rowActions}>
          <button type="button" style={s.addRowBtn} onClick={addRow}>+ Tambah Baris</button>
          <button type="submit" style={s.btnPrimary}>Tambahkan Sponsor</button>
        </div>
      </form>

      {/* Added list */}
      {state.manualSponsors.length > 0 && (
        <div style={s.addedList}>
          <div style={s.addedHeader}>
            <h3 style={s.addedTitle}>Sponsor Ditambahkan ({state.manualSponsors.length})</h3>
            <button
              style={s.btnPrimary}
              onClick={() => navigate('/app/tambah-sponsor/kampanye')}
              disabled={state.selected.length === 0}
            >
              Lanjut ke Kampanye →
            </button>
          </div>
          {state.manualSponsors.map(sp => (
            <div key={sp.sponsor_name} style={s.addedItem}>
              <div style={s.addedAvatar}>{sp.sponsor_name[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.addedName}>{sp.sponsor_name}</div>
                <div style={s.addedEmail}>{sp.contact_email}</div>
              </div>
              <span style={s.manualBadge}>Manual</span>
              <button style={s.removeBtn} onClick={() => removeManualSponsor(sp.sponsor_name)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {added && state.manualSponsors.length === 0 && (
        <div style={s.successBanner}>✓ Sponsor berhasil ditambahkan.</div>
      )}
    </div>
  )
}

const s = {
  root: { maxWidth: 700, margin: '0 auto' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text-3)', marginBottom: 24 },
  formCard: {
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: 24, marginBottom: 24,
  },
  header: {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 36px',
    gap: 12, marginBottom: 8,
  },
  colName: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  colEmail: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  colAction: {},
  row: {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 36px',
    gap: 12, marginBottom: 8, alignItems: 'start',
  },
  input: {
    width: '100%', padding: '9px 12px', fontSize: 15,
    border: '1px solid var(--border-strong)', borderRadius: 8, outline: 'none',
  },
  inputErr: { borderColor: 'var(--state-danger)' },
  errText: { fontSize: 12, color: 'var(--state-danger)', marginTop: 3 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rowActions: { display: 'flex', justifyContent: 'space-between', marginTop: 12 },
  addRowBtn: {
    background: 'none', border: '1px dashed var(--border-strong)',
    color: 'var(--brand-500)', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
  btnPrimary: {
    padding: '9px 22px', background: 'var(--brand-500)', color: '#fff',
    border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  addedList: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 },
  addedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addedTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-1)' },
  addedItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' },
  addedAvatar: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--brand-100)', color: 'var(--brand-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  addedName: { fontSize: 14, fontWeight: 600, color: 'var(--text-1)' },
  addedEmail: { fontSize: 12, color: 'var(--text-3)' },
  manualBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--brand-100)', color: 'var(--brand-500)' },
  successBanner: {
    background: 'var(--state-success-bg)', color: 'var(--state-success)',
    border: '1px solid #a7e3cb', borderRadius: 8, padding: '10px 16px', fontSize: 13,
  },
}
