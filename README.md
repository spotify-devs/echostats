<div align="center">

# 🎵 EchoStats 🎧

**Your music. Your data. Your server.**

*Self-hosted Spotify analytics dashboard with 40+ pages of insights into your listening habits.*

[![GitHub Release](https://img.shields.io/github/v/release/spotify-devs/echostats?style=flat-square&logo=github&label=Release)](https://github.com/spotify-devs/echostats/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/spotify-devs/echostats-api?style=flat-square&logo=docker&label=Docker%20Pulls)](https://ghcr.io/spotify-devs/echostats-api)

</div>

---

## 🎶 What is EchoStats?

EchoStats is a **self-hosted** Spotify analytics platform that connects to your Spotify account, syncs your listening history automatically, and serves up beautiful dashboards with deep insights into your music taste. Think Spotify Wrapped — but year-round, with 40+ pages, and running on *your* server.

```bash
# Get your analytics snapshot with a single call
curl http://localhost:8000/api/v1/analytics/overview \
  -H "Cookie: session=<your_jwt_token>"
```

```json
{
  "top_artists": [
    { "name": "Taylor Swift", "play_count": 342, "total_minutes": 1026 },
    { "name": "The Weeknd", "play_count": 218, "total_minutes": 741 }
  ],
  "top_tracks": [
    { "title": "Anti-Hero", "artist": "Taylor Swift", "play_count": 87 }
  ],
  "top_genres": ["pop", "r&b", "indie rock", "hip-hop"],
  "listening_hours": 486.2,
  "unique_artists": 312,
  "streak_days": 47
}
```

---

## 📊 Features

| Feature | Description |
|---------|-------------|
| 🎛️ **40+ Dashboard Pages** | Charts, patterns, listening habits, music DNA, taste profile, mood analysis, year-in-review, and more |
| 📈 **Listening Analytics** | Top tracks, artists, genres with time-range filters (week / month / year / all-time) |
| 🧬 **Music DNA** | Audio feature radar — danceability, energy, valence, acousticness, tempo, and more |
| 🗺️ **Artist Map** | Explore connections between your favorite artists with play share distribution |
| 🔄 **Sync Engine** | Auto-syncs your Spotify data every 15 minutes via ARQ background worker |
| 🔐 **Single-User Auto-Login** | Self-hosted mode: auto-authenticates when only one user exists |
| 🎨 **6 Themes + 8 Accent Colors** | Dark, Light, Dim, Ocean, Midnight, Forest — plus a custom color picker |
| 📱 **PWA** | Install on any device (mobile / desktop), works offline |
| 📥 **Data Import** | Import your full Spotify extended streaming history (JSON from privacy export) |
| 🎵 **Spotify Playback Control** | Play / pause / skip, view queue, switch devices — right from the dashboard |
| 📋 **API Logs Dashboard** | Monitor Spotify API calls with status distribution, latency stats, and pagination |
| 🔍 **Sync Job Tracking** | View step-by-step sync progress with detailed API call history |
| 🔔 **Update Notifications** | Dashboard banner when a new version is available on GitHub |
| 🏠 **Self-Hosted** | Docker Compose deployment — your data stays on your server |
| ☸️ **Helm Chart** | Kubernetes deployment via OCI registry |
| 🏷️ **Version Indicator** | Deployed version shown in sidebar + API health endpoint |

---

## 🏗️ Architecture

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌───────┐
│ Next.js  │────▶│ FastAPI   │────▶│ MongoDB  │     │ Redis │
│ Frontend │◀────│ API       │◀────│ Database │     │ Cache │
└─────────┘     └──────────┘     └──────────┘     └───────┘
                      │                               │
                      ▼                               │
                ┌──────────┐                          │
                │ ARQ      │──────────────────────────┘
                │ Worker   │ (cron: sync + analytics)
                └──────────┘
```

- **Next.js Frontend** — SSR dashboard with 40+ pages, Tailwind styling, Framer Motion animations
- **FastAPI API** — 30+ REST endpoints handling auth, analytics, playback, and sync
- **MongoDB** — Document storage for users, tracks, artists, history, and computed analytics
- **Redis** — Caching layer + message broker for the ARQ task queue
- **ARQ Worker** — Background cron that syncs Spotify data every 15 minutes and refreshes analytics

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 / React 19 / TypeScript | SSR dashboard with 42 pages |
| Styling | Tailwind CSS 4 / Framer Motion | 6 themes + spring animations |
| Charts | Recharts | Interactive data visualizations |
| Data Tables | TanStack Table | Sortable, filterable, paginated tables |
| Backend | Python 3.12 / FastAPI | REST API with 30+ endpoints |
| Database | MongoDB 7 / Beanie ODM | Document storage for analytics |
| Cache / Queue | Redis 7 / ARQ | Background sync + task queue |
| Container | Docker / Helm | Kubernetes-ready deployment |
| CI/CD | GitHub Actions | Automated testing + GHCR image publishing |
| Docs | Astro Starlight | Documentation site |

---

## 🚀 Quick Start (5 Minutes)

### 1. Create a Spotify App

Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), create an app, and set the redirect URI to:

```
http://localhost:8000/api/v1/auth/callback
```

### 2. Clone and Configure

```bash
git clone https://github.com/spotify-devs/echostats.git
cd echostats

cp .env.example .env
```

Edit `.env` with your Spotify credentials and generate secrets:

```bash
# Set your Spotify app credentials
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# Generate secrets (run these commands and paste the output)
python -c "import secrets; print(secrets.token_hex(32))"   # → JWT_SECRET
python -c "import secrets; print(secrets.token_hex(32))"   # → ENCRYPTION_KEY
```

### 3. Start the Stack

```bash
docker compose up -d
```

This launches **5 services**: MongoDB, Redis, FastAPI API, ARQ Worker, and the Next.js frontend.

### 4. Connect Your Spotify Account

Visit **[http://localhost:3000](http://localhost:3000)** and click **Connect with Spotify**. Your data will start syncing automatically.

### Verify the Installation

```bash
# Check all services are healthy
docker compose ps

# Test the API
curl http://localhost:8000/api/health
# → {"status":"healthy","service":"echostats-api","version":"0.1.0"}
```

---

## ☸️ Helm / Kubernetes

Deploy to Kubernetes with the OCI-hosted Helm chart:

```bash
helm install echostats oci://ghcr.io/spotify-devs/charts/echostats \
  --set spotify.clientId=YOUR_CLIENT_ID \
  --set spotify.clientSecret=YOUR_SECRET \
  --set security.jwtSecret=YOUR_JWT_SECRET \
  --set security.encryptionKey=YOUR_ENCRYPTION_KEY
```

The chart deploys all five components (MongoDB, Redis, API, Worker, Web) with configurable replicas, resource limits, ingress, and autoscaling. See [`helm/echostats/values.yaml`](./helm/echostats/values.yaml) for the full list of options.

---

## 📡 API Reference

All endpoints are under `/api/v1/` and require JWT authentication via session cookies (except health checks).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/overview` | Analytics snapshot (top artists, tracks, genres, stats) |
| `GET` | `/api/v1/tracks/top` | Top tracks by play count |
| `GET` | `/api/v1/artists/top` | Top artists by play count |
| `GET` | `/api/v1/history` | Listening history with pagination |
| `GET` | `/api/v1/genres/distribution` | Genre breakdown |
| `POST` | `/api/v1/sync-jobs/trigger` | Trigger manual data sync |
| `GET` | `/api/v1/player/current` | Currently playing track |
| `GET` | `/api/health` | Health check with version |
| `GET` | `/api/health/update` | Check for newer version on GitHub |

Interactive API docs available at **[http://localhost:8000/api/docs](http://localhost:8000/api/docs)** (Swagger UI).

---

## 🌱 Seed Data (Development)

Generate realistic demo data for local development:

```bash
cd api && uv run python seed.py
```

This creates:

| Data | Count |
|------|-------|
| 🎤 Artists | 15 (Taylor Swift, Drake, The Weeknd, and more) |
| 🎵 Tracks | 25 (with full audio features) |
| 📜 Listening History | ~2,000 plays across 90 days |
| 📁 Playlists | 5 (Chill Vibes, Workout Bangers, Late Night Drive, etc.) |
| 📊 Analytics Snapshots | 4 (week, month, year, all-time) |
| 🔄 Sync Jobs | 6 (with 1 failed for realism) |
| 📋 API Logs | ~300 entries across 30 days |
| 👤 Demo User | `demo@echostats.local` |

---

## 🤝 Contributing

We welcome contributions! See the [development guide](./docs/src/content/docs/contributing/development.mdx) for local setup instructions.

```bash
# Quick dev setup
make dev          # Start all services with hot-reload
make test         # Run all tests (pytest + vitest)
make lint         # Lint everything (ruff + biome)
make format       # Auto-format (ruff + biome)
```

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**[Documentation](./docs/)** · **[Report Bug](https://github.com/spotify-devs/echostats/issues)** · **[Request Feature](https://github.com/spotify-devs/echostats/issues)**

Made with 🎵 by the EchoStats community

</div>
