# QuickChain Phase 4 Client Bond Dispute Boundary — CrabLink Tauri

RO:WHAT — QuickChain Phase 4 Round 2 bond dispute / challenge simulation boundary for CrabLink Tauri and client adapters.
RO:WHY — Parks the CrabLink pair for Phase 4 Round 2 without letting the client become dispute truth, challenge-window truth, appeal authority, freeze authority, slash authority, wallet authority, ledger authority, paid-unlock authority, bridge authority, or external settlement authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, Tauri park script.
RO:INVARIANTS — client-boundary dispute readiness only; display-only dispute/challenge readiness; backend-derived dispute/challenge/appeal/freeze status only; no irreversible slash authority; no cache-only paid unlock; no fake receipts/balances/finality.
RO:SECURITY — no live irreversible slash, no one-step irreversible slash, no public staking market, no liquidity, no exchange-facing logic, no ROX, no Solana, no public bridge, no external settlement, no silent spend, no hidden freeze/appeal/slash authority.
RO:TEST — npm run check:quickchain-phase4-bond-dispute-boundary.

## Status

QuickChain Phase 4 Round 2 — bond dispute / challenge simulation boundary.

For CrabLink, this is client-boundary dispute readiness only.

CrabLink may display backend-derived dispute status labels, challenge-window display labels, slash evidence validation display labels, appeal display labels, freeze display labels, disputed-bond lifecycle labels, replayable dispute state labels, and simulation-risk disclosures.

Those labels are diagnostic UI context only.

They are not dispute truth, challenge-window truth, slash evidence validation truth, appeal authority, freeze authority, irreversible slash authority, slash simulation authority, staking market authority, liquidity authority, wallet truth, ledger truth, finality truth, settlement truth, payment truth, paid entitlement truth, bridge truth, exchange truth, or external-chain truth.

## Required boundary phrases

client-boundary dispute readiness only
display-only dispute/challenge readiness
backend-derived dispute/challenge/appeal/freeze status
no client-side dispute truth
no client-side challenge-window truth
no client-side appeal authority
no client-side freeze authority
no irreversible slash authority
no paid unlock from dispute, challenge, appeal, freeze, bond, slash, or cache status
QuickChain Phase 4 Round 2 complete
bond dispute and challenge simulation boundary complete

## Forbidden runtime scope

openBondDispute
submitBondDispute
acceptBondDispute
validateSlashEvidence
adjudicateSlashEvidence
openChallengeWindow
closeChallengeWindow
commitChallengeDecision
appealSlashDecision
commitAppealDecision
freezeValidatorBond
unfreezeValidatorBond
freezeValidator
executeIrreversibleSlash
commitIrreversibleSlash
settleDisputedBond
slashFromDispute
slashFromChallenge
slashFromAppeal
slashFromFreeze
live irreversible slash
one-step irreversible slash
public staking market
liquidity
exchange-facing logic
bridge
ROX
Solana
external settlement

## Safe final pair label

CrabLink Tauri + client adapters are COMPLETE / PARKED for QuickChain Phase 4 Round 2.
