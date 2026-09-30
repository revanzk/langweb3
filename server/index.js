require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.COMPOSIO_PORT || 5000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000', 'http://localhost:7860'],
}))
app.use(express.json())

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, composioKey: !!process.env.COMPOSIO_API_KEY })
})

// ── Composio: list Gmail accounts ─────────────────────────────────────────────
app.get('/api/composio/accounts', async (req, res) => {
  const { userId = 'default' } = req.query
  try {
    const { getComposioClient } = require('./composio')
    const client = getComposioClient()
    const result = await client.connectedAccounts.list({ entityId: userId })
    const items = result?.items || result?.data || []
    const gmail = items.filter(a =>
      (a.appName || a.appUniqueId || '').toLowerCase().includes('gmail')
    )
    res.json({ ok: true, accounts: gmail })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

// ── Composio: initiate OAuth link ─────────────────────────────────────────────
app.post('/api/composio/link', async (req, res) => {
  const { userId = 'default' } = req.body
  try {
    const { getComposioClient } = require('./composio')
    const client = getComposioClient()
    const result = await client.connectedAccounts.initiate({
      entityId: userId,
      appName: 'gmail',
      authMode: 'OAUTH2',
    })
    res.json({
      ok: true,
      redirect_url: result.redirectUrl,
      connected_account_id: result.connectedAccountId,
    })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

// ── Composio: poll account status ─────────────────────────────────────────────
app.get('/api/composio/accounts/:id', async (req, res) => {
  try {
    const { getComposioClient } = require('./composio')
    const client = getComposioClient()
    const account = await client.connectedAccounts.get({ connectedAccountId: req.params.id })
    res.json({ ok: true, account })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

// ── Send email via Gmail ──────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { connectedAccountId, to, subject, body } = req.body
  if (!connectedAccountId || !to || !subject || !body) {
    return res.json({ ok: false, error: 'Missing required fields: connectedAccountId, to, subject, body' })
  }
  try {
    await new Promise(r => setTimeout(r, 1200))
    const { getComposioClient } = require('./composio')
    const client = getComposioClient()
    const result = await client.actions.execute({
      actionName: 'GMAIL_SEND_EMAIL',
      requestBody: {
        connectedAccountId,
        input: { to, subject, messageBody: body },
      },
    })
    const data = result?.data || result || {}
    const messageId = data.messageId || data.id || null
    const threadId = data.threadId || null
    res.json({ ok: true, messageId, threadId })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

// ── Check replies ─────────────────────────────────────────────────────────────
app.post('/api/check-replies', async (req, res) => {
  const { connectedAccountId, selfEmail, threads = [] } = req.body
  const batch = threads.slice(0, 10)
  const results = []
  try {
    const { getComposioClient } = require('./composio')
    const client = getComposioClient()
    for (const t of batch) {
      await new Promise(r => setTimeout(r, 800))
      try {
        const thread = await client.actions.execute({
          actionName: 'GMAIL_GET_THREAD',
          requestBody: {
            connectedAccountId,
            input: { threadId: t.threadId },
          },
        })
        const messages = thread?.data?.messages || thread?.messages || []
        const sentAt = t.sentAt ? new Date(t.sentAt).getTime() : 0
        const reply = messages.find(m => {
          const headers = m.payload?.headers || []
          const from = headers.find(h => h.name === 'From')?.value || m.from || ''
          const date = m.internalDate ? parseInt(m.internalDate) : 0
          return selfEmail ? !from.includes(selfEmail) && date > sentAt : date > sentAt
        })
        if (reply) {
          const headers = reply.payload?.headers || []
          const from = headers.find(h => h.name === 'From')?.value || reply.from || ''
          const date = headers.find(h => h.name === 'Date')?.value || ''
          results.push({ key: t.key, hasReply: true, from, date, snippet: reply.snippet || '' })
        } else {
          results.push({ key: t.key, hasReply: false })
        }
      } catch {
        results.push({ key: t.key, hasReply: false, error: 'thread fetch failed' })
      }
    }
    res.json({ ok: true, results })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`SponsorFinder server running on :${PORT}`)
})
