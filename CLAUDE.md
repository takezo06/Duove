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

**Read `frontend/DESIGN.md` before any UI work.** It is the full spec: colors, type scale, spacing, radius, buttons, inputs, states, motion, copy, and a list of older files that still break it. The essentials:

- Dark, warm, personal: a shared journal for two people, not a SaaS dashboard. Dark-only, system sans, rose is the one accent.
- Use the primitives in `src/components/Card.tsx` (`surface`, `inset`, `focusRing`, `primaryButton`, `secondaryButton`, `iconClass`, `Badge`, `CardHeader`, `Avatar`, `CategoryPill`) and helpers in `src/lib/`. Never re-type their classes; a new shared style goes into those files first.
- Copy from the reference pages (Dashboard `BentoGrid.tsx`, Cravings, Partner, Notifications, QAHistory, Sidebar), never from files in DESIGN.md's "Known drift" table. When you fix a drift item, delete its row.
- Banned: gradients, blur/glass, glow blobs, sparkle icons, emoji, icon-in-a-square decoration, uppercase tracked labels, hover scale/lift, undefined `animate-*` classes, em dashes in copy, `neutral-500` for readable text, `window.confirm`, `console.error`-only errors.

## Privacy and cookies

- New device storage (localStorage, cookies) or a third-party embed goes through `src/lib/consent.ts` and gets an item in `pages/CookiePolicy.tsx`. When what Duove collects, shares or stores changes, update the policies (`/privacy`, `/terms`, `/cookies`) and their `updated` date.

## Git

- Commit only to the `new-feats` branch. Don't create new branches.
- No Claude attribution (`Co-Authored-By` or similar) in commits or PRs.

## Working on the UI

- `cd frontend && npm run preview:mock` serves the real app on http://localhost:5199 with Supabase and the backend faked (`frontend/preview/mocks/`). Scenarios: `?scenario=default|empty|returning|unpaired`, or the switcher in the bottom-right corner. When a page calls a new endpoint, add it to `preview/mocks/axios.ts`.
- Screenshot with `playwright-cli` (`--browser=chromium` is set via `PLAYWRIGHT_MCP_BROWSER`): one desktop (1366px) and one phone (390px) shot per round, no more.
- Before finishing: `npm run build` must pass. Then delete the files `tsc -b` leaves behind (`tsconfig*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`) and stop the preview server.
- Pre-existing lint errors (`any` types, effects calling setState) are known. Don't add new ones.
