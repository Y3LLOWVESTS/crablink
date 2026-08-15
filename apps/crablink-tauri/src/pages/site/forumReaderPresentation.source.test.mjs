import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readFile,
} from 'node:fs/promises';

test(
  'phase15 Forum reader is wired into resolved Site rendering',
  async () => {
    const render =
      await readFile(
        new URL(
          './SiteRender.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    const presentation =
      await readFile(
        new URL(
          './ForumReaderPresentation.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    for (
      const required
      of [
        "import ForumReaderPresentation from './ForumReaderPresentation.jsx';",
        '<ForumReaderPresentation',
        'app={app}',
        'result={result}',
      ]
    ) {
      assert.equal(
        render.includes(
          required,
        ),
        true,
        `missing Forum SiteRender wiring: ${required}`,
      );
    }

    for (
      const required
      of [
        'createForumPublicReader',
        'beginForumThreadIntent',
        'beginForumReplyIntent',
        'Load More Threads',
        'Latest activity:',
        'durable threads',
        'durable replies',
      ]
    ) {
      assert.equal(
        presentation.includes(
          required,
        ),
        true,
        `missing Forum presentation behavior: ${required}`,
      );
    }

    for (
      const forbidden
      of [
        '/v1/index/',
        '/v1/site-publications',
        'svcIndex',
        'walletMutation',
        'ledgerMutation',
        'moderationMutation',
        'sticky: true',
        'locked: true',
        'dangerouslySetInnerHTML',
      ]
    ) {
      assert.equal(
        presentation.includes(
          forbidden,
        ),
        false,
        `forbidden Forum reader authority: ${forbidden}`,
      );
    }
  },
);
