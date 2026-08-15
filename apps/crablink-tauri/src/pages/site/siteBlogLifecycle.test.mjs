/**
 * RO:WHAT — FINAL_BETA Phase 13A3 Blog Site create/update/read lifecycle tests.
 * RO:WHY — Proves Blog reuses the real Site mutation and named-resolution contracts.
 * RO:INTERACTS — siteClient, SiteLaunchFlow, siteTemplates, gateway Site routes.
 * RO:INVARIANTS — update remains POST /sites; explicit confirmation remains mandatory; Blog has no separate backend.
 * RO:SECURITY — no silent Site mutation, wallet mutation, direct storage/index access, or Blog-specific authority.
 * RO:TEST — node --test siteBlogLifecycle.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  SiteMutationError,
  createSiteClient,
} from '../../shared/api/siteClient.js';

import {
  buildSiteTemplatePatch,
} from './siteTemplates.js';

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const ROOT_A =
  `b3:${HASH_A}`;

const ROOT_B =
  `b3:${HASH_B}`;

const launchFlowUrl =
  new URL(
    './SiteLaunchFlow.jsx',
    import.meta.url,
  );

function blogCreatePayload(
  rootDocumentCid = ROOT_A,
) {
  const patch =
    buildSiteTemplatePatch(
      'blog',
      {
        creatorDisplay:
          '@alice',
      },
    );

  return {
    site_name:
      'alice-blog',

    root_document_cid:
      rootDocumentCid,

    owner_passport_subject:
      'passport:main:alice',

    owner_wallet_account:
      'acct_alice',

    title:
      patch.title,

    description:
      patch.description,

    route_map: {
      '/':
        rootDocumentCid,
    },

    asset_map: {
      'index.html':
        rootDocumentCid,
    },

    template_id:
      patch.templateId,

    template_version:
      patch.templateVersion,

    renderer_version:
      patch.rendererVersion,
  };
}

function createMutationGateway() {
  const calls =
    [];

  return {
    calls,

    async request(
      route,
      options = {},
    ) {
      calls.push({
        route,
        options,
      });

      return {
        status:
          200,

        route,

        correlationId:
          `corr-${calls.length}`,

        data: {
          schema:
            'omnigate.site-create.v1',

          site_name:
            'alice-blog',

          root_document_cid:
            options.body?.root_document_cid ||
            ROOT_A,

          manifest: {
            status:
              'stored',

            manifest_cid:
              `b3:${'c'.repeat(64)}`,
          },

          index_pointer: {
            status:
              'stored',
          },

          links: {
            crab:
              'crab://alice-blog',
          },
        },
      };
    },
  };
}

test(
  'Phase 13A3 Site update requires explicit caller confirmation',
  async () => {
    const gateway =
      createMutationGateway();

    const client =
      createSiteClient(
        gateway,
      );

    await assert.rejects(
      () =>
        client.updateSite(
          blogCreatePayload(),
        ),
      (error) => {
        assert.equal(
          error instanceof
            SiteMutationError,
          true,
        );

        assert.equal(
          error.reason,
          'confirmation_required',
        );

        return true;
      },
    );

    assert.equal(
      gateway.calls.length,
      0,
    );
  },
);

test(
  'Phase 13A3 Blog update reuses POST /sites instead of a Blog backend',
  async () => {
    const gateway =
      createMutationGateway();

    const client =
      createSiteClient(
        gateway,
      );

    await client.updateSite(
      blogCreatePayload(
        ROOT_B,
      ),
      {
        confirmed:
          true,
      },
    );

    assert.equal(
      gateway.calls.length,
      1,
    );

    assert.equal(
      gateway.calls[0].route,
      '/sites',
    );

    assert.equal(
      gateway.calls[0].options.method,
      'POST',
    );

    assert.equal(
      gateway.calls[0].options.mutation,
      true,
    );

    assert.equal(
      gateway.calls[0].options.body.root_document_cid,
      ROOT_B,
    );
  },
);

test(
  'Phase 13A3 Blog update uses a distinct update idempotency scope',
  async () => {
    const gateway =
      createMutationGateway();

    const client =
      createSiteClient(
        gateway,
      );

    await client.updateSite(
      blogCreatePayload(
        ROOT_B,
      ),
      {
        confirmed:
          true,
      },
    );

    const key =
      String(
        gateway.calls[0]
          .options
          .headers[
            'Idempotency-Key'
          ] ||
        '',
      );

    assert.equal(
      key.includes(
        'site-update',
      ),
      true,
    );
  },
);

test(
  'Phase 13A3 Blog update preserves Site template provenance',
  async () => {
    const gateway =
      createMutationGateway();

    const client =
      createSiteClient(
        gateway,
      );

    const payload =
      blogCreatePayload(
        ROOT_B,
      );

    await client.updateSite(
      payload,
      {
        confirmed:
          true,
      },
    );

    const body =
      gateway.calls[0]
        .options
        .body;

    assert.equal(
      body.template_id,
      'blog',
    );

    assert.equal(
      body.template_version,
      payload.template_version,
    );

    assert.equal(
      body.renderer_version,
      payload.renderer_version,
    );
  },
);

test(
  'Phase 13A3 named Blog read still uses the existing Site resolver',
  async () => {
    const gateway = {
      async resolveCrab(
        crabUrl,
      ) {
        assert.equal(
          crabUrl,
          'crab://alice-blog',
        );

        return {
          status:
            200,

          route:
            '/crab/resolve',

          correlationId:
            'corr-read',

          data: {
            schema:
              'omnigate.site-page.v1',

            site_name:
              'alice-blog',

            root_document_cid:
              ROOT_B,

            manifest: {
              status:
                'present',

              hydration_status:
                'hydrated',

              metadata: {
                title:
                  'Alice Blog',
              },
            },

            links: {
              crab:
                'crab://alice-blog',
            },
          },
        };
      },

      async request() {
        throw new Error(
          'fallback should not run for successful resolver read',
        );
      },
    };

    const result =
      await createSiteClient(
        gateway,
      ).resolveSite(
        'alice-blog',
      );

    assert.equal(
      result.source,
      'crab_resolve',
    );

    assert.equal(
      result.summary.siteName,
      'alice-blog',
    );

    assert.equal(
      result.summary.rootDocumentCid,
      ROOT_B,
    );
  },
);

test(
  'Phase 13A3 Blog workspace switches from create to update after a published pointer',
  async () => {
    const source =
      await readFile(
        launchFlowUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        "const siteMutationMode =",
      ),
      true,
    );

    assert.equal(
      source.includes(
        "siteClient.updateSite.bind(",
      ),
      true,
    );

    assert.equal(
      source.includes(
        "publishedBlogManifestCid",
      ),
      true,
    );
  },
);

test(
  'Phase 13A3 successful Blog publication records same-session update state',
  async () => {
    const source =
      await readFile(
        launchFlowUrl,
        'utf8',
      );

    for (
      const marker
      of [
        "'publishedSiteName'",
        "'publishedManifestCid'",
        "'publishedRootDocumentCid'",
        "'publishedRevision'",
        "'publishedTemplateId'",
      ]
    ) {
      assert.equal(
        source.includes(
          marker,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 13A3 Blog publish stays in workspace while non-Blog navigation remains',
  async () => {
    const source =
      await readFile(
        launchFlowUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'blogTemplateMode ===',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "app.navigate(summary.crabUrl)",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/blogs',
      ),
      false,
    );

    assert.equal(
      source.includes(
        '/blog/update',
      ),
      false,
    );
  },
);
