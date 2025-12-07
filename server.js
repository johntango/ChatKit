require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const agentWorkflowUrl = (process.env.AGENT_WORKFLOW_URL || 'https://platform.openai.com/agent-builder/workflows/wf_69334814204c819093d78717f7eb2ac4082162ae5b3df060').trim();
const agentWorkflowPublicKey = process.env.AGENT_WORKFLOW_PUBLIC_KEY?.trim() || null;
const agentWorkflowId =
  process.env.AGENT_WORKFLOW_ID?.trim() || extractWorkflowId(agentWorkflowUrl);
const openAiApiKey = process.env.OPENAI_API_KEY?.trim() || null;
const sessionApiEnabled = Boolean(openAiApiKey && agentWorkflowId);
const publicBaseUrl = resolvePublicBaseUrl();

function resolvePublicBaseUrl() {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.trim();
  }
  const codespaceName = process.env.CODESPACE_NAME?.trim();
  const codespaceDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim() || 'app.github.dev';
  if (codespaceName) {
    return `https://${codespaceName}-${PORT}.${codespaceDomain}`;
  }
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.trim();
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }
  return `http://localhost:${PORT}`;
}

function extractWorkflowId(url) {
  if (!url) return null;
  const parts = url.trim().split('/');
  const candidate = parts[parts.length - 1];
  return candidate?.startsWith('wf_') ? candidate : null;
}

function sanitizeDeviceId(deviceId, fallback) {
  const raw = deviceId || fallback || 'anonymous';
  return raw.toString().slice(0, 64);
}

// Basic request logging that is easy to extend or remove.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use(express.json({ limit: '1mb' }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/api/config', (_req, res) => {
  res.json({
    agentWorkflowUrl,
    agentWorkflowPublicKey,
    sessionApiEnabled,
    publicBaseUrl,
    generatedAt: new Date().toISOString(),
  });
});

app.post('/api/chatkit-session', async (req, res) => {
  if (!sessionApiEnabled) {
    res.status(503).json({ error: 'ChatKit session API is not configured.' });
    return;
  }

  const deviceId = sanitizeDeviceId(req.body?.deviceId, req.ip);

  try {
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        workflow: { id: agentWorkflowId },
        user: deviceId,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to start ChatKit session', response.status, errorBody);
      res.status(502).json({ error: 'OpenAI ChatKit session request failed.' });
      return;
    }

    const payload = await response.json();
    if (!payload?.client_secret) {
      console.error('ChatKit session response missing client_secret');
      res.status(502).json({ error: 'Invalid response from OpenAI ChatKit API.' });
      return;
    }

    res.json({ clientSecret: payload.client_secret });
  } catch (error) {
    console.error('ChatKit session error', error);
    res.status(500).json({ error: 'Unable to reach OpenAI ChatKit API.' });
  }
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

function start() {
  return app.listen(PORT, () => {
    console.log(`ChatKit server running on http://localhost:${PORT}`);
  });
}

if (process.argv.includes('--check')) {
  console.log('Server configuration OK');
  process.exit(0);
}

start();

module.exports = { app, start };
