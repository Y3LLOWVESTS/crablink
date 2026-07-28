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
      `Missing Phase 10D source: ${relativePath}`,
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

const phase10cModel =
  read('apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.js');

const phase10cBoundary =
  read('scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs');

const videoModel =
  read('apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.js');

const videoModelTest =
  read('apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.test.mjs');

const videoComponent =
  read('apps/crablink-tv/src/media/TvVerifiedVideoPlaybackSurface.jsx');

const videoSourceTest =
  read('apps/crablink-tv/src/media/TvVerifiedVideoPlaybackSurface.source.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableVideoModel =
  stripComments(videoModel);

const executableVideoComponent =
  stripComments(videoComponent);

requireFragments(
  'Phase 10C source handoff model',
  phase10cModel,
  [
    'crablink.tv.verified-media-source-handoff-projection.v1',
    'projectTvVerifiedMediaSourceHandoff',
    'sourceReadyForPlayerElement: true',
    'playerElementAttached: false',
    'autoplayAllowed: false',
  ],
);

requireFragments(
  'Phase 10C boundary',
  phase10cBoundary,
  [
    'PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION=GREEN',
    'SOURCE_HANDOFF_MODEL=ADDED',
    'PLAYER_ELEMENT=NOT_ADDED',
    'NEXT_PATCH=PHASE10D_VIDEO_PLAYBACK_SURFACE',
  ],
);

requireFragments(
  'Phase 10D video playback model',
  videoModel,
  [
    'TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA',
    'crablink.tv.verified-video-playback.v1',
    'TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA',
    'crablink.tv.verified-video-element-source.v1',
    'projectTvVerifiedVideoPlayback',
    'EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
    'crablink.tv.verified-media-source-handoff-projection.v1',
    'VIDEO_PLAYBACK_KIND_REQUIRED',
    'VIDEO_ELEMENT_SOURCE_REJECTED',
    'playerElementAttached: true',
    'videoElementAttached: true',
    'audioElementAttached: false',
    'autoplayAllowed: false',
    'nativeMediaPluginRequired: false',
    'remoteControlsEnabled: true',
  ],
);

requireFragments(
  'Phase 10D video playback component',
  videoComponent,
  [
    'TvVerifiedVideoPlaybackSurface',
    'projectTvVerifiedVideoPlayback',
    '<video',
    'src={player.videoElementSource}',
    'preload="metadata"',
    'playsInline',
    'controls={false}',
    'data-crablink-video-player="verified"',
    'data-remote-control={control.control}',
    'requestFullscreen',
  ],
);

requireFragments(
  'Phase 10D tests',
  videoModelTest + '\n' + videoSourceTest,
  [
    'verified video playback accepts local full-byte video element source',
    'verified video playback accepts backend service-path video stream element source',
    'verified video playback rejects audio handoffs',
    'verified video playback rejects unsafe or missing element sources',
    'verified video playback rejects handle and content mismatches',
    'verified video playback surface renders one video element and remote controls',
    'verified video playback surface does not add audio, source creation, storage, or authority',
  ],
);

rejectFragments(
  'Phase 10D video model executable',
  executableVideoModel,
  [
    '<video',
    '<audio',
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
  'Phase 10D video component executable',
  executableVideoComponent,
  [
    '<audio',
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
  tvScripts['test:verified-video-playback'] !==
  'node --test src/media/tvVerifiedVideoPlaybackModel.test.mjs src/media/TvVerifiedVideoPlaybackSurface.source.test.mjs'
) {
  throw new Error(
    'TV Phase 10D video playback test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:verified-video-playback'] !==
  'node ../../scripts/check-crablink-tv-verified-video-playback-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10D video playback boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:verified-video-playback && npm run check:verified-video-playback',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10D video playback checks.',
  );
}

if (
  rootScripts['tv:verified-video-playback:test'] !==
  'npm --prefix apps/crablink-tv run test:verified-video-playback'
) {
  throw new Error(
    'Root Phase 10D video playback test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:verified-video-playback:check'] !==
  'node scripts/check-crablink-tv-verified-video-playback-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10D video playback boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.js',
  'apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.test.mjs',
  'apps/crablink-tv/src/media/TvVerifiedVideoPlaybackSurface.jsx',
  'apps/crablink-tv/src/media/TvVerifiedVideoPlaybackSurface.source.test.mjs',
  'scripts/check-crablink-tv-verified-video-playback-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV verified video playback boundary passed.',
);
console.log(
  'Video: Phase 10C source handoff projection can attach a WebView video element source.',
);
console.log(
  'Controls: remote play, pause, seek, back, and fullscreen controls are modeled for video.',
);
console.log(
  'Isolation: audio, source creation, fetch, invoke, storage, autoplay, native plugin requirement, and authority remain absent.',
);
console.log('PHASE10D_VIDEO_PLAYBACK_SURFACE=GREEN');
console.log('VIDEO_PLAYER_ELEMENT=ADDED');
console.log('AUDIO_PLAYER_ELEMENT=NOT_ADDED');
console.log('REMOTE_VIDEO_CONTROLS=ADDED');
console.log('AUTOPLAY=DISABLED');
console.log('NATIVE_MEDIA_PLUGIN_REQUIRED=NO');
console.log('NEXT_PATCH=PHASE10E_AUDIO_PLAYBACK_SURFACE');
