import {
  TV_ROUTE_PROBLEM_CODE,
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from './tvRouteRegistry.js';

import { tvRouteLabel } from './tvRouteMetadata.js';

export const TV_ANDROID_INTENT_SOURCE =
  'android-intent';

export const TV_ANDROID_INTENT_MAX_CHARS =
  2048;

export const TV_ANDROID_INTENT_ACTION =
  Object.freeze({
    OPEN: 'open',
    PROBLEM: 'problem',
  });

const CONTROL_CHARACTERS =
  /[\u0000-\u001f\u007f]/;

function safeSectionId(
  value,
  fallback = 'home',
) {
  const candidate =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : '';

  return /^[a-z][a-z0-9-]{0,31}$/.test(
    candidate,
  )
    ? candidate
    : fallback;
}

function sectionFocusKey(
  sectionId,
) {
  return `nav-${safeSectionId(sectionId)}`;
}

function createProblemAction(
  code,
  fallbackSectionId,
) {
  const messages = {
    [TV_ROUTE_PROBLEM_CODE.MALFORMED_CRAB_ROUTE]:
      'The Android link was malformed and was not opened.',
    [TV_ROUTE_PROBLEM_CODE.UNAPPROVED_ROUTE_SCHEME]:
      'Only crab:// links may enter CrabLink TV from Android.',
    [TV_ROUTE_PROBLEM_CODE.UNSUPPORTED_TV_ROUTE]:
      'This crab:// route is not owned by the TV client.',
    [TV_ROUTE_PROBLEM_CODE.UNSUPPORTED_ASSET_KIND]:
      'This crab:// asset type is not supported by CrabLink TV.',
  };

  const safeCode =
    Object.values(
      TV_ROUTE_PROBLEM_CODE,
    ).includes(code)
      ? code
      : TV_ROUTE_PROBLEM_CODE
          .MALFORMED_CRAB_ROUTE;

  return Object.freeze({
    kind:
      TV_ANDROID_INTENT_ACTION.PROBLEM,
    title:
      'CrabLink TV could not open this link',
    body:
      messages[safeCode],
    code:
      safeCode,
    returnFocusKey:
      sectionFocusKey(
        fallbackSectionId,
      ),
  });
}

export function normalizeTvAndroidIntentPayload(
  value,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    value.source !==
      TV_ANDROID_INTENT_SOURCE ||
    typeof value.url !== 'string'
  ) {
    return null;
  }

  const url =
    value.url.trim();

  if (
    !url ||
    url.length >
      TV_ANDROID_INTENT_MAX_CHARS ||
    CONTROL_CHARACTERS.test(url)
  ) {
    return null;
  }

  return Object.freeze({
    url,
    source:
      TV_ANDROID_INTENT_SOURCE,
  });
}

export function reviewTvAndroidIntent(
  payload,
  {
    availableSectionIds = [],
    fallbackSectionId = 'home',
  } = {},
) {
  const fallback =
    safeSectionId(
      fallbackSectionId,
    );

  const input =
    normalizeTvAndroidIntentPayload(
      payload,
    );

  if (!input) {
    return createProblemAction(
      TV_ROUTE_PROBLEM_CODE
        .MALFORMED_CRAB_ROUTE,
      fallback,
    );
  }

  const route =
    resolveTvRouteInput(
      input.url,
      {
        requireCrabScheme: true,
      },
    );

  if (
    route.kind ===
      TV_ROUTE_RESULT_KIND.PROBLEM ||
    route.kind ===
      TV_ROUTE_RESULT_KIND.NOT_FOUND
  ) {
    return createProblemAction(
      route.code,
      fallback,
    );
  }

  const available =
    new Set(
      availableSectionIds.map(
        (sectionId) =>
          safeSectionId(sectionId),
      ),
    );

  if (route.owner === 'section') {
    const hasSurface =
      available.has(
        route.sectionId,
      );

    const targetSectionId =
      hasSurface
        ? route.sectionId
        : fallback;

    return Object.freeze({
      kind:
        TV_ANDROID_INTENT_ACTION.OPEN,
      targetSectionId,
      title:
        `${tvRouteLabel(route.routeKind)} opened`,
      body:
        hasSurface
          ? `${route.normalized} was accepted by CrabLink TV.`
          : `${route.normalized} is valid, but its dedicated TV surface is not available yet.`,
      returnFocusKey:
        sectionFocusKey(
          targetSectionId,
        ),
      normalized:
        route.normalized,
      routeOwner:
        route.owner,
    });
  }

  if (route.owner === 'asset') {
    const targetSectionId =
      available.has('library')
        ? 'library'
        : fallback;

    return Object.freeze({
      kind:
        TV_ANDROID_INTENT_ACTION.OPEN,
      targetSectionId,
      title:
        `${tvRouteLabel(route.assetKind)} route accepted`,
      body:
        `${route.normalized} passed TV route validation. ` +
        'Verified catalog hydration remains a later phase.',
      returnFocusKey:
        sectionFocusKey(
          targetSectionId,
        ),
      normalized:
        route.normalized,
      routeOwner:
        route.owner,
    });
  }

  const targetSectionId =
    available.has('home')
      ? 'home'
      : fallback;

  return Object.freeze({
    kind:
      TV_ANDROID_INTENT_ACTION.OPEN,
    targetSectionId,
    title:
      'Creator route accepted',
    body:
      `${route.normalized} passed TV route validation. ` +
      'Creator catalog hydration remains a later phase.',
    returnFocusKey:
      sectionFocusKey(
        targetSectionId,
      ),
    normalized:
      route.normalized,
    routeOwner:
      route.owner,
  });
}
