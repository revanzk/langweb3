# SponsorFinder — Build Plan (MVP Priority Features)

## Overview

Build the three priority features of the SponsorFinder app:
1. **Cari Sponsor** — AI-powered sponsor search + results
2. **Dashboard** — Stats overview + recent activity + sent list
3. **Tambah Sponsor** — Manual sponsor addition

Stack: Vite 6 + React 19 + React Router 7 + Express 4. No TypeScript, no UI libs.
Ports: Vite 5173, Express 5000, Langflow 7860.
All UI copy in Indonesian.

---

## Sub-Task 1 — Scaffold + Environment + Health Checks

**Intent:** Get a working dev environment with both servers running.

**Expected Outcomes:**
- `npm run dev` serves Vite at :5173
- `npm run server` serves Express at :5000
- `GET :5000/api/health → {ok:true, composioKey:true}`
- `npm run build` is green

**Todo List:**
- [ ] `npm create vite@latest` with react (no TS), add `react-router-dom`, `express`, `cors`, `dotenv`
- [ ] Add `server/index.js` with `GET /api/health` endpoint and CORS for localhost ports
- [ ] Copy `.env.example` to `.env` (placeholder values)
- [ ] Add `npm run server` script to `package.json`
- [ ] Verify `npm run build` passes

**Relevant Context:**
- `.env.example` already exists in workspace root
- `00-START-HERE.md` §Environment has the full env var list
- CORS must allow ports 5173, 5000, 7860

**Status:** [ ] pending

---

## Sub-Task 2 — Contracts: Types, Constants, Validators

**Intent:** Create the shared data contracts so every feature uses the same shapes and validation messages — no invented fields.

**Expected Outcomes:**
- `src/lib/constants.js` — enums, limits (MAX_SPONSORS=5, MAX_EMAILS=10)
- `src/lib/validators.js` — all form validators with exact Indonesian error messages
- `src/lib/langflow.js` — Langflow run function (never throws, returns `{ok,...}`)
- `npm run build` green

**Todo List:**
- [ ] Create `src/lib/constants.js` with relevance/relationship/delivery enums and MAX limits
- [ ] Create `src/lib/validators.js` with search validators (jenisEvent ≥3, peserta digits ≥10, catatan 30–2000), campaign validators (12 fields), manual sponsor validators (name ≥3, email format, duplicate check)
- [ ] Create `src/lib/langflow.js` with `runFlow(flowId, inputValue)` — POST with `input_type:"chat"`, 120s timeout, `{ok, data, error}` return shape
- [ ] Create `src/lib/merge.js` with placeholder fuzzy-matcher (bracket detection + fallback map from `01-CONTRACTS.md` §3–4)

**Relevant Context:**
- `01-CONTRACTS.md` §5 — exact validation messages in Indonesian
- `01-CONTRACTS.md` §6 — status enums (fixed, no new strings)
- `01-CONTRACTS.md` §1 — Langflow run contract (`input_type:"chat"` ALWAYS)
- `01-CONTRACTS.md` §4 — placeholder matching rules

**Status:** [ ] pending

---

## Sub-Task 3 — Shell + Router + Central Store

**Intent:** Wire up the app skeleton so navigation and shared state work before any feature page is built.

**Expected Outcomes:**
- All routes defined and render placeholder pages
- Sidebar + topbar render correctly on desktop and mobile (<1024px drawer)
- Store context wraps the app with exact state shape
- Route guards redirect on empty state
- `npm run build` green

**Todo List:**
- [ ] Create `src/App.jsx` with React Router 7 routes per `02-APP.md` §2 route table
- [ ] Create `src/components/Shell.jsx` — sidebar (240px, 6 menu items + icons), topbar (64px blur, dynamic title, Demo chip, + Cari Sponsor button), content area with mesh background, drawer for <1024px
- [ ] Create `src/store/store.jsx` — single context with full state shape from `02-APP.md` §3, all actions as stubs, localStorage persistence key `sf_state_v1`
- [ ] Add route guards: results guard (no data → redirect to /app/cari-sponsor), kampanye guard (no selection → redirect to hasil), draft guard (no selection → redirect to kampanye)
- [ ] Confirm all 9 routes render without white screen

**Relevant Context:**
- `02-APP.md` §2 — full route table
- `02-APP.md` §3 — exact state shape (all fields listed)
- `02-APP.md` §3 — persistence: strip 45KB raw, normalize transients on load
- `03-REFERENCE.md` §5 — "White screen on navigate" debug note

**Status:** [ ] pending

---

## Sub-Task 4 — Cari Sponsor Page (Search + Results)

**Intent:** Build the full search-to-results flow: validated form → AI call → ranked sponsor cards.

**Expected Outcomes:**
- Search form validates with exact Indonesian error messages
- Submitting calls Langflow search flow (`5d9c3617`) with correct `input_type:"chat"` body
- Results page shows ≤5 sponsor cards with score, level chip, reasons, support type
- Card/List view toggle persisted to `sf_view`
- Filter by relevance level + Manual; sort options work
- Sticky footer shows `{n} dipilih` + CTA disabled at 0 selected
- Debug panel auto-opens on failure

**Todo List:**
- [ ] Create `src/dashboard/CariSponsor.jsx` — 2-col form (jenisEvent, perkiraanPeserta, catatan with live counter), tips aside, phase display (`Menghubungi…` → `Menunggu hasil…` after 4s), error banner + retry
- [ ] Implement `runSearch` action in store: validate → build input string (3 `\n`-joined lines per `01-CONTRACTS.md` §7) → call Langflow → parse TWO outputs defensively → slice to 5 → store in `results`
- [ ] Create `src/dashboard/Hasil.jsx` — summary banner, context strip, toolbar (filters, sort, Card/List toggle), sponsor cards (avatar, score, level chip, 3 reasons + expander, support/*tidak diketahui*, contact hidden if null), list rows (minimal), sticky selection footer
- [ ] Wire `toggleSelected` + selection state; disable CTA at 0
- [ ] Add debug panel component (collapsible, auto-opens on error, shows endpoint/flowId/input/ms/HTTP status/raw response)

**Relevant Context:**
- `01-CONTRACTS.md` §2 — search output JSON shape + defensive parse rules
- `01-CONTRACTS.md` §7 — exact input builder (3 lines, `\n`-joined)
- `02-APP.md` §5 — Hasil page full spec (card contents, Manual badge, `–/100` score)
- `03-REFERENCE.md` §1 — search flow emits TWO outputs; try parsing each
- `03-REFERENCE.md` §5 — debug panel spec

**Status:** [ ] pending

---

## Sub-Task 5 — Dashboard (DashboardHome)

**Intent:** Build the home dashboard showing outcome stats, analytics chart, recent activity, and sent-sponsor list.

**Expected Outcomes:**
- 4 outcome boxes: Terkirim, Dibalas, Diterima, Ditolak (counts from history)
- Analytics section: metric switcher, big number + %, hand-rolled SVG bar chart per event, empty state
- Recent activity: last 5 history entries
- Sent-sponsor list: latest first, outcome buttons, reply info, global "Cek Balasan"
- All counts derived live from store `history[]`

**Todo List:**
- [ ] Create `src/dashboard/DashboardHome.jsx` — 4 stat boxes wired to store derived counts
- [ ] Add metric switcher (Dikirim/Dibalas/Diterima/Ditolak) + big number + % display
- [ ] Build hand-rolled SVG bar chart grouping history by event name
- [ ] Add recent activity list (last 5 from `history`, most recent first)
- [ ] Add sent-sponsor list with per-row outcome buttons calling `setRelationship` + `Cek Balasan` button calling `checkReplies`
- [ ] Empty state when `history` is empty

**Relevant Context:**
- `02-APP.md` §5 — DashboardHome spec (boxes, analytics, activity, sent list)
- `02-APP.md` §3 — derived counts: Terkirim = `delivery Sent`; others exact relationship match; Diacuhkan excluded from 4 boxes
- `01-CONTRACTS.md` §6 — status enums

**Status:** [ ] pending

---

## Sub-Task 6 — Tambah Sponsor (Manual Add)

**Intent:** Let users add sponsors manually outside of AI search, with deduplication and auto-selection.

**Expected Outcomes:**
- Bulk row input (name + email, add/remove rows, per-row errors)
- Duplicate name rejected case-insensitively vs AI results + existing manual
- Added sponsors appear with `Manual` badge in Hasil, score `–/100`, sorted last
- CTA navigates to Kampanye with manual sponsors auto-selected
- Delete from added list also deselects

**Todo List:**
- [ ] Create `src/dashboard/TambahSponsor.jsx` — bulk row form (name ≥3, email format required), add/remove row, per-row inline errors
- [ ] Implement `addManualSponsors` action: validate each row, dedup against `results` + existing `manualSponsors` (case-insensitive name), store valid entries, auto-select them
- [ ] Implement `removeManualSponsor` action: remove from `manualSponsors` + deselect
- [ ] Show added list with delete button
- [ ] Wire CTA → `/app/tambah-sponsor/kampanye`
- [ ] Ensure Manual sponsors render in Hasil grid with `Manual` badge and `–/100` score, sorted after AI results

**Relevant Context:**
- `02-APP.md` §5 — Tambah page spec (bulk rows, added list, CTA)
- `02-APP.md` §3 — `manualSponsors[]{name,email,source}`, `allSponsors = results + manualSponsors`
- `01-CONTRACTS.md` §5 — manual row validation rules + duplicate rejection

**Status:** [ ] pending

---

## Iron Rules (must not be violated during implementation)

1. `input_type:"chat"` ALWAYS for Langflow calls — never `"text"`
2. Max 5 sponsors (slice), max 10 emails/session (warn, never silent-cut)
3. Status enums are fixed — no new strings
4. Nulls hide in UI (except support → *tidak diketahui*); never fabricate data
5. `npm run build` must be green after every sub-task
6. Secrets stay in `.env`; `COMPOSIO_API_KEY` server-side only (no `VITE_` prefix)
