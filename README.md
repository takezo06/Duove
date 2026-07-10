<p align="center">
  <img src="https://raw.githubusercontent.com/your-username/duove/main/frontend/public/favicon.svg" alt="Duove Logo" width="80" height="80" />
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
  <img src="https://img.shields.io/badge/Node.js-18.x-green" alt="Node Version" />
  <img src="https://img.shields.io/badge/React-18.x-blue" alt="React Version" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-project-structure">Structure</a> •
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

### ❓ Daily Q&A
* Explore daily questions pulled across structured, relationship-wellness categories.
* Complete double-blind interaction mechanics: replies stay hidden until both partners have submitted their answers.
* Interactive Q&A history dashboard to browse through everything you have answered together.

### 🍕 Cravings Board
* Share precise requests—including specific food items, direct activities, or required emotional support.
* Interactive completion triggers allow partners to fulfill, delete, or filter active board listings in real time.

### 🏠 Bento-Grid Dashboard
A clean workspace displaying all core platform items at a glance:
* Relational timeline counter featuring shared profile headers and days together.
* Real-time cycle phase tracker status accompanied by dynamic countdown tickers.
* Instant previews for active cravings, daily question milestones, and your newest unread love letter.

---

## 🛠 Tech Stack

| Frontend | Backend | Database & Auth |
| :--- | :--- | :--- |
| React (Vite + TypeScript) | Node.js + Express | PostgreSQL (Supabase Client) |
| Tailwind CSS | TypeScript Core | Supabase Auth API Engine |
| React Router DOM | Helmet / CORS Guards | Robust Row-Level Security (RLS) |
| Axios HTTP | Winston & Morgan Loggers | Supabase Storage Buckets |
| Spotify Web Playback API | Express Validator / Rate-Limiter | |

---

## 🚀 Getting Started

### Prerequisites
* Node.js >= 18.x
* npm >= 9.x
* A verified Supabase Account
* A registered Spotify Developer Application Client

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/duove.git
cd duove
```bash
```

### 2. Run the Environment Setup Script
Execute the interactive setup utility script to auto-generate localized, secure environment configs:
```bash
chmod +x setup-env.sh
./setup-env.sh
```bash
```

> ⚠️ Manual Override: If you choose to configure parameters manually, create duove-backend/.env and frontend/.env.local using the definitions outlined in the configuration section below.

### 3. Initialize & Launch Backend Core
```bash
cd duove-backend
npm install
npm run dev
```bash
```

*The API gateway engine compiles automatically and listens live on port 5000.*

### 4. Initialize & Launch Frontend Workspace
```bash
cd ../frontend
npm install
npm run dev
```bash
```

*The local development server launches instantly on port 5173.*

### 5. Sync Database Models
1. Navigate directly to your Supabase SQL Editor dashboard.
2. Copy and execute the core schema query file found at duove-backend/sql/schema.sql.
3. Seed baseline relationship support tips using your relational data models.

---

## 🔐 Environment Variables

The interactive setup configuration script handles creating these files safely. Ensure your live keys match these explicit definitions:

### Backend Configuration (duove-backend/.env)
```
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
```
### Frontend Configuration (frontend/.env.local)
```
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
VITE_BACKEND_URL=http://localhost:5000
```
```

> 🛑 Security Guardrail: Never expose SUPABASE_SERVICE_ROLE_KEY or SPOTIFY_CLIENT_SECRET into frontend builds. These represent high-privileged administrative actions restricted exclusively to server-side code.

---

## 📁 Project Structure
```
```
duove/
├── duove-backend/
│   ├── src/
│   │   ├── config/          # Environment bindings, Loggers, Supabase engines
│   │   ├── middleware/       # JWT Auth verification, API Rate limiters
│   │   ├── routes/           # Endpoint controller routers
│   │   ├── services/         # Calculation rules (Cycle phase engines, logs)
│   │   ├── app.ts            # Express server initialization
│   │   └── index.ts          # Core service process bootstrapper
│   └── sql/                  # Raw schema structures and relational seeds
│
├── frontend/
│   ├── public/               # Core static vector files & metadata icons
│   ├── src/
│   │   ├── components/       # Scoped visual elements
│   │   │   ├── cycle/        # Tracking views & predictive calendars
│   │   │   ├── love-letters/ # Messy-pile grids and lined paper modals
│   │   │   └── ui/           # Primitive design atomic features
│   │   ├── hooks/            # Dedicated state query wrappers
│   │   ├── layouts/          # Context-bound sidebar responsive shell
│   │   ├── lib/              # Client API initializers & utils
│   │   ├── pages/            # View compositions mapped to routing paths
│   │   └── App.tsx           # Primary routing initialization matrix

---
```
```

## 📦 Deployment

### Server-Side API Target (Railway / Render / Fly.io)
1. Link your live project fork directly to your hosting provider workspace dashboard.
2. Bind all values present inside the Backend Environment Configuration block into your cloud provider's app variables manager.
3. Supply the primary service engine compilation and start commands:
npm run build
npm start

### Client-Side App Target (Vercel / Netlify)
1. Establish a deployment pipeline connecting your preferred client host provider directly to the project root directory.
2. Set the build directory source path context precisely to target the standalone frontend/ directory space.
3. Supply public frontend access bindings inside your hosting console (VITE_ configurations only).
4. Update CORS configurations on your primary API gateway backend instances to permit authenticated handshakes from your production web address domain.

---

## 🤝 Contributing

We value open contributions to the development pipeline! To update application subsystems or propose additions:

1. Fork the primary repository path.
2. Spin up an independent feature branch: git checkout -b feature/amazing-feature
3. Commit localized, cleanly documented modifications: git commit -m 'Add some amazing feature'
4. Push updates to your fork origin: git push origin feature/amazing-feature
5. Open a Pull Request detailing all relevant alterations.

---

## 📄 License

Distributed under the terms of the open MIT License. Check out LICENSE documentation details for further information.

<p align="center">
  Made with ❤️ by <a href="https://github.com/your-username">Your Name</a>
</p>
