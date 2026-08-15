import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectImageboardReplyPreview,
} from './imageboardModel.js';

const IMAGE =
  `crab://${'1'.repeat(64)}.image`;

const COMMENT =
  `crab://${'a'.repeat(64)}.comment`;

function reply(
  overrides = {},
) {
  return {
    crabUrl:
      COMMENT,

    parentCrabUrl:
      IMAGE,

    body:
      'Durable relation preview',

    creator: {
      username:
        '',

      displayName:
        '@alice',

      profileUrl:
        '',
    },

    createdAt:
      '2026-08-12T03:00:00.000Z',

    visibility:
      'public',

    contentWarning:
      null,

    ...overrides,
  };
}

test(
  'phase14a6e3 reply preview uses existing visible moderation projection',
  () => {
    const projected =
      projectImageboardReplyPreview(
        reply(),
      );

    assert.equal(
      projected.crabUrl,
      COMMENT,
    );

    assert.equal(
      projected.parentCrabUrl,
      IMAGE,
    );

    assert.equal(
      projected.moderationState,
      'visible',
    );

    assert.equal(
      projected.body,
      'Durable relation preview',
    );

    assert.equal(
      projected.creator?.displayName,
      '@alice',
    );
  },
);

test(
  'phase14a6e3 reply preview redacts deleted blocked and moderated relation summaries',
  () => {
    for (
      const visibility
      of [
        'deleted',
        'blocked',
        'moderated',
      ]
    ) {
      const projected =
        projectImageboardReplyPreview(
          reply({
            visibility,
          }),
        );

      assert.equal(
        projected.moderationState,
        visibility,
      );

      assert.equal(
        projected.body,
        '',
      );

      assert.equal(
        projected.creator,
        null,
      );
    }
  },
);

test(
  'phase14a6e3 reply preview reuses existing content warning reveal behavior',
  () => {
    const hidden =
      projectImageboardReplyPreview(
        reply({
          contentWarning:
            'Sensitive image discussion',
        }),
      );

    assert.equal(
      hidden.moderationState,
      'content_warning',
    );

    assert.equal(
      hidden.body,
      '',
    );

    const revealed =
      projectImageboardReplyPreview(
        reply({
          contentWarning:
            'Sensitive image discussion',
        }),
        {
          revealWarnings:
            true,
        },
      );

    assert.equal(
      revealed.moderationState,
      'content_warning',
    );

    assert.equal(
      revealed.body,
      'Durable relation preview',
    );
  },
);
