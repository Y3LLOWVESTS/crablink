#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 10A verified media playback readiness for CrabLink TV.
 * RO:WHY — Media playback must start from strict truth projection before source handoff or player UI.
 * RO:INTERACTS — tvVerifiedMediaPlaybackModel, focused tests, Phase 9 acceptance, package scripts, and codebundle coverage.
 * RO:INVARIANTS — exact route/CID/kind binding; matching media family; explicit full-byte versus service-path truth.
 * RO:SECURITY — no fetch, invoke, URLs, raw bytes, browser storage, economic authority, or direct-provider fallback.
 * RO:TEST — npm --prefix apps/crablink-tv run check:verified-media-playback.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 10A source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//gu,
      '',
    )
    .replace(
      /^\s*\/\/[!/]?.*$/gmu,
      '',
    );
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

const model =
  read(
    'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.js',
  );

const modelTest =
  read(
    'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.test.mjs',
  );

const phase9Acceptance =
  read(
    'scripts/check-crablink-tv-phase9-acceptance-boundary.mjs',
  );

const tvPackage =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  );

const rootPackage =
  JSON.parse(
    read(
      'package.json',
    ),
  );

const makeCodebundle =
  read(
    'scripts/make_codebundle.sh',
  );

const executableModel =
  stripComments(model);

requireFragments(
  'verified media playback model',
  model,
  [
    'TV_VERIFIED_MEDIA_FACTS_SCHEMA',
    'TV_VERIFIED_MEDIA_PLAYBACK_SCHEMA',
    'projectTvVerifiedMediaPlayback',
    'LOCAL_FULL_BYTE',
    'BACKEND_SERVICE_PATH',
    'VERIFIED_OBJECT',
    'GATEWAY_STREAM',
    "contentType.startsWith('video/')",
    "contentType.startsWith('audio/')",
    'contentLength >',
    'maxPlaybackBytes',
    'sourceAttached: false',
  ],
);

requireFragments(
  'verified media playback tests',
  modelTest,
  [
    'accepts locally full-byte-verified video facts',
    'accepts backend-verified music and podcast stream facts without claiming local full verification',
    'rejects unsupported image article and live stream asset kinds',
    'rejects content-type and source-posture mismatches',
    'enforces positive safe lengths and the configured media ceiling',
  ],
);

requireFragments(
  'Phase 9 predecessor',
  phase9Acceptance,
  [
    'PHASE9_LIBRARY_B3_ASSET_AND_CONTENT_VIEW_PROOF=GREEN',
    'PHASE9_COMPLETE=YES',
    'NEXT_PATCH=PHASE10_MEDIA_PLAYBACK_FOUNDATION',
  ],
);

for (const [
  label,
  pattern,
] of [
  [
    'global fetch',
    /\bfetch\s*\(/u,
  ],
  [
    'dynamic invoke',
    /\binvoke\s*\(/u,
  ],
  [
    'source URL field',
    /\bsourceUrl\b|\bsignedUrl\b/u,
  ],
  [
    'object URL authority',
    /\bobjectUrl\b|\bcreateObjectURL\b|\brevokeObjectURL\b/u,
  ],
  [
    'raw byte authority',
    /\bassetBytes\b|\bnew\s+Blob\b/u,
  ],
  [
    'browser storage',
    /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/u,
  ],
  [
    'player element',
    /<video\b|<audio\b/u,
  ],
  [
    'unsafe HTML injection',
    /\bdangerouslySetInnerHTML\b|\binnerHTML\b/u,
  ],
  [
    'direct-provider route',
    /\bproviderUrl\b|\bdirectProvider\b/u,
  ],
  [
    'wallet language',
    /\bwallet\b/u,
  ],
  [
    'ledger language',
    /\bledger\b/u,
  ],
  [
    'ROC language',
    /\bROC\b/u,
  ],
  [
    'entitlement language',
    /\bentitlement\b/u,
  ],
  [
    'finality language',
    /\bfinality\b/u,
  ],
]) {
  if (
    pattern.test(
      executableModel,
    )
  ) {
    throw new Error(
      `Verified media playback model acquired forbidden ${label}.`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts[
    'test:verified-media-playback'
  ] !==
  'node --test src/media/tvVerifiedMediaPlaybackModel.test.mjs'
) {
  throw new Error(
    'TV verified media playback test script is incorrect.',
  );
}

if (
  tvScripts[
    'check:verified-media-playback'
  ] !==
  'node ../../scripts/check-crablink-tv-verified-media-playback-boundary.mjs'
) {
  throw new Error(
    'TV verified media playback boundary script is incorrect.',
  );
}

for (const step of [
  'npm run test:verified-media-playback',
  'npm run check:verified-media-playback',
]) {
  if (
    !String(
      tvScripts.check ?? '',
    ).includes(step)
  ) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:verified-media-playback:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:verified-media-playback'
) {
  throw new Error(
    'Root verified media playback test script is incorrect.',
  );
}

if (
  rootScripts[
    'tv:verified-media-playback:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:verified-media-playback'
) {
  throw new Error(
    'Root verified media playback boundary script is incorrect.',
  );
}

if (
  !makeCodebundle.includes(
    'scripts/check-crablink-tv-verified-media-playback-boundary.mjs',
  )
) {
  throw new Error(
    'Future codebundle coverage is missing the Phase 10A boundary script.',
  );
}

console.log(
  'CrabLink TV verified media playback boundary passed.',
);

console.log(
  'Projection: reviewed video becomes video readiness; reviewed music and podcast become audio readiness.',
);

console.log(
  'Truth: local full-byte verification and backend service-path verification remain visibly distinct.',
);

console.log(
  'Isolation: no source URL, raw bytes, object URL, player element, fetch, invoke, or direct-provider fallback was added.',
);

console.log(
  'PHASE10A_VERIFIED_MEDIA_PLAYBACK_MODEL=GREEN',
);

console.log(
  'MEDIA_KIND_PROJECTION=VIDEO_AND_AUDIO',
);

console.log(
  'FULL_BYTE_VS_SERVICE_PATH_TRUTH=EXPLICIT',
);

console.log(
  'SOURCE_HANDOFF=NOT_ADDED',
);

console.log(
  'PLAYER_SURFACE=NOT_ADDED',
);

console.log(
  'REMOTE_CONTROLS=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=PHASE10B_TV_PLAYBACK_SURFACE_SHELL',
);
