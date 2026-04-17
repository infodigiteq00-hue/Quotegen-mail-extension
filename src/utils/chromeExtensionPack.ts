const EXTENSION_NAME = 'quotegen-mail-extension';

function getManifestJson() {
  return JSON.stringify(
    {
      manifest_version: 3,
      name: 'QuoteGen - Create Quotation',
      version: '1.1.2',
      description: 'Adds a "Create Quotation" action in Gmail and Outlook read/compose views.',
      content_scripts: [
        {
          matches: [
            'https://mail.google.com/*',
            'https://outlook.office.com/*',
            'https://outlook.office365.com/*',
            'https://outlook.live.com/*',
            'https://*.office.com/mail/*',
          ],
          js: ['content.js'],
          run_at: 'document_idle',
        },
      ],
    },
    null,
    2,
  );
}

function getReadme(appBaseUrl: string): string {
  return `QuoteGen Mail Extension (Gmail + Outlook)
==========================================

1. Extract this ZIP.
2. Open Chrome -> chrome://extensions.
3. Enable Developer mode.
4. Click "Load unpacked" and select the extracted folder.
5. Open Gmail or Outlook Web.
6. In email read view or compose view, click "Create Quotation".

On click, email details are sent to:
${appBaseUrl}
`;
}

function getContentScript(appBaseUrl: string): string {
  return `
(() => {
  const APP_BASE_URL = ${JSON.stringify(appBaseUrl)};
  const hostname = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const IS_GMAIL = hostname === 'mail.google.com';
  const IS_OUTLOOK =
    hostname === 'outlook.office.com' ||
    hostname === 'outlook.office365.com' ||
    hostname === 'outlook.live.com' ||
    (hostname.endsWith('.office.com') && path.includes('/mail'));

  const COMPOSE_BTN_CLASS = 'quotegen-create-quotation-btn-compose';
  const READ_BTN_CLASS = 'quotegen-create-quotation-btn-read';
  const READ_FLOATING_BTN_CLASS = 'quotegen-create-quotation-btn-floating';
  const OUTLOOK_COMPOSE_BTN_CLASS = 'quotegen-create-quotation-btn-outlook-compose';
  const OUTLOOK_READ_BTN_CLASS = 'quotegen-create-quotation-btn-outlook-read';
  const OUTLOOK_FLOATING_BTN_CLASS = 'quotegen-create-quotation-btn-outlook-floating';

  function safeText(value) {
    return (value || '').toString().trim();
  }

  function encodePayload(payload) {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function openQuoteGen(payload) {
    if (!payload.body) {
      alert('No email body found in this email.');
      return;
    }

    const encoded = encodePayload(payload);
    const target = APP_BASE_URL + '/?email_payload=' + encodeURIComponent(encoded);
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  function getComposeBody(composeRoot) {
    const bodyNode =
      composeRoot.querySelector('div[role="textbox"][aria-label*="Message Body"]') ||
      composeRoot.querySelector('div[aria-label*="Message Body"][contenteditable="true"]') ||
      composeRoot.querySelector('div[contenteditable="true"][g_editable="true"]');

    return safeText(bodyNode ? bodyNode.innerText : '');
  }

  function getComposeSubject(composeRoot) {
    const subjectInput = composeRoot.querySelector('input[name="subjectbox"]');
    return safeText(subjectInput ? subjectInput.value : '');
  }

  function getComposeTo(composeRoot) {
    const toInput = composeRoot.querySelector('textarea[name="to"], input[aria-label^="To"]');
    if (toInput && toInput.value) return safeText(toInput.value);

    const chips = Array.from(composeRoot.querySelectorAll('span[email]'));
    return chips.map(node => node.getAttribute('email') || '').filter(Boolean).join(', ');
  }

  function openQuoteGenFromCompose(composeRoot) {
    openQuoteGen({
      source: 'gmail-extension',
      subject: getComposeSubject(composeRoot),
      to: getComposeTo(composeRoot),
      body: getComposeBody(composeRoot),
      createdAt: new Date().toISOString(),
    });
  }

  function createComposeButton(composeRoot) {
    const btn = document.createElement('div');
    btn.className = COMPOSE_BTN_CLASS;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.textContent = 'Create Quotation';
    btn.style.cssText =
      'margin-right:8px;padding:0 12px;height:36px;display:flex;align-items:center;border-radius:18px;' +
      'background:#e8f0fe;color:#174ea6;font-weight:600;font-size:12px;cursor:pointer;user-select:none;';

    btn.addEventListener('click', () => openQuoteGenFromCompose(composeRoot));
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openQuoteGenFromCompose(composeRoot);
      }
    });

    return btn;
  }

  function getReadSubject() {
    return safeText(
      (document.querySelector('h2.hP') && document.querySelector('h2.hP').textContent) ||
      (document.querySelector('h2[role="heading"]') && document.querySelector('h2[role="heading"]').textContent) ||
      ''
    );
  }

  function getReadRecipients(readRoot) {
    if (!readRoot) return '';
    const chips = Array.from(readRoot.querySelectorAll('span[email], span[data-hovercard-id]'));
    const values = chips
      .map((node) => node.getAttribute('email') || node.getAttribute('data-hovercard-id') || '')
      .map((value) => safeText(value))
      .filter(Boolean);
    return Array.from(new Set(values)).join(', ');
  }

  function getReadBody(readRoot) {
    if (!readRoot) return '';
    const bodyNode =
      readRoot.querySelector('div.a3s.aiL') ||
      readRoot.querySelector('div.a3s') ||
      readRoot.querySelector('div[dir="ltr"]');
    return safeText(bodyNode ? bodyNode.innerText : '');
  }

  function getLatestVisibleReadRoot() {
    const roots = Array.from(document.querySelectorAll('div[data-message-id]')).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    return roots.length ? roots[roots.length - 1] : null;
  }

  function resolveReadRootFromAnchor(anchorNode) {
    if (anchorNode && anchorNode.closest) {
      const fromAnchor = anchorNode.closest('div[data-message-id]');
      if (fromAnchor) return fromAnchor;
    }
    return getLatestVisibleReadRoot();
  }

  function openQuoteGenFromRead(readRoot) {
    const resolvedRoot = readRoot || getLatestVisibleReadRoot();
    openQuoteGen({
      source: 'gmail-extension-read',
      subject: getReadSubject(),
      to: getReadRecipients(resolvedRoot),
      body: getReadBody(resolvedRoot),
      createdAt: new Date().toISOString(),
    });
  }

  function createReadButton(readRoot) {
    const btn = document.createElement('div');
    btn.className = READ_BTN_CLASS;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.textContent = 'Create Quotation';
    btn.style.cssText =
      'margin-left:8px;padding:0 12px;height:28px;display:inline-flex;align-items:center;border-radius:14px;' +
      'background:#e8f0fe;color:#174ea6;font-weight:600;font-size:12px;cursor:pointer;user-select:none;';

    btn.addEventListener('click', () => openQuoteGenFromRead(readRoot));
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openQuoteGenFromRead(readRoot);
      }
    });

    return btn;
  }

  function findSendButton(composeRoot) {
    return (
      composeRoot.querySelector('div[role="button"][data-tooltip^="Send"]') ||
      composeRoot.querySelector('div[role="button"][aria-label^="Send"]') ||
      composeRoot.querySelector('div[role="button"][data-tooltip*="Send"]') ||
      composeRoot.querySelector('div[role="button"][aria-label*="Send"]')
    );
  }

  function isComposeRoot(node) {
    if (!node || !(node instanceof Element)) return false;
    const hasEditableBody = !!node.querySelector('div[contenteditable="true"][g_editable="true"], div[role="textbox"][contenteditable="true"]');
    if (!hasEditableBody) return false;
    return !!findSendButton(node);
  }

  function getComposeRoots() {
    const candidates = new Set();
    document.querySelectorAll('div[role="dialog"], div[gh="cm"], div[role="region"], div.AD').forEach((node) => {
      if (isComposeRoot(node)) candidates.add(node);
    });
    return Array.from(candidates);
  }

  function addComposeButtons() {
    const composeWindows = getComposeRoots();
    composeWindows.forEach((composeRoot) => {
      if (composeRoot.querySelector('.' + COMPOSE_BTN_CLASS)) return;

      const sendButton = findSendButton(composeRoot);
      if (!sendButton || !sendButton.parentElement) return;

      sendButton.parentElement.insertBefore(createComposeButton(composeRoot), sendButton);
    });
  }

  function getReadMessageRoots() {
    return Array.from(document.querySelectorAll('div[data-message-id]'));
  }

  function findReadToolbar(readRoot) {
    return (
      readRoot.querySelector('div[role="toolbar"]') ||
      readRoot.querySelector('div[gh="mtb"]') ||
      readRoot.querySelector('div[aria-label*="Message actions"]')
    );
  }

  function addReadButtons() {
    getReadMessageRoots().forEach((readRoot) => {
      const toolbar = findReadToolbar(readRoot);
      if (!toolbar || toolbar.querySelector('.' + READ_BTN_CLASS)) return;
      toolbar.appendChild(createReadButton(readRoot));
    });
  }

  function getReplyActionButtons() {
    return Array.from(document.querySelectorAll('span[role="button"], div[role="button"]')).filter((node) => {
      const label = (node.getAttribute('aria-label') || node.textContent || '').toLowerCase();
      return label.includes('reply') || label.includes('forward');
    });
  }

  function addReadButtonsNearReply() {
    getReplyActionButtons().forEach((replyButton) => {
      const parent = replyButton.parentElement;
      if (!parent) return;
      if (parent.querySelector('.' + READ_BTN_CLASS)) return;

      const readRoot = resolveReadRootFromAnchor(replyButton);
      parent.insertBefore(createReadButton(readRoot), replyButton);
    });
  }

  function hasReadContext() {
    if (document.querySelector('div[data-message-id]')) return true;
    if (document.querySelector('h2.hP, h2[role="heading"]')) return true;
    return window.location.href.includes('#inbox/') || window.location.href.includes('#all/');
  }

  function addFloatingReadButton() {
    const existing = document.querySelector('.' + READ_FLOATING_BTN_CLASS);
    if (!hasReadContext()) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return;

    const button = document.createElement('button');
    button.className = READ_FLOATING_BTN_CLASS;
    button.type = 'button';
    button.textContent = 'Create Quotation';
    button.style.cssText =
      'position:fixed;right:24px;bottom:24px;z-index:2147483647;border:none;outline:none;' +
      'padding:10px 14px;border-radius:20px;background:#1a73e8;color:#fff;font-weight:700;' +
      'font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);';

    button.addEventListener('click', () => openQuoteGenFromRead(getLatestVisibleReadRoot()));
    document.body.appendChild(button);
  }

  function uniqueText(values) {
    return Array.from(new Set(values.map((v) => safeText(v)).filter(Boolean))).join(', ');
  }

  function isVisible(node) {
    if (!(node instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && node.offsetParent !== null;
  }

  function getOutlookComposeRoots() {
    const directRoots = Array.from(document.querySelectorAll('div[role="dialog"], div[role="main"], div[data-app-section]')).filter((node) => {
      if (!(node instanceof Element)) return false;
      return (
        !!node.querySelector('div[contenteditable="true"][aria-label*="message"]') ||
        !!node.querySelector('div[contenteditable="true"][aria-label*="Message"]') ||
        !!node.querySelector('div[contenteditable="true"][role="textbox"]')
      );
    });

    if (directRoots.length > 0) return directRoots;

    const bodyNode = getActiveOutlookComposeBodyNode();
    if (!bodyNode) return [];
    const root = bodyNode.closest('div[role="dialog"], div[role="main"], div[data-app-section], section') || bodyNode.parentElement;
    return root ? [root] : [];
  }

  function getActiveOutlookComposeBodyNode() {
    const candidates = Array.from(
      document.querySelectorAll(
        'div[contenteditable="true"][aria-label*="message"], div[contenteditable="true"][aria-label*="Message"], div[contenteditable="true"][role="textbox"]',
      ),
    ).filter(isVisible);
    return candidates.length ? candidates[candidates.length - 1] : null;
  }

  function getOutlookComposeBody(composeRoot) {
    const bodyNode = (composeRoot && (
      composeRoot.querySelector('div[contenteditable="true"][aria-label*="message"]') ||
      composeRoot.querySelector('div[contenteditable="true"][aria-label*="Message"]') ||
      composeRoot.querySelector('div[contenteditable="true"][role="textbox"]')
    )) || getActiveOutlookComposeBodyNode();
    return safeText(bodyNode ? bodyNode.innerText : '');
  }

  function getOutlookComposeSubject(composeRoot) {
    const subjectInput = (composeRoot && (
      composeRoot.querySelector('input[aria-label*="Subject"]') ||
      composeRoot.querySelector('input[placeholder*="subject"]')
    )) || document.querySelector('input[aria-label*="Subject"], input[placeholder*="subject"]');
    return safeText(subjectInput ? subjectInput.value : '');
  }

  function getOutlookComposeTo(composeRoot) {
    const scope = composeRoot || document;
    const chips = Array.from(scope.querySelectorAll('[data-email], span[title*="@"]'));
    const emails = chips.map((node) => node.getAttribute('data-email') || node.getAttribute('title') || '');
    return uniqueText(emails);
  }

  function findOutlookSendButton(composeRoot) {
    const scope = composeRoot || document;
    const buttons = Array.from(
      scope.querySelectorAll('button[aria-label^="Send"], button[title^="Send"], button[aria-label*="Send"], div[role="button"][aria-label*="Send"]'),
    );
    return buttons.find(isVisible) || null;
  }

  function openQuoteGenFromOutlookCompose(composeRoot) {
    openQuoteGen({
      source: 'outlook-extension-compose',
      subject: getOutlookComposeSubject(composeRoot),
      to: getOutlookComposeTo(composeRoot),
      body: getOutlookComposeBody(composeRoot),
      createdAt: new Date().toISOString(),
    });
  }

  function createOutlookComposeButton(composeRoot) {
    const btn = document.createElement('button');
    btn.className = OUTLOOK_COMPOSE_BTN_CLASS;
    btn.type = 'button';
    btn.textContent = 'Create Quotation';
    btn.style.cssText =
      'margin-right:8px;padding:0 12px;height:32px;border:none;border-radius:16px;' +
      'background:#deecff;color:#0f4aa2;font-weight:600;font-size:12px;cursor:pointer;';
    btn.addEventListener('click', () => openQuoteGenFromOutlookCompose(composeRoot));
    return btn;
  }

  function addOutlookComposeButtons() {
    const roots = getOutlookComposeRoots();
    if (roots.length === 0) {
      const sendButton = findOutlookSendButton(null);
      if (!sendButton || !sendButton.parentElement) return;
      if (sendButton.parentElement.querySelector('.' + OUTLOOK_COMPOSE_BTN_CLASS)) return;
      sendButton.parentElement.insertBefore(createOutlookComposeButton(null), sendButton);
      return;
    }

    roots.forEach((composeRoot) => {
      if (composeRoot.querySelector('.' + OUTLOOK_COMPOSE_BTN_CLASS)) return;
      const sendButton = findOutlookSendButton(composeRoot);
      if (!sendButton || !sendButton.parentElement) return;
      sendButton.parentElement.insertBefore(createOutlookComposeButton(composeRoot), sendButton);
    });
  }

  function getOutlookReadRoot() {
    return (
      document.querySelector('div[aria-label*="Message body"]')?.closest('div[role="main"]') ||
      document.querySelector('div[role="document"]')?.closest('div[role="main"]') ||
      document.querySelector('div[role="main"]')
    );
  }

  function getOutlookReadBody(root) {
    if (!root) return '';
    const bodyNode =
      root.querySelector('div[aria-label*="Message body"]') ||
      root.querySelector('div[role="document"]') ||
      root.querySelector('div[data-app-section="MailReadCompose"]');
    return safeText(bodyNode ? bodyNode.innerText : '');
  }

  function getOutlookReadSubject(root) {
    if (!root) return '';
    return safeText(
      (root.querySelector('h1[role="heading"]') && root.querySelector('h1[role="heading"]').textContent) ||
      (root.querySelector('div[role="heading"]') && root.querySelector('div[role="heading"]').textContent) ||
      ''
    );
  }

  function getOutlookReadTo(root) {
    if (!root) return '';
    const recipients = Array.from(root.querySelectorAll('[title*="@"]')).map((node) => node.getAttribute('title') || '');
    return uniqueText(recipients);
  }

  function openQuoteGenFromOutlookRead() {
    const root = getOutlookReadRoot();
    openQuoteGen({
      source: 'outlook-extension-read',
      subject: getOutlookReadSubject(root),
      to: getOutlookReadTo(root),
      body: getOutlookReadBody(root),
      createdAt: new Date().toISOString(),
    });
  }

  function addOutlookReadButton() {
    const mainRoot = getOutlookReadRoot();
    if (!mainRoot) return;
    if (mainRoot.querySelector('.' + OUTLOOK_READ_BTN_CLASS)) return;

    const anchor =
      mainRoot.querySelector('button[aria-label*="Reply"]') ||
      mainRoot.querySelector('button[title*="Reply"]') ||
      mainRoot.querySelector('button[aria-label*="Forward"]');

    if (!anchor || !anchor.parentElement) return;

    const btn = document.createElement('button');
    btn.className = OUTLOOK_READ_BTN_CLASS;
    btn.type = 'button';
    btn.textContent = 'Create Quotation';
    btn.style.cssText =
      'margin-right:8px;padding:0 12px;height:32px;border:none;border-radius:16px;' +
      'background:#deecff;color:#0f4aa2;font-weight:600;font-size:12px;cursor:pointer;';
    btn.addEventListener('click', openQuoteGenFromOutlookRead);
    anchor.parentElement.insertBefore(btn, anchor);
  }

  function addOutlookFloatingButton() {
    const existing = document.querySelector('.' + OUTLOOK_FLOATING_BTN_CLASS);
    const isMailSurface = window.location.pathname.toLowerCase().includes('/mail');

    if (!isMailSurface) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return;

    const button = document.createElement('button');
    button.className = OUTLOOK_FLOATING_BTN_CLASS;
    button.type = 'button';
    button.textContent = 'Create Quotation';
    button.style.cssText =
      'position:fixed;right:24px;top:72px;z-index:2147483647;border:none;outline:none;' +
      'padding:10px 14px;border-radius:20px;background:#0f6cbd;color:#fff;font-weight:700;' +
      'font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);';

    button.addEventListener('click', () => {
      const composeBody = getOutlookComposeBody(null);
      if (composeBody) {
        openQuoteGenFromOutlookCompose(null);
        return;
      }
      const readBody = getOutlookReadBody(getOutlookReadRoot());
      if (readBody) {
        openQuoteGenFromOutlookRead();
        return;
      }
      alert('Open an email (read mode) or compose draft first, then click Create Quotation.');
    });

    document.body.appendChild(button);
  }

  function addGmailButtons() {
    addComposeButtons();
    addReadButtons();
    addReadButtonsNearReply();
    addFloatingReadButton();
  }

  function addOutlookButtons() {
    addOutlookComposeButtons();
    addOutlookReadButton();
    addOutlookFloatingButton();
  }

  function addAllButtons() {
    if (IS_GMAIL) addGmailButtons();
    if (IS_OUTLOOK) addOutlookButtons();
  }

  addAllButtons();
  const observer = new MutationObserver(() => addAllButtons());
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(addAllButtons, 1500);
})();
`;
}

export async function downloadChromeExtensionZip(appBaseUrl: string): Promise<void> {
  const { default: JSZip } = await import('jszip');

  const zip = new JSZip();
  zip.file('manifest.json', getManifestJson());
  zip.file('content.js', getContentScript(appBaseUrl));
  zip.file('README.txt', getReadme(appBaseUrl));

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${EXTENSION_NAME}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
