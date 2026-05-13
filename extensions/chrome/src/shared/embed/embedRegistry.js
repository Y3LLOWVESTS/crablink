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

const HEX_64 = '[0-9a-f]{64}';
const CRAB_IMAGE_RE = new RegExp(`^crab://(${HEX_64})\\.image$`, 'i');
const GENERIC_CRAB_TYPED_RE = new RegExp(`^crab://(${HEX_64})\\.([a-z][a-z0-9_-]{0,31})$`, 'i');

export const EMBED_REGISTRY_VERSION = 'crablink.embed-registry.v3';

export const SUPPORTED_EMBEDS = Object.freeze({
  'crab-image': Object.freeze({
    tag: 'crab-image',
    kind: 'image',
    acceptedKinds: Object.freeze(['image']),
    status: 'active',
    featureGate: null,
    routeContract: 'GET /b3/<hash>.image through svc-gateway',
    summary: 'Safe image embed backed by crab://<hash>.image.',
    placeholderTitle: 'Image embed',
  }),
  'crab-video': Object.freeze({
    tag: 'crab-video',
    kind: 'video',
    acceptedKinds: Object.freeze(['video']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_media_lite',
    routeContract: 'future .video read route; not backend-wired yet',
    summary: 'Future video embed; blocked until backend media-lite routes and renderer policy are ready.',
    placeholderTitle: 'Video embed not backend-wired yet',
  }),
  'crab-audio': Object.freeze({
    tag: 'crab-audio',
    kind: 'audio',
    acceptedKinds: Object.freeze(['audio', 'music', 'song']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_media_lite',
    routeContract: 'future .music/.song audio read route; not backend-wired yet',
    summary: 'Future audio/music embed; blocked until backend media-lite routes and renderer policy are ready.',
    placeholderTitle: 'Audio/music embed not backend-wired yet',
  }),
  'crab-article': Object.freeze({
    tag: 'crab-article',
    kind: 'article',
    acceptedKinds: Object.freeze(['article']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_text',
    routeContract: 'future .article read route; not backend-wired yet',
    summary: 'Future article embed; blocked until article assets are backend-supported.',
    placeholderTitle: 'Article embed not backend-wired yet',
  }),
  'crab-post': Object.freeze({
    tag: 'crab-post',
    kind: 'post',
    acceptedKinds: Object.freeze(['post']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_text',
    routeContract: 'future .post read route; not backend-wired yet',
    summary: 'Future post embed; blocked until post assets are backend-supported.',
    placeholderTitle: 'Post embed not backend-wired yet',
  }),
  'crab-comment': Object.freeze({
    tag: 'crab-comment',
    kind: 'comment',
    acceptedKinds: Object.freeze(['comment']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_text',
    routeContract: 'future .comment read route; not backend-wired yet',
    summary: 'Future comment embed; blocked until comment assets are backend-supported.',
    placeholderTitle: 'Comment embed not backend-wired yet',
  }),
});

export function initEmbedRegistry() {
  return {
    ok: true,
    module: 'extensions/chrome/src/shared/embed/embedRegistry.js',
    scaffold: false,
    version: EMBED_REGISTRY_VERSION,
    supported: Object.keys(SUPPORTED_EMBEDS),
    active: listEmbedSpecs()
      .filter((spec) => spec.status === 'active')
      .map((spec) => spec.tag),
    feature_gated: listEmbedSpecs()
      .filter((spec) => spec.status !== 'active')
      .map((spec) => spec.tag),
  };
}

export function listEmbedSpecs() {
  return Object.freeze(Object.values(SUPPORTED_EMBEDS).map((spec) => Object.freeze({ ...spec })));
}

export function getEmbedSpec(tagName) {
  return SUPPORTED_EMBEDS[normalizeEmbedTag(tagName)] || null;
}

export function normalizeEmbedTag(tagName) {
  return String(tagName || '').trim().toLowerCase();
}

export function isSupportedEmbedTag(tagName) {
  return Boolean(getEmbedSpec(tagName));
}

export function isActiveEmbedTag(tagName) {
  return getEmbedSpec(tagName)?.status === 'active';
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

export function renderSafeEmbeds(html, options = {}) {
  const summary = createEmbedSummary();
  let output = String(html || '');

  output = renderCrabImages(output, options, summary);
  output = renderFeatureGatedEmbeds(output, summary);
  output = renderUnknownCrabEmbeds(output, summary);

  return {
    html: output,
    summary: freezeSummary(summary),
  };
}

export function summarizeReferences(summary = {}) {
  const references = Array.isArray(summary.references) ? summary.references : [];
  const byKind = references.reduce((acc, reference) => {
    const kind = reference.kind || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  const byStatus = references.reduce((acc, reference) => {
    const status = reference.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.freeze({
    total: references.length,
    by_kind: Object.freeze(byKind),
    by_status: Object.freeze(byStatus),
    references: Object.freeze(references.map((reference) => Object.freeze({ ...reference }))),
  });
}

function renderCrabImages(html, options, summary) {
  return String(html || '').replace(/<crab-image\b([^>]*)>(?:\s*<\/crab-image>)?/gi, (_match, attrs) => {
    const spec = SUPPORTED_EMBEDS['crab-image'];
    const tag = spec.tag;
    bumpEncountered(summary, spec.kind);

    const parsedAttrs = parseAttributes(attrs);
    const src = String(parsedAttrs.src || parsedAttrs.href || '').trim();
    const alt = String(parsedAttrs.alt || 'CrabLink image asset').slice(0, 240);
    const title = String(parsedAttrs.title || alt).slice(0, 180);
    const caption = String(parsedAttrs.caption || '').slice(0, 280);
    const typed = parseCrabTypedUrl(src);

    if (!typed || typed.kind !== 'image' || !CRAB_IMAGE_RE.test(src)) {
      bumpBlocked(summary, spec.kind, 'invalid_image_src');
      recordReference(summary, {
        tag,
        kind: typed?.kind || 'image',
        typed,
        src,
        status: 'blocked',
        reason: 'invalid_image_src',
        routeContract: spec.routeContract,
      });

      return warningEmbedHtml({
        tag,
        kind: 'image',
        title: 'Blocked crab-image embed',
        message: src
          ? 'The embed source must be crab://<64 lowercase hex>.image.'
          : 'The embed is missing a crab://<hash>.image source.',
        detail: src || 'missing src',
      });
    }

    const imageUrl = resolveAssetUrl(src, 'image', options);

    if (!imageUrl) {
      bumpBlocked(summary, spec.kind, 'unresolved_image');
      recordReference(summary, {
        tag,
        kind: 'image',
        typed,
        src,
        status: 'blocked',
        reason: 'unresolved_image',
        routeContract: spec.routeContract,
      });

      return warningEmbedHtml({
        tag,
        kind: 'image',
        title: 'Image embed unresolved',
        message: 'The site referenced a valid image asset, but this renderer did not receive a gateway URL for the bytes.',
        detail: src,
      });
    }

    summary.rendered += 1;
    summary.rendered_by_kind.image += 1;
    recordReference(summary, {
      tag,
      kind: 'image',
      typed,
      src,
      status: 'rendered',
      reason: 'gateway_url_resolved',
      routeContract: spec.routeContract,
    });

    return [
      '<figure class="crablink-embed crablink-embed-image" data-crablink-embed="crab-image" data-crablink-kind="image">',
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

  for (const spec of listEmbedSpecs()) {
    if (spec.status === 'active') {
      continue;
    }

    const pattern = new RegExp(`<${spec.tag}\\b([^>]*)>(?:[\\s\\S]*?<\\/${spec.tag}>)?`, 'gi');

    output = output.replace(pattern, (_match, attrs) => {
      bumpEncountered(summary, spec.kind);
      bumpBlocked(summary, spec.kind, 'feature_gated');

      const parsedAttrs = parseAttributes(attrs);
      const src = String(parsedAttrs.src || parsedAttrs.href || '').trim();
      const title = String(parsedAttrs.title || parsedAttrs.label || '').slice(0, 180);
      const typed = parseCrabTypedUrl(src);
      const invalidTypedSrc = Boolean(src && (!typed || !spec.acceptedKinds.includes(typed.kind)));

      if (invalidTypedSrc) {
        summary.blocked_reasons.invalid_feature_gated_src += 1;
      }

      recordReference(summary, {
        tag: spec.tag,
        kind: typed?.kind || spec.kind,
        typed,
        src,
        status: 'feature_gated',
        reason: invalidTypedSrc ? 'invalid_feature_gated_src' : 'not_backend_wired_yet',
        featureGate: spec.featureGate,
        routeContract: spec.routeContract,
      });

      return warningEmbedHtml({
        tag: spec.tag,
        kind: spec.kind,
        title: title || spec.placeholderTitle,
        message: `${spec.summary} CrabLink preserved this reference, but it is not backend-wired yet and will not fake hydration.`,
        detail: src || `${spec.featureGate || 'feature gate'} · ${spec.routeContract}`,
      });
    });
  }

  return output;
}

function renderUnknownCrabEmbeds(html, summary) {
  return String(html || '').replace(/<crab-([a-z0-9_-]+)\b([^>]*)>(?:[\s\S]*?<\/crab-\1>)?/gi, (match, suffix, attrs) => {
    const tag = `crab-${String(suffix || '').toLowerCase()}`;

    if (SUPPORTED_EMBEDS[tag]) {
      return match;
    }

    bumpEncountered(summary, 'unknown');
    bumpBlocked(summary, 'unknown', 'unknown_crab_embed');

    const parsedAttrs = parseAttributes(attrs);
    const src = String(parsedAttrs.src || parsedAttrs.href || '').trim();
    const typed = parseCrabTypedUrl(src);

    recordReference(summary, {
      tag,
      kind: typed?.kind || 'unknown',
      typed,
      src,
      status: 'blocked',
      reason: 'unknown_crab_embed',
      featureGate: 'unregistered_embed_tag',
      routeContract: 'no CrabLink embed registry entry',
    });

    return warningEmbedHtml({
      tag,
      kind: typed?.kind || 'unknown',
      title: `${tag} is not a registered CrabLink embed`,
      message: 'CrabLink blocked this custom crab-* tag because it is not declared in the shared embed registry.',
      detail: src || 'No registered embed contract.',
    });
  });
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

function warningEmbedHtml({ tag, kind, title, message, detail }) {
  return [
    `<div class="crablink-embed crablink-embed-warning crablink-embed-future" role="note" data-crablink-embed="${escapeHtml(tag || 'crab-embed')}" data-crablink-kind="${escapeHtml(kind || 'unknown')}">`,
    '<span class="crablink-embed-status">not backend-wired yet</span>',
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
    references: [],
    encountered_by_kind: {},
    rendered_by_kind: { image: 0 },
    blocked_by_kind: {},
    blocked_reasons: {
      invalid_image_src: 0,
      unresolved_image: 0,
      feature_gated: 0,
      invalid_feature_gated_src: 0,
      unknown_crab_embed: 0,
    },
  };
}

function bumpEncountered(summary, kind) {
  const safeKind = String(kind || 'unknown');
  summary.encountered += 1;
  summary.encountered_by_kind[safeKind] = (summary.encountered_by_kind[safeKind] || 0) + 1;
}

function bumpBlocked(summary, kind, reason) {
  const safeKind = String(kind || 'unknown');
  const safeReason = String(reason || 'blocked');
  summary.blocked += 1;
  summary.blocked_by_kind[safeKind] = (summary.blocked_by_kind[safeKind] || 0) + 1;
  summary.blocked_reasons[safeReason] = (summary.blocked_reasons[safeReason] || 0) + 1;
}

function recordReference(summary, { tag, kind, typed, src, status, reason, featureGate = '', routeContract = '' }) {
  summary.references.push({
    tag: String(tag || 'crab-reference'),
    kind: String(kind || typed?.kind || 'unknown'),
    crabUrl: typed?.crabUrl || String(src || ''),
    cid: typed?.cid || '',
    status: String(status || 'unknown'),
    reason: String(reason || ''),
    feature_gate: String(featureGate || ''),
    route_contract: String(routeContract || ''),
  });
}

function freezeSummary(summary) {
  const references = summary.references.map((reference) => Object.freeze({ ...reference }));

  return Object.freeze({
    registry_version: summary.registry_version,
    encountered: summary.encountered,
    rendered: summary.rendered,
    blocked: summary.blocked,
    references: Object.freeze(references),
    encountered_by_kind: Object.freeze({ ...summary.encountered_by_kind }),
    rendered_by_kind: Object.freeze({ ...summary.rendered_by_kind }),
    blocked_by_kind: Object.freeze({ ...summary.blocked_by_kind }),
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