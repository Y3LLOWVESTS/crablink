/**
 * RO:WHAT — Safe declarative embed registry for CrabLink-rendered site previews.
 * RO:WHY — Centralizes crab-image/post/comment/article handling so sites reference b3 assets without unsafe execution.
 * RO:INTERACTS — safeHtml.js, sandboxFrame.js, SiteSandboxPreview.jsx, siteClient gateway reads, CrabFutureEmbedPlaceholder.jsx.
 * RO:INVARIANTS — no arbitrary execution; unsupported embeds fail closed; no fake backend truth; no direct internal-service calls.
 * RO:METRICS — exposes render summary counts for developer diagnostics.
 * RO:CONFIG — caller may provide resolveAssetUrl(crabUrl, kind) and textAssetCache for gateway-backed embeds.
 * RO:SECURITY — only inert HTML is emitted; scripts/events/forms are not enabled here.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; named site with crab-image/post/comment/article preview smoke.
 */

const HEX_64 = '[0-9a-f]{64}';
const CRAB_IMAGE_RE = new RegExp(`^crab://(${HEX_64})\\.image$`, 'i');
const CRAB_POST_RE = new RegExp(`^crab://(${HEX_64})\\.post$`, 'i');
const CRAB_COMMENT_RE = new RegExp(`^crab://(${HEX_64})\\.comment$`, 'i');
const CRAB_ARTICLE_RE = new RegExp(`^crab://(${HEX_64})\\.article$`, 'i');
const GENERIC_CRAB_TYPED_RE = new RegExp(`^crab://(${HEX_64})\\.([a-z][a-z0-9_-]{0,31})$`, 'i');
const ANY_CRAB_TYPED_SOURCE = `crab://(${HEX_64})\\.([a-z][a-z0-9_-]{0,31})(?:[?#][^\\s"'<>]*)?`;
const CUSTOM_CRAB_TAG_SOURCE = String.raw`<\/?(crab-[a-z0-9-]+)\b[^>]*>`;

export const EMBED_REGISTRY_VERSION = 'crablink.embed-registry.v6';

export const SUPPORTED_EMBEDS = Object.freeze({
  'crab-image': Object.freeze({
    tag: 'crab-image',
    kind: 'image',
    acceptedKinds: Object.freeze(['image']),
    status: 'active',
    featureGate: null,
    routeContract: 'GET /o/b3:<hash> or gateway-derived raw image URL',
    summary: 'Safe image embed backed by crab://<hash>.image.',
    placeholderTitle: 'Image embed',
  }),
  'crab-post': Object.freeze({
    tag: 'crab-post',
    kind: 'post',
    acceptedKinds: Object.freeze(['post']),
    status: 'active',
    featureGate: null,
    routeContract: 'GET /o/b3:<hash> through svc-gateway',
    summary: 'Safe post embed backed by ron.post-content.v1 raw object truth.',
    placeholderTitle: 'Post embed',
  }),
  'crab-comment': Object.freeze({
    tag: 'crab-comment',
    kind: 'comment',
    acceptedKinds: Object.freeze(['comment']),
    status: 'active',
    featureGate: null,
    routeContract: 'GET /o/b3:<hash> through svc-gateway',
    summary: 'Safe comment embed backed by ron.comment-content.v1 raw object truth.',
    placeholderTitle: 'Comment embed',
  }),
  'crab-article': Object.freeze({
    tag: 'crab-article',
    kind: 'article',
    acceptedKinds: Object.freeze(['article']),
    status: 'active',
    featureGate: null,
    routeContract: 'GET /o/b3:<hash> through svc-gateway',
    summary: 'Safe article embed backed by ron.article-content.v1 raw object truth.',
    placeholderTitle: 'Article embed',
  }),
  'crab-video': Object.freeze({
    tag: 'crab-video',
    kind: 'video',
    acceptedKinds: Object.freeze(['video', 'film']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_media_lite',
    routeContract: 'future .video/.film asset read route; not backend-wired yet',
    summary: 'Future video/film embed; blocked until backend media-lite routes and renderer policy are ready.',
    placeholderTitle: 'Video embed is feature-gated',
  }),
  'crab-audio': Object.freeze({
    tag: 'crab-audio',
    kind: 'music',
    acceptedKinds: Object.freeze(['music', 'song', 'podcast', 'stream']),
    status: 'feature_gated',
    featureGate: 'next_level_assets_media_lite',
    routeContract: 'future .music/.song/.podcast/.stream audio read route; not backend-wired yet',
    summary: 'Future audio/music/podcast/stream embed; blocked until backend media-lite routes and renderer policy are ready.',
    placeholderTitle: 'Audio embed is feature-gated',
  }),
});

export function initEmbedRegistry() {
  return Object.freeze({
    ok: true,
    module: 'extensions/chrome/src/shared/embed/embedRegistry.js',
    scaffold: false,
    version: EMBED_REGISTRY_VERSION,
    supported: Object.keys(SUPPORTED_EMBEDS),
    active: Object.values(SUPPORTED_EMBEDS)
      .filter((spec) => spec.status === 'active')
      .map((spec) => spec.tag),
    feature_gated: Object.values(SUPPORTED_EMBEDS)
      .filter((spec) => spec.status !== 'active')
      .map((spec) => spec.tag),
  });
}

export function listEmbedSpecs() {
  return Object.freeze(Object.values(SUPPORTED_EMBEDS).map((spec) => Object.freeze({ ...spec })));
}

export function getEmbedSpec(tag) {
  const safeTag = normalizeTag(tag);
  return SUPPORTED_EMBEDS[safeTag] || null;
}

export function parseCrabTypedUrl(value) {
  const raw = String(value || '').trim();
  const match = raw.match(GENERIC_CRAB_TYPED_RE);

  if (!match) {
    return null;
  }

  const hash = String(match[1] || '').toLowerCase();
  const kind = String(match[2] || '').toLowerCase();

  return Object.freeze({
    hash,
    kind,
    cid: `b3:${hash}`,
    crabUrl: `crab://${hash}.${kind}`,
    tag: tagForKind(kind) || 'crab-reference',
  });
}

export function collectCrabTypedUrls(html, options = {}) {
  const raw = String(html || '');
  const kinds = Array.isArray(options.kinds)
    ? new Set(options.kinds.map((kind) => String(kind || '').trim().toLowerCase()).filter(Boolean))
    : null;
  const seen = new Set();
  const references = [];

  const typedPattern = new RegExp(ANY_CRAB_TYPED_SOURCE, 'gi');
  let match = typedPattern.exec(raw);

  while (match) {
    const hash = String(match[1] || '').toLowerCase();
    const kind = String(match[2] || '').toLowerCase();

    if (!kinds || kinds.has(kind)) {
      const crabUrl = `crab://${hash}.${kind}`;
      const key = `${kind}:${crabUrl}`;

      if (!seen.has(key)) {
        seen.add(key);
        references.push(Object.freeze({
          tag: tagForKind(kind) || 'crab-reference',
          kind,
          hash,
          cid: `b3:${hash}`,
          crabUrl,
        }));
      }
    }

    match = typedPattern.exec(raw);
  }

  return Object.freeze(references);
}

export function renderSafeEmbeds(html, options = {}) {
  const summary = createEmbedSummary();
  const raw = String(html || '');
  let output = raw;

  output = renderCrabImages(output, options, summary);
  output = renderTextAssetEmbeds(output, 'crab-post', CRAB_POST_RE, options, summary);
  output = renderTextAssetEmbeds(output, 'crab-comment', CRAB_COMMENT_RE, options, summary);
  output = renderTextAssetEmbeds(output, 'crab-article', CRAB_ARTICLE_RE, options, summary);
  output = renderFeatureGatedEmbeds(output, summary);
  output = renderUnknownCrabEmbeds(output, summary);

  for (const reference of collectCrabTypedUrls(raw)) {
    pushReference(summary, {
      tag: reference.tag,
      kind: reference.kind,
      crabUrl: reference.crabUrl,
      cid: reference.cid,
      status: isActiveKind(reference.kind) ? 'reference-detected' : 'future-reference-detected',
      detail: `${reference.kind} asset reference`,
    });
  }

  return Object.freeze({
    html: output,
    summary: freezeSummary(summary),
  });
}

export function summarizeReferences(input = {}) {
  let references = [];

  if (typeof input === 'string') {
    references = collectCrabTypedUrls(input).map((reference) => ({
      tag: reference.tag,
      kind: reference.kind,
      crabUrl: reference.crabUrl,
      cid: reference.cid,
      status: isActiveKind(reference.kind) ? 'reference-detected' : 'future-reference-detected',
      detail: `${reference.kind} asset reference`,
    }));

    const tagPattern = new RegExp(CUSTOM_CRAB_TAG_SOURCE, 'gi');
    const seenTags = new Set(references.map((reference) => reference.tag));
    let match = tagPattern.exec(input);

    while (match) {
      const tag = normalizeTag(match[1]);
      if (!seenTags.has(tag)) {
        const spec = getEmbedSpec(tag);
        seenTags.add(tag);
        references.push({
          tag,
          kind: spec?.kind || 'unknown',
          crabUrl: '',
          cid: '',
          status: spec?.status || 'unsupported',
          detail: spec?.summary || 'custom crab tag detected',
        });
      }

      match = tagPattern.exec(input);
    }
  } else {
    references = Array.isArray(input.references) ? input.references : [];
  }

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
    registry_version: EMBED_REGISTRY_VERSION,
    total: references.length,
    by_kind: Object.freeze(byKind),
    by_status: Object.freeze(byStatus),
    references: Object.freeze(references.map((reference) => Object.freeze({ ...reference }))),
  });
}

export function summarizeTextContent(parsed = {}, raw = '', ref = {}) {
  const metadata = objectValue(parsed.metadata);
  const relations = objectValue(parsed.relations);
  const siteConnection = objectValue(parsed.site_connection) || objectValue(parsed.siteConnection);
  const parentReference = objectValue(parsed.parent_reference) || objectValue(parsed.parentReference);
  const threadReference = objectValue(parsed.thread_reference) || objectValue(parsed.threadReference);

  const kind = stringValue(parsed.asset_kind, parsed.kind, ref.kind, kindFromSchema(parsed.schema), 'post').toLowerCase();
  const body = stringValue(parsed.body, parsed.text, parsed.content, raw);
  const title = stringValue(parsed.title, metadata.title, fallbackTitleForKind(kind));
  const tags = normalizeTags(metadata.tags || parsed.tags);

  return Object.freeze({
    schema: stringValue(parsed.schema),
    kind,
    title,
    summary: stringValue(parsed.summary, metadata.summary),
    body,
    bodyPreview: body.length > 240 ? `${body.slice(0, 240)}…` : body,
    tags,
    language: stringValue(metadata.language, parsed.language),
    postKind: stringValue(metadata.post_kind, metadata.postKind, parsed.post_kind, parsed.postKind),
    commentKind: stringValue(metadata.comment_kind, metadata.commentKind, parsed.comment_kind, parsed.commentKind),
    articleKind: stringValue(metadata.article_kind, metadata.articleKind, parsed.article_kind, parsed.articleKind),
    site: stringValue(
      siteConnection.crab_url,
      siteConnection.crabUrl,
      relations.site,
      parsed.site_context_crab_url,
      parsed.siteContextCrabUrl,
    ),
    parent: stringValue(
      parentReference.crab_url,
      parentReference.crabUrl,
      relations.parent,
      relations.target,
      parsed.parent_crab_url,
      parsed.parentCrabUrl,
    ),
    thread: stringValue(
      threadReference.crab_url,
      threadReference.crabUrl,
      relations.thread,
      parsed.thread_context_crab_url,
      parsed.threadContextCrabUrl,
    ),
    heroImage: stringValue(relations.hero_image, metadata.hero_image_crab_url, metadata.heroImageCrabUrl),
  });
}

function renderCrabImages(html, options, summary) {
  return replaceCustomTag(html, 'crab-image', (rawAttrs) => {
    const spec = SUPPORTED_EMBEDS['crab-image'];
    const attrs = parseAttributes(rawAttrs);
    const src = stringValue(attrs.src, attrs.href, attrs['data-src']);
    const parsed = parseCrabTypedUrl(src);

    bumpEncountered(summary, spec.kind);

    if (!parsed || !CRAB_IMAGE_RE.test(parsed.crabUrl)) {
      bumpBlocked(summary, spec.kind, 'invalid_image_src');
      pushReference(summary, {
        tag: spec.tag,
        kind: 'image',
        crabUrl: src,
        cid: '',
        status: 'blocked',
        detail: 'invalid or missing crab://<hash>.image src',
      });

      return warningEmbedHtml({
        title: 'Crab image blocked',
        message: '<crab-image> requires src="crab://<64 lowercase hex>.image".',
        detail: src || 'missing src',
      });
    }

    const resolvedUrl = resolveAssetUrl(parsed.crabUrl, 'image', options);

    if (!isSafeResolvedUrl(resolvedUrl)) {
      bumpBlocked(summary, spec.kind, 'unresolved_image');
      pushReference(summary, {
        tag: spec.tag,
        kind: 'image',
        crabUrl: parsed.crabUrl,
        cid: parsed.cid,
        status: 'blocked',
        detail: 'gateway raw image URL was not available',
      });

      return warningEmbedHtml({
        title: 'Crab image unresolved',
        message: 'CrabLink found a valid image reference, but the configured gateway did not provide a safe raw image URL.',
        detail: parsed.crabUrl,
      });
    }

    const alt = stringValue(attrs.alt, attrs.title, 'CrabLink image');
    const title = stringValue(attrs.title, attrs.caption, alt);
    const caption = stringValue(attrs.caption, attrs['data-caption']);

    bumpRendered(summary, spec.kind);
    pushReference(summary, {
      tag: spec.tag,
      kind: 'image',
      crabUrl: parsed.crabUrl,
      cid: parsed.cid,
      status: 'rendered',
      detail: 'gateway-backed image embed rendered',
    });

    return imageEmbedHtml({
      src: resolvedUrl,
      alt,
      title,
      caption,
      crabUrl: parsed.crabUrl,
      cid: parsed.cid,
    });
  });
}

function renderTextAssetEmbeds(html, tag, expectedRe, options, summary) {
  return replaceCustomTag(html, tag, (rawAttrs) => {
    const spec = SUPPORTED_EMBEDS[tag];
    const attrs = parseAttributes(rawAttrs);
    const src = stringValue(attrs.src, attrs.href, attrs['data-src']);
    const parsed = parseCrabTypedUrl(src);

    bumpEncountered(summary, spec.kind);

    if (!parsed || !expectedRe.test(parsed.crabUrl) || !spec.acceptedKinds.includes(parsed.kind)) {
      bumpBlocked(summary, spec.kind, `invalid_${spec.kind}_src`);
      pushReference(summary, {
        tag: spec.tag,
        kind: spec.kind,
        crabUrl: src,
        cid: '',
        status: 'blocked',
        detail: `invalid or missing crab://<hash>.${spec.kind} src`,
      });

      return warningEmbedHtml({
        title: `Crab ${spec.kind} blocked`,
        message: `<${tag}> requires src="crab://<64 lowercase hex>.${spec.kind}".`,
        detail: src || 'missing src',
      });
    }

    const cached = resolveTextAsset(parsed.crabUrl, options);

    if (!cached || cached.status === 'loading') {
      pushReference(summary, {
        tag: spec.tag,
        kind: parsed.kind,
        crabUrl: parsed.crabUrl,
        cid: parsed.cid,
        status: 'loading',
        detail: `${parsed.kind} content is being fetched through svc-gateway`,
      });

      return loadingEmbedHtml({
        title: `Loading ${parsed.kind} embed`,
        message: `CrabLink found this ${parsed.kind} reference and is fetching the b3-backed content through the configured gateway.`,
        detail: parsed.crabUrl,
      });
    }

    if (cached.status !== 'resolved') {
      bumpBlocked(summary, parsed.kind, `${parsed.kind}_content_unavailable`);
      pushReference(summary, {
        tag: spec.tag,
        kind: parsed.kind,
        crabUrl: parsed.crabUrl,
        cid: parsed.cid,
        status: 'blocked',
        detail: cached.error || `${parsed.kind} content was not available through the gateway`,
      });

      return warningEmbedHtml({
        title: `${labelForKind(parsed.kind)} embed unavailable`,
        message: `The ${parsed.kind} reference is valid, but CrabLink could not read the b3-backed content object from the gateway.`,
        detail: cached.error || parsed.crabUrl,
      });
    }

    const textSummary = cached.summary || summarizeTextContent(cached.parsed || {}, cached.raw || '', parsed);
    const comments = parsed.kind === 'comment' ? [] : relatedCommentsFor(parsed.crabUrl, options);

    bumpRendered(summary, parsed.kind);
    pushReference(summary, {
      tag: spec.tag,
      kind: parsed.kind,
      crabUrl: parsed.crabUrl,
      cid: parsed.cid,
      status: 'rendered',
      detail: `gateway-backed ${parsed.kind} content rendered`,
    });

    if (parsed.kind === 'comment') {
      return commentEmbedHtml({
        crabUrl: parsed.crabUrl,
        cid: parsed.cid,
        title: textSummary.title,
        body: textSummary.body,
        tags: textSummary.tags,
        site: textSummary.site,
        parent: textSummary.parent,
        language: textSummary.language,
        commentKind: textSummary.commentKind,
      });
    }

    return textAssetEmbedHtml({
      kind: parsed.kind,
      tag: spec.tag,
      crabUrl: parsed.crabUrl,
      cid: parsed.cid,
      title: textSummary.title,
      summary: textSummary.summary,
      body: textSummary.body,
      tags: textSummary.tags,
      site: textSummary.site,
      parent: textSummary.parent,
      language: textSummary.language,
      kindMeta: textSummary.articleKind || textSummary.postKind,
      comments,
    });
  });
}

function renderFeatureGatedEmbeds(html, summary) {
  let output = String(html || '');

  for (const spec of Object.values(SUPPORTED_EMBEDS)) {
    if (spec.status === 'active') {
      continue;
    }

    output = replaceCustomTag(output, spec.tag, (rawAttrs) => {
      const attrs = parseAttributes(rawAttrs);
      const src = stringValue(attrs.src, attrs.href, attrs['data-src']);
      const parsed = parseCrabTypedUrl(src);
      const kindOk = parsed && spec.acceptedKinds.includes(parsed.kind);

      bumpEncountered(summary, spec.kind);
      bumpBlocked(summary, spec.kind, 'feature_gated');

      pushReference(summary, {
        tag: spec.tag,
        kind: parsed?.kind || spec.kind,
        crabUrl: parsed?.crabUrl || src,
        cid: parsed?.cid || '',
        status: 'feature-gated',
        detail: kindOk
          ? `${spec.featureGate || 'future feature'} is not active in CrabLink yet`
          : `expected ${spec.acceptedKinds.join(' or ')} typed crab URL`,
      });

      return warningEmbedHtml({
        title: spec.placeholderTitle || `${spec.tag} is feature-gated`,
        message: `${spec.summary} CrabLink keeps this reference visible but will not fake hydration.`,
        detail: src || spec.routeContract || spec.featureGate || '',
      });
    });
  }

  return output;
}

function renderUnknownCrabEmbeds(html, summary) {
  return String(html || '').replace(
    /<crab-([a-z0-9-]+)\b([^>]*)>([\s\S]*?)<\/crab-\1\s*>|<crab-([a-z0-9-]+)\b([^>]*)\/?\s*>/gi,
    (match, pairedName, pairedAttrs, _inner, singleName, singleAttrs) => {
      const tag = normalizeTag(`crab-${pairedName || singleName || ''}`);

      if (SUPPORTED_EMBEDS[tag]) {
        return match;
      }

      const attrs = parseAttributes(pairedAttrs || singleAttrs || '');
      const src = stringValue(attrs.src, attrs.href, attrs['data-src']);
      const parsed = parseCrabTypedUrl(src);

      bumpEncountered(summary, 'unknown');
      bumpBlocked(summary, parsed?.kind || 'unknown', 'unsupported_embed');

      pushReference(summary, {
        tag,
        kind: parsed?.kind || 'unknown',
        crabUrl: parsed?.crabUrl || src,
        cid: parsed?.cid || '',
        status: 'unsupported',
        detail: 'unsupported crab custom element blocked fail-closed',
      });

      return warningEmbedHtml({
        title: 'Unsupported CrabLink embed blocked',
        message: `${tag} is not registered in the CrabLink safe embed registry.`,
        detail: src || 'no src supplied',
      });
    },
  );
}

function replaceCustomTag(html, tag, replacer) {
  const escaped = escapeRegExp(tag);
  const paired = new RegExp(`<${escaped}\\b([^>]*)>([\\s\\S]*?)<\\/${escaped}\\s*>`, 'gi');
  const single = new RegExp(`<${escaped}\\b([^>]*)\\/?\\s*>`, 'gi');

  return String(html || '')
    .replace(paired, (_match, attrs, innerHtml) => replacer(attrs || '', innerHtml || ''))
    .replace(single, (_match, attrs) => replacer(attrs || '', ''));
}

function imageEmbedHtml({ src, alt, title, caption, crabUrl, cid }) {
  return [
    '<figure class="crablink-embed crablink-embed-image" data-crablink-embed="crab-image">',
    `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`,
    '<figcaption>',
    `<strong>${escapeHtml(title)}</strong>`,
    caption ? `<span>${escapeHtml(caption)}</span>` : '',
    `<small>${escapeHtml(crabUrl)}</small>`,
    `<small>${escapeHtml(cid)}</small>`,
    '</figcaption>',
    '</figure>',
  ].join('');
}

function textAssetEmbedHtml({
  kind,
  tag,
  crabUrl,
  cid,
  title,
  summary = '',
  body,
  tags = [],
  site = '',
  parent = '',
  language = '',
  kindMeta = '',
  comments = [],
}) {
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 12) : [];
  const safeComments = Array.isArray(comments) ? comments : [];
  const commentsHtml = commentDropdownHtml(kind, safeComments);

  return [
    `<article class="crablink-embed crablink-embed-text crablink-embed-${escapeAttribute(kind)}" data-crablink-embed="${escapeAttribute(tag)}">`,
    '<div class="crablink-post-shell">',
    `<div class="crablink-post-kicker">${escapeHtml(tag)} · gateway hydrated</div>`,
    `<h2>${escapeHtml(title || fallbackTitleForKind(kind))}</h2>`,
    summary ? `<p class="crablink-embed-summary">${escapeHtml(summary)}</p>` : '',
    `<div class="crablink-embed-body">${escapeParagraphs(body || 'No body returned in the b3-backed content object.')}</div>`,
    safeTags.length
      ? `<div class="crablink-post-tags">${safeTags.map((tagItem) => `<span>${escapeHtml(tagItem)}</span>`).join('')}</div>`
      : '',
    '<dl class="crablink-post-facts">',
    `<div><dt>CID</dt><dd>${escapeHtml(cid)}</dd></div>`,
    `<div><dt>URL</dt><dd>${escapeHtml(crabUrl)}</dd></div>`,
    site ? `<div><dt>Site</dt><dd>${escapeHtml(site)}</dd></div>` : '',
    parent ? `<div><dt>Parent</dt><dd>${escapeHtml(parent)}</dd></div>` : '',
    language ? `<div><dt>Language</dt><dd>${escapeHtml(language)}</dd></div>` : '',
    kindMeta ? `<div><dt>Type</dt><dd>${escapeHtml(kindMeta)}</dd></div>` : '',
    '</dl>',
    commentsHtml,
    '</div>',
    '</article>',
  ].join('');
}

function commentEmbedHtml({ crabUrl, cid, title, body, tags = [], site = '', parent = '', language = '', commentKind = '' }) {
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 12) : [];

  return [
    '<article class="crablink-embed crablink-embed-text crablink-embed-comment" data-crablink-embed="crab-comment">',
    '<div class="crablink-post-shell">',
    '<div class="crablink-post-kicker">crab-comment · gateway hydrated</div>',
    `<h2>${escapeHtml(title || 'Comment')}</h2>`,
    `<div class="crablink-embed-body">${escapeParagraphs(body || 'No body returned in the b3-backed comment content object.')}</div>`,
    safeTags.length
      ? `<div class="crablink-post-tags">${safeTags.map((tagItem) => `<span>${escapeHtml(tagItem)}</span>`).join('')}</div>`
      : '',
    '<dl class="crablink-post-facts">',
    `<div><dt>CID</dt><dd>${escapeHtml(cid)}</dd></div>`,
    `<div><dt>URL</dt><dd>${escapeHtml(crabUrl)}</dd></div>`,
    site ? `<div><dt>Site</dt><dd>${escapeHtml(site)}</dd></div>` : '',
    parent ? `<div><dt>Parent</dt><dd>${escapeHtml(parent)}</dd></div>` : '',
    language ? `<div><dt>Language</dt><dd>${escapeHtml(language)}</dd></div>` : '',
    commentKind ? `<div><dt>Type</dt><dd>${escapeHtml(commentKind)}</dd></div>` : '',
    '</dl>',
    '</div>',
    '</article>',
  ].join('');
}

function commentDropdownHtml(parentKind, comments) {
  if (!comments.length) {
    return [
      '<details class="crablink-embed-comments">',
      '<summary>Comments</summary>',
      `<p class="crablink-embed-muted">No gateway-backed comments were found in this site root for this ${escapeHtml(parentKind)}.</p>`,
      '</details>',
    ].join('');
  }

  return [
    '<details class="crablink-embed-comments">',
    `<summary>${comments.length} comment${comments.length === 1 ? '' : 's'}</summary>`,
    '<div class="crablink-embed-comment-list">',
    comments.map(nestedCommentHtml).join(''),
    '</div>',
    '</details>',
  ].join('');
}

function nestedCommentHtml(comment) {
  const summary = comment.summary || {};
  const title = stringValue(summary.title, 'Comment');
  const body = stringValue(summary.body, summary.bodyPreview);
  const url = stringValue(comment.crabUrl, comment.ref?.crabUrl);

  return [
    '<article class="crablink-embed-nested-comment">',
    `<strong>${escapeHtml(title)}</strong>`,
    body ? `<div>${escapeParagraphs(body)}</div>` : '',
    summary.language || summary.commentKind
      ? `<small>${escapeHtml([summary.commentKind, summary.language].filter(Boolean).join(' · '))}</small>`
      : '',
    url ? `<small>${escapeHtml(url)}</small>` : '',
    '</article>',
  ].join('');
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

function loadingEmbedHtml({ title, message, detail }) {
  return [
    '<div class="crablink-embed crablink-embed-warning crablink-embed-loading" role="status">',
    `<strong>${escapeHtml(title)}</strong>`,
    `<p>${escapeHtml(message)}</p>`,
    detail ? `<small>${escapeHtml(detail)}</small>` : '',
    '</div>',
  ].join('');
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

function resolveTextAsset(crabUrl, options) {
  const cache = options.textAssetCache || options.textAssets || {};
  const direct = cache[crabUrl] || cache[String(crabUrl || '').toLowerCase()];

  if (direct) {
    return direct;
  }

  const parsed = parseCrabTypedUrl(crabUrl);
  if (parsed?.cid && cache[parsed.cid]) {
    return cache[parsed.cid];
  }

  return null;
}

function relatedCommentsFor(parentCrabUrl, options) {
  const cache = options.textAssetCache || options.textAssets || {};
  const parent = String(parentCrabUrl || '').toLowerCase();

  return Object.entries(cache)
    .map(([crabUrl, entry]) => {
      const parsed = parseCrabTypedUrl(crabUrl);
      const summary = entry?.summary || summarizeTextContent(entry?.parsed || {}, entry?.raw || '', parsed || { crabUrl, kind: 'comment' });

      return {
        crabUrl,
        ...entry,
        summary,
      };
    })
    .filter((entry) => entry?.status === 'resolved')
    .filter((entry) => String(entry?.summary?.kind || '').toLowerCase() === 'comment')
    .filter((entry) => String(entry?.summary?.parent || '').toLowerCase() === parent)
    .sort((a, b) => String(a.crabUrl || '').localeCompare(String(b.crabUrl || '')));
}

function parseAttributes(rawAttrs) {
  const attrs = {};
  const input = String(rawAttrs || '');
  const pattern = /([:@a-zA-Z_][\w:.-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g;
  let match = pattern.exec(input);

  while (match) {
    const name = String(match[1] || '').toLowerCase();
    const rawValue = String(match[2] || '');

    if (isSafeAttributeName(name)) {
      attrs[name] = unquoteAttribute(rawValue);
    }

    match = pattern.exec(input);
  }

  return attrs;
}

function unquoteAttribute(value) {
  const raw = String(value || '').trim();

  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return decodeEntities(raw.slice(1, -1));
  }

  return decodeEntities(raw);
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function createEmbedSummary() {
  return {
    registry_version: EMBED_REGISTRY_VERSION,
    encountered: 0,
    rendered: 0,
    blocked: 0,
    rendered_by_kind: {
      image: 0,
      post: 0,
      comment: 0,
      article: 0,
    },
    blocked_by_kind: {
      image: 0,
      video: 0,
      music: 0,
      article: 0,
      post: 0,
      comment: 0,
      unknown: 0,
    },
    blocked_reasons: {
      invalid_image_src: 0,
      unresolved_image: 0,
      invalid_post_src: 0,
      invalid_comment_src: 0,
      invalid_article_src: 0,
      post_content_unavailable: 0,
      comment_content_unavailable: 0,
      article_content_unavailable: 0,
      feature_gated: 0,
      unsupported_embed: 0,
    },
    encountered_by_kind: {
      image: 0,
      post: 0,
      comment: 0,
      article: 0,
    },
    references: [],
  };
}

function freezeSummary(summary) {
  return Object.freeze({
    registry_version: summary.registry_version,
    encountered: summary.encountered,
    rendered: summary.rendered,
    blocked: summary.blocked,
    rendered_by_kind: Object.freeze({ ...summary.rendered_by_kind }),
    blocked_by_kind: Object.freeze({ ...summary.blocked_by_kind }),
    blocked_reasons: Object.freeze({ ...summary.blocked_reasons }),
    encountered_by_kind: Object.freeze({ ...summary.encountered_by_kind }),
    references: summary.references.map((reference) => Object.freeze({ ...reference })),
  });
}

function pushReference(summary, reference) {
  if (!reference) return;

  const crabUrl = String(reference.crabUrl || '').trim();
  const tag = normalizeTag(reference.tag || 'crab-reference');
  const kind = String(reference.kind || '').trim().toLowerCase() || 'unknown';
  const key = `${tag}:${kind}:${crabUrl}:${reference.status || ''}`;

  if (summary.references.some((item) => item.key === key)) {
    return;
  }

  summary.references.push({
    key,
    tag,
    kind,
    crabUrl,
    cid: String(reference.cid || '').trim(),
    status: String(reference.status || 'detected'),
    detail: String(reference.detail || ''),
  });
}

function bumpEncountered(summary, kind) {
  const safeKind = String(kind || 'unknown').trim().toLowerCase() || 'unknown';
  summary.encountered += 1;
  summary.encountered_by_kind[safeKind] = Number(summary.encountered_by_kind[safeKind] || 0) + 1;
}

function bumpRendered(summary, kind) {
  const safeKind = String(kind || 'unknown').trim().toLowerCase() || 'unknown';
  summary.rendered += 1;
  summary.rendered_by_kind[safeKind] = Number(summary.rendered_by_kind[safeKind] || 0) + 1;
}

function bumpBlocked(summary, kind, reason) {
  const safeKind = String(kind || 'unknown').trim().toLowerCase() || 'unknown';
  const safeReason = String(reason || 'blocked').trim().toLowerCase() || 'blocked';

  summary.blocked += 1;
  summary.blocked_by_kind[safeKind] = Number(summary.blocked_by_kind[safeKind] || 0) + 1;
  summary.blocked_reasons[safeReason] = Number(summary.blocked_reasons[safeReason] || 0) + 1;
}

function tagForKind(kind) {
  const safe = String(kind || '').trim().toLowerCase();
  const found = Object.values(SUPPORTED_EMBEDS).find((spec) => spec.acceptedKinds.includes(safe));
  return found?.tag || '';
}

function isActiveKind(kind) {
  const tag = tagForKind(kind);
  const spec = getEmbedSpec(tag);
  return spec?.status === 'active';
}

function kindFromSchema(schema = '') {
  const raw = String(schema || '').toLowerCase();

  if (raw.includes('comment')) return 'comment';
  if (raw.includes('article')) return 'article';
  if (raw.includes('post')) return 'post';

  return '';
}

function fallbackTitleForKind(kind) {
  switch (String(kind || '').toLowerCase()) {
    case 'comment':
      return 'Comment';
    case 'article':
      return 'Untitled article';
    case 'post':
      return 'Untitled post';
    default:
      return 'Text asset';
  }
}

function labelForKind(kind) {
  const safe = String(kind || '').trim().toLowerCase();
  return safe ? `${safe.slice(0, 1).toUpperCase()}${safe.slice(1)}` : 'Text asset';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag || '').trim().replace(/^#/, '')).filter(Boolean).slice(0, 12);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 12);
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase();
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();
    if (safe) return safe;
  }

  return '';
}

function isSafeResolvedUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) return false;
  if (/^(?:javascript|data|vbscript):/i.test(raw)) return false;
  if (/^https?:\/\//i.test(raw)) return true;
  if (raw.startsWith('/')) return true;
  if (raw.startsWith('blob:')) return true;

  return false;
}

function isSafeAttributeName(name) {
  if (!name || /^on/i.test(name)) {
    return false;
  }

  return /^[a-z][a-z0-9_.:-]{0,40}$/i.test(name);
}

function escapeParagraphs(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}