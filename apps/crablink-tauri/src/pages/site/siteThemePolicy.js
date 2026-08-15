/**
 * RO:WHAT — Bounded declarative Site theme-token policy for FINAL_BETA Phase 11A4.
 * RO:WHY — Site templates need controlled visual customization without arbitrary CSS or executable style input.
 * RO:INTERACTS — siteDraftModel, SiteLaunchFlow, siteClient, Omnigate site manifests, Phase 12 template engine.
 * RO:INVARIANTS — only reviewed semantic CrabLink design-token identifiers are accepted.
 * RO:SECURITY — no raw CSS, style declarations, URLs, remote CSS, arbitrary variables, scripts, or freeform theme objects.
 * RO:TEST — node --test siteThemePolicy.test.mjs.
 */

export const SITE_THEME_POLICY_VERSION =
  'crablink.site-theme-policy.v1';

export const SITE_THEME_TOKEN_ALLOWLIST =
  Object.freeze({
    surface: Object.freeze([
      'cl-card',
      'cl-surface',
      'cl-card-muted',
    ]),

    text: Object.freeze([
      'cl-text',
      'cl-text-strong',
      'cl-muted',
    ]),

    accent: Object.freeze([
      'cl-accent',
      'cl-success',
      'cl-info',
    ]),

    border: Object.freeze([
      'cl-border',
      'cl-border-strong',
    ]),

    radius: Object.freeze([
      'cl-radius-md',
      'cl-radius-lg',
      'cl-radius-xl',
    ]),

    spacing: Object.freeze([
      'cl-space-3',
      'cl-space-4',
      'cl-space-5',
      'cl-space-6',
    ]),

    font: Object.freeze([
      'cl-font-sans',
      'cl-font-mono',
    ]),
  });

export const DEFAULT_SITE_THEME_TOKENS =
  Object.freeze({
    surface:
      'cl-card',

    text:
      'cl-text',

    accent:
      'cl-accent',

    border:
      'cl-border',

    radius:
      'cl-radius-lg',

    spacing:
      'cl-space-4',

    font:
      'cl-font-sans',
  });

const SITE_THEME_KEYS =
  Object.freeze(
    Object.keys(
      SITE_THEME_TOKEN_ALLOWLIST,
    ),
  );

export function reviewSiteThemeTokens(
  value,
  {
    allowAbsent = true,
  } = {},
) {
  if (
    value == null
  ) {
    if (
      allowAbsent
    ) {
      return Object.freeze({
        accepted:
          true,

        reason:
          'absent_legacy_theme',

        tokens:
          null,
      });
    }

    return Object.freeze({
      accepted:
        true,

      reason:
        'default_theme',

      tokens:
        DEFAULT_SITE_THEME_TOKENS,
    });
  }

  if (
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return reject(
      'theme_tokens_not_object',
    );
  }

  const suppliedKeys =
    Object.keys(
      value,
    );

  for (
    const key
    of suppliedKeys
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        SITE_THEME_TOKEN_ALLOWLIST,
        key,
      ) ===
      false
    ) {
      return reject(
        'unknown_theme_token',
        key,
      );
    }
  }

  const normalized =
    {};

  for (
    const key
    of SITE_THEME_KEYS
  ) {
    const fallback =
      DEFAULT_SITE_THEME_TOKENS[
        key
      ];

    const raw =
      Object.prototype.hasOwnProperty.call(
        value,
        key,
      )
        ? value[
          key
        ]
        : fallback;

    const candidate =
      String(
        raw ?? '',
      ).trim();

    if (
      SITE_THEME_TOKEN_ALLOWLIST[
        key
      ].includes(
        candidate,
      ) ===
      false
    ) {
      return reject(
        'invalid_theme_token_value',
        key,
      );
    }

    normalized[
      key
    ] =
      candidate;
  }

  return Object.freeze({
    accepted:
      true,

    reason:
      'reviewed_theme_tokens',

    tokens:
      Object.freeze(
        normalized,
      ),
  });
}

export function normalizeSiteThemeTokens(
  value,
) {
  const reviewed =
    reviewSiteThemeTokens(
      value,
      {
        allowAbsent:
          false,
      },
    );

  if (
    reviewed.accepted
  ) {
    return reviewed.tokens;
  }

  return DEFAULT_SITE_THEME_TOKENS;
}

function reject(
  reason,
  key = '',
) {
  return Object.freeze({
    accepted:
      false,

    reason,

    key:
      String(
        key || '',
      ),

    tokens:
      null,
  });
}
