/**
 * RO:WHAT — Focused FINAL_BETA Phase 11A4 Site theme-token security tests.
 * RO:WHY — Proves Site customization is declarative and bounded to the reviewed shared design-token vocabulary.
 * RO:INTERACTS — siteThemePolicy, themeTokens.css, siteDraftModel, SiteLaunchFlow, siteClient.
 * RO:INVARIANTS — no arbitrary CSS, URL, remote resource, custom property, or freeform theme value crosses Site create.
 * RO:SECURITY — malformed and unknown token input fails closed.
 * RO:TEST — node --test siteThemePolicy.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  DEFAULT_SITE_THEME_TOKENS,
  SITE_THEME_POLICY_VERSION,
  SITE_THEME_TOKEN_ALLOWLIST,
  normalizeSiteThemeTokens,
  reviewSiteThemeTokens,
} from './siteThemePolicy.js';

import {
  normalizeSiteCreateRequest,
} from '../../shared/api/siteClient.js';

const sharedThemeUrl =
  new URL(
    '../../shared/theme/themeTokens.css',
    import.meta.url,
  );

const draftUrl =
  new URL(
    './siteDraftModel.js',
    import.meta.url,
  );

const launchUrl =
  new URL(
    './SiteLaunchFlow.jsx',
    import.meta.url,
  );

test(
  'Phase 11A4 policy and bounded token keys are locked',
  () => {
    assert.equal(
      SITE_THEME_POLICY_VERSION,
      'crablink.site-theme-policy.v1',
    );

    assert.deepEqual(
      Object.keys(
        SITE_THEME_TOKEN_ALLOWLIST,
      ),
      [
        'surface',
        'text',
        'accent',
        'border',
        'radius',
        'spacing',
        'font',
      ],
    );
  },
);

test(
  'Phase 11A4 every allowlisted value belongs to the canonical Phase 2 shared theme',
  async () => {
    const css =
      await readFile(
        sharedThemeUrl,
        'utf8',
      );

    for (
      const values
      of Object.values(
        SITE_THEME_TOKEN_ALLOWLIST,
      )
    ) {
      for (
        const value
        of values
      ) {
        assert.equal(
          css.includes(
            `--${value}:`,
          ),
          true,
          `missing shared design token: ${value}`,
        );
      }
    }
  },
);

test(
  'Phase 11A4 absent local theme normalizes to reviewed defaults',
  () => {
    assert.deepEqual(
      normalizeSiteThemeTokens(
        null,
      ),
      DEFAULT_SITE_THEME_TOKENS,
    );
  },
);

test(
  'Phase 11A4 partial declarative input fills only reviewed defaults',
  () => {
    const reviewed =
      reviewSiteThemeTokens(
        {
          accent:
            'cl-info',

          spacing:
            'cl-space-5',
        },
        {
          allowAbsent:
            false,
        },
      );

    assert.equal(
      reviewed.accepted,
      true,
    );

    assert.equal(
      reviewed.tokens.accent,
      'cl-info',
    );

    assert.equal(
      reviewed.tokens.spacing,
      'cl-space-5',
    );

    assert.equal(
      reviewed.tokens.surface,
      DEFAULT_SITE_THEME_TOKENS.surface,
    );
  },
);

test(
  'Phase 11A4 unknown theme keys fail closed',
  () => {
    const reviewed =
      reviewSiteThemeTokens(
        {
          customCss:
            'body {}',
        },
        {
          allowAbsent:
            false,
        },
      );

    assert.equal(
      reviewed.accepted,
      false,
    );

    assert.equal(
      reviewed.reason,
      'unknown_theme_token',
    );
  },
);

test(
  'Phase 11A4 raw CSS and remote-resource shaped values fail closed',
  () => {
    for (
      const value
      of [
        'var(--cl-accent)',
        'url(https://example.com/theme.css)',
        'https://example.com/theme.css',
        'color:red',
        '--evil-token',
      ]
    ) {
      const reviewed =
        reviewSiteThemeTokens(
          {
            accent:
              value,
          },
          {
            allowAbsent:
              false,
          },
        );

      assert.equal(
        reviewed.accepted,
        false,
      );

      assert.equal(
        reviewed.reason,
        'invalid_theme_token_value',
      );
    }
  },
);

test(
  'Phase 11A4 Site create preserves reviewed theme tokens and rejects unsafe values',
  () => {
    const baseRequest = {
      site_name:
        'phase11a4.com',

      root_document_cid:
        `b3:${'b'.repeat(64)}`,

      owner_passport_subject:
        'passport:main:phase11a4',

      owner_wallet_account:
        'acct_phase11a4',

      template_id:
        'creator_landing',

      template_version:
        1,

      renderer_version:
        'crablink.safe-html.v3',
    };

    const safe =
      normalizeSiteCreateRequest({
        ...baseRequest,

        theme_tokens:
          DEFAULT_SITE_THEME_TOKENS,
      });

    assert.deepEqual(
      safe.theme_tokens,
      DEFAULT_SITE_THEME_TOKENS,
    );

    assert.throws(
      () =>
        normalizeSiteCreateRequest({
          ...baseRequest,

          theme_tokens: {
            ...DEFAULT_SITE_THEME_TOKENS,

            accent:
              'url(https://example.com/theme.css)',
          },
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_site_theme_tokens',
        );

        assert.equal(
          error.retryable,
          false,
        );

        return true;
      },
    );
  },
);

test(
  'Phase 11A4 local manifest and launch flow use reviewed declarative theme tokens',
  async () => {
    const [
      draftSource,
      launchSource,
    ] =
      await Promise.all([
        readFile(
          draftUrl,
          'utf8',
        ),

        readFile(
          launchUrl,
          'utf8',
        ),
      ]);

    assert.equal(
      draftSource.includes(
        'theme_tokens: safeDraft.themeTokens',
      ),
      true,
    );

    assert.equal(
      launchSource.includes(
        'theme_tokens: draft.themeTokens',
      ),
      true,
    );

    for (
      const forbidden
      of [
        'customCss:',
        'remoteCss:',
        'styleText:',
        'javascript:',
      ]
    ) {
      assert.equal(
        launchSource.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);
