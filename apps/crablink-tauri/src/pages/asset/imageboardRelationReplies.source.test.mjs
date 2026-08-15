import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

const panelUrl =
  new URL(
    './ImageboardRelationReplies.jsx',
    import.meta.url,
  );

const resolverUrl =
  new URL(
    './AssetResolver.jsx',
    import.meta.url,
  );

async function sources() {
  const [
    panel,
    resolver,
  ] =
    await Promise.all([
      readFile(
        panelUrl,
        'utf8',
      ),

      readFile(
        resolverUrl,
        'utf8',
      ),
    ]);

  return {
    panel,
    resolver,
  };
}

test(
  'phase14a6e3 mounts durable relation replies on the existing typed asset resolver',
  async () => {
    const {
      resolver,
    } =
      await sources();

    assert.equal(
      resolver.includes(
        "import ImageboardRelationReplies from './ImageboardRelationReplies.jsx';",
      ),
      true,
    );

    assert.equal(
      resolver.includes(
        '<AssetHydratedView',
      ),
      true,
    );

    assert.equal(
      resolver.includes(
        '<ImageboardRelationReplies',
      ),
      true,
    );

    assert.equal(
      resolver.indexOf(
        '<ImageboardRelationReplies',
      ) >
        resolver.indexOf(
          '<AssetHydratedView',
        ),
      true,
    );
  },
);

test(
  'phase14a6e3 uses the reviewed relation adapter mapper and Imageboard moderation projector',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        'createPublicationRelationAdapter',
        'mapPublicationRelationPageToImageboardReplies',
        'projectImageboardReplyPreview',
        'listPublicationRelations',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'phase14a6e3 reads only the first bounded page for the exact typed Image parent',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        'parentCrabUrl:',
        'imageCrabUrl',
        'cursor:',
        'null',
        'IMAGEBOARD_RELATION_READ_LIMIT',
        '50',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }

    assert.equal(
      panel.includes(
        'more replies available',
      ),
      true,
    );

    assert.equal(
      panel.includes(
        'cursor expansion remains a separate bounded follow-up',
      ),
      true,
    );
  },
);

test(
  'phase14a6e3 rejects relation drift away from the requested direct Image thread',
  async () => {
    const {
      panel,
    } =
      await sources();

    assert.equal(
      panel.includes(
        'reply.parentCrabUrl ===',
      ),
      true,
    );

    assert.equal(
      panel.includes(
        'reply.threadCrabUrl ===',
      ),
      true,
    );

    assert.equal(
      panel.includes(
        'siteContexts.size',
      ),
      true,
    );
  },
);

test(
  'phase14a6f5 keeps durable summaries as fallback until full Comment verification succeeds',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        'Relation summaries remain the fallback',
        'exact B3 and envelope verification',
        'Relation summary preview shown while the full Comment body is verified',
        'The durable relation summary preview remains visible',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'phase14a6e3 exposes truthful unavailable loading error empty and ready states',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        "'loading'",
        "'unavailable'",
        "'error'",
        "'ready'",
        'Loading durable replies',
        'Durable reply reader unavailable',
        'Unable to load durable replies',
        'No durable direct replies yet',
        'Durable direct replies',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'phase14a6e3 does not reintroduce session cache truth direct internal services or reply mutation',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const forbidden
      of [
        'sessionStorage.',
        'localStorage.',
        '/v1/',
        '/v1/index/',
        'beginImageboardReplyIntent',
        'rememberPublishedImageboardThread',
        '.publish(',
        '.write(',
      ]
    ) {
      assert.equal(
        panel.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  'phase14a6f5 wires the proven verified Comment hydrator into durable relation items',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        "import {",
        'hydrateVerifiedCommentContent',
        "from '../../shared/api/verifiedCommentContent.js';",
        'hydrateVisibleReplyBodies',
        'replaceReplyHydration',
        "'verified'",
        'contentVerified:',
        'true',
        'resolvedContentCid:',
        'verified.resolvedContentCid',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'phase14a6f5 hydrates only moderation-visible replies and leaves redacted projections unfetched',
  async () => {
    const {
      panel,
    } =
      await sources();

    assert.equal(
      panel.includes(
        "item.preview\n              .moderationState ===\n              'visible'",
      ),
      true,
    );

    assert.equal(
      panel.includes(
        "status:\n      'redacted'",
      ),
      true,
    );

    assert.equal(
      panel.includes(
        "preview.moderationState !==\n                  'visible'",
      ),
      true,
    );

    assert.equal(
      panel.indexOf(
        'await hydrateVerifiedCommentContent',
      ) >
        panel.indexOf(
          "item.preview\n              .moderationState ===\n              'visible'",
        ),
      true,
    );
  },
);

test(
  'phase14a6f5 displays full Comment body only from verified hydration and otherwise retains the preview',
  async () => {
    const {
      panel,
    } =
      await sources();

    for (
      const required
      of [
        "hydration?.status ===\n                'verified'",
        "hydration?.contentVerified ===\n                true",
        'verified\n                      ? hydration.body\n                      : preview.body',
        "'verified full reply'",
        'Full Comment body verified against',
        'Full Comment body was not displayed because verification did not complete',
      ]
    ) {
      assert.equal(
        panel.includes(
          required,
        ),
        true,
      );
    }
  },
);

