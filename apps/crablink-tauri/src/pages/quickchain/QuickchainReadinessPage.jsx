/**
 * RO:WHAT — CrabLink QuickChain readiness dashboard.
 * RO:WHY — Shows Phase 4 Round 2 bond dispute/challenge simulation readiness without letting CrabLink become validator, bond, dispute, challenge-window, appeal, freeze, slash, staking, liquidity, passport registry, capability, validator-set, quorum, finality, settlement, wallet, ledger, bridge, or paid-unlock authority.
 * RO:INTERACTS — localCatalog, recentReceipts, app navigation, NEXT_LEVEL/QUICKCHAIN product milestones.
 * RO:INVARIANTS — display-only; no chain logic; no verifier/committee/attestation/validator/bond/dispute/challenge/appeal/freeze/slash/stake/liquidity authority; no passport registry authority; no validator capability or validator-set authority; no quorum/finality/settlement; no validator/passport/bond/dispute paid unlock; no fake receipts/balances.
 * RO:METRICS — none.
 * RO:CONFIG — reads local CrabLink proof caches only.
 * RO:SECURITY — explicitly blocks accidental QuickChain/bridge/validator claims in CrabLink UI.
 * RO:TEST — crab://quickchain after paid site_visit/image/site/profile/text/library activity.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import {
  readLocalCatalog,
  subscribeLocalCatalog,
} from '../../shared/catalog/localCatalog.js';
import {
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import './quickchain.css';

const EMPTY_CATALOG = Object.freeze({
  schema: 'crablink.local-catalog.v1',
  generatedAt: '',
  profiles: [],
  sites: [],
  assets: [],
  all: [],
});

const LEGACY_READINESS_BOUNDARY_PHRASES = Object.freeze([
  'display-only',
  'no chain logic',
  'no ROX/Solana',
  'no wallet mutation',
  'no fake replay/accounting/reward proofs',
]);

const TEXT_KINDS = Object.freeze(['post', 'comment', 'article']);

const TEXT_ROUTE_CONTRACTS = Object.freeze([
  {
    kind: 'post',
    prepareRoute: '/assets/post/prepare',
    publishRoute: '/assets/post',
    testCommand: 'cargo test -p omnigate --test text_asset_publish',
  },
  {
    kind: 'comment',
    prepareRoute: '/assets/comment/prepare',
    publishRoute: '/assets/comment',
    testCommand: 'cargo test -p omnigate --test comment_asset_publish',
  },
  {
    kind: 'article',
    prepareRoute: '/assets/article/prepare',
    publishRoute: '/assets/article',
    testCommand: 'cargo test -p omnigate --test article_asset_publish',
  },
]);

const PHASE2_REPLAY_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase2-replay-boundary.v1',
  label: 'Phase 2 Round 1: read-only verifier artifact replication',
  status: 'display-only',
  summary:
    'CrabLink may display backend-derived replay/verifier artifact status, but it is not verifier truth, quorum, fork-choice, finality, settlement, or paid unlock authority.',
  allowed: Object.freeze([
    'read-only replay/verifier display only',
    'display backend-derived replay/verifier labels',
    'show diagnostic readiness context',
    'keep receipts and catalog entries display-only',
    'keep paid unlock tied to backend wallet/ledger receipts',
  ]),
  forbidden: Object.freeze([
    'client proof verification as authority',
    'client replay execution as authority',
    'committee or quorum claims',
    'fork-choice or finality claims',
    'settlement or bridge claims',
    'paid unlock from replay/proof artifacts',
  ]),
});

const PHASE2_COMMITTEE_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase2-committee-boundary.v1',
  label: 'Phase 2 Round 2: small committee agreement/readiness',
  status: 'display-only',
  completionLabel: 'small committee replicated verification complete',
  summary:
    'CrabLink may display backend-derived small committee readiness, attestation status, quorum-readiness, and disagreement labels, but they are not attestation truth, committee truth, quorum truth, fork-choice truth, finality truth, settlement truth, or paid unlock authority.',
  allowed: Object.freeze([
    'display-only committee readiness',
    'display backend-derived attestation status labels',
    'display backend-derived quorum-readiness labels',
    'display backend-derived disagreement/error taxonomy labels',
    'keep receipts and catalog entries display-only',
    'keep paid unlock tied to backend wallet/ledger receipts',
  ]),
  forbidden: Object.freeze([
    'no client attestation signing',
    'no client attestation verification as authority',
    'no client committee authority',
    'no client quorum/finality/settlement claims',
    'no anti-double-attestation adjudication in CrabLink',
    'no paid unlock from committee/attestation artifacts',
  ]),
});

const PHASE3_VALIDATOR_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase3-validator-boundary.v1',
  label: 'Phase 3 Round 1: passport-gated validator identity/registry boundary',
  status: 'display-only',
  completionLabel: 'passport-gated validator identity/registry boundary foundation',
  summary:
    'CrabLink may display backend-derived validator/readiness status, passport-required labels, registry-checked labels, governance-review labels, revoked/expired labels, and validator-readiness-display labels, but they are not validator truth, passport registry truth, validator capability truth, validator-set truth, finality truth, settlement truth, or paid unlock authority.',
  allowed: Object.freeze([
    'validator-readiness-display',
    'backend-derived validator/readiness status',
    'display backend-derived passport-required labels',
    'display backend-derived registry-checked labels',
    'display backend-derived governance-review labels',
    'display backend-derived revoked/expired validator labels',
    'keep receipts and catalog entries display-only',
    'keep paid unlock tied to backend wallet/ledger receipts',
  ]),
  forbidden: Object.freeze([
    'no client-side validator authority',
    'no passport registry authority',
    'no validator capability authority',
    'no validator-set authority',
    'no client-side validator admission/revocation/rotation',
    'no paid unlock from validator passport/registry/set status',
    'no staking/slashing/bonding',
  ]),
});

const PHASE3_LIFECYCLE_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase3-lifecycle-boundary.v1',
  label: 'Phase 3 Round 2: validator operation / lifecycle hardening',
  status: 'display-only',
  completionLabel: 'passport-gated validator set complete',
  summary:
    'CrabLink may display backend-derived validator lifecycle/readiness context, governance review display, replay challenge display, downtime display, degraded display, revoked display, expired display, and evidence status display, but this is client-boundary lifecycle display only and not validator lifecycle truth, governance truth, replay challenge truth, finality truth, settlement truth, wallet truth, ledger truth, or paid unlock authority.',
  allowed: Object.freeze([
    'validator readiness display',
    'lifecycle status display',
    'governance review display',
    'replay challenge display',
    'downtime display',
    'degraded display',
    'backend-derived validator/passport/lifecycle/readiness context',
    'keep receipts and catalog entries display-only',
    'keep paid unlock tied to backend wallet/ledger receipts',
  ]),
  forbidden: Object.freeze([
    'no client-side validator lifecycle authority',
    'no validator rotation/revocation/downtime authority',
    'no equivocation evidence authority',
    'no replay challenge authority',
    'no governance parameter-update authority',
    'no lifecycle/finality/settlement paid unlock',
    'no staking/slashing/bonding/validator rewards',
  ]),


});

const PHASE4_BOND_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase4-bond-boundary.v1',
  label: 'Phase 4 Round 1: bond DTOs and no-op accounting model',
  status: 'display-only',
  completionLabel: 'bond DTOs and no-op accounting model complete',
  summary:
    'CrabLink may display backend-derived bond status display, slash evidence display, no-op accounting display, bond review display, and higher-stakes validator risk labels, but this is client-boundary bond display only and not bond truth, slash truth, slashing authority, staking market authority, liquidity authority, wallet truth, ledger truth, finality truth, settlement truth, payment truth, paid entitlement truth, bridge truth, or external settlement truth.',
  allowed: Object.freeze([
    'bond status display',
    'slash evidence display',
    'no-op accounting display',
    'bond review display',
    'backend-derived validator bond/readiness context',
    'keep receipts and catalog entries display-only',
    'accepted wallet/ledger receipts remain the only paid unlock authority',
  ]),
  forbidden: Object.freeze([
    'no client-side bond truth',
    'no client-side slash truth',
    'no client-side slashing authority',
    'no staking market authority',
    'no liquidity authority',
    'no automatic slashing live',
    'no public staking market',
    'no bond/slash/stake/liquidity paid unlock',
  ]),
});

const PHASE4_BOND_DISPUTE_BOUNDARY = Object.freeze({
  schema: 'crablink.quickchain-phase4-bond-dispute-boundary.v1',
  label: 'Phase 4 Round 2: bond dispute / challenge simulation boundary',
  status: 'display-only',
  completionLabel: 'bond dispute and challenge simulation boundary complete',
  summary:
    'CrabLink may display backend-derived dispute/challenge/appeal/freeze status, slash evidence validation display, challenge-window display, disputed-bond lifecycle display, and simulation-risk labels, but this is client-boundary dispute readiness only and not dispute truth, challenge-window truth, slash evidence validation truth, appeal authority, freeze authority, irreversible slash authority, slash simulation authority, staking market authority, liquidity authority, wallet truth, ledger truth, finality truth, settlement truth, payment truth, paid entitlement truth, bridge truth, or external settlement truth.',
  allowed: Object.freeze([
    'display-only dispute/challenge readiness',
    'backend-derived dispute/challenge/appeal/freeze status',
    'dispute status display',
    'challenge-window display',
    'slash evidence validation display',
    'appeal state display',
    'freeze state display',
    'disputed-bond lifecycle display',
    'replayable dispute state display',
    'keep receipts and catalog entries display-only',
    'accepted wallet/ledger receipts remain the only paid unlock authority',
  ]),
  forbidden: Object.freeze([
    'no client-side dispute truth',
    'no client-side challenge-window truth',
    'no client-side appeal authority',
    'no client-side freeze authority',
    'no client-side slash evidence validation authority',
    'no irreversible slash authority',
    'no client-side slash simulation authority',
    'no paid unlock from dispute, challenge, appeal, freeze, bond, slash, or cache status',
    'no live irreversible slash',
    'no one-step irreversible slash',
    'no staking/slashing/bonding public runtime',
  ]),
});

const MILESTONES = Object.freeze([
  {
    id: 'internal_roc_closed_loop',
    label: 'Internal ROC closed loop',
    status: 'proven',
    phase: 'WEB3 / NEXT_LEVEL',
    summary: 'svc-wallet/ron-ledger-backed ROC operations are active in the local proof stack.',
    next: 'Keep all mutations routed through svc-wallet and keep CrabLink display-only.',
  },
  {
    id: 'paid_storage_image_site',
    label: 'Paid storage, image, and site flows',
    status: 'proven',
    phase: 'WEB3_2 / NEXT_LEVEL',
    summary: 'Paid image upload, named site create/open, typed b3 asset pages, and site render are proven.',
    next: 'Preserve these as protected flows while extending text/content view proofs.',
  },
  {
    id: 'site_visit_value_loop',
    label: 'Visitor B → Creator A site_visit',
    status: 'proven',
    phase: 'NEXT_LEVEL',
    summary: 'Paid named-site visit to crab://ron7 transfers 10 ROC from visitor to creator and returns receipt proof.',
    next: 'Keep the smoke reproducible and display backend txid/receipt_hash/ledger_root clearly.',
  },
  {
    id: 'crablink_receipts_library',
    label: 'CrabLink receipt and library UX',
    status: 'proven',
    phase: 'CrabLink',
    summary: 'Profiles, sites, assets, and site_visit receipts are visible in browser-local display caches.',
    next: 'Treat caches as display-only; never as authorization, wallet, or ownership truth.',
  },
  {
    id: 'post_comment_article_backend',
    label: 'Paid post/comment/article publish routes',
    status: 'partial',
    phase: 'NEXT_LEVEL text primitives',
    summary: 'Current bundles include post, comment, and article route contracts; QuickChain still needs live local proof and repeatable product smokes.',
    next: 'Run backend tests, publish/open all three typed text URLs, then add repeatable smoke coverage.',
  },
  {
    id: 'paid_content_views',
    label: 'Paid content view route shape',
    status: 'missing',
    phase: 'NEXT_LEVEL phase 17',
    summary: 'site_visit is proven; generalized paid views for assets/content are not yet proven.',
    next: 'Define prepare/pay view routes after post/comment/article publish/resolve are stable in smokes.',
  },
  {
    id: 'ledger_replay_roots',
    label: 'Ledger replay and root proof gates',
    status: 'missing',
    phase: 'QuickChain preflight',
    summary: 'Receipts return ledger roots, but QuickChain requires deterministic replay/state-root proof tests.',
    next: 'Add RustyOnions tests proving the same receipts replay to the same balances and roots.',
  },
  {
    id: 'accounting_snapshots',
    label: 'Accounting sealed snapshots',
    status: 'missing',
    phase: 'QuickChain preflight',
    summary: 'ron-accounting must produce qualified usage snapshots for site_visit/view/serve/storage events.',
    next: 'Emit and seal snapshots before rewarder planning enters the loop.',
  },
  {
    id: 'rewarder_payout_plans',
    label: 'Rewarder deterministic payout planning',
    status: 'missing',
    phase: 'QuickChain preflight',
    summary: 'svc-rewarder must compute deterministic plans from accounting and policy without mutating ledger directly.',
    next: 'Rewarder creates payout manifests; svc-wallet commits payout receipts.',
  },
  {
    id: 'quickchain_phase2_replay_display_boundary',
    label: 'QuickChain Phase 2 Round 1: read-only replay/verifier display',
    status: 'proven',
    phase: 'QuickChain Phase 2 Round 1',
    summary: 'Client boundary installed: CrabLink may show backend-derived replay/verifier status only.',
    next: 'Keep replay/verifier artifact views read-only; no client proofs, quorum, fork-choice, finality, settlement, or paid unlock.',
  },
  {
    id: 'quickchain_phase2_committee_readiness_display_boundary',
    label: 'QuickChain Phase 2 Round 2: small committee agreement/readiness',
    status: 'proven',
    phase: 'QuickChain Phase 2 Round 2',
    summary: 'Client boundary installed: CrabLink may show backend-derived committee, attestation, quorum-readiness, and disagreement labels only as display-only committee readiness.',
    next: 'Phase 2 complete / small committee replicated verification complete when park gates pass; no client attestation signing, quorum/finality/settlement, staking, slashing, bridge, or external settlement.',
  },
  {
    id: 'quickchain_phase3_validator_readiness_display_boundary',
    label: 'QuickChain Phase 3 Round 1: passport-gated validator readiness',
    status: 'proven',
    phase: 'QuickChain Phase 3 Round 1',
    summary: 'Client boundary installed: CrabLink may show backend-derived validator/readiness status only as validator-readiness-display.',
    next: 'QuickChain Phase 3 Round 1 complete only when CrabLink remains display/user-intent only; no client-side validator authority, passport registry authority, validator capability authority, validator-set authority, staking/slashing/bonding, bridge, or external settlement.',
  },
  {
    id: 'quickchain_phase3_lifecycle_display_boundary',
    label: 'QuickChain Phase 3 Round 2: validator lifecycle display',
    status: 'proven',
    phase: 'QuickChain Phase 3 Round 2',
    summary: 'Client boundary installed: CrabLink may show backend-derived validator lifecycle/readiness context only as client-boundary lifecycle display only.',
    next: 'QuickChain Phase 3 complete / passport-gated validator set complete only after CrabLink remains display/user-intent only; no validator lifecycle, replay challenge, governance parameter-update, finality, settlement, paid-unlock, staking/slashing/bonding, bridge, ROX/Solana, or external settlement authority.',
  },
  {
    id: 'quickchain_phase4_bond_display_boundary',
    label: 'QuickChain Phase 4 Round 1: bond/no-op accounting display',
    status: 'proven',
    phase: 'QuickChain Phase 4 Round 1',
    summary: 'Client boundary installed: CrabLink may show backend-derived bond/no-op accounting context only as client-boundary bond display only.',
    next: 'QuickChain Phase 4 Round 1 complete / bond DTOs and no-op accounting model complete only after CrabLink remains display/user-intent only; no client-side bond truth, slash truth, slashing authority, staking market authority, liquidity authority, paid-unlock authority, bridge, ROX/Solana, or external settlement.',
  },
  {
    id: 'quickchain_phase4_bond_dispute_display_boundary',
    label: 'QuickChain Phase 4 Round 2: bond dispute/challenge display',
    status: 'proven',
    phase: 'QuickChain Phase 4 Round 2',
    summary: 'Client boundary installed: CrabLink may show backend-derived dispute/challenge/appeal/freeze context only as client-boundary dispute readiness only.',
    next: 'QuickChain Phase 4 Round 2 complete / bond dispute and challenge simulation boundary complete only after CrabLink remains display/user-intent only; no client-side dispute truth, challenge-window truth, appeal authority, freeze authority, irreversible slash authority, slash simulation authority, paid-unlock authority, bridge, ROX/Solana, or external settlement.',
  },
  {
    id: 'quickchain_phase_1',
    label: 'QuickChain Phase 1: deterministic roots/proofs',
    status: 'proven',
    phase: 'QuickChain Phase 1',
    summary: 'Phase 1 backend artifacts are treated as backend-derived proof material; CrabLink only displays their readiness context.',
    next: 'Use Phase 2 Round 1 for read-only replicated verification display; do not add client verifier authority.',
  },
]);

export default function QuickchainReadinessPage({ app }) {
  const [catalog, setCatalog] = useState(() => safeReadCatalog());
  const [receipts, setReceipts] = useState(() => safeReadReceipts());

  useEffect(() => subscribeLocalCatalog(setCatalog), []);
  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const proof = useMemo(
    () =>
      buildReadinessProof({
        catalog,
        receipts,
      }),
    [catalog, receipts],
  );

  const progress = useMemo(() => calculateProgress(MILESTONES, proof), [proof]);
  const nextBackendBatch =
    'RustyOnions backend: Phase 4 Round 2 slashing/challenge simulation is parked before CrabLink only as backend-derived dispute/challenge/appeal/freeze readiness context; no live irreversible slash, no one-step irreversible slash, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, and no external settlement.';
  const nextCrabLinkBatch =
    'CrabLink: display backend-derived replay/verifier/committee/attestation/validator/passport-registry/lifecycle/governance/challenge/bond/dispute/appeal/freeze/slash readiness only; never use those labels for paid unlock, balances, receipts, dispute truth, challenge-window truth, appeal authority, freeze authority, slash truth, staking market authority, liquidity authority, validator lifecycle truth, validator-set truth, quorum, finality, settlement, or governance authority.';

  return (
    <section className="cl-page quickchain-page">
      <PageHeader
        eyebrow="QuickChain readiness"
        title="Do not start the chain until the economy proves itself"
        copy="QuickChain Phase 4 Round 2 is bond dispute / challenge simulation. This dashboard may display backend-derived replay/verifier/committee/attestation/validator/passport-registry/lifecycle/governance/replay challenge/bond/dispute/appeal/freeze/slash readiness status, but CrabLink must not become dispute truth, challenge-window truth, appeal authority, freeze authority, slash truth, irreversible slash authority, staking market authority, liquidity authority, validator lifecycle truth, passport registry truth, validator capability truth, validator-set truth, governance truth, replay challenge truth, quorum truth, fork-choice truth, finality truth, settlement truth, wallet truth, ledger truth, or paid-unlock authority."
        meta={
          <>
            <Badge tone="warning">future blueprint</Badge>
            <Badge tone="success">receipt-first doctrine</Badge>
            <Badge tone="neutral">no chain logic in CrabLink</Badge>
            <Badge tone="neutral">Phase 4 R2 dispute display-only</Badge>
          </>
        }
        actions={
          <div className="quickchain-header-actions">
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://library')}>
              Open Library
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://text')}>
              Open Text
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://home')}>
              Open Home
            </Button>
          </div>
        }
      />

      <section className="quickchain-progress-grid" aria-label="QuickChain readiness progress">
        <ProgressCard
          label="QC-0A preflight readiness"
          value={`${progress.percent}%`}
          detail={`${progress.proven} proven · ${progress.partial} partial · ${progress.missing} missing · ${progress.locked} locked`}
          tone={progress.percent >= 70 ? 'success' : progress.percent >= 40 ? 'warning' : 'neutral'}
        />

        <ProgressCard
          label="Local proof memory"
          value={String(proof.totalCatalog)}
          detail={`${proof.profileCount} profile · ${proof.siteCount} site · ${proof.assetCount} assets · ${proof.receiptCount} receipts`}
          tone={proof.totalCatalog > 0 ? 'success' : 'neutral'}
        />

        <ProgressCard
          label="site_visit receipts"
          value={String(proof.siteVisitReceipts.length)}
          detail={proof.latestReceiptProof || 'No site_visit receipt visible in local cache'}
          tone={proof.siteVisitReceipts.length > 0 ? 'success' : 'warning'}
        />

        <ProgressCard
          label="Text primitive proof"
          value={`${proof.textKindsReady}/3`}
          detail={`${proof.textCounts.post} post · ${proof.textCounts.comment} comment · ${proof.textCounts.article} article`}
          tone={proof.textKindsReady === 3 ? 'success' : proof.textKindsReady > 0 ? 'warning' : 'neutral'}
        />

        <ProgressCard
          label="QuickChain Phase 2 R1"
          value="READ-ONLY"
          detail="Verifier/replay artifact status may be displayed, never trusted as quorum, finality, settlement, or paid unlock"
          tone="neutral"
        />

        <ProgressCard
          label="QuickChain Phase 3 R1"
          value="DISPLAY"
          detail="Validator/passport-registry readiness may be displayed only as backend-derived status, never trusted as validator-set, capability, finality, settlement, or paid unlock"
          tone="neutral"
        />

        <ProgressCard
          label="QuickChain Phase 3 R2"
          value="LIFECYCLE DISPLAY"
          detail="Lifecycle/governance/challenge labels may be displayed only as backend-derived context, never trusted as lifecycle, finality, settlement, or paid unlock"
          tone="neutral"
        />

        <ProgressCard
          label="QuickChain Phase 4 R1"
          value="BOND DISPLAY"
          detail="Bond/slash/no-op accounting labels may be displayed only as backend-derived context, never trusted as bond truth, slash truth, staking market authority, liquidity authority, settlement, or paid unlock"
          tone="neutral"
        />

        <ProgressCard
          label="QuickChain Phase 4 R2"
          value="DISPUTE DISPLAY"
          detail="Dispute/challenge/appeal/freeze labels may be displayed only as backend-derived context, never trusted as dispute truth, challenge-window truth, irreversible slash authority, settlement, or paid unlock"
          tone="neutral"
        />
      </section>

      <TruthBoundary
        tone="warning"
        title="Phase 3 validator/passport status is display-only"
        copy="This page displays Phase 3 Round 1 readiness only. It does not admit validators, revoke validators, rotate validators, issue validator capabilities, own the validator set, sign attestations, claim quorum, claim finality, settle ROC, unlock paid content, bridge, anchor, stake, slash, bond, or create ROX/Solana transactions."
      />

      <TruthBoundary
        tone="warning"
        title="Phase 3 lifecycle status is display-only"
        copy="This page displays Phase 3 Round 2 lifecycle readiness only. It does not grant validator lifecycle authority, commit validator rotation, commit validator revocation, mark validator downtime, accept equivocation evidence, accept replay challenge, commit governance parameter updates, settle from replay challenge, unlock from validator lifecycle, or create staking, slashing, bonding, bridge, ROX/Solana, or external settlement runtime."
      />

      <TruthBoundary
        tone="warning"
        title="Phase 4 bond status is display-only"
        copy="This page displays Phase 4 Round 1 bond/no-op accounting readiness only. It does not open validator bonds, close validator bonds, lock validator bonds, unlock validator bonds, capture validator bonds, release validator bonds, slash validators, execute slashing, commit slash decisions, create staking markets, create liquidity pools, settle bonds, unlock paid content from bond status, or create bridge, ROX/Solana, public staking, liquidity, exchange-facing, or external settlement runtime."
      />

      <TruthBoundary
        tone="warning"
        title="Phase 4 dispute/challenge status is display-only"
        copy="This page displays Phase 4 Round 2 bond dispute/challenge simulation readiness only. It does not open bond disputes, validate slash evidence as authority, adjudicate disputes, open challenge windows, commit appeal decisions, freeze validator bonds, unfreeze validator bonds, execute irreversible slashing, settle disputed bonds, unlock paid content from dispute/challenge/appeal/freeze status, or create bridge, ROX/Solana, public staking, liquidity, exchange-facing, or external settlement runtime."
      />

      <TruthBoundary
        tone="warning"
        title="Phase 2 replay/verifier status is display-only"
        copy="This page displays Phase 2 Round 1 readiness only. It does not verify proofs, execute replay as authority, create validators, form committees or quorum, choose forks, claim finality, settle ROC, unlock paid content, bridge, anchor, stake, slash, or create ROX/Solana transactions."
      />

      <section className="quickchain-next-grid" aria-label="Recommended next work">
        <Card eyebrow="Next backend batch" title="Text smokes, then paid content views">
          <p>{nextBackendBatch}</p>
          <ul className="quickchain-mini-list">
            <li>Run Omnigate post/comment/article tests.</li>
            <li>Run svc-gateway product proxy tests.</li>
            <li>Add a repeatable prepare → hold → publish → resolve smoke for text assets.</li>
            <li>Only after that, design paid content view quote/pay routes.</li>
          </ul>
        </Card>

        <Card eyebrow="Next CrabLink rule" title="Show proof, not promises">
          <p>{nextCrabLinkBatch}</p>
          <ul className="quickchain-mini-list">
            <li>Local workspaces can preview and draft.</li>
            <li>Only backend routes can publish b3 assets.</li>
            <li>Only backend receipts can unlock paid truth.</li>
            <li>Replay artifacts are not entitlement, quorum, finality, or settlement truth.</li>
          </ul>
        </Card>

        <Card eyebrow="Phase 2 client rule" title="Display replay status, never authority">
          <p>{PHASE2_REPLAY_BOUNDARY.summary}</p>
          <ul className="quickchain-mini-list">
            <li>Backend-derived replay/verifier labels may be shown as diagnostics.</li>
            <li>CrabLink does not verify proofs or execute replay as authority.</li>
            <li>No committee, quorum, fork-choice, finality, settlement, or bridge claims.</li>
            <li>No paid unlock from replay/proof artifacts or local caches.</li>
          </ul>
        </Card>

        <Card eyebrow="Phase 3 client rule" title="Display validator readiness, never authority">
          <p>{PHASE3_VALIDATOR_BOUNDARY.summary}</p>
          <ul className="quickchain-mini-list">
            <li>Backend-derived validator/readiness labels may be shown as diagnostics.</li>
            <li>CrabLink does not admit, revoke, rotate, register, or authorize validators.</li>
            <li>No passport registry, validator capability, validator-set, finality, settlement, staking, or slashing authority.</li>
            <li>No paid unlock from validator passport, registry, validator set, or local cache status.</li>
          </ul>
        </Card>

        <Card eyebrow="Phase 3 lifecycle rule" title="Display lifecycle status, never authority">
          <p>{PHASE3_LIFECYCLE_BOUNDARY.summary}</p>
          <ul className="quickchain-mini-list">
            <li>Backend-derived lifecycle status display, governance review display, replay challenge display, and downtime display may be shown as diagnostics.</li>
            <li>CrabLink does not grant lifecycle authority, rotate validators, revoke validators, mark downtime, accept equivocation evidence, accept replay challenges, or commit governance parameter updates.</li>
            <li>No validator lifecycle truth, governance truth, replay challenge truth, finality truth, settlement truth, staking/slashing/bonding, validator rewards, bridge, ROX/Solana, or external settlement authority.</li>
            <li>No paid unlock from validator lifecycle, governance, replay challenge, evidence, or local cache status.</li>
          </ul>
        </Card>

        <Card eyebrow="Phase 4 bond rule" title="Display bond status, never authority">
          <p>{PHASE4_BOND_BOUNDARY.summary}</p>
          <ul className="quickchain-mini-list">
            <li>Backend-derived bond status display, slash evidence display, no-op accounting display, and bond review display may be shown as diagnostics.</li>
            <li>CrabLink does not open validator bonds, capture validator bonds, release validator bonds, slash validators, execute slashing, commit slash decisions, create staking markets, create liquidity pools, or settle bonds.</li>
            <li>No bond truth, slash truth, slashing authority, staking market authority, liquidity authority, finality truth, settlement truth, bridge, ROX/Solana, exchange-facing logic, or external settlement authority.</li>
            <li>No paid unlock from bond status, slash evidence, no-op accounting reports, validator status, or local cache status.</li>
          </ul>
        </Card>

        <Card eyebrow="Phase 4 dispute rule" title="Display dispute status, never authority">
          <p>{PHASE4_BOND_DISPUTE_BOUNDARY.summary}</p>
          <ul className="quickchain-mini-list">
            <li>Backend-derived dispute status display, challenge-window display, slash evidence validation display, appeal state display, freeze state display, and disputed-bond lifecycle display may be shown as diagnostics.</li>
            <li>CrabLink does not validate slash evidence as authority, adjudicate disputes, commit challenge decisions, commit appeal decisions, freeze validator bonds, execute irreversible slashing, or settle disputed bonds.</li>
            <li>No dispute truth, challenge-window truth, appeal authority, freeze authority, irreversible slash authority, slash simulation authority, staking market authority, liquidity authority, finality truth, settlement truth, bridge, ROX/Solana, exchange-facing logic, or external settlement authority.</li>
            <li>No paid unlock from dispute, challenge, appeal, freeze, bond, slash, validator status, or local cache status.</li>
          </ul>
        </Card>
      </section>

      <section className="quickchain-milestone-list" aria-label="Milestone readiness">
        {MILESTONES.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={decorateMilestone(milestone, proof)}
            app={app}
          />
        ))}
      </section>

      <section className="quickchain-proof-grid" aria-label="Current local proof anchors">
        <ProofAnchor
          title="Latest site_visit receipt"
          label={proof.latestReceipt?.title || 'No recent receipt'}
          route={proof.latestReceipt?.crabUrl || ''}
          proof={proof.latestReceiptProof || ''}
          app={app}
        />

        <ProofAnchor
          title="Latest site"
          label={proof.latestSite?.title || 'No local site'}
          route={proof.latestSite?.crabUrl || ''}
          proof={proof.latestSite?.cid || proof.latestSite?.manifestCid || ''}
          app={app}
        />

        <ProofAnchor
          title="Latest image asset"
          label={proof.latestImage?.title || 'No local image asset'}
          route={proof.latestImage?.crabUrl || ''}
          proof={proof.latestImage?.cid || ''}
          app={app}
        />

        <ProofAnchor
          title="Latest text asset"
          label={proof.latestTextAsset?.title || 'No local text asset'}
          route={proof.latestTextAsset?.crabUrl || ''}
          proof={proof.latestTextAsset?.cid || proof.latestTextAsset?.manifestCid || ''}
          app={app}
        />

        <ProofAnchor
          title="Public profile cache"
          label={proof.latestProfile?.title || 'No local profile'}
          route={proof.latestProfile?.crabUrl || ''}
          proof={proof.latestProfile?.detail || ''}
          app={app}
        />
      </section>

      <details className="quickchain-dev-json">
        <summary>Developer readiness JSON</summary>
        <JsonPreview
          label="QuickChain readiness"
          data={{
            schema: 'crablink.quickchain-readiness.v1',
            generated_at: new Date().toISOString(),
            progress,
            proof,
            milestones: MILESTONES,
            text_route_contracts: TEXT_ROUTE_CONTRACTS,
            phase2_replay_boundary: PHASE2_REPLAY_BOUNDARY,
            phase2_committee_boundary: PHASE2_COMMITTEE_BOUNDARY,
            phase3_validator_boundary: PHASE3_VALIDATOR_BOUNDARY,
            phase3_lifecycle_boundary: PHASE3_LIFECYCLE_BOUNDARY,
            phase4_bond_boundary: PHASE4_BOND_BOUNDARY,
            phase4_bond_dispute_boundary: PHASE4_BOND_DISPUTE_BOUNDARY,
            next_backend_batch: nextBackendBatch,
            next_crablink_batch: nextCrabLinkBatch,
            forbidden_scope: [
              'no ROX',
              'no Solana',
              'no external settlement',
              'no staking',
              'no liquidity',
              'no bridge',
              'no chain logic inside CrabLink',
              'no client verifier truth',
              'no client committee or quorum truth',
              'no client attestation signing',
              'no client attestation verification as authority',
              'no anti-double-attestation adjudication in CrabLink',
              'no client fork-choice or finality truth',
              'no client settlement truth',
              'no client-side validator authority',
              'no passport registry authority',
              'no validator capability authority',
              'no validator-set authority',
              'no staking/slashing/bonding',
              'no client-side bond truth',
              'no client-side slash truth',
              'no staking market authority',
              'no liquidity authority',
              'no automatic slashing live',
              'no public staking market',
              'no paid unlock from bond status',
              'no paid unlock from replay artifacts',
              'no gateway-side economic mutation',
              'no omnigate direct ledger mutation',
            ],
            truth_boundary:
              'This is a CrabLink display/readiness dashboard. It is not dispute truth, challenge-window truth, appeal authority, freeze authority, irreversible slash authority, slash simulation authority, bond truth, slash truth, slashing authority, staking market authority, liquidity authority, validator truth, passport registry truth, validator capability truth, validator-set truth, attestation truth, verifier truth, committee truth, quorum truth, fork-choice truth, finality truth, settlement truth, paid entitlement truth, ledger truth, or QuickChain state.',
          }}
        />
      </details>
    </section>
  );
}

function ProgressCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`quickchain-progress-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function MilestoneCard({ milestone, app }) {
  return (
    <article className={`quickchain-milestone-card is-${milestone.status}`}>
      <header>
        <div>
          <span>{milestone.phase}</span>
          <strong>{milestone.label}</strong>
        </div>
        <Badge tone={toneForStatus(milestone.status)}>{milestone.displayStatus}</Badge>
      </header>

      <p>{milestone.summary}</p>

      <div className="quickchain-milestone-next">
        <span>Next</span>
        <strong>{milestone.next}</strong>
      </div>

      {milestone.route && (
        <footer>
          <Button variant="secondary" onClick={() => app?.navigate?.(milestone.route)}>
            Open proof
          </Button>
          <CopyButton text={milestone.route} label="Copy route" />
        </footer>
      )}
    </article>
  );
}

function ProofAnchor({ title, label, route, proof, app }) {
  const canOpen = Boolean(route && route.startsWith('crab://') && app?.navigate);

  return (
    <Card className="quickchain-proof-card" eyebrow="Local proof anchor" title={title}>
      <div className="quickchain-proof-row">
        <span>Label</span>
        <strong>{label || 'n/a'}</strong>
      </div>

      <div className="quickchain-proof-row">
        <span>Route</span>
        <strong className="is-monospace">{route || 'not returned'}</strong>
      </div>

      <div className="quickchain-proof-row">
        <span>Proof</span>
        <strong className="is-monospace">{proof || 'not returned'}</strong>
      </div>

      <div className="quickchain-proof-actions">
        <Button variant="primary" onClick={() => app?.navigate?.(route)} disabled={!canOpen}>
          Open
        </Button>
        <CopyButton text={route || proof || ''} label="Copy" disabled={!route && !proof} />
      </div>
    </Card>
  );
}

function buildReadinessProof({ catalog = EMPTY_CATALOG, receipts = [] }) {
  const profiles = safeArray(catalog.profiles);
  const sites = safeArray(catalog.sites);
  const assets = safeArray(catalog.assets);
  const allCatalog = safeArray(catalog.all);
  const safeReceipts = safeArray(receipts);

  const images = assets.filter((item) => normalizeKind(item.kind, item) === 'image');
  const textAssets = dedupeEntries(
    [...assets, ...allCatalog]
      .map(normalizeCatalogItem)
      .filter((item) => TEXT_KINDS.includes(item.kind)),
  );

  const textCounts = {
    post: textAssets.filter((item) => item.kind === 'post').length,
    comment: textAssets.filter((item) => item.kind === 'comment').length,
    article: textAssets.filter((item) => item.kind === 'article').length,
  };

  const textKindsReady = TEXT_KINDS.filter((kind) => textCounts[kind] > 0).length;

  const siteVisitReceipts = safeReceipts.filter((receipt) => {
    const action = String(receipt.action || receipt.kind || '').toLowerCase();
    const title = String(receipt.title || '').toLowerCase();
    return action.includes('site_visit') || title.includes('paid visit');
  });

  const textReceipts = safeReceipts.filter((receipt) => {
    const haystack = [
      receipt.kind,
      receipt.action,
      receipt.title,
      receipt.crabUrl,
      receipt.manifestCid,
      receipt.rootDocumentCid,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return TEXT_KINDS.some((kind) => haystack.includes(kind));
  });

  const sortedProfiles = sortByTime(profiles);
  const sortedSites = sortByTime(sites);
  const sortedImages = sortByTime(images);
  const sortedTextAssets = sortByTime(textAssets);
  const sortedReceipts = sortByTime(siteVisitReceipts);

  const latestReceipt = sortedReceipts[0] || null;
  const latestReceiptProof = latestReceipt
    ? latestReceipt.receiptHash || latestReceipt.txid || latestReceipt.ledgerRoot || ''
    : '';

  return {
    profileCount: profiles.length,
    siteCount: sites.length,
    assetCount: assets.length,
    imageCount: images.length,
    textAssetCount: textAssets.length,
    textCounts,
    textKindsReady,
    receiptCount: safeReceipts.length,
    siteVisitReceiptCount: siteVisitReceipts.length,
    textReceiptCount: textReceipts.length,
    totalCatalog: profiles.length + sites.length + assets.length,
    latestProfile: sortedProfiles[0] || null,
    latestSite: sortedSites[0] || null,
    latestImage: sortedImages[0] || null,
    latestTextAsset: sortedTextAssets[0] || null,
    latestReceipt,
    latestReceiptProof,
    siteVisitReceipts,
    textAssets: sortedTextAssets,
    textReceipts,
    generatedAt: catalog.generatedAt || '',
  };
}

function calculateProgress(milestones, proof) {
  let proven = 0;
  let partial = 0;
  let missing = 0;
  let locked = 0;

  for (const milestone of milestones) {
    const status = decorateMilestone(milestone, proof).status;

    if (status === 'proven') {
      proven += 1;
    } else if (status === 'partial') {
      partial += 1;
    } else if (status === 'locked') {
      locked += 1;
    } else {
      missing += 1;
    }
  }

  const total = milestones.length;
  const score = proven * 1 + partial * 0.5;
  const percent = Math.round((score / total) * 100);

  return {
    percent,
    proven,
    partial,
    missing,
    locked,
    total,
  };
}

function decorateMilestone(milestone, proof) {
  if (milestone.id === 'crablink_receipts_library') {
    const hasLibrary = proof.totalCatalog > 0;
    const hasReceipt = proof.receiptCount > 0;

    return {
      ...milestone,
      status: hasLibrary && hasReceipt ? 'proven' : hasLibrary || hasReceipt ? 'partial' : 'missing',
      displayStatus: hasLibrary && hasReceipt ? 'proven' : hasLibrary || hasReceipt ? 'partial' : 'missing',
      route: 'crab://library',
    };
  }

  if (milestone.id === 'site_visit_value_loop') {
    const hasSiteVisit = proof.siteVisitReceiptCount > 0;

    return {
      ...milestone,
      status: hasSiteVisit ? 'proven' : 'partial',
      displayStatus: hasSiteVisit ? 'proven' : 'manual/backend proof, local receipt not visible',
      route: proof.latestReceipt?.crabUrl || 'crab://ron7',
    };
  }

  if (milestone.id === 'paid_storage_image_site') {
    const hasSite = proof.siteCount > 0;
    const hasImage = proof.imageCount > 0;

    return {
      ...milestone,
      status: hasSite && hasImage ? 'proven' : 'partial',
      displayStatus: hasSite && hasImage ? 'proven' : 'partial local proof',
      route: proof.latestImage?.crabUrl || proof.latestSite?.crabUrl || 'crab://library',
    };
  }

  if (milestone.id === 'post_comment_article_backend') {
    const allTextKindsVisible = proof.textKindsReady === TEXT_KINDS.length;
    const someTextProof = proof.textKindsReady > 0 || proof.textReceiptCount > 0;

    return {
      ...milestone,
      status: allTextKindsVisible ? 'proven' : someTextProof ? 'partial' : 'partial',
      displayStatus: allTextKindsVisible
        ? 'local text proof visible'
        : someTextProof
          ? 'partial local text proof'
          : 'backend route contract present; local proof pending',
      route: 'crab://text',
    };
  }

  return {
    ...milestone,
    displayStatus: milestone.status,
  };
}

function normalizeCatalogItem(item = {}) {
  const kind = normalizeKind(item.kind, item);

  return {
    kind,
    title: item.title || item.name || item.crabUrl || item.cid || `${kind} entry`,
    crabUrl: item.crabUrl || item.crab_url || '',
    cid: item.cid || '',
    manifestCid: item.manifestCid || item.manifest_cid || '',
    rootDocumentCid: item.rootDocumentCid || item.root_document_cid || '',
    receiptHash: item.receiptHash || item.receipt_hash || '',
    txid: item.txid || '',
    status: item.status || 'local display cache',
    detail: item.detail || '',
    source: item.source || 'local_catalog',
    createdAt: item.createdAt || item.created_at || item.updatedAt || item.updated_at || '',
    raw: item.raw || item,
  };
}

function normalizeKind(kind, item = {}) {
  const clean = String(kind || '').trim().toLowerCase();
  const crabUrl = String(item.crabUrl || item.crab_url || '').trim().toLowerCase();

  if (/\.image$/i.test(crabUrl)) {
    return 'image';
  }

  for (const textKind of TEXT_KINDS) {
    if (clean === textKind || new RegExp(`\\.${textKind}$`, 'i').test(crabUrl)) {
      return textKind;
    }
  }

  return clean || 'asset';
}

function dedupeEntries(items) {
  const out = [];
  const seen = new Set();

  for (const item of items) {
    const key = [item.kind, item.crabUrl, item.cid, item.manifestCid, item.txid, item.receiptHash]
      .filter(Boolean)
      .join('|');

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(item);
  }

  return out;
}

function safeReadCatalog() {
  try {
    return readLocalCatalog() || EMPTY_CATALOG;
  } catch (_error) {
    return EMPTY_CATALOG;
  }
}

function safeReadReceipts() {
  try {
    return readRecentReceipts() || [];
  } catch (_error) {
    return [];
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortByTime(items = []) {
  return safeArray(items)
    .slice()
    .sort((a, b) => timestampForSort(b) - timestampForSort(a));
}

function timestampForSort(value) {
  const raw = String(value?.createdAt || value?.created_at || value?.storedAt || '').trim();

  if (!raw) {
    return 0;
  }

  if (/^[0-9]+$/.test(raw)) {
    const n = Number(raw);
    return n > 10_000_000_000 ? n : n * 1000;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toneForStatus(status) {
  switch (status) {
    case 'proven':
      return 'success';
    case 'partial':
      return 'warning';
    case 'locked':
      return 'neutral';
    case 'missing':
    default:
      return 'warning';
  }
}
