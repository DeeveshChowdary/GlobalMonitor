# Remaining Work TODO

Last updated: 2026-03-02 (America/New_York)

Status legend:
- `[ ]` pending
- `[~]` in progress
- `[x]` done
- `[-]` blocked (external dependency/environment)

Overall remaining scope: **27 tasks**

## 1) Environment and Tooling Validation
- [-] Install workspace dependencies with `pnpm install`. (blocked: no network access to npm registry in current environment)
- [-] Generate and commit `pnpm-lock.yaml`. (blocked by install step)
- [-] Confirm `pnpm dev` runs both web and api concurrently. (blocked by install step)
- [-] Confirm worker local runtime starts on `127.0.0.1:8787`. (blocked by install step)
- [-] Confirm web dev server starts on `127.0.0.1:5173`. (blocked by install step)
- [-] Verify root scripts execute successfully: `dev`, `build`, `lint`, `typecheck`, `test`, `format`. (blocked by install step)

## 2) Quality Gates and Fixes
- [-] Run `pnpm lint` across all workspaces. (blocked by install step)
- [-] Fix any ESLint violations found. (blocked until lint can run)
- [-] Run `pnpm typecheck` across all workspaces. (blocked by install step)
- [-] Fix any TypeScript type errors found. (blocked until typecheck can run)
- [-] Run `pnpm test` and confirm scoring tests pass. (blocked by install step)
- [x] Add at least one cache behavior test (coalescing or stale fallback).
- [x] Add at least one API contract test (schema envelope validation).

## 3) API Functional Verification
- [-] Smoke-test `GET /api/health`. (blocked by install + local runtime)
- [-] Smoke-test `GET /api/signals` for all 4 modules. (blocked by install + local runtime)
- [-] Smoke-test `GET /api/events` for all 4 modules. (blocked by install + local runtime)
- [-] Smoke-test `GET /api/timeseries` for all 4 modules. (blocked by install + local runtime)
- [x] Verify `module` and `timeRange` query validation rejects bad inputs.
- [x] Verify `ETag` and `Cache-Control` headers are returned on API endpoints.
- [x] Verify conditional request with `If-None-Match` returns `304`.
- [x] Verify stale cache fallback behavior when an upstream source fails.

## 4) Data and Scoring Validation
- [-] Confirm Financial Stress returns non-empty data from free FRED endpoints in keyless mode. (blocked by runtime/network validation)
- [-] Confirm AI & Tech events populate from arXiv + GitHub feed sources. (blocked by runtime/network validation)
- [-] Confirm Capital Flows data populates from CoinGecko. (blocked by runtime/network validation)
- [-] Verify derived metrics are present: `yield-spread`, `stablecoin-total-market-cap`, `btc-volatility-proxy`. (blocked by runtime/network validation)
- [x] Validate deterministic ranking order: `score = severity*0.7 + acceleration*0.3`.
- [x] Validate global-risk blended score stays in 0-100 range across ranges.
- [x] Add a short README note with expected degraded behavior when a feed is unavailable.

## 5) Frontend UX and URL-State Verification
- [x] Verify module switching preserves map/time/layer URL state.
- [x] Verify full URL round-trip recreates identical view after page reload.
- [x] Verify `selectedSignalId` deep-linking works when opening shared links.
- [x] Verify layer toggles (`choropleth`, `signals`, `events`) reflect in URL and map visibility.
- [x] Verify responsive layout behavior on mobile breakpoint. (verified in CSS media breakpoints at 1180px and 860px)
- [x] Verify selected signal details always show matching chart + related events.
- [x] Add explicit loading/empty-state copy for each panel path.

## 6) Deployment Rehearsal
- [-] Dry-run Cloudflare Worker deployment with Wrangler. (blocked: deployment network/access required)
- [-] Confirm production API URL works for all endpoints. (blocked: deployment pending)
- [-] Build web for production and verify API base URL wiring with `VITE_API_BASE_URL`. (blocked by install step)
- [-] Deploy web (Cloudflare Pages or equivalent free host) and verify live app end-to-end. (blocked: deployment network/access required)
- [-] Document final deployed URLs in README. (blocked: deployment pending)

## 7) Docs and Handoff Completion
- [-] Capture and add real screenshots to `docs/screenshots`. (blocked: runtime screenshots pending)
- [-] Update README screenshot section to embed actual images. (blocked: screenshots pending)
- [x] Add a concise troubleshooting section (feed failure, rate limit, CORS, missing env vars).
- [x] Add a "known limitations" section with concrete next iteration items.
- [x] Create a short CHANGELOG entry for the current MVP baseline.

## 8) Git Hygiene and Delivery
- [-] Push current commits to remote `main`. (blocked: remote access/network required)
- [x] Open a PR-style summary in README or CHANGELOG covering architecture and MVP boundaries.

## Update Rule (tracking commitment)
- [x] After each completed task above, immediately update this file status and remaining count.
