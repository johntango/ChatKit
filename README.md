# ChatKit + OpenAI Agent Builder

A lightweight Express server that serves a polished ChatKit landing page with a direct call-to-action into your preferred OpenAI Agent Builder workflow.

## Prerequisites

- Node.js 18+ (for native fetch and modern syntax)
- npm 9+

## Quick start

```sh
cp .env.example .env # optional, then edit AGENT_WORKFLOW_URL
npm install
npm run dev
```

Visit `http://localhost:3000` to see the ChatKit page. Update `AGENT_WORKFLOW_URL` in `.env` (or export it in your shell) so the CTA button opens the exact workflow you want to showcase.

## Scripts

- `npm run dev` – start the server with automatic reloads via nodemon.
- `npm run start` – run the production server.
- `npm run test` – lightweight configuration check used by CI.

## Project structure

```
server.js           # Express application + API endpoints
public/             # Static assets served by Express
  index.html        # Landing page markup
  styles.css        # Tailored styles for the ChatKit hero layout
  app.js            # Fetches config + clipboard helper
```

## API surface

- `GET /api/config` returns the resolved `agentWorkflowUrl` so the frontend can stay decoupled from secrets.
- `GET /healthz` exposes a simple uptime probe for Docker/Kubernetes health checks.

## Customization ideas

- Swap the hero copy or add more sections under `public/index.html`.
- Inject telemetry (e.g., PostHog, Segment) in `public/app.js` for click tracking.
- Extend `server.js` with additional routes that proxy or validate Agent Builder payloads before launching the workflow.
