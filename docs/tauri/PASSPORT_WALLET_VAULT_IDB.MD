````markdown
---
title: PASSPORT_WALLET_VAULT_IDB
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
  - PAID_ACTIONS_AND_RECEIPTS_IDB.MD
  - OAP_CLIENT_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
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
  - dev-label-only passport assumptions
  - Chrome-extension-only identity settings assumptions
does-not-delete:
  - current gateway-routed /identity/me proof
  - current gateway-routed /identity/passport/bootstrap proof
  - current gateway-routed /wallet/:account/balance proof
  - Chrome extension proof client
---

# PASSPORT_WALLET_VAULT_IDB

RO:WHAT — Defines CrabLink Tauri’s local RON Passport, wallet-link, vault, secret-custody, unlock, and alt-privacy model.

RO:WHY — CrabLink Tauri needs native local identity capability, but must not become a fake wallet, fake ledger, unsafe key store, public main→alt linker, or silent-spend agent. The Chrome extension proved dev labels and backend routes; Tauri must now define the safe boundary for real local custody.

RO:INTERACTS — CrabLink React app, TypeScript adapter layer, Tauri Rust commands, platform secure storage, local settings store, receipt display cache, svc-gateway, omnigate, svc-passport, ron-auth, ron-kms, svc-wallet, ron-ledger, ron-policy, ron-proto, ron-app-sdk, future OAP client, future sidecar, future offline cache.

RO:INVARIANTS — Passport is identity/capability state, not wallet truth. Wallet account is economic authority boundary, but `svc-wallet` remains mutation front-door. `ron-ledger` remains durable economic truth. React and TypeScript never own secrets. Vault material never enters URL params, localStorage, logs, metrics, unredacted errors, or arbitrary JSON debug panels. No fake balances, no fake receipts, no silent spend, no public main→alt linkage by default.

RO:METRICS — Vault lock/unlock outcomes, passport selection, passport creation outcomes, wallet-link verification outcomes, capability refresh outcomes, redaction events, failed unlock classes, secure-storage backend status, amnesia purges, alt creation/use counts, and safe command latency.

RO:CONFIG — Vault enabled flag, platform secure-storage backend, amnesia mode, auto-lock timeout, biometric/PIN enablement, dev-label compatibility mode, local passport persistence mode, alt passport policy, capability refresh policy, wallet-link verification policy, backup/export gates, and developer diagnostics.

RO:SECURITY — Secrets stay Rust-side. Platform secure storage is used for sealed material. Memory is zeroized where feasible. Commands are typed and redacted. Unlock requires user intent. Capabilities fail closed. Wallet spend still requires explicit paid-action confirmation. Main and alt passports are unlinkable by default at the app UX and storage model layers.

RO:TEST — Rust command tests, vault lock/unlock tests, secure-storage adapter tests, redaction tests, React no-secret tests, TypeScript adapter tests, passport switch tests, alt privacy tests, wallet-link tests, amnesia tests, dev-label compatibility tests, malformed deep-link tests, and local-stack identity/wallet smokes.

---

## 0. Status

This IDB defines the Tauri-native identity custody boundary for CrabLink.

It is required before implementing production local private-key custody, real local RON Passport persistence, wallet-linked permissions, anonymous alt passport management, biometric/PIN unlock, capability storage, or local signing authority.

Current proven checkpoint:

```text
CrabLink proof client
→ svc-gateway
→ omnigate
→ identity/wallet façade
→ svc-passport / svc-wallet integration path
→ ron-ledger-backed balance proof
```

Current proof already demonstrated:

```text
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
starter grant issued by svc-wallet
wallet balance displays 1776 ROC
ledger_backed = true
```

But current dev proof is still not production custody.

Known dev-only placeholders that this IDB must replace later:

```text
passport:main:dev
acct_dev
acct_creator_a
acct_visitor_b
dev bearer token
header-derived identity
URL-scoped dev windows
dev bootstrap labels
```

This IDB does not mean every vault feature should be implemented immediately.

It means that any implementation must preserve the boundaries defined here.

---

## 1. Plain-language rule

CrabLink Tauri may help the user hold and select passports.

CrabLink Tauri may protect local passport/capability material inside a vault.

CrabLink Tauri may ask backend services to verify identity, wallet links, balances, receipts, and permissions.

CrabLink Tauri must not become:

```text
a ledger
a fake wallet
a fake passport authority
a seed phrase dumping tool
a silent spend agent
a public alt-linkage oracle
a backend replacement
```

The safest mental model:

```text
Passport = identity/capability context.
Wallet account = economic account label/authority boundary.
Vault = local protection for secrets and capability material.
svc-wallet = wallet mutation/read front-door.
ron-ledger = durable economic truth.
svc-passport = identity/capability truth and policy integration.
```

---

## 2. Goals

### 2.1 Product goals

CrabLink Tauri should eventually support:

```text
local persistent RON Passports
one main identity passport
multiple anonymous/pseudonymous alt passports
wallet-linked passport permissions
local unlock/lock UX
safe identity switching
backend-verified wallet balances
backend-verified starter grant receipts
receipt display tied to active passport context
privacy-preserving alt usage
future OAP capability use
future mobile secure storage
```

### 2.2 Engineering goals

The implementation should provide:

```text
typed command bridge
strict Rust validation
centralized vault adapter
centralized passport adapter
centralized wallet-link adapter
centralized redaction
centralized safe storage categories
clean React hooks/components
no scattered direct storage access
no direct secret access from UI code
```

### 2.3 Security goals

The design must prevent:

```text
secret leakage into React
secret leakage into TypeScript
secret leakage into logs
secret leakage into URL params
secret leakage into debug JSON
public main→alt linkage by default
fake wallet balances
fake passport verification
silent spend
deep-link authorized identity operations
unbounded local authority
```

---

## 3. Non-goals

This IDB does not implement:

```text
QuickChain
ROX
Solana
public bridge
staking
liquidity
exchange-facing wallet behavior
hardware wallet support
seed phrase import/export
cloud sync
social recovery
threshold recovery
multi-device key sync
arbitrary code/facet execution
DRM or anti-rip guarantees
```

These may require future dedicated blueprints.

---

## 4. Definitions

### 4.1 RON Passport

A RON Passport is an identity/capability record used to identify and authorize user actions in RustyOnions.

A passport may have:

```text
subject
handle
display label
public profile
capabilities
wallet-link permissions
public manifest pointer
local metadata
backend verification status
```

A passport is not a wallet.

A passport is not a ledger.

A passport alone does not prove a spend occurred.

### 4.2 Main passport

The main passport is the user’s primary durable identity.

It may be associated with:

```text
public @handle
public profile manifest
creator identity
main wallet link
reputation/moderation summaries
public asset ownership
site ownership
```

The main passport should be treated as high-value identity material.

### 4.3 Alt passport

An alt passport is a separate pseudonymous or anonymous identity context.

Alt passports may be used for:

```text
private browsing
pseudonymous posting
separate creator identities
separate site visits
separate wallet accounts
testing Creator A / Visitor B flows
privacy-preserving paid actions
```

Alt passports must not publicly expose main passport linkage by default.

### 4.4 Wallet account

A wallet account is an economic account label or account identifier used through backend wallet routes.

A wallet account is not simply the same thing as a passport.

A passport may be linked to one or more wallet accounts depending on backend policy.

Wallet truth comes from:

```text
svc-wallet
ron-ledger
```

Not from:

```text
React state
TypeScript state
local settings
receipt display cache
passport display cache
```

### 4.5 Wallet link

A wallet link is a backend-verifiable association between a passport and a wallet account or spend/view permission.

Wallet links may express:

```text
can_view_balance
can_request_hold
can_spend
can_receive
can_create_asset
can_receive_payout
can_admin_site
can_use_starter_grant
```

A wallet link must fail closed when verification is unavailable.

### 4.6 Vault

The vault is the local encrypted/protected storage and runtime access boundary for sensitive passport/capability material.

The vault is implemented in Tauri Rust, backed by platform secure storage where available.

The vault is not React state.

The vault is not TypeScript state.

The vault is not a JSON settings file.

### 4.7 Vault item

A vault item is a sealed local record.

Possible future vault item classes:

```text
passport private key reference
capability token
refresh token
local passport metadata
wallet-link proof cache
public/private profile draft key material
alt passport secret material
```

Vault item values must be unavailable to React.

### 4.8 Capability

A capability is a backend-verifiable authorization token or proof.

Capabilities are not normal preferences.

Capabilities must be:

```text
bounded
scoped
expiring where appropriate
redacted
stored only in the vault when persistent
```

### 4.9 Active passport context

The active passport context is the currently selected identity context for UI and backend calls.

It may include safe display fields:

```text
passport label
subject
handle
wallet account label
verification status
active alt/main marker
safe capabilities summary
```

It must not include raw secret material.

### 4.10 Locked state

Locked state means the app may display safe public/local metadata, but cannot access vault secrets or perform privileged operations requiring vault unlock.

### 4.11 Unlocked state

Unlocked state means the user has explicitly unlocked the vault and Tauri Rust may access necessary secret/capability material for approved actions.

Unlocked does not mean:

```text
silent spend allowed
all capabilities exposed to React
all wallet accounts usable
main→alt linkage public
```

---

## 5. Non-negotiable invariants

### [I-1] Passport is not wallet truth

A passport may point to a wallet account.

A passport may request a wallet balance.

A passport may hold wallet-linked permissions.

But a passport does not define balance truth.

Balance truth comes from backend wallet/ledger path.

Forbidden:

```text
local passport says balance = 1776 ROC as truth
alt passport computes balance from receipts
React profile page invents wallet state
vault item acts as ledger state
```

Allowed:

```text
last backend-confirmed balance display
stale balance label
ledger-backed balance result from gateway
local display cache marked as cache
```

---

### [I-2] Wallet mutation remains backend-owned

CrabLink Tauri must not mutate `ron-ledger` directly.

CrabLink Tauri must not bypass `svc-wallet`.

Correct path:

```text
CrabLink Tauri
→ gateway/OAP route
→ svc-wallet
→ ron-ledger
```

Forbidden:

```text
Tauri local ledger writes
React wallet writes
TypeScript ledger adapters
direct ron-ledger calls
local account balance mutation
```

---

### [I-3] Vault is the only local secret boundary

Sensitive material must go through the Tauri Rust vault.

Forbidden storage locations:

```text
React component state
Redux/Zustand/global browser-style state
TypeScript module globals
localStorage
sessionStorage
URL params
query strings
clipboard by default
plain JSON settings
receipt cache
local catalog
logs
metrics
debug panels
screenshots generated by app
```

Allowed locations:

```text
platform secure storage
OS keychain / credential store through an adapter
sealed local file only if platform secure storage is unavailable and explicit policy permits
memory-only session vault in amnesia/dev modes
```

---

### [I-4] React never sees secrets

React may receive:

```text
safe passport label
safe handle
safe subject
safe active wallet label
safe capability summary
locked/unlocked boolean
backend verification status
safe error class
```

React must not receive:

```text
private keys
seed phrases
raw signing material
raw bearer/capability tokens
refresh secrets
wallet private material
main→alt private linkage proof
raw encrypted vault blobs
```

---

### [I-5] TypeScript never owns persistent authority

TypeScript may:

```text
call typed command wrappers
hold safe display state
normalize safe payloads
request lock/unlock
request backend verification
```

TypeScript must not:

```text
store secrets
sign payloads directly
persist capabilities
decrypt vault records
hold seed phrases
assemble privileged wallet mutations without confirmation
```

---

### [I-6] Tauri Rust mediates secrets, but does not become the backend

Tauri Rust may:

```text
protect local vault items
validate command payloads
redact errors
route backend calls
request signatures after user unlock
hold temporary secret material in bounded memory
zeroize temporary secret material where feasible
```

Tauri Rust must not become:

```text
svc-passport
svc-wallet
ron-ledger
ron-accounting
svc-rewarder
QuickChain
ROX/Solana bridge
```

---

### [I-7] No public main→alt linkage by default

The app must not publicly reveal that an alt belongs to a main identity unless the user explicitly chooses a public linking action and backend policy supports it.

Forbidden by default:

```text
public alt page lists main passport
main profile lists private alts
shared public handle metadata across alts
shared public avatar by automatic default
same public payout label by hidden default
local export that exposes alt graph without warning
debug panel that prints main→alt mapping
```

Allowed:

```text
local private alt list after vault unlock
explicit user-selected public alias/link
backend-verified public link route when intentionally created
dev-only Creator A / Visitor B windows clearly labeled
```

---

### [I-8] No silent spend after vault unlock

Unlocking the vault does not authorize spending.

Paid actions still require PAID_ACTIONS_AND_RECEIPTS_IDB confirmation.

Correct:

```text
unlock vault
select passport
prepare paid action
show price
user confirms
backend wallet route executes
backend receipt returns
```

Forbidden:

```text
unlock vault
auto-pay every paid link
auto-renew without explicit configured policy
auto-submit hold because capability exists
deep link triggers spend after unlock
```

---

### [I-9] Deep links cannot unlock or authorize vault actions

A `crab://` link may navigate.

It must not:

```text
unlock the vault
select hidden alt without confirmation
authorize spend
export passport
link wallet
import seed phrase
change recovery settings
make main→alt public
```

A deep link may pre-fill a safe view or action draft.

Privileged actions require in-app confirmation.

---

### [I-10] Dev labels are not production identity

Dev labels such as:

```text
passport:main:dev
acct_dev
acct_creator_a
acct_visitor_b
```

are compatibility aids.

They must be labeled as dev/test identity unless backend confirms production identity.

---

### [I-11] Starter grants are backend-issued only

The app may request a starter grant through backend route.

The app must not fake starter grants locally.

Correct:

```text
CrabLink Tauri
→ /identity/passport/bootstrap
→ svc-passport / svc-wallet path
→ svc-wallet issue
→ ron-ledger commit
→ receipt returned
→ balance refresh
```

Forbidden:

```text
local "new passport = 1776 ROC" display without backend issue
local balance override
local starter receipt
```

---

### [I-12] Capabilities fail closed

When capability state is missing, expired, malformed, or unverifiable, the app must deny privileged operations.

Allowed UI:

```text
needs unlock
needs backend verification
needs capability refresh
wallet link unavailable
permission denied
```

Forbidden UI:

```text
try anyway as privileged
fall back to fake spend permission
reuse old capability silently forever
```

---

### [I-13] Amnesia mode is real

In amnesia mode:

```text
no persistent vault secrets
no persistent passport private material
no persistent alt mapping
no persistent capability tokens
no persistent receipt cache unless explicitly display-only and amnesia policy allows session-only
```

On shutdown/lock:

```text
clear runtime secret material
drop active unlock handles
purge session-only vault items
redact diagnostics
```

---

### [I-14] Export and backup are gated

Passport export/backup is not first-batch scope.

Any future export must require:

```text
explicit user action
vault unlock
clear warning
redacted logs
encrypted export by default
no accidental clipboard leak
no automatic cloud sync
```

Seed phrase import/export is anti-scope until a dedicated recovery/backup blueprint exists.

---

## 6. Scope by phase

### 6.1 Phase V0 — Dev-label compatibility

Purpose:

```text
preserve existing proof client behavior while Tauri app is scaffolded
```

Allowed:

```text
safe passport labels
safe wallet labels
gateway /identity/me
gateway /identity/passport/bootstrap
gateway /wallet/:account/balance
receipt display from backend
dev Creator A / Visitor B windows
```

Forbidden:

```text
real private-key custody
seed phrase handling
production identity claims
silent spend
```

Acceptance:

```text
Tauri displays backend-confirmed identity/wallet state without storing secrets.
```

---

### 6.2 Phase V1 — Vault shell

Purpose:

```text
create the safe local boundary before storing real secrets
```

Allowed:

```text
vault status command
lock/unlock state machine
safe platform secure-storage capability detection
safe local metadata categories
redaction tests
amnesia purge tests
```

Forbidden:

```text
real signing keys
real capability persistence
seed phrase import/export
automatic cloud backup
```

Acceptance:

```text
App can show locked/unlocked/status states and prove React never receives secrets.
```

---

### 6.3 Phase V2 — Local persistent passport records

Purpose:

```text
store local passport metadata and backend-verified identity state safely
```

Allowed:

```text
main passport local record
alt passport local record
safe display labels
backend verification state
wallet-link summary
local private alt list behind unlock
```

Potentially allowed after security review:

```text
vault-sealed capability references
vault-sealed local signing key handles
```

Forbidden:

```text
public main→alt linkage by default
local balance truth
silent spend authority
unbounded persistent capabilities
```

Acceptance:

```text
Main and alt passports persist safely, lock correctly, and expose only safe summaries to React.
```

---

### 6.4 Phase V3 — Wallet-linked permissions

Purpose:

```text
let backend policy say what each passport can do with wallet accounts
```

Allowed:

```text
can_view_balance
can_receive
can_request_paid_action
can_create_asset
can_receive_creator_payout
can_admin_site
```

High-risk permission:

```text
can_spend
```

`can_spend` must never remove paid-action confirmation requirements.

Acceptance:

```text
Wallet links are backend-verified and fail closed.
```

---

### 6.5 Phase V4 — Real local capability use

Purpose:

```text
use locally protected capability material for authenticated requests
```

Allowed after OAP/security gates:

```text
capability refresh
signed request proof
backend verification
Rust-side OAP capability transport
```

Forbidden:

```text
React-visible capabilities
unbounded offline signing
wallet spend without confirmation
```

Acceptance:

```text
Local capabilities improve auth UX without weakening backend truth.
```

---

## 7. Data classification

### 7.1 Public display data

Examples:

```text
public handle
public profile title
public avatar CID
public profile manifest CID
public site links
public creator bio
public asset list
```

Storage:

```text
safe settings/cache
verified public cache
local profile cache
```

Can be shown to React:

```text
yes
```

---

### 7.2 Safe local preference data

Examples:

```text
theme
gateway URL
last route
receipt display cache limit
developer diagnostics flag
selected safe passport label
selected safe wallet label
```

Storage:

```text
settings adapter
```

Can be shown to React:

```text
yes
```

---

### 7.3 Sensitive local identity metadata

Examples:

```text
local main→alt mapping
private alt names
unpublished profile drafts
private wallet-link notes
private local identity notes
```

Storage:

```text
vault or vault-gated local store
```

Can be shown to React:

```text
only after unlock as safe display summaries
```

---

### 7.4 Secret material

Examples:

```text
private keys
seed material
capability tokens
refresh secrets
signing handles
unsealed auth tokens
wallet private material if ever supported
```

Storage:

```text
vault only
```

Can be shown to React:

```text
never
```

---

### 7.5 Backend truth data

Examples:

```text
wallet balance
starter grant issue result
receipt txid
receipt hash
ledger root
passport verification status
wallet-link status
```

Storage:

```text
backend is truth
local display cache allowed when labeled
```

Can be shown to React:

```text
yes, as backend-returned or clearly cached
```

---

## 8. Local storage categories

### 8.1 Settings store

Contains:

```text
safe preferences
gateway endpoint
UI state
display-only labels
feature flags
```

Must not contain:

```text
private keys
seed phrases
raw capabilities
refresh secrets
unredacted tokens
```

---

### 8.2 Public cache

Contains:

```text
public profiles
public manifests
public b3 metadata
public asset summaries
```

Must verify b3 where relevant.

---

### 8.3 Receipt display cache

Contains:

```text
backend-returned receipt display copies
safe txid/receipt hash/ledger root fields
truth boundary labels
```

Must not act as wallet truth.

---

### 8.4 Vault store

Contains:

```text
sealed passport/capability material
private local identity metadata
private alt mapping
wallet-link sensitive state
```

Accessed only by:

```text
Tauri Rust vault commands
```

---

### 8.5 Runtime memory

Contains:

```text
temporary unlock handles
temporary decrypted material
active command context
```

Rules:

```text
bounded lifetime
zeroize where feasible
clear on lock
clear on app shutdown
clear on amnesia purge
do not serialize to debug logs
```

---

## 9. Vault state machine

```text
Unavailable
  platform secure storage unavailable or disabled

Disabled
  vault feature disabled by config

Uninitialized
  vault feature enabled but no vault exists

Initializing
  user is creating local vault

Locked
  vault exists but secrets unavailable

Unlocking
  unlock attempt in progress

Unlocked
  vault is available for approved commands

Degraded
  vault exists but secure backend reports partial failure

Purging
  app is clearing vault/session material

Destroyed
  vault was intentionally removed
```

### 9.1 Valid transitions

```text
Unavailable → Disabled
Disabled → Uninitialized
Uninitialized → Initializing
Initializing → Locked
Locked → Unlocking
Unlocking → Unlocked
Unlocking → Locked
Unlocked → Locked
Unlocked → Purging
Locked → Purging
Purging → Uninitialized
Purging → Destroyed
Degraded → Locked
Degraded → Purging
```

### 9.2 Forbidden transitions

```text
Locked → privileged action without unlock
Unavailable → Unlocked
Disabled → Unlocked
Destroyed → Unlocked
deep link → Unlocked
receipt cache → Unlocked
```

### 9.3 Auto-lock

Vault should auto-lock on:

```text
timeout
app background after configured threshold
screen lock when platform signal exists
manual lock
amnesia purge
too many failed unlock attempts
```

Auto-lock must not:

```text
delete backend truth
delete public profile cache by default
delete receipt display cache unless amnesia mode requires it
```

---

## 10. Passport model

### 10.1 Main passport local record

Suggested display shape:

```json
{
  "schema": "crablink.local-passport-display.v1",
  "kind": "main",
  "subject": "passport:main:...",
  "handle": "@example",
  "label": "Main Passport",
  "public_profile_crab_url": "crab://@example",
  "active_wallet_account": "acct_...",
  "backend_verified": true,
  "vault_backed": true,
  "created_at": "2026-05-17T00:00:00.000Z",
  "updated_at": "2026-05-17T00:00:00.000Z"
}
```

This is display shape only.

It is not a backend DTO.

---

### 10.2 Alt passport local record

Suggested display shape:

```json
{
  "schema": "crablink.local-passport-display.v1",
  "kind": "alt",
  "subject": "passport:alt:...",
  "handle": "",
  "label": "Alt Passport",
  "public_profile_crab_url": "",
  "active_wallet_account": "acct_alt_...",
  "backend_verified": true,
  "vault_backed": true,
  "main_link_public": false,
  "created_at": "2026-05-17T00:00:00.000Z",
  "updated_at": "2026-05-17T00:00:00.000Z"
}
```

Alt display must not expose main linkage unless explicitly public.

---

### 10.3 Dev passport record

Suggested display shape:

```json
{
  "schema": "crablink.local-passport-display.v1",
  "kind": "dev",
  "subject": "passport:main:dev",
  "handle": "",
  "label": "Dev Passport",
  "active_wallet_account": "acct_dev",
  "backend_verified": true,
  "vault_backed": false,
  "dev_only": true
}
```

The UI must not present this as production custody.

---

## 11. Wallet-link model

### 11.1 Wallet-link summary

Suggested display shape:

```json
{
  "schema": "crablink.wallet-link-summary.v1",
  "passport_subject": "passport:main:...",
  "wallet_account": "acct_...",
  "backend_verified": true,
  "source": "svc-wallet.v1",
  "permissions": {
    "can_view_balance": true,
    "can_receive": true,
    "can_request_paid_action": true,
    "can_spend": false
  },
  "warnings": []
}
```

### 11.2 Permission rules

`can_view_balance`:

```text
allows balance refresh through backend route
does not allow spend
```

`can_receive`:

```text
allows display as payout/receive account if backend verifies
does not allow spend
```

`can_request_paid_action`:

```text
allows prepare/quote through paid-action flow
does not bypass confirmation
```

`can_spend`:

```text
high risk
must require explicit paid-action confirmation
must be backend-verified
must not be inferred from local vault existence
```

### 11.3 Fail-closed cases

Wallet link must fail closed when:

```text
backend unavailable
capability expired
passport locked and required capability unavailable
wallet account mismatch
payer mismatch
policy denies action
dev label used in production mode
```

---

## 12. Command boundary

### 12.1 Command families

Suggested command families:

```text
vault_get_status
vault_initialize
vault_unlock
vault_lock
vault_purge
vault_list_safe_items
vault_get_feature_status

passport_list
passport_get_active
passport_select
passport_create_main
passport_create_alt
passport_rename_local_label
passport_get_public_profile
passport_refresh_backend_status
passport_delete_local

wallet_link_list
wallet_link_verify
wallet_link_select_active
wallet_get_balance
wallet_refresh_permissions
```

Actual names should follow TAURI_COMMAND_BRIDGE_IDB conventions.

### 12.2 Command rules

All commands must:

```text
use typed input
use typed output envelopes
validate bounds in Rust
redact errors
attach correlation IDs
avoid raw secret return values
avoid direct backend truth invention
respect amnesia mode
respect feature flags
```

### 12.3 React raw invoke ban

React route components should not call raw `invoke`.

Preferred path:

```text
React component
→ hook / feature adapter
→ TypeScript command client
→ typed Tauri command
→ Rust vault/passport/wallet adapter
→ gateway/OAP/backend as needed
```

### 12.4 Secret-return ban

Vault commands must never return:

```text
private key
seed phrase
raw capability token
refresh token
unsealed auth material
raw encrypted vault blob
```

---

## 13. Suggested TypeScript adapter surface

This is a design target.

```ts
type VaultStatus =
  | 'unavailable'
  | 'disabled'
  | 'uninitialized'
  | 'locked'
  | 'unlocking'
  | 'unlocked'
  | 'degraded'
  | 'purging'
  | 'destroyed';

type PassportKind = 'main' | 'alt' | 'dev';

type SafePassportDisplay = {
  schema: 'crablink.local-passport-display.v1';
  kind: PassportKind;
  subject: string;
  handle?: string;
  label: string;
  activeWalletAccount?: string;
  backendVerified: boolean;
  vaultBacked: boolean;
  devOnly?: boolean;
  mainLinkPublic?: boolean;
};

type WalletLinkSummary = {
  schema: 'crablink.wallet-link-summary.v1';
  passportSubject: string;
  walletAccount: string;
  backendVerified: boolean;
  source: string;
  permissions: {
    canViewBalance: boolean;
    canReceive: boolean;
    canRequestPaidAction: boolean;
    canSpend: boolean;
  };
  warnings: string[];
};
```

Rules:

```text
These are safe display/adapter shapes only.
They must not contain secrets.
They must not replace backend DTOs.
```

---

## 14. Tauri Rust module targets

Likely future modules:

```text
apps/crablink-tauri/src-tauri/src/vault/mod.rs
apps/crablink-tauri/src-tauri/src/vault/types.rs
apps/crablink-tauri/src-tauri/src/vault/store.rs
apps/crablink-tauri/src-tauri/src/vault/redact.rs
apps/crablink-tauri/src-tauri/src/vault/platform.rs
apps/crablink-tauri/src-tauri/src/vault/memory.rs
apps/crablink-tauri/src-tauri/src/vault/amnesia.rs

apps/crablink-tauri/src-tauri/src/passport/mod.rs
apps/crablink-tauri/src-tauri/src/passport/types.rs
apps/crablink-tauri/src-tauri/src/passport/commands.rs
apps/crablink-tauri/src-tauri/src/passport/backend.rs
apps/crablink-tauri/src-tauri/src/passport/alt_privacy.rs

apps/crablink-tauri/src-tauri/src/wallet_link/mod.rs
apps/crablink-tauri/src-tauri/src/wallet_link/types.rs
apps/crablink-tauri/src-tauri/src/wallet_link/commands.rs
apps/crablink-tauri/src-tauri/src/wallet_link/backend.rs
```

No implementation should introduce dependencies without reviewing CODECHECK and project dependency policy.

---

## 15. Platform secure storage

### 15.1 Required abstraction

Do not scatter OS-specific calls.

Use a single adapter boundary:

```text
VaultStore
  seal(item)
  unseal(handle)
  delete(handle)
  list_safe_metadata()
  purge()
  status()
```

### 15.2 Platform expectations

Desktop:

```text
macOS: Keychain-compatible adapter when available
Windows: Credential Manager / DPAPI-compatible adapter when available
Linux: Secret Service / libsecret-compatible adapter when available, or explicit fallback policy
```

Mobile:

```text
iOS: Keychain-class storage
Android: Keystore-backed storage
```

### 15.3 Fallback policy

If platform secure storage is unavailable:

```text
production:
  fail closed unless user explicitly chooses a lower-security mode with warnings

development:
  memory-only or dev-sealed fallback allowed with loud labels

amnesia:
  memory-only
```

### 15.4 No silent downgrade

The app must not silently downgrade from platform secure storage to plaintext file.

---

## 16. Unlock methods

### 16.1 First-batch unlock

First-batch unlock may be:

```text
manual app passphrase/PIN gate
platform prompt if available
memory-only dev unlock
```

The chosen method must not expose secrets to React.

### 16.2 Biometric unlock

Biometric unlock is future-gated.

Rules:

```text
biometric is an unlock convenience
biometric is not sole recovery
biometric does not authorize spend
biometric failure must fail closed
```

### 16.3 PIN unlock

PIN unlock is future-gated.

Rules:

```text
PIN must be rate-limited
PIN must not be logged
PIN must not be sent to React after entry
PIN must not be stored plaintext
PIN must not be used for public identity claims
```

### 16.4 Recovery

Recovery is anti-scope for first implementation.

Do not add seed phrase import/export until a dedicated recovery IDB exists.

---

## 17. Main/alt privacy model

### 17.1 Local alt list

The user may see their local alt list after vault unlock.

React may receive safe alt summaries only.

Safe alt summary:

```text
label
kind
backend verified
active wallet label
public link status
last used timestamp
```

Not safe:

```text
private main linkage proof
private keys
raw capability tokens
secret recovery material
```

### 17.2 Public alt behavior

Default:

```text
alts are private/pseudonymous
main does not list alts
alt does not list main
```

Optional future explicit action:

```text
make this alt publicly linked to main
```

This must require:

```text
vault unlock
clear warning
backend route support
explicit user confirmation
receipt/audit proof if applicable
```

### 17.3 Shared wallet warning

If user links main and alt to the same wallet account, UI should warn:

```text
Using the same wallet account may reduce separation between identities.
```

This warning should be privacy-honest, not overclaiming.

### 17.4 Shared payout warning

If a public creator alt uses the same public payout address/account as main, UI should warn that observers may infer linkage.

---

## 18. Identity switching

### 18.1 Safe switch

Switching active passport must update:

```text
active passport label
active wallet account label
safe capability summary
route context where needed
receipt display filter
local catalog filter
paid-action payer context
```

### 18.2 Must not carry over

Switching active passport must not carry over:

```text
pending paid action confirmation
unsubmitted publish draft payer
private alt data into main public view
main wallet spend permission into alt
cached can_spend from previous passport
```

### 18.3 Confirmation on risky switch

If switching identity while a paid/publish action is pending:

```text
pause action
warn user
require fresh confirmation with new payer/passport
```

---

## 19. Gateway route expectations

Current/proven route families:

```text
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
```

Expected future identity route families may include:

```text
GET  /identity/passports
POST /identity/passports
GET  /identity/passports/:subject
POST /identity/passports/:subject/verify
GET  /identity/passports/:subject/wallet-links
POST /identity/passports/:subject/wallet-links/verify
GET  /wallet/:account/balance
GET  /wallet/:account/receipts
```

Exact routes must follow backend route contracts.

CrabLink Tauri must not invent production route truth.

---

## 20. Header and capability handling

Gateway compatibility may still use headers such as:

```text
Authorization
x-ron-passport
x-ron-wallet-account
x-correlation-id
```

Rules:

```text
do not log Authorization
do not persist raw Authorization in settings
do not expose raw capability tokens to React
do not use x-ron-passport as proof of production identity without backend verification
do not infer spend permission from header presence
```

---

## 21. Balance behavior

Balance route result must be backend-derived.

UI may show:

```text
Ledger-backed
Last refreshed
Balance unavailable
Stale balance
Dev fallback
```

UI must not show local computed balance as truth.

Receipt summaries may say:

```text
Recent local receipts total
```

but must label:

```text
not wallet truth
```

---

## 22. Starter grant behavior

Starter grant is a backend issue event.

Correct flow:

```text
user creates/bootstrap passport
backend creates/loads passport
backend creates/links wallet as policy allows
backend issues starter ROC through svc-wallet
ron-ledger commits issue event
backend returns receipt id/proof
app refreshes wallet balance
app displays backend-confirmed result
```

UI must show:

```text
grant issued by backend
amount
receipt id
wallet balance after refresh
ledger-backed status
```

If backend says no grant:

```text
show no grant issued
do not fake one
```

---

## 23. Capability refresh

Capability refresh must be:

```text
explicitly bounded
backend-verifiable
redacted
scoped to active passport
not global app authority
```

Capability refresh must fail closed when:

```text
vault locked
backend unavailable
policy denied
passport verification failed
alt privacy mismatch
```

---

## 24. Amnesia behavior

In amnesia mode:

```text
vault defaults to memory-only
no persistent secret storage
no persistent alt map
no persistent capability cache
no persistent wallet-link sensitive state
receipt display cache is session-only unless stricter policy clears it immediately
logs redacted aggressively
diagnostics avoid sensitive state
```

On lock/shutdown:

```text
zero/drop runtime secrets
clear memory vault
clear active capability handles
clear pending privileged commands
mark active passport as unavailable until reselected/reverified
```

Amnesia mode must be visible in UI:

```text
Amnesia mode: local identity secrets will not persist.
```

---

## 25. Offline behavior

Offline mode may show:

```text
safe local passport labels
public profile cache
local receipt display copies
last known backend verification status
```

Offline mode must not:

```text
verify new passport truth
verify wallet link truth
refresh balance
issue starter grant
mutate wallet
publish assets requiring backend
create public identity claims
make alt link public
claim access from stale capability unless future offline IDB defines it
```

If user attempts privileged action offline:

```text
show unavailable
allow safe draft save where appropriate
require fresh verification when online
```

---

## 26. Developer mode

Developer mode may show:

```text
dev labels
safe route diagnostics
backend JSON with secrets redacted
active route
correlation IDs
vault backend status
```

Developer mode must not show:

```text
private keys
seed phrases
raw capabilities
refresh tokens
unredacted Authorization
private alt link proof
```

Dev mode may support Creator A / Visitor B windows.

Those windows must state:

```text
URL-scoped labels do not fake backend truth.
```

---

## 27. UX requirements

### 27.1 Passport drawer

The passport drawer should show compact identity state:

```text
active passport label
main/alt/dev marker
active wallet account
balance status
ledger-backed marker
vault lock state
quick switch
link to full Passport page
link to Receipts page
```

The drawer should not become a debug dashboard.

### 27.2 Full Passport page

Recommended route:

```text
crab://passport
```

Sections:

```text
Main Passport
Alt Passports
Wallet Links
Vault Status
Public Profile
Developer Diagnostics
Danger Zone
```

### 27.3 Vault prompt

Vault prompt should clearly say:

```text
Unlock local passport vault
```

Not:

```text
Unlock wallet
```

because wallet truth remains backend-owned.

### 27.4 Alt creation prompt

Alt creation prompt must explain:

```text
Alt passports are separate local identity contexts.
They are not publicly linked to your main passport by default.
Using the same wallet/payout account may reduce privacy.
```

### 27.5 Wallet link warning

When linking wallet to passport:

```text
This lets this passport request backend wallet actions allowed by policy.
Paid actions still require confirmation.
```

---

## 28. Error taxonomy

Suggested error classes:

```text
vault_unavailable
vault_disabled
vault_uninitialized
vault_locked
vault_unlock_failed
vault_auto_locked
vault_degraded
vault_purge_failed
secure_storage_unavailable
secure_storage_downgrade_denied
passport_missing
passport_unverified
passport_create_failed
passport_select_failed
passport_alt_privacy_denied
wallet_link_missing
wallet_link_unverified
wallet_link_policy_denied
wallet_balance_unavailable
capability_missing
capability_expired
capability_refresh_failed
backend_unavailable
gateway_unavailable
deep_link_privilege_denied
amnesia_persistence_denied
redacted_internal_error
```

User-facing copy should be safe and direct.

Examples:

```text
The local passport vault is locked.
This passport is not verified by the backend yet.
The wallet link could not be verified.
Balance is unavailable because the wallet service is unreachable.
This action requires going online.
This deep link cannot unlock the vault or authorize identity changes.
```

---

## 29. Metrics

Suggested app-level metrics:

```text
crablink_vault_status_total{status}
crablink_vault_unlock_total{outcome}
crablink_vault_lock_total{reason}
crablink_vault_purge_total{outcome}
crablink_passport_select_total{kind,outcome}
crablink_passport_create_total{kind,outcome}
crablink_wallet_link_verify_total{outcome}
crablink_wallet_balance_refresh_total{outcome}
crablink_alt_privacy_warning_total{reason}
crablink_secret_redaction_total{field_class}
crablink_amnesia_purge_total{outcome}
```

Metrics must not include:

```text
full passport subject if high-cardinality or private
private alt labels
full wallet account if private policy forbids
full receipt hash
raw capability token
seed/key material
```

---

## 30. Config

Suggested config:

```toml
[passport]
enabled = true
dev_label_compatibility = true
allow_main_passport = true
allow_alt_passports = true
default_passport_kind = "main"

[passport.privacy]
public_main_alt_link_default = false
warn_on_shared_wallet = true
warn_on_shared_payout = true

[vault]
enabled = false
backend = "platform"
allow_memory_only_dev = true
allow_plaintext_fallback = false
auto_lock_seconds = 900
lock_on_sleep = true
lock_on_app_background = true

[vault.amnesia]
memory_only = true
purge_on_shutdown = true
persist_secret_material = false

[wallet_links]
enabled = true
verify_with_backend = true
fail_closed = true
allow_can_spend = false

[developer]
show_vault_status = true
show_redacted_backend_json = true
show_dev_passport_windows = true
```

Config rules:

```text
production vault plaintext fallback is false
amnesia overrides persistent vault storage
can_spend does not bypass confirmation
dev label compatibility must be visually labeled
```

---

## 31. Testing matrix

### 31.1 React tests

Test:

```text
passport drawer locked state
passport drawer unlocked safe summary
main/alt/dev markers
wallet link warning
shared wallet privacy warning
vault prompt copy
no secret fields rendered
dev label warning
```

### 31.2 TypeScript adapter tests

Test:

```text
safe passport normalization
wallet-link summary normalization
secret field rejection
redaction
dev label classification
alt privacy warning creation
```

### 31.3 Rust command tests

Test:

```text
vault status envelope
vault disabled behavior
vault unavailable behavior
vault lock/unlock transitions
secret-return ban
oversized payload rejection
malformed passport subject rejection
redacted errors
amnesia purge
platform fallback denial
```

### 31.4 Integration tests

Test with local stack:

```text
GET /identity/me
POST /identity/passport/bootstrap
GET /wallet/:account/balance
starter grant displays backend receipt
balance displays ledger-backed
passport switch refreshes wallet context
dev Creator A / Visitor B windows do not fake truth
```

### 31.5 Security tests

Test:

```text
React cannot access vault secrets
TypeScript cannot read raw capability
deep link cannot unlock vault
deep link cannot switch to hidden alt without confirmation
receipt cache cannot create wallet truth
local passport label cannot create balance truth
amnesia leaves no persistent vault item
logs contain no secrets
debug JSON redacts tokens
```

---

## 32. Smoke scripts

Recommended future smoke names:

```text
scripts/smoke-tauri-passport-dev-labels.sh
scripts/smoke-tauri-vault-status.sh
scripts/smoke-tauri-vault-amnesia.sh
scripts/smoke-tauri-wallet-link.sh
scripts/smoke-tauri-starter-grant.sh
scripts/smoke-tauri-alt-privacy.sh
```

Current backend smoke anchors:

```text
/healthz
/readyz
/identity/me
/identity/passport/bootstrap
/wallet/:account/balance
```

---

## 33. Security checklist

Before approving vault/passport work:

```text
[ ] Does React avoid all secret material?
[ ] Does TypeScript avoid persistent authority?
[ ] Are vault commands typed and redacted?
[ ] Are secrets stored only through vault adapter?
[ ] Is platform secure storage used where available?
[ ] Is plaintext fallback denied in production?
[ ] Does amnesia mode avoid persistent secrets?
[ ] Is main→alt linkage private by default?
[ ] Are shared wallet/payout privacy warnings present?
[ ] Is wallet balance backend-derived?
[ ] Is starter grant backend-issued only?
[ ] Does wallet mutation still go through svc-wallet?
[ ] Does ron-ledger remain backend-only?
[ ] Does vault unlock avoid silent spend?
[ ] Do paid actions still require confirmation?
[ ] Can deep links not unlock vault?
[ ] Can deep links not authorize wallet links?
[ ] Are dev labels clearly labeled?
[ ] Are capability refreshes bounded?
[ ] Are all errors redacted?
[ ] Are metrics free of secrets?
[ ] Is mobile secure-storage posture considered?
```

---

## 34. Product checklist

Before calling this product-ready:

```text
[ ] User can create/select a main passport.
[ ] User can create/select alt passports.
[ ] App explains alt privacy honestly.
[ ] App warns on shared wallet/payout risks.
[ ] App shows vault locked/unlocked state.
[ ] App can lock manually.
[ ] App auto-locks by policy.
[ ] App refreshes backend identity state.
[ ] App refreshes backend wallet balance.
[ ] App displays ledger-backed balance when backend confirms it.
[ ] App displays starter grant receipt when backend returns it.
[ ] App refuses to show fake balances.
[ ] App refuses to show fake identity verification.
[ ] App handles offline mode honestly.
[ ] App supports amnesia mode honestly.
[ ] Passport drawer stays clean.
[ ] Full passport page contains deeper controls.
```

---

## 35. Anti-scope

Forbidden in this implementation phase unless a later dedicated IDB explicitly allows it:

```text
- Seed phrase import.
- Seed phrase export.
- Plaintext private-key storage.
- Private keys in React.
- Private keys in TypeScript.
- Raw capabilities in React.
- Raw capabilities in TypeScript.
- Raw capabilities in local settings.
- Raw bearer tokens in logs.
- Public main→alt linkage by default.
- Silent spend after vault unlock.
- Deep-link vault unlock.
- Deep-link wallet link authorization.
- Local balance truth.
- Fake starter grant.
- Fake wallet receipt.
- Fake passport verification.
- Direct ron-ledger mutation.
- Direct svc-wallet mutation bypassing gateway/OAP policy route.
- Direct svc-storage/index mutation from UI.
- QuickChain implementation.
- ROX/Solana bridge.
- Staking/liquidity/exchange wallet features.
- Cloud sync of secrets.
- Automatic backup of secrets.
- Arbitrary code execution from passport capabilities.
```

---

## 36. First implementation batch recommendation

### Batch V1 — Vault status shell + safe passport display

Do this after the base Tauri shell, settings adapter, and command bridge exist.

Likely files:

```text
apps/crablink-tauri/src/shared/passport/passportTypes.ts
apps/crablink-tauri/src/shared/passport/passportClient.ts
apps/crablink-tauri/src/shared/passport/walletLinkTypes.ts
apps/crablink-tauri/src/shared/passport/walletLinkClient.ts
apps/crablink-tauri/src/shared/vault/vaultTypes.ts
apps/crablink-tauri/src/shared/vault/vaultClient.ts
apps/crablink-tauri/src/pages/passport/PassportPage.jsx
apps/crablink-tauri/src/pages/passport/passport.css
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx

apps/crablink-tauri/src-tauri/src/commands/passport.rs
apps/crablink-tauri/src-tauri/src/commands/vault.rs
apps/crablink-tauri/src-tauri/src/commands/wallet_link.rs
apps/crablink-tauri/src-tauri/src/vault/mod.rs
apps/crablink-tauri/src-tauri/src/vault/types.rs
apps/crablink-tauri/src-tauri/src/vault/redact.rs
apps/crablink-tauri/src-tauri/src/passport/mod.rs
apps/crablink-tauri/src-tauri/src/passport/types.rs
apps/crablink-tauri/src-tauri/src/wallet_link/mod.rs
apps/crablink-tauri/src-tauri/src/wallet_link/types.rs
```

Initial scope:

```text
vault status only
lock/unlock state shell
safe passport summaries
dev-label compatibility
wallet balance refresh through gateway
no real private-key custody yet
no seed phrases
no capability persistence
```

Acceptance:

```text
- Tauri can display vault disabled/uninitialized/locked states.
- React receives no secrets.
- Dev passport labels still work.
- Wallet balance remains backend-derived.
- Starter grant remains backend-issued.
- Passport drawer is clean.
- Passport page has room for main/alt/wallet/vault details.
- Amnesia mode disables persistent vault storage.
- Tests prove secret-return ban.
```

### Batch V2 — Platform secure-storage adapter

Scope:

```text
platform secure storage detection
adapter boundary
memory-only dev fallback
production fallback denial
amnesia behavior
redaction tests
```

Acceptance:

```text
- App can report secure-storage backend status.
- Production denies plaintext fallback.
- Amnesia uses memory-only.
- Secrets never cross command output.
```

### Batch V3 — Local main/alt passport records

Scope:

```text
safe local passport metadata
main passport
alt passports
active passport selection
private main→alt map behind vault
wallet-link summaries
privacy warnings
```

Acceptance:

```text
- Main and alt passports persist safely.
- Alts are not publicly linked by default.
- Shared wallet warning appears.
- Switching passport clears pending paid confirmations.
```

### Batch V4 — Backend wallet-link verification

Scope:

```text
verify passport↔wallet link through backend route
show can_view_balance/can_receive/can_request_paid_action
keep can_spend gated and false unless backend policy explicitly allows it
```

Acceptance:

```text
- Wallet link fails closed when backend unavailable.
- Balance refresh uses verified account context.
- Paid-action payer context updates after passport switch.
```

---

## 37. Final reviewer checklist

```text
[ ] Passport is identity/capability, not wallet truth.
[ ] Wallet account is economic boundary, not local balance truth.
[ ] svc-wallet remains wallet front-door.
[ ] ron-ledger remains durable truth.
[ ] React sees no secrets.
[ ] TypeScript owns no secrets.
[ ] Vault is Rust-side and centralized.
[ ] Platform secure storage is abstracted.
[ ] No silent storage downgrade.
[ ] No seed phrase feature sneaks in.
[ ] No public main→alt linkage by default.
[ ] Shared wallet/payout privacy warning exists.
[ ] Vault unlock does not authorize spend.
[ ] Paid actions still require confirmation.
[ ] Deep links cannot unlock or authorize.
[ ] Dev labels are marked dev-only.
[ ] Starter grants are backend-issued only.
[ ] Balance is backend-derived.
[ ] Receipt display remains display-only.
[ ] Amnesia mode is real.
[ ] Mobile storage posture is considered.
[ ] No QuickChain/ROX/Solana scope.
```

---

## 38. Plain-English summary

The passport/wallet/vault system is the bridge between identity, local privacy, and the ROC creator economy.

The app should make identity easy:

```text
choose main passport
create/use alt passports
see wallet-linked permissions
unlock local vault
verify backend identity and wallet state
```

But the app must stay honest:

```text
passport is not balance
vault unlock is not spend authorization
alt privacy is not magic if the user reuses public wallet/payout data
local cache is not backend truth
```

The final rule:

```text
CrabLink Tauri may protect local identity material.
svc-passport verifies identity/capability truth.
svc-wallet verifies wallet truth.
ron-ledger remains economic truth.
```
````
