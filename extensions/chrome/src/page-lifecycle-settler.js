/**
 * RO:WHAT — Final lifecycle/focus settler for CrabLink local creator pages.
 * RO:WHY — Fixes a Chrome/macOS focus race where creator pages sometimes become visible only after app focus changes.
 * RO:INTERACTS — page.html, page.js, page-creator-route-guard.js, page-next-level-panels.js, local creator draft modules.
 * RO:INVARIANTS — no backend calls; no wallet mutation; no storage mutation; no fake b3/publication truth.
 * RO:SECURITY — DOM class/attribute nudges only; no innerHTML; no network; no private state.
 * RO:TEST — node --check; manual fresh-tab load for crab://music, crab://stream, crab://article, crab://video, crab://podcast.
 */

const STYLE_ID = 'crablinkLifecycleSettlerStyles';
const BODY_PULSE_CLASS = 'crablink-lifecycle-pulse';
const PANEL_PULSE_CLASS = 'crablink-page-panel-pulse';

const CREATOR_ROUTES = Object.freeze({
  'crab://music': {
    name: 'music',
    sectionId: 'musicDraftSection',
    bodyClass: 'crablink-music-draft-view-mode'
  },
  'crab://article': {
    name: 'article',
    sectionId: 'articleDraftSection',
    bodyClass: 'crablink-article-draft-view-mode'
  },
  'crab://video': {
    name: 'video',
    sectionId: 'videoDraftSection',
    bodyClass: 'crablink-video-draft-view-mode'
  },
  'crab://stream': {
    name: 'stream',
    sectionId: 'streamDraftSection',
    bodyClass: 'crablink-stream-draft-view-mode'
  },
  'crab://podcast': {
    name: 'podcast',
    sectionId: 'podcastDraftSection',
    bodyClass: 'crablink-podcast-draft-view-mode'
  }
});

let settleTimer = 0;
let mutationTimer = 0;
let activeSettleUntil = 0;
let lastSignature = '';

function boot() {
  installStyles();
  bindEvents();
  armSettler('boot');
  timedBootPasses();
}

function bindEvents() {
  window.addEventListener('pageshow', () => armSettler('pageshow'));
  window.addEventListener('load', () => armSettler('window-load'));
  window.addEventListener('focus', () => armSettler('window-focus'));
  window.addEventListener('resize', () => armSettler('window-resize'));
  window.addEventListener('popstate', () => armSettler('popstate'));
  window.addEventListener('hashchange', () => armSettler('hashchange'));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      armSettler('visibility-visible');
    }
  });

  document.addEventListener(
    'submit',
    (event) => {
      if (event.target?.id === 'addressForm') {
        armSettler('address-submit');
      }
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      if (event.target?.closest?.('[data-open-crab]')) {
        armSettler('quick-nav-click');
      }

      if (event.target?.closest?.('[data-next-level-view-mode]')) {
        armSettler('view-mode-click');
      }
    },
    true
  );

  const root = document.documentElement || document.body;
  if (root) {
    const observer = new MutationObserver(() => {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(() => {
        const route = currentRoute();
        if (CREATOR_ROUTES[route]) {
          armSettler('mutation');
        }
      }, 120);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open', 'data-crablink-creator-route', 'data-crablink-active-route-kind']
    });
  }
}

function timedBootPasses() {
  for (const delay of [0, 16, 60, 140, 320, 700, 1400, 2600]) {
    window.setTimeout(() => armSettler(`boot-${delay}`), delay);
  }

  requestAnimationFrame(() => {
    settleOnce('raf-1');
    requestAnimationFrame(() => settleOnce('raf-2'));
  });
}

function armSettler(reason) {
  activeSettleUntil = Date.now() + 4200;
  scheduleSettle(reason);
}

function scheduleSettle(reason) {
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    settleOnce(reason);
    scheduleFollowup();
  }, 45);
}

function scheduleFollowup() {
  if (Date.now() > activeSettleUntil) return;

  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    settleOnce('followup');
    scheduleFollowup();
  }, 220);
}

function settleOnce(reason) {
  const route = currentRoute();
  const meta = CREATOR_ROUTES[route];

  if (!meta) {
    clearCreatorPulse();
    return;
  }

  const pagePanel = document.getElementById('pagePanel');
  const section = document.getElementById(meta.sectionId);

  markBodyForCreator(route, meta);

  if (pagePanel) {
    pagePanel.classList.remove('hidden');
    pagePanel.removeAttribute('aria-hidden');
    pulseClass(pagePanel, PANEL_PULSE_CLASS);
  }

  if (section) {
    section.classList.remove('hidden');
    section.removeAttribute('aria-hidden');
    pulseClass(section, PANEL_PULSE_CLASS);
  }

  pulseClass(document.body, BODY_PULSE_CLASS);
  dispatchSettlerEvents(route, meta, reason);

  const signature = JSON.stringify({
    route,
    reason,
    pagePanelVisible: Boolean(pagePanel && !pagePanel.classList.contains('hidden')),
    sectionPresent: Boolean(section),
    sectionVisible: Boolean(section && !section.classList.contains('hidden')),
    activeKind: document.body?.getAttribute('data-crablink-active-route-kind') || '',
    creatorRoute: document.body?.getAttribute('data-crablink-creator-route') || ''
  });

  if (signature !== lastSignature) {
    lastSignature = signature;
    setFooterSoft(`${route} lifecycle settled. Local creator controls should be visible.`);
  }
}

function markBodyForCreator(route, meta) {
  if (!document.body) return;

  document.body.setAttribute('data-crablink-active-route-kind', 'creator');
  document.body.setAttribute('data-crablink-creator-route', meta.name);
  document.body.setAttribute('data-crablink-lifecycle-route', route);

  for (const item of Object.values(CREATOR_ROUTES)) {
    document.body.classList.toggle(item.bodyClass, item.bodyClass === meta.bodyClass);
  }
}

function clearCreatorPulse() {
  document.body?.classList.remove(BODY_PULSE_CLASS);
  document.body?.removeAttribute('data-crablink-lifecycle-route');
}

function pulseClass(node, className) {
  if (!node) return;

  node.classList.add(className);

  window.setTimeout(() => {
    node.classList.remove(className);
  }, 40);
}

function dispatchSettlerEvents(route, meta, reason) {
  const detail = {
    route,
    name: meta.name,
    sectionId: meta.sectionId,
    reason,
    source: 'page-lifecycle-settler'
  };

  document.dispatchEvent(new CustomEvent('crablink:lifecycle-settle', { detail }));
  document.dispatchEvent(new CustomEvent('crablink:creator-route-guard', { detail }));
  document.dispatchEvent(new CustomEvent('crablink:local-route-mode', { detail }));
}

function currentRoute() {
  const fromAddress = clean(document.getElementById('addressInput')?.value).toLowerCase();
  if (fromAddress.startsWith('crab://')) return fromAddress.replace(/\/+$/, '');

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = clean(params.get('url') || params.get('crab')).toLowerCase();
    if (fromQuery.startsWith('crab://')) return fromQuery.replace(/\/+$/, '');
  } catch {
    // Query parsing is best-effort only.
  }

  const bodyCreator = clean(document.body?.getAttribute('data-crablink-creator-route')).toLowerCase();
  if (bodyCreator) return `crab://${bodyCreator}`;

  return '';
}

function setFooterSoft(message) {
  const footer = document.getElementById('footerStatus');
  if (!footer) return;

  const current = clean(footer.textContent);
  if (
    !current ||
    current === 'Ready.' ||
    current.includes('lifecycle settled') ||
    current.includes('Builder View') ||
    current.includes('Developer View') ||
    current.includes('workspace active')
  ) {
    footer.textContent = message;
  }
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  const old = document.getElementById(STYLE_ID);
  if (old) old.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${PANEL_PULSE_CLASS} {
      transform: translateZ(0);
    }

    .${BODY_PULSE_CLASS} #pagePanel {
      transform: translateZ(0);
    }

    body[data-crablink-active-route-kind="creator"] #pagePanel {
      display: block;
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}