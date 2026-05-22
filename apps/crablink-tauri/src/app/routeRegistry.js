/**
 * RO:WHAT — Lazy registry for built-in CrabLink route owners.
 * RO:WHY — App Integration; Concerns: DX/PERF/SEC; keeps one-route-one-page ownership while enabling route-level code splitting.
 * RO:INTERACTS — router.js, App.jsx, and pages/* route-owned React modules.
 * RO:INVARIANTS — every built-in route maps to one owner; no late DOM rescue scripts; no backend truth invented here.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route module map.
 * RO:SECURITY — route registry does not grant capabilities, spend authority, chain authority, or internal-service access.
 * RO:TEST — npm run build; manual route smoke for all built-in crab:// routes.
 */

import { lazy } from 'react';

export const ROUTES = Object.freeze({
  home: lazy(() => import('../pages/home/HomePage.jsx')),
  library: lazy(() => import('../pages/library/LibraryPage.jsx')),
  receipts: lazy(() => import('../pages/receipts/ReceiptsPage.jsx')),
  quickchain: lazy(() => import('../pages/quickchain/QuickchainReadinessPage.jsx')),
  text: lazy(() => import('../pages/text/TextPrimitiveReadinessPage.jsx')),
  site: lazy(() => import('../pages/site/SitePage.jsx')),
  image: lazy(() => import('../pages/image/ImagePage.jsx')),
  profile: lazy(() => import('../pages/profile/ProfilePage.jsx')),
  music: lazy(() => import('../pages/music/MusicPage.jsx')),
  lyrics: lazy(() => import('../pages/lyrics/LyricsPage.jsx')),
  article: lazy(() => import('../pages/article/ArticlePage.jsx')),
  post: lazy(() => import('../pages/post/PostPage.jsx')),
  comment: lazy(() => import('../pages/comment/CommentPage.jsx')),
  video: lazy(() => import('../pages/video/VideoPage.jsx')),
  stream: lazy(() => import('../pages/stream/StreamPage.jsx')),
  podcast: lazy(() => import('../pages/podcast/PodcastPage.jsx')),
  podcasts: lazy(() => import('../pages/podcast/PodcastPage.jsx')),
  chat: lazy(() => import('../pages/chat/ChatPage.jsx')),
  ad: lazy(() => import('../pages/ad/AdPage.jsx')),
  algo: lazy(() => import('../pages/algo/AlgoPage.jsx')),
  code: lazy(() => import('../pages/code/CodePage.jsx')),
  game: lazy(() => import('../pages/game/GamePage.jsx')),
  asset: lazy(() => import('../pages/asset/AssetPage.jsx')),
  notFound: lazy(() => import('../pages/notFound/NotFoundPage.jsx')),
  problem: lazy(() => import('../pages/problem/ProblemPage.jsx')),
});

export const BUILT_IN_ROUTE_KINDS = Object.freeze(Object.keys(ROUTES));

export const CREATOR_ROUTE_KINDS = Object.freeze([
  'site',
  'image',
  'profile',
  'music',
  'lyrics',
  'article',
  'post',
  'comment',
  'video',
  'stream',
  'podcast',
  'podcasts',
  'chat',
  'ad',
  'algo',
  'code',
  'game',
  'chat',
]);

export const LOW_RISK_STUB_ROUTE_KINDS = Object.freeze([
  'lyrics',
  'post',
  'comment',
  'ad',
  'algo',
  'code',
  'game',
]);

export const PROVEN_FLOW_ROUTE_KINDS = Object.freeze([
  'site',
  'image',
  'profile',
  'library',
  'receipts',
  'quickchain',
  'text',
]);

export const PREREQUISITE_ROUTE_KINDS = Object.freeze([
  'text',
  'post',
  'comment',
  'article',
  'library',
  'receipts',
  'quickchain',
]);

export function hasRouteKind(kind) {
  return Object.prototype.hasOwnProperty.call(ROUTES, String(kind || ''));
}

export function routeKindLabel(kind) {
  const value = String(kind || '').trim();

  if (!value) {
    return 'Unknown';
  }

  if (value === 'notFound') {
    return 'Not Found';
  }

  if (value === 'podcasts') {
    return 'Podcasts';
  }

  if (value === 'chat') {
    return 'Chat';
  }

  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}