# Sitemapr — Cyberpunk Sitemap Generator

A premium, production-ready sitemap generator and web crawler with a dark, futuristic, cyberpunk-inspired UI. Enter any website URL and watch as Sitemapr discovers all internal pages in real time, then export your sitemap in multiple formats.

![Sitemapr](https://img.shields.io/badge/Sitemapr-v1.0-cyan?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

## Features

- **Live Crawl Progress** — Watch URLs being discovered in real time via Server-Sent Events
- **Adjustable Concurrency** — Control worker count, crawl delay, and request timeout
- **Smart URL Normalization** — Handles fragments, trailing slashes, tracking params, duplicates
- **robots.txt Compliance** — Optionally respects robots.txt rules
- **Multi-Format Export** — Download sitemaps as XML, JSON, CSV, or TXT
- **Search & Filter** — Filter results by status code, depth, content type
- **Pause/Resume/Stop** — Full crawl lifecycle control
- **Live Terminal Console** — Hacker-style log viewer with real-time updates
- **Scan History** — View and manage previous crawl sessions
- **Cyberpunk UI** — Dark theme with neon accents, glow effects, grid backgrounds

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| HTML Parsing | Cheerio |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Railway-ready |

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── crawl/
│   │       ├── route.ts              # POST: create job, GET: list jobs
│   │       └── [jobId]/
│   │           ├── route.ts          # GET: job details, POST: control actions
│   │           ├── stream/route.ts   # GET: SSE live progress stream
│   │           └── export/route.ts   # GET: export sitemap (xml/json/csv/txt)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Main dashboard (client component)
├── components/
│   ├── UrlInput.tsx                  # URL submission form
│   ├── SettingsPanel.tsx             # Crawl configuration panel
│   ├── StatsCards.tsx                # Live statistics cards
│   ├── ProgressBar.tsx               # Animated progress bar
│   ├── CrawlControls.tsx            # Pause/Resume/Stop/Clear buttons
│   ├── LogConsole.tsx                # Terminal-style log viewer
│   ├── ResultsTable.tsx             # Searchable/filterable results table
│   └── ScanHistory.tsx              # Previous crawl history
├── hooks/
│   └── useCrawl.ts                  # Main crawl state & SSE hook
├── lib/
│   ├── crawler.ts                   # Crawl engine with job management
│   ├── url-utils.ts                 # URL normalization & validation
│   ├── robots.ts                    # robots.txt fetcher & parser
│   └── export.ts                    # Sitemap export generators
└── types/
    └── index.ts                     # TypeScript interfaces & defaults
```

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/fitrianabila2025group/Sitemapr.git
cd Sitemapr

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |

## Railway Deployment

This project is configured for easy deployment to Railway.

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create a Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub Repo"
   - Select the `Sitemapr` repository

3. **Configure**
   - Railway will auto-detect the Next.js project
   - Set environment variables if needed:
     - `PORT`: Railway sets this automatically
     - `NEXT_PUBLIC_APP_URL`: Set to your Railway domain

4. **Deploy**
   - Railway will run `npm install && npm run build` automatically
   - The app starts with `npm start`

### Railway Configuration

The project uses Next.js `standalone` output mode for optimized deployments. The `package.json` scripts are Railway-compatible:

- `build`: `next build` — produces a standalone build
- `start`: `next start` — starts the production server

No Dockerfile needed — Railway's Nixpacks builder handles everything.

## API Reference

### Create Crawl Job
```
POST /api/crawl
Body: { url: string, settings?: Partial<CrawlSettings> }
Response: { id, targetUrl, domain, status, createdAt }
```

### List Jobs
```
GET /api/crawl
Response: CrawlJobSummary[]
```

### Get Job Details
```
GET /api/crawl/[jobId]
Response: { id, targetUrl, domain, settings, progress, urls, logs }
```

### Control Job
```
POST /api/crawl/[jobId]
Body: { action: "pause" | "resume" | "stop" | "clear" | "delete" }
```

### Stream Progress (SSE)
```
GET /api/crawl/[jobId]/stream
Events: progress, log, done
```

### Export Sitemap
```
GET /api/crawl/[jobId]/export?format=xml|json|csv|txt
```

## Crawl Settings

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| maxConcurrency | 3 | 1–10 | Concurrent request workers |
| crawlDelay | 200ms | 0–10000 | Delay between request batches |
| requestTimeout | 10000ms | 1000–30000 | Timeout per request |
| maxDepth | 10 | 1–50 | Maximum link depth |
| maxPages | 500 | 1–5000 | Maximum pages to crawl |
| obeyRobotsTxt | true | — | Respect robots.txt |
| includeSubdomains | false | — | Crawl subdomains |
| ignoreQueryParams | false | — | Strip query parameters |
| retryFailed | true | — | Retry failed requests |
| maxRetries | 2 | 0–5 | Retries per failed URL |
| followRedirects | true | — | Follow HTTP redirects |

## Safety & Ethics

- Only crawl websites you own or have permission to scan
- Default settings use conservative concurrency (3 workers, 200ms delay)
- robots.txt compliance is enabled by default
- Private/local addresses are blocked
- SSRF protections are in place
- Input validation on all endpoints

## License

ISC
