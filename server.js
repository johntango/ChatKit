require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const agentWorkflowUrl = process.env.AGENT_WORKFLOW_URL || 'https://platform.openai.com/agents';

// Basic request logging that is easy to extend or remove.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/api/config', (_req, res) => {
  res.json({
    agentWorkflowUrl,
    generatedAt: new Date().toISOString(),
  });
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
