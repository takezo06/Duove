# Duove – Project Master Plan (Final Edition)

## 📖 Overview

**Duove** is a private, multi‑tenant web application built exclusively for couples. It provides a secure, shared digital space for health tracking, daily connection prompts, and stylized digital letters.  
This project is developed by a first‑year CS student as a learning journey to master backend engineering, authentication, containerization, and production deployment – all while keeping the operational cost at **$0**.

The core philosophy is to build **industry‑standard** practices into a side project, making it a powerful portfolio piece and a hands‑on education in full‑stack development.

---

## 🧠 Why This Stack? (Final Decisions)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React + Vite + Tailwind | Fast development, component‑based UI, and dark‑mode minimalist design. Deployed on **Vercel** (free tier). |
| **Backend** | Node.js + Express + TypeScript | Complete control over business logic (cycle calculations, validation, pairing rules). Express is the most common Node framework – learning it builds job‑ready skills. |
| **Authentication** | Supabase Auth (email + magic links) | Handles user management, JWT issuance, and OAuth. We **do not** use the service role key – instead we validate user tokens and create user‑scoped Supabase clients to enforce RLS. |
| **Database** | Supabase PostgreSQL | Provides a generous free tier (500 MB), built‑in RLS as a security backup, and real‑time subscriptions. |
| **Storage** | Supabase Storage | Secure private buckets with presigned URLs (60s expiry). Images are compressed to 200 KB client‑side to stay within the 1 GB free storage limit. |
| **Scheduling** | Supabase pg_cron | Runs scheduled jobs (daily usage reset, prompt assignment) directly inside PostgreSQL – independent of the Express server’s uptime. |
| **Rate Limiting** | `express-rate-limit` (in‑memory) | Standard middleware to prevent brute‑force attacks and abuse. |
| **Logging** | Winston + Morgan | Structured logging for debugging and auditing – essential in production. |
| **Testing** | Jest + Supertest | Unit and integration tests for API endpoints. |
| **Containerization** | Docker + docker‑compose (local dev only) | Learning Docker is an industry skill. We use it to spin up a local Postgres and Express environment, but deploy natively on Fly.io to avoid complexity. |
| **Deployment** | Fly.io | No cold starts (vs. Render), 3 free VMs, 3 GB storage. Deploy Node.js directly via buildpacks. |
| **CI/CD** | GitHub Actions | Automatically run tests and deploy on push to main. |

---

## 🏗️ Architecture (Approach B – The Dedicated API Stack)
React (Vercel) ──► Express (Fly.io) ──► Supabase (Auth, DB, Storage)


**Why this approach?**  
- We write **all validation, business logic, and pairing rules** in JavaScript/TypeScript, making it easier to test and iterate.  
- We have full control over the **cycle‑prediction algorithm** and **blind‑reveal** logic.  
- We can implement **daily usage caps** and other custom constraints without relying on complex SQL triggers.  
- We learn the entire HTTP request/response lifecycle – a fundamental skill for any backend developer.

---

## 🔐 Security Principles (Non‑Negotiable)

1. **NEVER use the Supabase service role key** in the Express server.  
   - Instead, the frontend sends the user’s JWT in the `Authorization` header.  
   - The Express server validates the JWT with the `SUPABASE_JWT_SECRET` and then creates a **user‑scoped** Supabase client for each request.  
   - This ensures that **Row Level Security (RLS)** is always enforced, even if our middleware fails.

2. **Refresh token rotation** (implemented in Step 1) – store refresh tokens in a database table and rotate them on each refresh.

3. **Rate limiting** – 100 requests per IP per 15 minutes, plus stricter limits on invite‑code attempts.

4. **Helmet.js + CORS** – security headers and restrict CORS to the frontend domain.

5. **Input validation** with Zod – all request bodies, query parameters, and route parameters are validated.

6. **Presigned URLs** expire in 60 seconds for media access.

7. **Audit logs** – all sensitive actions are logged with `req.user.id`.

---

## 📦 Core Feature Modules (Phased Rollout)

### Phase 1: Foundation & Scheduled Reminders (Weeks 1‑2)
- Express + TypeScript boilerplate  
- Auth middleware (JWT validation)  
- Daily usage limits (5 letters, 5 Q&A per user per day)  
- Cron scheduler (daily reminder) – logs a message at 08:00 UTC  
- Health check endpoint  
- Dockerised local development  
- Basic tests  
- Deploy to Fly.io  

### Phase 2: Cravings Board (Weeks 3‑4)
- Shared bulletin board – CRUD operations with real‑time updates (via Supabase Realtime)  
- Integration with daily limits middleware  
- Simple “fulfilled” toggle  

### Phase 3: Scroll‑Animated Letters (Weeks 5‑6)
- Rich‑text letters with optional image attachments (client‑side compression to 200 KB)  
- Spotify/YouTube embed for music (no audio uploads)  
- Presigned URL generation for image access  
- Daily limit enforcement (5 letters per user per day)  

### Phase 4: Weekly Q&A with Blind Reveal (Weeks 7‑8)
- Weekly prompt (not daily – reduces load and increases ritual value)  
- Both partners submit answers; answers are hidden until both have responded  
- Auto‑reveal after 24 hours (to avoid hostage dynamics)  
- Optional image attachment  

### Phase 5: Cycle Tracker & Predictor (Weeks 9‑10)
- Log cycle start/end dates (only the tracking partner)  
- Prediction algorithm: rolling average of last 3 cycles (until 6, then last 5)  
- Returns next predicted date  

### Phase 6: Mental Health Check‑in (V2, after research)
- Individual well‑being questions (e.g., mood scale, stress triggers)  
- Private by default – optional sharing with partner  
- Crisis resources displayed for high‑risk answers  

> **Note:** Mental health features are postponed to V2 to allow proper legal/ethical research and consultation.

---

## ⏳ Daily Caps – Why and How

- **Limit:** 5 letters and 5 Q&A responses per user per day.  
- **Why:**  
  - Cost control – free tiers have limits on database calls, storage, and bandwidth.  
  - Encourages meaningful interaction over spam.  
  - Mirrors real‑life communication – you can’t have 50 deep conversations daily.  
- **Implementation:**  
  - Table `daily_usage` with `user_id`, `date`, `letter_count`, `qa_count`.  
  - Middleware checks before processing a request; returns `429` if cap is reached.  
  - Counts are reset automatically each day (based on the date column – no need for a separate reset job).  

---

## 🐳 Docker Integration (Local Development Only)

We use Docker to gain hands‑on experience with containerisation – an industry standard.

- **Dockerfile** – builds the Express app.  
- **docker‑compose.yml** – runs both the Express app and a local PostgreSQL container (mirroring Supabase).  
- **Environment switching** – we use `DATABASE_URL` to point to the local Postgres for development, but still rely on Supabase for Auth and Storage.  
- **Production deployment** – we deploy directly to Fly.io (without Docker) to avoid additional complexity. This hybrid approach gives us Docker skills without over‑engineering production.

---

## 🧪 Testing Strategy

- **Unit tests:** Jest for individual functions (e.g., cycle prediction, limit calculations).  
- **Integration tests:** Supertest for API endpoints (health, auth, cravings).  
- **CI:** GitHub Actions runs tests on every push.  

---

## 🌐 Deployment Pipeline

1. **Frontend:** Vercel – automatic deploy from GitHub.  
2. **Backend:** Fly.io – deploy via `flyctl deploy`.  
   - Secrets managed with `flyctl secrets set`.  
   - Health check endpoint used for zero‑downtime updates.  
3. **Database & Storage:** Supabase – schema migrations managed via SQL scripts.  

---

## 📋 Step 1 – Detailed Task Breakdown (The Foundation)

Below are the **18 tasks** that were automatically generated as Google Tasks via Gemini. They represent the complete execution plan for Step 1.

| # | Phase | Task Title | Priority | Description |
|---|-------|------------|----------|-------------|
| 1 | Phase 1: Setup | Initialise Node.js & TypeScript | High | `mkdir duove-backend && cd duove-backend`, `npm init -y`, install `typescript`, `@types/node`, `ts-node`, `nodemon`, run `npx tsc --init`, set `"target": "ES2020"` and `"outDir": "./dist"`. Create `src/`. |
| 2 | Phase 1: Setup | Install Production Dependencies | High | Install `express`, `cors`, `helmet`, `morgan`, `winston`, `dotenv`, `jsonwebtoken`, `@supabase/supabase-js`, `express-rate-limit`, `node-cron` and their type definitions. |
| 3 | Phase 2: Config | Environment Variables & Config Module | High | Create `.env` with `PORT`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `NODE_ENV`. Create `src/config/env.ts` to load these. |
| 4 | Phase 2: Config | Set up Winston Logging | Medium | Create `src/config/logger.ts` with console + file transports. |
| 5 | Phase 2: Config | Create Supabase User Client Factory | High | Create `src/config/supabase.ts` exporting `createUserClient(accessToken)` – user‑scoped, no service key. |
| 6 | Phase 3: Auth | Write Authentication Middleware | High | Create `src/middleware/auth.ts` – verify JWT, attach `req.user`. |
| 7 | Phase 3: Limits | Create Daily Usage Table | High | Run SQL in Supabase: `CREATE TABLE daily_usage (...); ALTER TABLE ... ENABLE ROW LEVEL SECURITY; CREATE POLICY ...;`. |
| 8 | Phase 3: Limits | Write Daily Limit Service Functions | High | `src/services/limitService.ts` – `checkDailyLimit()` and `incrementDailyUsage()`. |
| 9 | Phase 3: Limits | Write Daily Limit Middleware | High | `src/middleware/dailyLimit.ts` – factory that checks limit and returns 429 if exceeded. |
| 10 | Phase 4: Scheduler | Create Scheduler Service | Medium | `src/services/scheduler.ts` – use `node-cron` to log a reminder at 08:00 UTC. |
| 11 | Phase 4: Routes | Write Health Check Route | Medium | `src/routes/health.ts` – GET `/health` returns `{ status: 'ok', uptime }`. |
| 12 | Phase 4: Main | Build index.ts Entry Point | High | `src/index.ts` – wire all middleware, mount routes, start server, call scheduler. |
| 13 | Phase 5: Docker | Create Dockerfile | Low | Write Dockerfile using Node 18 alpine. |
| 14 | Phase 5: Docker | Create docker-compose.yml | Low | Define `postgres` and `express` services with volume mounts for live reload. |
| 15 | Phase 5: Tests | Install Jest and Supertest | Low | Run install commands, configure `jest.config.js`. |
| 16 | Phase 5: Tests | Write Health Check Integration Test | Medium | Create `src/__tests__/health.test.ts` – test `/health`. |
| 17 | Phase 6: Deploy | Deploy to Fly.io | High | Install Fly CLI, login, create `fly.toml`, set secrets, `flyctl deploy`. |
| 18 | Phase 6: Deploy | Validate Live Endpoint | High | Visit `https://[app].fly.dev/health` and confirm it works. |

**Due dates:** Spread evenly over 10 days. High‑priority tasks should be completed first.

---

## 🧭 Next Steps After Step 1

Once Step 1 is complete (all 18 tasks checked off), we will proceed to:

- **Step 2:** Cravings Board – CRUD API, real‑time updates, daily limit integration.  
- **Step 3:** Letters – image uploads, presigned URLs, envelope animation on frontend.  
- **Step 4:** Q&A – weekly prompts, blind reveal logic.  
- **Step 5:** Cycle Tracker – algorithm implementation.  

Each step will be broken down into similar granular tasks for Gemini to create Google Tasks.

---

## 💰 Zero‑Cost Guarantee

| Service | Monthly Limit | Usage Projection |
|---------|---------------|------------------|
| Vercel | 100 GB bandwidth | < 1 GB for <100 couples |
| Fly.io | 3 shared VMs, 3 GB storage | < 200 MB |
| Supabase | 500 MB DB, 1 GB storage | With compression and daily caps, we stay under 500 MB |
| GitHub Actions | 2,000 min/month | < 100 min |
| Sentry (optional) | 5,000 errors/month | plenty for a side project |

**Total monthly cost: $0.**

---

## 📝 Open‑Source & Community

The code will be public on GitHub with:
- A clear `README.md` with one‑click deploy buttons.
- A `CONTRIBUTING.md` guide for community contributions.
- A `Docker` setup for self‑hosting.
- An `ARCHITECTURE.md` explaining the design decisions.

---

## ✅ Final Words

This document represents the **final, agreed‑upon** plan for Duove. It balances:

- **Learning goals** – building industry‑standard backend skills.
- **Practicality** – zero operational cost.
- **Ethics** – phased approach to mental health, security‑first mindset.
- **Real‑world relevance** – Docker, CI/CD, logging, testing, deployment.

---

**Now, let’s build it – one task at a time.** 🚀
