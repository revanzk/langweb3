require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.COMPOSIO_PORT || 5000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000', 'http://localhost:7860'],
}))
app.use(express.json())

function formatComposioError(err) {
  return err?.message || String(err)
}

function accountEmailOf(acc) {
  return acc?.meta?.email || acc?.email || acc?.data?.displayName || null
}

// Bentuk yang dipakai frontend (store.jsx):
// refreshComposio baca accounts[0].id||connectedAccountId + meta.email||email,
// poll baca account.status==='ACTIVE' + meta.email.
function toFrontendAccount(raw) {
  if (!raw) return raw
  const email = raw?.data?.displayName || raw?.email || raw?.meta?.email || null
  return {
    ...raw,
    id: raw.id || raw.connectedAccountId,
    connectedAccountId: raw.connectedAccountId || raw.id,
    appName: raw.appName || raw?.toolkit?.slug || 'gmail',
    appUniqueId: raw.appUniqueId || raw?.toolkit?.slug || 'gmail',
    email,
    meta: { ...(raw.meta || {}), email },
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    composioKey: !!process.env.COMPOSIO_API_KEY,
    gmailAuthConfig: !!(process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID || 'ac_Im0mILtarfgb'),
  })
})

// ── Composio: list Gmail accounts (per-user) ──────────────────────────────────
app.get('/api/composio/accounts', async (req, res) => {
  const { getComposioClient, normalizeUserId } = require('./composio')
  const userId = normalizeUserId(req.query.userId)
  try {
    const client = await getComposioClient()
    const result = await client.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['gmail'],
    })
    const items = result?.items || result?.data || []
    const gmail = items
      .filter(a => ((a?.toolkit?.slug || a.appName || a.appUniqueId || '').toLowerCase().includes('gmail')))
      .map(toFrontendAccount)
      .sort((a, b) => (b.status === 'ACTIVE') - (a.status === 'ACTIVE'))
    res.json({ ok: true, accounts: gmail })
  } catch (err) {
    res.json({ ok: false, error: formatComposioError(err) })
  }
})

// ── Composio: initiate OAuth link (per-user, hosted Connect Link) ─────────────
// Wajib authConfigId (managed Gmail). Tanpa callbackUrl dulu — frontend polling.
app.post('/api/composio/link', async (req, res) => {
  const { getComposioClient, getGmailAuthConfigId, normalizeUserId } = require('./composio')
  const userId = normalizeUserId(req.body.userId)
  const { callbackUrl } = req.body || {}
  try {
    const authConfigId = getGmailAuthConfigId()
    if (!authConfigId) {
      return res.json({ ok: false, error: 'COMPOSIO_GMAIL_AUTH_CONFIG_ID belum diisi di .env (Dashboard → Auth Configs → Gmail).' })
    }
    const client = await getComposioClient()
    const result = await client.connectedAccounts.link(
      userId,
      authConfigId,
      callbackUrl ? { callbackUrl } : undefined,
    )
    res.json({
      ok: true,
      redirect_url: result.redirectUrl,
      connected_account_id: result.id || result.connectedAccountId,
    })
  } catch (err) {
    res.json({ ok: false, error: formatComposioError(err) })
  }
})

// ── Composio: poll account status ─────────────────────────────────────────────
app.get('/api/composio/accounts/:id', async (req, res) => {
  try {
    const { getComposioClient } = require('./composio')
    const client = await getComposioClient()
    const raw = await client.connectedAccounts.get(req.params.id)
    res.json({ ok: true, account: toFrontendAccount(raw) })
  } catch (err) {
    res.json({ ok: false, error: formatComposioError(err) })
  }
})

// ── Send email via Gmail (per-user) ───────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { getComposioClient, getGmailVersion, normalizeUserId } = require('./composio')
  const userId = normalizeUserId(req.body.userId)
  const { connectedAccountId, to, subject, body } = req.body
  if (!connectedAccountId || !to || !subject || !body) {
    return res.json({ ok: false, error: 'Missing required fields: connectedAccountId, to, subject, body' })
  }
  try {
    await new Promise(r => setTimeout(r, 1200))
    const client = await getComposioClient()
    const result = await client.tools.execute('GMAIL_SEND_EMAIL', {
      userId,
      connectedAccountId,
      version: getGmailVersion(),
      arguments: { recipient_email: to, subject, body },
    })
    if (result && result.successful === false) {
      return res.json({ ok: false, error: result.error || 'GMAIL_SEND_EMAIL gagal' })
    }
    const data = result?.data || {}
    res.json({ ok: true, messageId: data.id || data.messageId || null, threadId: data.threadId || null })
  } catch (err) {
    res.json({ ok: false, error: formatComposioError(err) })
  }
})

// ── Check replies (per-user) ──────────────────────────────────────────────────
app.post('/api/check-replies', async (req, res) => {
  const { getComposioClient, getGmailVersion, normalizeUserId } = require('./composio')
  const userId = normalizeUserId(req.body.userId)
  const { connectedAccountId, selfEmail, threads = [] } = req.body
  const batch = threads.slice(0, 10)
  const results = []
  try {
    const client = await getComposioClient()
    for (const t of batch) {
      await new Promise(r => setTimeout(r, 800))
      try {
        const fetched = await client.tools.execute('GMAIL_FETCH_MESSAGE_BY_THREAD_ID', {
          userId,
          connectedAccountId,
          version: getGmailVersion(),
          arguments: { thread_id: t.threadId },
        })
        const messages = fetched?.data?.messages || []
        const sentAt = t.sentAt ? new Date(t.sentAt).getTime() : 0
        const reply = messages.find(m => {
          const from = m.sender || m.from || ''
          const date = m.messageTimestamp ? new Date(m.messageTimestamp).getTime()
            : (m.internalDate ? parseInt(m.internalDate) : 0)
          return selfEmail ? !from.includes(selfEmail) && date > sentAt : date > sentAt
        })
        if (reply) {
          const text = reply.messageText || reply.snippet || ''
          results.push({
            key: t.key,
            hasReply: true,
            from: reply.sender || reply.from || '',
            date: reply.messageTimestamp || '',
            snippet: String(text).slice(0, 200),
          })
        } else {
          results.push({ key: t.key, hasReply: false })
        }
      } catch {
        results.push({ key: t.key, hasReply: false, error: 'thread fetch failed' })
      }
    }
    res.json({ ok: true, results })
  } catch (err) {
    res.json({ ok: false, error: formatComposioError(err) })
  }
})

app.listen(PORT, () => {
  console.log(`SponsorFinder server running on :${PORT}`)
})
