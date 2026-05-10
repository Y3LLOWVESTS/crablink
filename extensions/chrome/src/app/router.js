/**
 * RO:WHAT — CrabLink route parsing and lazy page selection helpers.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; centralizes route ownership and avoids DOM route collisions.
 * RO:INTERACTS — routeRegistry.js, appState.js, Shell address bar, protected asset/site/image/profile routes.
 * RO:INVARIANTS — parse only; backend validation remains canonical; typed b3 assets route to the asset hydrator; no fake route/backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route registry.
 * RO:SECURITY — does not grant capabilities or spend authority; only selects UI owner.
 * RO:TEST — manual smoke for crab://site, image, profile, music, post, comment, video, stream, podcast, ad, algo, code, game, and crab://<hash>.<kind>.
 */

import { hasRouteKind, ROUTES } from './routeRegistry.js';

const CRAB_PREFIX = 'crab://';
const B3_RE = /^b3:([0-9a-fA-F]{64})$/;
const RAW_HASH_RE = /^[0-9a-fA-F]{64}$/;
const TYPED_ASSET_RE = /^([0-9a-fA-F]{64})\.([a-z][a-z0-9_-]{0,31})$/;
const PROFILE_HANDLE_RE = /^@[a-z0-9][a-z0-9_.-]{2,31}$/i;
const PROFILE_PAGE_RE = /^[a-z0-9][a-z0-9_.-]{2,31}\.profile$/i;

export function getRouteComponent(kind) {
  return ROUTES[kind] || ROUTES.notFound;
}

export function parseRouteInput(input) {
  const rawInput = String(input || '').trim();

  if (!rawInput || rawInput === CRAB_PREFIX || rawInput === 'crab://home') {
    return makeRoute({
      kind: 'home',
      rawInput,
      normalizedInput: 'crab://home',
      title: 'Home',
    });
  }

  if (RAW_HASH_RE.test(rawInput)) {
    const hash = rawInput.toLowerCase();

    return makeRoute({
      kind: 'asset',
      rawInput,
      normalizedInput: `crab://${hash}.image`,
      title: 'Image Asset',
      params: {
        hash,
        assetKind: 'image',
        cid: `b3:${hash}`,
        assetUrl: `crab://${hash}.image`,
      },
    });
  }

  const b3Match = rawInput.match(B3_RE);
  if (b3Match) {
    const hash = b3Match[1].toLowerCase();

    return makeRoute({
      kind: 'asset',
      rawInput,
      normalizedInput: `crab://${hash}.image`,
      title: 'Image Asset',
      params: {
        hash,
        assetKind: 'image',
        cid: `b3:${hash}`,
        assetUrl: `crab://${hash}.image`,
      },
    });
  }

  if (!rawInput.startsWith(CRAB_PREFIX)) {
    return makeRoute({
      kind: hasRouteKind(rawInput) ? rawInput : 'notFound',
      rawInput,
      normalizedInput: hasRouteKind(rawInput) ? `crab://${rawInput}` : rawInput,
      title: hasRouteKind(rawInput) ? titleForKind(rawInput) : 'Not Found',
      error: hasRouteKind(rawInput)
        ? null
        : 'Route must be a crab:// URL, b3 CID, raw 64-hex hash, or built-in route.',
    });
  }

  const body = rawInput.slice(CRAB_PREFIX.length).trim();

  if (!body) {
    return makeRoute({
      kind: 'home',
      rawInput,
      normalizedInput: 'crab://home',
      title: 'Home',
    });
  }

  const noQuery = body.split(/[?#]/)[0];
  const firstSegment = noQuery.split(/[/.]/)[0];

  if (hasRouteKind(noQuery)) {
    return makeRoute({
      kind: noQuery,
      rawInput,
      normalizedInput: `crab://${noQuery}`,
      title: titleForKind(noQuery),
    });
  }

  if (hasRouteKind(firstSegment)) {
    return makeRoute({
      kind: firstSegment,
      rawInput,
      normalizedInput: `crab://${body}`,
      title: titleForKind(firstSegment),
      params: {
        path: noQuery.slice(firstSegment.length).replace(/^[/.]/, ''),
      },
    });
  }

  if (PROFILE_HANDLE_RE.test(noQuery) || PROFILE_PAGE_RE.test(noQuery)) {
    return makeRoute({
      kind: 'profile',
      rawInput,
      normalizedInput: `crab://${noQuery}`,
      title: 'Profile',
      params: {
        handle: noQuery.replace(/\.profile$/i, ''),
      },
    });
  }

  const typedAssetMatch = noQuery.match(TYPED_ASSET_RE);
  if (typedAssetMatch) {
    const hash = typedAssetMatch[1].toLowerCase();
    const assetKind = typedAssetMatch[2].toLowerCase();

    return makeRoute({
      kind: 'asset',
      rawInput,
      normalizedInput: `crab://${hash}.${assetKind}`,
      title: `${titleForKind(assetKind)} Asset`,
      params: {
        hash,
        assetKind,
        cid: `b3:${hash}`,
        assetUrl: `crab://${hash}.${assetKind}`,
        typedRouteOwner: hasRouteKind(assetKind) ? assetKind : '',
      },
    });
  }

  return makeRoute({
    kind: 'site',
    rawInput,
    normalizedInput: `crab://${body}`,
    title: 'Site',
    params: {
      siteName: body,
    },
  });
}

function makeRoute({
  kind,
  rawInput,
  normalizedInput,
  title,
  params = {},
  error = null,
}) {
  return Object.freeze({
    kind,
    rawInput,
    normalizedInput,
    title,
    params: Object.freeze(params),
    error,
    parsedAt: new Date().toISOString(),
  });
}

function titleForKind(kind) {
  return String(kind || 'page')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}