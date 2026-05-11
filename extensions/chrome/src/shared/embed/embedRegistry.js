/**
 * RO:WHAT — Safe declarative embed registry for CrabLink-rendered site previews.
 * RO:WHY — Centralizes <crab-image> and future embed handling so each page does not invent unsafe parsing.
 * RO:INTERACTS — safeHtml.js, sandboxFrame.js, SiteRender.jsx, future asset/site/page renderers.
 * RO:INVARIANTS — no arbitrary execution; unsupported embeds fail closed; no fake backend truth; no direct internal-service calls.
 * RO:METRICS — exposes render summary counts for developer diagnostics.
 * RO:CONFIG — caller may provide resolveAssetUrl(crabUrl, kind) for gateway-backed media URLs.
 * RO:SECURITY — only inert HTML is emitted; scripts/events/forms are not enabled here.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; named site with <crab-image> preview smoke.
 */

const CRAB_IMAGE_RE = /^crab:\/\/([0-9a-f]{64})\.image$/i;
const GENERIC_CRAB_TYPED_RE = /^crab:\/\/([0-9a-f]{64})\.([a-z][a-z0-9_-]{0,31})$/i;

export const EMBED_REGISTRY_VERSION = 'crablink.embed-registry.v1';

export const SUPPORTED_EMBEDS = Object.freeze({
  'crab-image': Object.freeze({
    tag: 'crab-image',
    kind: 'image',
    status: 'active',
    summary: 'Safe image embed backed by crab://<hash>.image.',
  }),
  'crab-video': Object.freeze({
    tag: 'crab-video',
    kind: 'video',
    status: 'feature_gated',
    summary: 'Future video embed; blocked until backend media routes and renderer policy are ready.',
  }),
  'crab-audio': Object.freeze({
    tag: 'crab-audio',
    kind: 'audio',
    status: 'feature_gated',
    summary: 'Future audio/music embed; blocked until backend media routes and renderer policy are ready.',
  }),
  'crab-article': Object.freeze({
    tag: 'crab-article',
    kind: 'article',
    status: 'feature_gated',
    summary: 'Future article embed; blocked until article assets are backend-supported.',
  }),
  'crab-post': Object.freeze({
    tag: 'crab-post',
    kind: 'post',
    status: 'feature_gated',
    summary: 'Future post embed; blocked until post assets are backend-supported.',
  }),
  'crab-comment': Object.freeze({
    tag: 'crab-comment',
    kind: 'comment',
    status: 'feature_gated',
    summary: 'Future comment embed; blocked until comment assets are backend-supported.',
  }),
});

export function initEmbedRegistry() {
  return {
    ok: true,
    module: 'extensions/chrome/src/shared/embed/embedRegistry.js',
    scaffold: false,
    version: EMBED_REGISTRY_VERSION,
    supported: Object.keys(SUPPORTED_EMBEDS),
  };
}

export function renderSafeEmbeds(html, options = {}) {
  const summary = createEmbedSummary();
  let output = String(html || '');

  output = renderCrabImages(output, options, summary);
  output = renderFeatureGatedEmbeds(output, summary);

  return {
    html: output,
    summary: freezeSummary(summary),
  };
}

export function isSupportedEmbedTag(tagName) {
  return Boolean(SUPPORTED_EMBEDS[String(tagName || '').trim().toLowerCase()]);
}

export function parseCrabTypedUrl(value) {
  const raw = String(value || '').trim();
  const match = raw.match(GENERIC_CRAB_TYPED_RE);

  if (!match) {
    return null;
  }

  const hash = match[1].toLowerCase();
  const kind = match[2].toLowerCase();

  return Object.freeze({
    hash,
    kind,
    cid: `b3:${hash}`,
    crabUrl: `crab://${hash}.${kind}`,
  });
}

function renderCrabImages(html, options, summary) {
  return String(html || '').replace(/<crab-image\b([^>]*)>(?:\s*<\/crab-image>)?/gi, (_match, attrs) => {
    summary.encountered += 1;

    const parsedAttrs = parseAttributes(attrs);
    const src = String(parsedAttrs.src || parsedAttrs.href || '').trim();
    const alt = String(parsedAttrs.alt || 'CrabLink image asset').slice(0, 240);
    const title = String(parsedAttrs.title || alt).slice(0, 180);
    const caption = String(parsedAttrs.caption || '').slice(0, 280);
    const typed = parseCrabTypedUrl(src);

    if (!typed || typed.kind !== 'image' || !CRAB_IMAGE_RE.test(src)) {
      summary.blocked += 1;
      summary.blocked_reasons.invalid_image_src += 1;

      return warningEmbedHtml({
        title: 'Blocked crab-image embed',
        message: src
          ? 'The embed source must be crab://<64 lowercase hex>.image.'
          : 'The embed is missing a crab://<hash>.image source.',
        detail: src || 'missing src',
      });
    }

    const imageUrl = resolveAssetUrl(src, 'image', options);

    if (!imageUrl) {
      summary.blocked += 1;
      summary.blocked_reasons.unresolved_image += 1;

      return warningEmbedHtml({
        title: 'Image embed unresolved',
        message: 'The site referenced a valid image asset, but this renderer did not receive a gateway URL for the bytes.',
        detail: src,
      });
    }

    summary.rendered += 1;
    summary.rendered_by_kind.image += 1;

    return [
      '<figure class="crablink-embed crablink-embed-image">',
      `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`,
      '<figcaption>',
      `<strong>${escapeHtml(title)}</strong>`,
      caption ? `<span>${escapeHtml(caption)}</span>` : '',
      `<small>${escapeHtml(src)}</small>`,
      '</figcaption>',
      '</figure>',
    ].join('');
  });
}

function renderFeatureGatedEmbeds(html, summary) {
  let output = String(html || '');

  for (const tag of Object.keys(SUPPORTED_EMBEDS)) {
    if (tag === 'crab-image') {
      continue;
    }

    const pattern = new RegExp(`<${tag}\\b([^>]*)>(?:[\\s\\S]*?<\\/${tag}>)?`, 'gi');

    output = output.replace(pattern, (_match, attrs) => {
      summary.encountered += 1;
      summary.blocked += 1;
      summary.blocked_reasons.feature_gated += 1;

      const parsedAttrs = parseAttributes(attrs);
      const src = String(parsedAttrs.src || parsedAttrs.href || '').trim();
      const spec = SUPPORTED_EMBEDS[tag];

      return warningEmbedHtml({
        title: `${tag} is feature-gated`,
        message: spec.summary,
        detail: src || `kind=${spec.kind}`,
      });
    });
  }

  return output;
}

function resolveAssetUrl(crabUrl, kind, options) {
  if (typeof options.resolveAssetUrl === 'function') {
    return String(options.resolveAssetUrl(crabUrl, kind) || '').trim();
  }

  if (typeof options.siteClient?.objectUrlFromCrabImage === 'function' && kind === 'image') {
    return String(options.siteClient.objectUrlFromCrabImage(crabUrl) || '').trim();
  }

  return '';
}

export function parseAttributes(attrs) {
  const out = {};
  const raw = String(attrs || '');
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match = pattern.exec(raw);

  while (match) {
    const key = String(match[1] || '').trim().toLowerCase();
    const value = String(match[3] || match[4] || match[5] || '').trim();

    if (key && isSafeAttributeName(key)) {
      out[key] = value;
    }

    match = pattern.exec(raw);
  }

  return out;
}

function isSafeAttributeName(name) {
  if (!name || /^on/i.test(name)) {
    return false;
  }

  return /^[a-z][a-z0-9_.:-]{0,40}$/i.test(name);
}

function warningEmbedHtml({ title, message, detail }) {
  return [
    '<div class="crablink-embed crablink-embed-warning" role="note">',
    `<strong>${escapeHtml(title)}</strong>`,
    `<p>${escapeHtml(message)}</p>`,
    detail ? `<small>${escapeHtml(detail)}</small>` : '',
    '</div>',
  ].join('');
}

function createEmbedSummary() {
  return {
    registry_version: EMBED_REGISTRY_VERSION,
    encountered: 0,
    rendered: 0,
    blocked: 0,
    rendered_by_kind: {
      image: 0,
    },
    blocked_reasons: {
      invalid_image_src: 0,
      unresolved_image: 0,
      feature_gated: 0,
    },
  };
}

function freezeSummary(summary) {
  return Object.freeze({
    registry_version: summary.registry_version,
    encountered: summary.encountered,
    rendered: summary.rendered,
    blocked: summary.blocked,
    rendered_by_kind: Object.freeze({ ...summary.rendered_by_kind }),
    blocked_reasons: Object.freeze({ ...summary.blocked_reasons }),
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}