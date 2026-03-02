# Remaining Work TODO

Last updated: 2026-03-02 (America/New_York)

Status legend:

- `[ ]` pending
- `[~]` in progress
- `[x]` done
- `[-]` blocked (external dependency/environment)

Overall remaining scope: **4 tasks**

## 1) Environment and Tooling Validation

- [x] Install workspace dependencies with `pnpm install`.
- [x] Generate and commit `pnpm-lock.yaml`.
- [x] Confirm `pnpm dev` runs both web and api concurrently.
- [x] Confirm worker local runtime starts on `127.0.0.1:8787`.
- [x] Confirm web dev server starts on `127.0.0.1:5173`.
- [x] Verify root scripts execute successfully: `dev`, `build`, `lint`, `typecheck`, `test`, `format`.

## 2) Quality Gates and Fixes

- [x] Run `pnpm lint` across all workspaces.
- [x] Fix any ESLint violations found.
- [x] Run `pnpm typecheck` across all workspaces.
- [x] Fix any TypeScript type errors found.
- [x] Run `pnpm test` and confirm scoring tests pass.
- [x] Add at least one cache behavior test (coalescing or stale fallback).
- [x] Add at least one API contract test (schema envelope validation).

## 3) API Functional Verification

- [x] Smoke-test `GET /api/health`.
- [x] Smoke-test `GET /api/signals` for all 4 modules.
- [x] Smoke-test `GET /api/events` for all 4 modules.
- [x] Smoke-test `GET /api/timeseries` for all 4 modules.
- [x] Verify `module` and `timeRange` query validation rejects bad inputs.
- [x] Verify `ETag` and `Cache-Control` headers are returned on API endpoints.
- [x] Verify conditional request with `If-None-Match` returns `304`.
- [x] Verify stale cache fallback behavior when an upstream source fails.

## 4) Data and Scoring Validation

- [x] Confirm Financial Stress returns non-empty data from free FRED endpoints in keyless mode.
- [x] Confirm AI & Tech events populate from arXiv + GitHub feed sources.
- [x] Confirm Capital Flows data populates from CoinGecko.
- [x] Verify derived metrics are present: `yield-spread`, `stablecoin-total-market-cap`, `btc-volatility-proxy`.
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

- [x] Dry-run Cloudflare Worker deployment with Wrangler.
- [-] Confirm production API URL works for all endpoints. (blocked: deployment pending)
- [x] Build web for production and verify API base URL wiring with `VITE_API_BASE_URL`.
- [-] Deploy web (Cloudflare Pages or equivalent free host) and verify live app end-to-end. (blocked: deployment network/access required)
- [-] Document final deployed URLs in README. (blocked: deployment pending)

## 7) Docs and Handoff Completion

- [x] Capture and add real screenshots to `docs/screenshots`.
- [x] Update README screenshot section to embed actual images.
- [x] Add a concise troubleshooting section (feed failure, rate limit, CORS, missing env vars).
- [x] Add a "known limitations" section with concrete next iteration items.
- [x] Create a short CHANGELOG entry for the current MVP baseline.

## 8) Git Hygiene and Delivery

- [-] Push current commits to remote `main`. (blocked: remote access/network required)
- [x] Open a PR-style summary in README or CHANGELOG covering architecture and MVP boundaries.

## Update Rule (tracking commitment)

- [x] After each completed task above, immediately update this file status and remaining count.
