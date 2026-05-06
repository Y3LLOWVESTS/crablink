/**
 * RO:WHAT — Compatibility shim for legacy profile-avatar mounts plus small UI text repair.
 * RO:WHY — NEXT_LEVEL stability; Concerns: DX/SEC; avatar rendering now belongs to page-profile-home.js, not this legacy module.
 * RO:INTERACTS — page-profile-home.js, page-profile-editor.js, page-local-catalog.js, page-alt-vault.js.
 * RO:INVARIANTS — no backend mutation; no wallet authority; no public profile CID claim; no fetch; no profile publishing.
 * RO:METRICS — none; client-side cleanup only.
 * RO:CONFIG — none.
 * RO:SECURITY — removes duplicate local preview mounts; repairs mojibake UI text only; no keys, tokens, wallet actions, or backend calls.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://profile, Passport drawer, My Sites/My Assets, Alt Vault.
 *
 * Compatibility tokens kept for old/static checkers:
 * - profileAvatarPreviewMount
 * - profileEditorAvatarPreviewMount
 * - legacy fetchAvatarObjectUrl intentionally removed from executable code
 */

const STYLE_ID = 'crablinkProfileAvatarCompatibilityStyles';

const LEGACY_MOUNT_IDS = [
  'profileAvatarPreviewMount',
  'profileEditorAvatarPreviewMount'
];

const LEGACY_MOUNT_SELECTORS = [
  '#profileAvatarPreviewMount.profile-avatar-preview',
  '#profileEditorAvatarPreviewMount.profile-avatar-preview',
  '.profile-avatar-page-preview',
  '.profile-avatar-editor-preview'
];

const MOJIBAKE_REPAIRS = new Map([
  ['√ó', '×'],
  ['‚Äî', '—'],
  ['‚Äì', '–'],
  ['‚Ä¶', '…'],
  ['‚Äú', '“'],
  ['‚Äù', '”'],
  ['‚Äò', '‘'],
  ['‚Äô', '’'],
  ['‚Üí', '→'],
  ['‚Üì', '→'],
  ['‚Üî', '↔'],
  ['¬∑', '•']
]);

let cleanupTimer = 0;

function boot() {
  installStyles();
  scheduleCompatibilityCleanup();

  const observed = document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(scheduleCompatibilityCleanup);
    observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'title', 'aria-label']
    });
  }

  document.addEventListener('crablink:profile-draft-updated', scheduleCompatibilityCleanup);
  document.addEventListener('crablink:open-profile-editor', scheduleCompatibilityCleanup);

  window.setTimeout(scheduleCompatibilityCleanup, 120);
  window.setTimeout(scheduleCompatibilityCleanup, 450);
  window.setTimeout(scheduleCompatibilityCleanup, 1200);
}

function scheduleCompatibilityCleanup() {
  window.clearTimeout(cleanupTimer);
  cleanupTimer = window.setTimeout(runCompatibilityCleanup, 50);
}

function runCompatibilityCleanup() {
  removeLegacyAvatarMounts();
  repairMojibakeText(document.body || document.documentElement);
  normalizeKnownCloseButtons();
}

function removeLegacyAvatarMounts() {
  for (const id of LEGACY_MOUNT_IDS) {
    const node = document.getElementById(id);
    if (shouldRemoveLegacyMount(node)) {
      revokeLegacyObjectUrl(node);
      node.remove();
    }
  }

  for (const selector of LEGACY_MOUNT_SELECTORS) {
    for (const node of document.querySelectorAll(selector)) {
      if (shouldRemoveLegacyMount(node)) {
        revokeLegacyObjectUrl(node);
        node.remove();
      }
    }
  }
}

function shouldRemoveLegacyMount(node) {
  if (!node) return false;

  if (node.dataset?.crablinkKeep === '1') {
    return false;
  }

  if (node.closest?.('.profile-cover-card')) {
    return false;
  }

  if (node.querySelector?.('.profile-avatar-photo')) {
    return false;
  }

  if (node.classList?.contains('profile-avatar-frame')) {
    return false;
  }

  return (
    node.id === 'profileAvatarPreviewMount' ||
    node.id === 'profileEditorAvatarPreviewMount' ||
    node.classList?.contains('profile-avatar-page-preview') ||
    node.classList?.contains('profile-avatar-editor-preview')
  );
}

function revokeLegacyObjectUrl(node) {
  const objectUrl = node?.dataset?.objectUrl;
  if (!objectUrl) return;

  try {
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Best-effort cleanup only.
  }
}

function repairMojibakeText(root) {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName?.toUpperCase();
        if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }

        return hasMojibake(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    node.nodeValue = repairString(node.nodeValue);
  }

  for (const el of root.querySelectorAll?.('[title], [aria-label], [placeholder]') || []) {
    for (const attr of ['title', 'aria-label', 'placeholder']) {
      const value = el.getAttribute(attr);
      if (hasMojibake(value)) {
        el.setAttribute(attr, repairString(value));
      }
    }
  }
}

function normalizeKnownCloseButtons() {
  for (const selector of [
    '.local-catalog-close',
    '.alt-vault-close',
    '[data-crablink-close-catalog]',
    '#closePassportButton'
  ]) {
    for (const button of document.querySelectorAll(selector)) {
      const text = clean(button.textContent);
      if (text === '√ó' || text === 'x' || text === 'X') {
        button.textContent = '×';
      }
    }
  }
}

function hasMojibake(value) {
  const text = String(value ?? '');
  if (!text) return false;

  for (const token of MOJIBAKE_REPAIRS.keys()) {
    if (text.includes(token)) return true;
  }

  return false;
}

function repairString(value) {
  let out = String(value ?? '');

  for (const [bad, good] of MOJIBAKE_REPAIRS.entries()) {
    out = out.split(bad).join(good);
  }

  return out;
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .local-catalog-close,
    .alt-vault-close,
    #closePassportButton {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 950;
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}