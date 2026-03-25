# EchoStats 🎵

> Self-hosted Spotify analytics dashboard — discover insights about your listening habits.

EchoStats is a self-hosted web application that connects to your Spotify account, tracks your listening history, and provides beautiful visualizations and analytics about your music taste.

## Features

- 🔐 Spotify OAuth authentication
- 📊 Listening habit analytics (top artists, tracks, genres)
- 📈 Interactive charts and data visualizations
- 📋 Data tables with pagination, sorting, and filtering
- 🎯 Personalized music recommendations
- 🎵 Playlist management
- 📱 Progressive Web App (PWA) — installable on any device
- 🏠 Self-hosted — your data stays with you
- 📚 Comprehensive documentation site
- 🔍 Full historical data import support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+ / FastAPI |
| Frontend | Next.js 16 / React 19 / TypeScript |
| Database | MongoDB 7 |
| Cache | Redis 7 |
| Task Queue | ARQ (async Redis queue) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Data Tables | TanStack Table |
| Docs | Astro Starlight |
| Telemetry | Umami (self-hosted) |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/spotify-devs/echostats.git
cd echostats

# Copy environment file
cp .env.example .env
# Edit .env with your Spotify API credentials

# Start with Docker Compose
docker compose up -d
```

Visit `http://localhost:3000` to access EchoStats.

## Documentation

Full documentation is available at the [docs site](./docs/).

## Development

See the [Contributing Guide](./docs/src/content/docs/contributing/) for development setup instructions.

## License

MIT License — see [LICENSE](./LICENSE) for details.
