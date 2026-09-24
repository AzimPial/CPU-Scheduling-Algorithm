# Algo — CPU Scheduling Algorithm Visualizer

*Watch your algorithms think.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2ea44f)](https://azimpial.github.io/CPU-Scheduling-Algorithm/)
[![API](https://img.shields.io/badge/API-Render%20%C2%B7%20MongoDB-0969da)](https://algo-backend-lia7.onrender.com/api/health)
[![Algorithms](https://img.shields.io/badge/algorithms-30-f97316)](https://azimpial.github.io/CPU-Scheduling-Algorithm/)
[![Tests](https://img.shields.io/badge/tests-329%20passing-a3be8c)](https://raw.githubusercontent.com/AzimPial/CPU-Scheduling-Algorithm/main/tests/run.mjs)
[![Zero Dependencies](https://img.shields.io/badge/build-none%20%7C%20zero%20deps-556b8e)](https://github.com/AzimPial/CPU-Scheduling-Algorithm/blob/main/README.md#tech-stack)
[![License: MIT](https://img.shields.io/badge/license-MIT-6f42c1)](LICENSE)

An interactive, chat-based web application for visualizing and comparing **30 CPU scheduling algorithms**, built for university operating systems courses. Configure a set of processes, run any algorithm (or several at once), and instantly see animated Gantt charts, full metrics, step-by-step traces, and automatic verdicts.

![Welcome](assets/screenshots/welcome.png)

---

## Live Demo

Live app (GitHub Pages): **[https://azimpial.github.io/CPU-Scheduling-Algorithm/](https://azimpial.github.io/CPU-Scheduling-Algorithm/)**

Live API (Render): `https://algo-backend-lia7.onrender.com/api/health` → `{"status":"ok"}`

---

## What It Does

Algo lets you **configure a set of processes**, pick a scheduling algorithm (or compare several at once), and instantly see:

- An **animated Gantt chart** showing exactly when each process runs
- A **results table** with waiting time, turnaround time, response time, throughput, and CPU utilization
- A **step-by-step trace** you can play, pause, or step through manually, with a live ready-queue view
- In **Compare Mode** — side-by-side Gantt charts, bar charts, auto-generated verdicts, and ranked results
- **Inline process editing** — tweak arrival/burst (or quantum) after the fact and watch the schedule re-render live
- **Chat-based sessions** — every run is a message in a conversation; sessions persist across visits and sync to the cloud when you're logged in

---

## Screenshots

### FCFS — Result View
![FCFS Result](assets/screenshots/fcfs-result.png)

### Round Robin — Result View
![Round Robin Result](assets/screenshots/rr-result.png)

### Compare Mode — Side-by-Side Analysis
![Compare Mode](assets/screenshots/compare-result.png)

---

## Features

### Scheduling & Visualization
- **30 Scheduling Algorithms** — Classical, Real-Time, Fair-Share, and Modern/OS, each with its own Info panel (pseudocode, complexity, when to use it)
- **Two Modes** — Visualize (single algorithm) and Compare (side-by-side)
- **Animated Gantt Charts** — Staggered block animations for visual clarity
- **Step-by-step Trace** — Play / Pause / Step through schedules with a live ready-queue visualization
- **Live Results Editor** — Edit process fields or the time quantum after a run; results re-render automatically (debounced)
- **Real-Time Scheduling** — Periodic task model with deadline-miss detection over the hyperperiod and schedulability verdicts
- **Rich Metrics** — Avg waiting / turnaround / response time, throughput, CPU utilization, context switches
- **Comparative Analysis** — Side-by-side Gantt charts, Chart.js bar charts, per-process turnaround chart, auto-verdicts, and a ranked leaderboard
- **Colorblind-safe palette** — Okabe-Ito inspired CVD palettes, toggleable from Settings

### Chat, Sessions & Cloud
- **Chat-based UI** — Conversational interface with labeled user/assistant messages
- **Session History** — Sidebar with saved chats; runs are grouped into conversations
- **Accounts & Login** — Sign up / log in, change password, log out of all devices
- **Cloud Sync** — Logged-in sessions sync to the backend and restore cross-device
- **Shareable URLs** — Encode a full scenario in the URL (`?s=...`) for instant sharing
- **Export** — Download results as CSV, or export a run as PDF / PNG

### Appearance & Behavior
- **Theme** — Light / Dark / System, persisted without flash-of-unstyled-content
- **Settings** — Animation speed, decimal precision, default landing module, auto-run on input change
- **Keyboard Shortcuts** — `Enter` to run, `R` to randomize, `Esc` to close modals, `Ctrl/Cmd+N` for a new chat
- **Fully Responsive** — Works on desktop and mobile
- **Accessibility** — ARIA labels, focus-visible rings, reduced-motion support
- **Print Stylesheet** — Clean report view for printing or saving as PDF

---

## Algorithms Implemented

### Classical (10)

| Algorithm | Type | Description |
|-----------|------|-------------|
| FCFS | Non-Preemptive | Processes run in arrival order — simplest and fair |
| SJF | Non-Preemptive | Shortest burst first — optimal for avg waiting time |
| SRTF | Preemptive | Shortest remaining time — globally optimal for avg wait |
| Priority (NP) | Non-Preemptive | Scheduled by priority value |
| Priority (P) | Preemptive | Highest priority always preempts |
| Round Robin | Preemptive | Fair time-sharing with configurable quantum |
| HRRN | Non-Preemptive | Highest Response Ratio Next — avoids starvation |
| Aging SRTF | Preemptive | SRTF with waiting-time aging to prevent starvation |
| Multilevel Queue | Mixed | 2-level: RR foreground + FCFS background |
| MLFQ | Preemptive | 3-level feedback queue with priority boost |

### Real-Time (9)

| Algorithm | Type | Description |
|-----------|------|-------------|
| Rate Monotonic | Fixed Priority | Priority assigned by period (shorter = higher) |
| EDF | Dynamic Priority | Earliest absolute deadline runs first |
| Deadline Monotonic | Fixed Priority | Priority by relative deadline |
| Least Laxity First | Dynamic Priority | Smallest laxity (slack) runs first |
| RM (Non-Preemptive) | Fixed Priority | Rate Monotonic without preemption |
| EDF (Non-Preemptive) | Dynamic Priority | Earliest Deadline First without preemption |
| Priority Inheritance | Fixed Priority | Bounds priority inversion through inheritance |
| Fixed Priority NP | Fixed Priority | Explicit priority, non-preemptive |
| Polling Server | Server | Periodic server for aperiodic job handling |

### Fair-Share (6)

| Algorithm | Type | Description |
|-----------|------|-------------|
| Weighted Round Robin | Weighted RR | Time slice proportional to weight |
| Weighted Fair Queuing | Virtual-Time | Simulates bit-by-bit round robin fairness |
| Fair Share (nice) | Weighted | CPU weight derived from Unix nice value |
| Deficit Round Robin | Weighted RR | Deficit counters for exact fairness |
| Lottery | Probabilistic | Weighted random ticket draws for scheduling |
| Dynamic Fair Share | Weighted | Weight + nice with waiting-time aging |

### Modern / OS (5)

| Algorithm | Type | Description |
|-----------|------|-------------|
| CFS | Fair Share | Linux Completely Fair Scheduler — vruntime fairness |
| BFS | Fair Share | BrainFuck Scheduler — virtual-deadline interactive model |
| SCHED_DEADLINE | Real-Time | Linux EDF-based real-time scheduling class |
| OmniVR | Hybrid | Priority + deadline-urgency ranking |
| Idle Balancing | Fair Share | Least-served-first load-balanced queue |

> **Note:** MLQ/MLFQ, WFQ, CFS, BFS, SCHED_DEADLINE, OmniVR, Polling Server, and Priority Inheritance are **faithful educational simulations** — assumptions are documented in each algorithm's Info panel.

---

## Tech Stack

### Frontend (static, GitHub Pages)

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, flexbox, CSS grid) |
| Logic | Vanilla JavaScript — ES Modules, ES2022 |
| Charts | Chart.js v4.4.4 (CDN; comparison bar charts) |
| Export | html2canvas + jsPDF (CDN; PDF/PNG export) |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Build | **None** — zero dependencies, zero bundler |

The scheduling engine runs **100% in the browser**. The app is fully usable with no account; the backend only adds authentication, cloud sync, and settings persistence for logged-in users.

### Backend (optional account layer, Render)

| Layer | Technology |
|-------|-----------|
| API server | Node.js + Express 4 |
| Database | MongoDB (Mongoose) — MongoDB Atlas free tier |
| Authentication | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Middleware | CORS, dotenv |
| Hosting | Render free tier (Blueprint via `render.yaml`) |

---

## Project Structure

```
├── index.html                  ← App shell (main chat UI)
├── login.html                  ← Account login / sign-up page
├── package.json                ← Frontend npm test harness only
├── render.yaml                 ← Render Blueprint — deploys the backend
├── DEPLOYMENT.md               ← End-to-end deployment guide
├── assets/
│   ├── css/
│   │   ├── base.css            ← Design tokens, reset, typography, themes
│   │   ├── components.css      ← Buttons, forms, cards, tables, modals
│   │   ├── gantt.css           ← Gantt chart styles and animations
│   │   ├── chat.css            ← Chat UI, sidebar, input bar, messages
│   │   └── landing.css         ← Welcome screen styles
│   ├── js/
│   │   ├── app.js              ← Main application controller
│   │   ├── algorithms/         ← 30 pure scheduling functions (one per file)
│   │   ├── core/
│   │   │   ├── types.js        ← Algorithm registry, categories, validation
│   │   │   ├── validators.js   ← Per-field and per-algorithm validation
│   │   │   ├── metrics.js      ← Response time, throughput, aggregates
│   │   │   ├── engine.js       ← Reusable event-driven scheduling engine
│   │   │   ├── rtEngine.js     ← Periodic real-time / hyperperiod engine
│   │   │   ├── api.js          ← Backend API wrapper (auth, cloud sync)
│   │   │   ├── settings.js     ← Settings state management
│   │   │   └── storage.js      ← Chat persistence, URL state, cloud import
│   │   └── ui/
│   │       ├── chatThread.js   ← Chat message rendering
│   │       ├── sidebar.js      ← Session history sidebar
│   │       ├── inputBar.js     ← Algorithm picker + process form
│   │       ├── processForm.js  ← Dynamic, field-driven process table
│   │       ├── resultsTable.js ← Results table + metrics cards + CSV
│   │       ├── resultsEditor.js← Inline post-run process editing
│   │       ├── ganttRenderer.js← Gantt + trace controls
│   │       ├── modal.js        ← Algorithm info + shortcuts modals
│   │       ├── settings.js     ← Settings modal
│   │       ├── shareExport.js  ← PDF / PNG / shareable-link export
│   │       ├── login.js        ← Login / sign-up logic
│   │       └── theme.js        ← Theme init and toggling
│   └── screenshots/            ← README images
├── backend/
│   ├── server.js               ← Express app bootstrap
│   ├── package.json            ← Backend dependencies & scripts
│   ├── config/db.js            ← MongoDB (Mongoose) connection
│   ├── middleware/authMiddleware.js ← JWT verification
│   ├── models/                 ← Mongoose schemas
│   │   ├── User.js
│   │   └── Chat.js
│   └── routes/                 ← API route handlers
│       ├── auth.js             ← signup / login / me / password / logout-all
│       ├── scenarios.js        ← chat list / upsert / delete
│       └── settings.js         ← get / update user settings
└── tests/
    └── run.mjs                 ← Dependency-free test suite (329 checks)
```

---

## API

The frontend talks to the backend through `assets/js/core/api.js`. Base URL defaults to the live Render service; you can override it at runtime with `localStorage.setItem('algo_api_url', '<url>')`.

All routes expect/return JSON. Authenticated routes require an `Authorization: Bearer <token>` header (JWT, valid 7 days).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Liveness probe → `{"status":"ok"}` |
| POST | `/api/auth/signup` | — | Create account: `{username, password}` → `{token, username}` |
| POST | `/api/auth/login` | — | Log in: `{username, password}` → `{token, username}` |
| GET | `/api/auth/me` | ✓ | Current user → `{username}` |
| PATCH | `/api/auth/password` | ✓ | Change password: `{oldPassword, newPassword}` |
| POST | `/api/auth/logout-all` | ✓ | Invalidate all sessions (token version bump) |
| GET | `/api/scenarios` | ✓ | List the user's cloud chats |
| POST | `/api/scenarios` | ✓ | Upsert a chat: `{clientChatId, title, messages}` |
| DELETE | `/api/scenarios/:clientChatId` | ✓ | Delete a cloud chat |
| GET | `/api/settings` | ✓ | Get user settings |
| PATCH | `/api/settings` | ✓ | Update user settings |

> Passwords are stored as bcrypt hashes; tokens are signed JWT. Secrets (`MONGODB_URI`, `JWT_SECRET`) live only in `backend/.env` (gitignored) or Render environment variables — never commit them.

---

## Getting Started

### Run the frontend locally

The app uses **ES modules** (`<script type="module">`), so browsers block it from loading via `file://`. Serve over HTTP:

```bash
# Python 3
python3 -m http.server 8000
# → open http://localhost:8000

# Node.js
npx serve .
```

No build step required — this is a static HTML/CSS/JS site. Everything (including all 30 algorithms) works without the backend.

### Run the backend locally (optional)

```bash
# backend/.env  (gitignored)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.ab12cd3.mongodb.net/algo
JWT_SECRET=some-local-dev-secret
CORS_ORIGIN=http://localhost:8000
PORT=3000

cd backend
npm install
npm start        # → http://localhost:3000/api/health
```

Point the frontend at it from the browser console:
`localStorage.setItem('algo_api_url', 'http://localhost:3000')`.

### Run tests

```bash
npm test        # or: node tests/run.mjs
```

Verifies result-shape validity for all 30 algorithms, textbook regressions (SJF order, RR slices, FCFS times, HRRN order), SRTF optimality, EDF feasibility/deadline detection, WFQ/CFS weighting, preemptive vs. non-preemptive priority behavior, and lottery determinism.

---

## Deployment

The live deployment is split across two free hosts:

1. **Frontend** — static site on **GitHub Pages** at `https://azimpial.github.io/CPU-Scheduling-Algorithm/` (deploy from the `main` branch, root folder; no build step).
2. **Backend** — Express API on **Render** (free tier, auto-deployed from `render.yaml`) + **MongoDB Atlas** (M0 free cluster).

> GitHub Pages can only serve static files, so the API runs independently on Render. See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full step-by-step guide (creating the Atlas cluster, wiring `MONGODB_URI` / `JWT_SECRET`, and connecting the frontend).

---

## Contributors

| Contributor | Role |
|-------------|------|
| **[Azim Pial](https://github.com/AzimPial)** | Project Lead, Core Development |
| **[Naayma Sultana](https://github.com/NaaymaSultana)** | Contributor |

---

## License

MIT — see [LICENSE](LICENSE).