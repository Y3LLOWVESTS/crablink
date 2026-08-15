/**
 * RO:WHAT — FINAL_BETA Phase 15A2 Forum Site-template registration tests.
 * RO:WHY — Proves Forum is product template seven and remains on the shared scriptless Site engine.
 * RO:INTERACTS — siteTemplates, forumTemplate, forumModel, SiteGuidedSetup, Phase 12 shared engine.
 * RO:INVARIANTS — foundation four first, Blog fifth, Imageboard sixth, Forum seventh, established default unchanged.
 * RO:SECURITY — no Forum-specific backend, raw code path, fake sticky/locked truth, ROC bypass, wallet authority, or ledger authority.
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
  STRUCTURED_BUILTIN_TEMPLATE_IDS,
} from './siteStructuredTemplates.js';

import {
  DEFAULT_SITE_TEMPLATE,
  SITE_TEMPLATE_DEFINITIONS,
  SITE_TEMPLATES,
  buildSiteTemplatePatch,
} from './siteTemplates.js';

import {
  FORUM_MODEL_VERSION,
  FORUM_TEMPLATE_ID,
  FORUM_TEMPLATE_VERSION,
  createForumTemplateDefinitionV1,
} from './forumTemplate.js';

const guidedSetupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

test(
  'phase15a2 appends Forum seventh without changing established template order or default',
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
        'imageboard',
        FORUM_TEMPLATE_ID,
      ],
    );
  },
);

test(
  'phase15a2 Forum metadata reuses existing renderer and provenance posture',
  () => {
    const reference =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
            'reference_graph_smoke',
      );

    const forum =
      SITE_TEMPLATES.find(
        (template) =>
          template.id ===
            FORUM_TEMPLATE_ID,
      );

    assert.equal(
      Boolean(
        forum,
      ),
      true,
    );

    assert.equal(
      forum.version,
      FORUM_TEMPLATE_VERSION,
    );

    assert.equal(
      forum.modelVersion,
      FORUM_MODEL_VERSION,
    );

    assert.equal(
      forum.rendererVersion,
      reference.rendererVersion,
    );

    assert.equal(
      forum.patch.renderPolicy,
      'safe_embeds_only',
    );
  },
);

test(
  'phase15a2 product registry exposes seven structured template definitions',
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
  'phase15a2 applying Forum creates a shared-engine Site instance',
  () => {
    const patch =
      buildSiteTemplatePatch(
        FORUM_TEMPLATE_ID,
        {
          creatorDisplay:
            '@rustyonions',
        },
      );

    assert.equal(
      patch.templateId,
      FORUM_TEMPLATE_ID,
    );

    assert.equal(
      patch.templateVersion,
      FORUM_TEMPLATE_VERSION,
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
      FORUM_TEMPLATE_ID,
    );

    assert.equal(
      patch.rootDocumentCid,
      '',
    );

    assert.equal(
      patch.rootHtml.includes(
        'data-site-template-id="forum"',
      ),
      true,
    );
  },
);

test(
  'phase15a2 Forum definition uses existing bounded thread-list block and latest-activity ordering',
  () => {
    const definition =
      createForumTemplateDefinitionV1();

    const threads =
      definition.sections.find(
        (section) =>
          section.id ===
            'threads',
      );

    assert.equal(
      definition.id,
      FORUM_TEMPLATE_ID,
    );

    assert.equal(
      threads.type,
      'thread_list',
    );

    assert.equal(
      threads.limit,
      20,
    );

    assert.equal(
      threads.order,
      'latest_activity',
    );

    assert.equal(
      threads.category,
      'general',
    );
  },
);

test(
  'phase15a2 Forum definition does not clone Imageboard identity or invent runtime policy truth',
  () => {
    const serialized =
      JSON.stringify(
        createForumTemplateDefinitionV1(),
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
      false,
    );

    assert.equal(
      serialized.includes(
        '"sticky"',
      ),
      false,
    );

    assert.equal(
      serialized.includes(
        '"locked"',
      ),
      false,
    );

    assert.equal(
      serialized.includes(
        'reviewed_policy',
      ),
      false,
    );
  },
);

test(
  'phase15a2 Forum registered root remains declarative and scriptless',
  () => {
    const html =
      buildSiteTemplatePatch(
        FORUM_TEMPLATE_ID,
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
  'phase15a2 existing guided setup exposes Forum through generic template registry',
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
        'FORUM_TEMPLATE_ID',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'buildForum',
      ),
      false,
    );
  },
);

test(
  'phase15a2 preserves Blog fifth and Imageboard sixth while Forum becomes seventh',
  () => {
    assert.equal(
      SITE_TEMPLATES[4]?.id,
      'blog',
    );

    assert.equal(
      SITE_TEMPLATES[5]?.id,
      'imageboard',
    );

    assert.equal(
      SITE_TEMPLATES[6]?.id,
      FORUM_TEMPLATE_ID,
    );
  },
);
