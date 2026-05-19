/**
 * RO:WHAT — Polished local HTML templates for the React crab://site workspace.
 * RO:WHY — Gives dev/test users prebaked reference-graph roots for fast image/post/comment/article embed smoke.
 * RO:INTERACTS — SiteGuidedSetup.jsx, siteDraftModel.js, SiteRender.jsx, SiteSandboxPreview.jsx.
 * RO:INVARIANTS — local template only; no fake b3 CID; no fake site launch; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — known-good local-dev proof URLs may be refreshed after stack restarts.
 * RO:SECURITY — templates are static HTML/CSS; scripts are not included or required.
 * RO:TEST — manual crab://site template insert + sandbox preview smoke.
 */

export const KNOWN_GOOD_IMAGE_URL =
  'crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image';

export const KNOWN_GOOD_POST_URL =
  'crab://b23f4c579201e17ab391dd3bff54635718a0b4c1371782ef87115b50f80bb1d3.post';

export const KNOWN_GOOD_COMMENT_URL =
  'crab://ad0fd74aa4c20095c3a08ae9f8e111b68ccff6537ed5f8fb769fa43f782d8f63.comment';

export const KNOWN_GOOD_ARTICLE_URL =
  'crab://35f307de7f34f0115420306703bf0d227404dbe91cc0743be7119b9b32b8af82.article';

export const SITE_TEMPLATES = Object.freeze([
  {
    id: 'reference_graph_smoke',
    name: 'Reference Graph Smoke',
    tone: 'Image + post + comments + article',
    description:
      'Prebaked dev template for quickly testing crab-image, crab-post, crab-comment, and crab-article embeds after a stack run.',
    patch: {
      title: 'Reference Graph Smoke Site',
      description: 'A fast test root for b3-backed social/content embeds.',
      tags: 'site, reference-graph, post, comment, article, image',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/post": "known-good-post",\n  "/article": "known-good-article"\n}',
      assetMapJson: `{\n  "hero_image": "${KNOWN_GOOD_IMAGE_URL}",\n  "featured_post": "${KNOWN_GOOD_POST_URL}",\n  "featured_comment": "${KNOWN_GOOD_COMMENT_URL}",\n  "featured_article": "${KNOWN_GOOD_ARTICLE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
    buildHtml: ({ title, description, creatorDisplay }) =>
      baseDocument({
        title: title || 'Reference Graph Smoke Site',
        body: `
          <main class="ro-site">
            <section class="hero">
              <p class="eyebrow">RON SITE · REFERENCE GRAPH SMOKE</p>
              <h1>${escapeHtml(title || 'Everything is a b3-backed reference.')}</h1>
              <p class="lede">${escapeHtml(
                description ||
                  'This root is a prebaked test page. It references separate image, post, comment, and article assets instead of owning their bytes.',
              )}</p>
              <div class="actions">
                <a href="#social">View social embeds</a>
                <a href="#article" class="secondary">View article</a>
              </div>
            </section>

            <section class="asset-card">
              <div>
                <p class="eyebrow">B3 IMAGE</p>
                <h2>Image bytes stay independent.</h2>
                <p>
                  The root stores only a <code>&lt;crab-image&gt;</code> reference.
                  CrabLink resolves it through the gateway inside a scriptless sandbox.
                </p>
              </div>
              <div class="image-frame">
                <crab-image src="${KNOWN_GOOD_IMAGE_URL}" alt="Known good CrabLink image"></crab-image>
                <p class="embed-note">${KNOWN_GOOD_IMAGE_URL}</p>
              </div>
            </section>

            <section id="social" class="asset-card social-card">
              <div>
                <p class="eyebrow">POST + COMMENT THREAD</p>
                <h2>Post and comments are reusable content objects.</h2>
                <p>
                  The post is its own <code>.post</code> asset. The comment is its own
                  <code>.comment</code> asset. The embed renderer groups comments under their
                  parent when the raw comment envelope points back to the post.
                </p>
              </div>
              <div class="embed-stack">
                <crab-post src="${KNOWN_GOOD_POST_URL}"></crab-post>
                <crab-comment src="${KNOWN_GOOD_COMMENT_URL}"></crab-comment>
              </div>
            </section>

            <section id="article" class="asset-card article-card">
              <div>
                <p class="eyebrow">ARTICLE</p>
                <h2>Long-form text now resolves as a typed asset.</h2>
                <p>
                  This template can quickly confirm <code>crab://&lt;hash&gt;.article</code>
                  renders inside the same safe embed path as post/comment.
                </p>
              </div>
              <div class="embed-stack">
                <crab-article src="${KNOWN_GOOD_ARTICLE_URL}"></crab-article>
              </div>
            </section>

            <section id="about" class="about-grid">
              <article>
                <p class="eyebrow">OWNER</p>
                <h3>${escapeHtml(creatorDisplay || '@current-passport')}</h3>
                <p>Creator identity still comes from passport/backend truth, not this local template.</p>
              </article>
              <article>
                <p class="eyebrow">SAFETY</p>
                <h3>Scriptless by design</h3>
                <p>The sandbox strips scripts/events/forms and only lets CrabLink render known declarative embeds.</p>
              </article>
              <article>
                <p class="eyebrow">NEXT_LEVEL</p>
                <h3>Reference graph sites</h3>
                <p>Sites store layout and references. Assets keep their own ownership, payouts, manifests, and receipts.</p>
              </article>
            </section>
          </main>
        `,
      }),
  },
  {
    id: 'creator_landing',
    name: 'Creator Landing',
    tone: 'Clean creator homepage',
    description: 'A polished landing page for a creator, small project, or personal CrabLink site.',
    patch: {
      title: 'My CrabLink Site',
      description: 'A clean creator site built from b3-addressed references.',
      tags: 'site, creator, landing',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/about": "local-about-section"\n}',
      assetMapJson: `{\n  "hero_image": "${KNOWN_GOOD_IMAGE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
    buildHtml: ({ title, description, creatorDisplay }) =>
      baseDocument({
        title: title || 'My CrabLink Site',
        body: `
          <main class="ro-site">
            <section class="hero">
              <p class="eyebrow">RON SITE · REFERENCE GRAPH</p>
              <h1>${escapeHtml(title || 'Build on content-addressed truth.')}</h1>
              <p class="lede">${escapeHtml(
                description ||
                  'This site root is HTML. It can reference separate b3-backed assets instead of owning every byte directly.',
              )}</p>
              <div class="actions">
                <a href="#about">Explore</a>
                <a href="#asset" class="secondary">View referenced asset</a>
              </div>
            </section>

            <section id="asset" class="asset-card">
              <div>
                <p class="eyebrow">B3 IMAGE REFERENCE</p>
                <h2>Image bytes stay separate.</h2>
                <p>
                  The site stores a <code>&lt;crab-image&gt;</code> reference.
                  The image remains its own canonical <code>crab://&lt;hash&gt;.image</code> asset.
                </p>
              </div>
              <div class="image-frame">
                <crab-image src="${KNOWN_GOOD_IMAGE_URL}" alt="CrabLink referenced image"></crab-image>
                <p class="embed-note">${KNOWN_GOOD_IMAGE_URL}</p>
              </div>
            </section>

            <section id="about" class="about-grid">
              <article>
                <p class="eyebrow">CREATOR</p>
                <h3>${escapeHtml(creatorDisplay || '@current-passport')}</h3>
                <p>Creator identity should be confirmed by the active passport and backend response.</p>
              </article>
              <article>
                <p class="eyebrow">ROOT</p>
                <h3>HTML only</h3>
                <p>Launch stores this root as a b3 object. It should never use an image CID as the site root CID.</p>
              </article>
              <article>
                <p class="eyebrow">SAFETY</p>
                <h3>Sandboxed preview</h3>
                <p>Scripts are stripped. Declarative crab embeds are rendered by CrabLink, not by untrusted page code.</p>
              </article>
            </section>
          </main>
        `,
      }),
  },
  {
    id: 'image_showcase',
    name: 'Image Showcase',
    tone: 'Gallery-style image reference',
    description: 'A visual template for proving that images are independent assets referenced from a site root.',
    patch: {
      title: 'Image Showcase',
      description: 'A b3-backed gallery where the site references image assets.',
      tags: 'site, image, gallery',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/gallery": "local-gallery-section"\n}',
      assetMapJson: `{\n  "featured_image": "${KNOWN_GOOD_IMAGE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
    buildHtml: ({ title, description }) =>
      baseDocument({
        title: title || 'Image Showcase',
        body: `
          <main class="ro-site ro-gallery">
            <section class="hero compact">
              <p class="eyebrow">CRAB IMAGE</p>
              <h1>${escapeHtml(title || 'A gallery made from references.')}</h1>
              <p class="lede">${escapeHtml(description || 'The image below is fetched from its own b3-backed asset page.')}</p>
            </section>

            <section class="gallery-panel">
              <crab-image src="${KNOWN_GOOD_IMAGE_URL}" alt="Known good CrabLink image"></crab-image>
              <div class="caption-card">
                <p class="eyebrow">ASSET URL</p>
                <p>${KNOWN_GOOD_IMAGE_URL}</p>
              </div>
            </section>
          </main>
        `,
      }),
  },
  {
    id: 'minimal_article',
    name: 'Minimal Article',
    tone: 'Text-first article page',
    description: 'A simple article-style root with optional image and typed article references.',
    patch: {
      title: 'The Dusty Onion Dispatch',
      description: 'A simple article shell for testing future post/article embeds.',
      tags: 'site, article, writing',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/article": "local-article-section"\n}',
      assetMapJson: `{\n  "cover_image": "${KNOWN_GOOD_IMAGE_URL}",\n  "article": "${KNOWN_GOOD_ARTICLE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
    buildHtml: ({ title, description, creatorDisplay }) =>
      baseDocument({
        title: title || 'The Dusty Onion Dispatch',
        body: `
          <main class="ro-site ro-article">
            <article class="article-shell">
              <p class="eyebrow">ARTICLE ROOT · LOCAL DRAFT</p>
              <h1>${escapeHtml(title || 'A reference-native article shell.')}</h1>
              <p class="byline">By ${escapeHtml(creatorDisplay || '@current-passport')} · local template preview</p>
              <p class="lede">${escapeHtml(
                description ||
                  'This local article root can later reference b3-backed articles, comments, images, lyrics, and other assets.',
              )}</p>

              <crab-image src="${KNOWN_GOOD_IMAGE_URL}" alt="Article cover image"></crab-image>

              <section>
                <h2>Typed article embed</h2>
                <p>The card below should hydrate from gateway-backed raw article content if the local dev stack still has this object.</p>
                <crab-article src="${KNOWN_GOOD_ARTICLE_URL}"></crab-article>
              </section>

              <section>
                <h2>Why this matters</h2>
                <p>
                  The root HTML can evolve independently from the assets it references.
                  Each referenced asset keeps its own canonical hash, manifest, owner, payout, and provenance chain.
                </p>
              </section>
            </article>
          </main>
        `,
      }),
  },
]);

export const DEFAULT_SITE_TEMPLATE = SITE_TEMPLATES[0];

export function getSiteTemplateById(id) {
  const safeId = String(id || '').trim();
  return SITE_TEMPLATES.find((template) => template.id === safeId) || DEFAULT_SITE_TEMPLATE;
}

export function buildSiteTemplatePatch(templateId, currentDraft = {}) {
  const template = getSiteTemplateById(templateId);
  const patch = template.patch || {};
  const next = {
    ...currentDraft,
    ...patch,
    rootDocumentCid: '',
  };

  return {
    ...next,
    rootHtml: template.buildHtml({
      ...next,
      title: next.title,
      description: next.description,
      creatorDisplay: next.creatorDisplay,
    }),
  };
}

function baseDocument({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title || 'CrabLink Site')}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      color-scheme: light;
      --ink: #111111;
      --muted: #625f57;
      --paper: #f8f6f1;
      --card: rgba(255, 255, 255, 0.86);
      --line: rgba(25, 25, 25, 0.14);
      --accent: #111111;
      --soft: #ece7dc;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        radial-gradient(circle at 10% 0%, rgba(255,255,255,0.86), transparent 34rem),
        linear-gradient(135deg, #f8f6f1, #ece7dc);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    code {
      border: 1px solid var(--line);
      border-radius: 0.45rem;
      background: rgba(255,255,255,0.72);
      padding: 0.12rem 0.35rem;
      font-size: 0.92em;
    }

    .ro-site {
      width: min(1120px, calc(100vw - 36px));
      margin: 0 auto;
      padding: 56px 0;
      display: grid;
      gap: 28px;
    }

    .hero,
    .asset-card,
    .gallery-panel,
    .article-shell,
    .about-grid article,
    .caption-card {
      border: 1px solid var(--line);
      border-radius: 30px;
      background: var(--card);
      box-shadow: 0 24px 80px rgba(40, 34, 22, 0.08);
    }

    .hero {
      min-height: 420px;
      display: grid;
      align-content: center;
      gap: 18px;
      padding: 48px;
    }

    .hero.compact {
      min-height: 260px;
    }

    .hero h1,
    .article-shell h1 {
      margin: 0;
      max-width: 880px;
      font-size: clamp(3rem, 9vw, 7.5rem);
      line-height: 0.86;
      letter-spacing: -0.085em;
    }

    .article-shell h1 {
      font-size: clamp(2.7rem, 7vw, 5.8rem);
    }

    .lede {
      max-width: 720px;
      margin: 0;
      color: var(--muted);
      font-size: clamp(1.05rem, 2vw, 1.45rem);
    }

    .eyebrow {
      margin: 0;
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 1000;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
    }

    .actions a {
      display: inline-flex;
      min-height: 42px;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--accent);
      border-radius: 999px;
      background: var(--accent);
      color: #ffffff;
      padding: 0 18px;
      font-size: 0.86rem;
      font-weight: 950;
    }

    .actions a.secondary {
      background: transparent;
      color: var(--accent);
    }

    .asset-card {
      display: grid;
      grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
      gap: 24px;
      align-items: start;
      padding: 28px;
    }

    .asset-card h2,
    .article-shell h2,
    .about-grid h3 {
      margin: 0.2rem 0 0.6rem;
      letter-spacing: -0.04em;
      line-height: 0.96;
    }

    .asset-card h2 {
      font-size: clamp(1.9rem, 4vw, 3.8rem);
    }

    .image-frame,
    .embed-stack {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .embed-note,
    .byline {
      color: var(--muted);
      font-size: 0.88rem;
      overflow-wrap: anywhere;
    }

    .about-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .about-grid article,
    .caption-card {
      padding: 22px;
    }

    .gallery-panel,
    .article-shell {
      display: grid;
      gap: 24px;
      padding: 28px;
    }

    .article-shell {
      width: min(900px, 100%);
      margin: 0 auto;
    }

    .article-shell p {
      color: var(--muted);
    }

    .social-card,
    .article-card {
      grid-template-columns: minmax(0, 0.62fr) minmax(0, 1.38fr);
    }

    @media (max-width: 820px) {
      .ro-site {
        width: min(100%, calc(100vw - 20px));
        padding: 32px 0;
      }

      .hero,
      .asset-card,
      .gallery-panel,
      .article-shell {
        padding: 22px;
        border-radius: 24px;
      }

      .asset-card,
      .social-card,
      .article-card,
      .about-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
${body || ''}
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}