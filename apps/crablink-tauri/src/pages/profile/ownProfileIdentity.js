/**
 * RO:WHAT — Pure identity projection for the current user's crab://profile workspace.
 * RO:WHY — FINAL_BETA Phase 4; completed onboarding must seed the owner workspace without manual username reconstruction.
 * RO:INTERACTS — onboardingHomeHandoff settings, ProfileGateway, identityClient normalizeHandle.
 * RO:INVARIANTS — confirmed and local-draft status remain distinct; user-edited input is never overwritten; no backend claim or publication.
 * RO:METRICS — none.
 * RO:CONFIG — handle, username, requestedHandle, requestedUsername.
 * RO:SECURITY — public username hints only; no Passport secret, PIN, recovery material, capability, wallet mutation, or ledger authority.
 * RO:TEST — ownProfileIdentity.test.mjs.
 */

import { normalizeHandle } from '../../shared/api/identityClient.js';

export const FINAL_BETA_PHASE4A1_OWN_PROFILE_IDENTITY_SEED =
  'FINAL_BETA_PHASE4A1_OWN_PROFILE_IDENTITY_SEED_V1';

export const OWN_PROFILE_WORKSPACE_ROUTE = 'crab://profile';

export function resolveOwnProfileHandle({
  usernameTruth = {},
  settings = {},
  draft = {},
} = {}) {
  const candidates = [
    usernameTruth.display,
    usernameTruth.handle,
    settings.handle,
    settings.username,
    settings.requestedHandle,
    settings.requestedUsername,
    draft.handle,
    draft.username,
  ];

  for (const candidate of candidates) {
    const handle = normalizeHandle(candidate);

    if (handle) {
      return handle;
    }
  }

  return '';
}

export function synchronizeOwnProfileHandle({
  currentHandle = '',
  candidateHandle = '',
  manuallyEdited = false,
} = {}) {
  if (manuallyEdited) {
    return String(currentHandle || '');
  }

  const candidate = normalizeHandle(candidateHandle);

  return candidate || String(currentHandle || '');
}

export function buildPublicProfileRoute(handle) {
  const normalizedHandle = normalizeHandle(handle);

  return normalizedHandle
    ? `crab://${normalizedHandle}`
    : '';
}
