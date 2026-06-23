# Duove: Project Master Plan

## Project Overview
**Duove** is a private, multi-tenant web application designed exclusively for couples. It serves as a secure, shared digital space offering health tracking, daily connection prompts, and highly stylized digital letters. The architecture ensures that every pair's data is completely isolated from the rest of the user base.

---

## 1. The Technology Stack

This project utilizes a decoupled architecture (Approach B) to maximize control over backend security and API design.

### Frontend: The Interface
* **Core:** React.js powered by Vite.
    * *Why:* Vite provides an exceptionally fast local development server. React's component-based structure is ideal for managing the complex states of the cycle calendar and multi-step Q&A forms.
* **Styling & UI:** Tailwind CSS.
    * *Why:* Allows for rapid styling directly in the markup. The design language will utilize a minimalist, dark-mode aesthetic with sharp, high-contrast accents and modern brutalist typography to make the UI feel distinct and personal.
* **Animations:** Framer Motion.
    * *Why:* Essential for building complex, scroll-linked animations. This will power the interactive "love letter" envelopes that open dynamically as the user scrolls down the page.

### Backend: The Engine
* **Core:** Node.js with Express.js.
    * *Why:* Taking full control of the backend allows for custom middleware logic. This is critical for building a robust REST API that validates the strict two-person relationship boundaries before interacting with the database.
* **Authentication & Security:** JWT via HttpOnly Cookies & Argon2id.
    * *Why:* Implementing an industry-standard token rotation system prevents XSS attacks. The middleware will act as a strict gatekeeper, verifying session validity and relationship status on every request.

### Database & Storage: The Vault
* **Core:** Supabase (PostgreSQL).
    * *Why:* Provides an enterprise-grade relational database on a generous free tier. The `Relationships` table will act as the central pivot for all data queries.
* **Data Isolation:** Row Level Security (RLS).
    * *Why:* Even with a custom Express backend, enabling PostgreSQL RLS adds a secondary, database-level fail-safe to guarantee that one couple's data can never bleed into another's.
* **Media Storage:** Supabase Storage (Private Buckets).
    * *Why:* Images for the Q&A and audio files for the letters must be kept secure. The Express server will generate temporary Presigned URLs to grant fleeting access to these assets.

---

## 2. Core Feature Modules

### Module A: The Pairing System (Auth & Linking)
* **Mechanic:** Users register independently. A unique 6-digit alphanumeric invite code is generated. When entered by the partner, a junction row is created linking their User IDs.
* **Testing:** During local development, the API can be tested by generating two dummy accounts (e.g., linking Jed and Yanz) to ensure the middleware successfully restricts data access to that specific pairing.

### Module B: Cycle Tracker & Predictor
* **Mechanic:** A calendar interface allowing the female partner to log cycle start and end dates.
* **Logic:** The backend will calculate a rolling average of the last 3-6 logged cycles rather than a static 28-day rule. This algorithmic approach accurately accommodates cycle irregularities and forecasts the upcoming phases.

### Module C: Remarks & Cravings Board
* **Mechanic:** A simple, real-time CRUD (Create, Read, Update, Delete) module.
* **Logic:** Acts as a shared bulletin board where requests (e.g., food cravings, specific needs) can be posted, updated, and marked as "fulfilled."

### Module D: Scroll-Animated Letters & Audio
* **Mechanic:** Users draft rich-text letters and attach audio (Spotify track IDs or uploaded MP3s).
* **Logic:** The frontend intercepts the scroll event. Using Framer Motion, the scrolling action maps to the SVG transform properties of an envelope graphic, revealing the text and triggering the Web Audio API or iframe player.

### Module E: Daily Q&A with Blind Reveal
* **Mechanic:** A daily prompt (e.g., "What made you smile today?") is assigned via a server Cron job.
* **Logic:** Users can submit text and upload an image (saved to a private Supabase bucket). The API obscures the partner's submission. Only when both payloads are confirmed as submitted will the backend unlock and return the combined data.

---

## 3. Development Roadmap

### Phase 1: Foundation & Security (Weeks 1-2)
1. Initialize the monorepo structure (Vite Frontend + Express Backend).
2. Set up the Supabase PostgreSQL database and configure local environment variables.
3. Build the authentication REST API (Register, Login, Token generation).
4. Implement the invite-code pairing logic and the relationship-validation middleware.

### Phase 2: Utility Features (Weeks 3-4)
1. Develop the database schema for the Cycle Tracker and the algorithmic prediction logic.
2. Build the API and React components for the Remarks/Cravings board.
3. Establish data validation using Zod to ensure secure input sanitization.

### Phase 3: Engagement Features (Weeks 5-6)
1. Write the Cron jobs and database schemas for the Daily Q&A.
2. Implement file upload handling in Express, securely piping buffers to Supabase Storage.
3. Build the "blind reveal" conditional logic for the Q&A endpoints.

### Phase 4: Aesthetics & Polish (Weeks 7-8)
1. Apply the minimalist dark-mode styling across all components.
2. Build the interactive Framer Motion sequence for the Love Letters.
3. Integrate the audio player seamlessly into the letter UI.
4. Final security audit and deployment (e.g., Vercel for Frontend, Render for Backend).
