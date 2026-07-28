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
    throw new Error(`Missing Phase 10 acceptance source: ${relativePath}`);
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

const boundaryFiles = Object.freeze([
  [
    'Phase 10A verified media playback',
    'scripts/check-crablink-tv-verified-media-playback-boundary.mjs',
    [
      'PHASE10A_VERIFIED_MEDIA_PLAYBACK_MODEL=GREEN',
      'MEDIA_KIND_PROJECTION=VIDEO_AND_AUDIO',
      'FULL_BYTE_VS_SERVICE_PATH_TRUTH=EXPLICIT',
      'SOURCE_HANDOFF=NOT_ADDED',
      'NEXT_PATCH=PHASE10B_TV_PLAYBACK_SURFACE_SHELL',
    ],
  ],
  [
    'Phase 10B playback surface shell',
    'scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs',
    [
      'PHASE10B_TV_PLAYBACK_SURFACE_SHELL=GREEN',
      'PLAYBACK_SURFACE_SHELL=ADDED',
      'SOURCE_HANDOFF=NOT_ADDED',
      'PLAYER_ELEMENT=NOT_ADDED',
      'NEXT_PATCH=PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION',
    ],
  ],
  [
    'Phase 10C media source handoff',
    'scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs',
    [
      'PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION=GREEN',
      'SOURCE_HANDOFF_MODEL=ADDED',
      'LOCAL_FULL_BYTE_HANDLE_REVIEW=ADDED',
      'BACKEND_SERVICE_PATH_HANDLE_REVIEW=ADDED',
      'RAW_MEDIA_REFERENCE_EXPOSURE=ABSENT',
      'NEXT_PATCH=PHASE10D_VIDEO_PLAYBACK_SURFACE',
    ],
  ],
  [
    'Phase 10D video playback',
    'scripts/check-crablink-tv-verified-video-playback-boundary.mjs',
    [
      'PHASE10D_VIDEO_PLAYBACK_SURFACE=GREEN',
      'VIDEO_PLAYER_ELEMENT=ADDED',
      'AUDIO_PLAYER_ELEMENT=NOT_ADDED',
      'REMOTE_VIDEO_CONTROLS=ADDED',
      'AUTOPLAY=DISABLED',
      'NATIVE_MEDIA_PLUGIN_REQUIRED=NO',
      'NEXT_PATCH=PHASE10E_AUDIO_PLAYBACK_SURFACE',
    ],
  ],
  [
    'Phase 10E audio playback',
    'scripts/check-crablink-tv-verified-audio-playback-boundary.mjs',
    [
      'PHASE10E_AUDIO_PLAYBACK_SURFACE=GREEN',
      'AUDIO_PLAYER_ELEMENT=ADDED',
      'VIDEO_PLAYER_ELEMENT=UNCHANGED',
      'REMOTE_AUDIO_CONTROLS=ADDED',
      'AUTOPLAY=DISABLED',
      'NATIVE_MEDIA_PLUGIN_REQUIRED=NO',
      'NEXT_PATCH=PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL',
    ],
  ],
  [
    'Phase 10F playback controls focus',
    'scripts/check-crablink-tv-playback-controls-focus-boundary.mjs',
    [
      'PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL=GREEN',
      'REMOTE_CONTROL_FOCUS_MODEL=ADDED',
      'VIDEO_AND_AUDIO_CONTROL_UNIFICATION=ADDED',
      'DISABLED_CONTROL_FOCUS_REJECTION=ADDED',
      'MEDIA_ELEMENT_CHANGES=NOT_ADDED',
      'NEXT_PATCH=PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL',
    ],
  ],
  [
    'Phase 10G media error retry truth',
    'scripts/check-crablink-tv-media-error-retry-truth-boundary.mjs',
    [
      'PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL=GREEN',
      'MEDIA_ERROR_RETRY_TRUTH=ADDED',
      'BUFFERING_TRUTH=ADDED',
      'USER_DRIVEN_RETRY_ONLY=ADDED',
      'AUTOMATIC_RETRY=BLOCKED',
      'MEDIA_ELEMENT_CHANGES=NOT_ADDED',
      'NEXT_PATCH=PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY',
    ],
  ],
]);

for (const [label, relativePath, fragments] of boundaryFiles) {
  requireFragments(label, read(relativePath), fragments);
}

const runtimeFiles = Object.freeze([
  [
    'Phase 10A readiness model',
    'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.js',
    [
      'crablink.tv.verified-media-playback.v1',
      'projectTvVerifiedMediaPlayback',
      'fullByteVerified',
      'backendServicePathVerified',
    ],
  ],
  [
    'Phase 10B shell model',
    'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.js',
    [
      'crablink.tv.verified-media-playback-surface.v1',
      'projectTvVerifiedMediaPlaybackSurface',
      'sourceAttached: false',
      'playerElementAttached: false',
      'autoplayAllowed: false',
    ],
  ],
  [
    'Phase 10C source handoff model',
    'apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.js',
    [
      'crablink.tv.verified-media-source-handoff.v1',
      'projectTvVerifiedMediaSourceHandoff',
      'sourceReadyForPlayerElement: true',
      'playerElementAttached: false',
      'autoplayAllowed: false',
    ],
  ],
  [
    'Phase 10D video playback model',
    'apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.js',
    [
      'crablink.tv.verified-video-playback.v1',
      'projectTvVerifiedVideoPlayback',
      'playerElementAttached: true',
      'videoElementAttached: true',
      'audioElementAttached: false',
      'autoplayAllowed: false',
    ],
  ],
  [
    'Phase 10E audio playback model',
    'apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.js',
    [
      'crablink.tv.verified-audio-playback.v1',
      'projectTvVerifiedAudioPlayback',
      'playerElementAttached: true',
      'audioElementAttached: true',
      'videoElementAttached: false',
      'autoplayAllowed: false',
    ],
  ],
  [
    'Phase 10F controls focus model',
    'apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.js',
    [
      'crablink.tv.playback-controls-focus.v1',
      'projectTvPlaybackControlsFocus',
      'remoteFocusEnabled: true',
      'remoteActivationEnabled: true',
      'AUTOPLAY_NOT_ALLOWED',
    ],
  ],
  [
    'Phase 10G error retry truth model',
    'apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.js',
    [
      'crablink.tv.media-error-retry-truth.v1',
      'projectTvMediaErrorRetryTruth',
      'USER_ALLOWED',
      'automaticRetryAllowed: false',
      'RAW_MEDIA_EVENT_REFERENCE_REJECTED',
    ],
  ],
]);

for (const [label, relativePath, fragments] of runtimeFiles) {
  requireFragments(label, read(relativePath), fragments);
}

const videoComponent =
  read('apps/crablink-tv/src/media/TvVerifiedVideoPlaybackSurface.jsx');

const audioComponent =
  read('apps/crablink-tv/src/media/TvVerifiedAudioPlaybackSurface.jsx');

const focusComponent =
  read('apps/crablink-tv/src/media/TvPlaybackControlsFocusRail.jsx');

const retryPanel =
  read('apps/crablink-tv/src/media/TvMediaErrorRetryTruthPanel.jsx');

requireFragments(
  'Phase 10D video component',
  videoComponent,
  [
    '<video',
    'src={player.videoElementSource}',
    'preload="metadata"',
    'controls={false}',
    'data-crablink-video-player="verified"',
  ],
);

requireFragments(
  'Phase 10E audio component',
  audioComponent,
  [
    '<audio',
    'src={player.audioElementSource}',
    'preload="metadata"',
    'controls={false}',
    'data-crablink-audio-player="verified"',
  ],
);

requireFragments(
  'Phase 10F controls focus rail',
  focusComponent,
  [
    'TvPlaybackControlsFocusRail',
    'data-focused-control={focus.focusedControl}',
    'data-remote-control={control.control}',
    'data-activation-allowed={String(',
  ],
);

requireFragments(
  'Phase 10G retry truth panel',
  retryPanel,
  [
    'TvMediaErrorRetryTruthPanel',
    'data-retry-allowed={String(truth.retryAllowed)}',
    'data-automatic-retry-allowed={String(',
    'data-remote-control="retry"',
    'onRetry(truth)',
  ],
);

const executableRuntime =
  [
    read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.js'),
    read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.js'),
    read('apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.js'),
    read('apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.js'),
    read('apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.js'),
    read('apps/crablink-tv/src/media/tvPlaybackControlsFocusModel.js'),
    read('apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.js'),
    focusComponent,
    retryPanel,
  ]
    .map(stripComments)
    .join('\n');

rejectFragments(
  'Phase 10 acceptance runtime executable',
  executableRuntime,
  [
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

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

const requiredTvScripts = Object.freeze({
  'test:verified-media-playback':
    'node --test src/media/tvVerifiedMediaPlaybackModel.test.mjs',
  'check:verified-media-playback':
    'node ../../scripts/check-crablink-tv-verified-media-playback-boundary.mjs',
  'test:verified-media-playback-surface':
    'node --test src/media/tvVerifiedMediaPlaybackSurfaceModel.test.mjs src/media/TvVerifiedMediaPlaybackSurface.source.test.mjs',
  'check:verified-media-playback-surface':
    'node ../../scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs',
  'test:verified-media-source-handoff':
    'node --test src/media/tvVerifiedMediaSourceHandoffModel.test.mjs',
  'check:verified-media-source-handoff':
    'node ../../scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs',
  'test:verified-video-playback':
    'node --test src/media/tvVerifiedVideoPlaybackModel.test.mjs src/media/TvVerifiedVideoPlaybackSurface.source.test.mjs',
  'check:verified-video-playback':
    'node ../../scripts/check-crablink-tv-verified-video-playback-boundary.mjs',
  'test:verified-audio-playback':
    'node --test src/media/tvVerifiedAudioPlaybackModel.test.mjs src/media/TvVerifiedAudioPlaybackSurface.source.test.mjs',
  'check:verified-audio-playback':
    'node ../../scripts/check-crablink-tv-verified-audio-playback-boundary.mjs',
  'test:playback-controls-focus':
    'node --test src/media/tvPlaybackControlsFocusModel.test.mjs src/media/TvPlaybackControlsFocusRail.source.test.mjs',
  'check:playback-controls-focus':
    'node ../../scripts/check-crablink-tv-playback-controls-focus-boundary.mjs',
  'test:media-error-retry-truth':
    'node --test src/media/tvMediaErrorRetryTruthModel.test.mjs src/media/TvMediaErrorRetryTruthPanel.source.test.mjs',
  'check:media-error-retry-truth':
    'node ../../scripts/check-crablink-tv-media-error-retry-truth-boundary.mjs',
  'test:phase10-acceptance':
    'node --test src/media/tvPhase10AcceptanceBoundary.source.test.mjs',
  'check:phase10-acceptance':
    'node ../../scripts/check-crablink-tv-phase10-acceptance-boundary.mjs',
});

for (const [scriptName, expectedCommand] of Object.entries(requiredTvScripts)) {
  if (tvScripts[scriptName] !== expectedCommand) {
    throw new Error(`TV script ${scriptName} is missing or incorrect.`);
  }
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:phase10-acceptance && npm run check:phase10-acceptance',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10 acceptance checks.',
  );
}

const requiredRootScripts = Object.freeze({
  'tv:phase10:acceptance:test':
    'npm --prefix apps/crablink-tv run test:phase10-acceptance',
  'tv:phase10:acceptance:check':
    'node scripts/check-crablink-tv-phase10-acceptance-boundary.mjs',
});

for (const [scriptName, expectedCommand] of Object.entries(requiredRootScripts)) {
  if (rootScripts[scriptName] !== expectedCommand) {
    throw new Error(`Root script ${scriptName} is missing or incorrect.`);
  }
}

const makeCodebundle =
  read('scripts/make_codebundle.sh');

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvPhase10AcceptanceBoundary.source.test.mjs',
  'scripts/check-crablink-tv-phase10-acceptance-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV Phase 10 acceptance boundary passed.');
console.log(
  'Acceptance: Phase 10A through Phase 10G markers and successor chain are present.',
);
console.log(
  'Playback: verified video and verified audio WebView player surfaces are present with remote controls and autoplay disabled.',
);
console.log(
  'Truth: local full-byte verification, backend service-path verification, source handoff, focus, buffering, error, and user-driven retry are explicit.',
);
console.log(
  'Isolation: source creation, fetch, invoke, storage, native plugin requirement, wallet, ledger, ROC authority, finality, and provider fallback remain absent.',
);
console.log('PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY=GREEN');
console.log('PHASE10_TRACK=COMPLETE');
console.log('VIDEO_PLAYBACK_SURFACE=ACCEPTED');
console.log('AUDIO_PLAYBACK_SURFACE=ACCEPTED');
console.log('REMOTE_CONTROLS_AND_FOCUS=ACCEPTED');
console.log('MEDIA_ERROR_RETRY_TRUTH=ACCEPTED');
console.log('AUTOPLAY=DISABLED');
console.log('NATIVE_MEDIA_PLUGIN_REQUIRED=NO');
console.log('NEXT_PHASE=PHASE11_CONTINUE_WATCHING_AND_RESOURCE_RELEASE');
