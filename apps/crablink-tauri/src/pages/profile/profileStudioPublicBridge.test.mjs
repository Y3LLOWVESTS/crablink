import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  OWN_PROFILE_WORKSPACE_ROUTE,
  buildPublicProfileRoute,
} from './ownProfileIdentity.js';

test('Phase 4A2 preserves crab://profile as the owner Profile Studio route', () => {
  assert.equal(
    OWN_PROFILE_WORKSPACE_ROUTE,
    'crab://profile',
  );
});

test('Phase 4A2 builds the canonical public @username route', () => {
  assert.equal(
    buildPublicProfileRoute('RustyCreator'),
    'crab://@rustycreator',
  );

  assert.equal(
    buildPublicProfileRoute('@rustycreator'),
    'crab://@rustycreator',
  );
});

test('Phase 4A2 does not invent a public profile route without a username', () => {
  assert.equal(
    buildPublicProfileRoute(''),
    '',
  );
});

test('Phase 4A2 keeps owner and public profile route owners separate', () => {
  const source = readFileSync(
    new URL('./ProfilePage.jsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /if \(publicHandle\) \{\s*return <ProfilePublicView app=\{app\} route=\{route\} \/>;\s*\}/,
  );

  assert.match(
    source,
    /return <ProfileWorkspace app=\{app\} route=\{route\} \/>;/,
  );
});

test('Phase 4A2 presents Profile Studio with an explicit public-profile bridge', () => {
  const source = readFileSync(
    new URL('./ProfileHome.jsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /FINAL_BETA_PHASE4A2_PROFILE_STUDIO_PUBLIC_BRIDGE_V1/,
  );

  assert.match(
    source,
    /Profile Studio/,
  );

  assert.match(
    source,
    /View Public Profile/,
  );

  assert.match(
    source,
    /app\?\.navigate\?\.\(publicProfileRoute\)/,
  );

  assert.match(
    source,
    /disabled=\{!publicProfileRoute\}/,
  );

  assert.doesNotMatch(
    source,
    /claimPassportProfile|getPassportProfile/,
  );
});
