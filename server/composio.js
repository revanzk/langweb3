// Composio v3 client (@composio/core, ESM) dipakai dari server CommonJS via dynamic import.
// Per-user OAuth: tiap browser punya userId sendiri (UUID di localStorage, lihat store.jsx),
// backend hanya meneruskan userId ke SDK. Jangan hardcode 'default' di sini.

let _ComposioClass = null
let _client = null

async function getComposioClient() {
  if (!_client) {
    if (!_ComposioClass) {
      let mod
      try {
        mod = await import('@composio/core')
      } catch (err) {
        throw new Error(
          'Paket `@composio/core` tidak ditemukan. Jalankan `npm --prefix server install`. ' +
          `Detail: ${err.message}`
        )
      }
      _ComposioClass = mod.Composio
    }
    if (typeof _ComposioClass !== 'function') {
      throw new Error('Paket `@composio/core` rusak: export `Composio` tidak ditemukan.')
    }
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY belum diisi di .env (server-only, tanpa prefix VITE_).')
    }
    _client = new _ComposioClass({ apiKey: process.env.COMPOSIO_API_KEY })
  }
  return _client
}

// Auth config Gmail managed-OAuth untuk project ini (ditemukan dari akun aktif).
// Override via env bila dashboard memberi ID lain.
function getGmailAuthConfigId() {
  return process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID || 'ac_Im0mILtarfgb'
}

// Pin versi toolkit Gmail (v3.1 wajib versi eksplisit untuk tools.execute).
function getGmailVersion() {
  return process.env.COMPOSIO_GMAIL_VERSION || '20260915_00'
}

function normalizeUserId(u) {
  const s = u == null ? '' : String(u).trim()
  return s || 'default'
}

module.exports = { getComposioClient, getGmailAuthConfigId, getGmailVersion, normalizeUserId }
