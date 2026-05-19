/**
 * RO:WHAT — Safe HTML builder for CrabLink site preview iframes.
 * RO:WHY — Separates untrusted crab content handling from trusted React shell UI.
 * RO:INTERACTS — embedRegistry.js, sandboxFrame.js, SiteRender.jsx.
 * RO:INVARIANTS — no arbitrary script execution; sanitizer fails closed; embeds are declarative and inert.
 * RO:METRICS — returns safe-render policy and embed/reference summaries for developer diagnostics.
 * RO:CONFIG — caller may pass summary/source/resolveAssetUrl/siteClient.
 * RO:SECURITY — strips active tags, event handlers, javascript/data URLs, forms, iframe/object/embed, unsafe meta/base tags, and risky style URLs.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual malicious HTML smoke.
 */

import { renderSafeEmbeds, summarizeReferences } from './embedRegistry.js';
import { describeSandboxPolicy } from './sandboxFrame.js';

export const SAFE_HTML_VERSION = 'crablink.safe-html.v3';

export function markUntrustedHtml(html) {
  return String(html || '');
}

export function buildSandboxedSiteHtml(input, options = {}) {
  const raw = markUntrustedHtml(input);
  const referenceGraph = summarizeReferences(raw);
  const embedResult = renderSafeEmbeds(raw, options);
  const sanitized = sanitizeUntrustedHtml(embedResult.html);
  const documentHtml = ensureDocumentShape(sanitized);
  const html = injectSafeSiteChrome(documentHtml, options);

  return Object.freeze({
    html,
    policy: summarizeSafeHtmlPolicy({
      input: raw,
      output: html,
      source: options.source,
      embedSummary: embedResult.summary,
      referenceGraph: mergeReferenceGraphs(referenceGraph, embedResult.summary),
    }),
  });
}

export function sanitizeUntrustedHtml(input) {
  return String(input || '')
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*(?:http-equiv\s*=\s*["']?refresh["']?)[^>]*>/gi, '')
    .replace(/<link\b[^>]*(?:rel\s*=\s*["']?(?:preload|prefetch|modulepreload)["']?)[^>]*>/gi, '')
    .replace(/<form\b[^>]*>/gi, '<div class="crablink-blocked-form" role="note"><strong>Form blocked by CrabLink sandbox</strong>')
    .replace(/<\/form>/gi, '</div>')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/<button\b[^>]*>/gi, '<span class="crablink-disabled-button" aria-disabled="true">')
    .replace(/<\/button>/gi, '</span>')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src|poster|xlink:href)\s*=\s*"\s*(javascript|data|vbscript):[^"]*"/gi, '$1="#"')
    .replace(/(href|src|poster|xlink:href)\s*=\s*'\s*(javascript|data|vbscript):[^']*'/gi, "$1='#'")
    .replace(/(href|src|poster|xlink:href)\s*=\s*(javascript|data|vbscript):[^\s>]+/gi, '$1="#"')
    .replace(/style\s*=\s*"[^"]*(?:expression|javascript:|data:|vbscript:|url\s*\()[^"]*"/gi, '')
    .replace(/style\s*=\s*'[^']*(?:expression|javascript:|data:|vbscript:|url\s*\()[^']*'/gi, '');
}

export function summarizeSafeHtmlPolicy({ input = '', output = '', source = 'gateway', embedSummary = {}, referenceGraph = {} } = {}) {
  const safeSource = String(source || 'gateway').trim() || 'gateway';

  return Object.freeze({
    version: SAFE_HTML_VERSION,
    source: safeSource,
    untrusted_input_bytes: byteLength(input),
    safe_output_bytes: byteLength(output),
    sanitizer: Object.freeze({
      removed_scripts: /<script\b/i.test(String(input || '')),
      removed_event_handlers: /\son[a-z]+\s*=/i.test(String(input || '')),
      removed_forms: /<form\b/i.test(String(input || '')),
      removed_frames: /<iframe\b|<object\b|<embed\b/i.test(String(input || '')),
      blocked_unsafe_urls: /(javascript|data|vbscript):/i.test(String(input || '')),
      blocked_risky_inline_styles: /style\s*=\s*["'][^"']*(expression|javascript:|data:|vbscript:|url\s*\()/i.test(String(input || '')),
    }),
    embed_summary: embedSummary || {},
    reference_graph: referenceGraph || {},
    sandbox_policy: describeSandboxPolicy(),
    truth_boundary:
      'CrabLink renders a scriptless preview. Only gateway-returned CIDs, manifests, receipts, and owner fields are backend truth.',
  });
}

function mergeReferenceGraphs(referenceGraph, embedSummary = {}) {
  const references = [];
  const seen = new Set();

  for (const source of [referenceGraph?.references, embedSummary?.references]) {
    if (!Array.isArray(source)) continue;

    for (const reference of source) {
      const crabUrl = String(reference?.crabUrl || '').trim();
      const tag = String(reference?.tag || 'crab-reference').trim();
      const kind = String(reference?.kind || 'unknown').trim();
      const status = String(reference?.status || 'detected').trim();
      const key = `${tag}:${kind}:${crabUrl}:${status}`;

      if (seen.has(key)) continue;
      seen.add(key);

      references.push(Object.freeze({
        tag,
        kind,
        crabUrl,
        cid: String(reference?.cid || '').trim(),
        status,
        detail: String(reference?.detail || '').trim(),
      }));
    }
  }

  return Object.freeze({
    registry_version: embedSummary?.registry_version || referenceGraph?.registry_version || '',
    total: references.length,
    references,
  });
}

function ensureDocumentShape(input) {
  const html = String(input || '').trim();

  if (!html) {
    return fallbackDocument('Empty site root', 'The root document is empty after sanitization.');
  }

  if (/<html[\s>]/i.test(html)) {
    return html;
  }

  if (/<body[\s>]/i.test(html) || /<main[\s>]/i.test(html) || /<article[\s>]/i.test(html) || /<section[\s>]/i.test(html)) {
    return [
      '<html>',
      '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>',
      html,
      '</html>',
    ].join('');
  }

  if (/<h1[\s>]|<p[\s>]|<div[\s>]|<figure[\s>]|<img[\s>]/i.test(html)) {
    return [
      '<html>',
      '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>',
      '<body><main class="crablink-site-root">',
      html,
      '</main></body>',
      '</html>',
    ].join('');
  }

  return [
    '<html>',
    '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>',
    '<body><main class="crablink-site-root"><pre>',
    escapeHtml(html),
    '</pre></main></body>',
    '</html>',
  ].join('');
}

function injectSafeSiteChrome(input, options = {}) {
  const summary = options.summary || {};
  const source = String(options.source || 'gateway').trim();
  const css = safePreviewCss();
  const banner = safePreviewBanner(summary, source);
  let html = String(input || '');

  if (!/<html[\s>]/i.test(html)) {
    html = `<html>${html}</html>`;
  }

  if (!/<head[\s>]/i.test(html)) {
    html = html.replace(/<html\b([^>]*)>/i, '<html$1><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>');
  }

  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b([^>]*)>/i, `<head$1>${css}`);
  } else {
    html = `${css}${html}`;
  }

  if (/<body\b[^>]*>/i.test(html)) {
    html = html.replace(/<body\b([^>]*)>/i, `<body$1>${banner}`);
  } else if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `</head><body>${banner}`);
  } else {
    html = `<body>${banner}${html}</body>`;
  }

  return `<!doctype html>${html}`;
}

function fallbackDocument(title, copy) {
  return [
    '<html>',
    '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>',
    '<body><main class="crablink-notice">',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(copy)}</p>`,
    '</main></body>',
    '</html>',
  ].join('');
}

function safePreviewBanner(summary, source) {
  const site = escapeHtml(summary?.crabUrl || (summary?.siteName ? `crab://${summary.siteName}` : 'crab://site'));
  const mode = source === 'local' ? 'local draft preview' : 'gateway resolved preview';

  return [
    '<div class="crablink-preview-boundary">',
    `<span>CrabLink sandbox · ${escapeHtml(mode)} · scripts disabled · references stay b3-backed</span>`,
    `<code>${site}</code>`,
    '</div>',
  ].join('');
}

function safePreviewCss() {
  return `<style>
    :root {
      color-scheme: light;
      --cl-safe-bg: #faf9f6;
      --cl-safe-ink: #111111;
      --cl-safe-muted: #5d5a54;
      --cl-safe-line: rgba(17, 17, 17, 0.13);
      --cl-safe-card: rgba(255, 255, 255, 0.86);
      --cl-safe-accent: #12805c;
      --cl-safe-warning: #8a5d00;
      --cl-safe-danger: #9f1d1d;
    }

    * { box-sizing: border-box; }

    html { min-height: 100%; }

    body {
      margin: 0;
      min-height: 100%;
      background:
        radial-gradient(circle at 12% 8%, rgba(18, 128, 92, 0.18), transparent 32rem),
        radial-gradient(circle at 86% 10%, rgba(34, 76, 190, 0.13), transparent 30rem),
        linear-gradient(135deg, #fbfaf6 0%, var(--cl-safe-bg) 48%, #ede9df 100%);
      color: var(--cl-safe-ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    main, article, section, header, footer, nav {
      width: min(1440px, calc(100vw - 48px));
      max-width: none;
      margin-left: auto;
      margin-right: auto;
    }

    main { padding: 58px 0; }

    .crablink-site-root {
      display: grid;
      gap: 1.4rem;
    }

    h1 {
      margin: 0 0 18px;
      color: var(--cl-safe-ink);
      font-size: clamp(42px, 8vw, 104px);
      letter-spacing: -0.085em;
      line-height: 0.91;
    }

    h2 {
      margin: 0 0 14px;
      color: var(--cl-safe-ink);
      font-size: clamp(28px, 5vw, 62px);
      letter-spacing: -0.06em;
      line-height: 0.96;
    }

    p, li {
      color: var(--cl-safe-muted);
      font-size: 18px;
      line-height: 1.65;
    }

    a {
      color: var(--cl-safe-ink);
      font-weight: 850;
      text-decoration-thickness: 0.12em;
      text-underline-offset: 0.18em;
    }

    img, video {
      max-width: 100%;
      height: auto;
    }

    pre {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      border: 1px solid var(--cl-safe-line);
      border-radius: 22px;
      background: var(--cl-safe-card);
      padding: 18px;
      color: var(--cl-safe-muted);
    }

    .crablink-preview-boundary {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: none;
      border-bottom: 1px solid var(--cl-safe-line);
      background: rgba(250, 249, 246, 0.94);
      backdrop-filter: blur(10px);
      padding: 10px 14px;
      color: #3b3934;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.02em;
    }

    .crablink-preview-boundary code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      overflow-wrap: anywhere;
    }

    .crablink-notice,
    .crablink-embed,
    .crablink-blocked-form {
      border: 1px solid var(--cl-safe-line);
      border-radius: 24px;
      background: var(--cl-safe-card);
      padding: 18px;
      box-shadow: 0 18px 54px rgba(40, 34, 22, 0.08);
    }

    .crablink-embed-image {
      display: grid;
      gap: 10px;
      margin: 28px auto;
      width: min(1440px, calc(100vw - 48px));
    }

    .crablink-embed-image img {
      display: block;
      width: 100%;
      border: 1px solid var(--cl-safe-line);
      border-radius: 22px;
      background: #f0eee8;
      object-fit: contain;
    }

    .crablink-embed-image figcaption {
      display: grid;
      gap: 4px;
      color: var(--cl-safe-muted);
    }

    .crablink-embed-image figcaption strong {
      color: var(--cl-safe-ink);
    }

    .crablink-embed-image figcaption small,
    .crablink-embed-warning small {
      color: #77736b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .crablink-embed-warning {
      border-color: rgba(138, 93, 0, 0.32);
      background: #fff8e1;
    }

    .crablink-embed-warning strong,
    .crablink-blocked-form strong {
      color: var(--cl-safe-warning);
    }

    .crablink-disabled-button {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      border: 1px solid var(--cl-safe-line);
      border-radius: 999px;
      padding: 0 12px;
      color: var(--cl-safe-muted);
      font-weight: 800;
    }

    @media (max-width: 760px) {
      main, article, section, header, footer, nav,
      .crablink-embed-image {
        width: min(100%, calc(100vw - 24px));
      }

      main { padding: 32px 0; }
    }
  </style>`;
}

function byteLength(value) {
  try {
    return new TextEncoder().encode(String(value || '')).length;
  } catch (_error) {
    return String(value || '').length;
  }
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}