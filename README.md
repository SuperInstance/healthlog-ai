# HEALTHLOG-AI

> AI-powered health symptom tracker — log symptoms, track patterns, and get evidence-based insights — part of the [Cocapn](https://cocapn.ai) ecosystem

![Build](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-blue)

## Description

AI-powered health symptom tracker — log symptoms, track patterns, and get evidence-based insights. Built as a Cloudflare Worker with BYOK (Bring Your Own Key) architecture.

## ✨ Features

Symptom logging with timestamps\n- Pattern recognition over time\n- Medication tracking\n- Doctor visit logs\n- Mood and energy tracking\n- Sleep quality correlation\n- Export health summaries

## 🚀 Getting Started

1. Clone the repo
2. `npm install`
3. `cp .dev.vars.example .dev.vars` and add your KV namespace ID
4. `npm run dev` to start locally
5. Visit `/setup` to configure your LLM provider

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/setup` | GET | BYOK setup wizard |
| `/api/chat` | POST | Chat with the AI agent |
| `/api/seed` | POST | Seed sample data |
| `/api/symptoms` | GET | List all symptoms |
| `/api/symptoms` | POST | Create a symptom |
| `/api/symptoms/:id` | GET | Get a symptom |
| `/api/symptoms/:id` | PATCH | Update a symptom |
| `/api/symptoms/:id` | DELETE | Delete a symptom |

## Architecture

Single Cloudflare Worker with inline HTML, BYOK LLM routing, and KV persistence. Zero runtime dependencies.

## License

MIT
