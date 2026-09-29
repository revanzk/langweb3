// ── Search form validators ────────────────────────────────────────────────────
export function validateSearch({ jenisEvent, perkiraanPeserta, catatanEvent }) {
  const errors = {}

  if (!jenisEvent || jenisEvent.trim().length < 3) {
    errors.jenisEvent = 'Jenis event wajib diisi, minimal 3 karakter.'
  }

  const peserta = String(perkiraanPeserta || '').trim()
  if (!peserta || !/^\d+$/.test(peserta) || parseInt(peserta, 10) < 10) {
    errors.perkiraanPeserta = 'Perkiraan peserta wajib diisi, angka minimal 10.'
  }

  const catatan = String(catatanEvent || '').trim()
  if (!catatan || catatan.length < 30 || catatan.length > 2000) {
    errors.catatanEvent = 'Catatan event wajib diisi, 30–2000 karakter.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Campaign form validators ──────────────────────────────────────────────────
export function validateCampaign(fields) {
  const errors = {}
  const req = (key, label) => {
    if (!fields[key] || !String(fields[key]).trim()) errors[key] = `${label} wajib diisi.`
  }

  req('namaEvent', 'Nama event')
  req('lokasiEvent', 'Lokasi event')
  req('penyelenggara', 'Penyelenggara')
  req('kebutuhanSponsorship', 'Kebutuhan sponsorship')

  if (!fields.tanggalEvent || !String(fields.tanggalEvent).trim()) {
    errors.tanggalEvent = 'Tanggal event wajib diisi.'
  } else {
    const d = new Date(fields.tanggalEvent)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (isNaN(d.getTime()) || d < today) {
      errors.tanggalEvent = 'Tanggal event tidak boleh di masa lalu.'
    }
  }

  req('namaPIC', 'Nama PIC')
  req('kontakPIC', 'Kontak PIC')

  if (!fields.emailPIC || !String(fields.emailPIC).trim()) {
    errors.emailPIC = 'Email PIC wajib diisi.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.emailPIC)) {
    errors.emailPIC = 'Format email PIC tidak valid.'
  }

  if (fields.websiteAcara && fields.websiteAcara.trim()) {
    if (!/^https?:\/\//i.test(fields.websiteAcara.trim())) {
      errors.websiteAcara = 'Website acara harus dimulai dengan http:// atau https://'
    }
  }

  if (fields.linkProposal && fields.linkProposal.trim()) {
    if (!/^https?:\/\//i.test(fields.linkProposal.trim())) {
      errors.linkProposal = 'Link proposal harus dimulai dengan http:// atau https://'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Manual sponsor row validators ─────────────────────────────────────────────
export function validateManualRow(row, existingNames = []) {
  const errors = {}

  if (!row.name || row.name.trim().length < 3) {
    errors.name = 'Nama sponsor minimal 3 karakter.'
  } else {
    const lower = row.name.trim().toLowerCase()
    if (existingNames.some(n => n.toLowerCase() === lower)) {
      errors.name = 'Nama sponsor sudah ada (duplikat).'
    }
  }

  if (!row.email || row.email.trim() === '') {
    errors.email = 'Email sponsor wajib diisi.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errors.email = 'Format email tidak valid.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
