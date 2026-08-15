/**
 * RO:WHAT — FINAL_BETA Phase 14A2 Imageboard Site-template registration tests.
 * RO:WHY — Proves Imageboard is product template six without changing default or renderer authority.
 * RO:INVARIANTS — foundation four first, Blog fifth, Imageboard sixth, one shared scriptless engine.
 * RO:SECURITY — no Imageboard-specific backend, raw code path, wallet authority, or ledger authority.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  STRUCTURED_BUILTIN_TEMPLATE_IDS,
} from './siteStructuredTemplates.js';

import {
  DEFAULT_SITE_TEMPLATE,
  SITE_TEMPLATE_DEFINITIONS,
  SITE_TEMPLATES,
  buildSiteTemplatePatch,
} from './siteTemplates.js';

import {
  IMAGEBOARD_MODEL_VERSION,
  IMAGEBOARD_TEMPLATE_ID,
  IMAGEBOARD_TEMPLATE_VERSION,
} from './imageboardTemplate.js';

const guidedSetupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

test(
  'Phase 14A2 keeps Imageboard sixth while later reviewed templates append safely',
  () => {
    assert.equal(
      SITE_TEMPLATES.length,
      7,
    );

    assert.equal(
      DEFAULT_SITE_TEMPLATE.id,
      'reference_graph_smoke',
    );

    assert.deepEqual(
      SITE_TEMPLATES.map(
        (template) =>
          template.id,
      ),
      [
        ...STRUCTURED_BUILTIN_TEMPLATE_IDS,
        'blog',
        IMAGEBOARD_TEMPLATE_ID,
        'forum',
      ],
    );
  },
);

test(
  'Phase 14A2 Imageboard metadata uses existing provenance ownership',
  () => {
    const reference =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
          'reference_graph_smoke',
      );

    const imageboard =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
          IMAGEBOARD_TEMPLATE_ID,
      );

    assert.equal(
      Boolean(
        imageboard,
      ),
      true,
    );

    assert.equal(
      imageboard.version,
      IMAGEBOARD_TEMPLATE_VERSION,
    );

    assert.equal(
      imageboard.modelVersion,
      IMAGEBOARD_MODEL_VERSION,
    );

    assert.equal(
      imageboard.rendererVersion,
      reference.rendererVersion,
    );

    assert.equal(
      imageboard.patch.renderPolicy,
      'safe_embeds_only',
    );
  },
);

test(
  'Phase 14A2 registry expansion preserves Imageboard structured registration',
  () => {
    assert.equal(
      Object.keys(
        SITE_TEMPLATE_DEFINITIONS,
      ).length,
      7,
    );

    for (
      const template
      of SITE_TEMPLATES
    ) {
      const definition =
        SITE_TEMPLATE_DEFINITIONS[
          template.id
        ];

      assert.equal(
        definition.id,
        template.id,
      );
    }
  },
);

test(
  'Phase 14A2 applying Imageboard creates a shared-engine instance',
  () => {
    const patch =
      buildSiteTemplatePatch(
        IMAGEBOARD_TEMPLATE_ID,
        {
          creatorDisplay:
            '@rustyonions',
        },
      );

    assert.equal(
      patch.templateId,
      IMAGEBOARD_TEMPLATE_ID,
    );

    assert.equal(
      patch.templateVersion,
      IMAGEBOARD_TEMPLATE_VERSION,
    );

    assert.equal(
      patch.templateEngineVersion,
      'crablink.site-template-engine.v1',
    );

    assert.equal(
      patch.templateInstance.templateId,
      IMAGEBOARD_TEMPLATE_ID,
    );

    assert.equal(
      patch.rootDocumentCid,
      '',
    );

    assert.equal(
      patch.rootHtml.includes(
        'data-site-template-id="imageboard"',
      ),
      true,
    );
  },
);

test(
  'Phase 14A2 Imageboard definition is distinct from image_showcase identity',
  () => {
    const foundation =
      SITE_TEMPLATE_DEFINITIONS
        .image_showcase;

    const imageboard =
      SITE_TEMPLATE_DEFINITIONS
        .imageboard;

    assert.notEqual(
      imageboard,
      foundation,
    );

    const serialized =
      JSON.stringify(
        imageboard,
      );

    assert.equal(
      serialized.includes(
        'image_showcase',
      ),
      false,
    );

    assert.equal(
      serialized.includes(
        'imageboard',
      ),
      true,
    );
  },
);

test(
  'Phase 14A2 Imageboard root remains declarative and scriptless',
  () => {
    const html =
      buildSiteTemplatePatch(
        IMAGEBOARD_TEMPLATE_ID,
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
        'onclick=',
        'onerror=',
      ]
    ) {
      assert.equal(
        html.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  'Phase 14A2 guided setup exposes Imageboard through the existing registry',
  async () => {
    const source =
      await readFile(
        guidedSetupUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'SITE_TEMPLATES.map((template)',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'buildSiteTemplatePatch(templateId',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'IMAGEBOARD_TEMPLATE_ID',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'buildImageboard',
      ),
      false,
    );
  },
);

test(
  'Phase 14A2 Blog stays fifth while Imageboard becomes sixth',
  () => {
    assert.equal(
      SITE_TEMPLATES[4]?.id,
      'blog',
    );

    assert.equal(
      SITE_TEMPLATES[5]?.id,
      'imageboard',
    );

    const blogPatch =
      buildSiteTemplatePatch(
        'blog',
        {
          creatorDisplay:
            '@rustyonions',
        },
      );

    assert.equal(
      blogPatch.templateId,
      'blog',
    );

    assert.equal(
      blogPatch.templateModelVersion,
      'crablink.blog-template.v1',
    );

    assert.equal(
      blogPatch.templateEngineVersion,
      'crablink.site-template-engine.v1',
    );
  },
);
