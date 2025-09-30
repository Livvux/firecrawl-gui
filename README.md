# Firecrawl Console

A minimal Next.js (App Router) client for operating a self-hosted Firecrawl v2 instance. The app stores configuration in local storage only and ships with JSON editors for each core endpoint.

## Prerequisites

- Node.js 20+
- pnpm 8+
- A running Firecrawl v2 server (self-hosted)

## Setup

```bash
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) and enter your Firecrawl base URL (e.g. `https://firecrawl.local`). Provide an API key if your deployment requires `Authorization: Bearer <key>`.

## Features

- **Overview** – configure die Verbindung; falls dein Self-Host kein `GET /v2/health` anbietet, überspringen wir den Check automatisch.
- **Playground** – JSON request editor + presets for:
  - `POST /v2/scrape`
  - `POST /v2/search`
  - `POST /v2/crawl`
  - `POST /v2/extract`
- **Activity** – polls `GET /v2/activity` with abort support (auto-disables if the endpoint is absent).
- **Usage** – displays data from `GET /v2/usage` when exposed.
- **What’s New** – renders entries from `GET /v2/changelog` with graceful fallback.
- **Settings** – edit URL/key, toggle dark/light mode, clear all stored values.

All requests share a typed `firecrawlClient` wrapper that applies timeouts, abort signals, and optional bearer auth.

## Scripts

```bash
pnpm dev         # Start local dev server
pnpm build       # Production build (Next.js + Turbopack)
pnpm lint        # ESLint
pnpm typecheck   # TypeScript project check
pnpm test        # Vitest unit tests (client wrapper + validation)
```

## Local Persistence

Configuration (base URL, API key, theme) is stored in `localStorage` under the key `firecrawl-config`. Use the **Settings → Storage** action to clear it.

## Notes on Firecrawl v2 Endpoints

Endpoint | Method | Notes
---|---|---
`/v2/health` | GET | Confirms connectivity and reports status/version (nicht jede Self-Hosted-Installation stellt diesen Endpoint bereit).
`/v2/scrape` | POST | Accepts `ScrapePayload` (URL plus optional formats/content flags).
`/v2/search` | POST | Query the web; optional `scrapeOptions` mirrors scrape payload options.
`/v2/crawl` | POST | Starts an async crawl job; responses typically include a job ID.
`/v2/extract` | POST | Provides structured extraction based on prompts/schemas.
`/v2/activity` | GET | Optional; returns recent jobs/logs.
`/v2/usage` | GET | Optional; returns quota/credit metrics.
`/v2/changelog` | GET | Optional; renders release notes if present.

Endpoints marked as optional degrade with clear on-screen messaging when the server responds with `404`.

## Testing Philosophy

Unit tests cover the Firecrawl client wrapper (headers, error handling) and base URL validation. Extend tests alongside new logic to keep regression risk low.

---

Built with App Router, TypeScript, and Tailwind CSS 4. Dark mode is enabled by default; theme toggles remain client-only for simplicity at this scale.
