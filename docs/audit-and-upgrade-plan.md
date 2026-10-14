# UpharCRM — Audit & Upgrade Plan (Oct 2026)

Scope: full read of `app/src` (≈10.7k lines), API routes, auth, migrations and env names.
Severity: **P0** = security / wrong data shown to users, **P1** = broken feature, **P2** = quality.

---

## 1. Bugs & security

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | P0 | `src/middleware.ts` | Any valid cookie (`de:`, `book:` or `crm`) unlocks **every** page and API. A self-registered, approved Books user can open `/dashboard`, hit `/api/export`, edit follow-ups, etc. RBAC from `todo.md` is not enforced anywhere. | Map cookie type → allowed path prefixes in middleware; add a `requireRole()` helper in each route. |
| 2 | P0 | `src/lib/auth.ts` | Sessions never expire server-side (no `exp` in payload, `maxAge` is client-only). A rejected/deactivated DE user's old cookie keeps working forever. Secret falls back to a hardcoded string if `SESSION_SECRET` is missing. | Put `exp` + user id in the payload, check status on login-protected routes, throw at boot if `SESSION_SECRET` is unset. Use constant-time compare for the HMAC. |
| 3 | P0 | `api/auth/crm-login` | Single shared password, no rate limit, plain `!==` compare. | Rate-limit by IP (Upstash/Marketplace Redis or a Supabase table), constant-time compare. Long term: per-user CRM accounts (spec §1). |
| 4 | P0 | `api/dashboard/route.ts` | Pulls whole tables (`challans`, `leads`, `challan_books`, `follow_ups`) with no range. PostgREST caps at **1000 rows**, so every dashboard number silently undercounts once data passes 1000. Also heavy per request + 60s auto-refresh. | Use the existing `mv_district_stats` / `mv_book_stats` views + SQL RPCs for aggregates (`count`, `sum`). |
| 5 | P1 | `DashboardClient.tsx:643` | Follow-Ups tab reads `item.lead.contact_person`, but the API returns flat fields (`item.contact_person`). Every row shows `-`. | Read the flat fields. |
| 6 | P1 | `api/leads`, `api/challans`, `api/export` | `.eq('agents.name', …)` without `agents!inner` does **not** filter parent rows in PostgREST — Rep filter returns all rows. | Use `agents!inner(name)` when filtering. |
| 7 | P1 | `api/leads` + `LeadsClient` | Search box says "Name, Institute, Phone, Rep…" but API only matches `lead_seq_id`. Typing a phone number finds nothing. No debounce, so out-of-order responses can overwrite newer results. | Search RPC over contact name / mobile / institute / lead id; 300 ms debounce + `AbortController`. |
| 8 | P1 | `api/ai/lead-summary` | Selects `follow_ups.is_physical_visit, call_outcome` — those columns don't exist (outcomes live in `call_feedback`). Query errors, error is ignored, AI always gets **empty interaction history**. | Select real columns, join `call_feedback`, check `error`. |
| 9 | P1 | All date logic (21 places) | `new Date().toISOString().split('T')[0]` is UTC. From 00:00–05:30 IST "today" is yesterday → Due Today / Overdue queues are wrong every early morning. | One `todayIST()` helper (`Intl` with `Asia/Kolkata`). |
| 10 | P1 | `api/whatsapp/webhook` | No `X-Hub-Signature-256` check — anyone can POST fake "Received" replies. `process-reminders` is public when `WHATSAPP_CRON_SECRET` is unset. | Verify signature with app secret; require the cron secret always (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). |
| 11 | P1 | `api/import/commit` | Trusts client-sent `resolvedRows` (validation can be bypassed). Sequential RPC per row → 500-row import risks function timeout. Re-importing the same file with "create new" makes duplicate challans (spec §3.4 idempotency fails). | Re-validate server-side, batch in one RPC, dedupe on `phone + visit date + book`. |
| 12 | P1 | `Sidebar.tsx:77` | Links to `/settings` — route doesn't exist (404). | Remove or build. |
| 13 | P1 | `GET /api/follow-ups`, `GET /api/dashboard` | GET requests write to the DB (auto-mark overdue) on every call/refresh. | Compute "overdue" at read time (`followup_date < today`) or a daily cron. |
| 14 | P2 | `LeadWhatsApp.tsx` | "Simulate customer reply (test)" buttons ship in production UI. | Show only when `NODE_ENV !== 'production'` or WhatsApp is stubbed. |
| 15 | P2 | `api/challans` POST | Duplicate `challan_no` check-then-insert is racy; `.single()` on contacts errors when a phone has >1 contact and the dup check is skipped. | Unique constraint + catch `23505`; use `.limit(1)`. |
| 16 | P2 | deps | `xlsx@0.18.5` from npm has CVE-2023-30533 (prototype pollution on read) and CVE-2024-22363 (ReDoS). We **parse user uploads** with it. npm package is abandoned. | Install the current build (≥ 0.20.2) from `cdn.sheetjs.com` or switch to `exceljs`. |
| 17 | P2 | deps | Next 15.3, eslint lint skipped at build. | Upgrade to Next 16, turn lint back on. |
| 18 | P2 | env | `GROQ_API_KEY` not in local `.env` → all three AI features fail locally. | Add to `.env` / Vercel env. |
| 19 | P2 | repo root | `26070300233911UBIN_ChallanReceipt.pdf` (a bank challan receipt) is committed. | Remove from git if it's personal. |
| 20 | P2 | `tailwind.config.ts` | Tailwind v4 ignores this file (no `@config`), so `primary`/`secondary` don't exist; every color is a hardcoded hex (`#1E40AF` appears 100+ times). | Move tokens into `@theme` in `globals.css`. |

---

## 2. Why the UI reads as "AI generated"

Matched against published "AI slop" fingerprints (Inter + blue/indigo, rounded cards with soft shadow, colored one-sided borders, decorative icons everywhere):

- KPI cards with a **3px colored top border** in 5 different colors (`DashboardClient` KPI row) — the most recognised AI-UI signature.
- Every heading has a decorative underline `<hr>` / gradient divider.
- Material Symbols icon on every label, button, empty state and tab; loaded as a full variable webfont (heavy, and shows raw text like "dashboard" before it loads).
- Rainbow palette with no meaning: blue, purple, amber, green, pink for KPIs; separate status colors; separate chart colors.
- Landing page = centered logo + three identical cards ("CRM / Data Entry / Books").
- Login = gradient bg + gradient icon tile + gradient divider.
- Donut chart for lead status (hard to compare), 6 dashboard tabs hiding most data behind clicks.
- `alert()` / `confirm()` for errors and deletes.
- Inter everywhere, no identity tied to a **Hindi book publisher in Bihar/Jharkhand**.

## 3. Design direction (proposal)

**Identity: "publisher's ledger".** The product is about paper challans, books and districts — lean into that instead of generic SaaS.

- **Surface:** warm paper off-white (`#FAF8F4`), white panels separated by 1px hairlines, not shadows. Ink-navy text (`#1B2333`).
- **One accent:** a book-spine vermilion/brick (e.g. `#B4432B`) for primary actions only. Status colors are semantic and muted (green = interested, amber = due, red = overdue, grey = closed) and used the same way on every screen.
- **Type:** a serif for page titles and the brand (Fraunces or Source Serif 4), Inter/IBM Plex Sans for UI, **tabular numerals** (IBM Plex Mono or `font-variant-numeric: tabular-nums`) for counts, phone numbers, challan numbers. Mukta or Noto Sans Devanagari for उपहार प्रकाशन.
- **Icons:** `lucide-react` (SVG, tree-shaken), only where they carry meaning (nav, call, WhatsApp). Remove decorative ones.
- **Density:** 13–14px body, 36–40px table rows, sticky headers. Numbers right-aligned.
- **Motion:** 150 ms fades on drawers/toasts, skeletons that match final layout. Nothing bouncy.

## 4. Layout / UX changes

**App shell**
- Desktop top bar with global search (**Ctrl+K** command palette): jump to a lead by name, phone, institute or challan no., or run actions ("New challan", "Export leads"). Pattern from Linear/Attio.
- Sidebar grouped: **Work** (Today, Follow-ups, Leads) · **Data** (Challans, Import, Books) · **Insights** (Dashboard, Daily Brief) · **Admin** (Reps, Access requests). Collapsible to icons. Pending-access count lives here, not only on mobile.
- Mobile bottom nav: Today · Leads · Follow-ups · More (telecallers use phones; Records is rarely needed on mobile).
- One login page that routes by account type, instead of the three-card landing page.

**Today / Follow-ups (highest-value screen)**
- **Call mode:** one lead at a time — name, institute, district, books given, last call outcome, big "Call" (`tel:`) + "WhatsApp" buttons, outcome buttons on keys **1–6**, reschedule picker, then auto-advance to the next lead. Progress "7 of 23 today".
- List mode keeps Overdue / Today / Upcoming but as one table with a group header, not four colored boxes. Remove the hidden 50-row cap (paginate).

**Leads**
- Filters synced to the URL (`?district=Patna&status=interested`) so back button and shared links work. Filter chips with ✕, "Clear all".
- Saved views: "My overdue", "Patna interested", "No contact in 30 days".
- Dense table, row click → existing drawer; bulk select → assign rep / schedule follow-up / export.

**Lead detail**
- Header: name, institute, status pill, phone (copy + call), primary actions.
- One unified timeline (challans, books, calls, WhatsApp, follow-ups) instead of separate cards.
- AI summary collapsed by default, labelled with when it was generated.

**Dashboard**
- Drop the 6 tabs → one scrolling page: KPI strip (plain numbers + change vs last 30 days) → "Needs attention" (overdue + due today) → district bar (horizontal, sorted) → reps table → books table.
- Replace donut with a single horizontal stacked bar for lead status.
- Date-range + district filter at top that applies to everything.

**Data entry (`/de`)**
- Keyboard-first: Tab order matches the paper challan, Enter = "Save & next", pincode → district autofill, book typeahead with quantity steppers, inline duplicate warning while typing the phone (not after submit).

**Feedback**
- Toasts (sonner) instead of `alert()`; confirm dialogs instead of `confirm()`; empty states with one action ("No leads in Patna yet — Import Excel").

## 5. Phases

| Phase | Work | Exit criteria |
|---|---|---|
| 0 — Fix | Bugs #1–13 | Books user gets 403 on `/api/export`; dashboard numbers match SQL counts; rep filter and phone search work; AI summary sees call history. |
| 1 — Foundation | Tokens in `@theme`, fonts, lucide, primitives (Button, Input, Select, Badge, Table, Drawer, Dialog, Toast), `todayIST()`, Next 16 + xlsx upgrade | `npm run build` + lint clean; no hex colors in components. |
| 2 — Shell | Grouped sidebar, top bar, Ctrl+K palette, single login, mobile nav | All pages reachable by keyboard; no 404 links. |
| 3 — Screens | Follow-ups call mode → Leads → Lead detail → Dashboard → DE form → Books | Each screen reviewed by eye. |
| 4 — Hardening | Server-side import revalidation + batched RPC, webhook signature, rate limit, per-user CRM accounts | Spec acceptance criteria in `todo.md` pass. |

## Sources
- AI-UI fingerprints: [Spot the slop — Kosta Canatselis](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c), [Why your AI keeps building the same purple gradient website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website), [noqta — AI design slop patterns 2026](https://noqta.tn/blog/ai-design-slop-overused-ui-patterns-fix-2026), [superdesign — why AI design looks generic](https://www.superdesign.dev/blog/why-ai-design-looks-generic)
- CRM layout: [eseospace — intuitive CRM dashboard](https://eseospace.com/blog/how-to-design-an-intuitive-crm-dashboard/), [eseospace — UI patterns for CRM](https://eseospace.com/blog/the-best-ui-patterns-for-crm-applications/), [Edana — data tables](https://edana.ch/?p=51533)
- Command palette / shortcuts: [saasui — command palette](https://www.saasui.design/glossary/command-palette), [Attio navigation](https://attio.com/help/reference/attio-101/navigating-attio), [Linear shortcuts help](https://linear.app/changelog/2021-03-25-keyboard-shortcuts-help)
- xlsx CVEs: [SheetJS advisory CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533.html), [GitLab advisory CVE-2024-22363](https://advisories.gitlab.com/npm/xlsx/CVE-2024-22363/)
