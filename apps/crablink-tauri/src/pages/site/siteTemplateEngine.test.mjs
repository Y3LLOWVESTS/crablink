/**
 * RO:WHAT — Focused FINAL_BETA Phase 12A1 structured Site template engine tests.
 * RO:WHY — Proves the shared engine is deterministic, declarative, bounded, migratable, and scriptless.
 * RO:INTERACTS — siteTemplateEngine, siteThemePolicy.
 * RO:INVARIANTS — one engine contract; no arbitrary HTML/CSS/JS; canonical B3 references; transparent queries.
 * RO:SECURITY — unknown fields/blocks, remote links, unsafe assets, invalid themes, and malicious input fail closed or escape safely.
 * RO:TEST — node --test siteTemplateEngine.test.mjs.
 */

import assert from 'node:assert/strict';

import test from 'node:test';

import {
  SITE_TEMPLATE_ALLOWED_BLOCKS,
  SITE_TEMPLATE_DEFINITION_SCHEMA,
  SITE_TEMPLATE_ENGINE_VERSION,
  SITE_TEMPLATE_INSTANCE_SCHEMA,
  SITE_TEMPLATE_LEGACY_INSTANCE_SCHEMA,
  SITE_TEMPLATE_RENDER_SCHEMA,
  SiteTemplateEngineError,
  assertScriptlessOutput,
  createSiteTemplateDefinitionV1,
  createSiteTemplateInstanceV1,
  migrateSiteTemplateInstanceV1,
  renderSiteTemplateInstanceV1,
} from './siteTemplateEngine.js';

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const B3_A =
  `b3:${HASH_A}`;

const B3_B =
  `b3:${HASH_B}`;

function baseDefinition(
  sections = null,
) {
  return {
    schema:
      SITE_TEMPLATE_DEFINITION_SCHEMA,

    id:
      'shared_beta',

    version:
      1,

    name:
      'Shared Beta',

    description:
      'One structured engine.',

    themeTokens: {
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
    },

    navigation: [
      {
        id:
          'home',

        label:
          'Home',

        href:
          '/',
      },

      {
        id:
          'profile',

        label:
          'Profile',

        href:
          'crab://@creator',
      },
    ],

    sections:
      sections ?? [
        {
          id:
            'hero',

          type:
            'hero',

          title:
            'Welcome',

          subtitle:
            'Shared structured Site.',
        },

        {
          id:
            'nav',

          type:
            'navigation',

          title:
            'Browse',
        },

        {
          id:
            'recent',

          type:
            'content_query',

          title:
            'Recent',

          kinds: [
            'article',
            'post',
          ],

          limit:
            12,

          order:
            'chronological',
        },
      ],
  };
}

test(
  'Phase 12A1 locks definition instance render schemas and reviewed blocks',
  () => {
    assert.equal(
      SITE_TEMPLATE_ENGINE_VERSION,
      'crablink.site-template-engine.v1',
    );

    assert.equal(
      SITE_TEMPLATE_DEFINITION_SCHEMA,
      'crablink.site-template-definition.v1',
    );

    assert.equal(
      SITE_TEMPLATE_INSTANCE_SCHEMA,
      'crablink.site-template-instance.v1',
    );

    assert.equal(
      SITE_TEMPLATE_RENDER_SCHEMA,
      'crablink.site-template-render.v1',
    );

    assert.deepEqual(
      SITE_TEMPLATE_ALLOWED_BLOCKS,
      [
        'hero',
        'text',
        'navigation',
        'content_query',
        'thread_list',
        'thread_detail',
        'asset_reference',
        'divider',
      ],
    );
  },
);

test(
  'Phase 12A1 creates a bounded SiteTemplateDefinitionV1',
  () => {
    const definition =
      createSiteTemplateDefinitionV1(
        baseDefinition(),
      );

    assert.equal(
      definition.schema,
      SITE_TEMPLATE_DEFINITION_SCHEMA,
    );

    assert.equal(
      definition.id,
      'shared_beta',
    );

    assert.equal(
      definition.version,
      1,
    );

    assert.equal(
      definition.navigation.length,
      2,
    );

    assert.equal(
      definition.sections.length,
      3,
    );

    assert.equal(
      Object.isFrozen(
        definition,
      ),
      true,
    );
  },
);

test(
  'Phase 12A1 creates SiteTemplateInstanceV1 with canonical B3 and manifest references',
  () => {
    const instance =
      createSiteTemplateInstanceV1(
        baseDefinition(),
        {
          title:
            'Creator Site',

          references: {
            definitionB3Cid:
              B3_A,

            sourceManifestB3Cid:
              B3_B,
          },
        },
      );

    assert.equal(
      instance.schema,
      SITE_TEMPLATE_INSTANCE_SCHEMA,
    );

    assert.equal(
      instance.engineVersion,
      SITE_TEMPLATE_ENGINE_VERSION,
    );

    assert.equal(
      instance.templateId,
      'shared_beta',
    );

    assert.equal(
      instance.references.definitionB3Cid,
      B3_A,
    );

    assert.equal(
      instance.references.sourceManifestB3Cid,
      B3_B,
    );
  },
);

test(
  'Phase 12A1 content queries remain bounded and chronological',
  () => {
    assert.throws(
      () =>
        createSiteTemplateDefinitionV1(
          baseDefinition([
            {
              id:
                'query',

              type:
                'content_query',

              kinds: [
                'post',
              ],

              limit:
                51,

              order:
                'chronological',
            },
          ]),
        ),
      (error) => {
        assert.equal(
          error instanceof
            SiteTemplateEngineError,
          true,
        );

        assert.equal(
          error.reason,
          'invalid_query_limit',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        createSiteTemplateDefinitionV1(
          baseDefinition([
            {
              id:
                'query',

              type:
                'content_query',

              kinds: [
                'post',
              ],

              limit:
                12,

              order:
                'popular',
            },
          ]),
        ),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_query_order',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 12A1 shared engine defines thread list and thread detail sections',
  () => {
    const definition =
      createSiteTemplateDefinitionV1(
        baseDefinition([
          {
            id:
              'threads',

            type:
              'thread_list',

            title:
              'Threads',

            limit:
              20,

            order:
              'latest_activity',

            category:
              'general',
          },

          {
            id:
              'thread',

            type:
              'thread_detail',

            title:
              'Thread',

            binding:
              'route.thread',
          },
        ]),
      );

    assert.equal(
      definition.sections[0].type,
      'thread_list',
    );

    assert.equal(
      definition.sections[0].order,
      'latest_activity',
    );

    assert.equal(
      definition.sections[1].type,
      'thread_detail',
    );

    assert.equal(
      definition.sections[1].binding,
      'route.thread',
    );
  },
);

test(
  'Phase 12A1 deterministic scriptless render matches the locked snapshot',
  () => {
    const instance =
      createSiteTemplateInstanceV1(
        baseDefinition(),
        {
          title:
            'Creator Site',
        },
      );

    const rendered =
      renderSiteTemplateInstanceV1(
        instance,
      );

    const snapshot =
      [
        '<main class="cl-site-template" data-site-template-engine="crablink.site-template-engine.v1" data-site-template-id="shared_beta" data-site-template-version="1" data-theme-surface="cl-card" data-theme-text="cl-text" data-theme-accent="cl-accent" data-theme-border="cl-border" data-theme-radius="cl-radius-lg" data-theme-spacing="cl-space-4" data-theme-font="cl-font-sans">',
        '  <header data-site-template-header="true">',
        '    <h1>Creator Site</h1>',
        '    <p>One structured engine.</p>',
        '  </header>',
        '  <section data-site-block="hero" data-block-id="hero">',
        '    <h2>Welcome</h2>',
        '    <p>Shared structured Site.</p>',
        '  </section>',
        '  <section data-site-block="navigation" data-block-id="nav">',
        '    <h2>Browse</h2>',
        '    <nav aria-label="Site navigation">',
        '      <a data-nav-id="home" href="/">Home</a>',
        '      <a data-nav-id="profile" href="crab://@creator">Profile</a>',
        '    </nav>',
        '  </section>',
        '  <section data-site-block="content_query" data-block-id="recent" data-content-kinds="article,post" data-content-limit="12" data-content-order="chronological">',
        '    <h2>Recent</h2>',
        '    <div data-site-query-slot="content"></div>',
        '  </section>',
        '</main>',
      ].join(
        '\n',
      );

    assert.equal(
      rendered.html,
      snapshot,
    );

    assert.equal(
      rendered.blockCount,
      3,
    );
  },
);

test(
  'Phase 12A1 malicious text is escaped instead of becoming executable HTML',
  () => {
    const definition =
      baseDefinition([
        {
          id:
            'body',

          type:
            'text',

          title:
            '<script>run()</script>',

          body:
            '<img src=x onerror=run()>',
        },
      ]);

    const instance =
      createSiteTemplateInstanceV1(
        definition,
        {
          title:
            '<script>root()</script>',
        },
      );

    const rendered =
      renderSiteTemplateInstanceV1(
        instance,
      );

    assert.equal(
      rendered.html.includes(
        '<script>',
      ),
      false,
    );

    assert.equal(
      rendered.html.includes(
        '<img',
      ),
      false,
    );

    assert.equal(
      rendered.html.includes(
        '&lt;script&gt;root()&lt;/script&gt;',
      ),
      true,
    );

    assert.equal(
      rendered.html.includes(
        '&lt;img src=x onerror=run()&gt;',
      ),
      true,
    );
  },
);

test(
  'Phase 12A1 arbitrary HTML fields and unknown blocks fail closed',
  () => {
    assert.throws(
      () =>
        createSiteTemplateDefinitionV1({
          ...baseDefinition(),

          rawHtml:
            '<main>unsafe</main>',
        }),
      (error) => {
        assert.equal(
          error.reason,
          'unknown_field',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        createSiteTemplateDefinitionV1(
          baseDefinition([
            {
              id:
                'plugin',

              type:
                'custom_plugin',

              source:
                'anything',
            },
          ]),
        ),
      (error) => {
        assert.equal(
          error.reason,
          'unsupported_block_type',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 12A1 remote navigation and remote asset references fail closed',
  () => {
    assert.throws(
      () =>
        createSiteTemplateDefinitionV1({
          ...baseDefinition(),

          navigation: [
            {
              id:
                'remote',

              label:
                'Remote',

              href:
                'https://example.com',
            },
          ],
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_navigation_href',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        createSiteTemplateDefinitionV1(
          baseDefinition([
            {
              id:
                'image',

              type:
                'asset_reference',

              crabUrl:
                'https://example.com/image.png',
            },
          ]),
        ),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_asset_reference',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 12A1 invalid theme tokens and noncanonical B3 references fail closed',
  () => {
    assert.throws(
      () =>
        createSiteTemplateDefinitionV1({
          ...baseDefinition(),

          themeTokens: {
            ...baseDefinition()
              .themeTokens,

            accent:
              'url(https://example.com/theme.css)',
          },
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_theme_tokens',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        createSiteTemplateInstanceV1(
          baseDefinition(),
          {
            references: {
              definitionB3Cid:
                'b3:not-canonical',
            },
          },
        ),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_b3_reference',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 12A1 V0 and unversioned instances migrate deterministically to V1',
  () => {
    const migrated =
      migrateSiteTemplateInstanceV1({
        schema:
          SITE_TEMPLATE_LEGACY_INSTANCE_SCHEMA,

        template_id:
          'shared_beta',

        template_version:
          1,

        name:
          'Migrated Site',

        theme:
          baseDefinition()
            .themeTokens,

        nav: [
          {
            id:
              'home',

            label:
              'Home',

            href:
              '/',
          },
        ],

        blocks: [
          {
            id:
              'intro',

            type:
              'text',

            body:
              'Migrated body.',
          },
        ],

        definition_b3_cid:
          B3_A,

        source_manifest_b3_cid:
          B3_B,
      });

    assert.equal(
      migrated.schema,
      SITE_TEMPLATE_INSTANCE_SCHEMA,
    );

    assert.equal(
      migrated.engineVersion,
      SITE_TEMPLATE_ENGINE_VERSION,
    );

    assert.equal(
      migrated.instanceVersion,
      1,
    );

    assert.equal(
      migrated.title,
      'Migrated Site',
    );

    assert.equal(
      migrated.sections[0].type,
      'text',
    );

    assert.equal(
      migrated.references.definitionB3Cid,
      B3_A,
    );

    const unversioned =
      migrateSiteTemplateInstanceV1({
        templateId:
          'shared_beta',

        templateVersion:
          1,

        title:
          'Legacy',

        themeTokens:
          baseDefinition()
            .themeTokens,

        sections: [],
      });

    assert.equal(
      unversioned.schema,
      SITE_TEMPLATE_INSTANCE_SCHEMA,
    );
  },
);

test(
  'Phase 12A1 scriptless output guard rejects active-content output',
  () => {
    assert.equal(
      assertScriptlessOutput(
        '<main><p>safe</p></main>',
      ),
      true,
    );

    for (
      const malicious
      of [
        '<script>run()</script>',
        '<iframe src="/x"></iframe>',
        '<form></form>',
        '<a href="javascript:run()">x</a>',
      ]
    ) {
      assert.throws(
        () =>
          assertScriptlessOutput(
            malicious,
          ),
        (error) => {
          assert.equal(
            error.reason,
            'non_scriptless_render_output',
          );

          return true;
        },
      );
    }
  },
);

test(
  'Phase 12A1 typed asset references render only reviewed CrabLink embed tags',
  () => {
    const definition =
      baseDefinition([
        {
          id:
            'image',

          type:
            'asset_reference',

          title:
            'Image',

          crabUrl:
            `crab://${HASH_A}.image`,

          caption:
            'Verified reference.',
        },

        {
          id:
            'article',

          type:
            'asset_reference',

          crabUrl:
            `crab://${HASH_B}.article`,
        },
      ]);

    const instance =
      createSiteTemplateInstanceV1(
        definition,
      );

    const rendered =
      renderSiteTemplateInstanceV1(
        instance,
      );

    assert.equal(
      rendered.html.includes(
        `<crab-image src="crab://${HASH_A}.image"></crab-image>`,
      ),
      true,
    );

    assert.equal(
      rendered.html.includes(
        `<crab-article src="crab://${HASH_B}.article"></crab-article>`,
      ),
      true,
    );

    assert.equal(
      rendered.html.includes(
        '<iframe',
      ),
      false,
    );
  },
);
