# 🚀 Gemini Prompt: Create Google Tasks for Duove Backend (Step 1)

**Role:** Act as my senior software engineering mentor.  
**Project:** Duove – a private, multi-tenant Express.js backend for couples, using Supabase for Auth/DB, Docker for local dev, and Fly.io for deployment.  

**Goal:** I am a first-year CS student executing **Step 1: Foundation & Scheduled Reminders**. I need you to use your Google Tasks extension to create a fully structured task list for me to complete over the next 10 days.

---

## Instructions for Gemini:

1. **Use your Google Tasks integration** to create a new Task List named **"Duove Backend – Step 1"**.
2. Add **exactly 18 tasks** (listed below) to this list.
3. For each task, set:
   - **Title:** The exact title provided.
   - **Details/Notes:** Paste the specific description/commands from the list below.
   - **Date/Due:** Spread the due dates evenly across the next 10 calendar days (start from tomorrow). Assign 1-3 tasks per day.
   - **Priority:** Map the provided priority (High/Medium/Low) to Google Tasks' star system (Starred = High, unstarred = Medium/Low). Please star all "High" priority items.

---

## The Task List:

### Phase 1: Project Setup (Days 1-2)
**Task 1:** Initialise Node.js & TypeScript  
- **Priority:** High  
- **Description:** Run `mkdir duove-backend && cd duove-backend`. Run `npm init -y`. Install dev dependencies: `npm install -D typescript @types/node ts-node nodemon`. Run `npx tsc --init` and set `"target": "ES2020"` and `"outDir": "./dist"` in `tsconfig.json`. Create `src/` folder.

**Task 2:** Install Production Dependencies  
- **Priority:** High  
- **Description:** Install `express`, `cors`, `helmet`, `morgan`, `winston`, `dotenv`, `jsonwebtoken`, `@supabase/supabase-js`, `express-rate-limit`, `node-cron`. Also install their type definitions (e.g., `@types/express`) as dev dependencies.

---

### Phase 2: Configuration (Days 2-3)
**Task 3:** Environment Variables & Config Module  
- **Priority:** High  
- **Description:** Create `.env` with `PORT`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `NODE_ENV`. Create `src/config/env.ts` to load these using `dotenv` and export them.

**Task 4:** Set up Winston Logging  
- **Priority:** Medium  
- **Description:** Create `src/config/logger.ts`. Configure Winston with `console` and `file` transports (logs to `logs/error.log` and `logs/combined.log`). Learn why structured logging matters in production.

**Task 5:** Create Supabase User Client Factory  
- **Priority:** High  
- **Description:** Create `src/config/supabase.ts`. Export a function `createUserClient(accessToken: string)` that initializes the Supabase client with the user's JWT in the headers. **CRITICAL:** Do NOT use the service role key here.

---

### Phase 3: Middleware & Core Logic (Days 3-5)
**Task 6:** Write Authentication Middleware  
- **Priority:** High  
- **Description:** Create `src/middleware/auth.ts`. Write middleware that extracts the Bearer token from `Authorization` header, verifies it using `jsonwebtoken` and `SUPABASE_JWT_SECRET`, and attaches `req.user` (containing `sub`, `email`, etc.).

**Task 7:** Create Daily Usage Database Table  
- **Priority:** High  
- **Description:** Run this SQL in the Supabase SQL Editor: `CREATE TABLE daily_usage ( user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, date DATE NOT NULL, letter_count INT DEFAULT 0, qa_count INT DEFAULT 0, PRIMARY KEY (user_id, date) ); ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY; CREATE POLICY user_own ON daily_usage FOR ALL USING (user_id = auth.uid());`.

**Task 8:** Write Daily Limit Service Functions  
- **Priority:** High  
- **Description:** Create `src/services/limitService.ts`. Implement `checkDailyLimit(accessToken, userId, action)` (returns allowed/remaining) and `incrementDailyUsage(accessToken, userId, action)`. Enforce 5 letters and 5 Q&As per day.

**Task 9:** Write Daily Limit Middleware  
- **Priority:** High  
- **Description:** Create `src/middleware/dailyLimit.ts`. Write a factory function `dailyLimitMiddleware(action)` that checks the limit via the service and returns a `429` if exceeded. Attach the `accessToken` and `action` to `req` for later use.

---

### Phase 4: Scheduler & Routes (Days 5-7)
**Task 10:** Create Scheduler Service (Cron Job)  
- **Priority:** Medium  
- **Description:** Create `src/services/scheduler.ts`. Use `node-cron` to schedule a job at `08:00 UTC` daily. For now, just log `"Daily reminder: Time to check in with your partner!"`. This proves the "schedule reminder" concept.

**Task 11:** Write Health Check Route  
- **Priority:** Medium  
- **Description:** Create `src/routes/health.ts`. Add a GET `/health` route that returns `{ status: 'ok', timestamp, uptime }`.

**Task 12:** Build the Main Entry Point (`index.ts`)  
- **Priority:** High  
- **Description:** Create `src/index.ts`. Wire up `express()`, apply `helmet`, `cors`, `express.json`, `morgan`. Mount the health router. Call `startScheduler()`. Start the server on the port from env.

---

### Phase 5: Docker & Testing (Days 6-8)
**Task 13:** Write Dockerfile for Express App  
- **Priority:** Low  
- **Description:** Create a `Dockerfile` in the root using `node:18-alpine`. Copy `package*.json`, run `npm install`, copy the rest of the source, expose port 3000, and set the dev command (`npm run dev`).

**Task 14:** Write docker-compose.yml  
- **Priority:** Low  
- **Description:** Create `docker-compose.yml` with two services: `postgres` (using official `postgres:15-alpine`) and `express` (building from the Dockerfile). Mount volumes for live code reloading.

**Task 15:** Install Jest and Supertest  
- **Priority:** Low  
- **Description:** Run `npm install -D jest @types/jest ts-jest supertest @types/supertest`. Run `npx ts-jest config:init`. Adjust `package.json` to add `"test": "jest"`.

**Task 16:** Write Health Check Integration Test  
- **Priority:** Medium  
- **Description:** Create `src/__tests__/health.test.ts`. Write a test using `supertest` that hits `/health` and asserts a `200` status and `{ status: 'ok' }`. Modify `index.ts` to export the `app` and only start listening if `NODE_ENV !== 'test'`.

---

### Phase 6: Deployment (Days 8-10)
**Task 17:** Deploy to Fly.io  
- **Priority:** High  
- **Description:** Install the Fly CLI (`flyctl`). Login via `flyctl auth login`. Create a `fly.toml` (configure port 3000, internal port, and health checks). Set secrets using `flyctl secrets set SUPABASE_URL=... SUPABASE_JWT_SECRET=...`. Run `flyctl deploy`.

**Task 18:** Validate Live Endpoint  
- **Priority:** High  
- **Description:** Visit `https://[your-app-name].fly.dev/health` in your browser or use `curl`. Confirm it returns a successful JSON response. Ensure the scheduler logs are visible in the Fly.io logs (`flyctl logs`).

---

## Final Instruction to Gemini:
Once you have created all 18 tasks, please confirm by replying: **"✅ Google Tasks for 'Duove Backend – Step 1' have been created with appropriate due dates and priorities. Good luck, and let me know when you finish the health check!"**

--- 
*End of Prompt*