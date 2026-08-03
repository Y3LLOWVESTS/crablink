/**
 * RO:WHAT — Formal FINAL_BETA Phase 4 identity, Passport, profile, and startup-lock acceptance gate.
 * RO:WHY — Closes identity/profile coherence before developer-surface quarantine begins.
 * RO:INTERACTS — Phase 4A1-A4 models, source tests, onboarding handoff, Profile Studio, public profile, Passport drawer, startup lock.
 * RO:INVARIANTS — no fake username/profile confirmation; no React PIN/recovery surface; no new native, wallet, ledger, receipt, or social-graph authority.
 * RO:TEST — node --test finalBetaPhase4IdentityProfileAcceptance.source.test.mjs.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  OWN_PROFILE_WORKSPACE_ROUTE,
  buildPublicProfileRoute,
  resolveOwnProfileHandle,
} from '../pages/profile/ownProfileIdentity.js';

import {
  projectStartupPassportPresentation,
} from '../onboarding/startupPassportPresentation.js';

const FINAL_BETA_PHASE4_IDENTITY_PROFILE_ACCEPTANCE =
  'FINAL_BETA_PHASE4_IDENTITY_PROFILE_ACCEPTANCE_V1';

const FILES = Object.freeze({
  profileGateway:
    new URL('../pages/profile/ProfileGateway.jsx', import.meta.url),

  profileHome:
    new URL('../pages/profile/ProfileHome.jsx', import.meta.url),

  profilePage:
    new URL('../pages/profile/ProfilePage.jsx', import.meta.url),

  passportDrawer:
    new URL('./shell/PassportDrawer.jsx', import.meta.url),

  passportSummary:
    new URL('./shell/PassportSummary.jsx', import.meta.url),

  onboardingRouteGate:
    new URL('../onboarding/OnboardingRouteGate.jsx', import.meta.url),

  onboardingCompletion:
    new URL('../onboarding/OnboardingCompletionStep.jsx', import.meta.url),

  onboardingHomeHandoff:
    new URL('../onboarding/onboardingHomeHandoff.js', import.meta.url),

  onboardingHomeHandoffTest:
    new URL('../onboarding/onboardingHomeHandoff.test.mjs', import.meta.url),

  startupGate:
    new URL('../onboarding/StartupPassportUnlockGate.jsx', import.meta.url),
});

async function readSources(...keys) {
  return Promise.all(
    keys.map((key) =>
      readFile(FILES[key], 'utf8'),
    ),
  );
}

test('Phase 4 formal marker and canonical owner route are locked', () => {
  assert.equal(
    FINAL_BETA_PHASE4_IDENTITY_PROFILE_ACCEPTANCE,
    'FINAL_BETA_PHASE4_IDENTITY_PROFILE_ACCEPTANCE_V1',
  );

  assert.equal(
    OWN_PROFILE_WORKSPACE_ROUTE,
    'crab://profile',
  );

  assert.equal(
    resolveOwnProfileHandle({
      settings: {
        requestedHandle: '@phase4owner',
      },
    }),
    '@phase4owner',
  );
});

test('Phase 4 own profile opens from onboarding identity without manual reconstruction', async () => {
  const [gateway, handoff] =
    await readSources(
      'profileGateway',
      'onboardingHomeHandoff',
    );

  assert.match(
    gateway,
    /FINAL_BETA_PHASE4A1_OWN_PROFILE_AUTO_SEED_V1/,
  );

  assert.match(
    gateway,
    /resolveOwnProfileHandle\(\{/,
  );

  assert.match(
    gateway,
    /synchronizeOwnProfileHandle\(\{/,
  );

  assert.match(
    handoff,
    /requestedHandle/,
  );

  assert.match(
    handoff,
    /usernameStatus\s*:\s*ONBOARDING_LOCAL_USERNAME_STATUS/,
  );
});

test('Phase 4 separates owner Profile Studio from public profile truth', async () => {
  const [home, page] =
    await readSources(
      'profileHome',
      'profilePage',
    );

  assert.equal(
    buildPublicProfileRoute('Phase4Owner'),
    'crab://@phase4owner',
  );

  assert.match(
    home,
    /FINAL_BETA_PHASE4A2_PROFILE_STUDIO_PUBLIC_BRIDGE_V1/,
  );

  assert.match(
    home,
    /Profile Studio/,
  );

  assert.match(
    home,
    /View Public Profile/,
  );

  assert.match(
    page,
    /return <ProfilePublicView app=\{app\} route=\{route\} \/>;/,
  );

  assert.match(
    page,
    /return <ProfileWorkspace app=\{app\} route=\{route\} \/>;/,
  );
});

test('Phase 4 preserves honest saved and skipped profile completion', async () => {
  const [
    routeGate,
    completion,
    handoffTest,
  ] = await readSources(
    'onboardingRouteGate',
    'onboardingCompletion',
    'onboardingHomeHandoffTest',
  );

  for (const required of [
    'PROFILE_SKIPPED',
    'PROFILE_SAVED',
    '<OnboardingCompletionStep',
  ]) {
    assert.ok(
      routeGate.includes(required),
      required,
    );
  }

  assert.match(
    completion,
    /local draft/i,
  );

  assert.match(
    completion,
    /Not confirmed/,
  );

  assert.match(
    handoffTest,
    /skipped profile can complete while preserving a non-development local label/,
  );

  assert.match(
    handoffTest,
    /usernameStatus[\s\S]*local_draft/,
  );
});

test('Phase 4 keeps username draft and confirmed status visibly distinct', async () => {
  const [home, summary, completion] =
    await readSources(
      'profileHome',
      'passportSummary',
      'onboardingCompletion',
    );

  assert.match(
    home,
    /usernameTruth\.validation\?\.ok/,
  );

  assert.match(
    home,
    /local profile draft/,
  );

  assert.match(
    summary,
    /view\.handle \|\|/,
  );

  assert.match(
    summary,
    /view\.requestedHandle \? `\$\{view\.requestedHandle\} draft`/,
  );

  assert.match(
    completion,
    /Not confirmed/,
  );
});

test('Phase 4 Passport drawer is consumer-facing with developer facts collapsed', async () => {
  const [drawer, summary] =
    await readSources(
      'passportDrawer',
      'passportSummary',
    );

  assert.match(
    drawer,
    /FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE_V1/,
  );

  assert.match(
    drawer,
    /Device security/,
  );

  assert.match(
    drawer,
    /Recovery and export/,
  );

  assert.match(
    drawer,
    /title="Advanced Passport controls"/,
  );

  assert.match(
    drawer,
    /title="Advanced account pages"/,
  );

  assert.match(
    summary,
    /title="Advanced Passport details"/,
  );

  assert.match(
    summary,
    /data-passport-developer-facts="quarantined"/,
  );
});

test('Phase 4 startup lock is coherent and remains fail-closed', async () => {
  const [startupGate] =
    await readSources('startupGate');

  const cancelled =
    projectStartupPassportPresentation({
      gateState: 'blocked',
      code: 'cancelled',
    });

  const missing =
    projectStartupPassportPresentation({
      gateState: 'blocked',
      code: 'no_passport',
    });

  assert.equal(
    cancelled.accessLabel,
    'Locked',
  );

  assert.equal(
    cancelled.action,
    'retry',
  );

  assert.equal(
    missing.accessLabel,
    'Setup required',
  );

  assert.equal(
    missing.action,
    'reset',
  );

  assert.match(
    startupGate,
    /FINAL_BETA_PHASE4A4_STARTUP_LOCK_CLARITY_V1/,
  );

  assert.match(
    startupGate,
    /title="Advanced startup details"/,
  );

  assert.match(
    startupGate,
    /void runAttempt\(\);/,
  );

  assert.match(
    startupGate,
    /beginSharedStartupUnlockAttempt/,
  );
});

test('Phase 4 React surfaces expose no PIN, recovery, or authority expansion', async () => {
  const sources =
    await readSources(
      'profileGateway',
      'profileHome',
      'profilePage',
      'passportDrawer',
      'passportSummary',
      'onboardingCompletion',
      'startupGate',
    );

  const combined =
    sources.join('\n');

  const executable =
    combined.replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

  assert.doesNotMatch(
    executable,
    /<input[^>]+type=["'](?:password|pin)["']/i,
  );

  assert.doesNotMatch(
    executable,
    /\b(?:recoveryWords|seedPhrase|privateKey|capabilityMaterial)\s*=/,
  );

  assert.doesNotMatch(
    executable,
    /\binvoke\s*\(/,
  );

  assert.doesNotMatch(
    executable,
    /createWalletClient|ledgerClient|followMutation|unfollowMutation/,
  );
});
