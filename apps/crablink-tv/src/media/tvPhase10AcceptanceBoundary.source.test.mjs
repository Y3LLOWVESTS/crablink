import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const root =
  path.resolve(here, '../../../..');

const boundaryPath =
  path.join(root, 'scripts/check-crablink-tv-phase10-acceptance-boundary.mjs');

const boundary =
  fs.readFileSync(boundaryPath, 'utf8');

test('phase 10 acceptance boundary enumerates the full phase chain', () => {
  for (const marker of [
    'PHASE10A_VERIFIED_MEDIA_PLAYBACK_MODEL=GREEN',
    'PHASE10B_TV_PLAYBACK_SURFACE_SHELL=GREEN',
    'PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION=GREEN',
    'PHASE10D_VIDEO_PLAYBACK_SURFACE=GREEN',
    'PHASE10E_AUDIO_PLAYBACK_SURFACE=GREEN',
    'PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL=GREEN',
    'PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL=GREEN',
    'PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY=GREEN',
    'PHASE10_TRACK=COMPLETE',
  ]) {
    assert.equal(
      boundary.includes(marker),
      true,
      `acceptance boundary missing marker: ${marker}`,
    );
  }
});

test('phase 10 acceptance boundary checks playback and retry truth surfaces', () => {
  for (const marker of [
    'VIDEO_PLAYBACK_SURFACE=ACCEPTED',
    'AUDIO_PLAYBACK_SURFACE=ACCEPTED',
    'REMOTE_CONTROLS_AND_FOCUS=ACCEPTED',
    'MEDIA_ERROR_RETRY_TRUTH=ACCEPTED',
    'AUTOPLAY=DISABLED',
    'NATIVE_MEDIA_PLUGIN_REQUIRED=NO',
  ]) {
    assert.equal(
      boundary.includes(marker),
      true,
      `acceptance boundary missing acceptance marker: ${marker}`,
    );
  }
});

test('phase 10 acceptance boundary keeps authority and source creation outside acceptance', () => {
  for (const fragment of [
    'fetch(',
    'invoke(',
    'new Blob',
    'createObjectURL',
    'revokeObjectURL',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ]) {
    assert.equal(
      boundary.includes(`'${fragment}'`) ||
        boundary.includes(`"${fragment}"`),
      true,
      `acceptance boundary does not reject: ${fragment}`,
    );
  }
});
