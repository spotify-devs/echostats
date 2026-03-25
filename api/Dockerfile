# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy dependency files
COPY api/pyproject.toml api/uv.lock* ./

# Install dependencies into the virtual environment
RUN uv sync --no-dev --no-install-project 2>/dev/null || uv sync --no-dev --no-install-project --no-lock

# Copy application code
COPY api/app ./app
COPY api/tests ./tests

# Install the project itself
RUN uv sync --no-dev 2>/dev/null || uv sync --no-dev --no-lock

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r echostats && useradd -r -g echostats -m echostats

# Copy uv and the full app with venv from builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY --from=builder --chown=echostats:echostats /app /app

# Create uv cache directory
RUN mkdir -p /home/echostats/.cache/uv && chown -R echostats:echostats /home/echostats/.cache

USER echostats

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
