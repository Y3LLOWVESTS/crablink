#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 10F source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function rejectFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${label} contains forbidden fragment: ${fragment}`);
    }
  }
}

const videoBoundary =
  read('scripts/check-crablink-tv-verified-video-playback-boundary.mjs');

const audioBoundary =
  read('scripts/check-crablink-tv-verified-audio-playback-boundary.mjs');

const focusModel =
  read('apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.js');

const focusTest =
  read('apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.test.mjs');

const focusComponent =
  read('apps/crablink-tv/src/media/TvPlaybackControlsFocusRail.jsx');

const focusSourceTest =
  read('apps/crablink-tv/src/media/TvPlaybackControlsFocusRail.source.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableFocusModel =
  stripComments(focusModel);

const executableFocusComponent =
  stripComments(focusComponent);

requireFragments(
  'Phase 10D video boundary',
  videoBoundary,
  [
    'PHASE10D_VIDEO_PLAYBACK_SURFACE=GREEN',
    'VIDEO_PLAYER_ELEMENT=ADDED',
    'REMOTE_VIDEO_CONTROLS=ADDED',
    'AUTOPLAY=DISABLED',
  ],
);

requireFragments(
  'Phase 10E audio boundary',
  audioBoundary,
  [
    'PHASE10E_AUDIO_PLAYBACK_SURFACE=GREEN',
    'AUDIO_PLAYER_ELEMENT=ADDED',
    'REMOTE_AUDIO_CONTROLS=ADDED',
    'AUTOPLAY=DISABLED',
    'NEXT_PATCH=PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL',
  ],
);

requireFragments(
  'Phase 10F controls focus model',
  focusModel,
  [
    'TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA',
    'crablink.tv.playback-controls-focus.v1',
    'projectTvPlaybackControlsFocus',
    'VIDEO_PLAYBACK_SCHEMA',
    'AUDIO_PLAYBACK_SCHEMA',
    'remoteFocusEnabled: true',
    'remoteActivationEnabled: true',
    'AUTOPLAY_NOT_ALLOWED',
    'PLAYER_ELEMENT_NOT_ATTACHED',
    'VIDEO_ELEMENT_NOT_ATTACHED',
    'AUDIO_ELEMENT_NOT_ATTACHED',
    'FULLSCREEN',
  ],
);

requireFragments(
  'Phase 10F controls focus component',
  focusComponent,
  [
    'TvPlaybackControlsFocusRail',
    'projectTvPlaybackControlsFocus',
    'data-playback-controls-state={focus.state}',
    'data-media-kind={focus.mediaKind}',
    'data-focused-control={focus.focusedControl}',
    'data-remote-focus-enabled={String(focus.remoteFocusEnabled)}',
    'data-remote-control={control.control}',
    'data-focused={String(control.selected === true)}',
    'data-activation-allowed={String(',
  ],
);

requireFragments(
  'Phase 10F controls focus tests',
  focusTest + '\n' + focusSourceTest,
  [
    'playback controls focus accepts verified video player and includes fullscreen',
    'playback controls focus accepts verified audio player and excludes fullscreen',
    'playback controls focus moves next and previous across focusable controls',
    'playback controls focus falls back when requested control is unavailable',
    'playback controls focus rejects missing element attachment and autoplay',
    'playback controls focus rail does not add media elements, source creation, storage, or authority',
  ],
);

rejectFragments(
  'Phase 10F focus model executable',
  executableFocusModel,
  [
    '<video',
    '<audio',
    'src=',
    'fetch(',
    'invoke(',
    'new Blob',
    'createObjectURL',
    'revokeObjectURL',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'autoPlay',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
    'assetBytes',
    'rawBody',
    'signedUrl',
    'objectUrl',
    'sourceUrl',
  ],
);

rejectFragments(
  'Phase 10F focus component executable',
  executableFocusComponent,
  [
    '<video',
    '<audio',
    'src=',
    'autoPlay',
    'fetch(',
    'invoke(',
    'new Blob',
    'createObjectURL',
    'revokeObjectURL',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ],
);

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:playback-controls-focus'] !==
  'node --test src/media/tvPlaybackControlsFocusModel.test.mjs src/media/TvPlaybackControlsFocusRail.source.test.mjs'
) {
  throw new Error(
    'TV Phase 10F playback controls focus test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:playback-controls-focus'] !==
  'node ../../scripts/check-crablink-tv-playback-controls-focus-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10F playback controls focus boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:playback-controls-focus && npm run check:playback-controls-focus',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10F playback controls focus checks.',
  );
}

if (
  rootScripts['tv:playback-controls-focus:test'] !==
  'npm --prefix apps/crablink-tv run test:playback-controls-focus'
) {
  throw new Error(
    'Root Phase 10F playback controls focus test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:playback-controls-focus:check'] !==
  'node scripts/check-crablink-tv-playback-controls-focus-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10F playback controls focus boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.js',
  'apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.test.mjs',
  'apps/crablink-tv/src/media/TvPlaybackControlsFocusRail.jsx',
  'apps/crablink-tv/src/media/TvPlaybackControlsFocusRail.source.test.mjs',
  'scripts/check-crablink-tv-playback-controls-focus-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV playback controls focus boundary passed.',
);
console.log(
  'Controls: verified video and audio players share deterministic remote focus projection.',
);
console.log(
  'Focus: selected control, next/previous movement, disabled controls, and activation permission are modeled.',
);
console.log(
  'Isolation: media elements, source creation, fetch, invoke, storage, autoplay, native plugin requirement, and authority remain absent.',
);
console.log('PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL=GREEN');
console.log('REMOTE_CONTROL_FOCUS_MODEL=ADDED');
console.log('VIDEO_AND_AUDIO_CONTROL_UNIFICATION=ADDED');
console.log('DISABLED_CONTROL_FOCUS_REJECTION=ADDED');
console.log('MEDIA_ELEMENT_CHANGES=NOT_ADDED');
console.log('AUTOPLAY=DISABLED');
console.log('NEXT_PATCH=PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL');
