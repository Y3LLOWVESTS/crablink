
````markdown
---
title: OFFLINE_CACHE_IDB
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
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OAP_CLIENT_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
  - TESTING_MATRIX_TAURI_IDB.MD
related-rusty-onions-docs:
  - INTEROP_BLUEPRINT.MD
  - APP_INTEGRATION_BLUEPRINT.MD
  - FULL_PROJECT_BLUEPRINT.MD
  - HARDENING_BLUEPRINT.MD
  - CONCURRENCY_AND_ALIASING_BLUEPRINT.MD
  - MICROKERNEL_BLUEPRINT.MD
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - browser-extension-only local display cache assumptions
  - unverified localStorage cache assumptions
does-not-delete:
  - gateway-first normal user mode
  - receipt display cache truth boundary
  - Chrome extension proof client
  - existing RustyOnions content-addressing invariants
---

# OFFLINE_CACHE_IDB

RO:WHAT — Defines CrabLink Tauri’s verified offline cache model for b3-addressed assets, manifests, public profiles, site snapshots, receipt display copies, drafts, cache quotas, eviction, corruption handling, amnesia behavior, and source labeling.

RO:WHY — Tauri gives CrabLink real local persistence and native filesystem access. Offline cache can make CrabLink resilient and fast, but only if local bytes are verified, source-labeled, bounded, and never confused with wallet truth, receipt truth, ownership truth, live name truth, or paid access truth.

RO:INTERACTS — CrabLink React app, TypeScript cache adapters, Tauri command bridge, Tauri Rust cache manager, storage/settings adapter, OAP client, sidecar/local node supervisor, media pipeline, gateway client, svc-gateway, omnigate, svc-storage, svc-index, svc-wallet, ron-ledger, svc-passport, ron-auth, ron-kms, ron-policy, ron-naming, ron-proto, ron-app-sdk, svc-edge.

RO:INVARIANTS — b3 hashes are canonical. Cached bytes are trusted only after full BLAKE3 verification. Names and crab:// URLs are pointers, not cache truth. Cache is display/resilience convenience only. Cache is not wallet truth. Cache is not receipt truth. Cache is not ownership truth. Cache does not unlock paid content by itself. Receipt display cache is display-only. Offline mode cannot spend, publish, mutate wallet, mutate ledger, mutate index, or create receipts.

RO:METRICS — Cache read/write outcomes, verification successes/failures, digest mismatches, quarantine count, cache hit/miss, source labels, quota pressure, eviction count, stale snapshot count, offline render count, paid-cache denial count, amnesia purge count, media-cache handoff count, and redaction events.

RO:CONFIG — Offline cache enabled flag, verified b3 cache flag, cache root, max bytes, max entries, retention windows, eviction policy, public/private cache categories, receipt display cache policy, draft persistence policy, named-site snapshot policy, paid offline policy, amnesia mode, media cache handoff, OAP/gateway source policy, and developer diagnostics.

RO:SECURITY — Local cached bytes are hostile until verified. Cache entries are source-labeled. Cache paths are derived from validated b3 IDs only. No path traversal. No secrets in cache. Private cache requires vault/security gates. Paid content remains gated. Cached receipts cannot authorize spend or unlock. Deep links cannot populate trusted cache without backend/OAP verification.

RO:TEST — Cache verification tests, digest mismatch tests, corrupted file quarantine tests, quota/eviction tests, amnesia purge tests, offline render tests, paid-content denial tests, receipt display boundary tests, named-site snapshot staleness tests, cache path safety tests, OAP/gateway source tests, media handoff tests, and security regression tests.

---

## 0. Status

This IDB defines the future offline verified cache model for CrabLink Tauri.

It is not a request to implement a full offline app immediately.

It is not a request to bypass RustyOnions services.

It is not a request to create local wallet, ledger, index, storage, or receipt truth.

Correct implementation order:

```text
1. Preserve gateway-first online behavior.
2. Mount React shell in Tauri.
3. Add command bridge.
4. Add settings/storage adapters.
5. Preserve paid gates and receipt display.
6. Add local display caches with truth boundaries.
7. Add verified public b3 cache.
8. Add offline public rendering for verified entries.
9. Add named-site snapshot display with staleness labels.
10. Add media cache handoff after MEDIA_TAURI_IDB.
11. Add private/encrypted cache only after vault/security gates.
```

Offline cache must start as:

```text
bounded
verified
public-first
display-only
source-labeled
amnesia-aware
gateway-compatible
paid-safe
```

Offline cache must not start as:

```text
wallet truth
ledger truth
receipt truth
ownership truth
name truth
private vault
DRM layer
sync engine
publisher
service replacement
```

---

## 1. Plain-language rule

Offline cache lets CrabLink show verified things when the network is unavailable.

It does not let CrabLink invent truth.

Correct mental model:

```text
b3 hash = content truth
verified cached bytes = local copy of content truth
crab:// URL = product pointer
name/site snapshot = stale display copy
receipt cache = proof display copy
wallet/ledger = economic truth
gateway/OAP/backend = live authority
```

Most important rule:

```text
A cached object may help render.
It cannot secretly spend, publish, claim ownership, update names, create receipts, or unlock paid content by itself.
```

---

## 2. Why this IDB exists

The Chrome extension proved:

```text
crab:// route UX
typed b3 asset pages
public profile rendering
site rendering
paid content gates
paid image/site/post/comment/article flows
receipt display cache
local catalog proof
```

Tauri changes the storage power level.

The app can now use:

```text
native app data directories
bounded file cache
stream-to-cache
verified b3 object storage
offline public profiles
offline named-site snapshots
local receipt display copies
offline draft storage
future media cache
future sidecar cache
future OAP stream cache
```

That power introduces risks:

```text
unverified bytes rendered as trusted
old named site snapshot shown as live
receipt display cache treated as entitlement
cached paid content bypassing access checks
local catalog treated as ownership/index truth
private secrets written to cache
cache bloat
corruption
path traversal
silent cache persistence in amnesia mode
mobile storage exhaustion
```

This IDB prevents those risks.

---

## 3. Goals

### 3.1 Product goals

CrabLink Tauri should eventually support:

```text
view recently opened public b3 assets offline
view cached public profiles offline
view cached public site snapshots offline
view local receipt display copies offline
view local drafts offline
recover from temporary gateway outage
make public asset pages faster
make b3 object rendering deterministic
show clear stale/offline labels
support cache controls and clear cache
support amnesia mode
```

### 3.2 Engineering goals

The implementation should provide:

```text
central Rust-side cache manager
strict b3 validation
full BLAKE3 verification before trusted render
safe path layout
bounded quotas
eviction policy
quarantine for corrupted entries
source labels
staleness labels
typed command outputs
redacted diagnostics
testable cache state machine
```

### 3.3 Security goals

The design must prevent:

```text
unverified content rendering as trusted
paid content unlock from local cache alone
wallet/ledger claims from cache
receipt creation from cache
ownership claims from cache
path traversal
secret leakage
unbounded disk growth
silent persistence during amnesia
offline publish
offline wallet mutation
offline name mutation
```

---

## 4. Non-goals

This IDB does not implement:

```text
wallet custody
ledger replay
QuickChain
ROX
Solana
public bridge
staking
liquidity
exchange-facing wallet behavior
full offline social network
offline name consensus
offline asset publishing
offline paid spending
DRM
anti-rip guarantees
arbitrary executable app cache
cloud sync
multi-device sync
```

Future dedicated blueprints are required for those.

---

## 5. Definitions

### 5.1 Offline cache

Offline cache is local storage of verified or display-only data used when network/backend access is unavailable or slow.

It is a client cache.

It is not a service of record.

### 5.2 Verified b3 cache

A verified b3 cache stores bytes under canonical b3 content ID only after recomputing BLAKE3 and confirming:

```text
computed BLAKE3 == expected b3:<64 lowercase hex>
```

### 5.3 Display cache

A display cache stores safe UI summaries.

Examples:

```text
recent receipt display copies
local catalog entries
last known profile display
last known site route snapshot
draft metadata
```

Display cache is not backend truth.

### 5.4 Public cache

Public cache stores content that is safe to render without private capability.

Examples:

```text
public images
public articles
public posts
public comments
public profile manifests
public site root snapshots
public linked manifests
```

### 5.5 Private cache

Private cache stores content tied to a passport, capability, paid access, or private context.

Private cache is future-gated.

It requires vault/security policy and must not be implemented casually.

### 5.6 Paid cache

Paid cache is cached content originally obtained through a paid gate.

Paid cache is high risk.

Default policy:

```text
allow_paid_receipt_display_cache = true
allow_paid_content_cache = false
allow_paid_unlock_from_cache = false
```

Paid content caching requires a future route contract that defines access duration and proof semantics.

### 5.7 Named-site snapshot

A named-site snapshot is a local display copy of a resolved site route or site manifest at a point in time.

It is not live name truth.

It must be labeled stale/offline when offline.

### 5.8 Receipt display cache

Receipt display cache stores safe display copies of backend-returned receipts.

It can be shown offline.

It cannot authorize spend.

It cannot create new receipts.

It cannot unlock paid content by itself.

### 5.9 Draft cache

Draft cache stores user-created local drafts before publication.

Drafts are not published assets.

Drafts are not b3-backed content truth until uploaded/stored and backend confirms.

### 5.10 Source label

A source label identifies where a cache entry came from.

Examples:

```text
gateway
oap
sidecar_gateway
sidecar_oap
manual_import_unverified
local_draft
receipt_display_copy
offline_verified_cache
```

### 5.11 Trust status

Trust status describes whether cache data is verified.

Examples:

```text
verified_b3
display_copy
stale_snapshot
unverified_import
quarantined
corrupt
pending_verification
```

### 5.12 Quarantine

Quarantine is where corrupted or mismatched cache entries are moved or marked so they cannot render as trusted.

### 5.13 Cache manifest

A cache manifest is local metadata describing cached entries.

It is app-local metadata, not RustyOnions content truth.

### 5.14 Cache root

The cache root is the app-owned local directory used for cache entries.

It must be controlled by Tauri Rust.

React must not write to cache root directly.

---

## 6. Non-negotiable invariants

### [I-1] b3 hashes are canonical

Trusted cached objects must be addressed by canonical b3 IDs:

```text
b3:<64 lowercase hex>
```

Forbidden:

```text
uppercase b3 IDs
truncated b3 IDs as cache keys
names as object cache keys
crab:// URLs as object cache keys
raw titles as object cache keys
filesystem paths from user input
```

---

### [I-2] Verify before trusted render

Any cached bytes used as trusted content must pass BLAKE3 verification before render.

Correct:

```text
read bytes
compute BLAKE3
compare to expected b3
only then mark verified_b3
render
```

Forbidden:

```text
download and render before verification
trust file name without hashing
trust HTTP ETag without recomputing
trust local metadata without bytes check
trust imported cache without verification
```

---

### [I-3] Cache is not ownership truth

Local cache does not prove who owns an asset.

Ownership truth comes from backend manifests/index/policy routes and signed/verified metadata.

The app may show:

```text
cached owner display from last backend response
stale owner display
unverified owner field
```

The app must not show:

```text
locally cached owner as current truth
cache presence as ownership proof
```

---

### [I-4] Cache is not wallet truth

Local cache must not claim current balance.

Allowed:

```text
last known backend balance
receipt display summary
offline balance unavailable
```

Forbidden:

```text
calculate authoritative balance from receipts
show cache-derived balance as current
use cache to decide spend permission
```

---

### [I-5] Cache is not receipt truth

Receipt display cache contains backend-returned receipt copies.

It does not create or verify new receipt truth.

Allowed:

```text
show cached receipt display copy
show receipt hash
show txid
show ledger root if backend returned it
show "not verified while offline"
```

Forbidden:

```text
generate receipt_hash locally
invent txid
create receipt from cache event
mark unverified local copy as backend-confirmed
```

---

### [I-6] Cache does not unlock paid content by itself

Default rule:

```text
cached receipt display copy + cached paid object != paid unlock
```

Paid content must not render solely because:

```text
receipt exists in local cache
file exists in local cache
site snapshot references it
user had access previously
```

Allowed future exception only if a backend route contract defines:

```text
offline entitlement proof
valid access window
content binding
passport binding
receipt binding
revocation/staleness policy
```

Until then:

```text
show paid gate / offline unavailable
```

---

### [I-7] Offline mode cannot spend

Offline cache mode must not:

```text
hold ROC
capture ROC
release ROC
transfer ROC
issue ROC
burn ROC
publish paid content
queue hidden payment
```

Offline mode may save safe drafts.

Any future queued action must require fresh confirmation when online.

---

### [I-8] Offline mode cannot publish

Publishing requires backend/storage/index/product route confirmation.

Offline drafts are not published.

Forbidden:

```text
offline asset is published
offline site pointer updated
offline profile manifest live
offline index pointer written
```

Allowed:

```text
save draft
compute local preview
compute tentative b3 for local bytes
mark unpublished
prepare for later upload
```

---

### [I-9] Names are snapshots, not truth

Named routes such as:

```text
crab://@username
crab://site_name
```

may be cached as snapshots.

Offline named snapshots must display:

```text
offline snapshot
last verified time
source
not live name truth
```

The app must not resolve a name offline as current truth unless future signed name-proof rules define it.

---

### [I-10] Local catalog is display convenience

Local catalog may help the user find recent assets/sites.

It is not:

```text
svc-index
ownership proof
provider truth
global discovery
moderation truth
payout truth
```

---

### [I-11] Cache paths must be safe

Cache paths must be derived from validated IDs and internal layout only.

Forbidden:

```text
path from crab:// URL
path from title
path from site name without encoding policy
path containing ..
path containing slash from user value
symlink traversal
```

---

### [I-12] Cache quotas are mandatory

Offline cache must have bounded disk use.

Config must include:

```text
max_cache_bytes
max_entries
per_category_limits
eviction policy
```

No unbounded cache.

---

### [I-13] Corruption fails closed

If bytes fail verification:

```text
do not render as trusted
mark corrupt
quarantine or delete
emit metric
show safe error
offer refetch when online
```

---

### [I-14] Amnesia mode is real

In amnesia mode:

```text
verified cache is session-only or disabled by policy
receipt display cache is session-only or cleared
draft cache policy is explicit
logs are redacted
cache is purged on shutdown when required
```

Amnesia mode must not silently persist offline cache.

---

### [I-15] React does not touch filesystem cache directly

React may request cache operations through adapters.

Correct path:

```text
React
→ TypeScript cache adapter
→ Tauri command
→ Rust cache manager
```

Forbidden:

```text
React writes files
React receives raw filesystem paths for arbitrary reads
React decides cache trust
React marks bytes verified
```

---

### [I-16] TypeScript does not own cache truth

TypeScript may normalize UI-safe DTOs.

It must not:

```text
compute trusted verification status
write trusted cache entries
bypass Rust validation
treat localStorage as verified cache
invent source labels
```

---

### [I-17] Cache is source-labeled

Every cache entry must know where it came from:

```text
gateway
oap
sidecar_gateway
sidecar_oap
local_draft
manual_import_unverified
receipt_display_copy
```

Source labels must be visible in developer diagnostics.

---

### [I-18] Private cache requires vault/security gates

Do not store private paid/passport/capability-bound content in ordinary cache.

Private cache requires:

```text
PASSPORT_WALLET_VAULT_IDB.MD
SECURITY_AND_AMNESIA_IDB.MD if created
explicit encryption/sealing policy
passport binding
clear wipe behavior
```

Until then, private cache is disabled.

---

### [I-19] Mobile storage pressure matters

Offline cache must work on mobile-forward architecture.

Do not assume:

```text
large disk
desktop paths
manual file cleanup
always-on background verification
unlimited media cache
```

Mobile cache defaults should be smaller and more conservative.

---

### [I-20] Cache is not QuickChain

Offline cache does not implement:

```text
distributed ledger
checkpoint chain
validator proof
ROX/Solana anchor
public bridge
staking
liquidity
exchange-facing state
```

---

## 7. Cache categories

### 7.1 Verified public object cache

Stores:

```text
raw bytes for public b3 objects
image bytes
article body bytes
post/comment body bytes
public manifests
public profile manifests
public site root document bytes
```

Requirements:

```text
canonical b3 key
full BLAKE3 verification
content-type metadata from backend or sniffed safely
source label
timestamp
size
quota accounting
```

---

### 7.2 Manifest cache

Stores:

```text
asset manifests
site manifests
profile manifests
linked asset manifests
rendition manifests
```

Requirements:

```text
b3 verification if manifest bytes are b3-addressed
schema marker
source label
last verified time
safe display fields
```

Manifest cache is not index truth.

---

### 7.3 Named-site snapshot cache

Stores:

```text
resolved named site route
site manifest summary
root document b3
route map snapshot
asset map snapshot
creator display summary
last verified time
```

Requirements:

```text
snapshot label
source label
staleness label
do not claim live route truth offline
```

---

### 7.4 Public profile snapshot cache

Stores:

```text
@username public profile display
avatar b3
bio
public links
public asset summaries
last verified time
```

Requirements:

```text
stale/offline label
source label
no private alt linkage
no private vault state
```

---

### 7.5 Receipt display cache

Stores:

```text
backend-returned receipt display copies
safe txid
safe receipt hash
safe ledger root
action kind
amount display
created time
target crab URL
source label
truth boundary
```

Requirements:

```text
display-only
not access proof by itself
not wallet truth
not receipt creation
```

---

### 7.6 Draft cache

Stores:

```text
unpublished post draft
unpublished comment draft
unpublished article draft
unpublished site draft
unpublished profile draft
upload staging metadata
```

Requirements:

```text
clear unpublished label
not b3 truth unless bytes locally hashed for preview
not backend published
safe wipe controls
private content policy
```

Drafts may contain user-created private content. Use conservative storage and wipe behavior.

---

### 7.7 Media cache

Future category.

Requires `MEDIA_TAURI_IDB.MD`.

May store:

```text
image renditions
audio segments
video segments
podcast files
stream chunks
thumbnails
waveforms
poster images
```

Requirements:

```text
bounded segment cache
range metadata
digest verification
paid media gate preservation
no fake DRM claims
```

---

### 7.8 Private cache

Future category.

Requires vault/security gates.

May store:

```text
passport-bound private content
paid content with valid offline entitlement proof
private profile drafts
encrypted local notes
```

Disabled by default.

---

### 7.9 Quarantine cache

Stores or marks:

```text
digest mismatch entries
partial downloads
truncated streams
schema-invalid manifests
unsafe imports
```

Rules:

```text
never render as trusted
bounded
user clearable
developer diagnostics only
```

---

## 8. Cache entry model

Suggested normalized cache manifest entry:

```json
{
  "schema": "crablink.offline-cache-entry.v1",
  "cache_key": "b3:0000000000000000000000000000000000000000000000000000000000000000",
  "kind": "object",
  "asset_kind": "image",
  "content_id": "b3:0000000000000000000000000000000000000000000000000000000000000000",
  "source": "gateway",
  "trust_status": "verified_b3",
  "byte_length": 12345,
  "content_type": "image/png",
  "created_at": "2026-05-17T00:00:00.000Z",
  "last_verified_at": "2026-05-17T00:00:00.000Z",
  "last_accessed_at": "2026-05-17T00:00:00.000Z",
  "expires_at": null,
  "stale_after": null,
  "path_class": "verified_public_object",
  "warnings": []
}
```

Rules:

```text
cache manifest is local metadata
cache manifest is not backend truth
content_id must be canonical when present
trust_status must be explicit
```

---

## 9. Trust statuses

Required statuses:

```text
verified_b3
display_copy
stale_snapshot
pending_verification
unverified_import
partial
quarantined
corrupt
expired
private_locked
amnesia_session_only
```

### 9.1 verified_b3

Means:

```text
bytes were hashed locally
hash matched expected b3
safe to render as cached content if policy allows
```

Does not mean:

```text
owner is current
name is current
paid access is current
wallet truth is current
```

### 9.2 display_copy

Means:

```text
safe UI summary copied from backend/app state
not independently authoritative
```

### 9.3 stale_snapshot

Means:

```text
named route/profile/site was resolved before
may be shown for convenience
not live truth
```

### 9.4 unverified_import

Means:

```text
user or external source imported data
not trusted
must not render as verified
```

### 9.5 quarantined/corrupt

Means:

```text
do not render
offer refetch/delete
developer diagnostics only
```

---

## 10. Cache state machine

```text
Disabled
  offline cache disabled

Unavailable
  platform/storage unavailable

Ready
  cache root valid and quota loaded

Fetching
  object/manifest fetch in progress

PendingVerification
  bytes staged but not verified

Verified
  bytes verified against b3

DisplayCopy
  display-only cache entry stored

Stale
  snapshot exists but live backend unavailable or stale window exceeded

Expired
  entry beyond retention policy

Quarantined
  entry failed verification or safety check

Evicting
  eviction in progress

Purging
  user/amnesia/system purge in progress
```

### 10.1 Valid transitions

```text
Disabled → Ready
Unavailable → Ready
Ready → Fetching
Fetching → PendingVerification
PendingVerification → Verified
PendingVerification → Quarantined
Ready → DisplayCopy
Verified → Stale
Stale → Expired
Verified → Evicting
DisplayCopy → Evicting
Expired → Evicting
Evicting → Ready
Ready → Purging
Purging → Ready
```

### 10.2 Forbidden transitions

```text
UnverifiedImport → Verified without hashing
DisplayCopy → Verified content
ReceiptDisplayCopy → PaidUnlock
StaleSnapshot → LiveNameTruth
Quarantined → RenderTrusted
DeepLink → TrustedCacheWrite
React → Verified
```

---

## 11. Write lifecycle

### 11.1 Public b3 object write

```text
1. Request object through gateway/OAP/sidecar source.
2. Receive bytes into staging file/buffer.
3. Enforce size bounds.
4. Compute BLAKE3.
5. Compare computed hash to expected b3.
6. If match, move into verified cache path.
7. Write manifest metadata.
8. Mark verified_b3.
9. Emit metric.
10. Render if route policy allows.
```

### 11.2 Digest mismatch

```text
1. Stop render.
2. Mark entry corrupt/quarantined.
3. Delete staged trusted path or move to quarantine.
4. Emit integrity metric.
5. Show safe error.
6. Offer refetch when online.
```

### 11.3 Display copy write

```text
1. Receive backend display-safe response.
2. Normalize to local display DTO.
3. Redact unsafe fields.
4. Add truth boundary.
5. Store in display cache category.
6. Mark display_copy.
```

### 11.4 Draft write

```text
1. User creates draft.
2. Validate size/category.
3. Store under draft category.
4. Mark unpublished.
5. Never show as backend-published.
```

---

## 12. Read lifecycle

### 12.1 Verified object read

```text
1. Validate requested b3.
2. Locate manifest entry.
3. Check trust_status == verified_b3.
4. Optionally reverify bytes based on policy.
5. Check policy allows cached render.
6. Return safe render handle or bytes path class.
7. Render with offline/source label.
```

### 12.2 Named-site snapshot read

```text
1. Validate crab:// site name.
2. Locate latest snapshot.
3. Mark offline/stale.
4. Render snapshot only if safe.
5. Do not claim live route truth.
6. Offer refresh when online.
```

### 12.3 Receipt display read

```text
1. List safe receipt display copies.
2. Show display-only truth boundary.
3. If online, offer verify.
4. If offline, show not currently verified.
```

### 12.4 Paid content read

Default:

```text
deny cached render unless backend/offline entitlement proof explicitly allows it
show paid/offline unavailable state
show cached receipt display copy if relevant
```

---

## 13. Verification model

### 13.1 b3 verification

Canonical process:

```text
computed = BLAKE3(bytes)
expected = content_id without b3: prefix
computed_hex_lowercase == expected_hex_lowercase
```

### 13.2 Manifest verification

If manifest has b3 ID:

```text
verify manifest bytes against manifest b3
parse schema
validate required fields
verify linked b3 fields are canonical
do not fetch/render unsafe linked content without verification
```

### 13.3 Linked asset verification

For linked assets:

```text
manifest verified
linked b3 canonical
linked object fetched
linked object verified
render only after object verification
```

### 13.4 Site snapshot verification

Site snapshot may include:

```text
site manifest b3
root document b3
route map b3 references
asset references
last verified name resolution
```

Rules:

```text
b3 parts can be verified as content
name pointer cannot be proven current while offline
```

### 13.5 Receipt verification

Receipt display copies are not reverified offline.

When online, receipt verification should use backend route if exposed.

Offline display must say:

```text
Local receipt display copy; backend verification unavailable offline.
```

---

## 14. Named-site offline snapshots

### 14.1 Purpose

Named-site snapshots let users reopen a previously loaded public site while offline.

### 14.2 Snapshot fields

Suggested shape:

```json
{
  "schema": "crablink.named-site-snapshot.v1",
  "site_crab_url": "crab://example",
  "site_name": "example",
  "resolved_at": "2026-05-17T00:00:00.000Z",
  "source": "gateway",
  "site_manifest_b3": "b3:0000000000000000000000000000000000000000000000000000000000000000",
  "root_document_b3": "b3:1111111111111111111111111111111111111111111111111111111111111111",
  "trust_status": "stale_snapshot",
  "warnings": [
    "Offline snapshot only. This is not live name truth."
  ]
}
```

### 14.3 Snapshot UI label

Required label:

```text
Offline snapshot — last verified <timestamp>. This may not be the current site.
```

### 14.4 Snapshot limits

Do not snapshot:

```text
private pages
paid content bodies by default
untrusted scripts
arbitrary executable facets
vault state
wallet state
```

### 14.5 Snapshot refresh

When online:

```text
resolve name through gateway/OAP
compare manifest/root b3
update snapshot if changed
show change indicator
```

---

## 15. Public profile offline snapshots

### 15.1 Purpose

Allow cached public profile display while offline.

### 15.2 Rules

Allowed:

```text
public handle
public avatar b3
public bio
public asset summaries
public profile manifest b3
last verified timestamp
```

Forbidden:

```text
private alt list
main→alt private linkage
wallet secrets
capability tokens
unpublished drafts unless user-owned draft category
```

### 15.3 UI label

Required label:

```text
Cached public profile — not live verification.
```

---

## 16. Receipt display cache offline behavior

### 16.1 Purpose

Receipts help users understand recent activity even offline.

### 16.2 Allowed offline display

```text
txid
receipt hash
ledger root if returned
action kind
amount display
target crab URL
created time
source route
truth boundary
```

### 16.3 Required truth boundary

```text
Local display copy only. Backend wallet and ledger remain authoritative.
```

### 16.4 Forbidden offline behavior

```text
claim receipt is newly verified
create receipt
unlock paid content
calculate current balance
submit refund/release/capture
```

---

## 17. Paid content cache policy

### 17.1 Default policy

```toml
allow_paid_content_cache = false
allow_paid_unlock_from_cache = false
allow_paid_receipt_display_cache = true
```

### 17.2 Paid metadata

Allowed:

```text
paid gate metadata
price display from last backend quote
cached receipt display copy
asset title/description
paid unavailable offline state
```

### 17.3 Paid body/content

Forbidden by default:

```text
cached paid article body render
cached paid video playback
cached paid image full render
cached paid post/comment body render
```

Future exception requires:

```text
backend-defined offline entitlement proof
clear expiration
passport binding
content binding
revocation/staleness handling
tests
```

### 17.4 Paid site snapshots

A paid site snapshot must not reveal paid gated content by default.

It may show:

```text
site shell
paid gate
cached public parts
receipt display copy
offline unavailable message
```

---

## 18. Draft cache

### 18.1 Purpose

Draft cache protects user work.

Examples:

```text
article draft
post draft
comment draft
site draft
profile draft
image upload metadata
manifest draft
```

### 18.2 Draft truth boundary

Drafts must be labeled:

```text
Local draft — not published.
```

### 18.3 Draft hashing

The app may compute local b3 for preview/staging.

A local b3 preview is not publication.

Display:

```text
Local preview hash
```

Not:

```text
Published asset hash
```

### 18.4 Draft privacy

Drafts may be private.

Use conservative storage:

```text
draft quota
clear drafts control
amnesia behavior
no debug leak
future vault/private cache gate for sensitive drafts
```

---

## 19. Import/export policy

### 19.1 First-batch import

Do not implement cache import in first batch.

### 19.2 Future import

Imported cache entries must be:

```text
unverified_import
```

until verified.

### 19.3 Export

Export should be future-gated.

If added, export must distinguish:

```text
verified public cache
display cache
drafts
private cache
```

Private cache export requires vault/recovery design.

---

## 20. Cache path layout

### 20.1 Object path

Recommended conceptual layout:

```text
cache/
  objects/
    b3/
      ab/
        cd/
          ef/
            b3_abcdef.../
              data
              meta.json
```

Rules:

```text
derive path from validated b3 only
never from title/name/url
use fan-out to avoid hot directories
do not accept slashes in IDs
do not accept uppercase IDs
```

### 20.2 Manifest path

```text
cache/
  manifests/
    b3/
      ab/
        cd/
          b3_abcdef.../
            manifest.json
            meta.json
```

### 20.3 Snapshots path

```text
cache/
  snapshots/
    sites/
      <safe-internal-key>/
        snapshot.json
    profiles/
      <safe-internal-key>/
        snapshot.json
```

Snapshot keys must be encoded/sanitized internally and must not allow path traversal.

### 20.4 Receipts path

```text
cache/
  receipts/
    display/
      recent.json
```

Receipts are display cache only.

### 20.5 Drafts path

```text
cache/
  drafts/
    <draft-id>/
      draft.json
      attachments/
```

Draft paths use app-generated IDs, not user titles.

---

## 21. Quotas

### 21.1 Required quotas

Config must support:

```text
max_cache_bytes
max_entries
max_object_bytes
max_snapshot_entries
max_receipt_display_entries
max_draft_bytes
max_quarantine_bytes
```

### 21.2 Suggested initial defaults

```toml
[offline_cache]
enabled = false
verified_b3_cache = true
max_cache_bytes = 1073741824
max_entries = 10000
max_object_bytes = 104857600
max_snapshot_entries = 256
max_receipt_display_entries = 64
max_draft_bytes = 104857600
max_quarantine_bytes = 104857600
```

Mobile defaults should be smaller.

### 21.3 Quota pressure

When quota pressure occurs:

```text
evict safe public cache first
preserve user drafts unless user policy says otherwise
preserve receipt display copies until their own limit
do not evict vault/private data from offline cache manager
```

---

## 22. Eviction policy

### 22.1 Default policy

Recommended:

```text
LRU within category
category-aware priority
never evict active write
never evict unuploaded draft without explicit draft policy
```

### 22.2 Eviction priority

Suggested order:

```text
1. expired public cache
2. least recently used public objects
3. stale named snapshots
4. old public profile snapshots
5. old receipt display copies beyond limit
6. quarantine over limit
7. drafts only under explicit user/draft policy
```

### 22.3 Eviction must not

```text
delete backend truth
delete published asset
delete wallet receipt from backend
delete user-managed local node data
delete vault data
```

Eviction is local only.

---

## 23. Corruption handling

### 23.1 Detection

Corruption may be detected by:

```text
BLAKE3 mismatch
missing data file
invalid meta
invalid schema
truncated staged file
unexpected size
unsafe path
```

### 23.2 Response

On corruption:

```text
mark corrupt
quarantine or delete
emit metric
show safe error
offer refetch
avoid panic
avoid render
```

### 23.3 Quarantine metadata

Suggested fields:

```json
{
  "schema": "crablink.cache-quarantine-entry.v1",
  "reason": "digest_mismatch",
  "expected_b3": "b3:...",
  "computed_b3": "b3:...",
  "detected_at": "2026-05-17T00:00:00.000Z",
  "source": "gateway"
}
```

### 23.4 User controls

User should be able to:

```text
clear corrupt entries
clear all cache
refetch if online
copy redacted diagnostic
```

---

## 24. Cache invalidation and staleness

### 24.1 b3 objects

A b3 object is immutable.

If verified, it does not become stale as content.

But metadata around it can become stale:

```text
owner display
provider set
payout address
tags
moderation status
name pointer
site route pointer
```

### 24.2 Named routes

Named routes can become stale.

Must show:

```text
last verified timestamp
offline snapshot warning
refresh available when online
```

### 24.3 Profiles

Profiles can become stale.

Must show:

```text
cached public profile
last verified timestamp
refresh available
```

### 24.4 Receipts

Receipt display copies can become stale in verification status, but a displayed receipt hash/txid remains a copied proof field.

Must show:

```text
not currently backend-verified while offline
```

---

## 25. Source selection relation

Offline cache integrates with source selection.

Possible source flow:

```text
try gateway/OAP if online
if unavailable, check verified cache
if verified cache exists and policy allows, render cached copy
else show offline unavailable
```

Rules:

```text
policy denial online must not fallback to cache to bypass
capability denial online must not fallback to cache to bypass
paid gate online must not fallback to paid body cache by default
digest mismatch must not fallback to stale unverified bytes
```

---

## 26. Gateway relation

Gateway remains the default source of backend-confirmed product responses.

Offline cache may store gateway-returned content after verification.

Rules:

```text
gateway response metadata is source-labeled
b3 content bytes are verified locally
gateway errors are not hidden by stale cache unless UI labels stale mode
policy/paid denial is respected
```

---

## 27. OAP relation

OAP can feed cache in the future.

Rules:

```text
OAP is Rust-side only
OAP frames bounded
stream chunks bounded
bytes verified before cache trust
partial streams quarantined
source label = oap or sidecar_oap
no OAP paid bypass
```

OAP cache writes require `OAP_CLIENT_IDB.MD` gates.

---

## 28. Sidecar relation

Sidecar may feed cache in the future.

Rules:

```text
source label = sidecar_gateway or sidecar_oap
local sidecar does not make unverified bytes trusted
sidecar does not grant paid unlock
sidecar does not make names current while offline
amnesia mode may purge sidecar-fed cache
```

Sidecar cache writes require `SIDECAR_LOCAL_NODE_IDB.MD` gates.

---

## 29. Media relation

Media cache requires `MEDIA_TAURI_IDB.MD`.

Rules:

```text
no full-file command buffering
range/segment cache
bounded media quota
digest verification
partial segment quarantine
paid media gates preserved
no DRM/anti-rip claims
```

Offline cache should expose primitives that media can use later:

```text
staged write
verify b3
store verified segment/object
evict by category
clear media cache
```

---

## 30. Passport/vault relation

Offline cache must obey passport/vault boundaries.

Rules:

```text
no secrets in ordinary cache
no raw capabilities
no private keys
no seed material
no private main→alt linkage
private cache disabled until vault gates
active passport can filter display copies but does not make cache authoritative
```

Receipt display copies may include safe passport/account labels only if redacted and user-approved by existing receipt policy.

---

## 31. Paid actions relation

Offline cache must obey paid-action boundaries.

Rules:

```text
no silent spend
no offline spend
no cached receipt unlock by itself
no fake receipt
no fake balance
no hold/capture/release offline
no paid route auto-submit when network returns
```

Offline drafts may be saved.

When online returns:

```text
require fresh quote
require explicit confirmation
use idempotency
receive backend receipt
```

---

## 32. Deep-link relation

Deep links may request a route.

Deep links must not:

```text
write trusted cache
import cache as trusted
unlock paid content
select private cache
read arbitrary local file
clear cache
export cache
change cache root
change quota
```

Deep links may:

```text
open cached public route if verified and policy allows
show offline unavailable
pre-fill draft
```

---

## 33. Command boundary

### 33.1 Suggested commands

Initial safe commands:

```text
offline_cache_get_status
offline_cache_get_config_summary
offline_cache_list_entries
offline_cache_get_entry
offline_cache_clear_display_cache
offline_cache_clear_verified_cache
offline_cache_clear_all
offline_cache_verify_entry
```

Future commands:

```text
offline_cache_fetch_b3
offline_cache_store_verified_object
offline_cache_get_render_handle
offline_cache_list_snapshots
offline_cache_get_site_snapshot
offline_cache_get_profile_snapshot
offline_cache_quarantine_entry
offline_cache_clear_quarantine
offline_cache_export_public_entry
```

### 33.2 Command rules

All commands must:

```text
use typed input
use typed output envelope
validate b3 in Rust
validate paths in Rust
redact errors
attach correlation ID
respect quotas
respect amnesia mode
respect paid/private policy
```

### 33.3 React raw filesystem ban

React must not receive arbitrary filesystem paths.

Possible safe outputs:

```text
cache entry ID
safe app asset URL
blob URL mediated by app
render handle
sanitized preview metadata
```

Do not return:

```text
arbitrary local path
user home path
raw cache root
private vault path
```

### 33.4 Forbidden commands

Forbidden:

```text
offline_cache_trust_file
offline_cache_mark_paid_unlocked
offline_cache_set_balance
offline_cache_create_receipt
offline_cache_write_index
offline_cache_publish
offline_cache_raw_read_path
offline_cache_raw_write_path
```

---

## 34. Suggested TypeScript adapter surface

Design target:

```ts
type OfflineCacheTrustStatus =
  | 'verified_b3'
  | 'display_copy'
  | 'stale_snapshot'
  | 'pending_verification'
  | 'unverified_import'
  | 'partial'
  | 'quarantined'
  | 'corrupt'
  | 'expired'
  | 'private_locked'
  | 'amnesia_session_only';

type OfflineCacheSource =
  | 'gateway'
  | 'oap'
  | 'sidecar_gateway'
  | 'sidecar_oap'
  | 'local_draft'
  | 'manual_import_unverified'
  | 'receipt_display_copy'
  | 'offline_verified_cache';

type OfflineCacheEntry = {
  schema: 'crablink.offline-cache-entry.v1';
  cacheKey: string;
  kind: 'object' | 'manifest' | 'site_snapshot' | 'profile_snapshot' | 'receipt_display' | 'draft' | 'media' | 'quarantine';
  contentId?: string;
  assetKind?: string;
  source: OfflineCacheSource;
  trustStatus: OfflineCacheTrustStatus;
  byteLength?: number;
  contentType?: string;
  createdAt: string;
  lastVerifiedAt?: string;
  lastAccessedAt?: string;
  warnings: string[];
};
```

Rules:

```text
TypeScript types are UI-safe adapter shapes.
TypeScript does not mark entries trusted.
Rust verifies trust.
Backend remains truth.
```

---

## 35. Tauri Rust module targets

Likely future modules:

```text
apps/crablink-tauri/src-tauri/src/offline_cache/mod.rs
apps/crablink-tauri/src-tauri/src/offline_cache/types.rs
apps/crablink-tauri/src-tauri/src/offline_cache/config.rs
apps/crablink-tauri/src-tauri/src/offline_cache/paths.rs
apps/crablink-tauri/src-tauri/src/offline_cache/verify.rs
apps/crablink-tauri/src-tauri/src/offline_cache/store.rs
apps/crablink-tauri/src-tauri/src/offline_cache/manifest.rs
apps/crablink-tauri/src-tauri/src/offline_cache/snapshots.rs
apps/crablink-tauri/src-tauri/src/offline_cache/receipts.rs
apps/crablink-tauri/src-tauri/src/offline_cache/drafts.rs
apps/crablink-tauri/src-tauri/src/offline_cache/quota.rs
apps/crablink-tauri/src-tauri/src/offline_cache/evict.rs
apps/crablink-tauri/src-tauri/src/offline_cache/quarantine.rs
apps/crablink-tauri/src-tauri/src/offline_cache/amnesia.rs
apps/crablink-tauri/src-tauri/src/offline_cache/redact.rs
apps/crablink-tauri/src-tauri/src/offline_cache/errors.rs

apps/crablink-tauri/src-tauri/src/commands/offline_cache.rs
```

Likely TypeScript files:

```text
apps/crablink-tauri/src/shared/offlineCache/offlineCacheTypes.ts
apps/crablink-tauri/src/shared/offlineCache/offlineCacheClient.ts
apps/crablink-tauri/src/shared/offlineCache/offlineCacheErrors.ts
apps/crablink-tauri/src/shared/offlineCache/offlineCacheLabels.ts
```

No dependencies should be added without reviewing CODECHECK and project dependency policy.

---

## 36. Config

Suggested config:

```toml
[offline_cache]
enabled = false
verified_b3_cache = true
cache_root = ""
max_cache_bytes = 1073741824
max_entries = 10000
max_object_bytes = 104857600
eviction_policy = "category_lru"
developer_diagnostics = true

[offline_cache.categories]
public_objects = true
manifests = true
site_snapshots = true
profile_snapshots = true
receipt_display = true
drafts = true
media = false
private_cache = false
quarantine = true

[offline_cache.paid]
allow_paid_receipt_display_cache = true
allow_paid_content_cache = false
allow_paid_unlock_from_cache = false

[offline_cache.snapshots]
allow_named_site_snapshots = true
allow_profile_snapshots = true
stale_after_seconds = 86400
max_site_snapshots = 128
max_profile_snapshots = 128

[offline_cache.receipts]
max_receipt_display_entries = 64
allow_offline_display = true
allow_offline_verification_claim = false

[offline_cache.drafts]
enabled = true
max_draft_bytes = 104857600
persist_in_amnesia = false

[offline_cache.quarantine]
enabled = true
max_quarantine_bytes = 104857600

[offline_cache.amnesia]
memory_only = true
purge_on_shutdown = true
persist_verified_cache = false
persist_receipt_display = false
persist_drafts = false

[offline_cache.security]
deny_unverified_render = true
deny_cached_paid_unlock = true
deny_cache_as_wallet_truth = true
deny_cache_as_ownership_truth = true
deny_deep_link_cache_trust = true
redact_diagnostics = true
```

Config rules:

```text
offline cache disabled by default until implemented
verified b3 cache true for trusted content
paid unlock from cache false by default
private cache false by default
amnesia overrides persistence
mobile may force smaller quotas
```

---

## 37. Error taxonomy

Suggested app-safe errors:

```text
offline_cache_disabled
offline_cache_unavailable
offline_cache_config_invalid
offline_cache_quota_exceeded
offline_cache_entry_not_found
offline_cache_b3_invalid
offline_cache_digest_mismatch
offline_cache_pending_verification
offline_cache_unverified_render_denied
offline_cache_corrupt
offline_cache_quarantined
offline_cache_path_denied
offline_cache_snapshot_stale
offline_cache_paid_unlock_denied
offline_cache_wallet_truth_denied
offline_cache_receipt_truth_denied
offline_cache_ownership_truth_denied
offline_cache_private_locked
offline_cache_amnesia_persistence_denied
offline_cache_eviction_failed
offline_cache_purge_failed
offline_cache_import_denied
offline_cache_export_denied
offline_cache_redacted_internal_error
```

### 37.1 User-facing copy examples

```text
This cached item could not be verified.
This page is an offline snapshot and may not be current.
This receipt is a local display copy; backend verification is unavailable offline.
Paid content cannot be unlocked from local cache alone.
Offline mode cannot refresh your wallet balance.
This draft is local and not published yet.
Cache is disabled in amnesia mode.
```

### 37.2 Developer diagnostics

May include:

```text
cache key
source label
trust status
safe b3 ID
byte length
category
quota state
redacted error reason
correlation ID
```

Must not include:

```text
private keys
seed material
raw capabilities
Authorization
private alt linkage
unredacted private draft content
arbitrary local paths
```

---

## 38. Metrics

Suggested metrics:

```text
crablink_offline_cache_enabled{mode}
crablink_offline_cache_read_total{category,outcome}
crablink_offline_cache_write_total{category,outcome}
crablink_offline_cache_hit_total{category}
crablink_offline_cache_miss_total{category}
crablink_offline_cache_verify_total{category,outcome}
crablink_offline_cache_digest_mismatch_total{category}
crablink_offline_cache_quarantine_total{reason}
crablink_offline_cache_eviction_total{category,reason}
crablink_offline_cache_bytes{category}
crablink_offline_cache_quota_pressure_total{category}
crablink_offline_cache_snapshot_stale_total{kind}
crablink_offline_cache_paid_denial_total{reason}
crablink_offline_cache_amnesia_purge_total{outcome}
crablink_offline_cache_redaction_total{field_class}
```

Metric label safety:

```text
avoid full b3 if cardinality policy forbids
avoid crab URLs
avoid user titles
avoid wallet accounts
avoid passport subjects
avoid receipt hashes
avoid local paths
avoid private labels
```

Use categories:

```text
object
manifest
site_snapshot
profile_snapshot
receipt_display
draft
media
quarantine
```

---

## 39. UI requirements

### 39.1 Offline indicator

The app should clearly show when it is offline or using cached data.

Examples:

```text
Offline
Cached
Verified b3 cache
Offline snapshot
Display copy only
```

### 39.2 Asset page label

For cached b3 asset:

```text
Verified cached copy — b3 matched.
```

### 39.3 Named site label

For cached site snapshot:

```text
Offline snapshot — last verified <timestamp>. This may not be current.
```

### 39.4 Receipt label

For cached receipt display:

```text
Local display copy only. Backend wallet and ledger remain authoritative.
```

### 39.5 Paid content label

For paid content unavailable offline:

```text
This paid content requires backend access verification before it can be displayed.
```

### 39.6 Cache settings page

Settings should expose:

```text
offline cache enabled/disabled
cache size
category sizes
clear public cache
clear receipt display cache
clear drafts
clear all cache
amnesia behavior
developer diagnostics
```

### 39.7 Developer diagnostics

Developer diagnostics may show:

```text
source label
trust status
b3 verification result
quota state
eviction count
quarantine entries
redacted cache manifest
```

---

## 40. Mobile constraints

Mobile offline cache must account for:

```text
smaller storage budgets
OS cache eviction
app lifecycle interruptions
background task limits
battery impact
network switching
platform sandbox paths
```

Mobile defaults:

```text
smaller max cache
shorter snapshot retention
media cache disabled until media IDB
private cache disabled
sidecar disabled
gateway-first refresh
```

Mobile must not require local sidecar.

---

## 41. Amnesia behavior

### 41.1 Amnesia defaults

In amnesia mode:

```text
verified cache session-only or disabled
receipt display cache session-only or disabled
draft persistence disabled unless user explicitly keeps draft outside amnesia policy
snapshots session-only
logs redacted
cache purged on shutdown
```

### 41.2 Purge triggers

Purge on:

```text
app shutdown
manual clear
amnesia toggle on
vault lock if private cache later exists
profile switch if policy requires
corruption detection
quota emergency
```

### 41.3 Purge must not

```text
delete backend content
delete backend receipts
delete wallet truth
delete ledger truth
delete user-managed sidecar data
delete arbitrary user files
```

---

## 42. Security checklist

Before approving offline cache work:

```text
[ ] Does every trusted render require b3 verification?
[ ] Are cache paths derived from validated IDs only?
[ ] Does React avoid direct filesystem access?
[ ] Does TypeScript avoid declaring trust?
[ ] Are cache entries source-labeled?
[ ] Are trust statuses explicit?
[ ] Are names/snapshots labeled stale offline?
[ ] Is receipt display cache display-only?
[ ] Can cache not unlock paid content by itself?
[ ] Can cache not claim wallet truth?
[ ] Can cache not claim ownership truth?
[ ] Can offline mode not spend?
[ ] Can offline mode not publish?
[ ] Are quotas mandatory?
[ ] Is eviction category-aware?
[ ] Are corrupt entries quarantined?
[ ] Is amnesia mode honored?
[ ] Are private cache categories disabled until vault gates?
[ ] Are metrics safe?
[ ] Are local paths redacted?
[ ] Are mobile constraints respected?
```

---

## 43. Product checklist

Before calling offline cache product-ready:

```text
[ ] Public b3 image can be cached and reopened offline.
[ ] Public manifest can be cached and reopened offline.
[ ] Cached b3 bytes are verified before render.
[ ] Digest mismatch refuses render.
[ ] Named site snapshot displays stale/offline label.
[ ] Public profile snapshot displays cached/offline label.
[ ] Receipt display page works offline with truth boundary.
[ ] Paid content does not unlock from cache alone.
[ ] Balance display does not claim current backend truth offline.
[ ] Drafts are labeled unpublished.
[ ] Cache settings show size and clear controls.
[ ] Amnesia mode purges cache as configured.
[ ] Quota pressure evicts safely.
[ ] Mobile can run with conservative cache defaults.
```

---

## 44. Testing matrix

### 44.1 React tests

Test:

```text
offline indicator
verified cache label
stale site snapshot label
cached profile label
receipt truth boundary
paid content offline denial
draft unpublished label
cache settings controls
```

### 44.2 TypeScript adapter tests

Test:

```text
cache entry normalization
trust status display mapping
source label mapping
error mapping
receipt display normalization
safe b3 validation precheck
no secret field display
```

### 44.3 Rust unit tests

Test:

```text
b3 validator
path derivation
digest verification
manifest entry read/write
quota accounting
eviction ordering
quarantine marking
amnesia purge plan
redaction
error mapping
```

### 44.4 Rust integration tests

Test:

```text
store verified object
reject digest mismatch
reject uppercase b3
reject path traversal
read verified object
quarantine corrupt file
evict under quota
clear cache category
purge under amnesia
site snapshot stale read
receipt display read offline
```

### 44.5 Security regression tests

Test:

```text
deep link cannot trust cache
unverified import cannot render
receipt cache cannot unlock paid content
cache cannot set balance
cache cannot create receipt
cache cannot publish
cache cannot write index
React cannot receive raw local path
private cache disabled without vault
amnesia leaves no persistent cache
```

### 44.6 Smoke scripts

Recommended future scripts:

```text
scripts/smoke-tauri-offline-cache-status.sh
scripts/smoke-tauri-offline-cache-b3-verify.sh
scripts/smoke-tauri-offline-cache-digest-mismatch.sh
scripts/smoke-tauri-offline-cache-site-snapshot.sh
scripts/smoke-tauri-offline-cache-receipts.sh
scripts/smoke-tauri-offline-cache-no-paid-unlock.sh
scripts/smoke-tauri-offline-cache-amnesia.sh
scripts/smoke-tauri-offline-cache-quota.sh
```

---

## 45. First implementation batch recommendation

### Batch C1 — Offline cache status shell

Do this after base Tauri command bridge and storage/settings adapters exist.

Likely files:

```text
apps/crablink-tauri/src/shared/offlineCache/offlineCacheTypes.ts
apps/crablink-tauri/src/shared/offlineCache/offlineCacheClient.ts
apps/crablink-tauri/src/shared/offlineCache/offlineCacheErrors.ts

apps/crablink-tauri/src-tauri/src/commands/offline_cache.rs
apps/crablink-tauri/src-tauri/src/offline_cache/mod.rs
apps/crablink-tauri/src-tauri/src/offline_cache/types.rs
apps/crablink-tauri/src-tauri/src/offline_cache/config.rs
apps/crablink-tauri/src-tauri/src/offline_cache/errors.rs
apps/crablink-tauri/src-tauri/src/offline_cache/redact.rs
```

Initial commands:

```text
offline_cache_get_status
offline_cache_get_config_summary
offline_cache_get_size_summary
```

Acceptance:

```text
- Offline cache disabled by default.
- Status is truthful.
- Config summary is redacted.
- No filesystem paths leak to React.
- Amnesia mode reports session-only/disabled policy.
```

---

### Batch C2 — Verified public b3 object cache

Scope:

```text
cache public b3 object bytes
verify BLAKE3 before trust
safe path layout
read verified entry
digest mismatch quarantine
```

Acceptance:

```text
- Public b3 object can be cached.
- Cache path derives from b3 only.
- BLAKE3 mismatch refuses trusted render.
- Corrupt entry quarantines.
- React receives safe render handle, not raw arbitrary path.
```

---

### Batch C3 — Receipt display cache migration

Scope:

```text
move recent receipts into centralized cache adapter
truth boundary
offline display
clear controls
```

Acceptance:

```text
- Receipts page can show cached display copies offline.
- Receipt display says backend remains authoritative.
- Cached receipt cannot unlock paid content.
- Cached receipt cannot set balance.
```

---

### Batch C4 — Named-site/profile snapshots

Scope:

```text
cache public named-site snapshot
cache public profile snapshot
stale/offline labels
refresh path when online
```

Acceptance:

```text
- Cached site snapshot renders offline with stale label.
- Cached profile renders offline with cached label.
- App does not claim live name truth offline.
```

---

### Batch C5 — Quotas, eviction, and amnesia

Scope:

```text
quota accounting
category-aware eviction
clear controls
amnesia purge
```

Acceptance:

```text
- Cache cannot grow unbounded.
- Eviction preserves draft policy.
- Amnesia purges persistent cache.
- Metrics report quota pressure.
```

---

### Batch C6 — OAP/sidecar/media handoff

Scope only after related IDBs:

```text
OAP stream-to-cache
sidecar source labels
media segment cache
offline media preview
```

Acceptance:

```text
- Source labels survive.
- Partial streams quarantine.
- Media does not full-buffer through command bridge.
- Paid media gates remain enforced.
```

---

## 46. Review checklist

Before approving any offline cache implementation:

```text
[ ] Offline cache is disabled or conservative by default.
[ ] Gateway mode remains primary.
[ ] b3 verification happens before trusted render.
[ ] Cache path layout is safe.
[ ] Quotas are mandatory.
[ ] Eviction is category-aware.
[ ] Corruption quarantines.
[ ] Display caches are labeled.
[ ] Named snapshots are stale/offline labeled.
[ ] Receipt display cache is not receipt truth.
[ ] Cache cannot unlock paid content by itself.
[ ] Cache cannot claim current balance.
[ ] Cache cannot claim ownership.
[ ] Offline mode cannot spend.
[ ] Offline mode cannot publish.
[ ] React does not access raw filesystem.
[ ] TypeScript does not declare cache trust.
[ ] Private cache is disabled until vault/security gates.
[ ] Amnesia purges as configured.
[ ] Mobile storage pressure is considered.
[ ] OAP/sidecar/media cache paths are gated behind their IDBs.
[ ] QuickChain/ROX/Solana are excluded.
```

---

## 47. Anti-scope

Forbidden in this implementation phase:

```text
- Unverified bytes rendered as trusted.
- Names treated as live truth offline.
- Cache used as ownership truth.
- Cache used as wallet truth.
- Cache used as receipt truth.
- Cache-created receipts.
- Cache-created balances.
- Cache-created ownership claims.
- Cached receipt unlocking paid content by itself.
- Paid content body caching by default.
- Offline wallet mutation.
- Offline ledger mutation.
- Offline asset publishing.
- Offline index pointer writes.
- Offline profile publication.
- Deep-link trusted cache writes.
- React raw filesystem reads.
- TypeScript marking bytes verified.
- Private cache without vault/security gate.
- Seed/capability storage in cache.
- Arbitrary executable facet cache.
- Full media subsystem before MEDIA_TAURI_IDB.
- Sidecar cache authority before SIDECAR_LOCAL_NODE_IDB gates.
- OAP stream cache before OAP_CLIENT_IDB gates.
- QuickChain/ROX/Solana/bridge/staking/liquidity scope.
```

---

## 48. Future expansion order

Recommended expansion order:

```text
1. Status/config shell.
2. Verified public b3 object cache.
3. Receipt display cache centralization.
4. Draft cache.
5. Public manifest cache.
6. Named-site snapshots.
7. Public profile snapshots.
8. Quotas and eviction.
9. Amnesia purge.
10. OAP stream-to-cache after OAP gates.
11. Sidecar source cache after sidecar gates.
12. Media cache after MEDIA_TAURI_IDB.
13. Private/encrypted cache only after vault/security gates.
14. Paid offline entitlement only after backend route contract.
```

Do not jump directly to:

```text
paid offline unlock
private cache
full media cache
offline publish
offline wallet
offline name truth
```

---

## 49. Plain-English summary

Offline cache is how CrabLink Tauri becomes resilient without lying.

It can help users:

```text
reopen verified public b3 assets
see cached public profiles
see cached site snapshots
review receipt display copies
keep local drafts
survive gateway outages
```

It must not pretend to be the network.

It must not pretend to be the wallet.

It must not pretend to be the ledger.

It must not pretend to be the index.

The final rule:

```text
Verified cache can render bytes.
It cannot create truth.
```
````
