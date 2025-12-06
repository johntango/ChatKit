const DEVICE_ID_STORAGE_KEY = 'chatkit-device-id';

function createDeviceId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadOrCreateDeviceId() {
  if (typeof window === 'undefined') {
    return createDeviceId();
  }
  try {
    const cached = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (cached) return cached;
    const next = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    return next;
  } catch (error) {
    console.warn('Falling back to ephemeral ChatKit device id', error);
    return createDeviceId();
  }
}

const workflowLink = document.querySelector('[data-workflow-link]');
const workflowLabel = document.querySelector('.workflow-label');
const workflowUrlEl = document.getElementById('workflow-url');
const copyButton = document.getElementById('copy-link');
const chatkitPanel = document.getElementById('chatkit-panel');
const chatkitFallback = document.querySelector('[data-chatkit-fallback]');
const chatkitState = {
  configuredUrl: null,
  deviceId: loadOrCreateDeviceId(),
};

if (copyButton) {
  copyButton.disabled = true;
}

async function hydrateWorkflowLink() {
  if (!workflowLink || !workflowLabel || !workflowUrlEl) {
    return;
  }
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Unable to load config');
    const { agentWorkflowUrl } = await res.json();
    if (!agentWorkflowUrl) return;
    workflowLink.href = agentWorkflowUrl;
    workflowLabel.textContent = 'Linked';
    workflowUrlEl.textContent = agentWorkflowUrl;
    if (copyButton) {
      copyButton.disabled = false;
    }
    configureChatKitPanel(agentWorkflowUrl);
  } catch (error) {
    workflowLabel.textContent = 'Unavailable';
    workflowUrlEl.textContent = 'Failed to load workflow link';
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

async function fetchChatKitClientSecret() {
  if (!chatkitState.deviceId) {
    chatkitState.deviceId = loadOrCreateDeviceId();
  }
  try {
    const res = await fetch('/api/chatkit/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId: chatkitState.deviceId }),
    });
    if (!res.ok) {
      throw new Error(`Session request failed (${res.status})`);
    }
    const data = await res.json();
    if (!data?.token) {
      throw new Error('Session token missing from response');
    }
    return data.token;
  } catch (error) {
    console.error('Unable to fetch ChatKit session token', error);
    throw error;
  }
}

async function configureChatKitPanel(agentWorkflowUrl) {
  if (!chatkitPanel || !agentWorkflowUrl) return;
  if (chatkitState.configuredUrl === agentWorkflowUrl) {
    return;
  }
  const defined = await waitForChatKitDefinition();
  if (!defined || typeof chatkitPanel.setOptions !== 'function') {
    return;
  }
  chatkitPanel.addEventListener(
    'chatkit.ready',
    () => {
      hideChatKitFallback();
    },
    { once: true }
  );
  chatkitPanel.addEventListener('chatkit.error', (event) => {
    console.error('ChatKit error', event.detail?.error ?? event);
  });

  chatkitPanel.setOptions({
    api: {
      getClientSecret: async () => fetchChatKitClientSecret(),
    },
    theme: {
      colorScheme: 'dark',
      radius: 'round',
      color: {
        accent: { primary: '#8B5CF6', level: 2 },
      },
    },
    header: {
      enabled: true,
      title: 'ChatKit Lab',
      subtitle: 'Linked to OpenAI Agent Builder',
      rightAction: {
        icon: 'external',
        label: 'Open Workflow',
        onClick: () => window.open(agentWorkflowUrl, '_blank', 'noopener,noreferrer'),
      },
    },
    history: {
      enabled: true,
      showDelete: true,
      showRename: true,
    },
    startScreen: {
      greeting: 'How can we help?',
      prompts: [
        {
          label: 'Troubleshoot an issue',
          prompt: 'Help me fix an issue',
          icon: 'lifesaver',
        },
        {
          label: 'Request a feature',
          prompt: 'I have an idea',
          icon: 'lightbulb',
        },
      ],
    },
    composer: {
      placeholder: 'Ask the assistant…',
    },
    threadItemActions: {
      feedback: true,
      retry: true,
    },
  });

  chatkitState.configuredUrl = agentWorkflowUrl;
}

hydrateWorkflowLink();
