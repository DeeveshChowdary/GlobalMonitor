# Changelog

## 2026-03-02 - MVP Baseline

### Summary (PR-style)

This baseline introduces a free-first Global Monitor monorepo with a Cloudflare Worker API shim and a Vite/React dashboard spanning four modules: Global Risk, Financial Stress, Capital Flows, and AI & Tech.

### Added

- Monorepo workspace structure with apps and shared packages.
- Shared normalized schema (`Signal`, `Timeseries`, `Event`) with zod validation.
- Source adapters for FRED, CoinGecko, arXiv RSS, and GitHub Atom.
- Deterministic scoring package:
  - rolling z-score
  - sigmoid severity mapping
  - acceleration and confidence
  - ranked signal ordering
- API endpoints:
  - `/api/health`
  - `/api/signals`
  - `/api/events`
  - `/api/timeseries`
- Worker-side caching features:
  - in-memory store
  - optional KV persistence
  - in-flight request coalescing
  - stale-while-revalidate behavior
  - ETag support
- Frontend shell with:
  - module switcher
  - time range controls
  - URL state serialization/parsing
  - map layers and signal/event panels
  - detail chart panel
- CI workflow for lint/typecheck/test.

### Improved

- Decoupled scoring horizon from display horizon so short `timeRange` selections retain stable signal ranking.
- Reduced duplicate upstream fetches in module composition paths.
- Added offline unit tests for cache coalescing/stale fallback and schema contract validation.

### Notes

- Deployment URLs are intentionally omitted until live deployment is completed.
- Real screenshots are pending first environment-validated run.
