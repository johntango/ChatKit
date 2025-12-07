const workflowLink = document.querySelector('[data-workflow-link]');
const workflowLabel = document.querySelector('.workflow-label');
const workflowUrlEl = document.getElementById('workflow-url');
const copyButton = document.getElementById('copy-link');
const chatkitPanel = document.getElementById('chatkit-panel');
const chatkitFallback = document.querySelector('[data-chatkit-fallback]');
const chatkitState = {
  configuredUrl: null,
  configuredDomainKey: null,
};

if (copyButton) {
  copyButton.disabled = true;
}

async function hydrateWorkflowLink() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Unable to load config');
    const { agentWorkflowUrl, agentWorkflowPublicKey, sessionApiEnabled } = await res.json();
    if (!agentWorkflowUrl) return;
    if (workflowLink) {
      workflowLink.href = agentWorkflowUrl;
    }
    if (workflowLabel) {
      workflowLabel.textContent = 'Linked';
    }
    if (workflowUrlEl) {
      workflowUrlEl.textContent = agentWorkflowUrl;
    }
    if (copyButton) {
      copyButton.disabled = false;
    }
    configureChatKitPanel({ agentWorkflowUrl, agentWorkflowPublicKey, sessionApiEnabled });
  } catch (error) {
    if (workflowLabel) {
      workflowLabel.textContent = 'Unavailable';
    }
    if (workflowUrlEl) {
      workflowUrlEl.textContent = 'Failed to load workflow link';
    }
    if (copyButton) {
      copyButton.disabled = true;
    }
    console.error(error);
  }
}

if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const url = workflowLink.href;
    try {
      await navigator.clipboard.writeText(url);
      copyButton.textContent = 'Link copied!';
      setTimeout(() => (copyButton.textContent = 'Copy Shareable Link'), 2000);
    } catch (error) {
      copyButton.textContent = 'Copy failed';
      console.error(error);
    }
  });
}

function hideChatKitFallback() {
  if (chatkitFallback) {
    chatkitFallback.style.display = 'none';
  }
}

function updateChatKitFallback(message, detail) {
  if (!chatkitFallback) return;
  const textBlocks = chatkitFallback.querySelectorAll('p');
  if (textBlocks[0] && message) {
    textBlocks[0].textContent = message;
  }
  if (textBlocks[1] && typeof detail === 'string') {
    textBlocks[1].textContent = detail;
  }
  chatkitFallback.style.display = '';
}

function waitForChatKitDefinition() {
  if (typeof window === 'undefined' || !window.customElements) {
    return Promise.resolve(false);
  }
  if (window.customElements.get('openai-chatkit')) {
    return Promise.resolve(true);
  }
  return window.customElements
    .whenDefined('openai-chatkit')
    .then(() => true)
    .catch(() => false);
}

async function configureChatKitPanel(config) {
  if (!chatkitPanel || !config) return;
  const { agentWorkflowUrl, agentWorkflowPublicKey, sessionApiEnabled } = config;
  if (!agentWorkflowUrl) {
    updateChatKitFallback('ChatKit embed unavailable', 'Missing AGENT_WORKFLOW_URL.');
    return;
  }

  const useSessionApi = Boolean(sessionApiEnabled);
  const domainKey = agentWorkflowPublicKey;

  if (!useSessionApi && !domainKey) {
    updateChatKitFallback(
      'ChatKit embed locked',
      'Provide OPENAI_API_KEY or AGENT_WORKFLOW_PUBLIC_KEY to enable the panel.'
    );
    console.warn('ChatKit embed skipped: missing session API and domain key.');
    return;
  }

  if (
    chatkitState.configuredUrl === agentWorkflowUrl &&
    chatkitState.configuredDomainKey === (useSessionApi ? 'session-api' : domainKey)
  ) {
    return;
  }
  const defined = await waitForChatKitDefinition();
  if (!defined || typeof chatkitPanel.setOptions !== 'function') {
    return;
  }
  chatkitPanel.setAttribute('tabindex', '0');
  chatkitPanel.addEventListener(
    'chatkit.ready',
    () => {
      hideChatKitFallback();
      requestAnimationFrame(() => chatkitPanel.focus());
      console.info('ChatKit ready');
    },
    { once: true }
  );
  chatkitPanel.addEventListener('chatkit.error', (event) => {
    console.error('ChatKit error', event.detail?.error ?? event);
  });

  const apiOptions = useSessionApi
    ? {
        getClientSecret: () => fetchChatKitClientSecret(),
      }
    : {
        url: agentWorkflowUrl,
        domainKey,
      };

  chatkitPanel.setOptions({
    api: apiOptions,
    theme: 'dark',
    composer: {
      placeholder: 'Ask how this workflow behaves…',
    },
  });
  hideChatKitFallback();

  chatkitState.configuredUrl = agentWorkflowUrl;
  chatkitState.configuredDomainKey = useSessionApi ? 'session-api' : domainKey;
}

async function fetchChatKitClientSecret() {
  const deviceId = window.crypto?.randomUUID?.() || `device-${Date.now()}`;
  const response = await fetch('/api/chatkit-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start ChatKit session: ${errorText}`);
  }

  const payload = await response.json();
  if (!payload?.clientSecret) {
    throw new Error('ChatKit session response missing clientSecret');
  }
  console.info('Received ChatKit client secret');
  return payload.clientSecret;
}

hydrateWorkflowLink();
