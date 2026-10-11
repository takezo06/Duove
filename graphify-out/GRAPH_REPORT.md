# Graph Report - Duove  (2026-10-12)

## Corpus Check
- Corpus is ~47,552 words - fits in a single context window. You may not need a graph.

## Summary
- 621 nodes · 1218 edges · 35 communities (24 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Pages & Cycle UI
- Backend Config & Services
- Backend Package Manifest
- Database Schema
- shadcn UI Primitives
- Supabase Edge Functions
- shadcn Config
- Frontend TS Config
- Frontend App TS Config
- Backend Dependencies
- Frontend Package Manifest
- Frontend Dependencies
- Backend Dev Dependencies
- Frontend Dev Dependencies
- Auth & Protected Routing
- Backend TS Config
- Cycle Prediction Engine
- Express App & Health
- Daily Q&A Service
- Calendar & Cycle Widgets
- Vite Node TS Config
- Root Package Manifest
- ESLint Config
- Backend Scripts
- Frontend Scripts
- Toast Notifications
- Vite Config
- Partner Support Tip
- Q&A Card
- Vercel Rewrites
- Env Setup Script

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 35 edges
2. `react` - 35 edges
3. `usePageTitle()` - 31 edges
4. `supabase` - 24 edges
5. `react-router-dom` - 23 edges
6. `cn()` - 22 edges
7. `logger` - 19 edges
8. `compilerOptions` - 19 edges
9. `App()` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `getPartnerDisplayName()` --calls--> `createServiceClient()`  [EXTRACTED]
  duove-backend/src/routes/relationships.ts → duove-backend/src/config/supabaseAdmin.ts
- `App()` --calls--> `ProtectedLayout()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/layouts/ProtectedLayout.tsx
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/components/ProtectedRoute.tsx → frontend/src/context/AuthContext.tsx
- `CyclePopupProps` --references--> `phaseColors`  [EXTRACTED]
  frontend/src/components/cycle/CyclePopup.tsx → frontend/src/components/cycle/constants.ts
- `Card()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/card.tsx → frontend/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (35 total, 11 thin omitted)

### Community 0 - "Frontend Pages & Cycle UI"
Cohesion: 0.05
Nodes (84): App(), BentoGrid(), CalendarGrid(), CycleCircle(), CycleHeader(), CycleHeaderProps, CyclePopup, CycleSkeleton() (+76 more)

### Community 1 - "Backend Config & Services"
Cohesion: 0.05
Nodes (53): config, colors, consoleFormat, format, levels, logger, transports, createUserClient() (+45 more)

### Community 2 - "Backend Package Manifest"
Cohesion: 0.06
Nodes (34): author, description, axios, express-rate-limit, express-validator, @supabase/supabase-js, @types/node, typescript (+26 more)

### Community 3 - "Database Schema"
Cohesion: 0.12
Nodes (31): idx_audit_logs_created_at, idx_audit_logs_user_id, idx_cravings_relationship_id, idx_cravings_user_id, idx_cycle_logs_relationship_id, idx_cycle_logs_start_date, idx_cycle_logs_user_id, idx_daily_usage_date (+23 more)

### Community 4 - "shadcn UI Primitives"
Cohesion: 0.12
Nodes (23): Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+15 more)

### Community 5 - "Supabase Edge Functions"
Cohesion: 0.20
Nodes (4): getUserId(), corsHeaders, handleOptions(), createSupabaseClients()

### Community 6 - "shadcn Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 7 - "Frontend TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, ignoreDeprecations, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 8 - "Frontend App TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "Backend Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, axios, cors, dotenv, express, express-rate-limit, express-validator, helmet (+11 more)

### Community 10 - "Frontend Package Manifest"
Cohesion: 0.11
Nodes (18): axios, @supabase/supabase-js, @types/node, typescript, name, private, type, version (+10 more)

### Community 11 - "Frontend Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, axios, @base-ui/react, class-variance-authority, clsx, @fontsource-variable/geist, framer-motion, lucide-react (+10 more)

### Community 12 - "Backend Dev Dependencies"
Cohesion: 0.12
Nodes (16): devDependencies, jest, nodemon, supertest, ts-jest, @types/cors, @types/express, @types/helmet (+8 more)

### Community 13 - "Frontend Dev Dependencies"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+8 more)

### Community 14 - "Auth & Protected Routing"
Cohesion: 0.21
Nodes (9): ProtectedRoute(), Sidebar(), AuthContext, AuthContextType, AuthProvider(), useAuth(), LOADING_MESSAGES, ProtectedLayout() (+1 more)

### Community 15 - "Backend TS Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, outDir, rootDir, skipLibCheck, strict (+4 more)

### Community 17 - "Express App & Health"
Cohesion: 0.24
Nodes (7): createApp(), router, router, cors, helmet, morgan, supertest

### Community 18 - "Daily Q&A Service"
Cohesion: 0.25
Nodes (4): getCurrentPrompt(), getPromptByDate(), QAAnswer, QAPrompt

### Community 19 - "Calendar & Cycle Widgets"
Cohesion: 0.33
Nodes (5): CalendarDay, CalendarGridProps, phaseColors, CycleCircleProps, CyclePopupProps

### Community 20 - "Vite Node TS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 21 - "Root Package Manifest"
Cohesion: 0.25
Nodes (7): dependencies, express-rate-limit, express-validator, ws, express-rate-limit, express-validator, ws

### Community 22 - "ESLint Config"
Cohesion: 0.29
Nodes (6): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 23 - "Backend Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, test:watch

### Community 24 - "Frontend Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

## Knowledge Gaps
- **42 isolated node(s):** `@types/cors`, `@types/express`, `@types/helmet`, `@types/jest`, `@types/jsonwebtoken` (+37 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 319 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Backend Config & Services` to `Express App & Health`, `Backend Package Manifest`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `@types/cors`, `@types/express`, `@types/helmet` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Pages & Cycle UI` be split into smaller, more focused modules?**
  _Cohesion score 0.050193548387096776 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Frontend Pages & Cycle UI` to `shadcn UI Primitives`, `Frontend Package Manifest`, `Auth & Protected Routing`, `Calendar & Cycle Widgets`, `Q&A Card`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `Backend Config & Services` be split into smaller, more focused modules?**
  _Cohesion score 0.054136874361593465 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Frontend Pages & Cycle UI` to `shadcn UI Primitives`, `Frontend Package Manifest`, `Auth & Protected Routing`, `Calendar & Cycle Widgets`, `Toast Notifications`, `Partner Support Tip`, `Q&A Card`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Backend Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._