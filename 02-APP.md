# App Build Guide (setup → shell → pages → backend)

> CONTEXT: Vite 6 + React 19 + Router 7 + Express 4. Ports 5173/5000/7860.
> Flows search `5d9c3617`, draft `45313891`, `input_type:"chat"`. Composio
> `user_id "default"`. Limits: 5 sponsors, 10 emails/session. Draft =
> `Subjek:`+`Isi:` with `[brackets]`. Full contracts in `01-CONTRACTS.md`.

## 1. Setup (condensed)

`npm install` (+ `npm --prefix server install`). Copy `.env` template from
`00-START-HERE.md`, fill locally. Run `npm run server` + `npm run dev`.
`npm run build` green after every stage. Deps: react, react-dom,
react-router-dom, @vitejs/plugin-react, vite / express, cors, dotenv.

## 2. Routes (`/app/*`, nested, guards redirect to start on empty)

```text
/app .......................... shell + DashboardHome (stats, analytics, activity, sent list)
/app/cari-sponsor ............. search form (step 1)
/app/cari-sponsor/hasil ....... results (guard: no data → ..)
/app/cari-sponsor/kampanye .... campaign (guard: no selection → ../hasil; backPath prop)
/app/cari-sponsor/draft ....... draft+send (guard: no selection → ../kampanye)
/app/tambah-sponsor ........... manual add (own stepper Tambah/Kampanye/Draft)
/app/tambah-sponsor/kampanye .. same campaign component (backPath="..")
/app/tambah-sponsor/draft ..... same draft component (relative nav works both)
/app/riwayat .................. history (independent)
/app/setting .................. statuses, debug toggle, limits, reset
```

Flow stepper reads the active child route (Cari 4 steps / Tambah 3 steps).

## 3. Shell

Sidebar 240px desktop (Dashboard, Cari Sponsor, Tambah Sponsor, Riwayat,
Setting + SVG icons; active = tinted bg + accent bar) → drawer + backdrop
<1024px. Topbar 64px sticky blur: dynamic title, Demo chip, `+ Cari Sponsor`.
Content mesh background. Title derived from longest-prefix menu match.

## 4. Central store (single context)

State: `search{3}`, `results[]`, `manualSponsors[]{name,email,source}`,
`summary`, `selected[]` (names), `campaign` (12 fields §5),
`template{subject,body}`, `drafts[{sponsor_name,to,subject,body,edited,
leftovers[]}]`, `draftRun/draftError/draftPhase`, `composio{status,accountId,
accountEmail,linkUrl,error}`, `queue[{key,…,status,error,messageId,threadId,
sentAt}]`, `sending`, `queueNote`, `checkingReplies`, `history[{id,sponsor,
event,draft,delivery,relationship,updated,at,threadId,reply*}]`, `lastRun`.
Derived: `allSponsors = results + manualSponsors`; `selectedSponsors`;
outcome counts (Terkirim = Sent delivery, else exact match).

Actions: `runSearch` (validate→flow→validate→select-reset),
`runDraft` (1 AI call + merge, keeps manual `to`), `regenerateDraft`,
`remergeDrafts` (no AI, skips edited bodies), `updateDraft`,
`toggleSelected`, `addManualSponsors` (validates+dedupes+auto-selects),
`removeManualSponsor` (also deselects), `setRelationship` (instant),
`enqueueDrafts` (email+leftover gate, cap 10), `sendQueue` (sequential,
history per item), `retryQueueItem`, `checkReplies(keys?)`,
`refreshComposio/linkComposio/pollComposioAccount`, `resetFlow/resetAll`.

Persistence: single `sf_state_v1 = {v:1, savedAt, state}` debounced ~500ms;
strip 45KB `raw`; normalize transients on load (`sending`→queued,
`generating`→idle, linking→disconnected + revalidate account); corrupt JSON →
fresh start (never crash). Tiny keys: `sf_debug`, `sf_view`.

<!-- SPLIT HERE (if this file is too long: stages 1–4 above = part 1, below = part 2) -->

## 5. Pages (states, buttons, empty states; Indonesian copy; no blank panels)

**Cari**: 2-col form + tips aside; phases (`Menghubungi…` → `Menunggu hasil…`
after 4s); error banner + retry + auto-open debug.
**Hasil**: summary banner + context strip; sticky toolbar (level filters incl.
`Manual`, sort, Card/List toggle persisted + `mode: X` caption); cards (in-card
checkbox, meta ellipsis, score, 3 reasons + expander, support/*tidak diketahui*,
contact hidden if empty) and minimal rows (checkbox/avatar/name/score/chip);
sticky footer (`{n} dipilih` + CTA disabled at 0). Manual: `Manual` badge,
score `–/100`, sorted last.
**Kampanye**: read-only context box (event + removable chips + back) + form:
Konteks event section (3 fields bound to shared search — prefilled from AI,
required when manual) + 12-field detail (§6) + tone radios; Back/Submit.
**Tambah**: bulk rows (name+email, add/remove row, per-row errors, dup reject)
+ added list with delete + CTA to nested `kampanye`.
**Draft**: auto-generate on entry (skeleton) / error+retry; tabs with flags
(leftover count, edited, missing email); detail (`To` always editable, edit
mode, yellow `[..]` marks); `Merge Ulang` vs `Generate Ulang` (confirm);
connect card (`idle/checking/disconnected→linking→waiting→active/error`,
new-tab auth + 3s polling + manual check); pre-send (count, recipients, >10
warning, requires connection); queue (`Queued→Sending→Sent/Failed` + retry);
completion feeds history; debug included.
**Riwayat**: 4 outcome boxes, relationship filter (6 values + Semua), table
(Sponsor/Event/Draft/Delivery/Relationship/**Aksi**/Updated, 900px scroll),
per-row outcome buttons + per-row/global `Cek Balasan`, reply snippets,
preview rows when campaign exists pre-send.
**Setting**: live Langflow/Composio statuses, debug radio (env/always/never),
limits, confirmed demo reset.
**DashboardHome**: 4 boxes, Analytics (metric switcher
Dikirim/Dibalas/Diterima/Ditolak + big number + % + hand-rolled SVG bars per
event + empty state), recent activity (last 5), sent-sponsor list (latest
first + outcome buttons + reply info + global check).

## 6. Campaign object: all 12 fields

`namaEvent*, tanggalEvent* (not past), lokasiEvent*, penyelenggara*,
kebutuhanSponsorship*, toneEmail (Formal/Santai/Antusias, default Formal),
informasiTambahan, namaPIC*, kontakPIC*, emailPIC* (+format), websiteAcara
(http(s):// if filled), linkProposal (http(s):// if filled),
deadlineRespons (optional date → id-ID string or fallback).` (* = required)

## 7. Backend (`server/`, key never leaves it)

`GET /api/health`; `GET /api/composio/accounts?userId` (gmail-filtered);
`POST /api/composio/link {userId}` → `{redirect_url, connected_account_id}`
(fixed managed auth); `GET /api/composio/accounts/:id` (poll);
`POST /api/send-email` (validates + 1200ms delay → `GMAIL_SEND_EMAIL`,
returns `{messageId, threadId}` defensively);
`POST /api/check-replies {connectedAccountId, selfEmail?, threads:[{key,
threadId,sentAt}]}` (max 10, 800ms apart; reply = non-self + newer than
`sentAt`, sender/date/snippet extracted across shapes) → `{results[]}`.
All failures `{ok:false, error}` with real messages. CORS: localhost ports.
