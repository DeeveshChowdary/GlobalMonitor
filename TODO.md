# Recovery TODO

Last updated: 2026-03-03 (America/New_York)

Status legend:

- `[ ]` pending
- `[~]` in progress
- `[x]` done
- `[-]` blocked

Overall remaining scope: **16 tasks**

## 1) Stability Hotfix (failed fetch / empty monitors)

- [~] Reproduce `failed to fetch` locally with real runtime (`pnpm dev`) and endpoint probes.
- [ ] Add frontend API retry + timeout + fallback base URL strategy for deployed Pages setups.
- [ ] Change dashboard loading to partial success (`Promise.allSettled`) so one endpoint failure does not blank entire UI.
- [ ] Add user-visible degraded mode status strip with source health notes instead of generic hard errors.
- [ ] Harden AI/RSS source aggregation so one feed outage cannot fail module payload generation.

## 2) Data Density (more monitors + more graphs)

- [ ] Add multi-chart panel (primary + secondary metrics for selected module).
- [ ] Add compact sparkline rows for top signals in the left panel.
- [ ] Add top KPI cards (global score, average severity, event velocity, source count).
- [ ] Add timeline section that visualizes event intensity over the current range.

## 3) UI Redesign (dark hacker / war-room)

- [ ] Replace current light theme with dark tactical palette + neon accents.
- [ ] Upgrade map presentation to dark basemap and tuned overlays for high contrast.
- [ ] Redesign shell typography/spacing/borders to look like a cyber operations console.
- [ ] Improve responsive behavior so dense panels remain usable on laptop and mobile widths.

## 4) Verification + Docs

- [ ] Run full quality gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) and fix regressions.
- [ ] Manually verify each module loads non-empty data in local runtime with no API keys.
- [ ] Update README screenshots + troubleshooting for new fallback behavior and dark UI.
- [ ] Push commits for each completed work chunk and keep this TODO updated after each chunk.
