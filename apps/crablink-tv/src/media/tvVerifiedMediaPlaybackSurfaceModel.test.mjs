import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL,
  TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA,
  TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE,
  projectTvVerifiedMediaPlaybackSurface,
} from './tvVerifiedMediaPlaybackSurfaceModel.js';

const baseReadyPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/demo',
  cid: 'b3:demo-video',
  contentType: 'video/mp4',
  contentLength: 2048,
  fullByteVerified: true,
  backendServicePathVerified: false,
});

test('verified media playback surface projects idle shell without source or player', () => {
  const surface =
    projectTvVerifiedMediaPlaybackSurface(null);

  assert.equal(
    surface.schema,
    TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA,
  );
  assert.equal(
    surface.state,
    TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.IDLE,
  );
  assert.equal(surface.sourceAttached, false);
  assert.equal(surface.playerElementAttached, false);
  assert.equal(surface.autoplayAllowed, false);
  assert.equal(
    surface.controls.find(
      (control) =>
        control.control ===
        TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.BACK,
    )?.enabled,
    true,
  );
});

test('verified media playback surface renders full-byte video readiness truth', () => {
  const surface =
    projectTvVerifiedMediaPlaybackSurface(baseReadyPlayback);

  assert.equal(
    surface.state,
    TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.READY,
  );
  assert.equal(surface.title, 'Verified video ready');
  assert.equal(surface.playbackKind, 'video');
  assert.equal(surface.fullByteVerified, true);
  assert.equal(surface.backendServicePathVerified, false);
  assert.equal(
    surface.verificationLabel,
    'Local full-byte verification complete.',
  );
  assert.equal(
    surface.sourcePlan,
    'Verified object source pending isolated handoff.',
  );
  assert.equal(surface.sourceAttached, false);
  assert.equal(surface.playerElementAttached, false);
});

test('verified media playback surface renders service-path audio truth distinctly', () => {
  const surface =
    projectTvVerifiedMediaPlaybackSurface({
      ...baseReadyPlayback,
      playbackKind: 'audio',
      contentType: 'audio/mpeg',
      fullByteVerified: false,
      backendServicePathVerified: true,
    });

  assert.equal(surface.title, 'Verified audio ready');
  assert.equal(surface.playbackKind, 'audio');
  assert.equal(surface.fullByteVerified, false);
  assert.equal(surface.backendServicePathVerified, true);
  assert.equal(
    surface.verificationLabel,
    'Backend service-path verification confirmed.',
  );
  assert.equal(
    surface.sourcePlan,
    'Gateway stream source pending isolated handoff.',
  );
});

test('verified media playback surface rejects non-ready playback views', () => {
  const surface =
    projectTvVerifiedMediaPlaybackSurface({
      ...baseReadyPlayback,
      state: 'rejected',
    });

  assert.equal(
    surface.state,
    TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.REJECTED,
  );
  assert.equal(surface.problem.code, 'PLAYBACK_NOT_READY');
  assert.equal(surface.sourceAttached, false);
  assert.equal(surface.playerElementAttached, false);

  for (const control of surface.controls) {
    if (
      control.control ===
      TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.BACK
    ) {
      assert.equal(control.enabled, true);
    } else {
      assert.equal(control.enabled, false);
    }
  }
});

test('verified media playback surface rejects stale schema and unsupported media kind', () => {
  const stale =
    projectTvVerifiedMediaPlaybackSurface({
      ...baseReadyPlayback,
      schema: 'crablink.tv.old-playback.v0',
    });

  assert.equal(stale.problem.code, 'UNSUPPORTED_PLAYBACK_SCHEMA');

  const unsupported =
    projectTvVerifiedMediaPlaybackSurface({
      ...baseReadyPlayback,
      playbackKind: 'image',
      contentType: 'image/png',
    });

  assert.equal(unsupported.problem.code, 'UNSUPPORTED_PLAYBACK_KIND');
});

test('verified media playback surface exposes bounded display facts without authority', () => {
  const surface =
    projectTvVerifiedMediaPlaybackSurface({
      ...baseReadyPlayback,
      canonicalCrabUrl: `crab://${'a'.repeat(200)}`,
      cid: `b3:${'b'.repeat(200)}`,
    });

  assert.ok(surface.canonicalCrabUrl.length <= 160);
  assert.ok(surface.cid.length <= 160);
  assert.deepEqual(
    surface.facts.map((fact) => fact.label),
    [
      'Kind',
      'Type',
      'Length',
      'Verification',
    ],
  );

  const serialized = JSON.stringify(surface);

  for (const forbidden of [
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
