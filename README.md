# Sayl

Sayl is a conversation-automation platform for businesses. It combines a visual
flow builder, messaging inbox, contact management, broadcasts, sequences, and
AI-assisted replies.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Supabase Auth, Postgres, and Realtime
- Tailwind CSS 4
- React Flow (`@xyflow/react`)
- Vercel AI SDK
- Zernio messaging API (`@zernio/node`)

## Setup

### Requirements

- Node.js 20.9 or later
- A Supabase project
- A Zernio API key

### Install and configure

```bash
npm ci
```

Create a local `.env` file and set the required environment variable names:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
AI_GATEWAY_API_KEY=
NEXT_PUBLIC_ENABLED_CHANNELS=
```

`NEXT_PUBLIC_ENABLED_CHANNELS` is optional and accepts a comma-separated
platform list. The default is `whatsapp,instagram,facebook,telegram`.

Apply the SQL migrations in `supabase/migrations/` in numeric order. Start the
development server with `npm run dev`, then open `http://localhost:3000`.
Configure the Zernio API key in the Sayl workspace settings.

The scheduled handlers at `/api/cron/jobs` and `/api/cron/sequences` require
`Authorization: Bearer <CRON_SECRET>`. Configure `CRON_SECRET` in the deployment
environment; never pass it in a query string. Vercel Cron uses this bearer
authorization when `CRON_SECRET` is configured.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production app |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |

## License

MIT. See [LICENSE](./LICENSE) for the original copyright notice and license
terms.
