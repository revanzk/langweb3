import { useState } from 'react'

export default function DebugPanel({ data, onClose }) {
  const [copied, setCopied] = useState(false)

  function copyRaw() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!data) return null

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>🐛 Debug Panel</span>
        <div style={s.headerRight}>
          <button style={s.copyBtn} onClick={copyRaw}>{copied ? '✓ Disalin' : 'Salin Raw'}</button>
          {onClose && <button style={s.closeBtn} onClick={onClose}>✕</button>}
        </div>
      </div>

      <div style={s.rows}>
        <Row label="Endpoint" value={data.endpoint} mono />
        <Row label="Flow ID" value={data.flowId} mono />
        <Row label="Durasi" value={data.ms ? `${data.ms}ms` : '—'} />
        <Row label="HTTP Status" value={data.httpStatus ?? '—'} />
        <Row label="Kandidat" value={`${data.candidates?.length ?? 0} output(s)`} />
        <Row label="Dipilih" value={data.chosenIndex >= 0 ? `Index ${data.chosenIndex}` : 'Tidak ada'} />
      </div>

      {Array.isArray(data.counts) && data.counts.length > 0 && (
        <div style={s.block}>
          <p style={s.blockLabel}>Sebaran per kandidat:</p>
          {data.counts.map((c, i) => (
            <div key={i} style={s.row}>
              <span style={s.rowLabel}>Kandidat {c.index + 1}</span>
              <span style={s.rowVal}>
                {c.valid} valid{c.dropped > 0 ? `, ${c.dropped} dibuang` : ''}{c.parseError ? ', gagal parse' : ''}
                {c.levels && Object.keys(c.levels).length > 0
                  ? ` (${Object.entries(c.levels).map(([lv, n]) => `${n} ${lv}`).join(' + ')})`
                  : ''}
                {c.index === data.chosenIndex ? ' ✓ dipilih' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.input && (
        <div style={s.block}>
          <p style={s.blockLabel}>Input Dikirim:</p>
          <pre style={s.pre}>{data.input}</pre>
        </div>
      )}

      {data.candidates?.length > 0 && data.candidates.map((c, i) => (
        <div key={i} style={s.block}>
          <p style={s.blockLabel}>Kandidat {i + 1} {i === data.chosenIndex ? '✓ (dipilih)' : ''}:</p>
          <pre style={s.pre}>{c}</pre>
        </div>
      ))}

      {data.raw && (
        <div style={s.block}>
          <p style={s.blockLabel}>Raw Response ({JSON.stringify(data.raw).length} chars):</p>
          <pre style={{ ...s.pre, maxHeight: 200, overflow: 'auto' }}>
            {typeof data.raw === 'string' ? data.raw : JSON.stringify(data.raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowVal, ...(mono ? s.mono : {}) }}>{value}</span>
    </div>
  )
}

const s = {
  panel: {
    background: '#1e1e2e', border: '1px solid #3d3d5c',
    borderRadius: 10, padding: 16, marginTop: 12,
    color: '#cdd6f4', fontSize: 13,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontWeight: 700, color: '#cba6f7' },
  headerRight: { display: 'flex', gap: 8 },
  copyBtn: {
    padding: '4px 10px', background: '#313244', color: '#cdd6f4',
    border: '1px solid #3d3d5c', borderRadius: 6, cursor: 'pointer', fontSize: 12,
  },
  closeBtn: {
    padding: '4px 8px', background: 'transparent', color: '#6c7086',
    border: 'none', cursor: 'pointer', fontSize: 14,
  },
  rows: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
  row: { display: 'flex', gap: 12, fontSize: 12 },
  rowLabel: { color: '#6c7086', width: 100, flexShrink: 0 },
  rowVal: { color: '#cdd6f4', overflowWrap: 'anywhere' },
  mono: { fontFamily: 'monospace', color: '#a6e3a1' },
  block: { marginTop: 10 },
  blockLabel: { fontSize: 11, color: '#6c7086', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' },
  pre: {
    background: '#181825', borderRadius: 6, padding: '8px 12px',
    fontSize: 11, color: '#cdd6f4', whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere', fontFamily: 'monospace', lineHeight: 1.6,
  },
}
