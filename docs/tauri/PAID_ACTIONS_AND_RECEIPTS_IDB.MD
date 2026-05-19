

````markdown
---
title: PAID_ACTIONS_AND_RECEIPTS_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, security reviewers, ops, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
related-blueprints:
  - CRABLINK_TAURI_IDB.MD
  - SECURITY_NOTES_CRABLINK_TAURI.MD
  - TAURI_MIGRATION_IDB.MD
  - RUN_STACK_AND_MODES_IDB.MD
  - TAURI_COMMAND_BRIDGE_IDB.MD
  - CRAB_URL_AND_DEEP_LINK_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - OAP_CLIENT_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - TESTING_MATRIX_TAURI_IDB.MD
related-rusty-onions-docs:
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - Chrome-extension-only receipt/purchase UX assumptions
does-not-delete:
  - CrabLink Chrome Extension proof receipt panel
  - existing gateway route contracts
  - existing svc-wallet receipt contract
---

# PAID_ACTIONS_AND_RECEIPTS_IDB

RO:WHAT — Defines how CrabLink Tauri handles paid actions, explicit user confirmation, wallet-backed receipts, local receipt display cache, and paid unlock state.

RO:WHY — CrabLink Tauri is becoming the primary native RON client. Paid actions are central to the creator economy, but the app must not become a wallet, ledger, fake payment oracle, fake receipt generator, or silent-spend surface.

RO:INTERACTS — CrabLink React app, Tauri Rust command bridge, TypeScript paid-action adapters, settings/storage adapters, receipt cache, gateway client, future OAP client, svc-gateway, omnigate, svc-wallet, ron-ledger, ron-accounting, svc-rewarder, ron-policy, svc-storage, svc-index, svc-passport, ron-auth, ron-kms, ron-proto, ron-app-sdk.

RO:INVARIANTS — No fake ROC. No fake receipts. No silent spend. Paid actions require explicit confirmation. Wallet mutation goes through svc-wallet. ron-ledger remains durable economic truth. Local receipt cache is display-only. CrabLink never directly mutates ledger, storage, index, accounting, rewarder, or QuickChain. OAP is future Rust-side only. No ROX, Solana, bridge, staking, liquidity, or exchange logic in the active Tauri app.

RO:METRICS — Paid-action prepare/confirm/execute outcomes, explicit-confirmation cancels, receipt-cache reads/writes, receipt lookup outcomes, wallet/gateway dependency failures, unlock decisions, redacted error classes, command latency, stale draft rejections, idempotency collisions, and paid-gate denial reasons.

RO:CONFIG — Paid action feature flags, gateway endpoint, request timeout, run mode, confirmation policy, receipt display-cache limit, receipt cache persistence scope, developer diagnostics flag, OAP enablement, sidecar enablement, wallet/vault enablement, amnesia mode, route allowlists, and maximum stale draft age.

RO:SECURITY — React displays intent only. TypeScript owns no secrets or wallet truth. Tauri Rust validates command payloads and redacts errors. Backend receipts are authoritative. Local receipts do not unlock paid content by themselves. Deep links cannot authorize spend. Cached settings cannot carry uncapped spend authority. Capabilities fail closed.

RO:TEST — React paid-flow tests, TypeScript adapter tests, Rust command tests, gateway compatibility tests, stale-draft tests, explicit-confirmation tests, receipt-cache tests, receipt-lookup tests, paid-gate tests, amnesia tests, redaction tests, malformed deep-link tests, offline-cache negative tests, and live local-stack paid smokes.

---

## 0. Status

This IDB defines the Tauri-first paid-action and receipt system for CrabLink.

It is not a request to implement wallet custody, QuickChain, external settlement, ROX, Solana, staking, liquidity, or a public bridge.

It is also not a request to make CrabLink Tauri the economic backend.

The correct boundary is:

```text
CrabLink Tauri:
  - displays paid action intent
  - asks for explicit confirmation
  - routes allowed paid requests
  - displays backend-returned receipts
  - keeps a display-only local receipt cache

svc-wallet:
  - owns wallet mutations
  - returns committed receipts
  - exposes receipt lookup

ron-ledger:
  - owns durable replayable economic truth

svc-gateway / omnigate:
  - expose product routes
  - hydrate paid pages
  - enforce route contracts and policy
  - do not directly mutate ledger

svc-storage / svc-index:
  - enforce paid write/view proofs where applicable
  - do not directly mutate ledger
```

The design goal is:

```text
real paid actions
real backend receipts
real wallet/ledger truth
local UX convenience only
```

---

## 1. Why this IDB exists

The Chrome extension proved that CrabLink can render:

```text
crab:// routes
typed b3 asset pages
paid content gates
paid image/site/post/comment/article flows
site visit payment UX
receipt-driven unlocks
recent receipt display
```

Tauri changes the trust boundary.

The app now has native Rust capability. That gives CrabLink better long-term power:

```text
native command bridge
secure local persistence
future OAP client
future local vault
future local node/sidecar
future offline cache verification
desktop/mobile packaging
```

But that same native power creates new risks:

```text
silent native spend
fake local receipt generation
React-held wallet authority
receipt cache confused with truth
deep links triggering payment
direct wallet/ledger calls from UI
unbounded stored spend permissions
sidecar/local-node confusion
desktop-only payment assumptions
```

This IDB exists to prevent those risks.

---

## 2. Plain-language rule

Every paid action in CrabLink Tauri must answer four questions before anything mutates value:

```text
What am I paying for?
Who is paying?
Who receives or escrows the ROC?
What backend receipt proves the outcome?
```

If any answer is missing, the action must fail closed.

---

## 3. Definitions

### 3.1 Paid action

A paid action is any user-visible operation that may spend, reserve, capture, release, transfer, issue, burn, or otherwise alter ROC balance state through the wallet/ledger path.

Examples:

```text
paid site visit
paid article view
paid post view
paid comment view
paid image view
paid storage/pinning
paid asset publish
paid site publish
paid revision publish
paid app/site access
paid creator subscription
paid premium manifest access
paid media segment access
future paid game/app facet access
```

### 3.2 Receipt

A receipt is a backend-returned proof that an economic operation was accepted and committed by the wallet/ledger path.

Current wallet receipt operations include:

```text
issue
transfer
burn
hold
capture
release
```

CrabLink Tauri may display receipts, cache display copies, copy proof text, and link to lookup routes.

CrabLink Tauri must not invent receipts.

### 3.3 Receipt display cache

A receipt display cache is local app storage containing safe, public, display-only copies of backend-returned receipt metadata.

It is useful for UX.

It is not:

```text
wallet truth
ledger truth
ownership truth
paid unlock truth
proof that content may be viewed offline
proof that the user still has access
```

### 3.4 Paid unlock

A paid unlock is a backend-authorized decision that a user may access a paid resource.

The app may remember unlock UX state for convenience, but durable access truth remains backend-owned.

### 3.5 Quote / estimate

A quote is a backend-provided description of expected cost before the user confirms.

Quotes are not receipts.

Quotes do not move ROC.

Quotes must expire.

### 3.6 Draft

A paid action draft is a local, pre-confirmation object created by UI/adapters to describe intended action.

Drafts must be treated as untrusted until validated by Tauri Rust and backend prepare routes.

### 3.7 Confirmation snapshot

A confirmation snapshot is the exact user-visible action summary presented before spend.

It must include enough information to prevent bait-and-switch.

### 3.8 Idempotency key

An idempotency key binds a user-intended action to a single backend operation so retries do not double spend.

Idempotency keys must be stable for retries of the same action and different for materially different actions.

### 3.9 Nonce

Nonce handling remains backend/wallet-policy governed.

CrabLink Tauri may pass backend-required nonce values, but it must not pretend local nonce guesses are wallet truth.

---

## 4. Non-negotiable invariants

### [I-1] No fake ROC

CrabLink Tauri must never display a simulated balance as real.

Allowed:

```text
backend balance
clearly labeled unavailable state
clearly labeled local display cache
clearly labeled developer fixture only in explicit dev mode
```

Forbidden:

```text
invented balance
optimistic spend balance shown as committed
local storage balance shown as truth
receipt cache balance calculation shown as authoritative
```

---

### [I-2] No fake receipts

CrabLink Tauri must never create a local object that looks like a wallet/ledger receipt unless it was returned by backend.

Allowed:

```text
local receipt display copy
local receipt summary
local pending action draft
local failed action report
local developer fixture clearly labeled fixture
```

Forbidden:

```text
synthetic receipt_hash
synthetic txid
synthetic ledger_root
synthetic ledger sequence
synthetic capture/release proof
```

---

### [I-3] No silent spend

Any action that can spend, reserve, transfer, capture user-funded value, or otherwise mutate wallet state must require explicit user confirmation.

Explicit confirmation means:

```text
user sees the action
user sees the price or maximum authorized price
user sees the payer identity/account label
user sees the recipient/escrow/creator/service when known
user sees the asset/site/content being paid for
user clicks/taps an affirmative confirmation control
```

Not explicit enough:

```text
opening a crab:// link
loading an image
scrolling a page
hovering a button
restoring a tab
refreshing a page
following a deep link
running app startup
service auto-start
background sync
offline cache refresh
```

---

### [I-4] Wallet mutation stays backend-owned

CrabLink Tauri must not mutate ron-ledger directly.

CrabLink Tauri must not bypass svc-wallet.

Active MVP path:

```text
CrabLink Tauri
→ svc-gateway
→ omnigate / wallet route
→ svc-wallet
→ ron-ledger
```

Future native/OAP path may optimize transport, but not authority:

```text
CrabLink Tauri Rust adapter
→ authenticated gateway/OAP route
→ svc-wallet
→ ron-ledger
```

Forbidden:

```text
React → svc-wallet direct mutation
TypeScript → svc-wallet direct mutation
Tauri → ron-ledger direct mutation
Tauri → local ledger mutation
gateway → direct ledger mutation
omnigate → direct ledger mutation
storage/index/profile/media → direct ledger mutation
```

---

### [I-5] Holds must not be confused with payment completion

A hold reserves ROC.

It is not automatically the same as final payment.

For paid operations that require escrow:

```text
hold → perform paid action → capture success amount → release remainder
```

The UI must distinguish:

```text
pending hold
captured payment
released refund
failed action
released/refunded action
```

---

### [I-6] Local receipt cache never unlocks paid content by itself

Local cached receipts are useful for display and navigation.

They must not be the only reason a paid resource renders.

Allowed:

```text
show recent receipt
copy txid
copy receipt hash
show cached receipt details while offline
offer "verify receipt" when online
pre-fill a support/debug report
```

Forbidden:

```text
render paid content solely because a local receipt exists
skip backend paid gate because receipt exists in local storage
unlock offline paid content unless OFFLINE_CACHE_IDB later defines verified access rules
```

---

### [I-7] Deep links are navigation, not authority

A `crab://` deep link may open a page.

It must not authorize a spend.

A deep link may pre-fill:

```text
target route
content identifier
asset kind
site name
intended action kind
```

A deep link must not carry trusted:

```text
receipt truth
wallet authority
private key material
uncapped spend permission
main→alt linkage
policy override
```

---

### [I-8] React owns display and intent only

React may:

```text
show paid gates
show quotes
show confirmation modals
show receipts
show unlock state
ask user to confirm
call TypeScript adapters
```

React must not:

```text
store secrets
own wallet truth
own ledger truth
call raw Tauri invoke directly from arbitrary components
call internal services directly
invent receipts
decide backend policy
construct OAP frames
```

---

### [I-9] TypeScript adapters are not authority

TypeScript paid-action helpers may:

```text
normalize UI payloads
call Tauri command wrappers
call gateway HTTP adapters where gateway compatibility is still active
format display amounts
validate obvious UI errors
```

TypeScript helpers must not:

```text
own private spend authority
hold seed phrases
hold bearer secrets except explicit dev-only config handling
invent receipts
silently retry mutating actions without idempotency
make direct ledger/storage/index mutations
```

---

### [I-10] Tauri Rust is a mediator, not the economy

Tauri Rust may:

```text
validate command payloads
redact errors
enforce feature gates
route gateway/OAP requests
manage safe local display cache
verify b3 hashes for cache/media when defined
hold future vault logic after vault IDB
```

Tauri Rust must not:

```text
become svc-wallet
become ron-ledger
become svc-storage
become svc-index
become ron-accounting
become svc-rewarder
implement QuickChain
implement ROX/Solana settlement
```

---

## 5. Paid action classes

### 5.1 Paid content view

Examples:

```text
paid article view
paid post view
paid comment view
paid image view
paid video/media view later
paid site page view
```

Expected lifecycle:

```text
resolve route
detect paid gate
prepare/quote access
show confirmation
hold or transfer through backend route
receive receipt
backend confirms unlock
render content
store display receipt copy
```

The app must distinguish:

```text
content not found
content exists but unpaid
policy denied
payment required
payment failed
payment succeeded but content fetch failed
receipt returned but unlock denied
```

---

### 5.2 Paid site visit

A paid site visit is a creator-economy action where Visitor B pays Creator A or an escrow/split route to access a site/page.

Expected visible proof:

```text
site name or crab:// URL
creator or recipient if known
payer passport/account label
price
receipt txid
receipt hash
ledger root if returned
unlock status
```

A site visit cannot auto-pay on ordinary navigation.

A site visit must not double-charge on refresh.

Retries must use idempotency.

---

### 5.3 Paid asset publish

Examples:

```text
image publish
post publish
comment publish
article publish
site publish
future music/video/podcast publish
```

Expected lifecycle:

```text
draft asset
prepare publish quote
show confirmation
hold ROC if priced
upload/store content through gateway/product route
backend stores object/manifest/pointer
backend captures/releases through wallet where applicable
return receipt(s)
return asset crab:// URL and b3 identifiers
write local catalog display entry
write receipt display copy
```

The app must not locally claim publication success unless backend returns a successful product response.

---

### 5.4 Paid storage / pinning

Paid storage/pinning is a backend-enforced paid action.

Important rule:

```text
A hold for one object/context must not be reusable for different bytes or a different paid action.
```

The app must preserve backend context binding.

The app must not:

```text
reuse old hold receipts for new bytes
rewrite content after hold without re-prepare
hide capture/release results
claim storage success before backend success
```

---

### 5.5 Paid app/site access

Future app/site access may include:

```text
one-time unlock
time-bounded access
creator subscription
premium app route
paid game facet access
paid code facet access
```

Until FACET_SANDBOX_IDB and future policy docs define execution rules, paid app/site access may unlock only safe rendered views, not arbitrary execution.

Paid access must not imply:

```text
permission to execute untrusted code
permission to access wallet
permission to access local files
permission to access private passport data
```

---

### 5.6 Reward-related receipts

Rewarder and accounting flows may produce wallet receipts for rewards/payouts.

CrabLink Tauri may display backend-returned reward receipts.

CrabLink Tauri must not:

```text
calculate reward entitlement as truth
issue reward transactions
mutate wallet for rewards
run rewarder locally as app logic
claim rewards are final without backend receipts
```

---

## 6. Standard paid action lifecycle

Every paid action should fit this shape unless a later route contract defines a stricter flow.

```text
1. User intent
2. Local draft
3. Backend prepare / quote
4. Confirmation snapshot
5. Explicit user confirmation
6. Wallet-backed operation
7. Product operation
8. Capture/release or transfer finalization
9. Backend receipt(s)
10. Backend unlock / publish / access decision
11. Local display cache write
12. UI success or failure state
```

### 6.1 Step 1 — User intent

User intent may come from:

```text
button click
publish form submit
paid gate "unlock" button
site visit confirmation
asset publish confirmation
manual receipt verification
```

User intent must not come from:

```text
page load alone
deep link alone
background refresh
offline sync
route preload
image auto-render
embedded asset load
```

---

### 6.2 Step 2 — Local draft

A local draft may include:

```text
schema
action_kind
target_crab_url
target_b3
asset_kind
title
description
tags
payer_passport_label
payer_account_label
owner_passport_subject
estimated_bytes
created_at
client_idempotency_key
```

Drafts are untrusted.

Drafts may be stored only where appropriate and must be safe to discard.

Drafts must not include:

```text
private keys
seed phrases
uncapped spend permissions
raw bearer secrets
ledger truth
fake receipt fields
```

---

### 6.3 Step 3 — Backend prepare / quote

Prepare routes must return a typed quote.

A quote should include, when available:

```text
schema
action_kind
target
price
asset
payer
recipient
escrow
expires_at
idempotency_context
policy_summary
warnings
correlation_id
```

A quote must not be treated as payment.

A stale quote must be rejected.

---

### 6.4 Step 4 — Confirmation snapshot

The confirmation snapshot is what the user sees before approving.

Required display fields when applicable:

```text
Action:
  "Pay to view article"
  "Pay site visit"
  "Publish image"
  "Pin storage object"

Target:
  crab:// URL
  b3 ID
  site name
  asset title

Payer:
  passport label
  account label

Recipient:
  creator
  service
  escrow
  split summary if returned

Cost:
  ROC amount
  maximum authorized ROC amount if estimate-based

Policy:
  one-time access / publish / storage / view
  expiration if returned
  refund/capture behavior if returned

Proof expected:
  receipt txid
  receipt hash
  ledger root when returned
```

The app must preserve the confirmation snapshot with the action result.

---

### 6.5 Step 5 — Explicit confirmation

The confirmation control must be affirmative.

Examples:

```text
Pay 10 ROC
Hold 25 ROC and publish
Confirm site visit payment
Confirm paid storage
```

Avoid vague controls:

```text
Continue
Open
Next
OK
Load
```

A user cancel must be a first-class outcome.

---

### 6.6 Step 6 — Wallet-backed operation

Wallet-backed operation is done by backend route.

Possible operations:

```text
hold
transfer
capture
release
issue
burn
```

CrabLink Tauri should normally initiate user-paid flows through product/gateway routes, not through raw wallet mutation commands.

Raw wallet mutation commands must remain future-gated behind explicit wallet/vault/policy docs.

---

### 6.7 Step 7 — Product operation

Examples:

```text
store object
publish manifest
write index pointer
hydrate content view
grant site visit access
resolve typed asset page
```

Product operation success must be backend-returned.

The app must not invent:

```text
asset ownership
index pointer
manifest storage
provider proof
paid unlock
```

---

### 6.8 Step 8 — Capture/release or transfer finalization

If the backend uses escrow:

```text
hold first
capture actual amount on success
release remainder when applicable
release/refund on failure when applicable
```

The UI should show final state honestly:

```text
held
captured
released
refunded
failed
unknown; verify receipt
```

---

### 6.9 Step 9 — Backend receipts

Successful paid actions should return one or more backend receipts.

Examples:

```text
hold receipt
capture receipt
release receipt
transfer receipt
publish receipt wrapper
site visit receipt wrapper
content view receipt wrapper
```

The app must persist only safe display copies.

---

### 6.10 Step 10 — Backend unlock / publish / access decision

Unlock/publish/access decisions come from backend response, not receipt cache.

A receipt alone is not enough unless backend route contract explicitly says that receipt verification grants access.

---

### 6.11 Step 11 — Local display cache write

After success, the app may write a display cache entry.

Cache entry must include a truth boundary string:

```text
Local display copy only. Backend wallet and ledger remain authoritative.
```

---

### 6.12 Step 12 — UI result state

The final UI must distinguish:

```text
success
cancelled
quote expired
payment denied
insufficient balance
policy denied
hold succeeded but product action failed
product succeeded but receipt cache write failed
receipt lookup unavailable
unknown backend status
```

---

## 7. Receipt contract

### 7.1 Current backend wallet receipt fields

At the backend compatibility boundary, current wallet receipt fields may include:

```text
txid
op
from
to
asset
amount_minor
nonce
idem
timestamp
ledger_seq_start
ledger_seq_end
ledger_root
receipt_hash
```

Important naming note:

```text
amount_minor is the current backend wire field name.
User-facing Tauri UI should render this as ROC or ROC units, not as "minor units".
Do not rename backend fields locally unless an adapter explicitly maps both directions.
```

### 7.2 Receipt invariants

A backend receipt is valid for display only if the app can identify enough proof fields.

Recommended minimum for display cache:

```text
txid OR receipt_hash
op OR action_kind
asset
amount
timestamp OR created_at
source
```

Recommended strong proof fields:

```text
txid
op
from
to
asset
amount_minor
idem
ledger_root
receipt_hash
```

Receipt hash invariant:

```text
receipt_hash must be b3:<64 lowercase hex> when present.
```

Ledger root invariant:

```text
ledger_root must be treated as backend proof metadata.
CrabLink Tauri displays it; it does not verify full ledger replay unless a later verifier design exists.
```

### 7.3 Product receipt wrapper

Product routes may wrap wallet receipts in higher-level receipt objects.

Suggested app-facing normalized shape:

```json
{
  "schema": "crablink.paid-action-receipt-display.v1",
  "action_kind": "site_visit",
  "target_crab_url": "crab://example",
  "target_b3": "",
  "asset_kind": "site",
  "payer": "acct_visitor_b",
  "recipient": "acct_creator_a",
  "amount_display": "10 ROC",
  "wallet_receipts": [
    {
      "op": "transfer",
      "txid": "wallet_tx_example",
      "receipt_hash": "b3:0000000000000000000000000000000000000000000000000000000000000000",
      "ledger_root": "b3:1111111111111111111111111111111111111111111111111111111111111111"
    }
  ],
  "created_at": "2026-05-17T00:00:00.000Z",
  "source": "svc-gateway",
  "truth_boundary": "Local display copy only. Backend wallet and ledger remain authoritative."
}
```

This shape is for local app display.

It is not a backend DTO unless separately formalized.

---

## 8. Receipt display cache

### 8.1 Purpose

The local receipt cache exists to make the app useful:

```text
show recent payments
show recent publishes
copy proof for debugging
reopen receipt details
support creator/user transparency
preserve recent history across route changes
```

### 8.2 Truth boundary

Every receipt cache surface must communicate:

```text
This is a local display copy.
Backend wallet and ledger remain authoritative.
```

### 8.3 Safe fields to cache

Allowed:

```text
schema
action_kind
title
target_crab_url
target_b3
asset_kind
txid
receipt_hash
ledger_root
op
asset
amount display
payer label/account
recipient label/account
timestamp
correlation_id
source route
status
policy summary
```

Avoid or redact:

```text
bearer tokens
capability tokens
private keys
seed phrases
raw authorization headers
private passport linkage
secret alt metadata
raw request bodies containing private local files
unredacted error stacks
```

### 8.4 Cache limit

Default:

```text
max_recent_receipts = 32
```

The app may expose a setting later.

### 8.5 Cache persistence modes

Recommended modes:

```text
session_only
persistent_display_cache
amnesia
```

Behavior:

```text
session_only:
  clears on app restart

persistent_display_cache:
  persists safe receipt display copies

amnesia:
  clears on app shutdown or sooner
```

### 8.6 Cache clear

The user must be able to clear local receipt display cache.

Clearing local cache must not imply:

```text
backend receipt deletion
ledger deletion
refund
access revocation
```

### 8.7 Cache import/export

Do not implement receipt cache import/export in the first batch.

If later added, imported receipts must be labeled:

```text
imported display copy; not verified
```

unless verified through backend lookup.

---

## 9. Receipt lookup

CrabLink Tauri should eventually support receipt lookup by:

```text
txid
receipt_hash
action id
local cache key
```

Active MVP should prefer backend lookup through gateway route when exposed.

Fallback behavior:

```text
online lookup succeeds:
  show backend receipt

online lookup fails not found:
  show not found / stale local copy warning

offline:
  show local display copy only, with truth boundary

backend unavailable:
  show unable to verify now
```

The app must not mark an unverified local copy as backend-confirmed.

---

## 10. Paid unlock state

### 10.1 Unlock source of truth

Unlock source of truth is backend.

The app may store:

```text
last successful unlock route
last receipt display copy
last access response summary
```

The app must not store permanent paid entitlement unless a future backend contract defines it.

### 10.2 Route reload

Reloading a route must not silently re-pay.

Safe reload behavior:

```text
reload content if backend says access already valid
show paid gate if backend asks for payment
offer "verify previous receipt"
do not auto-confirm payment
```

### 10.3 Back/forward navigation

Back/forward navigation must not re-submit paid actions.

It may render cached page state only if safe and clearly local.

### 10.4 Embedded paid assets

If a site embeds a paid asset:

```text
the embed may show a paid gate
the embed may ask for explicit confirmation
the embed must not auto-pay
the parent site payment does not automatically pay every child asset unless backend route contract explicitly returns that entitlement
```

---

## 11. Tauri command boundary

### 11.1 Command families

Recommended future command families:

```text
paid_prepare_action
paid_confirm_action
paid_execute_action
paid_cancel_action
paid_get_receipt
paid_list_recent_receipts
paid_write_receipt_display_copy
paid_clear_receipt_display_cache
paid_verify_receipt
paid_get_feature_status
```

These names are illustrative. Actual implementation should follow TAURI_COMMAND_BRIDGE_IDB naming conventions.

### 11.2 Command input rules

All paid command inputs must be:

```text
strictly typed
bounded in size
schema-versioned
validated in Rust
redacted in logs
correlated with a request ID
```

### 11.3 Command output envelope

All paid command outputs should use the standard command envelope from TAURI_COMMAND_BRIDGE_IDB.

Suggested shape:

```json
{
  "ok": true,
  "correlation_id": "cl_...",
  "data": {},
  "warnings": []
}
```

Error shape:

```json
{
  "ok": false,
  "correlation_id": "cl_...",
  "error": {
    "code": "payment_required",
    "message": "Payment required",
    "retryable": false,
    "redacted": true
  }
}
```

### 11.4 React raw invoke ban

React route components should not call raw Tauri invoke directly.

Preferred path:

```text
React component
→ feature hook / page action
→ TypeScript paid action adapter
→ typed command client
→ Tauri Rust command
→ gateway/OAP adapter
→ backend
```

### 11.5 Gateway compatibility first

The first implementation should preserve the proven gateway route behavior.

Future OAP support must not change paid semantics.

---

## 12. Suggested TypeScript adapter surface

This is a design target, not mandatory first-batch code.

```ts
type PaidActionKind =
  | 'site_visit'
  | 'content_view'
  | 'asset_publish'
  | 'site_publish'
  | 'storage_pin'
  | 'receipt_lookup';

type PaidPrepareInput = {
  actionKind: PaidActionKind;
  targetCrabUrl?: string;
  targetB3?: string;
  assetKind?: string;
  payerPassportLabel?: string;
  payerAccountLabel?: string;
  ownerPassportSubject?: string;
  estimatedBytes?: number;
  clientIdempotencyKey?: string;
};

type PaidConfirmationSnapshot = {
  schema: 'crablink.paid-confirmation-snapshot.v1';
  actionKind: PaidActionKind;
  title: string;
  targetLabel: string;
  payerLabel: string;
  recipientLabel?: string;
  amountDisplay: string;
  maxAmountDisplay?: string;
  expiresAt?: string;
  warnings: string[];
};

type PaidReceiptDisplayCopy = {
  schema: 'crablink.paid-action-receipt-display.v1';
  actionKind: PaidActionKind;
  title?: string;
  targetCrabUrl?: string;
  targetB3?: string;
  amountDisplay?: string;
  payer?: string;
  recipient?: string;
  txid?: string;
  receiptHash?: string;
  ledgerRoot?: string;
  createdAt: string;
  source: string;
  truthBoundary: string;
};
```

Rules:

```text
This type layer is display/adapter shape only.
It must not replace backend DTOs.
It must not invent receipt proof fields.
```

---

## 13. Gateway route expectations

CrabLink Tauri should prefer gateway public routes.

Known/proven route families include:

```text
GET  /healthz
GET  /readyz
GET  /crab/resolve?url=...
GET  /b3/<hash>.<kind>
GET  /sites/:name

POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites

GET  /wallet/:account/balance
POST /wallet/hold
```

Other paid product routes should be added only when backend route contracts exist.

Potential future route families:

```text
POST /content/view/prepare
POST /content/view
POST /site/visit/prepare
POST /site/visit
POST /assets/post/prepare
POST /assets/post
POST /assets/comment/prepare
POST /assets/comment
POST /assets/article/prepare
POST /assets/article
GET  /wallet/tx/:txid
```

Exact paths must follow backend route contracts.

The app must not hard-code imaginary production routes as truth.

---

## 14. Paid action headers

Some backend paid flows currently require proof headers for wallet-backed storage/write paths.

At compatibility boundaries, the app may need to preserve headers such as:

```text
x-ron-paid-op
x-ron-paid-asset
x-ron-paid-estimate-minor
x-ron-wallet-txid
x-ron-wallet-receipt-hash
x-ron-wallet-from
x-ron-wallet-to
x-ron-wallet-idem
```

Important naming note:

```text
x-ron-paid-estimate-minor is a current backend header.
User-facing UI should render this as ROC or ROC units.
Do not expose backend header naming as user-facing copy.
```

Header rules:

```text
do not log authorization headers
do not log bearer tokens
do not log full private capability tokens
do not synthesize receipt hash headers
do not reuse proof headers across different content/context
do not let React manually assemble sensitive proof headers
```

---

## 15. Idempotency and replay protection

### 15.1 Required behavior

Every mutating paid action must have idempotency.

The app must avoid double spend on:

```text
button double-click
network retry
route reload
app restart during pending action
back/forward navigation
gateway timeout
Tauri command timeout
```

### 15.2 Idempotency source

Preferred:

```text
backend prepare returns idempotency context
```

Fallback:

```text
Tauri Rust creates bounded client idempotency key from stable draft fields
```

The fallback key must include enough context to prevent cross-action reuse.

### 15.3 Material changes

If any material field changes, prepare again:

```text
target content
bytes/body
payer
recipient
price
asset kind
route
policy
expiration
```

### 15.4 Pending state

Pending paid action state must be recoverable enough to prevent accidental duplicate submissions, but not enough to authorize spend silently.

On restart, pending paid actions should become:

```text
needs review
verify status
cancelled locally
```

They must not auto-resume spending.

---

## 16. Error taxonomy

The app should normalize paid errors into stable user-safe classes.

Suggested classes:

```text
quote_failed
quote_expired
confirmation_cancelled
payment_required
insufficient_balance
policy_denied
capability_denied
wallet_unavailable
gateway_unavailable
backend_unavailable
receipt_missing
receipt_invalid
receipt_unverified
hold_failed
capture_failed
release_failed
product_action_failed
unlock_denied
idempotency_conflict
nonce_conflict
network_timeout
redacted_internal_error
```

### 16.1 User-facing copy

Errors should be honest but safe.

Examples:

```text
Payment required.
This quote expired. Prepare the action again.
Your wallet balance is not sufficient for this action.
The backend denied this action by policy.
The wallet service is unavailable.
The payment may be pending. Verify the receipt before trying again.
The receipt display copy exists locally, but backend verification is unavailable.
```

### 16.2 Developer details

Developer details may include:

```text
correlation_id
route
status code
redacted backend code
safe receipt ids
safe txid
safe receipt hash
```

Developer details must not include:

```text
bearer token
private capability
seed phrase
private key
full unredacted stack containing secrets
private main→alt linkage
```

---

## 17. Confirmation UX requirements

### 17.1 Modal/card requirements

Paid confirmation UI must include:

```text
clear action title
target route/content
payer label
recipient/escrow label when known
ROC amount
expiration if quote is temporary
policy warning if access is time-limited
cancel button
affirmative pay/hold/publish button
```

### 17.2 No hidden default spend

The affirmative action must not be default-triggered by Enter unless the user is focused inside the confirmation context and the control label is explicit.

### 17.3 Reconfirm on material change

If the quote or target changes between prepare and execute:

```text
cancel old confirmation
show updated quote
require fresh confirmation
```

### 17.4 Expiration

If quote expires:

```text
disable confirmation
show expired state
require prepare again
```

---

## 18. Receipt UX requirements

### 18.1 Receipt page

CrabLink Tauri should preserve the Chrome proof concept of a dedicated receipt page.

Recommended route:

```text
crab://receipts
```

The receipt page should show:

```text
recent receipts
filters
site visits
publishes
wallet/payment operations
copy proof
clear display cache
verify receipt when online
truth boundary
```

### 18.2 Passport drawer

The passport drawer may show a compact receipt summary.

It should not become cluttered.

Recommended drawer behavior:

```text
show latest 1-3 receipts or count
link to full Receipts page
avoid giant JSON by default
hide debug detail behind explicit expand/copy
```

### 18.3 Receipt proof display

Receipt proof panel may include:

```text
txid
receipt hash
ledger root
operation
amount
from
to
timestamp
source route
correlation id
```

### 18.4 Copy proof

Copy proof should include the truth boundary:

```text
Local display copy only. Backend wallet and ledger remain authoritative.
```

---

## 19. Storage and settings relation

This IDB depends on STORAGE_AND_SETTINGS_IDB.MD.

Receipt cache should be stored through the storage/settings adapter, not directly scattered across components.

Recommended storage keys:

```text
crablink.tauri.recent_receipts.v1
crablink.tauri.pending_paid_actions.v1
crablink.tauri.paid_action_settings.v1
```

Storage key names are not final code requirements, but storage must be centralized.

### 19.1 Amnesia mode

In amnesia mode:

```text
do not persist receipt cache across restart
clear pending paid actions on shutdown
avoid disk spill of paid diagnostics
redact logs aggressively
```

### 19.2 Developer mode

Developer mode may expose:

```text
raw response JSON
route headers minus secrets
correlation IDs
receipt lookup tools
gateway trace summary
```

Developer mode must not permit silent spend.

---

## 20. Offline behavior

Offline mode may show:

```text
local receipt display copies
cached route metadata
cached public manifests if OFFLINE_CACHE_IDB permits
cached unpaid/public content if verified
```

Offline mode must not:

```text
initiate spend
claim receipt verification
unlock paid content solely from local receipt cache
publish assets
capture/release holds
```

If a paid action is attempted offline:

```text
show unavailable
do not queue silent payment
allow draft saving if safe
require fresh confirmation when online
```

---

## 21. Mobile-forward constraints

This IDB must work for:

```text
desktop
iOS
Android
```

Do not design paid flows that require:

```text
desktop-only filesystem paths
desktop-only background daemons
always-on local services
system tray approvals
hover-only confirmation
keyboard-only confirmation
```

Mobile paid confirmation must be:

```text
touch-safe
clear
non-accidental
bounded
recoverable
```

---

## 22. Run modes

### 22.1 Gateway-only mode

Default early Tauri mode:

```text
CrabLink Tauri → configured svc-gateway
```

Paid actions use gateway-compatible HTTP routes.

### 22.2 Local dev stack mode

Developer mode:

```text
CrabLink Tauri → localhost svc-gateway → local RustyOnions services
```

Still no direct ledger mutation.

### 22.3 Future sidecar mode

Future mode after SIDECAR_LOCAL_NODE_IDB:

```text
CrabLink Tauri → supervised local node/sidecar → services
```

Sidecar mode must not grant silent wallet authority.

### 22.4 Future OAP mode

Future mode after OAP_CLIENT_IDB:

```text
CrabLink Tauri Rust OAP client → service route → wallet/gateway policy path
```

OAP must not absorb app semantics.

### 22.5 Mobile mode

Mobile mode likely uses configured gateway first.

Mobile must not require local sidecar.

---

## 23. Policy and capability gates

Paid action execution must fail closed if policy/capability is missing.

Examples:

```text
missing capability
expired capability
policy disabled paid action
action not allowlisted
wallet unavailable
passport unavailable
payer mismatch
recipient mismatch
stale quote
unverified route
```

CrabLink Tauri should show clear explanation and never bypass.

---

## 24. Balance display relation

Balance display is separate from receipt display.

Balance must come from backend wallet route.

The app may show:

```text
last known balance
balance unavailable
refresh balance
```

The app must not calculate authoritative balance from receipts.

Receipt-derived math can be shown only as:

```text
local receipt summary
not wallet truth
```

---

## 25. Accounting and rewards relation

ron-accounting and svc-rewarder are not app-owned.

CrabLink Tauri may display accounting/reward summaries when backend exposes them.

CrabLink Tauri must not:

```text
write accounting truth
plan rewards as final truth
issue payouts
mutate rewarder
mutate ledger
```

Receipt display may include accounting correlation IDs if backend returns them.

---

## 26. QuickChain relation

QuickChain is future.

This IDB must not implement:

```text
distributed chain logic
validator logic
checkpoint consensus
ROX anchor logic
Solana anchor logic
bridge logic
staking
liquidity
exchange-facing commands
```

CrabLink may eventually display QuickChain proofs after the internal economy is proven and QUICKCHAIN implementation exists.

Until then:

```text
wallet receipt + ledger root is current proof surface
```

---

## 27. Security checklist

Before approving any paid-action implementation batch:

```text
[ ] Does every mutating paid action require explicit user confirmation?
[ ] Is every backend receipt backend-returned?
[ ] Is receipt cache display-only?
[ ] Does receipt cache include a truth boundary?
[ ] Are wallet mutations routed through svc-wallet?
[ ] Is ron-ledger never called directly from CrabLink?
[ ] Are gateway route contracts preserved?
[ ] Are direct storage/index mutations forbidden?
[ ] Are deep links treated as navigation only?
[ ] Are stale quotes rejected?
[ ] Are idempotency keys present for mutations?
[ ] Are double-click/retry/reload double-spend paths handled?
[ ] Are errors redacted?
[ ] Are bearer/capability tokens excluded from logs/cache/UI?
[ ] Does amnesia mode avoid persistent receipt cache?
[ ] Does offline mode avoid unlocking paid content by local receipt alone?
[ ] Does mobile UX avoid accidental spend?
[ ] Is OAP disabled or gated until OAP_CLIENT_IDB implementation?
[ ] Is sidecar disabled or gated until SIDECAR_LOCAL_NODE_IDB implementation?
[ ] Is vault disabled or gated until PASSPORT_WALLET_VAULT_IDB implementation?
[ ] Is QuickChain/ROX/Solana excluded?
```

---

## 28. Product checklist

Before calling paid actions product-ready:

```text
[ ] Paid site visit works through gateway.
[ ] Paid content view works through gateway.
[ ] Paid publish flow works for at least one asset kind.
[ ] Quote/prepare route is visible before spend.
[ ] Confirmation snapshot is shown.
[ ] User can cancel before spend.
[ ] Receipt is displayed after success.
[ ] Receipt display cache survives route switch when configured.
[ ] Receipt page shows recent receipts cleanly.
[ ] Passport drawer links to receipt page without clutter.
[ ] Balance refresh is backend-derived.
[ ] Reload does not double-charge.
[ ] Back/forward navigation does not double-charge.
[ ] Offline state is honest.
[ ] Errors are understandable.
[ ] Developer details are redacted.
```

---

## 29. Testing matrix

### 29.1 React tests

Test:

```text
paid gate render
confirmation modal fields
cancel path
expired quote UI
receipt page filters
receipt truth boundary
balance unavailable state
offline paid action denial
```

### 29.2 TypeScript adapter tests

Test:

```text
draft normalization
receipt normalization
receipt dedupe
display amount formatting
safe cache serialization
redaction
missing receipt proof rejection
```

### 29.3 Rust command tests

Test:

```text
strict input validation
unknown action rejection
oversized payload rejection
stale draft rejection
redacted error envelope
feature flag denial
amnesia cache behavior
correlation id propagation
```

### 29.4 Integration tests

Test with local stack:

```text
paid site visit
paid image publish
receipt lookup
balance refresh
gateway unavailable
wallet unavailable
policy denied
insufficient balance
retry with same idempotency
retry with changed content rejected
```

### 29.5 Security regression tests

Test:

```text
deep link cannot auto-pay
reload cannot auto-pay
embedded asset cannot auto-pay
receipt cache cannot unlock paid content
local receipt import cannot mark verified
secrets do not enter logs
React cannot call raw wallet mutation helper
```

### 29.6 Smoke scripts

Recommended future CrabLink Tauri smoke names:

```text
scripts/smoke-tauri-paid-site-visit.sh
scripts/smoke-tauri-paid-image-publish.sh
scripts/smoke-tauri-receipts-cache.sh
scripts/smoke-tauri-no-silent-spend.sh
scripts/smoke-tauri-amnesia-receipts.sh
```

---

## 30. Metrics

Recommended app-level metric names are illustrative.

```text
crablink_paid_prepare_total{action_kind,outcome}
crablink_paid_confirm_total{action_kind,outcome}
crablink_paid_execute_total{action_kind,outcome}
crablink_paid_receipt_cache_write_total{outcome}
crablink_paid_receipt_lookup_total{outcome}
crablink_paid_unlock_decision_total{source,outcome}
crablink_paid_command_latency_ms{command}
crablink_paid_redaction_total{field_class}
crablink_paid_stale_draft_rejected_total
crablink_paid_idempotency_conflict_total
```

Metric labels must avoid:

```text
full txid
full receipt hash
full b3 hash
passport private identifiers
bearer tokens
raw crab URLs if high-cardinality policy forbids them
private main→alt linkage
```

Use safe route class labels:

```text
site_visit
content_view
asset_publish
receipt_lookup
storage_pin
```

---

## 31. Config

Suggested app config shape:

```toml
[paid_actions]
enabled = true
require_explicit_confirmation = true
max_pending_age_seconds = 300
receipt_cache_limit = 32
receipt_cache_mode = "persistent_display_cache"
allow_developer_receipt_json = true
allow_offline_paid_queue = false

[paid_actions.routes]
gateway_first = true
oap_enabled = false
sidecar_enabled = false

[paid_actions.security]
redact_errors = true
deny_deep_link_spend = true
deny_auto_retry_without_idempotency = true
deny_cached_receipt_unlock = true
```

Config rules:

```text
production defaults fail closed
developer mode cannot disable explicit confirmation
amnesia mode overrides persistent receipt cache
OAP stays false until OAP_CLIENT_IDB implementation
sidecar stays false until SIDECAR_LOCAL_NODE_IDB implementation
vault stays false until PASSPORT_WALLET_VAULT_IDB implementation
```

---

## 32. Anti-scope

The following are explicitly forbidden in this IDB implementation phase:

```text
- Silent spend.
- Fake ROC balances.
- Fake wallet receipts.
- Fake ledger roots.
- Fake paid unlocks.
- Local receipt cache used as access truth.
- Deep links that authorize spend.
- Auto-pay on page load.
- Auto-pay on media load.
- Auto-pay on embedded asset load.
- Auto-pay on refresh.
- Direct ron-ledger mutation from CrabLink.
- Direct svc-storage mutation for paid writes from UI bypassing product route.
- Direct svc-index mutation from UI.
- Direct ron-accounting mutation from UI.
- Direct svc-rewarder mutation from UI.
- QuickChain implementation.
- ROX/Solana/external settlement.
- Staking/liquidity/exchange-facing logic.
- Seed phrase storage in React/TypeScript/localStorage.
- Uncapped spend authority in settings.
- Raw bearer/capability tokens in receipt cache.
- Raw secret values in logs/metrics/errors.
- Public main→alt linkage.
- Arbitrary JS/WASM/native execution unlocked by payment.
- Full-file media buffering through paid commands.
```

---

## 33. First implementation batch recommendation

### Batch P1 — Tauri paid-action adapter and receipt display cache

Do this only after the base Tauri shell/command bridge/settings adapters exist.

Likely files:

```text
apps/crablink-tauri/src/shared/paid/paidActionTypes.ts
apps/crablink-tauri/src/shared/paid/paidActionClient.ts
apps/crablink-tauri/src/shared/paid/receiptDisplayCache.ts
apps/crablink-tauri/src/shared/paid/receiptNormalize.ts
apps/crablink-tauri/src/shared/paid/paidErrors.ts

apps/crablink-tauri/src/pages/receipts/ReceiptsPage.jsx
apps/crablink-tauri/src/pages/receipts/receipts.css

apps/crablink-tauri/src/app/shell/RecentReceiptsSummary.jsx

apps/crablink-tauri/src-tauri/src/commands/paid_actions.rs
apps/crablink-tauri/src-tauri/src/commands/receipts.rs
apps/crablink-tauri/src-tauri/src/paid/mod.rs
apps/crablink-tauri/src-tauri/src/paid/redact.rs
apps/crablink-tauri/src-tauri/src/paid/cache.rs
apps/crablink-tauri/src-tauri/src/paid/types.rs
```

Initial scope:

```text
receipt display cache
receipt normalization
paid action confirmation snapshot type
no wallet custody
no raw wallet mutation UI
no OAP
no sidecar
no offline unlock
```

Acceptance:

```text
- App can store display copies of backend-returned receipts.
- Receipt page displays safe proof fields.
- Receipt cache has truth boundary.
- Cache clear works.
- Amnesia mode disables persistent cache.
- Deep link cannot create a paid action execution.
- Explicit confirmation snapshot exists for paid actions.
- No fake receipt can be written without proof fields.
- Tests cover redaction and cache boundaries.
```

### Batch P2 — Gateway paid site visit flow

Scope:

```text
paid site visit prepare/confirm/execute through gateway route
receipt display write
balance refresh after success
no double-charge on reload
```

Acceptance:

```text
- Visitor B pays Creator A through backend route.
- Backend receipt returned.
- Local display cache writes receipt copy.
- Receipt page shows site_visit.
- Balance refresh is backend-derived.
- Reload does not re-pay.
- Cancel path does not mutate wallet.
```

### Batch P3 — Paid publish flow carryover

Scope:

```text
paid image publish first
then post/comment/article as backend route contracts mature
```

Acceptance:

```text
- Prepare shows quote.
- Confirm creates backend payment path.
- Publish returns b3/crab URL.
- Receipt(s) displayed.
- Local catalog entry written as display cache only.
```

---

## 34. Final reviewer checklist

```text
[ ] Tauri remains the primary client direction.
[ ] Chrome extension proof behavior is preserved.
[ ] Gateway compatibility comes first.
[ ] React is display/intent only.
[ ] TypeScript owns no wallet truth.
[ ] Tauri Rust mediates, validates, and redacts.
[ ] svc-wallet remains mutation front-door.
[ ] ron-ledger remains durable truth.
[ ] Receipt cache is display-only.
[ ] Paid unlock is backend-owned.
[ ] Explicit confirmation is required.
[ ] No fake ROC.
[ ] No fake receipts.
[ ] No silent spend.
[ ] No deep-link spend authority.
[ ] No direct ledger/storage/index/accounting/rewarder mutation.
[ ] No QuickChain/ROX/Solana scope.
[ ] No arbitrary execution from paid access.
[ ] Amnesia behavior is honored.
[ ] Mobile-forward constraints are respected.
[ ] Tests prove no double spend on reload/retry.
```

---

## 35. Plain-English summary

Paid actions are where CrabLink becomes economically real.

That means this subsystem must be stricter than normal UI code.

The app may help the user:

```text
understand the price
confirm the action
send the request
see the result
copy the proof
remember recent receipts
```

The app must not become:

```text
a wallet
a ledger
a fake receipt generator
a silent-spend agent
a local entitlement oracle
a QuickChain implementation
an external settlement bridge
```

The rule is simple:

```text
User intent starts in CrabLink.
Economic truth comes from svc-wallet and ron-ledger.
Receipts are displayed locally, not invented locally.
Paid access is confirmed by backend, not by cache.
```
````
