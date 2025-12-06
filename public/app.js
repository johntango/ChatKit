const workflowLink = document.querySelector('[data-workflow-link]');
const workflowLabel = document.querySelector('.workflow-label');
const workflowUrlEl = document.getElementById('workflow-url');
const copyButton = document.getElementById('copy-link');

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

hydrateWorkflowLink();
