import { useState, useEffect } from 'react'
import { useStore } from '../store/store.jsx'

export default function Setting() {
  const { state, resetFlow, resetAll } = useStore()
  const [langflowHealth, setLangflowHealth] = useState(null)
  const [backendHealth, setBackendHealth] = useState(null)
  const [debug, setDebug] = useState(() => {
    try {
      return localStorage.getItem('sq_debug') || localStorage.getItem('sf_debug') || 'env'
    } catch {
      return 'env'
    }
  })

  useEffect(() => {
    const LANGFLOW = import.meta.env.VITE_LANGFLOW_URL || 'http://localhost:7860'
    const BACKEND = import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'

    fetch(`${LANGFLOW}/health`).then(r => r.json()).then(d => setLangflowHealth(d)).catch(() => setLangflowHealth(null))
    fetch(`${BACKEND}/api/health`).then(r => r.json()).then(d => setBackendHealth(d)).catch(() => setBackendHealth(null))
  }, [])

  function handleDebugChange(e) {
    const val = e.target.value
    setDebug(val)
    try {
      localStorage.setItem('sq_debug', val)
      localStorage.removeItem('sf_debug')
    } catch { /* ignore */ }
  }

  return (
    <div style={s.root}>
      <h2 style={s.title}>Pengaturan</h2>

      {/* Service statuses */}
      <Section title="Status Layanan">
        <StatusRow label="Langflow (:7860)" status={langflowHealth?.status === 'ok' ? 'ok' : langflowHealth ? 'error' : 'unknown'} />
        <StatusRow label="Backend (:5000)" status={backendHealth?.ok ? 'ok' : backendHealth ? 'error' : 'unknown'} detail={backendHealth ? `Composio key: ${backendHealth.composioKey ? '✓' : '✗'}` : null} />
      </Section>

      {/* Debug */}
      <Section title="Debug Panel">
        <div style={s.radioGroup}>
          {[['env', 'Dari env (VITE_DEBUG_LANGFLOW)'], ['always', 'Selalu tampilkan'], ['never', 'Sembunyikan']].map(([val, label]) => (
            <label key={val} style={s.radioLabel}>
              <input type="radio" name="debug" value={val} checked={debug === val} onChange={handleDebugChange} style={{ accentColor: 'var(--brand-500)' }} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {/* Limits */}
      <Section title="Batas Sistem">
        <div style={s.limitRow}><span>Maks. sponsor per pencarian</span><strong>5</strong></div>
        <div style={s.limitRow}><span>Maks. email per sesi</span><strong>10</strong></div>
      </Section>

      {/* Reset */}
      <Section title="Reset">
        <div style={s.resetRow}>
          <div>
            <p style={s.resetLabel}>Reset Alur</p>
            <p style={s.resetSub}>Hapus pencarian, hasil, kampanye, draft. Riwayat & koneksi tetap.</p>
          </div>
          <button style={s.btnDanger} onClick={() => {
            if (window.confirm('Reset alur? Riwayat tidak akan terhapus.')) resetFlow()
          }}>
            Reset Alur
          </button>
        </div>
        <div style={{ ...s.resetRow, marginTop: 12 }}>
          <div>
            <p style={s.resetLabel}>Reset Semua</p>
            <p style={s.resetSub}>Hapus SEMUA data termasuk riwayat. Tidak dapat dibatalkan.</p>
          </div>
          <button style={s.btnDanger} onClick={() => {
            if (window.confirm('Hapus SEMUA data? Tindakan ini tidak dapat dibatalkan.')) resetAll()
          }}>
            Reset Semua
          </button>
        </div>
      </Section>
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

function StatusRow({ label, status, detail }) {
  const config = {
    ok: { color: 'var(--state-success)', icon: '✅' },
    error: { color: 'var(--state-danger)', icon: '❌' },
    unknown: { color: 'var(--text-3)', icon: '⏳' },
  }
  const cfg = config[status]
  return (
    <div style={s.statusRow}>
      <span style={s.statusIcon}>{cfg.icon}</span>
      <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{label}</span>
      <span style={{ fontSize: 12, color: cfg.color, fontWeight: 500, marginLeft: 'auto' }}>
        {status === 'ok' ? 'Online' : status === 'error' ? 'Error' : 'Memeriksa...'}
      </span>
      {detail && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{detail}</span>}
    </div>
  )
}

const s = {
  root: { maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  section: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' },
  statusIcon: { fontSize: 16 },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' },
  limitRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-2)' },
  resetRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  resetLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 },
  resetSub: { fontSize: 12, color: 'var(--text-3)' },
  btnDanger: {
    padding: '8px 18px', background: 'var(--state-danger-bg)', color: 'var(--state-danger)',
    border: '1px solid #f5c6c5', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0,
  },
}
