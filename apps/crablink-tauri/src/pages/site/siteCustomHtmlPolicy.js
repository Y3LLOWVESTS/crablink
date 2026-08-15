/**
 * RO:WHAT — Deterministic rejection policy for retained development-only Site HTML input.
 * RO:WHY — FINAL_BETA Phase 11 must reject executable, interactive, framed, event-driven,
 *          and remote-resource HTML rather than relying only on renderer sanitization.
 * RO:INTERACTS — SiteGuidedSetup.jsx development-only Import HTML and Root HTML editor.
 * RO:INVARIANTS — reviewed built-in templates are separate; arbitrary user HTML enters only after this review.
 * RO:SECURITY — scripts, JavaScript URLs, forms, iframes, inline events, and remote resources fail closed.
 * RO:TEST — siteCustomHtmlPolicy.test.mjs.
 */

import {
  reviewSiteDeclarativeEmbeds,
} from '../../shared/embed/embedRegistry.js';

export const SITE_CUSTOM_HTML_POLICY_VERSION =
  'crablink.site-custom-html-policy.v1';

const CUSTOM_HTML_RULES =
  Object.freeze([
    Object.freeze({
      code:
        'custom_javascript',

      pattern:
        /<\s*script\b/i,
    }),

    Object.freeze({
      code:
        'custom_javascript',

      pattern:
        /\b(?:href|src|action|formaction)\s*=\s*(?:"\s*javascript:|'\s*javascript:|javascript:)/i,
    }),

    Object.freeze({
      code:
        'arbitrary_form',

      pattern:
        /<\s*form\b/i,
    }),

    Object.freeze({
      code:
        'arbitrary_form',

      pattern:
        /<\s*(?:input|select|textarea)\b/i,
    }),

    Object.freeze({
      code:
        'iframe',

      pattern:
        /<\s*iframe\b/i,
    }),

    Object.freeze({
      code:
        'event_handler',

      pattern:
        /<[^>]+\son[a-z][a-z0-9_-]*\s*=/i,
    }),

    Object.freeze({
      code:
        'remote_resource',

      pattern:
        /\b(?:src|href|poster|action|formaction)\s*=\s*(?:"\s*(?:https?:)?\/\/|'\s*(?:https?:)?\/\/|(?:https?:)?\/\/)/i,
    }),

    Object.freeze({
      code:
        'remote_resource',

      pattern:
        /\bsrcset\s*=\s*(?:"[^"]*(?:https?:)?\/\/|'[^']*(?:https?:)?\/\/|[^\s>]*(?:https?:)?\/\/)/i,
    }),

    Object.freeze({
      code:
        'remote_resource',

      pattern:
        /@import\s+(?:url\()?\s*["']?\s*(?:https?:)?\/\//i,
    }),

    Object.freeze({
      code:
        'remote_resource',

      pattern:
        /url\(\s*["']?\s*(?:https?:)?\/\//i,
    }),
  ]);

export function reviewSiteCustomHtml(
  value,
) {
  const html =
    String(
      value ?? '',
    );

  const findings =
    [];

  for (
    const rule
    of CUSTOM_HTML_RULES
  ) {
    if (
      rule.pattern.test(
        html,
      )
    ) {
      if (
        findings.includes(
          rule.code,
        )
      ) {
        continue;
      }

      findings.push(
        rule.code,
      );
    }
  }

  const embedReview =
    reviewSiteDeclarativeEmbeds(
      html,
    );

  for (
    const finding
    of embedReview.findings
  ) {
    if (
      findings.includes(
        finding.code,
      )
    ) {
      continue;
    }

    findings.push(
      finding.code,
    );
  }

  return Object.freeze({
    schema:
      SITE_CUSTOM_HTML_POLICY_VERSION,

    ok:
      findings.length ===
      0,

    findings:
      Object.freeze([
        ...findings,
      ]),
  });
}

export function acceptSiteCustomHtml(
  value,
) {
  const html =
    String(
      value ?? '',
    );

  const review =
    reviewSiteCustomHtml(
      html,
    );

  if (
    review.ok ===
    false
  ) {
    return Object.freeze({
      accepted:
        false,

      html:
        null,

      review,
    });
  }

  return Object.freeze({
    accepted:
      true,

    html,

    review,
  });
}
