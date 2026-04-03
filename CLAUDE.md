# CLAUDE.md — HealthLog

## Project Overview
HealthLog is an AI-powered AI-powered health symptom tracker — log symptoms, track patterns, and get evidence-based insights, built as a Cloudflare Worker with BYOK architecture. Part of the Cocapn ecosystem at cocapn.ai.

GitHub Organization: **Lucineer**

## Architecture
Single Cloudflare Worker: inline HTML UI + API routes + BYOK LLM routing + KV persistence.

### Key Routes
- `/health` — Health check
- `/setup` — BYOK provider setup
- `/api/chat` — LLM chat with symptoms context
- `/api/seed` — Seed sample data
- `/api/symptoms` — CRUD for symptoms

## Code Style
- TypeScript throughout, no build step
- Zero runtime dependencies
- Inline HTML pattern (no ASSETS binding)
- Brand accent color: #ef4444
- All commits: `Author: Superinstance`

## Key Commands
```bash
wrangler dev      # Local dev
wrangler deploy   # Deploy to Cloudflare
```

## What NOT to Change
- BYOK module structure (config discovery cascade)
- Inline HTML pattern
- Zero-dependency constraint
- KV binding name `MEMORY`
