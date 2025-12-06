const workflowLink = document.querySelector('[data-workflow-link]');
const workflowLabel = document.querySelector('.workflow-label');
const workflowUrlEl = document.getElementById('workflow-url');
const copyButton = document.getElementById('copy-link');
const chatkitPanel = document.getElementById('chatkit-panel');
const chatkitFallback = document.querySelector('[data-chatkit-fallback]');
const chatkitState = {
  configuredUrl: null,
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
    theme: 'dark',
    header: {
      title: 'ChatKit Lab',
      subtitle: 'Linked to OpenAI Agent Builder',
      rightAction: {
        label: 'Open Workflow',
        icon: 'external',
        onClick: () => window.open(agentWorkflowUrl, '_blank', 'noopener,noreferrer'),
      },
    },
    composer: {
      placeholder: 'Ask how this workflow behaves…',
    },
  });

  chatkitState.configuredUrl = agentWorkflowUrl;
}

hydrateWorkflowLink();
