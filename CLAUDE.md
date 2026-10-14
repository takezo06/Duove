## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- Use it for "where is X / what calls Y / how does Z flow" questions: `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`. They return a scoped subgraph, much smaller than grep output or GRAPH_REPORT.md.
- Skip it when the task names the file to change (e.g. "redesign the Cravings page"): read that file directly.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review.
- The post-commit hook rebuilds the graph; run `graphify update .` manually only for uncommitted work you need to query.

## Backend wiring

- `VITE_BACKEND_URL` is the Supabase Edge Functions base (`…/functions/v1`). Call `${VITE_BACKEND_URL}/<function>/<path>` with no `/api/` prefix.
- Edge functions live in `duove-backend/supabase/functions/<name>/index.ts`. They are the only backend (the old Express server was removed).
- After changing an edge function, tell the user to run `supabase functions deploy <name>`. Pushing does not deploy them.

## Design system (frontend)

Dark, warm, personal. It should feel like a shared journal for two people, not a SaaS dashboard.

**Use the primitives; never re-type them**
- `src/components/Card.tsx`: `surface` (every card), `inset` (box inside a card), `focusRing`, `primaryButton`, `secondaryButton`, `iconClass`, `Badge`, `CardHeader`, `Avatar`.
- `src/lib/plural.ts` (`plural(3, 'day')`), `src/lib/relationshipYear.ts` (all anniversary/monthsary/day-count math; check: `node frontend/scripts/relationshipYear.check.ts`), `src/lib/cravingCategories.ts` (category icon + color).
- New shared style or helper → add it to one of these files, then use it everywhere.

**Color**
- Base: `neutral-950` page, `neutral-900` cards, `neutral-800` borders and selected states. Body text `neutral-200`/white, secondary `neutral-400`. Never `neutral-500` or darker for anything people need to read.
- Rose is the one brand accent: primary action (one per view), icons in card headers, the partner's name, "needs you" pills. Don't spend it on decoration.
- Status pills (`Badge`): rose = needs you, emerald = done/connected, neutral = info.
- Category colors (amber/sky/rose/violet/neutral) only mark craving categories, and appear wherever a category does. Cycle phases use `components/cycle/constants.ts`.

**Type and layout**
- System sans only. Headings `font-bold text-white` (page title `text-2xl md:text-3xl`); card labels `text-sm text-neutral-400` beside a rose icon; values `font-bold text-white tabular-nums`; counts get `toLocaleString()`.
- Page = `max-w-4xl mx-auto space-y-6` (dashboard `max-w-6xl`). The first card is the header card: who it's about (avatars or title), one-line subtitle, secondary action top-right, any form below a `border-t` divider.
- Stats are centered (icon + label, value, subtitle, pill). Content cards and lists are left-aligned.
- Profile pictures are 64px circles (`Avatar`); the partner placeholder is `Avatar dashed`.

**Making navigation feel rewarding**
- Every card that summarizes another page is a whole-card `Link` with a footer action ("Open tracker →"), hover `border-rose-400/30`.
- Show live state, not static labels: countdowns, progress bars, "2h ago", ticking counters, unread counts, "Your turn" pills.
- Personal copy with names: "What you and **Mika** are in the mood for", not "Manage your cravings".
- Every empty state says what to do next and has the button to do it. Every error is visible inline (`role="alert"`), never just `console.error`.
- Confirm destructive actions inline (Delete / Keep), never `window.confirm`.
- Phones are first-class: check 390px, keep tap targets ≥ 40px, keep primary actions after the inputs they submit.

**Banned (anti-slop; full list in the `no-ai-slop` skill)**
- Sparkle icons, emoji as icons or in UI copy, blurred glow blobs, gradients, glassmorphism, pulsing dots.
- Icon in a rounded square as decoration (the 64px avatar pair replaces "hero icons"), one-sided colored borders, uppercase tracked eyebrow labels.
- Rainbow colors without a meaning, raw machine strings ("= 588.21 days (588d, 5h)"), `animate-*` classes that aren't defined, em dashes in copy.
- Custom fonts. The serif experiment was rejected; stay with the system sans.

**Accessibility**: `focusRing` on every interactive element, `aria-label` on icon-only buttons, `aria-current="page"` for the active nav item, `aria-hidden` on decorative icons, labelled inputs.

## Working on the UI

- `cd frontend && npm run preview:mock` serves the real app on http://localhost:5199 with Supabase and the backend faked (`frontend/preview/mocks/`). Scenarios: `?scenario=default|empty|unpaired`, or the switcher in the bottom-right corner. When a page calls a new endpoint, add it to `preview/mocks/axios.ts`.
- Screenshot with `playwright-cli` (`--browser=chromium` is set via `PLAYWRIGHT_MCP_BROWSER`): one desktop (1366px) and one phone (390px) shot per round, no more.
- Before finishing: `npm run build` must pass. Then delete the files `tsc -b` leaves behind (`tsconfig*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`) and stop the preview server.
- Pre-existing lint errors (`any` types, effects calling setState) are known. Don't add new ones.
