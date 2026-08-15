/**
 * RO:WHAT — Focused FINAL_BETA Phase 11A5 declarative Site embed allowlist tests.
 * RO:WHY — Proves beta Site authoring uses only explicitly reviewed CrabLink embed types.
 * RO:INTERACTS — embedRegistry, siteCustomHtmlPolicy, SiteLaunchFlow, safe renderer.
 * RO:INVARIANTS — active image/post/comment/article embeds only; feature-gated and unknown types reject.
 * RO:SECURITY — browser embeds, remote embed references, kind mismatches, and unreviewed plugins fail closed before root storage.
 * RO:TEST — node --test siteDeclarativeEmbedPolicy.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  EMBED_REGISTRY_VERSION,
  SITE_EMBED_ALLOWLIST,
  SITE_EMBED_POLICY_VERSION,
  SUPPORTED_EMBEDS,
  renderSafeEmbeds,
  reviewSiteDeclarativeEmbeds,
} from '../../shared/embed/embedRegistry.js';

import {
  acceptSiteCustomHtml,
} from './siteCustomHtmlPolicy.js';

const launchUrl =
  new URL(
    './SiteLaunchFlow.jsx',
    import.meta.url,
  );

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const HASH_C =
  'c'.repeat(
    64,
  );

const HASH_D =
  'd'.repeat(
    64,
  );

test(
  'Phase 11A5 policy reuses the canonical embed registry and locks four active beta types',
  () => {
    assert.equal(
      SITE_EMBED_POLICY_VERSION,
      'crablink.site-embed-policy.v1',
    );

    assert.equal(
      EMBED_REGISTRY_VERSION,
      'crablink.embed-registry.v6',
    );

    assert.deepEqual(
      SITE_EMBED_ALLOWLIST,
      [
        'crab-image',
        'crab-post',
        'crab-comment',
        'crab-article',
      ],
    );

    for (
      const tag
      of SITE_EMBED_ALLOWLIST
    ) {
      assert.equal(
        SUPPORTED_EMBEDS[
          tag
        ].status,
        'active',
      );
    }
  },
);

test(
  'Phase 11A5 all four reviewed declarative embeds are accepted with matching crab references',
  () => {
    const html =
      [
        `<crab-image src="crab://${HASH_A}.image"></crab-image>`,
        `<crab-post src="crab://${HASH_B}.post"></crab-post>`,
        `<crab-comment src="crab://${HASH_C}.comment"></crab-comment>`,
        `<crab-article src="crab://${HASH_D}.article"></crab-article>`,
      ].join(
        '',
      );

    const review =
      reviewSiteDeclarativeEmbeds(
        html,
      );

    assert.equal(
      review.ok,
      true,
    );

    assert.deepEqual(
      review.findings,
      [],
    );

    assert.equal(
      review.references.length,
      4,
    );
  },
);

test(
  'Phase 11A5 feature-gated video and audio embeds reject for beta Site authoring',
  () => {
    const review =
      reviewSiteDeclarativeEmbeds(
        [
          `<crab-video src="crab://${HASH_A}.video"></crab-video>`,
          `<crab-audio src="crab://${HASH_B}.music"></crab-audio>`,
        ].join(
          '',
        ),
      );

    assert.equal(
      review.ok,
      false,
    );

    assert.equal(
      review.findings.filter(
        (finding) =>
          finding.code ===
          'feature_gated_embed',
      ).length,
      2,
    );
  },
);

test(
  'Phase 11A5 unknown Crab custom elements fail closed',
  () => {
    const review =
      reviewSiteDeclarativeEmbeds(
        `<crab-plugin src="crab://${HASH_A}.plugin"></crab-plugin>`,
      );

    assert.equal(
      review.ok,
      false,
    );

    assert.equal(
      review.findings[0]?.code,
      'unsupported_embed',
    );
  },
);

test(
  'Phase 11A5 active embed kind mismatch fails closed',
  () => {
    const review =
      reviewSiteDeclarativeEmbeds(
        `<crab-post src="crab://${HASH_A}.comment"></crab-post>`,
      );

    assert.equal(
      review.ok,
      false,
    );

    assert.equal(
      review.findings[0]?.code,
      'invalid_embed_reference',
    );
  },
);

test(
  'Phase 11A5 remote and malformed active embed references fail closed',
  () => {
    for (
      const src
      of [
        'https://example.com/image.png',
        '//example.com/image.png',
        'javascript:alert(1)',
        'crab://not-a-b3.image',
      ]
    ) {
      const review =
        reviewSiteDeclarativeEmbeds(
          `<crab-image src="${src}"></crab-image>`,
        );

      assert.equal(
        review.ok,
        false,
      );

      assert.equal(
        review.findings[0]?.code,
        'invalid_embed_reference',
      );
    }
  },
);

test(
  'Phase 11A5 browser iframe object and embed elements are outside the declarative allowlist',
  () => {
    for (
      const html
      of [
        '<iframe src="/local"></iframe>',
        '<object data="/local"></object>',
        '<embed src="/local">',
      ]
    ) {
      const review =
        reviewSiteDeclarativeEmbeds(
          html,
        );

      assert.equal(
        review.ok,
        false,
      );

      assert.equal(
        review.findings[0]?.code,
        'browser_embed_forbidden',
      );
    }
  },
);

test(
  'Phase 11A5 retained developer HTML uses the same embed allowlist',
  () => {
    const active =
      acceptSiteCustomHtml(
        `<main><crab-post src="crab://${HASH_A}.post"></crab-post></main>`,
      );

    assert.equal(
      active.accepted,
      true,
    );

    const gated =
      acceptSiteCustomHtml(
        `<main><crab-video src="crab://${HASH_A}.video"></crab-video></main>`,
      );

    assert.equal(
      gated.accepted,
      false,
    );

    assert.equal(
      gated.review.findings.includes(
        'feature_gated_embed',
      ),
      true,
    );

    const unknown =
      acceptSiteCustomHtml(
        `<main><crab-widget src="crab://${HASH_A}.widget"></crab-widget></main>`,
      );

    assert.equal(
      unknown.accepted,
      false,
    );

    assert.equal(
      unknown.review.findings.includes(
        'unsupported_embed',
      ),
      true,
    );
  },
);

test(
  'Phase 11A5 Site launch reviews embed policy before prepare and root storage',
  async () => {
    const source =
      await readFile(
        launchUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'reviewSiteDeclarativeEmbeds',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'embedReview?.ok ===',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'embedReview.ok;',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'Declarative embed policy blocked',
      ),
      true,
    );
  },
);

test(
  'Phase 11A5 renderer remains defense in depth for gated and unknown embeds',
  () => {
    const result =
      renderSafeEmbeds(
        [
          `<crab-video src="crab://${HASH_A}.video"></crab-video>`,
          `<crab-widget src="crab://${HASH_B}.widget"></crab-widget>`,
        ].join(
          '',
        ),
      );

    assert.equal(
      result.html.includes(
        '<crab-video',
      ),
      false,
    );

    assert.equal(
      result.html.includes(
        '<crab-widget',
      ),
      false,
    );

    assert.equal(
      result.html.includes(
        'feature-gated',
      ),
      true,
    );

    assert.equal(
      result.html.includes(
        'Unsupported CrabLink embed blocked',
      ),
      true,
    );
  },
);
