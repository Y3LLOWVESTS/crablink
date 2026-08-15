/**
 * RO:WHAT — FINAL_BETA Phase 12A2 built-in template migration tests.
 * RO:WHY — Proves normal built-ins now render through the shared structured engine.
 * RO:INTERACTS — siteTemplates, siteStructuredTemplates, siteDraftModel, siteTemplateEngine.
 * RO:INVARIANTS — four IDs and Phase 11 provenance preserved; normal roots use SiteTemplateInstanceV1.
 * RO:SECURITY — normal built-ins do not invoke legacy arbitrary HTML builders.
 * RO:TEST — node --test siteStructuredTemplates.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  SITE_TEMPLATE_DEFINITION_SCHEMA,
  SITE_TEMPLATE_ENGINE_VERSION,
  SITE_TEMPLATE_INSTANCE_SCHEMA,
} from './siteTemplateEngine.js';

import {
  DEFAULT_SITE_TEMPLATE,
  SITE_TEMPLATES,
  SITE_TEMPLATE_DEFINITIONS,
  buildSiteTemplatePatch,
} from './siteTemplates.js';

import {
  DEFAULT_SITE_DRAFT,
} from './siteDraftModel.js';

import {
  STRUCTURED_BUILTIN_TEMPLATE_IDS,
} from './siteStructuredTemplates.js';

const templatesUrl =
  new URL(
    './siteTemplates.js',
    import.meta.url,
  );

const draftModelUrl =
  new URL(
    './siteDraftModel.js',
    import.meta.url,
  );

test(
  'Phase 12A2 preserves all four foundation built-in template IDs as the product registry expands',
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

    assert.equal(
      productIds[4],
      'blog',
    );

    assert.equal(
      productIds[5],
      'imageboard',
    );

    assert.equal(
      productIds.at(
        -1,
      ),
      'forum',
    );
  },
);

test(
  'Phase 12A2 every built-in owns a SiteTemplateDefinitionV1',
  () => {
    for (
      const id
      of STRUCTURED_BUILTIN_TEMPLATE_IDS
    ) {
      const definition =
        SITE_TEMPLATE_DEFINITIONS[
          id
        ];

      assert.equal(
        definition.schema,
        SITE_TEMPLATE_DEFINITION_SCHEMA,
      );

      assert.equal(
        definition.id,
        id,
      );

      assert.equal(
        Number.isInteger(
          definition.version,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 12A2 normal patch path creates SiteTemplateInstanceV1',
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
  'Phase 12A2 Phase 11 template provenance remains preserved',
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

test(
  'Phase 12A2 reference graph root retains all four reviewed typed references',
  () => {
    const html =
      buildSiteTemplatePatch(
        'reference_graph_smoke',
      ).rootHtml;

    for (
      const tag
      of [
        'crab-image',
        'crab-post',
        'crab-comment',
        'crab-article',
      ]
    ) {
      assert.equal(
        html.includes(
          `<${tag} `,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 12A2 creator image and article roots use declarative blocks',
  () => {
    const creator =
      buildSiteTemplatePatch(
        'creator_landing',
      ).rootHtml;

    const image =
      buildSiteTemplatePatch(
        'image_showcase',
      ).rootHtml;

    const article =
      buildSiteTemplatePatch(
        'minimal_article',
      ).rootHtml;

    assert.equal(
      creator.includes(
        'data-site-block="asset_reference"',
      ),
      true,
    );

    assert.equal(
      image.includes(
        '<crab-image ',
      ),
      true,
    );

    assert.equal(
      article.includes(
        '<crab-article ',
      ),
      true,
    );
  },
);

test(
  'Phase 12A2 every structured built-in root remains scriptless',
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
  'Phase 12A2 default draft now comes from buildSiteTemplatePatch',
  async () => {
    assert.equal(
      DEFAULT_SITE_TEMPLATE.id,
      'reference_graph_smoke',
    );

    assert.equal(
      DEFAULT_SITE_DRAFT.rootHtml.includes(
        `data-site-template-engine="${SITE_TEMPLATE_ENGINE_VERSION}"`,
      ),
      true,
    );

    const source =
      await readFile(
        draftModelUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'DEFAULT_SITE_TEMPLATE.buildHtml(',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'buildSiteTemplatePatch(',
      ),
      true,
    );
  },
);

test(
  'Phase 12A2 normal patch function no longer invokes legacy buildHtml',
  async () => {
    const source =
      await readFile(
        templatesUrl,
        'utf8',
      );

    const start =
      source.indexOf(
        'export function buildSiteTemplatePatch(',
      );

    assert.equal(
      start >= 0,
      true,
    );

    const patchSource =
      source.slice(
        start,
      );

    assert.equal(
      patchSource.includes(
        '.buildHtml',
      ),
      false,
    );

    assert.equal(
      patchSource.includes(
        'renderSiteTemplateInstanceV1',
      ),
      true,
    );
  },
);
