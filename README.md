<div align="center">

# 🎵 EchoStats 🎧

### Your music. Your data. Your server.

*Self-hosted Spotify analytics dashboard — 40+ pages of deep insights into your listening habits.*

[![Release](https://img.shields.io/github/v/release/spotify-devs/echostats?style=for-the-badge&logo=github&color=7c3aed)](https://github.com/spotify-devs/echostats/releases)
[![License](https://img.shields.io/github/license/spotify-devs/echostats?style=for-the-badge)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/spotify-devs/echostats/ci.yml?style=for-the-badge&logo=github-actions&label=CI)](https://github.com/spotify-devs/echostats/actions)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?style=for-the-badge&logo=docker)](https://github.com/spotify-devs/echostats/pkgs/container/echostats-api)

<br />

**[Quick Start](#-quick-start-5-minutes)** · **[Features](#-features)** · **[API Reference](#-api-reference)** · **[Docs](./docs/)** · **[Releases](https://github.com/spotify-devs/echostats/releases)**

<br />

<sub>Think Spotify Wrapped — but year-round, with 40+ pages, running on **your** server.</sub>

</div>

---

## 🎶 What is EchoStats?

EchoStats connects to your Spotify account, **syncs your listening history** automatically every 15 minutes, and serves up beautiful dashboards with deep insights — top artists, genre breakdowns, music DNA, listening patterns, mood analysis, and much more.

```bash
# Get your analytics snapshot
curl http://localhost:8000/api/v1/analytics/overview \
  -H "Cookie: session=<jwt>"
```

<details>
<summary>📦 Example Response</summary>

```json
{
  "total_tracks_played": 1796,
  "total_hours": 93.7,
  "unique_artists": 14,
  "unique_tracks": 25,
  "listening_streak_days": 90,
  "top_artists": [
    { "name": "Taylor Swift", "play_count": 273, "rank": 1 },
    { "name": "Ed Sheeran", "play_count": 210, "rank": 2 }
  ],
  "top_genres": [
    { "name": "pop", "play_count": 1395 },
    { "name": "hip hop", "play_count": 249 }
  ],
  "avg_audio_features": {
    "danceability": 0.74, "energy": 0.78,
    "valence": 0.65, "acousticness": 0.15
  }
}
```

</details>

---

## 📊 Features

<table>
<tr>
<td width="50%">

### 🎛️ 40+ Dashboard Pages
Charts, patterns, listening habits, music DNA, taste profile, mood & vibe, timeline, calendar heatmap, year-in-review, wrapped, and more.

### 📈 Listening Analytics
Top tracks, artists, genres with time-range filters — week, month, 90 days, year, or all-time.

### 🧬 Music DNA
Audio feature radar chart — danceability, energy, valence, acousticness, tempo, speechiness.

### 🗺️ Artist Map
Explore connections between artists with play share pie charts and sortable artist grid.

</td>
<td width="50%">

### 🔄 Auto-Sync Engine
Background worker syncs your Spotify data every 15 minutes and refreshes analytics automatically.

### 🎨 6 Themes + Custom Accents
Dark, Light, Dim, Ocean, Midnight, Forest — plus 8 accent colors and a custom color picker.

### 📱 PWA (Installable)
Install on phone or desktop. Works on any device with responsive mobile-first design.

### 📥 History Import
Import your full Spotify extended streaming history JSON from the privacy data export.

</td>
</tr>
<tr>
<td>

### 🎵 Playback Control
Play, pause, skip, view queue, switch devices — right from the dashboard.

### 📋 API & Sync Monitoring
API logs dashboard with status distribution, latency, and paginated log table. Sync jobs with step-by-step detail view.

</td>
<td>

### 🔔 Update Notifications
Banner in dashboard when a newer version is available on GitHub — with one-click link to release notes.

### 🏠 Self-Hosted & Private
Docker Compose or Helm chart. Your data never leaves your server. Single-user auto-login for personal deployments.

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
                          ┌─────────────────────┐
                          │    🌐 Browser / PWA   │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Next.js Frontend   │  ← 42 pages, Tailwind, Framer Motion
                          │   (SSR + React 19)   │
                          └──────────┬──────────┘
                                     │ /api/* proxy
                          ┌──────────▼──────────┐
                          │    FastAPI Backend    │  ← 30+ REST endpoints, JWT auth
                          │    (Python 3.12)      │
                          └───┬──────────────┬───┘
                              │              │
                   ┌──────────▼───┐   ┌──────▼──────┐
                   │   MongoDB 7   │   │   Redis 7   │
                   │  (Beanie ODM) │   │  (Cache +   │
                   │   Documents   │   │   Queue)    │
                   └──────────────┘   └──────┬──────┘
                                             │
                                   ┌─────────▼─────────┐
                                   │   ARQ Worker       │  ← Cron: sync every 15min
                                   │   (Background)     │     Analytics every 6h
                                   └───────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:----------|:--------|
| **Frontend** | Next.js 16 · React 19 · TypeScript | SSR dashboard with 42 pages |
| **Styling** | Tailwind CSS 4 · Framer Motion | 6 themes, spring animations, responsive |
| **Charts** | Recharts | Bar, pie, radar, heatmap visualizations |
| **Tables** | TanStack Table | Sortable, filterable, paginated data tables |
| **Backend** | Python 3.12 · FastAPI · Pydantic | REST API with 30+ endpoints |
| **Database** | MongoDB 7 · Beanie ODM | Document storage for all analytics data |
| **Cache/Queue** | Redis 7 · ARQ | Background sync + task scheduling |
| **Container** | Docker · Helm 3 | Kubernetes-ready OCI deployment |
| **CI/CD** | GitHub Actions | Lint, test, build, publish to GHCR |
| **Docs** | Astro Starlight | Documentation site |

---

## 🚀 Quick Start (5 Minutes)

### 1️⃣ Create a Spotify App

Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → Create App → Set redirect URI:

```
http://localhost:8000/api/v1/auth/callback
```

### 2️⃣ Clone & Configure

```bash
git clone https://github.com/spotify-devs/echostats.git
cd echostats
cp .env.example .env
```

Edit `.env` — set your Spotify credentials and generate secrets:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
ENCRYPTION_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

### 3️⃣ Launch

```bash
docker compose up -d
```

### 4️⃣ Connect

Visit **http://localhost:3000** → Click **Connect with Spotify** → Data syncs automatically 🎉

<details>
<summary>✅ Verify Installation</summary>

```bash
# All 5 services should be healthy
docker compose ps

# API health check
curl http://localhost:8000/api/health
# → {"status":"healthy","service":"echostats-api","version":"v0.8.0"}

# Check for updates
curl http://localhost:8000/api/health/update
# → {"current_version":"v0.8.0","latest_version":"v0.8.0","update_available":false}
```

</details>

---

## ☸️ Kubernetes / Helm

```bash
helm install echostats oci://ghcr.io/spotify-devs/charts/echostats \
  --namespace echostats --create-namespace \
  --set spotify.clientId=YOUR_CLIENT_ID \
  --set spotify.clientSecret=YOUR_SECRET \
  --set security.jwtSecret=$(python -c "import secrets; print(secrets.token_hex(32))") \
  --set security.encryptionKey=$(python -c "import secrets; print(secrets.token_hex(32))")
```

See [`helm/echostats/values.yaml`](./helm/echostats/values.yaml) for all options (replicas, resources, ingress, TLS).

---

## 📡 API Reference

All endpoints under `/api/v1/` require JWT auth via session cookies (set automatically at login).

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/v1/analytics/overview?period=all_time` | Full analytics snapshot |
| `GET` | `/api/v1/tracks/top?period=month&limit=50` | Top tracks by play count |
| `GET` | `/api/v1/artists/top?period=year&limit=20` | Top artists by play count |
| `GET` | `/api/v1/genres/distribution?period=all_time` | Genre breakdown with counts |
| `GET` | `/api/v1/history?page=1&limit=50` | Paginated listening history |
| `GET` | `/api/v1/playlists` | User's playlists |
| `GET` | `/api/v1/player/current` | Currently playing track |
| `POST` | `/api/v1/sync-jobs/trigger` | Trigger manual data sync |
| `GET` | `/api/v1/sync-jobs/stats` | Sync job statistics |
| `GET` | `/api/health` | Health check + version |
| `GET` | `/api/health/update` | Check GitHub for updates |

📖 **Full 38-endpoint reference** → [docs/api/endpoints](./docs/src/content/docs/api/endpoints.mdx)

🔗 **Swagger UI** → `http://localhost:8000/api/docs`

---

## 🌱 Development

```bash
# Start MongoDB + Redis
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongodb redis

# API (terminal 1)
cd api && uv run uvicorn app.main:app --reload --port 8000

# Web (terminal 2)
cd web && pnpm dev

# Seed test data
cd api && uv run python seed.py
```

<details>
<summary>🧪 Seed Data Contents</summary>

| Data | Count |
|:-----|:------|
| 🎤 Artists | 15 (Taylor Swift, Drake, The Weeknd, Ariana Grande, …) |
| 🎵 Tracks | 25 with full audio features |
| 📜 History | ~1,800 plays across 90 days |
| 📁 Playlists | 5 (Chill Vibes, Workout Bangers, Late Night Drive, …) |
| 📊 Analytics | 4 snapshots (week / month / year / all-time) |
| 📋 API Logs | ~360 entries with 5% error rate |
| 🔄 Sync Jobs | 6 jobs (5 completed + 1 failed) |

</details>

```bash
# Lint & Test
make lint         # ruff (Python) + biome (TypeScript)
make test         # pytest + vitest
make format       # Auto-format all code
```

---

## 🤝 Contributing

Contributions welcome! See the [development guide](./docs/src/content/docs/contributing/development.mdx) for setup details.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

[MIT License](./LICENSE) — use it, modify it, self-host it.

---

<div align="center">

**[📖 Docs](./docs/)** · **[🐛 Report Bug](https://github.com/spotify-devs/echostats/issues)** · **[💡 Request Feature](https://github.com/spotify-devs/echostats/issues)** · **[📦 Releases](https://github.com/spotify-devs/echostats/releases)**

<br />

<sub>Made with 🎵 by the EchoStats community</sub>

</div>
