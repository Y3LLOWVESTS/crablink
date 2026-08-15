import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

const readerUrl =
  new URL(
    './ImageboardReaderPresentation.jsx',
    import.meta.url,
  );

const renderUrl =
  new URL(
    './SiteRender.jsx',
    import.meta.url,
  );

const cssUrl =
  new URL(
    './site.css',
    import.meta.url,
  );

async function sources() {
  const [
    reader,
    render,
    css,
  ] =
    await Promise.all([
      readFile(
        readerUrl,
        'utf8',
      ),

      readFile(
        renderUrl,
        'utf8',
      ),

      readFile(
        cssUrl,
        'utf8',
      ),
    ]);

  return {
    reader,
    render,
    css,
  };
}

test(
  'Phase 14A5 reader is explicitly network-backed and Imageboard-specific',
  async () => {
    const {
      reader,
    } =
      await sources();

    for (
      const required
      of [
        'data-final-beta-imageboard-reader="phase14a5"',
        'isResolvedImageboardSite',
        'projectResolvedImageboardPublications',
        'public network summaries',
        'typed .image threads',
      ]
    ) {
      assert.equal(
        reader.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 14A5 uses the existing bounded public publication adapter',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'createPublicationAdapter',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        '.listCreatorPublications({',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        'IMAGEBOARD_PUBLICATION_READ_LIMIT',
      ),
      true,
    );
  },
);

test(
  'Phase 14A5 resolves creator identity through the existing Site proof boundary',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'resolveSiteCreatorIdentity',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        'readPublicProfileCache',
      ),
      true,
    );
  },
);

test(
  'Phase 14A5 never reads A3 session thread memory as public board truth',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'readImageboardProductContext',
      ),
      false,
    );

    assert.equal(
      reader.includes(
        'rememberPublishedImageboardThread',
      ),
      false,
    );

    assert.equal(
      reader.includes(
        'sessionStorage.',
      ),
      false,
    );
  },
);

test(
  'Phase 14A5 uses the reviewed Site gateway object helper only for free thumbnail previews',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        "access ===\n      'free'",
      ),
      true,
    );

    assert.equal(
      reader.includes(
        'objectUrlFromCid',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        'Preview withheld',
      ),
      true,
    );
  },
);

test(
  'Phase 14A5 makes the B3 truth boundary visible instead of claiming summary verification',
  async () => {
    const {
      reader,
    } =
      await sources();

    for (
      const required
      of [
        'B3 expected CIDs only',
        'not B3-verified here',
        'B3 expected',
        'not verified here',
      ]
    ) {
      assert.equal(
        reader.includes(
          required,
        ),
        true,
      );
    }

    assert.equal(
      reader.includes(
        '<Badge tone="success">Verified',
      ),
      false,
    );
  },
);

test(
  'Phase 14A5 opens real typed Image routes instead of an Imageboard-specific asset endpoint',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'item.imageCrabUrl',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        "app?.navigate?.(\n        item.imageCrabUrl",
      ),
      true,
    );

    assert.equal(
      reader.includes(
        '/imageboard/',
      ),
      false,
    );
  },
);

test(
  'Phase 14A5 reply action reuses the reviewed Image to Comment handoff',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'beginImageboardReplyIntent',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        "'crab://comment'",
      ),
      true,
    );
  },
);

test(
  'Phase 14A5 moderation placeholders cannot open or reply',
  async () => {
    const {
      reader,
    } =
      await sources();

    for (
      const required
      of [
        "item?.moderationState ===\n      'visible'",
        "item?.moderationState ===\n      'content_warning'",
        "value ===\n    'deleted'",
        "value ===\n    'blocked'",
        "value ===\n    'moderated'",
      ]
    ) {
      assert.equal(
        reader.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 14A5 exposes bounded client pagination and warning reveal controls',
  async () => {
    const {
      reader,
    } =
      await sources();

    for (
      const required
      of [
        'Previous',
        'Next',
        'projection.hasPrevious',
        'projection.hasNext',
        'Reveal warned previews',
        'Hide warned previews',
      ]
    ) {
      assert.equal(
        reader.includes(
          required,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 14A5 states unavailable durable metadata instead of inventing it',
  async () => {
    const {
      reader,
    } =
      await sources();

    assert.equal(
      reader.includes(
        'category metadata unavailable',
      ),
      true,
    );

    assert.equal(
      reader.includes(
        'Per-thread category, warning, and reply-count fields are',
      ),
      true,
    );
  },
);

test(
  'Phase 14A5 mounts the Imageboard reader only behind the existing Site access gate',
  async () => {
    const {
      render,
    } =
      await sources();

    assert.equal(
      render.includes(
        "import ImageboardReaderPresentation from './ImageboardReaderPresentation.jsx';",
      ),
      true,
    );

    const blogIndex =
      render.indexOf(
        '<BlogReaderPresentation',
      );

    const imageboardIndex =
      render.indexOf(
        '<ImageboardReaderPresentation',
      );

    const accessIndex =
      render.lastIndexOf(
        '{canRenderPreview && (',
        imageboardIndex,
      );

    assert.equal(
      blogIndex >
      -1,
      true,
    );

    assert.equal(
      imageboardIndex >
      blogIndex,
      true,
    );

    assert.equal(
      accessIndex >
      -1 &&
      accessIndex <
      imageboardIndex,
      true,
    );

    assert.equal(
      render
        .slice(
          accessIndex,
          imageboardIndex +
            240,
        )
        .includes(
          'siteClient={siteClient}',
        ),
      true,
    );
  },
);

test(
  'Phase 14A5 reader styles use shared semantic Site tokens',
  async () => {
    const {
      css,
    } =
      await sources();

    for (
      const required
      of [
        'FINAL_BETA_PHASE14A5_IMAGEBOARD_READER_STYLES_V1',
        '.imageboard-reader-grid',
        '.imageboard-reader-thumbnail',
        '.imageboard-reader-thumbnail-placeholder',
        'var(--cl-border)',
        'var(--cl-card-muted)',
        'var(--cl-muted)',
      ]
    ) {
      assert.equal(
        css.includes(
          required,
        ),
        true,
      );
    }
  },
);
