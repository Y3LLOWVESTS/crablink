/**
 * RO:WHAT — Focused FINAL_BETA Phase 11A3 provenance boundary tests.
 * RO:WHY — Proves reviewed Site templates carry bounded template and renderer provenance.
 * RO:INTERACTS — siteTemplates, siteDraftModel, SiteGuidedSetup, SiteLaunchFlow, siteClient, safeHtml.
 * RO:INVARIANTS — existing safe renderer version reused; custom HTML cannot masquerade as built-in template provenance.
 * RO:SECURITY — client provenance is validated before create and remains non-authoritative until backend manifest creation.
 * RO:TEST — node --test siteTemplateProvenance.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  normalizeSiteCreateRequest,
} from '../../shared/api/siteClient.js';

const templatesUrl =
  new URL(
    './siteTemplates.js',
    import.meta.url,
  );

const draftUrl =
  new URL(
    './siteDraftModel.js',
    import.meta.url,
  );

const setupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

const launchUrl =
  new URL(
    './SiteLaunchFlow.jsx',
    import.meta.url,
  );

const safeHtmlUrl =
  new URL(
    '../../shared/embed/safeHtml.js',
    import.meta.url,
  );

test(
  'Phase 11A3 reuses the existing safe renderer version owner',
  async () => {
    const [
      safeHtmlSource,
      templatesSource,
    ] =
      await Promise.all([
        readFile(
          safeHtmlUrl,
          'utf8',
        ),

        readFile(
          templatesUrl,
          'utf8',
        ),
      ]);

    assert.equal(
      safeHtmlSource.includes(
        "export const SAFE_HTML_VERSION = 'crablink.safe-html.v3';",
      ),
      true,
    );

    assert.equal(
      templatesSource.includes(
        "SAFE_HTML_VERSION",
      ),
      true,
    );

    assert.equal(
      templatesSource.includes(
        "../../shared/embed/safeHtml.js",
      ),
      true,
    );
  },
);

test(
  'Phase 11A3 all reviewed built-in templates carry one template version and renderer version',
  async () => {
    const source =
      await readFile(
        templatesUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'export const SITE_TEMPLATE_VERSION = 1;',
      ),
      true,
    );

    assert.equal(
      (
        source.match(
          /version: SITE_TEMPLATE_VERSION,/g,
        ) ||
        []
      ).length,
      4,
    );

    assert.equal(
      (
        source.match(
          /rendererVersion: SAFE_HTML_VERSION,/g,
        ) ||
        []
      ).length,
      4,
    );
  },
);

test(
  'Phase 11A3 applying a reviewed template records provenance in the local draft',
  async () => {
    const {
      SITE_TEMPLATES,
      buildSiteTemplatePatch,
    } =
      await import(
        './siteTemplates.js'
      );

    const template =
      SITE_TEMPLATES.find(
        (candidate) =>
          candidate.id ===
          'creator_landing',
      );

    assert.equal(
      Boolean(
        template,
      ),
      true,
    );

    const patch =
      buildSiteTemplatePatch(
        template.id,
        {
          rootDocumentCid:
            'b3:stale-root-must-clear',
        },
      );

    assert.equal(
      patch.templateId,
      template.id,
    );

    assert.equal(
      patch.templateVersion,
      template.version,
    );

    assert.equal(
      patch.rendererVersion,
      template.rendererVersion,
    );

    assert.equal(
      patch.rootDocumentCid,
      '',
    );

    assert.equal(
      typeof patch.rootHtml,
      'string',
    );

    assert.equal(
      patch.rootHtml.length >
        0,
      true,
    );
  },
);

test(
  'Phase 11A3 local manifest preview carries non-authoritative provenance',
  async () => {
    const source =
      await readFile(
        draftUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'template_id: cleanOrNull(safeDraft.templateId)',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'renderer_version: cleanOrNull(safeDraft.rendererVersion)',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'backend_verified: false',
      ),
      true,
    );
  },
);

test(
  'Phase 11A3 retained developer HTML is classified separately from built-in templates',
  async () => {
    const source =
      await readFile(
        setupUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'DEVELOPER_CUSTOM_HTML_TEMPLATE_ID',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'DEVELOPER_CUSTOM_HTML_TEMPLATE_VERSION',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'rendererVersion:\n            SAFE_HTML_VERSION',
      ),
      true,
    );

    assert.equal(
      (
        source.match(
          /templateId:\n            DEVELOPER_CUSTOM_HTML_TEMPLATE_ID/g,
        ) ||
        []
      ).length,
      2,
    );
  },
);

test(
  'Phase 11A3 launch flow forwards provenance through the real site create request',
  async () => {
    const source =
      await readFile(
        launchUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'template_id: draft.templateId',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'template_version: draft.templateVersion',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'renderer_version: draft.rendererVersion',
      ),
      true,
    );
  },
);

test(
  'Phase 11A3 site client preserves complete provenance and rejects partial provenance',
  () => {
    const baseRequest = {
      site_name:
        'phase11a3.com',

      root_document_cid:
        `b3:${'a'.repeat(64)}`,

      owner_passport_subject:
        'passport:main:phase11a3',

      owner_wallet_account:
        'acct_phase11a3',
    };

    const complete =
      normalizeSiteCreateRequest({
        ...baseRequest,

        template_id:
          'creator_landing',

        template_version:
          1,

        renderer_version:
          'crablink.safe-html.v3',
      });

    assert.equal(
      complete.template_id,
      'creator_landing',
    );

    assert.equal(
      complete.template_version,
      1,
    );

    assert.equal(
      complete.renderer_version,
      'crablink.safe-html.v3',
    );

    assert.throws(
      () =>
        normalizeSiteCreateRequest({
          ...baseRequest,

          template_id:
            'creator_landing',
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_site_template_provenance',
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
