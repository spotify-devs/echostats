# Changelog

All notable changes to EchoStats are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Global exception handler — structured JSON errors, never leaks stack traces
- Request correlation IDs (`X-Request-ID`) on every request, bound to logs
- Request timeout middleware (30s default, 120s for heavy endpoints)
- GZip response compression for payloads >1KB
- React error boundary — user-friendly fallback on frontend crashes
- Redis connectivity check in `/api/health/ready`
- Secrets validation on startup (ENCRYPTION_KEY format, JWT_SECRET length)
- `COOKIE_SECURE` env var for session cookie Secure flag
- Contributing guide (`CONTRIBUTING.md`)
- Architecture documentation

### Changed
- Token refresh now retries 3 times with exponential backoff
- Token refresh detects revoked tokens and stops retrying immediately
- Removed hardcoded `changeme` password from default MongoDB URI
- Health readiness endpoint now checks both MongoDB and Redis

### Fixed
- Duplicate listening history records due to timezone-aware vs naive datetime comparison
- Unique index on `(user_id, track.spotify_id, played_at)` prevents future duplicates
- Startup dedup removes existing duplicates and rebuilds rollups automatically
- Sync uses Spotify `after` cursor to only fetch new tracks

## [0.23.16] — 2026-04-02

### Fixed
- Auto-deduplicate listening history on startup before unique index creation
- Await async aggregate cursor before `.to_list()` in PyMongo async API

## [0.23.14] — 2026-04-01

### Fixed
- Resolve MongoDB IndexKeySpecsConflict by using explicit unique index name
- Drop old non-unique compound index during init_db

## [0.23.12] — 2026-04-01

### Fixed
- Remove all pymongo `bulk_write` calls, use Beanie `save()` instead
