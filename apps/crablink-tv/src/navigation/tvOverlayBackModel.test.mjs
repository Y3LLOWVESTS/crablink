import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_BACK_ACTION,
  TV_OVERLAY_KIND,
  TV_OVERLAY_STATE_KIND,
  chooseTvBackAction,
  closeTvOverlay,
  createTvOverlayState,
  normalizeTvOverlayState,
  openTvDetailOverlay,
  openTvProblemOverlay,
} from './tvOverlayBackModel.js';

test(
  'default overlay state is immutable and closed',
  () => {
    const state =
      createTvOverlayState();

    assert.equal(
      Object.isFrozen(state),
      true,
    );

    assert.equal(
      state.kind,
      TV_OVERLAY_STATE_KIND,
    );

    assert.equal(
      state.overlayKind,
      TV_OVERLAY_KIND.NONE,
    );
  },
);

test(
  'invalid overlay state fails closed',
  () => {
    assert.deepEqual(
      normalizeTvOverlayState({
        kind: 'wrong',
        overlayKind: 'detail',
      }),
      createTvOverlayState(),
    );
  },
);

test(
  'detail overlay keeps bounded local display data',
  () => {
    const state =
      openTvDetailOverlay({
        title:
          'Verified detail',
        body: 'Body',
        code:
          'SHOULD_NOT_SURVIVE',
        returnFocusKey:
          'readiness-remote',
      });

    assert.equal(
      state.overlayKind,
      TV_OVERLAY_KIND.DETAIL,
    );

    assert.equal(
      state.returnFocusKey,
      'readiness-remote',
    );

    assert.equal(
      state.code,
      null,
    );
  },
);

test(
  'problem overlay accepts typed codes',
  () => {
    assert.equal(
      openTvProblemOverlay({
        code:
          'UNSUPPORTED_TV_ROUTE',
      }).code,
      'UNSUPPORTED_TV_ROUTE',
    );
  },
);

test(
  'problem overlay rejects raw prose codes',
  () => {
    assert.equal(
      openTvProblemOverlay({
        code:
          'raw problem prose',
      }).code,
      'TV_ROUTE_PROBLEM',
    );
  },
);

test(
  'overlay strings and focus keys are bounded',
  () => {
    const state =
      openTvDetailOverlay({
        title:
          't'.repeat(120),
        body:
          'b'.repeat(600),
        returnFocusKey:
          'f'.repeat(180),
      });

    assert.equal(
      state.title.length,
      96,
    );

    assert.equal(
      state.body.length,
      560,
    );

    assert.equal(
      state.returnFocusKey.length,
      128,
    );
  },
);

test(
  'closing an overlay restores its initiating focus key',
  () => {
    const result =
      closeTvOverlay(
        openTvDetailOverlay({
          title: 'Detail',
          body: 'Body',
          returnFocusKey:
            'section-review',
        }),
      );

    assert.equal(
      result.closed,
      true,
    );

    assert.equal(
      result.restoreFocusKey,
      'section-review',
    );

    assert.equal(
      result.state.overlayKind,
      TV_OVERLAY_KIND.NONE,
    );
  },
);

test(
  'closed overlays do not consume Back',
  () => {
    const initial =
      createTvOverlayState();

    const result =
      closeTvOverlay(initial);

    assert.equal(
      result.closed,
      false,
    );

    assert.deepEqual(
      result.state,
      initial,
    );

    assert.equal(
      result.restoreFocusKey,
      null,
    );
  },
);

test(
  'Back priority is overlay, player, detail, rail, root, Android',
  () => {
    assert.equal(
      chooseTvBackAction({
        overlayState:
          openTvProblemOverlay(),
      }),
      TV_BACK_ACTION
        .CLOSE_OVERLAY,
    );

    assert.equal(
      chooseTvBackAction({
        playerChromeVisible: true,
      }),
      TV_BACK_ACTION
        .HIDE_PLAYER_CHROME,
    );

    assert.equal(
      chooseTvBackAction({
        detailOpen: true,
      }),
      TV_BACK_ACTION
        .LEAVE_DETAIL,
    );

    assert.equal(
      chooseTvBackAction({
        railDepth: 1,
      }),
      TV_BACK_ACTION
        .RETURN_TO_RAIL,
    );

    assert.equal(
      chooseTvBackAction({
        routeDepth: 1,
      }),
      TV_BACK_ACTION
        .RETURN_TO_ROOT,
    );

    assert.equal(
      chooseTvBackAction(),
      TV_BACK_ACTION
        .SYSTEM_BACK,
    );
  },
);

test(
  'overlay wins over every lower Back layer',
  () => {
    assert.equal(
      chooseTvBackAction({
        overlayState:
          openTvDetailOverlay(),
        playerChromeVisible: true,
        detailOpen: true,
        railDepth: 3,
        routeDepth: 4,
      }),
      TV_BACK_ACTION
        .CLOSE_OVERLAY,
    );
  },
);
