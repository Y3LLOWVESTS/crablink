/**
 * RO:WHAT — Polished local HTML templates for the React crab://site workspace.
 * RO:WHY — Replaces rough demo root HTML with professional reference-graph site templates.
 * RO:INTERACTS — SiteRootUpload.jsx, siteDraftModel.js, SiteRender.jsx sandbox preview.
 * RO:INVARIANTS — local template only; no fake b3 CID; no fake site launch; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — templates are static HTML/CSS; scripts are not included or required.
 * RO:TEST — manual crab://site template insert + sandbox preview smoke.
 */

export const KNOWN_GOOD_IMAGE_URL =
  'crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image';

export const SITE_TEMPLATES = Object.freeze([
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

            <section id="about" class="grid">
              <article>
                <span>01</span>
                <h3>Canonical content</h3>
                <p>Every object can be addressed by a BLAKE3 content ID.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Creator owned</h3>
                <p>Ownership, payout, provenance, and receipts belong in manifests.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Reference graph</h3>
                <p>Sites can reference images, posts, comments, music, videos, and more.</p>
              </article>
            </section>

            <footer>
              <strong>${escapeHtml(creatorDisplay || 'CrabLink Creator')}</strong>
              <span>Built for a b3-native web.</span>
            </footer>
          </main>
        `,
      }),
  },
  {
    id: 'image_showcase',
    name: 'Image Showcase',
    tone: 'Asset-first gallery page',
    description: 'A focused page for showing how a site references an independently owned image asset.',
    patch: {
      title: 'B3 Image Showcase',
      description: 'A site root that references an image asset without storing image bytes.',
      tags: 'site, image, showcase',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/gallery": "local-gallery-section"\n}',
      assetMapJson: `{\n  "featured_image": "${KNOWN_GOOD_IMAGE_URL}",\n  "thumbnail": "${KNOWN_GOOD_IMAGE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
    buildHtml: ({ title, description }) =>
      baseDocument({
        title: title || 'B3 Image Showcase',
        body: `
          <main class="ro-site showcase">
            <section class="hero compact">
              <p class="eyebrow">CRABLINK IMAGE PRIMITIVE</p>
              <h1>${escapeHtml(title || 'One image. One canonical address.')}</h1>
              <p class="lede">${escapeHtml(
                description ||
                  'The page below references a separate b3-backed image asset through a safe CrabLink embed.',
              )}</p>
            </section>

            <section class="asset-card full">
              <div class="image-frame large">
                <crab-image src="${KNOWN_GOOD_IMAGE_URL}" alt="Featured CrabLink image"></crab-image>
                <p class="embed-note">${KNOWN_GOOD_IMAGE_URL}</p>
              </div>
              <div class="proof-list">
                <div><span>Kind</span><strong>.image</strong></div>
                <div><span>Address</span><strong>b3-backed crab URL</strong></div>
                <div><span>Site behavior</span><strong>references, not copies</strong></div>
              </div>
            </section>
          </main>
        `,
      }),
  },
  {
    id: 'minimal_article',
    name: 'Minimal Article',
    tone: 'Readable post/article page',
    description: 'A clean static page for writing an article-style site root.',
    patch: {
      title: 'A New CrabLink Article',
      description: 'A readable static article root for a named CrabLink site.',
      tags: 'site, article, writing',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/article": "local-article-section"\n}',
      assetMapJson: '{}',
      renderPolicy: 'static_html_no_scripts',
    },
    buildHtml: ({ title, description, creatorDisplay }) =>
      baseDocument({
        title: title || 'A New CrabLink Article',
        body: `
          <main class="ro-site article">
            <article class="article-card">
              <p class="eyebrow">RON ARTICLE · STATIC ROOT</p>
              <h1>${escapeHtml(title || 'A better web starts with owned primitives.')}</h1>
              <p class="byline">By ${escapeHtml(creatorDisplay || 'a CrabLink creator')}</p>
              <p class="lede">${escapeHtml(
                description ||
                  'This article is a static site root today. Later, article assets should become their own b3-addressed primitives.',
              )}</p>

              <hr />

              <p>
                RustyOnions sites can become reference graphs instead of centralized content silos.
                A site can own the route map, layout, moderation policy, and payout policy while each
                image, post, comment, song, article, or video remains independently addressable.
              </p>

              <p>
                That means attribution, provenance, payout routing, and receipts can follow the asset,
                not just the platform where it appears.
              </p>
            </article>
          </main>
        `,
      }),
  },
]);

export const DEFAULT_SITE_TEMPLATE = SITE_TEMPLATES[0];

export function getSiteTemplate(templateId) {
  return SITE_TEMPLATES.find((template) => template.id === templateId) || DEFAULT_SITE_TEMPLATE;
}

export function buildSiteTemplatePatch(templateId, draft = {}) {
  const template = getSiteTemplate(templateId);
  const nextDraft = {
    ...draft,
    ...template.patch,
  };

  nextDraft.rootHtml = template.buildHtml({
    title: nextDraft.title,
    description: nextDraft.description,
    creatorDisplay: nextDraft.creatorDisplay,
    siteName: nextDraft.siteName,
  });

  return nextDraft;
}

function baseDocument({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title || 'CrabLink Site')}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f4ee;
        --ink: #111111;
        --muted: #5e5a52;
        --card: rgba(255, 255, 255, 0.78);
        --line: rgba(17, 17, 17, 0.12);
        --accent: #18a06a;
        --accent-soft: rgba(24, 160, 106, 0.14);
        --shadow: 0 30px 90px rgba(42, 34, 22, 0.16);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 18% 12%, rgba(24, 160, 106, 0.22), transparent 34%),
          radial-gradient(circle at 84% 8%, rgba(60, 90, 190, 0.16), transparent 30%),
          linear-gradient(135deg, #fbfaf6 0%, var(--bg) 48%, #ece7dc 100%);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .ro-site {
        width: min(1120px, calc(100vw - 36px));
        margin: 0 auto;
        padding: 64px 0;
      }

      .hero {
        display: grid;
        gap: 22px;
        padding: clamp(36px, 6vw, 74px);
        border: 1px solid var(--line);
        border-radius: 36px;
        background: var(--card);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .hero.compact { padding: clamp(28px, 5vw, 56px); }

      .eyebrow {
        width: fit-content;
        margin: 0;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: #08754a;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.13em;
      }

      h1 {
        max-width: 980px;
        margin: 0;
        font-size: clamp(48px, 9vw, 112px);
        line-height: 0.88;
        letter-spacing: -0.09em;
      }

      h2 {
        margin: 0;
        font-size: clamp(30px, 5vw, 58px);
        line-height: 0.96;
        letter-spacing: -0.06em;
      }

      h3 {
        margin: 8px 0;
        font-size: 22px;
        letter-spacing: -0.03em;
      }

      p {
        color: var(--muted);
        font-size: 18px;
        line-height: 1.65;
      }

      .lede {
        max-width: 760px;
        margin: 0;
        font-size: clamp(18px, 2.1vw, 24px);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .actions a {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        padding: 0 18px;
        border-radius: 999px;
        background: var(--ink);
        color: white;
        font-weight: 900;
        text-decoration: none;
      }

      .actions a.secondary {
        border: 1px solid var(--line);
        background: white;
        color: var(--ink);
      }

      .asset-card,
      .article-card {
        display: grid;
        gap: 28px;
        margin-top: 22px;
        padding: clamp(24px, 5vw, 46px);
        border: 1px solid var(--line);
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.66);
        box-shadow: 0 18px 60px rgba(42, 34, 22, 0.09);
      }

      .asset-card {
        grid-template-columns: minmax(0, 0.95fr) minmax(280px, 1.05fr);
        align-items: center;
      }

      .asset-card.full {
        grid-template-columns: 1fr;
      }

      .image-frame {
        min-height: 260px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 28px;
        background:
          linear-gradient(135deg, rgba(24, 160, 106, 0.12), transparent),
          #f0ece3;
      }

      .image-frame.large { min-height: 420px; }

      crab-image {
        display: block;
        width: 100%;
        min-height: 240px;
      }

      .embed-note {
        width: 100%;
        margin: 0;
        padding: 14px;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 12px;
        overflow-wrap: anywhere;
        text-align: center;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 22px;
      }

      .grid article,
      .proof-list div {
        border: 1px solid var(--line);
        border-radius: 26px;
        background: rgba(255, 255, 255, 0.68);
        padding: 22px;
      }

      .grid span,
      .proof-list span {
        color: var(--accent);
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .proof-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .proof-list strong {
        display: block;
        margin-top: 8px;
        overflow-wrap: anywhere;
      }

      .article .article-card {
        max-width: 860px;
        margin-left: auto;
        margin-right: auto;
      }

      .byline {
        margin-top: -8px;
        font-size: 15px;
        font-weight: 800;
      }

      hr {
        width: 100%;
        border: 0;
        border-top: 1px solid var(--line);
      }

      footer {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
        margin-top: 22px;
        padding: 18px 4px;
        color: var(--muted);
      }

      footer strong { color: var(--ink); }

      code {
        padding: 2px 6px;
        border-radius: 8px;
        background: rgba(17, 17, 17, 0.06);
      }

      @media (max-width: 800px) {
        .ro-site { width: min(100vw - 24px, 1120px); padding: 28px 0; }
        .asset-card,
        .grid,
        .proof-list { grid-template-columns: 1fr; }
        h1 { font-size: clamp(42px, 15vw, 72px); }
      }
    </style>
  </head>
  <body>
${body}
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