/**
 * RO:WHAT — FINAL_BETA Phase 12A3 one-renderer closeout tests.
 * RO:WHY — Proves legacy built-in HTML renderers are gone and the shared structured engine is authoritative.
 * RO:INTERACTS — siteTemplates, siteStructuredTemplates, siteTemplateEngine.
 * RO:INVARIANTS — four built-ins; one renderer; no buildHtml/baseDocument legacy path.
 * RO:SECURITY — no second built-in HTML/CSS/JS execution surface survives Phase 12.
 * RO:TEST — node --test siteTemplateEngineCloseout.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  SITE_TEMPLATE_ENGINE_VERSION,
  SITE_TEMPLATE_INSTANCE_SCHEMA,
} from './siteTemplateEngine.js';

import {
  SITE_TEMPLATES,
  SITE_TEMPLATE_DEFINITIONS,
  buildSiteTemplatePatch,
} from './siteTemplates.js';

import {
  STRUCTURED_BUILTIN_TEMPLATE_IDS,
} from './siteStructuredTemplates.js';

const templatesUrl =
  new URL(
    './siteTemplates.js',
    import.meta.url,
  );

test(
  'Phase 12A3 product template metadata has no legacy buildHtml functions',
  () => {
    assert.equal(
      SITE_TEMPLATES.length,
      7,
    );

    for (
      const template
      of SITE_TEMPLATES
    ) {
      assert.equal(
        Object.hasOwn(
          template,
          'buildHtml',
        ),
        false,
      );
    }
  },
);

test(
  'Phase 12A3 source contains no legacy renderer implementation',
  async () => {
    const source =
      await readFile(
        templatesUrl,
        'utf8',
      );

    for (
      const forbidden
      of [
        'buildHtml:',
        '.buildHtml(',
        'function baseDocument(',
        'function escapeHtml(',
        '<!doctype html>',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  'Phase 12A3 foundation built-ins and later product templates all use structured definitions',
  () => {
    const productIds =
      SITE_TEMPLATES.map(
        (template) =>
          template.id,
      );

    assert.equal(
      SITE_TEMPLATES.length,
      7,
    );

    for (
      const id
      of STRUCTURED_BUILTIN_TEMPLATE_IDS
    ) {
      assert.equal(
        productIds.includes(
          id,
        ),
        true,
      );
    }

    for (
      const template
      of SITE_TEMPLATES
    ) {
      assert.equal(
        SITE_TEMPLATE_DEFINITIONS[
          template.id
        ].id,
        template.id,
      );
    }
  },
);

test(
  'Phase 12A3 normal built-in patch path has exactly one engine authority',
  () => {
    for (
      const id
      of STRUCTURED_BUILTIN_TEMPLATE_IDS
    ) {
      const patch =
        buildSiteTemplatePatch(
          id,
        );

      assert.equal(
        patch.templateEngineVersion,
        SITE_TEMPLATE_ENGINE_VERSION,
      );

      assert.equal(
        patch.templateInstance.schema,
        SITE_TEMPLATE_INSTANCE_SCHEMA,
      );

      assert.equal(
        patch.templateInstance.templateId,
        id,
      );

      assert.equal(
        patch.rootHtml.includes(
          `data-site-template-engine="${SITE_TEMPLATE_ENGINE_VERSION}"`,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 12A3 built-in output remains declarative and scriptless',
  () => {
    for (
      const id
      of STRUCTURED_BUILTIN_TEMPLATE_IDS
    ) {
      const html =
        buildSiteTemplatePatch(
          id,
        ).rootHtml.toLowerCase();

      for (
        const forbidden
        of [
          '<script',
          '<style',
          '<iframe',
          '<object',
          '<embed',
          '<form',
          'javascript:',
        ]
      ) {
        assert.equal(
          html.includes(
            forbidden,
          ),
          false,
        );
      }
    }
  },
);

test(
  'Phase 12A3 Phase 11 provenance remains attached to every built-in patch',
  () => {
    for (
      const template
      of SITE_TEMPLATES
    ) {
      const patch =
        buildSiteTemplatePatch(
          template.id,
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
    }
  },
);
