.PHONY: help dev build test lint clean docker-up docker-down

VERSION ?= $(shell cat VERSION)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────────────────────────

dev: ## Start all services in development mode
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-api: ## Start API server in dev mode
	cd api && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web: ## Start web frontend in dev mode
	cd web && pnpm dev

dev-docs: ## Start docs site in dev mode
	cd docs && pnpm dev

# ── Build ────────────────────────────────────────────────────────────────────

build: ## Build all Docker images
	docker compose build

build-api: ## Build API Docker image
	docker build -t echostats-api:$(VERSION) -f api/Dockerfile .

build-web: ## Build web Docker image
	docker build -t echostats-web:$(VERSION) -f web/Dockerfile .

# ── Testing ──────────────────────────────────────────────────────────────────

test: test-api test-web ## Run all tests

test-api: ## Run API tests
	cd api && uv run pytest -v

test-web: ## Run web tests
	cd web && pnpm test

# ── Linting ──────────────────────────────────────────────────────────────────

lint: lint-api lint-web ## Run all linters

lint-api: ## Lint API code
	cd api && uv run ruff check . && uv run mypy .

lint-web: ## Lint web code
	cd web && pnpm lint

format: ## Format all code
	cd api && uv run ruff format .
	cd web && pnpm format

# ── Docker ───────────────────────────────────────────────────────────────────

docker-up: ## Start all services
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-logs: ## View logs
	docker compose logs -f

docker-clean: ## Remove all containers, volumes, and images
	docker compose down -v --rmi all

# ── Database ─────────────────────────────────────────────────────────────────

db-shell: ## Open MongoDB shell
	docker compose exec mongodb mongosh echostats

db-seed: ## Seed database with test data
	docker compose cp api/seed.py api:/app/seed.py
	docker compose exec api uv run python seed.py

# ── Misc ─────────────────────────────────────────────────────────────────────

clean: ## Clean build artifacts
	rm -rf api/.venv api/__pycache__ api/.pytest_cache api/.mypy_cache api/.ruff_cache
	rm -rf web/node_modules web/.next web/out
	rm -rf docs/node_modules docs/dist
