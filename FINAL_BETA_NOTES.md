# FINAL_BETA_NOTES.md

## CrabLink Desktop Final Beta Implementation Notes

**Plan:** `FINAL_BETA.MD`  
**Primary repository:** `/Users/mymac/Desktop/crablink`  
**Related backend repository:** `/Users/mymac/Desktop/RustyOnions`  
**ROX Anchor repository:** `/Users/mymac/Desktop/rox-anchor`  
**Primary beta platform:** macOS desktop  
**Current phase:** Phase 2 — Design System and Visual Foundation  
**Last updated:** August 1, 2026

---

## 1. Active project direction

The active critical path is now:

```text
CrabLink Desktop
→ coherent product and visual system
→ Native Passport and profile coherence
→ public posting and creator timelines
→ private local following
→ local-first, network-hydrated Home feed
→ safe baked site templates
→ internal ROC value-loop stabilization
→ private QuickChain multi-node proof
→ private-testnet ROX Anchor proof
→ signed desktop private beta
```

Android TV, regular Android, and iOS are parked while the desktop product model is finished.

This avoids copying unfinished product behavior into multiple platform shells.

---

## 2. Phase 0 preflight result

The read-only Phase 0 preflight completed successfully.

```text
FINAL_BETA_PHASE0_PREFLIGHT=GREEN
FAILURE_COUNT=0
RUNTIME_BEHAVIOR_CHANGED=NO
RUSTYONIONS_MUTATED=NO
MOBILE_PLATFORM_MUTATION=NO
```

Confirmed repository foundation:

```text
apps/crablink-tauri=PRESENT
packages/crablink-core=PRESENT
packages/crablink-platform=PRESENT
crates/crablink-native-core=PRESENT
apps/crablink-tv=PRESENT
apps/crablink-android=PRESENT_AND_PARKED
```

The regular Android scaffold exists, but it is not part of the active desktop beta implementation lane.

---

## 3. Current desktop product baseline

### Home

`crab://home` remains a development-oriented dashboard.

Current source contains:

```text
Route Smoke Dashboard
Manual smoke sequence
Local proof memory, not backend authority
```

Required future direction:

```text
real user-facing Home
local following list
network-hydrated public timelines
local chronological merge
bounded verified cache
truthful partial refresh
truthful disconnected state
no public follower graph
```

### Public profile

The current public profile is a real gateway-backed, read-only surface.

Current missing product behavior:

```text
public publication timeline
local Follow / Following / Unfollow state
pinned public content
coherent profile-to-Home flow
```

The beta must not add:

```text
public follower counts
public following counts
public follower lists
public following lists
server-custodied following lists
```

### Site authoring

Normal site authoring still exposes:

```text
Import HTML
Root HTML editing
arbitrary markup entry
development reference templates
```

These surfaces must be removed from or strictly gated outside normal beta mode.

The beta product should expose safe declarative templates instead.

Initial target templates:

```text
Blog
Imageboard
Forum
```

### QuickChain

CrabLink already contains substantial QuickChain boundary and status work.

Current safe classification:

```text
QuickChain client authority boundaries=PRESENT
QuickChain readiness boundaries=PRESENT
QuickChain anchor posture boundaries=PRESENT
QuickChain DA fallback boundaries=PRESENT
QuickChain external posture boundaries=PRESENT
QuickChain private multi-node runtime proof=NOT_YET_COMPLETE
```

The final beta plan must finish real private-network QuickChain behavior rather than treating existing boundary documents as chain finality.

### RustyOnions feed and graph facets

Current Micronode feed and graph facets identify themselves as stubs.

```text
RUSTYONIONS_FEED_FACET=STUB_ONLY
RUSTYONIONS_GRAPH_FACET=STUB_ONLY
```

The server-owned social graph is not required for the beta.

Backend work should instead prioritize efficient public creator timelines, pagination, content verification, delivery evidence, accounting, and reward continuity.

### ROX Anchor

The ROX Anchor repository was located successfully.

Confirmed foundation:

```text
README.md=PRESENT
TODO.md=PRESENT
IDB.md=PRESENT
BUILD_PLAN.md=PRESENT
Cargo.toml=PRESENT
Anchor.toml=PRESENT
```

The final beta ROX path remains:

```text
private testnet only
controlled ROC ↔ ROX anchor demonstration
negative-path testing
halt and recovery testing
reconciliation proof
no public mainnet bridge
no public liquidity
no staking
no exchange listing claims
```

---

## 4. Local following and network-hydrated feed doctrine

The user’s following list belongs to the local CrabLink application.

```text
FOLLOWING_LIST_OWNER=LOCAL_CRABLINK_APP
FOLLOWING_LIST_DEFAULT_STORAGE=LOCAL_DEVICE_STORAGE
PUBLIC_FOLLOWER_COUNT=FORBIDDEN
PUBLIC_FOLLOWING_COUNT=FORBIDDEN
PUBLIC_FOLLOWER_LIST=FORBIDDEN
PUBLIC_FOLLOWING_LIST=FORBIDDEN
NETWORK_FOLLOW_MUTATION=NOT_REQUIRED
SERVER_SOCIAL_GRAPH=NOT_REQUIRED_FOR_BETA
```

Core distinction:

```text
Public content lives on the network.
Personal content selection lives on the user’s device.
Verified delivery and eligible consumption evidence remain network-aware.
```

The Home feed is:

```text
local-first
network-hydrated
chronologically ordered
locally merged
locally deduplicated
bounded in local cache
truthful under partial failure
```

It is not accurately described as a wholly offline feed.

QuickChain, internal ROC accounting, creator rewards, and service-node evidence remain active requirements.

A local follow or unfollow action is not an economic event.

Eligible network delivery or content consumption may produce separately reviewed, bounded, replay-resistant, privacy-conscious evidence.

The complete following list must not be uploaded as part of that evidence.

---

## 5. Authority boundaries that remain locked

```text
React:
  display
  local feed composition
  explicit user intent

Tauri:
  native privilege
  reviewed local persistence
  secure Passport surfaces
  bounded native operations

svc-passport:
  Passport identity
  device authorization
  capability truth

svc-index:
  public lookup
  public creator timeline projections
  public content indexes
  no economic truth
  no required beta follower graph

svc-wallet:
  approved economic mutation ingress

ron-ledger:
  durable balances
  receipts
  economic truth

ron-accounting:
  deterministic accounting snapshots
  not balance truth

svc-rewarder:
  bounded reward planning
  no direct ledger mutation

QuickChain:
  deterministic evidence commitment
  replay
  confirmation
  challenge
  not client authority

ROX Anchor:
  controlled private-testnet external anchor path
  not the internal ROC ledger
```

---

## 6. Forbidden beta regressions

The beta must not introduce:

```text
public follower counts
public following counts
public follower-list APIs
server-owned following custody
upload of the complete local following list
arbitrary site JavaScript
normal-beta arbitrary HTML authoring
cloud-custodied Passport identity
React PIN or recovery custody
fake balances
fake receipts
fake follows
fake feed entries
fake B3 verification
silent spend
cache-only paid unlock
cache-only creator rewards
cache-only QuickChain finality
public ROX mint or burn
public bridge settlement
staking
liquidity
exchange-facing behavior
```

---

## 7. Phase 0 completion target

Phase 0 is complete when:

```text
FINAL_BETA.MD is present.
Local-following and QuickChain continuity doctrine is explicit.
FINAL_BETA_NOTES.md is present.
The inventory checker exists.
The inventory checker passes.
No runtime behavior has changed.
Android and TV remain parked.
RustyOnions runtime has not been mutated.
```

Expected next implementation phase after Phase 0 verification:

```text
FINAL_BETA_PHASE1_CLEAN_DESKTOP_BASELINE
```

Phase 1 should begin with inspection of the current theme, shell, typography, spacing, navigation, reusable card surfaces, and development-only controls before changing application behavior.

---

## 8. Phase 0 Closeout and Phase 1 Start

<!-- FINAL_BETA_PHASE1A_CLEAN_BASELINE_START_V1 -->

Phase 0 is complete.

```text
FINAL_BETA_PHASE0_VERIFICATION=GREEN
FAILURE_COUNT=0
FINAL_BETA_PLAN=PRESENT
FINAL_BETA_NOTES=PRESENT
LOCAL_FOLLOWING_ADDENDUM=PRESENT_ONCE
PHASE0_INVENTORY_CHECKER=GREEN
RUNTIME_BEHAVIOR_CHANGED=NO
RUSTYONIONS_MUTATED=NO
MOBILE_RUNTIME_MUTATED=NO
```

The active phase is now:

```text
FINAL_BETA_PHASE1_CLEAN_DESKTOP_BASELINE
```

Phase 1 is not the design-system implementation phase.

The correct sequence is:

```text
Phase 1:
  clean desktop baseline
  real-user journey audit
  source/UI problem inventory
  blocker identification
  blocker-only repairs

Phase 2:
  design system and visual foundation
```

Phase 1 must record:

```text
clean first run
onboarding
username selection
Passport creation
native recovery ceremony
native PIN setup
profile setup
Home handoff
restart and unlock
own-profile access
image publication
post or article publication
site creation
paid-item access
receipt display
confirmed ROC display
lock and unlock
clear/reset using a disposable test profile
```

Phase 1 must also inventory:

```text
confusing labels
dead ends
duplicate actions
stale development surfaces
incoherent routes
raw JSON in normal mode
developer/test wording
fake-looking fallbacks
inconsistent controls and styles
profile/onboarding handoff defects
pointer and hit-testing defects
```

No broad visual redesign should begin until this record exists.

Current known baseline concerns include:

```text
Home remains a development proof dashboard.
Public profiles remain read-only and lack publication timelines.
Site creation exposes Import HTML and Root HTML.
Profile creation and Home/profile handoff require fresh manual confirmation.
Restart PIN/lock behavior requires fresh manual confirmation.
Paid item, receipt, and confirmed ROC flows require one clean-user proof.
Existing pointer hit-testing protection requires both automated and manual confirmation.
```

The Phase 1 acceptance runner is:

```text
apps/crablink-tauri/scripts/final_beta_phase1_clean_desktop_acceptance.sh
```

The Phase 1 audit record is:

```text
docs/tauri/FINAL_BETA_PHASE1_CLEAN_BASELINE_AUDIT.md
```

Phase 1 remains open until the manual journey and UI problem inventory are recorded.

Expected next phase only after Phase 1 closure:

```text
FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

---

## 9. Phase 1 Chat-Confirmed Clean Baseline

<!-- FINAL_BETA_PHASE1C_CHAT_CONFIRMED_BASELINE_V1 -->

The user prefers manual acceptance checklists to be presented directly in
the development conversation rather than through interactive terminal
questionnaire scripts.

Confirmed during this checkpoint:

```text
CLEAN_FIRST_RUN=GREEN
USERNAME_SELECTION=GREEN_IN_EXPLICIT_DEV_MODE
PASSPORT_CREATE=GREEN
HOME_HANDOFF=GREEN
BASIC_POINTER_AND_INPUT=GREEN
```

Known release blocker:

```text
NORMAL_RELEASE_USERNAME_AVAILABILITY=NOT_CONNECTED
NORMAL_RELEASE_DEV_BYPASS=HIDDEN_AS_REQUIRED
CLEAN_RELEASE_ONBOARDING_CAN_CONTINUE=NO
```

The development bypass must not be exposed as a normal release feature.

Not re-run during this checkpoint:

```text
RESTART_UNLOCK
OWN_PROFILE_HANDOFF
IMAGE_PUBLICATION
POST_OR_ARTICLE_PUBLICATION
SITE_CREATION
PAID_ITEM_ACCESS
RECEIPT_DISPLAY
CONFIRMED_ROC_DISPLAY
CLEAR_RESET
```

These paths remain explicitly unclaimed rather than being marked green
without current evidence.

The active next issue is the release username-availability boundary.

```text
PHASE1_CLOSED=NO
NEXT_ACTION=REPAIR_OR_EXPLICITLY_ROUTE_THE_RELEASE_USERNAME_AVAILABILITY_BLOCKER
```

---

## 10. Phase 1 Closed — Phase 2 Active

<!-- FINAL_BETA_PHASE1E_PHASE2_ENTRY_V1 -->

Phase 1 is green as a baseline audit.

```text
FINAL_BETA_PHASE1_CLEAN_BASELINE=GREEN
PHASE1_GREEN_MEANS=AUDIT_COMPLETE_NOT_FINAL_PRODUCT_ACCEPTANCE

CLEAN_FIRST_RUN=RECORDED
RESTART_UNLOCK=RECORDED
PROFILE_HANDOFF=RECORDED
CONTENT_PUBLISH_BASELINE=RECORDED
PAID_RECEIPT_BASELINE=RECORDED
UI_PROBLEM_INVENTORY=COMPLETE

NEXT_PHASE=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

The Phase 1 result does not convert untested routes into runtime-green
claims.

Current open product work remains assigned to its planned phases:

```text
visual foundation:
  Phase 2

shell and navigation:
  Phase 3

onboarding/Profile/Passport coherence:
  Phase 4

developer surface quarantine:
  Phase 5

publication and social product:
  Phases 6–10

safe sites:
  Phases 11–16

paid access, receipts, and confirmed ROC:
  Phase 17
```

The active work is now:

```text
ACTIVE_PHASE=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

Phase 2 begins with one shared token and component foundation rather than
random page-specific CSS edits.

Verification remains tiered:

```text
frontend-only patches:
  focused Node/source checks

Phase 1E closeout:
  focused Node tests plus one Vite build

Cargo/Tauri/release bundle:
  not repeated unless native code changes or a major milestone requires it
```

