require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const agentWorkflowUrl = process.env.AGENT_WORKFLOW_URL || 'https://platform.openai.com/agents';
const chatKitWorkflowId = process.env.CHATKIT_WORKFLOW_ID;
const chatKitApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_SECRET_KEY;

// Basic request logging that is easy to extend or remove.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use(express.json());

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/api/config', (_req, res) => {
  res.json({
    agentWorkflowUrl,
    generatedAt: new Date().toISOString(),
  });
});

app.post('/api/chatkit/session', async (req, res) => {
  if (!chatKitWorkflowId || !chatKitApiKey) {
    return res.status(500).json({ error: 'ChatKit workflow or API key missing on the server' });
  }
  const deviceId = req.body?.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
        Authorization: `Bearer ${chatKitApiKey}`,
      },
      body: JSON.stringify({
        workflow: { id: chatKitWorkflowId },
        user: deviceId,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ChatKit session request failed: ${response.status} ${text}`);
    }
    const payload = await response.json();
    if (!payload?.client_secret) {
      throw new Error('ChatKit session response missing client_secret');
    }
    res.json({ token: payload.client_secret });
  } catch (error) {
    console.error('Failed to create ChatKit session', error);
    res.status(502).json({ error: 'Unable to create ChatKit session' });
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
