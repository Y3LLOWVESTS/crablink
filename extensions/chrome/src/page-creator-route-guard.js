/**
 * RO:WHAT — Guards CrabLink route ownership across profile, product, and local creator workspaces.
 * RO:WHY — NEXT_LEVEL UX; prevents stale profile/local creator DOM from hiding or appending onto unrelated pages.
 * RO:INTERACTS — page.html, page.js, page-profile-home.js, page-music/article/video/stream/podcast-draft.js, page-workflow.js.
 * RO:INVARIANTS — gateway-only; no backend mutation; no fake publication; no ROC mutation; address bar route wins over stale developerJson.
 * RO:METRICS — none; client-side route hygiene only.
 * RO:CONFIG — none.
 * RO:SECURITY — no network calls; no storage writes; no innerHTML; hides stale local sections only.
 * RO:TEST — node --check; manual profile→image→site→music→article→video→stream→podcast→site route switching.
 */

const STYLE_ID = 'crablinkCreatorRouteGuardStyles';

const CREATOR_ROUTES = Object.freeze({
  music: {
    url: 'crab://music',
    sectionId: 'musicDraftSection',
    bodyClass: 'crablink-music-draft-view-mode',
    title: 'RON Music Studio'
  },
  article: {
    url: 'crab://article',
    sectionId: 'articleDraftSection',
    bodyClass: 'crablink-article-draft-view-mode',
    title: 'Article Draft'
  },
  video: {
    url: 'crab://video',
    sectionId: 'videoDraftSection',
    bodyClass: 'crablink-video-draft-view-mode',
    title: 'Video Draft'
  },
  stream: {
    url: 'crab://stream',
    sectionId: 'streamDraftSection',
    bodyClass: 'crablink-stream-draft-view-mode',
    title: 'Stream Studio'
  },
  podcast: {
    url: 'crab://podcast',
    sectionId: 'podcastDraftSection',
    bodyClass: 'crablink-podcast-draft-view-mode',
    title: 'Podcast Studio'
  }
});

const PRODUCT_ROUTES = new Set(['crab://site', 'crab://image']);

const CREATOR_SECTION_IDS = Object.values(CREATOR_ROUTES).map((route) => route.sectionId);
const CREATOR_BODY_CLASSES = Object.values(CREATOR_ROUTES).map((route) => route.bodyClass);

const GENERIC_PANEL_IDS = [
  'sitePageSection',
  'workflowSection',
  'actionsSection',
  'fieldsSection',
  'warningsSection',
  'prepareSummary',
  'holdSection',
  'submitSection'
];

const PROFILE_SECTION_ID = 'profileHomeSection';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const SITE_FULL_VIEW_CLASS = 'crablink-site-full-view-mode';

let guardTimer = 0;
let lastGuardSignature = '';
let lastAnnouncedRoute = '';

function boot() {
  installStyles();
  scheduleGuard('boot');

  window.setTimeout(() => scheduleGuard('boot-100'), 100);
  window.setTimeout(() => scheduleGuard('boot-450'), 450);
  window.setTimeout(() => scheduleGuard('boot-1200'), 1200);

  const observed = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(() => scheduleGuard('mutation'));
    observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open', 'data-crablink-creator-route', 'data-crablink-active-route-kind']
    });
  }

  window.addEventListener('popstate', () => scheduleGuard('popstate'));
  window.addEventListener('hashchange', () => scheduleGuard('hashchange'));

  document.addEventListener(
    'submit',
    (event) => {
      if (event.target?.id === 'addressForm') {
        window.setTimeout(() => scheduleGuard('address-submit'), 0);
        window.setTimeout(() => scheduleGuard('address-submit-late'), 240);
        window.setTimeout(() => scheduleGuard('address-submit-final'), 700);
      }
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target?.closest?.('[data-open-crab]');
      if (!target) return;

      window.setTimeout(() => scheduleGuard('quick-nav-click'), 0);
      window.setTimeout(() => scheduleGuard('quick-nav-click-late'), 240);
      window.setTimeout(() => scheduleGuard('quick-nav-click-final'), 700);
    },
    true
  );

  document.addEventListener('crablink:creator-route-guard', () => scheduleGuard('custom'));
}

function scheduleGuard(reason) {
  window.clearTimeout(guardTimer);
  guardTimer = window.setTimeout(() => runRouteGuard(reason), 35);
}

function runRouteGuard(reason) {
  const currentUrl = currentCrabUrl();
  const creatorRouteName = routeNameForCreatorUrl(currentUrl);
  const isProfile = isProfileUrl(currentUrl);
  const isProduct = PRODUCT_ROUTES.has(currentUrl);

  const signature = JSON.stringify({
    reason,
    currentUrl,
    creatorRouteName,
    isProfile,
    isProduct,
    bodyProfile: document.body?.classList.contains(PROFILE_VIEW_CLASS),
    bodyCreatorClasses: CREATOR_BODY_CLASSES.filter((className) => document.body?.classList.contains(className)),
    bodyRoute: document.body?.getAttribute('data-crablink-creator-route') || '',
    profileVisible: isVisible(document.getElementById(PROFILE_SECTION_ID)),
    sections: CREATOR_SECTION_IDS.filter((id) => Boolean(document.getElementById(id))),
    workflowHidden: document.getElementById('workflowSection')?.classList.contains('hidden') || false,
    workflowHasFields: hasChildren('workflowFields')
  });

  if (signature === lastGuardSignature) {
    return;
  }

  lastGuardSignature = signature;

  if (isProfile) {
    markActiveKind('profile');
    clearCreatorState({ removeCreatorSections: true });
    lastAnnouncedRoute = '';
    return;
  }

  hideStaleProfileSurface();

  if (creatorRouteName) {
    markActiveKind('creator');
    enforceCreatorRoute(creatorRouteName);
    return;
  }

  clearCreatorState({ removeCreatorSections: Boolean(currentUrl.startsWith('crab://')) });

  if (isProduct) {
    markActiveKind('product');
    restoreProductPanelsAfterProfileCleanup();
    setFooterSoft('Product page route active. Restored product panels after profile/creator cleanup.');
    lastAnnouncedRoute = '';
    return;
  }

  markActiveKind(currentUrl ? 'other' : 'none');
  lastAnnouncedRoute = '';
}

function enforceCreatorRoute(routeName) {
  const route = CREATOR_ROUTES[routeName];
  if (!route) return;

  enforceCreatorBodyClass(routeName);
  removeInactiveCreatorSections(routeName);
  hideGenericPanelsForCreatorRoute();
  hideStaleProfileSurface();
  markPagePanelAsCreator(routeName);
  announceCreatorRoute(routeName, route);
}

function enforceCreatorBodyClass(activeRouteName) {
  if (!document.body) return;

  const activeClass = CREATOR_ROUTES[activeRouteName]?.bodyClass;

  for (const className of CREATOR_BODY_CLASSES) {
    if (className !== activeClass) {
      document.body.classList.remove(className);
    }
  }

  if (activeClass) {
    document.body.classList.add(activeClass);
  }

  document.body.classList.remove(PROFILE_VIEW_CLASS);
  document.body.classList.remove(SITE_FULL_VIEW_CLASS);
  document.body.setAttribute('data-crablink-creator-route', activeRouteName);
}

function clearCreatorState({ removeCreatorSections }) {
  if (!document.body) return;

  for (const className of CREATOR_BODY_CLASSES) {
    document.body.classList.remove(className);
  }

  document.body.removeAttribute('data-crablink-creator-route');

  if (removeCreatorSections) {
    for (const sectionId of CREATOR_SECTION_IDS) {
      document.getElementById(sectionId)?.remove();
    }
  }
}

function hideStaleProfileSurface() {
  if (!document.body) return;

  document.body.classList.remove(PROFILE_VIEW_CLASS);

  const section = document.getElementById(PROFILE_SECTION_ID);
  if (section) {
    section.classList.add('hidden');
    section.setAttribute('aria-hidden', 'true');
  }
}

function removeInactiveCreatorSections(activeRouteName) {
  const activeSectionId = CREATOR_ROUTES[activeRouteName]?.sectionId;

  for (const sectionId of CREATOR_SECTION_IDS) {
    if (sectionId === activeSectionId) continue;

    const section = document.getElementById(sectionId);
    if (section) {
      section.remove();
    }
  }
}

function hideGenericPanelsForCreatorRoute() {
  for (const id of GENERIC_PANEL_IDS) {
    const node = document.getElementById(id);
    if (!node) continue;

    node.classList.add('hidden');
    node.setAttribute('aria-hidden', 'true');
  }

  const hero = document.querySelector('#pagePanel > .page-hero');
  if (hero) {
    hero.classList.remove('hidden');
    hero.removeAttribute('aria-hidden');
  }

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.classList.remove('hidden');
    facts.removeAttribute('aria-hidden');
  }
}

function restoreProductPanelsAfterProfileCleanup() {
  const pagePanel = document.getElementById('pagePanel');
  if (pagePanel) {
    pagePanel.classList.remove('hidden');
    pagePanel.removeAttribute('aria-hidden');
    pagePanel.removeAttribute('data-crablink-local-creator-route');
  }

  const hero = document.querySelector('#pagePanel > .page-hero');
  if (hero) {
    hero.classList.remove('hidden');
    hero.removeAttribute('aria-hidden');
  }

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.classList.remove('hidden');
    facts.removeAttribute('aria-hidden');
  }

  restorePanelIfPopulated('workflowSection', ['workflowFields']);
  restorePanelIfPopulated('actionsSection', ['actionsList']);
  restorePanelIfPopulated('fieldsSection', ['fieldsList']);
  restorePanelIfPopulated('warningsSection', ['warningsList']);
  restorePanelIfPopulated('sitePageSection', ['sitePageCards']);

  restorePanelIfMeaningful('prepareSummary', ['prepareSummaryCards', 'prepareNextStepsList']);
  restorePanelIfMeaningful('holdSection', ['holdSummaryCards']);
  restorePanelIfMeaningful('submitSection', ['submitSummaryCards']);

  document.body?.classList.remove(SITE_FULL_VIEW_CLASS);
}

function restorePanelIfPopulated(panelId, childContainerIds) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const populated = childContainerIds.some((id) => hasChildren(id));
  if (!populated) return;

  panel.classList.remove('hidden');
  panel.removeAttribute('aria-hidden');
}

function restorePanelIfMeaningful(panelId, childContainerIds) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const populated = childContainerIds.some((id) => hasChildren(id));
  if (!populated) return;

  const hasNonDefaultText = meaningfulText(panel).length > 0;
  if (!hasNonDefaultText) return;

  panel.classList.remove('hidden');
  panel.removeAttribute('aria-hidden');
}

function markPagePanelAsCreator(routeName) {
  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  pagePanel.classList.remove('hidden');
  pagePanel.setAttribute('data-crablink-local-creator-route', routeName);
}

function markActiveKind(kind) {
  if (!document.body) return;
  document.body.setAttribute('data-crablink-active-route-kind', kind);
}

function announceCreatorRoute(routeName, route) {
  if (lastAnnouncedRoute === routeName) return;

  lastAnnouncedRoute = routeName;
  setFooter(`${route.title} workspace active. Local draft only; no publication or ROC mutation on page load.`);
}

function currentCrabUrl() {
  const addressRaw = String(document.getElementById('addressInput')?.value || '').trim();
  const address = normalizeCrabUrl(addressRaw);

  if (addressRaw.toLowerCase().startsWith('crab://')) {
    return address;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeCrabUrl(params.get('url') || params.get('crab') || '');
  } catch {
    return '';
  }
}

function normalizeCrabUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();

  if (!lower.startsWith('crab://')) {
    return '';
  }

  return lower.replace(/\/+$/, '');
}

function routeNameForCreatorUrl(url) {
  for (const [routeName, route] of Object.entries(CREATOR_ROUTES)) {
    if (url === route.url) {
      return routeName;
    }
  }

  return '';
}

function isProfileUrl(url) {
  if (!url) return false;

  if (url === 'crab://profile' || url === 'crab://me') return true;

  const body = url.slice('crab://'.length);
  if (!body) return false;

  if (body.startsWith('@')) return /^@[a-z0-9][a-z0-9._-]{1,31}$/.test(body);
  if (body.startsWith('profile/')) return /^profile\/@?[a-z0-9][a-z0-9._-]{1,31}$/.test(body);
  if (body.endsWith('.profile')) return /^@?[a-z0-9][a-z0-9._-]{1,31}\.profile$/.test(body);

  return false;
}

function hasChildren(id) {
  const node = document.getElementById(id);
  return Boolean(node && node.children && node.children.length > 0);
}

function isVisible(node) {
  return Boolean(node && !node.classList.contains('hidden'));
}

function meaningfulText(node) {
  if (!node) return '';

  return String(node.textContent || '')
    .replace(/No wallet hold requested yet\./g, '')
    .replace(/No submit response yet\./g, '')
    .replace(/No prepare response yet\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) {
    footer.textContent = message;
  }
}

function setFooterSoft(message) {
  const footer = document.getElementById('footerStatus');
  if (!footer) return;

  const current = String(footer.textContent || '');
  if (!current || current === 'Ready.' || current.includes('profile') || current.includes('creator')) {
    footer.textContent = message;
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body[data-crablink-active-route-kind="product"] #profileHomeSection,
    body[data-crablink-active-route-kind="creator"] #profileHomeSection,
    body[data-crablink-active-route-kind="other"] #profileHomeSection,
    body[data-crablink-active-route-kind="none"] #profileHomeSection {
      display: none !important;
    }

    body[data-crablink-active-route-kind="product"] #musicDraftSection,
    body[data-crablink-active-route-kind="product"] #articleDraftSection,
    body[data-crablink-active-route-kind="product"] #videoDraftSection,
    body[data-crablink-active-route-kind="product"] #streamDraftSection,
    body[data-crablink-active-route-kind="product"] #podcastDraftSection,
    body[data-crablink-active-route-kind="profile"] #musicDraftSection,
    body[data-crablink-active-route-kind="profile"] #articleDraftSection,
    body[data-crablink-active-route-kind="profile"] #videoDraftSection,
    body[data-crablink-active-route-kind="profile"] #streamDraftSection,
    body[data-crablink-active-route-kind="profile"] #podcastDraftSection,
    body[data-crablink-active-route-kind="other"] #musicDraftSection,
    body[data-crablink-active-route-kind="other"] #articleDraftSection,
    body[data-crablink-active-route-kind="other"] #videoDraftSection,
    body[data-crablink-active-route-kind="other"] #streamDraftSection,
    body[data-crablink-active-route-kind="other"] #podcastDraftSection {
      display: none !important;
    }

    body[data-crablink-creator-route="music"] #articleDraftSection,
    body[data-crablink-creator-route="music"] #videoDraftSection,
    body[data-crablink-creator-route="music"] #streamDraftSection,
    body[data-crablink-creator-route="music"] #podcastDraftSection,
    body[data-crablink-creator-route="article"] #musicDraftSection,
    body[data-crablink-creator-route="article"] #videoDraftSection,
    body[data-crablink-creator-route="article"] #streamDraftSection,
    body[data-crablink-creator-route="article"] #podcastDraftSection,
    body[data-crablink-creator-route="video"] #musicDraftSection,
    body[data-crablink-creator-route="video"] #articleDraftSection,
    body[data-crablink-creator-route="video"] #streamDraftSection,
    body[data-crablink-creator-route="video"] #podcastDraftSection,
    body[data-crablink-creator-route="stream"] #musicDraftSection,
    body[data-crablink-creator-route="stream"] #articleDraftSection,
    body[data-crablink-creator-route="stream"] #videoDraftSection,
    body[data-crablink-creator-route="stream"] #podcastDraftSection,
    body[data-crablink-creator-route="podcast"] #musicDraftSection,
    body[data-crablink-creator-route="podcast"] #articleDraftSection,
    body[data-crablink-creator-route="podcast"] #videoDraftSection,
    body[data-crablink-creator-route="podcast"] #streamDraftSection {
      display: none !important;
    }

    body[data-crablink-creator-route="music"] #workflowSection,
    body[data-crablink-creator-route="music"] #actionsSection,
    body[data-crablink-creator-route="music"] #fieldsSection,
    body[data-crablink-creator-route="music"] #warningsSection,
    body[data-crablink-creator-route="music"] #sitePageSection,
    body[data-crablink-creator-route="music"] #prepareSummary,
    body[data-crablink-creator-route="music"] #holdSection,
    body[data-crablink-creator-route="music"] #submitSection,
    body[data-crablink-creator-route="article"] #workflowSection,
    body[data-crablink-creator-route="article"] #actionsSection,
    body[data-crablink-creator-route="article"] #fieldsSection,
    body[data-crablink-creator-route="article"] #warningsSection,
    body[data-crablink-creator-route="article"] #sitePageSection,
    body[data-crablink-creator-route="article"] #prepareSummary,
    body[data-crablink-creator-route="article"] #holdSection,
    body[data-crablink-creator-route="article"] #submitSection,
    body[data-crablink-creator-route="video"] #workflowSection,
    body[data-crablink-creator-route="video"] #actionsSection,
    body[data-crablink-creator-route="video"] #fieldsSection,
    body[data-crablink-creator-route="video"] #warningsSection,
    body[data-crablink-creator-route="video"] #sitePageSection,
    body[data-crablink-creator-route="video"] #prepareSummary,
    body[data-crablink-creator-route="video"] #holdSection,
    body[data-crablink-creator-route="video"] #submitSection,
    body[data-crablink-creator-route="stream"] #workflowSection,
    body[data-crablink-creator-route="stream"] #actionsSection,
    body[data-crablink-creator-route="stream"] #fieldsSection,
    body[data-crablink-creator-route="stream"] #warningsSection,
    body[data-crablink-creator-route="stream"] #sitePageSection,
    body[data-crablink-creator-route="stream"] #prepareSummary,
    body[data-crablink-creator-route="stream"] #holdSection,
    body[data-crablink-creator-route="stream"] #submitSection,
    body[data-crablink-creator-route="podcast"] #workflowSection,
    body[data-crablink-creator-route="podcast"] #actionsSection,
    body[data-crablink-creator-route="podcast"] #fieldsSection,
    body[data-crablink-creator-route="podcast"] #warningsSection,
    body[data-crablink-creator-route="podcast"] #sitePageSection,
    body[data-crablink-creator-route="podcast"] #prepareSummary,
    body[data-crablink-creator-route="podcast"] #holdSection,
    body[data-crablink-creator-route="podcast"] #submitSection {
      display: none !important;
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}