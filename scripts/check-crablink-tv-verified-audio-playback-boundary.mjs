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
      `Missing Phase 10E source: ${relativePath}`,
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

const phase10dModel =
  read('apps/crablink-tv/src/media/tvVerifiedVideoPlaybackModel.js');

const phase10dBoundary =
  read('scripts/check-crablink-tv-verified-video-playback-boundary.mjs');

const audioModel =
  read('apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.js');

const audioModelTest =
  read('apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.test.mjs');

const audioComponent =
  read('apps/crablink-tv/src/media/TvVerifiedAudioPlaybackSurface.jsx');

const audioSourceTest =
  read('apps/crablink-tv/src/media/TvVerifiedAudioPlaybackSurface.source.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableAudioModel =
  stripComments(audioModel);

const executableAudioComponent =
  stripComments(audioComponent);

requireFragments(
  'Phase 10D video playback model',
  phase10dModel,
  [
    'crablink.tv.verified-video-playback.v1',
    'projectTvVerifiedVideoPlayback',
    'playerElementAttached: true',
    'videoElementAttached: true',
    'audioElementAttached: false',
    'autoplayAllowed: false',
  ],
);

requireFragments(
  'Phase 10D boundary',
  phase10dBoundary,
  [
    'PHASE10D_VIDEO_PLAYBACK_SURFACE=GREEN',
    'VIDEO_PLAYER_ELEMENT=ADDED',
    'AUDIO_PLAYER_ELEMENT=NOT_ADDED',
    'NEXT_PATCH=PHASE10E_AUDIO_PLAYBACK_SURFACE',
  ],
);

requireFragments(
  'Phase 10E audio playback model',
  audioModel,
  [
    'TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA',
    'crablink.tv.verified-audio-playback.v1',
    'TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA',
    'crablink.tv.verified-audio-element-source.v1',
    'projectTvVerifiedAudioPlayback',
    'EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
    'crablink.tv.verified-media-source-handoff-projection.v1',
    'AUDIO_PLAYBACK_KIND_REQUIRED',
    'AUDIO_ELEMENT_SOURCE_REJECTED',
    'playerElementAttached: true',
    'audioElementAttached: true',
    'videoElementAttached: false',
    'autoplayAllowed: false',
    'nativeMediaPluginRequired: false',
    'remoteControlsEnabled: true',
  ],
);

requireFragments(
  'Phase 10E audio playback component',
  audioComponent,
  [
    'TvVerifiedAudioPlaybackSurface',
    'projectTvVerifiedAudioPlayback',
    '<audio',
    'src={player.audioElementSource}',
    'preload="metadata"',
    'controls={false}',
    'data-crablink-audio-player="verified"',
    'data-remote-control={control.control}',
  ],
);

requireFragments(
  'Phase 10E tests',
  audioModelTest + '\n' + audioSourceTest,
  [
    'verified audio playback accepts local full-byte audio element source',
    'verified audio playback accepts backend service-path audio stream element source',
    'verified audio playback rejects video handoffs',
    'verified audio playback rejects unsafe or missing element sources',
    'verified audio playback rejects handle and content mismatches',
    'verified audio playback surface renders one audio element and remote controls',
    'verified audio playback surface does not add video, source creation, storage, or authority',
  ],
);

rejectFragments(
  'Phase 10E audio model executable',
  executableAudioModel,
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
  'Phase 10E audio component executable',
  executableAudioComponent,
  [
    '<video',
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
  tvScripts['test:verified-audio-playback'] !==
  'node --test src/media/tvVerifiedAudioPlaybackModel.test.mjs src/media/TvVerifiedAudioPlaybackSurface.source.test.mjs'
) {
  throw new Error(
    'TV Phase 10E audio playback test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:verified-audio-playback'] !==
  'node ../../scripts/check-crablink-tv-verified-audio-playback-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10E audio playback boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:verified-audio-playback && npm run check:verified-audio-playback',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10E audio playback checks.',
  );
}

if (
  rootScripts['tv:verified-audio-playback:test'] !==
  'npm --prefix apps/crablink-tv run test:verified-audio-playback'
) {
  throw new Error(
    'Root Phase 10E audio playback test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:verified-audio-playback:check'] !==
  'node scripts/check-crablink-tv-verified-audio-playback-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10E audio playback boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.js',
  'apps/crablink-tv/src/media/tvVerifiedAudioPlaybackModel.test.mjs',
  'apps/crablink-tv/src/media/TvVerifiedAudioPlaybackSurface.jsx',
  'apps/crablink-tv/src/media/TvVerifiedAudioPlaybackSurface.source.test.mjs',
  'scripts/check-crablink-tv-verified-audio-playback-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV verified audio playback boundary passed.',
);
console.log(
  'Audio: Phase 10C source handoff projection can attach a WebView audio element source.',
);
console.log(
  'Controls: remote play, pause, seek, and back controls are modeled for audio.',
);
console.log(
  'Isolation: video changes, source creation, fetch, invoke, storage, autoplay, native plugin requirement, and authority remain absent.',
);
console.log('PHASE10E_AUDIO_PLAYBACK_SURFACE=GREEN');
console.log('AUDIO_PLAYER_ELEMENT=ADDED');
console.log('VIDEO_PLAYER_ELEMENT=UNCHANGED');
console.log('REMOTE_AUDIO_CONTROLS=ADDED');
console.log('AUTOPLAY=DISABLED');
console.log('NATIVE_MEDIA_PLUGIN_REQUIRED=NO');
console.log('NEXT_PATCH=PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL');
