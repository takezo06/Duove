<p align="center">
  <img src="https://raw.githubusercontent.com/takezo06/duove/main/frontend/public/duove-logo.svg" alt="Duove Logo" width="80" height="80" />
</p>

<h1 align="center">Duove</h1>

<p align="center">
  <em>The relationship‑wellness platform for modern couples</em><br/>
  <strong>Track cycles, exchange love letters, answer daily questions, and share cravings – all in one beautiful space.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Project Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/Node.js-20.x-green" alt="Node Version" />
  <img src="https://img.shields.io/badge/React-19.x-blue" alt="React Version" />
  <img src="https://img.shields.io/badge/Deno-Edge%20Functions-orange" alt="Deno Edge Functions" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-api-architecture">Architecture</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

---

## ✨ Features

### 💞 Love Letters with Spotify
* Hardware-Accelerated Fluid Animations: Interactive love letter cards that scatter beautifully outward into place from a messy stack like real paper.
* Seamless Streaming Embeds: Send heartfelt messages with attached Spotify tracks that playback right inside a realistic, lined-paper modal workspace.
* Deep Links & Notifications: Automatic relationship sync ensures your partner gets unread notification counts instantly with immediate click-through logic.

### 🗓️ Cycle Tracker & Predictor
* Log menstrual cycles, specific symptoms, mood patterns, and dynamic physical logs.
* Advanced predictive calendar grids utilizing custom phase‑colored dots to differentiate past, present, and future cycle frames.
* Flexible data initialization that renders safely before the first logged period without broken markers or cluttered templates.
* Partner-view mode lets one user inspect their partner's cycle insights (predictions, symptoms, calendar) with real-time date-range filtering.

### ❓ Daily Q&A
* Explore daily questions pulled across structured, relationship-wellness categories.
* Complete double-blind interaction mechanics: replies stay hidden until both partners have submitted their answers, with automatic 24-hour reveal.
* Interactive Q&A history dashboard to browse through everything you have answered together with pagination.
* Category preferences let couples bias future question selection.

### 🍕 Cravings Board
* Share precise requests—including specific food items, direct activities, or required emotional support.
* Interactive completion triggers allow partners to fulfill, delete, or filter active board listings in real time.
* Daily limit of 5 cravings per user, with automatic archival of fulfilled items after 24 hours.
* Real-time WebSocket-style updates via Supabase Realtime when the partner interacts.

### 🏠 Bento-Grid Dashboard
A clean workspace displaying all core platform items at a glance:
* Relational timeline counter featuring shared profile headers and days together.
* Real-time cycle phase tracker status accompanied by dynamic countdown tickers.
* Instant previews for active cravings, daily question milestones, and your newest unread love letter.

---

## 🛠 Tech Stack

| Frontend | Backend (Local Dev) | Backend (Production) | Database & Auth |
| :--- | :--- | :--- | :--- |
| React 19 (Vite + TypeScript) | Node.js 20 + Express 5 | Supabase Edge Functions (Deno) | PostgreSQL (Supabase) |
| Tailwind CSS 3 | TypeScript Core | Per-entity function handlers | Supabase Auth (JWT) |
| React Router DOM 7 | Helmet / CORS / Morgan | Shared `_shared/` utilities | Row-Level Security (RLS) |
| Axios HTTP | Winston Logger | CORS + Auth helpers | Supabase Storage Buckets |
| Framer Motion | Express Validator / Rate-Limiter | Spotify API integration | |

**Key libraries:**
- **Frontend**: `@supabase/supabase-js` v2 (auth + realtime), `axios` (API calls), `framer-motion` (animations), `lucide-react` (icons), `react-router-dom` v7
- **Backend**: `@supabase/supabase-js` v2 (two-client pattern: anon + service role), `jsonwebtoken`, `node-cron` (scheduler), `winston` (logging), `express-validator`, `express-rate-limit`
- **Database**: Full RLS policies on all tables, UUID primary keys, CASCADE deletes on relationships

---

## 🚀 Getting Started

### Prerequisites
* Node.js >= 20.x
* npm >= 9.x
* A verified Supabase Account (project with auth, database, and storage)
* A registered Spotify Developer Application (for song search/embeds)
* (Optional) Docker — for local Postgres via `docker-compose.yml`

### 1. Clone the Repository
```
git clone https://github.com/takezo06/duove.git
cd duove
```


### 2. Run the Environment Setup Script
Execute the interactive setup utility script to auto-generate localized, secure environment configs:
```
chmod +x setup-env.sh
./setup-env.sh
```


> ⚠️ **Manual Override**: If you choose to configure parameters manually, create `duove-backend/.env` and `frontend/.env.local` using the definitions outlined in the Environment Variables section below.

### 3. Initialize & Launch Backend Core
```
cd duove-backend
npm install
npm run dev
```

*The local Express API listens on port 5000. The local dev server serves as a reference implementation; production traffic flows through Supabase Edge Functions.*

### 4. Initialize & Launch Frontend Workspace
```
cd ../frontend
npm install
npm run dev
```

*The local development server launches on port 5173.*

### 5. Sync Database Models
1. Navigate directly to your Supabase SQL Editor dashboard.
2. Copy and execute the core schema query file found at `duove-backend/sql/schema.sql`.
3. Deploy the Supabase Edge Functions:
   ```
   supabase functions deploy
   ```
4. Seed baseline relationship support tips using your relational data models.

---

## 🔐 Environment Variables

The interactive setup script (`setup-env.sh`) handles creating these files safely. Ensure your live keys match these definitions:

### Backend Configuration (`duove-backend/.env`)

```
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_JWT_SECRET=your-secure-jwt-secret-string
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret
SUPABASE_ANON_KEY=your-supabase-anon-public-key
SPOTIFY_CLIENT_ID=your-spotify-developer-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-developer-client-secret
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration (`frontend/.env.local`)

In **local development**, point to the Express backend:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
VITE_BACKEND_URL=http://localhost:5000
```

In **production**, the frontend calls Supabase Edge Functions directly:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
VITE_BACKEND_URL=https://your-project-id.supabase.co/functions/v1
```

> 🛑 **Security Guardrail**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SPOTIFY_CLIENT_SECRET` into frontend builds. These represent high-privileged administrative actions restricted exclusively to server-side code (Express backend or Supabase Edge Functions with `Deno.env.get`).

---

## 📁 Project Structure
```
duove/
├── frontend/
│   ├── public/               # Static vector assets (logo, favicon, icons)
│   ├── src/
│   │   ├── App.tsx            # React Router v7 — auth-gated + public routes
│   │   ├── main.tsx           # React 19 root, AuthProvider, global CSS
│   │   ├── index.css          # Tailwind + custom animations
│   │   ├── context/           # AuthContext (Supabase session management)
│   │   ├── lib/               # supabase.ts client, utils.ts (cn helper)
│   │   ├── hooks/             # useDashboardData, useCycleData, useDailyTip, usePageTitle
│   │   ├── layouts/           # ProtectedLayout (animated loader + sidebar shell)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx    # Resizable/collapsible nav with unread badge
│   │   │   ├── BentoGrid.tsx  # Dashboard grid (6 cards)
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ui/            # shadcn-style primitives (button, card, dialog, etc.)
│   │   │   ├── cycle/         # CycleTracker components (10 files)
│   │   │   ├── love-letters/  # Envelope cards, modals, send form (6 files)
│   │   │   ├── qa/            # Deck, answer form, category modal (5 files)
│   │   │   └── profile/       # ChangePassword, DeleteAccount, DeleteRelationship
│   │   └── pages/             # 16 pages (Login, Signup, Dashboard, Cravings, LoveLetters,
│   │                          #   QA, QAHistory, CycleTracker, CycleAnalytics, CycleLog,
│   │                          #   Notifications, Partner, Profile, NotFound)
│
├── duove-backend/
│   ├── src/
│   │   ├── config/            # env.ts, logger.ts (winston), supabase.ts (user client),
│   │   │                      #   supabaseAdmin.ts (service client singleton)
│   │   ├── middleware/        # auth.ts (JWT verification), dailyLimit.ts (5/day factory)
│   │   ├── routes/            # 9 routers: health, account, cravings, cycles, letters,
│   │   │                      #   notifications, profile, qa, relationships
│   │   ├── services/          # cravingsService, cycleService (CycleEngine), lettersService,
│   │   │                      #   limitService, qaService, scheduler.ts (node-cron)
│   │   ├── app.ts             # Express server (helmet, CORS, morgan, dynamic route mount)
│   │   ├── index.ts           # Server bootstrapper + graceful shutdown
│   │   └── __tests__/         # Jest + supertest unit tests (health.test.ts)
│   ├── sql/
│   │   └── schema.sql         # Master schema: 10 tables, indexes, RLS policies
│   ├── supabase/
│   │   ├── config.toml        # Supabase CLI config (local dev + edge runtime)
│   │   └── functions/         # 9 edge functions (Deno) + _shared/ utilities
│   │       ├── _shared/        # auth.ts, cors.ts, supabase.ts (shared helpers)
│   │       ├── account/        # DELETE user account
│   │       ├── cycles/         # Cycle logging, symptoms, predictions, stats, tips
│   │       ├── cravings/       # CRUD cravings board + auto-archive + toggle
│   │       ├── health/         # Basic health ping
│   │       ├── letters/        # (Empty - legacy, love-letters is the active endpoint)
│   │       ├── love-letters/   # Primary love letters + Spotify song search
│   │       ├── notifications/  # Unread count, read, notification feed
│   │       ├── profile/        # GET/PATCH profile
│   │       ├── qa/             # Daily Q&A assignments, answers, history, skip, categories
│   │       └── relationships/  # Stats, invite, join, anniversary, delete
│   ├── docker-compose.yml     # Postgres + app containers for local dev
│   ├── Dockerfile
│   ├── jest.config.js         # Jest + ts-jest + supertest
│   └── .env                   # Live credentials (NEVER commit)
│
├── package.json               # Root workspace (placeholder deps)
└── setup-env.sh               # Interactive env file generator
```

---

## 🏗️ API Architecture

Duove uses a **dual-stack API** approach:

### Express Backend (`duove-backend/src/`) — Local Development
- Runs on **port 5000** via `npm run dev` (nodemon + ts-node)
- Full feature set: JWT auth, rate limiting, daily usage limits, input validation, Winston logging
- The auth middleware verifies the bearer token via the Supabase anon client, then routes create either a user-scoped client (RLS-respecting) or a service-role admin client (bypasses RLS)
- The daily limit middleware enforces 5 actions/day per type (letter, craving, qa) via the `daily_usage` table
- The scheduler (`scheduler.ts`) uses `node-cron` for weekly prompt assignment, answer reveals, and craving archiving — currently **disabled** (`// startScheduler(); // disabled for now`)

### Supabase Edge Functions (`supabase/functions/`) — Production
- Deployed via `supabase functions deploy`; production frontend calls them at `https://<project>.supabase.co/functions/v1`
- Each resource has its own Deno function handler with a shared utility layer (`_shared/`)
- Simpler implementation: no rate limiting or daily limits, but identical core logic for relationship resolution, cycle predictions, and double-blind Q&A reveal
- CORS-enabled with wildcard origin; auth via `getUserId()` which extracts and verifies the JWT from the `Authorization` header

### Data Flow
1. Frontend calls an API endpoint with the user's Supabase JWT as a Bearer token
2. The backend (Express or Edge Function) verifies the token and resolves the user's **active relationship**
3. All couple-scoped queries filter on `relationship_id` with RLS policies ensuring users can only access their own relationship's data
4. Partner data (stats, symptoms, profile names) is accessed via the service-role admin client to bypass RLS restrictions

---

## 📦 Deployment

### Server-Side API Target (Railway / Render / Fly.io)
The Express backend is deployed for local reference and as a fallback. For production, edge functions are the primary API:
1. Link your live project fork directly to your hosting provider workspace dashboard.
2. Bind all values from the Backend Environment Variables section into your cloud provider's app variables manager.
3. Run:
   ```
   npm run build
   npm start
   ```

### Edge Functions (Supabase)
Deploy the edge functions to Supabase:
```
cd duove-backend
supabase functions deploy
```
Ensure the following secrets are set in your Supabase project dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

### Client-Side App Target (Vercel / Netlify)
1. Establish a deployment pipeline connecting your preferred client host provider directly to the `frontend/` directory.
2. Set the build command to `npm run build` and output directory to `dist/`.
3. Supply public frontend access bindings (only `VITE_` prefixed variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` → set to your Supabase Edge Functions URL (e.g. `https://<project>.supabase.co/functions/v1`)
4. Update CORS configurations on your backend instances to permit authenticated handshakes from your production domain.

---

## 🤝 Contributing

We value open contributions to the development pipeline! To update application subsystems or propose additions:

1. Fork the repository: `https://github.com/takezo06/duove`
2. Spin up an independent feature branch: `git checkout -b feature/amazing-feature`
3. Commit localized, cleanly documented modifications: `git commit -m 'Add some amazing feature'`
   > End commit messages with: `Co-Authored-By: Claude Code <noreply@anthropic.com>`
4. Push updates to your fork origin: `git push origin feature/amazing-feature`
5. Open a Pull Request detailing all relevant alterations.

---

## 📄 License

Distributed under the terms of the open MIT License. Check out `LICENSE` for details.

<p align="center">
  Made with ❤️ by <a href="https://github.com/takezo06">takezo06</a>
</p>
