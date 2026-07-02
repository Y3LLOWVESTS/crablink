#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Stabilization paid denial render-lock scanner for CrabLink Tauri.
 * RO:WHY — Product beta readiness requires protected site/content payloads to stay unfetched/unrendered until backend receipt/access proof allows render.
 * RO:INTERACTS — SiteRender, SiteVisitAccess, AssetHydratedView, AssetContentViewAccess, package scripts, check-tauri.sh.
 * RO:INVARIANTS — paid denial keeps protected payload empty; backend-pending/developer mode cannot render paid sites; cache/display history cannot unlock.
 * RO:SECURITY — rejects dev-mode paid bypass, backend-pending render, cache-only unlock, fake receipt/balance/finality, silent spend, bridge/staking/liquidity/ROX/Solana/external settlement creep.
 * RO:TEST — node scripts/check-internal-roc-stabilization-render-lock.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_RENDER_LOCK.md',
  siteRender: 'apps/crablink-tauri/src/pages/site/SiteRender.jsx',
  siteVisitAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  siteResolvedProof: 'apps/crablink-tauri/src/pages/site/SiteResolvedProof.jsx',
  siteRenderModel: 'apps/crablink-tauri/src/pages/site/siteRenderModel.js',
  assetHydratedView: 'apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx',
  assetContentViewAccess: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  preflight: 'scripts/dev-internal-roc-stabilization-render-lock-preflight.sh',
  codebundle: 'scripts/make_codebundle.sh',
};

const failures = [];
const text = Object.fromEntries(
  Object.entries(files).map(([key, rel]) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      failures.push(`missing render-lock file: ${rel}`);
      return [key, ''];
    }
    return [key, fs.readFileSync(abs, 'utf8')];
  }),
);

need(files.doc, text.doc, [
  'Internal ROC Stabilization — Paid Denial Render-Lock Boundary',
  'protected root/body/media bytes fetch only after backend proof',
  'backend-pending route → no developer bypass render',
]);

need(files.siteRender, text.siteRender, [
  'root_locked_until_paid_access',
  'fetchRootDocumentAfterAccess',
  'canRenderPreview',
  'has not fetched or rendered the protected site root document',
  "rootFetchGate={canRenderPreview ? 'backend_access_allowed' : 'locked_until_paid_access'}",
  'SiteResolvedProof',
]);

reject(files.siteRender, text.siteRender, [
  'await siteClient.fetchRootDocument(result.summary.rootDocumentCid)',
  'CrabLink has the site bytes',
  'developer mode may preview',
  'developerMode || app?.state?.developerMode',
]);

need(files.siteVisitAccess, text.siteVisitAccess, [
  'backend_pending_locked',
  'canRender: false',
  'Boolean(access.backendProof)',
  "access.status === 'paid'",
  'Backend route pending — locked',
  'no root document was fetched or rendered',
]);

need(files.siteResolvedProof, text.siteResolvedProof, [
  'rootFetchGate',
  'root_fetch_gate: rootFetchGate',
  'Root gate',
  "disabled={!rootUrl || rootFetchGate !== 'backend_access_allowed'}",
]);

need(files.siteRenderModel, text.siteRenderModel, [
  "status === 'root_locked_until_paid_access'",
  "status === 'loading_after_backend_access'",
  'root locked until paid access',
  'fetching root after backend access',
]);

reject(files.siteVisitAccess, text.siteVisitAccess, [
  'canUseBackendPendingPreview',
  'devPreviewAllowed',
  'canRender: backendPending',
  "return access.status === 'backend_pending'",
  'Developer mode may preview the page',
]);

need(files.assetHydratedView, text.assetHydratedView, [
  'canReadTextContent',
  'canPreviewImage',
  'canPreviewVideo',
  'contentViewAccess.canView',
  'Hidden until paid content_view receipt',
  'image_preview_locked',
  'video_preview_locked',
]);

need(files.assetContentViewAccess, text.assetContentViewAccess, [
  'ensureBackendPaymentProof',
  'payment_missing_backend_receipt',
  'canView: false',
  'canView: true',
  'backendProof',
]);

need(files.appPkg, text.appPkg, [
  'check:internal-roc-stabilization-render-lock',
  'check-internal-roc-stabilization-render-lock.mjs',
  'park:internal-roc-stabilization-render-lock',
]);

need(files.checkTauri, text.checkTauri, [
  'npm run check:internal-roc-stabilization-render-lock',
]);

need(files.preflight, text.preflight, [
  'check:internal-roc-stabilization-render-lock',
  'Internal ROC Stabilization paid denial render-lock preflight passed',
]);

need(files.codebundle, text.codebundle, [
  'check-internal-roc-stabilization-render-lock.mjs',
  'dev-internal-roc-stabilization-render-lock-preflight.sh',
]);

for (const [rel, body] of [
  [files.siteRender, text.siteRender],
  [files.siteVisitAccess, text.siteVisitAccess],
  [files.assetHydratedView, text.assetHydratedView],
]) {
  const compact = body.toLowerCase().replace(/[^a-z0-9_]+/g, '');

  for (const marker of [
    'backendpendingrendertrue',
    'developerpaidbypass',
    'devmodepaidbypass',
    'cacheonlyunlocktrue',
    'unlockfromcache',
    'receiptcacheunlock',
    'fakebackendreceipt',
    'fakewalletbalance',
    'silentspendtrue',
    'protectedcontentfromcache',
  ]) {
    if (compact.includes(marker)) {
      failures.push(`${rel} contains forbidden render-lock authority marker: ${marker}`);
    }
  }

  if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Render|Unlock|Access|Receipt|Balance|Wallet|Ledger|Spend)/.test(body)) {
    failures.push(`${rel} couples render-lock UX to forbidden external runtime vocabulary`);
  }
}

function need(rel, body, snippets) {
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      failures.push(`${rel} must include: ${snippet}`);
    }
  }
}

function reject(rel, body, snippets) {
  for (const snippet of snippets) {
    if (body.includes(snippet)) {
      failures.push(`${rel} must not include: ${snippet}`);
    }
  }
}

if (failures.length) {
  console.error('Internal ROC Stabilization paid denial render-lock check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('Internal ROC Stabilization paid denial render-lock check passed.');
console.log('Protected site root fetch is deferred until backend access proof; backend-pending/developer bypass render remains locked; paid asset byte fetch gates remain intact.');
