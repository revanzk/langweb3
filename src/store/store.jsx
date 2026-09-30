import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { validateSearch } from '../lib/validators.js'
import { runFlow, extractCandidates } from '../lib/langflow.js'
import {
  parseSearchOutput, parseDraftOutput, mergeSubjectAndBody,
  buildSearchInput, buildDraftInput, buildManualDraftInput,
} from '../lib/merge.js'
import { FLOW_SEARCH, FLOW_DRAFT, DELIVERY, RELATIONSHIP, MAX_EMAILS, MIN_SPONSORS } from '../lib/constants.js'

// Maksimal percobaan pencarian agar AI mengembalikan minimal MIN_SPONSORS
// (maksimal MAX_SPONSORS). Retry hanya jika di bawah MIN_SPONSORS.
const MAX_SEARCH_ATTEMPTS = 3

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
  searchNote: '', // info retry human-readable saat searching/waiting
  lastRun: null,       // debug info
  // Campaign
  campaign: {
    namaEvent: '', tanggalEvent: '', lokasiEvent: '', penyelenggara: '',
    kebutuhanSponsorship: '', toneEmail: 'Formal', informasiTambahan: '',
    namaPIC: '', jabatanPIC: '', kontakPIC: '', emailPIC: '',
    websiteAcara: '', linkProposal: '',
    // shared from search (prefilled)
    jenisEvent: '', perkiraanPeserta: '', catatanEvent: '',
  },
  // Drafts
  template: { subject: '', body: '' },
  drafts: [],          // [{ sponsor_name, to, subject, body, edited, leftovers[] }]
  draftPhase: 'idle',  // idle | generating | done | error
  draftError: null,
  lastDraftKey: '',    // tracks which campaign+selection combo was last generated
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

// Per-user Composio userId: UUID stabil per-browser (localStorage `sf_user_id`).
// Tiap pemakai login Gmail masing-masing; jangan pakai email (bisa berubah)
// dan jangan hardcode 'default' (berbagi akun antar user).
function getComposioUserId() {
  try {
    const KEY = 'sf_user_id'
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'default'
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: { ...state.search, ...action.payload } }

    case 'SET_SEARCH_PHASE':
      return { ...state, searchPhase: action.payload, searchError: action.error || null, searchNote: action.note || '' }

    // Hasil AI baru = sesi baru: semua data lama (kampanye, draft, antrean,
    // sponsor manual, pilihan, lastDraftKey) dibuang. Yang selamat hanya
    // history + koneksi Gmail. Draft email sesi baru tetap tersimpan normal.
    case 'SET_RESULTS':
      return {
        ...INITIAL_STATE,
        history: state.history,
        composio: state.composio || INITIAL_STATE.composio,
        search: action.search || INITIAL_STATE.search,
        results: action.results,
        summary: action.summary || '',
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
      return { ...state, drafts: action.drafts, draftPhase: action.drafts.length > 0 ? 'done' : 'idle', lastDraftKey: action.key || state.lastDraftKey }

    case 'UPDATE_DRAFT': {
      const drafts = state.drafts.map(d =>
        d.sponsor_name === action.sponsor_name
          ? { ...d, ...action.payload, edited: action.payload.edited ?? true }
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
      return { ...state, composio: { ...(state.composio || {}), ...action.payload } }

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
        composio: state.composio || INITIAL_STATE.composio,
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
    // Migrasi sekali jalan: bunuh nilai peserta basi era input pencarian
    // (inputnya sudah dihapus; estimasi kini diisi di Detail Kampanye)
    search: { ...(state.search || {}), perkiraanPeserta: '' },
    campaign: state.campaign || INITIAL_STATE.campaign,
    results: state.results || [],
    manualSponsors: state.manualSponsors || [],
    selected: state.selected || [],
    drafts: state.drafts || [],
    history: state.history || [],
    sending: false,
    searchPhase: state.searchPhase === 'searching' || state.searchPhase === 'waiting'
      ? 'idle' : state.searchPhase,
    draftPhase: state.draftPhase === 'generating' ? 'idle' : state.draftPhase,
    composio: state.composio?.status === 'linking'
      ? { ...state.composio, status: 'disconnected' }
      : (state.composio || INITIAL_STATE.composio),
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
  // Key antrean yang dibatalkan user. Dibaca loop sendQueue agar item yang
  // dibatalkan saat pengiriman berjalan tidak ikut terkirim (snapshot pending
  // diambil di awal loop, jadi cek status via state saja tidak cukup).
  const cancelledRef = useRef(new Set())

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
  // Pencarian wajib menghasilkan MIN_SPONSORS–MAX_SPONSORS sponsor. Jika AI
  // mengembalikan di bawah MIN_SPONSORS, ulangi otomatis hingga
  // MAX_SEARCH_ATTEMPTS.
  async function runSearch(searchData) {
    // Accept searchData directly — caller dispatch hasn't settled yet when this runs
    const data = searchData || state.search
    const { valid, errors } = validateSearch(data)
    if (!valid) return { valid: false, errors }

    dispatch({ type: 'SET_SEARCH_PHASE', payload: 'searching' })
    const phaseTimer = setTimeout(() => dispatch({ type: 'SET_SEARCH_PHASE', payload: 'waiting' }), 4000)

    const inputValue = buildSearchInput(data)
    const endpoint = `${import.meta.env.VITE_LANGFLOW_URL}/api/v1/run/${FLOW_SEARCH}`
    let lastDebug = null
    let lastCount = 0
    let lastError = null

    for (let attempt = 1; attempt <= MAX_SEARCH_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        dispatch({
          type: 'SET_SEARCH_PHASE',
          payload: 'searching',
          note: `AI menemukan ${lastCount} sponsor (min ${MIN_SPONSORS}), mencoba lagi (${attempt}/${MAX_SEARCH_ATTEMPTS})...`,
        })
      }

      const startMs = Date.now()
      const result = await runFlow(FLOW_SEARCH, inputValue)
      const ms = Date.now() - startMs
      const debug = {
        endpoint,
        flowId: FLOW_SEARCH,
        input: inputValue,
        ms,
        httpStatus: result.httpStatus,
        candidates: [],
        chosenIndex: -1,
        counts: [],
        attempt,
        attempts: MAX_SEARCH_ATTEMPTS,
        raw: result.data ? JSON.stringify(result.data) : result.error,
      }

      if (!result.ok) {
        lastError = result.error
        lastDebug = debug
        continue
      }

      const candidates = extractCandidates(result.data)
      debug.candidates = candidates
      const { sponsors, summary, chosenIndex, counts } = parseSearchOutput(candidates)
      debug.chosenIndex = chosenIndex
      debug.counts = counts
      lastDebug = debug
      lastCount = sponsors.length

      if (sponsors.length >= MIN_SPONSORS) {
        clearTimeout(phaseTimer)
        dispatch({
          type: 'SET_RESULTS',
          results: sponsors,
          summary,
          search: { jenisEvent: data.jenisEvent || '', perkiraanPeserta: '', catatanEvent: data.catatanEvent || '' },
          lastRun: debug,
        })
        return { valid: true, ok: true }
      }
      // Kurang dari wajib → loop coba lagi
    }

    clearTimeout(phaseTimer)
    const err = lastCount === 0
      ? (lastError || 'Tidak ada hasil sponsor yang valid dari AI.')
      : `AI hanya menemukan ${lastCount} dari minimal ${MIN_SPONSORS} sponsor setelah ${MAX_SEARCH_ATTEMPTS}x percobaan. Coba lagi atau lengkapi catatan event.`
    dispatch({ type: 'SET_SEARCH_PHASE', payload: 'error', error: err })
    dispatch({ type: 'SET_LAST_RUN', payload: lastDebug })
    return { valid: true, ok: false, error: err }
  }

  async function runDraft(draftKey) {
    if (selectedSponsors.length === 0) return { ok: false, error: 'Tidak ada sponsor terpilih.' }

    dispatch({ type: 'SET_DRAFT_PHASE', payload: 'generating' })

    const drafts = []
    for (const sponsor of selectedSponsors) {
      const inputValue = buildDraftInput(state.campaign, sponsor)
      const result = await runFlow(FLOW_DRAFT, inputValue)

      if (!result.ok) {
        dispatch({ type: 'SET_DRAFT_PHASE', payload: 'error', error: result.error })
        return { ok: false, error: result.error }
      }

      const candidates = extractCandidates(result.data)
      const rawText = candidates[0] || ''
      const { subject: rawSubject, body: rawBody } = parseDraftOutput(rawText)
      const { subject, body, leftovers } = mergeSubjectAndBody(rawSubject, rawBody, state.campaign, sponsor)

      drafts.push({
        sponsor_name: sponsor.sponsor_name,
        to: sponsor.contact_email || '',
        subject,
        body,
        edited: false,
        manual: false,
        leftovers,
      })
    }

    dispatch({ type: 'SET_DRAFTS', drafts, key: draftKey || '' })
    return { ok: true, count: drafts.length }
  }

  async function regenerateDraft(sponsorName) {
    const sponsor = selectedSponsors.find(s => s.sponsor_name === sponsorName)
    if (!sponsor) return { ok: false, error: 'Sponsor tidak ditemukan.' }

    const inputValue = buildDraftInput(state.campaign, sponsor)
    const result = await runFlow(FLOW_DRAFT, inputValue)
    if (!result.ok) {
      dispatch({ type: 'SET_DRAFT_PHASE', payload: 'error', error: result.error })
      return { ok: false, error: result.error }
    }

    const candidates = extractCandidates(result.data)
    const rawText = candidates[0] || ''
    const { subject: rawSubject, body: rawBody } = parseDraftOutput(rawText)
    const { subject, body, leftovers } = mergeSubjectAndBody(rawSubject, rawBody, state.campaign, sponsor)

    dispatch({
      type: 'UPDATE_DRAFT',
      sponsor_name: sponsorName,
      payload: { subject, body, leftovers, edited: false, manual: false },
    })
    // Pastikan phase kembali done bila sebelumnya error dan draft sudah ada
    dispatch({ type: 'SET_DRAFT_PHASE', payload: 'done' })
    return { ok: true }
  }

  // Generate ulang banyak draft sekaligus (semua atau daftar nama tertentu).
  // Dipakai tombol "Generate Semua" dan "Coba yang Gagal".
  async function regenerateManyDrafts(sponsorNames) {
    const names = Array.isArray(sponsorNames) && sponsorNames.length > 0
      ? sponsorNames
      : selectedSponsors.map(s => s.sponsor_name)
    if (names.length === 0) return { ok: false, error: 'Tidak ada sponsor terpilih.' }

    const existingByName = new Map((state.drafts || []).map(d => [d.sponsor_name, d]))
    dispatch({ type: 'SET_DRAFT_PHASE', payload: 'generating' })
    const freshByName = new Map()
    let lastError = null

    for (const name of names) {
      const sponsor = selectedSponsors.find(s => s.sponsor_name === name)
      if (!sponsor) continue
      const inputValue = buildDraftInput(state.campaign, sponsor)
      const result = await runFlow(FLOW_DRAFT, inputValue)
      if (!result.ok) {
        lastError = result.error
        continue
      }
      const candidates = extractCandidates(result.data)
      const rawText = candidates[0] || ''
      const { subject: rawSubject, body: rawBody } = parseDraftOutput(rawText)
      const { subject, body, leftovers } = mergeSubjectAndBody(rawSubject, rawBody, state.campaign, sponsor)

      freshByName.set(name, {
        sponsor_name: name,
        to: existingByName.get(name)?.to ?? sponsor.contact_email ?? '',
        subject,
        body,
        edited: false,
        manual: false,
        leftovers,
      })
    }

    if (freshByName.size === 0) {
      dispatch({ type: 'SET_DRAFT_PHASE', payload: 'error', error: lastError || 'Semua generate ulang gagal.' })
      return { ok: false, error: lastError || 'Semua generate ulang gagal.' }
    }

    // Gabung: yang diregenerate pakai hasil baru, sisanya pertahankan.
    const merged = [
      ...selectedSponsors
        .map(s => s.sponsor_name)
        .filter(n => freshByName.has(n) || existingByName.has(n))
        .map(n => freshByName.get(n) || existingByName.get(n)),
      ...(state.drafts || []).filter(d => !selectedSponsors.some(s => s.sponsor_name === d.sponsor_name)),
    ]
    dispatch({ type: 'SET_DRAFTS', drafts: merged })
    return { ok: true, count: freshByName.size, failed: names.length - freshByName.size, error: lastError }
  }

  // Mode "Buat Draft Manual": template buatan pengguna dikirim ke AI untuk
  // dirapikan (uji coba), lalu di-merge sadar-ketersediaan seperti biasa.
  // Hasil ditandai manual:true agar UI bisa membedakan dari draft AI penuh.
  async function runManualDraft(templateSubject, templateBody) {
    if (selectedSponsors.length === 0) return { ok: false, error: 'Tidak ada sponsor terpilih.' }
    if (!templateBody || !String(templateBody).trim()) {
      return { ok: false, error: 'Isi draft manual masih kosong.' }
    }

    dispatch({ type: 'SET_DRAFT_PHASE', payload: 'generating' })

    const drafts = []
    for (const sponsor of selectedSponsors) {
      const inputValue = buildManualDraftInput(templateSubject, templateBody, state.campaign, sponsor)
      const result = await runFlow(FLOW_DRAFT, inputValue)

      if (!result.ok) {
        dispatch({ type: 'SET_DRAFT_PHASE', payload: 'error', error: result.error })
        return { ok: false, error: result.error }
      }

      const candidates = extractCandidates(result.data)
      const rawText = candidates[0] || ''
      const { subject: rawSubject, body: rawBody } = parseDraftOutput(rawText)
      const { subject, body, leftovers } = mergeSubjectAndBody(rawSubject, rawBody, state.campaign, sponsor)

      drafts.push({
        sponsor_name: sponsor.sponsor_name,
        to: sponsor.contact_email || '',
        subject: subject || String(templateSubject || '').trim(),
        body: body || String(templateBody).trim(),
        edited: false,
        manual: true,
        leftovers,
      })
    }

    const draftKey = [state.campaign?.namaEvent || '', ...state.selected].join('|')
    dispatch({ type: 'SET_DRAFTS', drafts, key: draftKey })
    return { ok: true, count: drafts.length }
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
    if (!state.composio?.accountId) return

    const pending = state.queue.filter(q => q.status === DELIVERY.QUEUED)
    if (pending.length === 0) return

    // Warn if would exceed cap (already gated in enqueueDrafts)
    dispatch({ type: 'SET_SENDING', payload: true })

    for (const item of pending) {
      // Lewati item yang dibatalkan user setelah snapshot pending diambil
      if (cancelledRef.current.has(item.key)) continue
      dispatch({ type: 'UPDATE_QUEUE_ITEM', key: item.key, payload: { status: DELIVERY.SENDING } })
      try {
        const res = await fetch(
          `${import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'}/api/send-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: getComposioUserId(),
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

  // Batalkan item antrean yang masih Queued (belum terkirim): hapus dari
  // antrean sehingga kuota MAX_EMAILS bebas lagi. Item Sending/Sent/Failed
  // tidak bisa dibatalkan — return false agar UI bisa mengabaikan.
  function cancelQueueItem(key) {
    const item = state.queue.find(q => q.key === key)
    if (!item || item.status !== DELIVERY.QUEUED) return false
    cancelledRef.current.add(key)
    dispatch({ type: 'SET_QUEUE', queue: state.queue.filter(q => q.key !== key) })
    return true
  }

  function cancelAllQueued() {
    const keys = state.queue.filter(q => q.status === DELIVERY.QUEUED).map(q => q.key)
    if (keys.length === 0) return { ok: false, count: 0 }
    keys.forEach(k => cancelledRef.current.add(k))
    dispatch({ type: 'SET_QUEUE', queue: state.queue.filter(q => q.status !== DELIVERY.QUEUED) })
    return { ok: true, count: keys.length }
  }

  async function checkReplies(keys) {
    if (!state.composio?.accountId) return
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
            userId: getComposioUserId(),
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
      const res = await fetch(`${BACKEND}/api/composio/accounts?userId=${encodeURIComponent(getComposioUserId())}`)
      const data = await res.json()
      const active = data.ok ? (data.accounts || []).find(a => a.status === 'ACTIVE') || data.accounts[0] : null
      if (data.ok && active) {
        const acc = active
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
        body: JSON.stringify({ userId: getComposioUserId() }),
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
    if (!state.composio?.accountId) return
    const BACKEND = import.meta.env.VITE_COMPOSIO_BACKEND_URL || 'http://localhost:5000'
    try {
      const res = await fetch(`${BACKEND}/api/composio/accounts/${state.composio.accountId}?userId=${encodeURIComponent(getComposioUserId())}`)
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
      regenerateManyDrafts,
      runManualDraft,
      updateDraft,
      toggleSelected,
      addManualSponsors,
      removeManualSponsor,
      setRelationship,
      enqueueDrafts,
      sendQueue,
      retryQueueItem,
      cancelQueueItem,
      cancelAllQueued,
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
