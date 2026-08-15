/**
 * RO:WHAT — FINAL_BETA Phase 13A2 Blog registration and Site-flow integration tests.
 * RO:WHY — Proves Blog is a normal reviewed Site template rather than a separate builder or backend.
 * RO:INTERACTS — siteTemplates, blogTemplate, SiteGuidedSetup, Phase 12 shared engine.
 * RO:INVARIANTS — existing default remains stable; Blog is appended; one shared renderer; generic templateSettings only.
 * RO:SECURITY — no raw Blog HTML/CSS/JS path and no Blog-specific publication or wallet authority.
 * RO:TEST — node --test siteBlogTemplateRegistration.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  BLOG_TEMPLATE_ID,
  BLOG_TEMPLATE_MODEL_VERSION,
  BLOG_TEMPLATE_VERSION,
} from './blogTemplate.js';

import {
  SITE_TEMPLATE_ENGINE_VERSION,
  SITE_TEMPLATE_INSTANCE_SCHEMA,
} from './siteTemplateEngine.js';

import {
  STRUCTURED_BUILTIN_TEMPLATE_IDS,
} from './siteStructuredTemplates.js';

import {
  DEFAULT_SITE_TEMPLATE,
  SITE_TEMPLATES,
  SITE_TEMPLATE_DEFINITIONS,
  buildSiteTemplatePatch,
} from './siteTemplates.js';

const guidedSetupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

test(
  'Phase 13A2 keeps Blog fifth while later reviewed templates append safely',
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
        BLOG_TEMPLATE_ID,
        'imageboard',
        'forum',
      ],
    );
  },
);

test(
  'Phase 13A2 Blog metadata reuses existing template provenance ownership',
  () => {
    const reference =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
          'reference_graph_smoke',
      );

    const blog =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
          BLOG_TEMPLATE_ID,
      );

    assert.equal(
      Boolean(
        reference,
      ),
      true,
    );

    assert.equal(
      Boolean(
        blog,
      ),
      true,
    );

    assert.equal(
      blog.version,
      BLOG_TEMPLATE_VERSION,
    );

    assert.equal(
      blog.rendererVersion,
      reference.rendererVersion,
    );

    assert.equal(
      blog.patch.renderPolicy,
      'safe_embeds_only',
    );
  },
);

test(
  'Phase 13A2 product registry expansion preserves Blog structured registration',
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

    assert.equal(
      SITE_TEMPLATE_DEFINITIONS[
        BLOG_TEMPLATE_ID
      ].version,
      BLOG_TEMPLATE_VERSION,
    );
  },
);

test(
  'Phase 13A2 applying Blog creates shared-engine root and generic structured settings',
  () => {
    const patch =
      buildSiteTemplatePatch(
        BLOG_TEMPLATE_ID,
        {
          creatorDisplay:
            '@rustyonions',
        },
      );

    assert.equal(
      patch.templateId,
      BLOG_TEMPLATE_ID,
    );

    assert.equal(
      patch.templateVersion,
      BLOG_TEMPLATE_VERSION,
    );

    assert.equal(
      patch.templateModelVersion,
      BLOG_TEMPLATE_MODEL_VERSION,
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
      BLOG_TEMPLATE_ID,
    );

    assert.equal(
      patch.templateSettings.authorProfileCrabUrl,
      'crab://@rustyonions',
    );

    assert.equal(
      patch.templateSettings.theme,
      'classic',
    );

    assert.equal(
      patch.rootDocumentCid,
      '',
    );

    assert.equal(
      patch.rootHtml.includes(
        'data-site-template-id="blog"',
      ),
      true,
    );
  },
);

test(
  'Phase 13A2 existing Blog template settings survive normal Blog regeneration',
  () => {
    const patch =
      buildSiteTemplatePatch(
        BLOG_TEMPLATE_ID,
        {
          templateId:
            BLOG_TEMPLATE_ID,

          creatorDisplay:
            'rustyonions',

          templateSettings: {
            theme:
              'paper',

            aboutTitle:
              'Field Notes',

            aboutBody:
              'Long-form engineering notes from the creator.',

            listLimit:
              12,

            archiveLimit:
              30,
          },
        },
      );

    assert.equal(
      patch.templateSettings.theme,
      'paper',
    );

    assert.equal(
      patch.templateSettings.aboutTitle,
      'Field Notes',
    );

    assert.equal(
      patch.templateSettings.aboutBody,
      'Long-form engineering notes from the creator.',
    );

    assert.equal(
      patch.templateSettings.listLimit,
      12,
    );

    assert.equal(
      patch.templateSettings.archiveLimit,
      30,
    );

    assert.equal(
      patch.templateSettings.authorProfileCrabUrl,
      'crab://@rustyonions',
    );
  },
);

test(
  'Phase 13A2 Blog registered root remains scriptless and declarative',
  () => {
    const html =
      buildSiteTemplatePatch(
        BLOG_TEMPLATE_ID,
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

    assert.equal(
      html.includes(
        `data-site-template-engine="${SITE_TEMPLATE_ENGINE_VERSION}"`,
      ),
      true,
    );
  },
);

test(
  'Phase 13A2 existing guided setup automatically exposes Blog through the shared registry',
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
        'BLOG_TEMPLATE_ID',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'buildBlog',
      ),
      false,
    );
  },
);

test(
  'Phase 13A2 the four Phase 12 foundation templates remain on the shared engine',
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
        Object.hasOwn(
          SITE_TEMPLATES.find(
            (template) =>
              template.id ===
              id,
          ),
          'buildHtml',
        ),
        false,
      );
    }
  },
);
