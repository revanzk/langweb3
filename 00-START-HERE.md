# SponsorFinder — Rebuild Pack (IBM BOB)

> CONTEXT (also pasted atop every file): Vite 6 + React 19 + Router 7 +
> Express 4. No UI/chart libs, no TS. Ports: Vite 5173, Express 5000,
> Langflow 7860 (same machine). Flows: search `5d9c3617`, draft `45313891`,
> `input_type:"chat"` ALWAYS. Composio `user_id "default"`, managed Gmail.
> Enums: relevance Sangat Relevan/Relevan/Cukup Relevan/Kurang Relevan;
> relationship Belum Dihubungi/Terkirim/Dibalas/Diterima/Ditolak/Diacuhkan;
> delivery Queued/Sending/Sent/Failed. Limits: max 5 sponsors, max 10
> emails/session (warn, never silent-cut). Draft = `Subjek:` line + `Isi:`
> body with Indonesian `[brackets]` (never `{{}}`).

## What to build

Event committees describe an event → AI ranks REAL sponsors (max 5) → user
picks → campaign context → ONE AI email template merged per company →
preview/edit → connect Gmail (Composio) → send (max 10/session) → track
outcomes. UI in Indonesian.

**Out of scope:** landing page (not MVP), CSV export, multi-user, daily
quotas, TypeScript.

## Feed order (1–2 files per prompt, in this order)

| Step | Paste | Deliverable |
|---|---|---|
| 1 | This file + `.env` template below | Scaffold installs; env filled locally; 3 health checks green |
| 2 | `01-CONTRACTS.md` | Types/constants/validators only, no UI |
| 3 | `02-APP.md` part 1 (setup+shell+store) | Router + shell + empty pages, guards redirect |
| 4 | `02-APP.md` part 2 (pages Cari+Hasil) | Search→results→select on MOCK data |
| 5 | `02-APP.md` part 3 (pages rest+backend) | Campaign→merge→preview/edit + Express + queued send |
| 6 | Real AI wiring (`01` §run + `03-REFERENCE.md` §debug) | Replace mocks, debug panel shows raw |
| 7 | `03-REFERENCE.md` §design | Tokens + patterns last (styling only, no restructure) |
| 8 | Verify (prompts below) | Build green, demo clean |

If `02-APP.md` is rejected as too long, split ONLY at its
`<!-- SPLIT HERE -->` marker (setup+shell+pages Cari/Hasil first, rest second).
`01-CONTRACTS.md` is intentionally sized to paste whole.

## Iron rules

1. Contracts are law — never invent API/JSON shapes. On mismatch: SHOW raw.
2. No fake data: nulls hide (support → *tidak diketahui*); never fabricate.
3. `Sent` only after provider success; per-recipient retry.
4. Secrets stay local (placeholders below); Composio key server-side only.
5. Statuses are fixed enums — no new strings without updating `01-CONTRACTS.md`.
6. `npm run build` green after every stage.

## Environment

Services (same machine): Langflow `:7860`, backend `:5000`, Vite `:5173`.
Copy this template to `.env` and fill locally — NEVER paste real values here:

```ini
VITE_LANGFLOW_URL=http://localhost:7860
VITE_LANGFLOW_API_KEY=ISI_MANUAL_DISINI
VITE_LANGFLOW_SEARCH_FLOW_ID=ISI_MANUAL_DISINI
VITE_LANGFLOW_DRAFT_FLOW_ID=ISI_MANUAL_DISINI
VITE_DEBUG_LANGFLOW=true
VITE_COMPOSIO_BACKEND_URL=http://localhost:5000
COMPOSIO_API_KEY=ISI_MANUAL_DISINI
# COMPOSIO_PORT=5000
```

Get values from: Langflow UI (flow IDs in flow settings; API key in settings),
Composio dashboard (project API key). `VITE_*` is browser-visible — fine for
local demo, never a public deploy. `COMPOSIO_*` (no prefix) is server-only.

Run (2 terminals): `npm run server` + `npm run dev`. Health:
`GET :7860/health → {"status":"ok"}`,
`GET :5000/api/health → {ok:true,composioKey:true}`.

## Stage prompts (copy verbatim, attach listed files)

**S1 setup:** `Read 00-START-HERE.md (attached). Scaffold Vite+React per versions above. Create .env from the template (placeholder values). No features yet. Deliverable: dev serves, both health checks pass or are honestly reported down. Then npm run build — must be green.`

**S2 contracts:** `Read 01-CONTRACTS.md (attached). Create types/constants/validators ONLY, no UI: sponsor JSON schema + relevance enum, draft Subjek/Isi + bracket table, fallback map, all form validators, outcome/delivery enums, 10-per-session + max-5 constants. No network calls. Build green.`

**S3 shell:** `Read 02-APP.md sections 1-3 (shell/routes/store) (attached). Build router (/app + nested flows), shell (sidebar/topbar/outlet), central store with exact state shape, route guards (empty → redirect to start). Placeholder pages OK. Build green.`

**S4 pages A:** `Read 02-APP.md Cari+Hasil sections (attached). Build with MOCK data first (3 hardcoded sponsors matching the contract): validated search form, results grid + list toggle, filter/sort/select, sticky bar. No AI calls. Build green.`

**S5 pages B + backend:** `Read 02-APP.md remaining sections + backend (attached). Campaign form (+PIC fields), merge engine over a HARDCODED sample template, preview/edit, manual email, leftover blocking. Express server: 6 endpoints, connect polling, queued send (mock transport labeled if Composio unreachable). Build green (both packages).`

**S6 AI wiring:** `Wire real Langflow calls per 01-CONTRACTS.md run contract (input_type:"chat", candidate selection, defensive parse) + debug panel with FULL raw log per 03-REFERENCE.md debug section. Test one search + one draft. If output differs, SHOW raw — do not silently adapt.`

**S7 design:** `Read 03-REFERENCE.md design section (attached). Apply tokens + component patterns app-wide. Styling only, no restructuring. Build green.`

**S8 verify:** `Checklist, report pass/fail each: (1) build green; (2) ≤5 cards with scores; (3) select→campaign keeps data; (4) preview per sponsor, manual email where null, leftover blocks send; (5) connect, pre-send cap, queue animates, history fills; (6) outcome buttons update boxes; (7) refresh keeps state; (8) no console errors. Then rehearse the 7-minute demo in 03-REFERENCE.md. Fix failures first.`

## Definition of done (MVP)

- [ ] Real flow search → ≤5 cards (score/level/reasons)
- [ ] Select → campaign keeps data (no re-typing)
- [ ] Draft preview per sponsor; manual email where null; leftover blocks send
- [ ] Gmail connect; pre-send cap; queue animates; history fills
- [ ] Outcome buttons update boxes instantly; refresh keeps state
