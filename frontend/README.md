# News Generator UI

A dynamic Next.js replacement for the original static `ui.html` frontend.

## What this version includes

- Uses Next.js App Router and TypeScript instead of one static HTML file.
- Proxies frontend requests through `/api/*`, so the browser does not call `http://localhost:8000` directly.
- Keeps the FastAPI base URL on the server with `FASTAPI_BASE_URL`.
- Adds model preload, health polling, request cancellation, prompt examples, copy actions, persisted settings, responsive layout, and clearer error handling.
- Adds saved conversations, so different text generation threads can be reopened and continued later.
- Adds dynamic conversation URLs with `/conversations/[conversationId]`.
- Mirrors the FastAPI validation limits from `server.py`: prompt length, token range, temperature range, top-k range, and repetition penalty range.

## Required backend

Keep your existing FastAPI server running:

```bash
python server.py
```

By default, the Next.js app expects the backend at:

```bash
http://localhost:8000
```

To change it, create `.env.local`:

```bash
cp .env.example .env.local
```

Then edit:

```bash
FASTAPI_BASE_URL=http://localhost:8000
```

## Run the Next.js app

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Production build

```bash
npm run build
npm run start
```

## File structure

```txt
app/
  api/
    generate/route.ts              # validates and proxies POST /generate to FastAPI
    health/route.ts                # proxies GET /health
    load/route.ts                  # proxies POST /load
  conversations/[conversationId]/  # dynamic conversation route
  globals.css
  layout.tsx
  page.tsx
components/
  GeneratorClient.tsx              # main interactive client component
  Sidebar.tsx                      # conversations, parameters, presets, backend/model info
  OutputCard.tsx                   # generated result cards
  RangeControl.tsx                 # reusable slider control
  EmptyState.tsx
  ErrorCard.tsx
  LoadingCard.tsx
  StatusPill.tsx
lib/
  api.ts                           # browser-facing API client
  presets.ts                       # generation presets and prompt examples
  server.ts                        # server-side proxy helpers and validation
  text.ts                          # text splitting and formatting helpers
types/
  generation.ts                    # shared TypeScript API types
```

## Local storage

The app stores conversations in browser local storage under:

```txt
stai-next-ui-state-v3
```

It also imports data from the previous key if present:

```txt
stai-next-ui-state-v2
```

## Notes

The current FastAPI backend returns the completed text in one response. This UI therefore shows request-level progress, not true token streaming. To support real streaming, add a streaming endpoint to FastAPI, such as Server-Sent Events or a chunked response, then update the Next.js `/api/generate` route and client to consume that stream.
