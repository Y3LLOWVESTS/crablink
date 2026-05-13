/**
 * RO:WHAT — Local reference composer for inserting crab asset embeds into a site root document.
 * RO:WHY — NEXT_LEVEL reference-graph sites need a safe builder path for asset references before new backend publish routes exist.
 * RO:INTERACTS — SiteRootUpload.jsx, siteTemplates.js, SiteSandboxPreview, shared embed registry.
 * RO:INVARIANTS — local HTML edit only; no fake b3 CID; no backend publish claim; unsupported embeds fail closed in preview.
 * RO:METRICS — none.
 * RO:CONFIG — reads/writes draft rootHtml, assetMapJson, and renderPolicy.
 * RO:SECURITY — validates crab://<64hex>.<kind>; never executes linked code; does not call backend routes.
 * RO:TEST — manual crab://site insert image/post/comment/article/video reference and sandbox preview smoke.
 */

import { useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Field from '../../shared/components/Field.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { KNOWN_GOOD_IMAGE_URL } from './siteTemplates.js';

const REFERENCE_KIND_OPTIONS = Object.freeze([
  {
    value: 'image',
    label: 'Image',
    tag: 'crab-image',
    active: true,
    placeholder: KNOWN_GOOD_IMAGE_URL,
    help: 'Currently active in the sandbox renderer when the referenced image bytes are available through the gateway.',
  },
  {
    value: 'post',
    label: 'Post',
    tag: 'crab-post',
    active: false,
    placeholder: 'crab://<64 lowercase hex>.post',
    help: 'Reference is preserved as local HTML, but preview intentionally renders a feature-gated placeholder until backend post assets exist.',
  },
  {
    value: 'comment',
    label: 'Comment',
    tag: 'crab-comment',
    active: false,
    placeholder: 'crab://<64 lowercase hex>.comment',
    help: 'Reference is preserved as local HTML, but preview intentionally renders a feature-gated placeholder until backend comment assets exist.',
  },
  {
    value: 'article',
    label: 'Article',
    tag: 'crab-article',
    active: false,
    placeholder: 'crab://<64 lowercase hex>.article',
    help: 'Reference is preserved as local HTML, but preview intentionally renders a feature-gated placeholder until backend article assets exist.',
  },
  {
    value: 'video',
    label: 'Video',
    tag: 'crab-video',
    active: false,
    placeholder: 'crab://<64 lowercase hex>.video',
    help: 'Reference is preserved as local HTML, but preview intentionally renders a feature-gated placeholder until media-lite is backend-ready.',
  },
]);

export default function SiteReferenceComposer({ draftState }) {
  const draft = draftState?.draft || {};
  const updateDraft = draftState?.updateDraft;
  const [kind, setKind] = useState('image');
  const [title, setTitle] = useState('Referenced CrabLink asset');
  const [copy, setCopy] = useState('This site stores a crab:// asset reference instead of copying the asset bytes.');
  const [crabUrl, setCrabUrl] = useState(KNOWN_GOOD_IMAGE_URL);
  const [lastInserted, setLastInserted] = useState(null);

  const selectedKind = REFERENCE_KIND_OPTIONS.find((option) => option.value === kind) || REFERENCE_KIND_OPTIONS[0];
  const validation = useMemo(() => validateTypedCrabUrl(crabUrl, kind), [crabUrl, kind]);
  const canInsert = Boolean(updateDraft && validation.ok);

  function changeKind(event) {
    const nextKind = event.target.value;
    const nextOption = REFERENCE_KIND_OPTIONS.find((option) => option.value === nextKind) || REFERENCE_KIND_OPTIONS[0];

    setKind(nextKind);
    setCrabUrl(nextOption.value === 'image' ? KNOWN_GOOD_IMAGE_URL : '');
    setTitle(`${nextOption.label} reference`);
    setCopy(nextOption.help);
    setLastInserted(null);
  }

  function useKnownImage() {
    setKind('image');
    setCrabUrl(KNOWN_GOOD_IMAGE_URL);
    setTitle('CrabLink referenced image');
    setCopy('The image remains an independent b3-backed asset while this site root stores only the crab-image reference.');
    setLastInserted(null);
  }

  function insertReference() {
    if (!canInsert) {
      return;
    }

    const htmlBlock = buildReferenceHtml({
      kind,
      tag: selectedKind.tag,
      crabUrl: validation.normalizedUrl,
      title,
      copy,
      active: selectedKind.active,
    });

    const nextRootHtml = insertReferenceIntoHtml(draft.rootHtml, htmlBlock);
    const nextAssetMap = upsertAssetMapJson(draft.assetMapJson, {
      kind,
      title,
      crabUrl: validation.normalizedUrl,
    });

    updateDraft('rootHtml', nextRootHtml);
    updateDraft('assetMapJson', nextAssetMap);

    if (draft.renderPolicy !== 'safe_embeds_only') {
      updateDraft('renderPolicy', 'safe_embeds_only');
    }

    setLastInserted({
      kind,
      tag: selectedKind.tag,
      crabUrl: validation.normalizedUrl,
      active: selectedKind.active,
      insertedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="site-template-panel" aria-label="Reference graph composer">
      <div className="site-template-header">
        <div>
          <span>Reference composer</span>
          <strong>Add a crab asset reference to this site</strong>
        </div>

        <div className="site-template-controls">
          <Button variant="secondary" onClick={useKnownImage}>
            Use known image
          </Button>
          <Button variant="primary" onClick={insertReference} disabled={!canInsert}>
            Insert Reference
          </Button>
        </div>
      </div>

      <p className="site-section-copy">
        This only edits the local root HTML and asset map. Image embeds can render today when the bytes are available.
        Post, comment, article, and video references are preserved as fail-closed placeholders until their backend asset routes exist.
      </p>

      <div className="site-form-grid">
        <Field label="Reference kind" help={selectedKind.help}>
          <select value={kind} onChange={changeKind} aria-label="Reference kind">
            {REFERENCE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Typed crab URL"
          help={`Expected format: crab://<64 lowercase hex>.${kind}`}
          error={!validation.ok && crabUrl.trim() ? validation.reason : ''}
        >
          <TextInput
            value={crabUrl}
            onChange={(event) => {
              setCrabUrl(event.target.value);
              setLastInserted(null);
            }}
            placeholder={selectedKind.placeholder}
            spellCheck={false}
          />
        </Field>

        <Field label="Reference title" help="Local display text only. Backend asset title comes from its real manifest later.">
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Referenced CrabLink asset"
          />
        </Field>

        <Field label="Reference copy" help="Local explanatory copy inserted near the reference.">
          <TextInput
            value={copy}
            onChange={(event) => setCopy(event.target.value)}
            placeholder="Why this asset appears on the site"
          />
        </Field>
      </div>

      <div className={`site-root-guard is-${validation.ok ? 'success' : 'warning'}`}>
        <strong>Reference guard</strong>
        <span>
          {validation.ok
            ? `${selectedKind.tag} will be inserted with ${validation.normalizedUrl}.`
            : validation.reason || 'Paste a real typed crab:// asset URL before inserting.'}
        </span>
      </div>

      <div className="site-root-stats">
        <div>
          <span>Embed tag</span>
          <strong>{selectedKind.tag}</strong>
        </div>
        <div>
          <span>Preview status</span>
          <strong>{selectedKind.active ? 'active renderer' : 'feature-gated placeholder'}</strong>
        </div>
        <div>
          <span>Asset map</span>
          <strong>{validation.ok ? 'will update' : 'waiting'}</strong>
        </div>
        <div>
          <span>Render policy</span>
          <strong>{draft.renderPolicy === 'safe_embeds_only' ? 'safe embeds only' : 'auto-set on insert'}</strong>
        </div>
      </div>

      {lastInserted && (
        <div className="site-root-guard is-info">
          <strong>Inserted local reference</strong>
          <span>
            Added {lastInserted.tag} for {lastInserted.crabUrl}. Store Root HTML in the Launch Flow to mint the real backend root document CID.
          </span>
        </div>
      )}
    </section>
  );
}

function validateTypedCrabUrl(input, expectedKind) {
  const raw = String(input || '').trim();
  const match = raw.match(/^crab:\/\/([0-9a-fA-F]{64})\.([a-z][a-z0-9_-]{0,31})$/);

  if (!raw) {
    return {
      ok: false,
      reason: 'Paste a crab:// asset URL first.',
      normalizedUrl: '',
    };
  }

  if (!match) {
    return {
      ok: false,
      reason: 'Expected crab://<64 lowercase hex>.<asset_kind>.',
      normalizedUrl: '',
    };
  }

  const hash = match[1].toLowerCase();
  const kind = match[2].toLowerCase();

  if (kind !== expectedKind) {
    return {
      ok: false,
      reason: `This composer is set to .${expectedKind}, but the pasted URL is .${kind}.`,
      normalizedUrl: '',
    };
  }

  return {
    ok: true,
    reason: '',
    normalizedUrl: `crab://${hash}.${kind}`,
  };
}

function buildReferenceHtml({ kind, tag, crabUrl, title, copy, active }) {
  const safeTitle = escapeHtml(title || `${labelFromKind(kind)} reference`);
  const safeCopy = escapeHtml(copy || 'This site stores a crab asset reference.');
  const safeCrabUrl = escapeHtml(crabUrl);
  const safeTag = escapeHtml(tag);
  const safeKind = escapeHtml(kind);
  const status = active ? 'active safe preview' : 'feature-gated placeholder';

  if (kind === 'image') {
    return `
            <section class="asset-card reference-card" data-crab-reference="${safeCrabUrl}" data-crab-kind="${safeKind}">
              <div>
                <p class="eyebrow">B3 ${safeKind.toUpperCase()} REFERENCE</p>
                <h2>${safeTitle}</h2>
                <p>${safeCopy}</p>
                <p><code>${safeCrabUrl}</code></p>
              </div>
              <div class="image-frame">
                <${safeTag} src="${safeCrabUrl}" alt="${safeTitle}" title="${safeTitle}" caption="${status}"></${safeTag}>
                <p class="embed-note">${safeCrabUrl}</p>
              </div>
            </section>`;
  }

  return `
            <section class="asset-card reference-card" data-crab-reference="${safeCrabUrl}" data-crab-kind="${safeKind}">
              <div>
                <p class="eyebrow">B3 ${safeKind.toUpperCase()} REFERENCE</p>
                <h2>${safeTitle}</h2>
                <p>${safeCopy}</p>
                <p><code>${safeCrabUrl}</code></p>
              </div>
              <div class="image-frame">
                <${safeTag} src="${safeCrabUrl}" title="${safeTitle}"></${safeTag}>
                <p class="embed-note">${safeTag} · ${status}</p>
              </div>
            </section>`;
}

function insertReferenceIntoHtml(rootHtml, block) {
  const html = String(rootHtml || '').trim();

  if (!html) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>CrabLink reference graph site</title>
  </head>
  <body>
    <main class="ro-site">
${block}
    </main>
  </body>
</html>`;
  }

  if (/<\/main>/i.test(html)) {
    return html.replace(/<\/main>/i, `${block}\n          </main>`);
  }

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${block}\n  </body>`);
  }

  return `${html}\n${block}`;
}

function upsertAssetMapJson(assetMapJson, { kind, title, crabUrl }) {
  const current = parseAssetMap(assetMapJson);
  const key = uniqueAssetKey(current, kind, title);

  current[key] = crabUrl;

  return JSON.stringify(current, null, 2);
}

function parseAssetMap(input) {
  try {
    const parsed = JSON.parse(String(input || '').trim() || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function uniqueAssetKey(map, kind, title) {
  const base = slugify(`${kind}_${title || 'reference'}`) || `${kind}_reference`;
  let key = base;
  let index = 2;

  while (Object.prototype.hasOwnProperty.call(map, key)) {
    key = `${base}_${index}`;
    index += 1;
  }

  return key;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}