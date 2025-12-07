# ChatKit + OpenAI Agent Builder

A lightweight Express server that exposes the hosted `<openai-chatkit>` widget and nothing else—perfect for embedding the panel inside other tools while keeping session-token logic on the backend.

## Prerequisites

- Node.js 18+ (for native fetch and modern syntax)
- npm 9+

## Quick start

```sh
cp .env.example .env # optional, then edit AGENT_WORKFLOW_URL
npm install
npm run dev
```

Visit `http://localhost:3000` to see the ChatKit shell. Update `AGENT_WORKFLOW_URL` in `.env` (or export it in your shell) so the panel binds to the workflow you want to expose.

## Deploying the ChatKit shell

Because this is just Express + static assets, you can deploy it anywhere that runs Node 18+:

1. **Local dev / Codespaces**

- Copy `.env.example`→`.env` and fill in the workflow URL + API key.
- Run `npm run dev` (local) or use the Codespaces “Run” button.
- Confirm `sessionApiEnabled` via `curl -s $PUBLIC_BASE_URL/api/config | jq` before sharing the link.

2. **Self-hosted VM / Docker**

- Build the app: `npm ci && npm run start` or bake into a Dockerfile with `node server.js`.
- Provide the same `.env` values via environment variables or a secrets manager.

3. **PaaS (Render, Railway, Fly.io, etc.)**

- Set the platform’s start command to `npm run start`.
- Configure env vars in the provider dashboard.

4. **Static frontends embedding the shell**

- Deploy this Express app separately and iframe it where needed, using `PUBLIC_BASE_URL` to ensure the panel reports the correct origin for Codespaces or custom domains.

When moving between hosts, remember to restart the server after changing `.env`, and keep your `OPENAI_API_KEY` private—only the backend should see it.

### Environment variables

| Name                        | Required | Description                                                                                     |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `AGENT_WORKFLOW_URL`        | ✅       | Agent Builder share link; also used to derive the workflow ID when unspecified.                 |
| `AGENT_WORKFLOW_ID`         | ➖       | Overrides the derived workflow ID (format `wf_…`).                                              |
| `AGENT_WORKFLOW_PUBLIC_KEY` | ➖       | Domain key (`domain_pk_…`) for browser-only integrations. Not needed when using session tokens. |
| `OPENAI_API_KEY`            | ➖       | Standard API key (server-side only). Required for the session-token flow.                       |
| `PUBLIC_BASE_URL`           | ➖       | Public origin for `/api/config` (Codespaces, Vercel, etc.). Defaults to auto-detection.         |
| `PORT`                      | ➖       | Express port (default `3000`).                                                                  |

## Scripts

- `npm run dev` – start the server with automatic reloads via nodemon.
- `npm run start` – run the production server.
- `npm run test` – lightweight configuration check used by CI.

## Project structure

```
server.js           # Express application + API endpoints
public/             # Static assets served by Express
  index.html        # Minimal ChatKit shell markup
  styles.css        # Styling for the full bleed panel
  app.js            # Fetches config + clipboard helper
```

## API surface

- `GET /api/config` returns workflow details, public key (if supplied), detected base URL, and whether the session API is enabled.
- `POST /api/chatkit-session` exchanges your `OPENAI_API_KEY` + workflow ID for a short-lived ChatKit `client_secret`, keeping the API key off the client.
- `GET /healthz` exposes a simple uptime probe for Docker/Kubernetes health checks.

## Running on a new Codespace URL

Codespaces assigns a new hostname every time you open a fresh container. Use the checklist below whenever the URL changes:

1. **Update `PUBLIC_BASE_URL`.** Set it to `https://$CODESPACE_NAME-$PORT.app.github.dev` so `/api/config` advertises the correct origin to the frontend.
2. **Choose your auth strategy:**

- _Session tokens (recommended):_ make sure `.env` contains `OPENAI_API_KEY` (and optionally `AGENT_WORKFLOW_ID`). The server will set `sessionApiEnabled: true`, the browser will call `/api/chatkit-session`, and no domain allowlist is required.
- _Domain key:_ if you prefer `AGENT_WORKFLOW_PUBLIC_KEY`, add the new Codespace host to the OpenAI domain allowlist and restart the server so the key is picked up.

3. **Restart the dev server.** `Ctrl+C` the existing `npm run dev`, then start it again so the new env vars load.
4. **Verify configuration.** Run `curl -s $PUBLIC_BASE_URL/api/config | jq` and confirm the URL, key details, and `sessionApiEnabled` flag look correct before sharing the link.

## Customization ideas

- Drop this shell into an `<iframe>` anywhere you need ChatKit access with consistent styling.
- Inject telemetry (e.g., PostHog, Segment) in `public/app.js` for click tracking.
- Extend `server.js` with additional routes that proxy or validate Agent Builder payloads before launching the workflow.
- Customize the embedded `<openai-chatkit>` widget in `public/app.js` with your own header actions, composer defaults, or tool callbacks. The widget script is loaded securely from `https://cdn.platform.openai.com/deployments/chatkit/chatkit.js`.
