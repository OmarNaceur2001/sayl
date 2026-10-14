# Sayl

**AI-powered, multi-channel conversation automation for businesses.** Sayl unifies
your direct-message inbox across WhatsApp, Instagram, Facebook, Telegram and more,
and lets you automate replies, campaigns and growth workflows from a visual flow
builder — backed by the [Zernio](https://zernio.com) messaging API.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js >=20.9](https://img.shields.io/badge/node-%3E%3D20.9-brightgreen)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Local Supabase development](#local-supabase-development)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Production build & deployment](#production-build--deployment)
- [Security](#security)
- [Project structure](#project-structure)
- [License](#license)

## Overview

Sayl is a multi-tenant SaaS: every user belongs to one or more **workspaces**, and
each workspace connects social/messaging accounts through Zernio, builds
automation **flows**, talks to customers in a shared **inbox**, and runs
**broadcasts** and **sequences**. Incoming messages and comments arrive via a
signed webhook; a rule engine then runs the matching flow — sending replies,
tagging contacts, calling AI models, making HTTP requests, or handing off to a
human.

## Features

**Messaging & engagement**

- **Unified inbox** — one realtime DM inbox across all connected channels, with
  historical backfill and live updates via Supabase Realtime.
- **Visual flow builder** — React Flow canvas with publish/version history and a
  dry-run simulator. Node types: trigger, send message, condition, delay,
  smart delay, A/B split, tag, set custom field, HTTP request, subscribe,
  comment reply, private reply, AI response, enroll-in-sequence, go-to-flow and
  human takeover.
- **AI responses** — AI nodes generate replies through the Vercel AI SDK
  gateway (default model `openai/gpt-4o-mini`); each workspace can supply its
  own AI key or fall back to `AI_GATEWAY_API_KEY`.
- **Broadcasts** — bulk sends fanned out as individual scheduled jobs (spaced
  ~100 ms apart to respect rate limits).
- **Sequences** — multi-step drip campaigns driven by enrollments and processed
  by cron.
- **Growth tools** — comment automation: keyword triggers that turn post
  comments into DM conversations (per-workspace global keywords).
- **Contact CRM** — tags, custom fields and segment building.

**Multi-language**

- Message language detection and per-language content variants for French,
  English, Arabic and Tunisian Arabic (Darija), including Latin-script Tunisian.

**Team & workspace**

- Multi-workspace accounts with a workspace switcher and per-workspace scoping
  enforced everywhere (UI, API routes and RLS).
- Roles: owner, admin, member. Owners invite teammates from
  **Settings → Team** via invite links (`/invite/[inviteId]`).
- Per-workspace secrets: Zernio API key, optional AI key and webhook secret,
  stored server-side and never exposed to the browser.

**Platform & integration**

- Channels: WhatsApp, Instagram, Facebook and Telegram enabled by default;
  X/Twitter, Bluesky and Reddit are also supported by the platform layer and can
  be enabled via `NEXT_PUBLIC_ENABLED_CHANNELS`.
- Session-authenticated REST endpoints under `/api/v1/` (contacts, flows,
  channels, broadcasts, messages).
- Signed inbound webhook at `/api/webhooks/late` for Zernio events
  (messages, comments, account sync), with HMAC verification and idempotent
  deduplication.
- Scheduled-job queue processed by cron endpoints (`/api/cron/*`).

**Auth**

- Email/password sign-up and sign-in (Supabase Auth, with optional email
  confirmation), GitHub OAuth, forgot/reset password, onboarding for new
  workspaces, and team invite acceptance.

## Technology stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack dev), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (Postgres, Auth, Realtime) via `@supabase/ssr` + `@supabase/supabase-js` |
| Messaging | Zernio API (`@zernio/node`) — channel connections, DMs, comments |
| Flow builder | React Flow (`@xyflow/react`) |
| AI | Vercel AI SDK (`ai`) with the AI Gateway |
| Tests | Vitest (unit tests, node environment) |
| Deploy target | Vercel (Cron configured in `vercel.json`); any Node 20.9+ host |

## Architecture

```
┌────────────┐   OAuth/keys   ┌──────────┐
│  Channels  │◄──────────────►│  Zernio  │
└─────┬──────┘                └────┬─────┘
      │ inbound events             │ connect/sync
      ▼                            │
/api/webhooks/late ──► verify HMAC per workspace ──► dedupe (webhook_events)
      │
      ▼
lib/flow-engine ──► match triggers ──► execute nodes
      │                                 (send DM, reply to comment,
      ▼                                  tag, AI, HTTP, handoff…)
Contacts / conversations / flow state in Postgres (RLS per workspace)
```

- **Multi-tenant model** — `workspaces` ↔ `workspace_members` ↔ `auth.users`.
  Every table is row-level-security scoped to the user's workspaces. The active
  workspace is carried in the `zernflow_workspace_id` cookie and resolved
  server-side by `resolveWorkspaceMembership()`.
- **Session layer** — `proxy.ts` (Next 16 convention) refreshes the Supabase
  session on every request and enforces the auth routing rules: auth pages,
  `/onboarding`, dashboard and API routes. `/auth/callback` exchanges `code`
  (PKCE) or `token_hash` (OTP) links and sanitizes the `next` redirect target.
- **Service-role access** — `lib/supabase/server.ts` exposes a user-scoped
  client and a `server-only`-guarded service client used for RLS-bypassing
  server work (workspace creation, cron, webhooks). The service key never
  reaches the browser.
- **Background work** — `scheduled_jobs` rows (broadcasts, delays, flow resumes)
  are claimed and executed by `POST /api/cron/jobs`; sequence steps by
  `POST /api/cron/sequences`. Both require `Authorization: Bearer CRON_SECRET`.
- **Webhook path** — `/api/webhooks/late` verifies the Zernio signature against
  the workspace's webhook secret, records the event id, then processes
  asynchronously via `after()`.

## Prerequisites

- **Node.js ≥ 20.9** (required by Next.js 16) and npm
- A **Supabase project** — hosted or a local Docker stack (see
  [Local Supabase development](#local-supabase-development))
- A **Zernio account + API key** (configured later in the Sayl workspace)

## Getting started

### 1. Install

```bash
git clone https://github.com/OmarNaceur2001/sayl.git
cd sayl
npm ci
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the values (details in
[Environment variables](#environment-variables)):

```bash
cp .env.example .env.local
```

### 3. Provision the database

Apply the SQL migrations in `supabase/migrations/` **in numeric order**
(`00001_…` through `00021_…`). Either:

- run them in your hosted project's **SQL editor**, or
- use the Supabase CLI:
  `supabase link --project-ref <project-ref> && supabase db push`

> Other `.sql` files in that directory (`ALL_MIGRATIONS.sql`,
> `cross_workspace_links.sql`) are reference scripts, not CLI migrations.

### 4. Configure Supabase Auth

In **Authentication → URL Configuration**:

- **Site URL** → your `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- **Redirect URLs** → add `<APP_URL>/auth/callback` (the password-recovery
  flow appends `?next=/reset-password`)
- Enable **GitHub** as a provider if you want OAuth sign-in, and point the
  GitHub OAuth app's callback at `https://<project-ref>.supabase.co/auth/v1/callback`

### 5. Run

```bash
npm run dev   # http://localhost:3000
```

Sign up, complete onboarding to create your first workspace, then open
**Settings** to paste your Zernio API key and connect channels.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key for server-side admin operations (workspace creation, cron, webhooks). **Server-only** — enforced via the `server-only` package; never expose, commit or log |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical app URL — used for webhook registration, invite links, sitemap |
| `CRON_SECRET` | Yes (prod) | Bearer token guarding `/api/cron/*` (Vercel Cron sends it automatically when set) |
| `AI_GATEWAY_API_KEY` | No | Fallback key for AI response nodes when a workspace has no own AI key |
| `NEXT_PUBLIC_ENABLED_CHANNELS` | No | Comma-separated channel allowlist in the connect UI; defaults to `whatsapp,instagram,facebook,telegram` |

## Local Supabase development

You can develop and test end-to-end without touching a hosted project —
`supabase/config.toml` is already committed:

```bash
supabase start        # boots Postgres/Auth/Realtime in Docker, applies all migrations
supabase status -o env  # prints ANON_KEY / SERVICE_ROLE_KEY / API URL
```

Point `.env.local` at it:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`>
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=local-cron-secret
```

Auth emails (signup confirmation, password recovery) are captured by **Mailpit**
at `http://127.0.0.1:54324` instead of being sent. Email confirmation is
enabled in `supabase/config.toml` to match production. To recreate an isolated
test account, use the admin API or `supabase.auth.admin.createUser`.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit suite (one-shot) |
| `npm run test:watch` | Vitest watch mode |
| `npx tsc --noEmit` | Type-check |

## Testing

- **Unit tests** — Vitest (`npm test`), covering the auth helpers, language
  detection, flow trigger matching, webhook signature verification, inbox sync,
  cron auth, middleware cookie/redirect handling and workspace slug generation.
- **CI** — `.github/workflows/ci.yml` runs lint → type-check → tests → build on
  every push and PR, with placeholder Supabase env vars.
- **Live E2E** — run the app against the local Supabase stack above; auth emails
  land in Mailpit so the full register/confirm/recover cycle can be exercised
  without a mail provider.

## Production build & deployment

### Build

```bash
npm run build && npm run start
```

The build needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
present (placeholders are fine for CI).

### Deploying (Vercel)

1. Import the repo, set all env vars from the table above.
2. `vercel.json` schedules both cron routes **every minute**
   (`/api/cron/jobs`, `/api/cron/sequences`). Vercel Cron authenticates with
   `Authorization: Bearer <CRON_SECRET>` automatically once the env var exists —
   do not put the secret in URLs.
3. In Supabase → **URL Configuration**, set Site URL to your production domain
   and add `https://<domain>/auth/callback` to Redirect URLs.
4. In the Sayl workspace, configure the Zernio API key; Sayl registers the
   inbound webhook (`/api/webhooks/late`) during channel connect/sync.

For non-Vercel hosts, schedule `POST /api/cron/jobs` and
`POST /api/cron/sequences` yourself (every ~30–60 s) with the bearer header.

## Security

- **Row-level security** on every workspace table; API routes re-resolve the
  caller's workspace from `workspace_members` — cross-workspace access is
  denied both in the UI and at the database layer.
- **Service-role key** is imported only through a `server-only`-guarded module;
  any accidental client-side import fails the build.
- **Webhook integrity** — Zernio payloads are HMAC-verified per workspace
  secret and deduplicated by event id.
- **Cron endpoints** require a shared bearer secret.
- **Redirect safety** — auth callback `next` parameters are restricted to
  internal paths (`safeInternalPath`), preventing open redirects.
- **Secrets handling** — workspace API keys live in the `workspace_secrets`
  table, read and written only via the service-role backend; they are never
  serialized to the client.
- Session cookies are `httpOnly`, `sameSite=lax`, `secure` in production.

Do not commit `.env*` files (git-ignored) and never log service-role or
workspace keys.

## Project structure

```
app/
  (auth)/               login, register, forgot/reset password
  (dashboard)/          flows, inbox, contacts, broadcasts, sequences,
                        analytics, growth, channels, settings
  api/v1/               session-authenticated workspace-scoped endpoints
  api/cron/             jobs + sequences processors (bearer-auth)
  api/webhooks/late/    inbound Zernio events (HMAC-verified, deduped)
  auth/callback/        Supabase code/OTP exchange
  onboarding/           first-workspace creation
  invite/[inviteId]/    team invite acceptance
  components/           UI: flow builder canvas/panels, inbox, switcher…
lib/
  flow-engine/          runtime, trigger matching, node handlers, simulator
  language/             fr/en/ar/tn detection + per-language text resolution
  actions/              server actions (workspace, team, settings, sequences)
  supabase/             browser / server / middleware Supabase clients
  types/                generated Database types
supabase/migrations/    numbered schema + RLS migrations (00001–00021)
proxy.ts                session middleware entry point (Next 16 convention)
vercel.json             Vercel Cron schedules
```

## License

MIT — see [LICENSE](./LICENSE).
