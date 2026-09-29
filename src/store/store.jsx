import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { validateSearch } from '../lib/validators.js'
import { runFlow, extractCandidates } from '../lib/langflow.js'
import {
  parseSearchOutput, parseDraftOutput, mergeDraft,
  buildSearchInput, buildDraftInput,
} from '../lib/merge.js'
import { FLOW_SEARCH, FLOW_DRAFT, DELIVERY, RELATIONSHIP, MAX_EMAILS } from '../lib/constants.js'

// ── Initial state ─────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  // Search
  search: { jenisEvent: '', perkiraanPeserta: '', catatanEvent: '' },
  results: [],
  summary: '',
  manualSponsors: [],
  selected: [],        // sponsor_name strings
  // Search meta
  searchPhase: 'idle', // idle | searching | waiting | done | error
  searchError: null,
  lastRun: null,       // debug info
  // Campaign
  campaign: {
    namaEvent: '', tanggalEvent: '', lokasiEvent: '', penyelenggara: '',
    kebutuhanSponsorship: '', toneEmail: 'Formal', informasiTambahan: '',
    namaPIC: '', kontakPIC: '', emailPIC: '',
    websiteAcara: '', linkProposal: '', deadlineRespons: '',
    // shared from search (prefilled)
    jenisEvent: '', perkiraanPeserta: '', catatanEvent: '',
  },
  // Drafts
  template: { subject: '', body: '' },
  drafts: [],          // [{ sponsor_name, to, subject, body, edited, leftovers[] }]
  draftPhase: 'idle',  // idle | generating | done | error
  draftError: null,
  // Composio
  composio: { status: 'idle', accountId: null, accountEmail: null, linkUrl: null, error: null },
  // Send queue
  queue: [],           // [{ key, sponsor_name, to, subject, body, status, error, messageId, threadId, sentAt }]
  sending: false,
  queueNote: null,
  // Replies
  checkingReplies: false,
  // History
  history: [],         // [{ id, sponsor, event, draft, delivery, relationship, updated, at, threadId, reply* }]
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: { ...state.search, ...action.payload } }

    case 'SET_SEARCH_PHASE':
      return { ...state, searchPhase: action.payload, searchError: action.error || null }

    case 'SET_RESULTS':
      return {
        ...state,
        results: action.results,
        summary: action.summary || '',
        selected: [],
        searchPhase: 'done',
        lastRun: action.lastRun || null,
      }

    case 'TOGGLE_SELECTED': {
      const name = action.name
      const isSelected = state.selected.includes(name)
      return {
        ...state,
        selected: isSelected
          ? state.selected.filter(n => n !== name)
          : [...state.selected, name],
      }
    }

    case 'SET_CAMPAIGN':
      return { ...state, campaign: { ...state.campaign, ...action.payload } }

    case 'SET_DRAFT_PHASE':
      return { ...state, draftPhase: action.payload, draftError: action.error || null }

    case 'SET_DRAFTS':
      return { ...state, drafts: action.drafts, draftPhase: 'done' }

    case 'UPDATE_DRAFT': {
      const drafts = state.drafts.map(d =>
        d.sponsor_name === action.sponsor_name
          ? { ...d, ...action.payload, edited: true }
          : d
      )
      return { ...state, drafts }
    }

    case 'ADD_MANUAL_SPONSORS': {
      const newOnes = action.sponsors
      const updated = [...state.manualSponsors, ...newOnes]
      const newNames = newOnes.map(s => s.sponsor_name)
      return {
        ...state,
        manualSponsors: updated,
        selected: [...state.selected, ...newNames],
      }
    }

    case 'REMOVE_MANUAL_SPONSOR': {
      const name = action.name
      return {
        ...state,
        manualSponsors: state.manualSponsors.filter(s => s.sponsor_name !== name),
        selected: state.selected.filter(n => n !== name),
      }
    }

    case 'SET_COMPOSIO':
      return { ...state, composio: { ...state.composio, ...action.payload } }

    case 'SET_QUEUE':
      return { ...state, queue: action.queue }

    case 'UPDATE_QUEUE_ITEM': {
      const queue = state.queue.map(item =>
        item.key === action.key ? { ...item, ...action.payload } : item
      )
      return { ...state, queue }
    }

    case 'SET_SENDING':
      return { ...state, sending: action.payload, queueNote: action.note || null }

    case 'SET_CHECKING_REPLIES':
      return { ...state, checkingReplies: action.payload }

    case 'ADD_HISTORY':
      return { ...state, history: [action.entry, ...state.history] }

    case 'UPDATE_HISTORY': {
      const history = state.history.map(h =>
        h.id === action.id ? { ...h, ...action.payload, updated: Date.now() } : h
      )
      return { ...state, history }
    }

    case 'SET_RELATIONSHIP': {
      const history = state.history.map(h =>
        h.id === action.id ? { ...h, relationship: action.relationship, updated: Date.now() } : h
      )
      return { ...state, history }
    }

    case 'SET_LAST_RUN':
      return { ...state, lastRun: action.payload }

    case 'RESET_FLOW':
      return {
        ...INITIAL_STATE,
        history: state.history,
        composio: state.composio,
      }

    case 'RESET_ALL':
      return INITIAL_STATE

    case 'LOAD':
      return action.state

    default:
      return state
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'sf_state_v1'
const MAX_RAW_BYTES = 45 * 1024

function stripRaw(state) {
  if (!state.lastRun) return state
  const str = JSON.stringify(state.lastRun)
  if (str.length > MAX_RAW_BYTES) {
    return { ...state, lastRun: { ...state.lastRun, raw: '[truncated]' } }
  }
  return state
}

function normalizeTransients(state) {
  return {
    ...state,
    sending: false,
    searchPhase: state.searchPhase === 'searching' || state.searchPhase === 'waiting'
      ? 'idle' : state.searchPhase,
    draftPhase: state.draftPhase === 'generating' ? 'idle' : state.draftPhase,
    composio: state.composio?.status === 'linking'
      ? { ...state.composio, status: 'disconnected' }
      : state.composio,
    queue: (state.queue || []).map(q =>
      q.status === 'Sending' ? { ...q, status: 'Queued' } : q
    ),
  }
}

function saveState(state) {
  try {
    const clean = stripRaw(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), state: clean }))
  } catch { /* quota exceeded — ignore */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { state } = JSON.parse(raw)
    return normalizeTransients({ ...INITIAL_STATE, ...state })
  } catch {
    return null
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const saved = loadState()
  const [state, dispatch] = useReducer(reducer, saved || INITIAL_STATE)
  const debounceRef = useRef(null)

  // Debounced save
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveState(state), 500)
    return () => clearTimeout(debounceRef.current)
  }, [state])

  // ── Derived values ──────────────────────────────────────────────────────────
  const allSponsors = [...state.results, ...state.manualSponsors]
  const selectedSponsors = allSponsors.filter(s => state.selected.includes(s.sponsor_name))

  const outcomeCounts = {
    terkirim: state.history.filter(h => h.delivery === DELIVERY.SENT).length,
    dibalas: state.history.filter(h => h.relationship === RELATIONSHIP.DIBALAS).length,
    diterima: state.history.filter(h => h.relationship === RELATIONSHIP.DITERIMA).length,
    ditolak: state.history.filter(h => h.relationship === RELATIONSHIP.DITOLAK).length,
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function runSearch() {
    const { valid, errors } = validateSearch(state.search)
    if (!valid) return { valid: false, errors }

    dispatch({ type: 'SET_SEARCH_PHASE', payload: 'searching' })
    const phaseTimer = setTimeout(() => dispatch({ type: 'SET_SEARCH_PHASE', payload: 'waiting' }), 4000)

    const inputValue = buildSearchInput(state.search)
    const startMs = Date.now()
    const result = await runFlow(FLOW_SEARCH, inputValue)
    clearTimeout(phaseTimer)

    const ms = Date.now() - startMs
    const debug = {
      endpoint: `${import.meta.env.VITE_LANGFLOW_URL}/api/v1/run/${FLOW_SEARCH}`,
      flowId: FLOW_SEARCH,
      input: inputValue,
      ms,
      httpStatus: result.httpStatus,
      candidates: [],
      chosenIndex: -1,
      raw: result.data ? JSON.stringify(result.data) : result.error,
    }

    if (!result.ok) {
      dispatch({ type: 'SET_SEARCH_PHASE', payload: 'error', error: result.error })
      dispatch({ type: 'SET_LAST_RUN', payload: debug })
      return { valid: true, ok: false, error: result.error }
    }

    const candidates = extractCandidates(result.data)
    debug.candidates = candidates
    const { sponsors, summary, chosenIndex } = parseSearchOutput(candidates)
    debug.chosenIndex = chosenIndex

    if (sponsors.length === 0) {
      const err = 'Tidak ada hasil sponsor yang valid dari AI.'
      dispatch({ type: 'SET_SEARCH_PHASE', payload: 'error', error: err })
      dispatch({ type: 'SET_LAST_RUN', payload: debug })
      return { valid: true, ok: false, error: err }
    }

    dispatch({ type: 'SET_RESULTS', results: sponsors, summary, lastRun: debug })
    return { valid: true, ok: true }
  }

  async function runDraft() {
    if (selectedSponsors.length === 0) return

    dispatch({ type: 'SET_DRAFT_PHASE', payload: 'generating' })

    // Build one AI call for the batch using first sponsor context (or iterate)
    // Per spec: 1 AI call + merge per sponsor
    const drafts = []
    for (const sponsor of selectedSponsors) {
      const inputValue = buildDraftInput(state.campaign, sponsor)
      const result = await runFlow(FLOW_DRAFT, inputValue)

      if (!result.ok) {
        dispatch({ type: 'SET_DRAFT_PHASE', payload: 'error', error: result.error })
        return
      }

      const candidates = extractCandidates(result.data)
      const rawText = candidates[0] || ''
      const { subject, body } = parseDraftOutput(rawText)
      const { merged, leftovers } = mergeDraft(body, state.campaign, sponsor)

      drafts.push({
        sponsor_name: sponsor.sponsor_name,
        to: sponsor.contact_email || '',
        subject,
        body: merged,
        edited: false,
        leftovers,
      })
    }

    dispatch({ type: 'SET_DRAFTS', drafts })
  }

  async function regenerateDraft(sponsorName) {
    const sponsor = selectedSponsors.find(s => s.sponsor_name === sponsorName)
    if (!sponsor) return

    const inputValue = buildDraftInput(state.campaign, sponsor)
    const result = await runFlow(FLOW_DRAFT, inputValue)
    if (!result.ok) return

    const candidates = extractCandidates(result.data)
    const rawText = candidates[0] || ''
    const { subject, body } = parseDraftOutput(rawText)
    const { merged, leftovers } = mergeDraft(body, state.campaign, sponsor)

    dispatch({
      type: 'UPDATE_DRAFT',
      sponsor_name: sponsorName,
      payload: { subject, body: merged, leftovers, edited: false },
    })
  }

  function remergeDrafts() {
    const drafts = state.drafts.map(d => {
      if (d.edited) return d
      const sponsor = selectedSponsors.find(s => s.sponsor_name === d.sponsor_name)
      if (!sponsor) return d
      const { merged, leftovers } = mergeDraft(d.body, state.campaign, sponsor)
      return { ...d, body: merged, leftovers }
    })
    dispatch({ type: 'SET_DRAFTS', drafts })
  }

  function updateDraft(sponsorName, payload) {
    dispatch({ type: 'UPDATE_DRAFT', sponsor_name: sponsorName, payload })
  }

  function toggleSelected(name) {
    dispatch({ type: 'TOGGLE_SELECTED', name })
  }

  function addManualSponsors(rows) {
    const existing = allSponsors.map(s => s.sponsor_name)
    const sponsors = rows
      .filter(r => r.name && r.email)
      .filter(r => !existing.some(n => n.toLowerCase() === r.name.trim().toLowerCase()))
      .map(r => ({
        sponsor_name: r.name.trim(),
        contact_email: r.email.trim(),
        industry: null,
        location: null,
        relevance_score: null,
        relevance_level: null,
        reason: [],
        support_type: [],
        website: null,
        source: 'manual',
      }))
    if (sponsors.length > 0) {
      dispatch({ type: 'ADD_MANUAL_SPONSORS', sponsors })
    }
    return sponsors
  }

  function removeManualSponsor(name) {
    dispatch({ type: 'REMOVE_MANUAL_SPONSOR', name })
  }

  function setRelationship(id, relationship) {
    dispatch({ type: 'SET_RELATIONSHIP', id, relationship })
  }

  function enqueueDrafts() {
    const eligible = state.drafts.filter(d => {
      return d.to && d.to.trim() && (!d.leftovers || d.leftovers.length === 0)
    })
    const current = state.queue.filter(q => q.status !== DELIVERY.SENT).length
    const available = MAX_EMAILS - current
    if (available <= 0) return { ok: false, error: `Batas ${MAX_EMAILS} email per sesi tercapai.` }

    const toEnqueue = eligible.slice(0, available)
    const queue = toEnqueue.map(d => ({
      key: newId(),
      sponsor_name: d.sponsor_name,
      to: d.to,
      subject: d.subject,
      body: d.body,
      status: DELIVERY.QUEUED,
      error: null,
      messageId: null,
      threadId: null,
      sentAt: null,
    }))
    dispatch({ type: 'SET_QUEUE', queue: [...state.queue, ...queue] })
    return { ok: true, count: toEnqueue.length }
  }

  async function sendQueue() {
    if (state.sending) return
    if (!state.composio.accountId) return

    const pending = state.queue.filter(q => q.status === DELIVERY.QUEUED)
    if (pending.length === 0) return

    // Warn if would exceed cap (already gated in enqueueDrafts)
    dispatch({ type: 'SET_SENDING', payload: true })

    for (const item of pending) {
      dispatch({ type: 'UPDATE_QUEUE_ITEM', key: item.key, payload: { status: DELIVERY.SENDING } })
      try {
        const res = await fetch(
          `${import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'}/api/send-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectedAccountId: state.composio.accountId,
              to: item.to,
              subject: item.subject,
              body: item.body,
            }),
          }
        )
        const data = await res.json()
        if (data.ok) {
          dispatch({
            type: 'UPDATE_QUEUE_ITEM', key: item.key,
            payload: { status: DELIVERY.SENT, messageId: data.messageId, threadId: data.threadId, sentAt: Date.now() },
          })
          dispatch({
            type: 'ADD_HISTORY',
            entry: {
              id: newId(),
              sponsor: item.sponsor_name,
              event: state.campaign.namaEvent,
              draft: { subject: item.subject, body: item.body },
              delivery: DELIVERY.SENT,
              relationship: RELATIONSHIP.TERKIRIM,
              at: Date.now(),
              updated: Date.now(),
              threadId: data.threadId || null,
            },
          })
        } else {
          dispatch({
            type: 'UPDATE_QUEUE_ITEM', key: item.key,
            payload: { status: DELIVERY.FAILED, error: data.error || 'Send gagal' },
          })
        }
      } catch (err) {
        dispatch({
          type: 'UPDATE_QUEUE_ITEM', key: item.key,
          payload: { status: DELIVERY.FAILED, error: err.message },
        })
      }
    }

    dispatch({ type: 'SET_SENDING', payload: false })
  }

  function retryQueueItem(key) {
    dispatch({ type: 'UPDATE_QUEUE_ITEM', key, payload: { status: DELIVERY.QUEUED, error: null } })
  }

  async function checkReplies(keys) {
    if (!state.composio.accountId) return
    dispatch({ type: 'SET_CHECKING_REPLIES', payload: true })

    const threads = (keys
      ? state.queue.filter(q => keys.includes(q.key))
      : state.queue
    ).filter(q => q.threadId && q.status === DELIVERY.SENT)
      .map(q => ({ key: q.key, threadId: q.threadId, sentAt: q.sentAt }))

    if (threads.length === 0) {
      dispatch({ type: 'SET_CHECKING_REPLIES', payload: false })
      return
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'}/api/check-replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectedAccountId: state.composio.accountId,
            selfEmail: state.composio.accountEmail,
            threads,
          }),
        }
      )
      const data = await res.json()
      if (data.ok) {
        for (const r of data.results) {
          if (r.hasReply) {
            const histEntry = state.history.find(
              h => state.queue.find(q => q.key === r.key)?.sponsor_name === h.sponsor
            )
            if (histEntry) {
              dispatch({
                type: 'UPDATE_HISTORY', id: histEntry.id,
                payload: {
                  relationship: RELATIONSHIP.DIBALAS,
                  reply: { from: r.from, date: r.date, snippet: r.snippet },
                },
              })
            }
          }
        }
      }
    } catch { /* silent */ }

    dispatch({ type: 'SET_CHECKING_REPLIES', payload: false })
  }

  async function refreshComposio() {
    dispatch({ type: 'SET_COMPOSIO', payload: { status: 'checking' } })
    const BACKEND = import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'
    try {
      const res = await fetch(`${BACKEND}/api/composio/accounts?userId=default`)
      const data = await res.json()
      if (data.ok && data.accounts?.length > 0) {
        const acc = data.accounts[0]
        dispatch({
          type: 'SET_COMPOSIO',
          payload: {
            status: 'active',
            accountId: acc.id || acc.connectedAccountId,
            accountEmail: acc.meta?.email || acc.email || null,
          },
        })
      } else {
        dispatch({ type: 'SET_COMPOSIO', payload: { status: 'disconnected' } })
      }
    } catch (err) {
      dispatch({ type: 'SET_COMPOSIO', payload: { status: 'error', error: err.message } })
    }
  }

  async function linkComposio() {
    const BACKEND = import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'
    dispatch({ type: 'SET_COMPOSIO', payload: { status: 'linking' } })
    try {
      const res = await fetch(`${BACKEND}/api/composio/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default' }),
      })
      const data = await res.json()
      if (data.ok) {
        window.open(data.redirect_url, '_blank')
        dispatch({
          type: 'SET_COMPOSIO',
          payload: { status: 'waiting', accountId: data.connected_account_id, linkUrl: data.redirect_url },
        })
      } else {
        dispatch({ type: 'SET_COMPOSIO', payload: { status: 'error', error: data.error } })
      }
    } catch (err) {
      dispatch({ type: 'SET_COMPOSIO', payload: { status: 'error', error: err.message } })
    }
  }

  async function pollComposioAccount() {
    if (!state.composio.accountId) return
    const BACKEND = import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'
    try {
      const res = await fetch(`${BACKEND}/api/composio/accounts/${state.composio.accountId}`)
      const data = await res.json()
      if (data.ok && data.account?.status === 'ACTIVE') {
        dispatch({
          type: 'SET_COMPOSIO',
          payload: {
            status: 'active',
            accountEmail: data.account.meta?.email || null,
          },
        })
      }
    } catch { /* ignore */ }
  }

  function resetFlow() {
    dispatch({ type: 'RESET_FLOW' })
  }

  function resetAll() {
    dispatch({ type: 'RESET_ALL' })
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <StoreContext.Provider value={{
      state,
      dispatch,
      allSponsors,
      selectedSponsors,
      outcomeCounts,
      // actions
      runSearch,
      runDraft,
      regenerateDraft,
      remergeDrafts,
      updateDraft,
      toggleSelected,
      addManualSponsors,
      removeManualSponsor,
      setRelationship,
      enqueueDrafts,
      sendQueue,
      retryQueueItem,
      checkReplies,
      refreshComposio,
      linkComposio,
      pollComposioAccount,
      resetFlow,
      resetAll,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
