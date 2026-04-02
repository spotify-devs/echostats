# Contributing to EchoStats

Thanks for your interest in contributing to EchoStats! This guide covers setup, conventions, and the PR process.

## Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 22+
- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- A Spotify Developer app ([create one here](https://developer.spotify.com/dashboard))

### Quick Start

```bash
# Clone the repo
git clone https://github.com/spotify-devs/echostats.git
cd echostats

# Copy environment template
cp .env.example .env
# Edit .env with your Spotify credentials, secrets, etc.

# Start all services (MongoDB, Redis, API, Worker, Web)
docker compose -f docker-compose.dev.yml up
```

The app will be available at `http://localhost:3000`.

### Running Services Individually

**API (backend):**
```bash
cd api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Worker (background jobs):**
```bash
cd api
uv run arq app.tasks.worker.WorkerSettings
```

**Web (frontend):**
```bash
cd web
pnpm install
pnpm dev
```

## Code Style

### Python (API)
- **Linter/Formatter:** [Ruff](https://docs.astral.sh/ruff/) — config in `api/pyproject.toml`
- **Type checking:** mypy (strict)
- **Logging:** Always use `structlog`, never `print()`
- **Line length:** 100 characters
- Run: `cd api && uv run ruff check . && uv run ruff format .`

### TypeScript (Web)
- **Linter/Formatter:** [Biome](https://biomejs.dev/) — config in `web/biome.json`
- **Type checking:** TypeScript strict mode
- **Styling:** Tailwind CSS
- Run: `cd web && npx biome check . && npx tsc --noEmit`

## Testing

### Before Submitting a PR
```bash
# Backend tests
cd api && uv run pytest tests/ -q

# Frontend type check
cd web && npx tsc --noEmit
```

### Writing Tests
- Place tests in `api/tests/`
- Use `pytest` with `asyncio` mode (auto)
- Mock external services (Spotify API, MongoDB) — don't require real connections
- Name test files `test_<module>.py`

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/<description>` | `feat/weekly-digest` |
| Bug fix | `fix/<description>` | `fix/sync-duplicates` |
| Docs | `docs/<description>` | `docs/api-reference` |
| Chore | `chore/<description>` | `chore/update-deps` |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add weekly digest email
fix: prevent duplicate listening history records
docs: add architecture overview
chore: update Python dependencies
```

## Pull Request Process

1. Create a branch from `main`
2. Make your changes
3. Ensure lint + tests pass
4. Push and open a PR
5. Fill out the PR template
6. Wait for CI checks and review
