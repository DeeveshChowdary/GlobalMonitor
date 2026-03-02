# Global Monitor

A free-first, monitor-style dashboard inspired by WorldMonitor for four modules:

1. Global Risk Intelligence (umbrella/fused view)
2. Financial Stress Early Warning
3. Real-Time Capital Flows (proxy-based)
4. AI & Tech Disruption Monitor

The project is designed to run in **degraded mode with zero API keys** and then improve with optional environment variables.

## Features

- One cohesive app with module switching and shared URL state.
- URL-encoded state: `module`, `timeRange`, `layers`, `lat`, `lon`, `zoom`, `view`, `selectedSignalId`.
- Normalized domain model:
  - `Signal` (ranked alerts)
  - `Timeseries` (chart metrics)
  - `Event` (discrete feed entries)
- Thin Cloudflare Worker API shim with:
  - in-memory cache
  - optional KV persistent cache
  - request coalescing (in-flight dedupe)
  - stale-while-revalidate behavior
  - ETag and cache headers
- Deterministic scoring (`z-score -> sigmoid severity -> acceleration -> confidence`).
- MapLibre map with togglable layers:
  - coarse region choropleth for risk
  - clustered markers for signals/events
- Type-safe API contracts with `zod` validation.

## Monorepo Layout

```txt
apps/
  web/                 # Vite + React + MapLibre UI
  api/                 # Cloudflare Worker API (Wrangler/Miniflare local)
packages/
  schema/              # shared types + zod validators + module types
  sources/             # source adapters (FRED, RSS/Atom, CoinGecko)
  scoring/             # deterministic scoring and ranking logic
  utils/               # cache/fetch/math/shared helpers
.github/workflows/
  ci.yml               # lint/typecheck/test on push/PR
```

## Data Sources (MVP)

### Financial Stress

- FRED public series (CSV fallback, keyless):
  - `DGS10` (10Y)
  - `DGS2` (2Y)
  - `UNRATE` (unemployment)
  - `CPIAUCSL` (CPI proxy)
  - `BAA10Y` (credit spread proxy)
- Derived metric:
  - `yield-spread = 10Y - 2Y`

### AI & Tech

- arXiv RSS feeds (`cs.AI`, `cs.LG`) -> events
- GitHub releases Atom feeds for curated repos -> events
- Derived velocity timeseries:
  - arXiv publication rate
  - GitHub release rate

### Capital Flows

- CoinGecko market data:
  - BTC/ETH prices
  - USDT/USDC market caps (flow proxy)
- Derived proxies:
  - total stablecoin market cap
  - BTC realized volatility proxy

### Global Risk Intelligence

- Fuses top signals from Financial + Capital + AI/Tech.
- Produces `Global Risk Composite` score (0-100) with module breakdown.
- Adds a "What changed" derived feed.

## Free-First and Degraded Mode

The app runs without keys by default.

- **No keys set**:
  - FRED uses public CSV endpoints.
  - AI/Tech and Capital sources remain active.
- **Optional keys**:
  - `FRED_API_KEY` can improve reliability under higher request volume.

## Getting Started (Local)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Copy env template

```bash
cp .env.example .env
```

### 3. Run both apps

```bash
pnpm dev
```

This starts:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

The web dev server proxies `/api/*` to the worker dev server.

## Scripts

- `pnpm dev` - runs web + api together
- `pnpm build` - build all workspaces
- `pnpm lint` - lint all workspaces
- `pnpm typecheck` - TS checks across all workspaces
- `pnpm test` - runs scoring tests and no-test packages with pass mode
- `pnpm format` - prettier write

## API Contract (v1)

- `GET /api/health`
- `GET /api/signals?module=...&timeRange=...`
- `GET /api/events?module=...&timeRange=...`
- `GET /api/timeseries?module=...&timeRange=...&metric=...`

Responses are envelope-based:

```json
{
  "version": "v1",
  "generatedAt": "2026-03-02T00:00:00.000Z",
  "data": []
}
```

## Deployment (Free Tier)

### Recommended: Cloudflare Workers + Cloudflare Pages

#### API (Workers)

1. Authenticate:

```bash
pnpm --filter @gm/api wrangler login
```

2. Deploy worker:

```bash
pnpm --filter @gm/api build
pnpm --filter @gm/api wrangler deploy
```

3. Optional persistent caching:

```bash
pnpm --filter @gm/api wrangler kv namespace create CACHE_KV
```

Then add KV binding to [`apps/api/wrangler.toml`](/Users/deeveshchowdary/Desktop/github_projects/GlobalMonitor/GlobalMonitor/apps/api/wrangler.toml).

#### Frontend (Pages)

1. Build web:

```bash
pnpm --filter @gm/web build
```

2. Deploy `apps/web/dist` via Cloudflare Pages.
3. Set `VITE_API_BASE_URL` equivalent approach if you host API on a custom domain (or keep relative `/api` through routing/proxy).

## Environment Variables

See [`.env.example`](/Users/deeveshchowdary/Desktop/github_projects/GlobalMonitor/GlobalMonitor/.env.example).

- `FRED_API_KEY` (optional)
- `VITE_API_BASE_URL` (optional for deployed frontend pointing to deployed API)
- `GITHUB_RELEASE_REPOS` (optional, comma-separated)

## How to Add a New Source

1. Add adapter under `packages/sources/src/adapters`.
2. Normalize outputs to `Signal`/`Timeseries`/`Event` compatible objects.
3. Wire source into `packages/sources/src/index.ts`.
4. Add scoring mapping in `apps/api/src/services/module-data.ts`.
5. Validate through existing API routes.

## How to Add a New Module

1. Create module config file in `apps/web/src/config/modules/`.
2. Register it in `apps/web/src/config/modules/index.ts`.
3. Add backend handling branch in `apps/api/src/services/module-data.ts`.
4. Add metric/signal mappings and optional map region mapping.

## Scoring Transparency

Implemented in `packages/scoring`:

- Rolling z-score on each metric (up to 1Y window)
- Sigmoid transform to 0-100 severity
- Acceleration as recent delta vs lookback window
- Confidence from completeness and volatility penalty
- Final rank score = `severity * 0.7 + acceleration * 0.3`

Unit tests live in [`packages/scoring/src/index.test.ts`](/Users/deeveshchowdary/Desktop/github_projects/GlobalMonitor/GlobalMonitor/packages/scoring/src/index.test.ts).

## Screenshots

Placeholder folder: [`docs/screenshots`](/Users/deeveshchowdary/Desktop/github_projects/GlobalMonitor/GlobalMonitor/docs/screenshots)

Add screenshots after first local run.

## Limitations (Current MVP)

- Capital flow signals are proxies, not direct institutional flow datasets.
- Choropleth is coarse region-based (not full country polygon fidelity yet).
- Feed/API availability depends on upstream public endpoints and rate limits.
- No paid/private datasets included by default.
