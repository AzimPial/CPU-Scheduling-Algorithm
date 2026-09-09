# Deployment — Algo

This project has two parts:

1. **Frontend (static site)** → hosted free on **GitHub Pages** at `https://azimpial.github.io/CPU-Scheduling-Algorithm/`
2. **Backend API (+ database)** → hosts data, login, and cloud scenarios

The backend is split into:

- **Database:** MongoDB Atlas (M0, free, 512 MB) — stores users, scenarios, settings
- **API server:** Express (Node.js) in `backend/`, deployed on **Render** (free tier) — the only piece that talks to the database

> GitHub Pages can only serve static files. It cannot run Node.js. MongoDB Atlas is a database only (its old "Data API" was removed Sep 2025). So the API server must run somewhere — Render free tier runs the existing `backend/` code with zero ongoing cost.

---

## 1. Create the free MongoDB Atlas cluster

1. Go to **https://cloud.mongodb.com** → log in.
2. Create a **new project** (free tier allows one M0 cluster per project).
3. **Build a Database** → choose the **M0** free tier → pick a region near you → **Create Cluster** (takes 1–3 min).
4. **Database Access** (left menu) → **Add New Database User**:
   - Username: e.g. `algoUser`
   - Password: generate a strong one and **save it somewhere safe**
   - Privileges: **Atlas admin**
5. **Network Access** (left menu) → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
   - Required because Render servers use dynamic IPs. Keep a strong DB password — this is normal for a course project, but the database _is_ reachable from any IP.
6. Cluster overview → **Connect** → **Drivers** (Node.js) → copy the connection string.
7. Fix the string:
   - Replace `<username>` with your DB username
   - Replace `<password>` with the real password
   - Set the database name to `algo` (after the `.net/`)

   Example:
   ```
   mongodb+srv://algoUser:YourRealPassword@cluster0.ab12cd3.mongodb.net/algo?retryWrites=true&w=majority
   ```

> **Never commit this string to the repo.** It goes only into Render's environment variables or a local `backend/.env` (which is gitignored). If the string is ever shared publicly, reset the DB password in Atlas → Database Access.

---

## 2. Deploy the backend on Render (automated via Blueprint)

A `render.yaml` Blueprint is included in the repo so Render creates the service for you.

1. Go to **https://dashboard.render.com** → **New** → **Blueprint**.
2. Select the `CPU-Scheduling-Algorithm` repository.
3. Render reads `render.yaml` and offers a **Web Service** named `algo-backend` (root `backend`, build `npm install`, start `npm start`, health check `/api/health`).
4. It will prompt you to fill in two values (they are **not** stored in the repo):
   - `MONGODB_URI` — the corrected connection string from step 1
   - `JWT_SECRET` — any long random string, e.g. `x7Kp2$mQw9!zLc4#`
5. Click **Apply** → wait for a green **Live** status (~2–5 min).
6. **Copy the service URL**, e.g. `https://algo-backend.onrender.com`.

> When the code changes after this, deploy the update with **Manual Deploy** → <latest commit> inside the service, or push and Render rebuilds on new commits (depending on the auto-deploy setting).

---

## 3. Manual alternative (same result, more clicking)

Create a **Web Service** instead of a Blueprint:

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** Free
- **Environment** (add before/after deploy):

| Key | Value |
| --- | --- |
| `MONGODB_URI` | the connection string from step 1 |
| `JWT_SECRET` | long random string |
| `CORS_ORIGIN` | `https://azimpial.github.io` |
| `PORT` | leave blank (Render sets it) |

---

## 4. Connect the frontend

The whole app talks to the API through one file: `assets/js/core/api.js`:

```js
const API_BASE_URL = 'https://algo-backend.onrender.com'; // ← change to your Render URL
```

> Optional runtime override without re-deploying:
> `localStorage.setItem('algo_api_url', 'https://algo-backend.onrender.com')` in the browser console on the Pages site.

Change that constant, commit, push — GitHub Pages rebuilds automatically.

---

## 5. Verify

1. Backend: open `https://<your-app>.onrender.com/api/health` → `{"status":"ok"}`
2. Frontend (published site):
   - **Log in / Sign up** → profile chip appears in the top bar
   - Run an algorithm → your last run saves as a **Cloud** scenario
   - **Settings** → change theme/decimal precision → sign in on another browser → settings persist & scenarios are listed
3. `GET /api/health` returns `ok` from an external device too (proves CORS is fine).

---

## 6. Troubleshooting

- **First request is slow (30–50 s):** Render free tier sleeps after ~15 min idle. It wakes on the next request — click again.
- **`401` on login right after deploy:** wait for the health check to pass (`/api/health` shows `ok`).
- **Backend reachable but login fails / `MONGODB_URI` error:** double-check the Atlas password and that Network Access is `0.0.0.0/0`.
- **CORS errors in the console:** confirm `CORS_ORIGIN` = `https://azimpial.github.io` (the Pages URL, no trailing slash).

---

## 7. Local development (optional)

```bash
# backend/.env  (gitignored)
MONGODB_URI=mongodb+srv://algoUser:YourRealPassword@cluster0.ab12cd3.mongodb.net/algo?retryWrites=true&w=majority
JWT_SECRET=some-local-dev-secret
CORS_ORIGIN=http://localhost:8090
PORT=3000

cd backend
npm install
npm start        # → http://localhost:3000/api/health
```

Serve the site from the repo root (any static server):
```bash
python3 -m http.server 8090    # → http://localhost:8090
```

The frontend's `API_BASE_URL` points at your Render URL; for local testing use the
`algo_api_url` localStorage override to `http://localhost:3000`.