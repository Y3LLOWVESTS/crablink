---
title: FINAL_BETA
version: 0.1.0
status: ready-for-implementation
last-updated: 2026-08-01
primary-repo: crablink
related-repo: RustyOnions
primary-product: CrabLink Desktop
primary-private-beta-platform: macOS
secondary-desktop-platforms:
  - Windows
  - Linux
parked-platforms:
  - CrabLink TV / Android TV
  - CrabLink Android phone and tablet
  - CrabLink iOS
beta-network-posture:
  - private RustyOnions network
  - private QuickChain activation and soak
  - private Solana testnet ROX Anchor demonstration
forbidden-beta-posture:
  - public mainnet bridge
  - public ROX mint/burn
  - staking
  - liquidity
  - exchange-facing behavior
  - arbitrary user code
  - arbitrary site JavaScript
  - cloud-custodied Passport identity
---

# FINAL_BETA.MD
## CrabLink Desktop — Final Product, Social, Site Template, QuickChain, ROX, and Private-Beta Build Plan

RO:WHAT — The final implementation plan for turning the existing CrabLink desktop application and RustyOnions substrate into a coherent, attractive, usable, secure desktop private beta. This plan deliberately parks Android TV and regular Android work until the desktop product model, visual language, social feed, profile timelines, safe site templates, QuickChain private-network behavior, and ROX private-testnet behavior are proven.

RO:WHY — CrabLink already contains a large amount of working protocol, creator, Passport, paid-content, receipt, node, QuickChain-boundary, site, and media code. Continuing to multiply platform shells before the core desktop experience is pleasant and coherent would create avoidable rework. The desktop application should become the reference product first. Android TV, Android phone/tablet, and iOS can then reuse a stable product model and visual system instead of porting unfinished UX.

RO:INTERACTS — `apps/crablink-tauri`, `packages/crablink-core`, `packages/crablink-platform`, `crates/crablink-native-core`, `svc-passport`, `svc-index`, `svc-storage`, `svc-gateway`, `omnigate`, `svc-wallet`, `ron-ledger`, `ron-policy`, `ron-auth`, `ron-accounting`, `svc-rewarder`, `micronode`, `macronode`, QuickChain modules, ROX Anchor, Solana private testnet, content manifests, profile records, site records, receipts, confirmed ROC, and future mobile/TV clients.

RO:INVARIANTS — React owns display and explicit user intent. Tauri owns native privilege. RustyOnions services own durable network truth. `svc-wallet` owns approved economic mutation ingress. `ron-ledger` owns economic truth. `svc-passport` owns Passport identity/device/authorization truth. `svc-index` owns reviewed lookup, relationship, and feed projections, but never economic truth. Content bytes are B3-addressed and verified. QuickChain evidence is not client authority. ROX Anchor is a controlled private-testnet external anchor path, not the internal ROC ledger. No arbitrary code, raw secret, silent spend, fake receipt, fake balance, fake follow, fake feed item, fake ownership, fake B3, fake finality, or fake settlement may enter the beta.

RO:METRICS — App launch, onboarding completion, Passport state, route transition, profile read, follow/unfollow result, feed hydration, publication result, site-template launch, content verification, paid-access result, receipt refresh, confirmed ROC refresh, QuickChain checkpoint/replay/confirmation result, node health, ROX proof result, testnet transaction result, redacted failure class, and beta acceptance result. Never use raw Passport IDs, usernames, device IDs, content IDs, capabilities, nonces, wallet accounts, site names, or receipt hashes as unbounded metric labels.

RO:CONFIG — Desktop environment profile, gateway origin, private-beta network identity, theme, UI density, developer-mode gate, safe site-template allowlist, follow/feed pagination limits, feed ordering mode, post-summary limits, asset/media caps, Passport auto-lock posture, node attachment posture, QuickChain activation flags, ROX private-testnet flags, release signing profile, crash/diagnostic redaction, and beta feature flags.

RO:SECURITY — Wallet-like local Passport custody remains mandatory. PIN and recovery material remain native. Custom HTML import, arbitrary root HTML editing, arbitrary scripts, arbitrary forms, event handlers, arbitrary network calls, and custom executable code are disabled in normal beta builds. Site rendering remains scriptless and declarative. Follow and publication mutations require an authorized Passport device and replay-safe request proof. Paid access requires explicit confirmation and backend-confirmed receipt truth. QuickChain and ROX paths remain private, bounded, reversible where designed, and fail closed.

RO:TEST — Pure model tests, React source boundaries, Tauri command boundaries, Rust unit/integration tests, gateway/omnigate route tests, multi-node network tests, deterministic QuickChain vectors, replay and chaos tests, Passport lifecycle tests, site-template snapshot and sandbox tests, feed/follow tests, paid-access and receipt tests, ROX private-testnet negative/recovery drills, accessibility checks, installer/package checks, clean-user journey acceptance, and reproducible final beta runners.

---

# 0. Executive Decision

## 0.1 Desktop first is the correct pivot

The recommended product sequence is now:

```text
1. Park Android TV at its current hardware-gated acceptance point.
2. Do not begin active regular Android implementation.
3. Turn CrabLink Desktop into the reference product.
4. Make the desktop application coherent, attractive, and enjoyable.
5. Implement real social profile timelines, follows, and Home feed.
6. Replace normal custom-site code entry with baked safe templates.
7. Prove the internal paid/receipt/ROC loop through the polished product.
8. Activate and prove QuickChain on a private multi-node environment.
9. Finish ROX Anchor on private Solana testnet.
10. Run the complete desktop private-beta demonstration.
11. Package and release the first desktop beta.
12. Resume Android TV and regular Android using the frozen desktop product model.
```

This is not abandoning mobile or TV work.

It prevents this failure mode:

```text
unfinished desktop UX
→ copied into TV
→ copied into Android
→ three shells require the same product redesign
```

The preferred result is:

```text
stable desktop product model
→ shared social/content/template APIs
→ stable design language
→ efficient TV/mobile adaptation
```

## 0.2 Current platform posture

```text
CRABLINK_DESKTOP=ACTIVE_BETA_CRITICAL_PATH
CRABLINK_TV=PAUSED_AT_PHYSICAL_DEVICE_GATE
CRABLINK_ANDROID=PAUSED_BEFORE_ACTIVE_IMPLEMENTATION
CRABLINK_IOS=DEFERRED
```

If `apps/crablink-android` has not been created, leave it absent.

If a minimal Android scaffold is created later, it may remain parked without affecting the desktop application, provided it is not wired into the root build or release gates.

## 0.3 Beta classification

This plan targets a **desktop decentralized private beta**, not a public mainnet launch.

The beta must prove:

```text
pleasant desktop product
real local Passport
real public profiles
real posts and comments
real follow relationships
real following feed
safe baked site templates
real B3 content
real gateway/index/storage behavior
real paid access
real receipts
real confirmed ROC display
private multi-node QuickChain behavior
private Solana testnet ROX Anchor behavior
failure, revocation, halt, and recovery behavior
```

The beta does not require:

```text
Android TV completion
Android phone/tablet completion
iOS
public mainnet
public bridge
public ROX mint/burn
staking
liquidity
exchange listings
arbitrary code hosting
general-purpose website scripting
unreviewed third-party plugins
```

---

# 1. Current Reality

## 1.1 The desktop application is feature-rich but not yet product-coherent

The current desktop application already has route owners for:

```text
home
library
receipts
quickchain
operator
text
site
image
profile
music
lyrics
article
post
comment
video
make
stream
podcast
chat
ad
algo
code
game
asset
problem
not-found
```

It also has:

```text
Passport creation and unlock
onboarding
profile drafting and gateway profile reads
site launch
image/article/post/comment assets
media creation and playback
paid access
receipt display
confirmed ROC display
User Node and Service Node operator surfaces
QuickChain readiness/status pages
```

The breadth is valuable, but many surfaces still expose engineering language, local proof dashboards, raw JSON, migration state, test anchors, or developer-oriented controls.

The beta must reduce visible complexity without deleting the underlying advanced engineering surfaces.

## 1.2 Home is not currently a social feed

The current `crab://home` route is primarily:

```text
route smoke-testing dashboard
local catalog proof display
recent local proof entries
gateway/Passport/wallet context
receipt counts
manual regression links
```

This is useful for development.

It is not the intended consumer Home experience.

The beta Home route must become:

```text
the user's following feed
```

Developer proof/control content must move to:

```text
Developer Tools
Diagnostics
Advanced
or explicit development mode
```

The Home icon must always navigate to:

```text
crab://home
```

It must not mean:

```text
browser history root
last dashboard
developer proof page
route smoke page
```

## 1.3 Public profiles do not yet provide the required social experience

The current public profile route already reads gateway-confirmed profile truth and displays:

```text
display name
@username
bio
avatar reference
Passport/profile facts
profile CID posture
REP/MOD posture
gateway source
```

It is currently read-only and does not yet provide:

```text
Follow / Unfollow
followers count
following count
profile publication timeline
posts/articles/images/media list
pinned post
reply/comment activity
```

The profile workspace also contains development-oriented manifest and truth-boundary panels.

The beta needs two visibly different surfaces:

```text
public profile:
  consumer-facing social page

profile studio:
  owner-only editing/publishing/settings
```

## 1.4 Feed and graph backend behavior is not implemented yet

Current RustyOnions feed/graph facet files are stubs.

Existing comments already identify intended direction:

```text
feed:
  timelines and notifications
  future bridge to svc-mailbox and svc-index

graph:
  follows, relationships, recommendations
  backed by svc-index
```

Therefore:

```text
Follow and Home feed are real backend/product implementation work.
They are not a CSS-only cleanup.
```

## 1.5 Site creation currently exposes too much for the desired beta boundary

The current site workspace contains useful safe-template and sandbox work.

It also currently offers normal UI for:

```text
Import HTML
edit root HTML
paste arbitrary markup
```

The preview strips scripts and uses a scriptless sandbox, which is a strong defense.

However, the desired first beta should use a smaller product boundary:

```text
baked templates only
typed fields only
known declarative CrabLink embeds only
no custom code
no raw HTML import
no raw root HTML editor
```

The existing HTML import/editor may remain behind an explicit development-only gate for internal testing.

It must not appear in normal beta mode.

## 1.6 Existing site templates are development/reference templates

Current bundled templates include forms such as:

```text
Reference Graph Smoke
Creator Landing
Image Showcase
```

They prove:

```text
scriptless roots
declarative crab-image
declarative crab-post
declarative crab-comment
declarative crab-article
reference-graph rendering
```

The beta should replace or supplement these with product templates:

```text
Blog
Imageboard
Forum
```

All three should use one underlying structured template engine rather than three unrelated backends.

## 1.7 QuickChain current status

The existing authorized QuickChain boundary/preflight work is green and parked through its current Phase 5 scope.

CrabLink already proves that it does not treat:

```text
cache
index
manifest
anchor metadata
DA metadata
committee metadata
validator metadata
external posture
```

as paid unlock, receipt, balance, finality, or settlement authority.

That is an essential safety foundation.

It is not proof that a complete private QuickChain runtime is operating end to end.

Full private-beta activation still requires:

```text
locked canonical bytes and vectors
deterministic roots
replay and rebuild
validator/committee execution
checkpoint/finality behavior
multi-node network behavior
challenge/failure behavior
soak and chaos testing
client status projection
```

## 1.8 ROX Anchor current status

ROX Anchor is already through its earlier private-testnet implementation phases.

The remaining lane is primarily:

```text
negative drills
halt and recovery
authority separation
key rotation
upgrade authority
RustyOnions handoff
CrabLink display-only status
reconciliation
final private-testnet closeout
```

ROX must remain:

```text
controlled private-testnet proof path
```

It must not become:

```text
public beta bridge
public mainnet settlement
public mint/burn authority
staking/liquidity/exchange product
```

---

# 2. Product Thesis for the Beta

## 2.1 CrabLink is a decentralized creator/social browser

The desktop beta should feel like:

```text
a social application
+
a content browser
+
a creator publishing tool
+
a wallet-like Passport client
+
a private decentralized network client
```

The product should not feel like:

```text
an engineering dashboard
a crate test harness
an operator console by default
a generic web browser clone
a blockchain explorer
a raw JSON client
```

## 2.2 Default top-level user journeys

The normal beta shell should make these actions obvious:

```text
Home
Explore
Create
Library
Profile
Passport
```

Advanced surfaces should not dominate normal navigation:

```text
Operator
QuickChain
Node verification
Diagnostics
Raw receipts
Developer manifests
Route smoke tests
```

These remain available through:

```text
Advanced
Developer Mode
Diagnostics
or explicit direct routes
```

## 2.3 Recommended normal navigation

### Primary

```text
Home
Explore
Create
Library
Profile
```

### Persistent utility

```text
Search / address field
Passport status
Confirmed ROC
Notifications later
Settings
```

### Advanced drawer

```text
Receipts
Node
Operator
QuickChain
ROX
Diagnostics
Developer tools
```

## 2.4 Browser identity should remain, but become secondary

CrabLink's `crab://` address model is a core differentiator.

Do not remove it.

Refine it:

```text
simple address/search field
clear current route
copy/share route
Home icon always opens feed
Back/Forward remain browser controls
tabs remain optional power-user behavior
```

Tabs should not dominate the first-run experience.

An explicit setting may choose:

```text
Simple mode
Power-user tab mode
```

The beta may ship with simple mode as default while preserving the tab implementation.

---

# 3. Social Content Model

## 3.1 Follow model

A follow is a signed social relationship transition.

It is not:

```text
a local UI boolean
a browser storage preference
a cache-only state
a wallet action
an economic transaction
```

Recommended transition:

```text
FollowTransitionV1
  schema
  operation_id
  idempotency_key
  actor_passport_id
  actor_device_id
  target_passport_id
  target_username
  action = follow | unfollow
  nonce
  issued_at
  request_proof
```

Required properties:

```text
authorized device
purpose-bound request proof
replay rejection
idempotent retry
target existence check
self-follow policy
blocked-user policy
private/suspended profile policy
rate limit
audit event
```

## 3.2 Ownership

Recommended ownership:

```text
svc-passport:
  actor Passport/device authorization
  target Passport/profile identity resolution
  request proof review

ron-auth:
  pure proof verification

ron-policy:
  follow/unfollow policy and limits

svc-index:
  durable relationship edge
  following projection
  follower projection
  relationship lookup
  profile post projection
  feed source projection

svc-gateway:
  public client ingress

omnigate:
  orchestration and redacted hydration

ron-audit:
  redacted relationship transition evidence

svc-mailbox:
  follow notifications later, not beta-critical
```

No new Rust crate is required.

## 3.3 Profile publication timeline

Every public profile needs a bounded timeline of the creator's published objects.

The timeline may contain:

```text
post
article
image
video
music
podcast
stream announcement
site launch
```

Beta priority:

```text
post
article
image
```

Each timeline item must be:

```text
backend/index-derived
linked to canonical typed content
bounded
paginated
ordered deterministically
redacted
safe to cache for display
```

Recommended projection:

```text
ProfilePublicationSummaryV1
  schema
  publication_id
  content_kind
  crab_url
  creator_username
  creator_passport_id_redacted
  title
  summary
  thumbnail_crab_url
  published_at
  edited_at_optional
  reply_count_optional
  paid_posture
  visibility
  content_b3
  manifest_b3_optional
```

## 3.4 Home following feed

Beta feed ordering should be simple and explainable:

```text
chronological descending
from explicitly followed profiles/pages
bounded lookback
stable cursor pagination
no opaque ranking
no personalized surveillance
no paid ranking
no engagement manipulation
```

Optional deterministic diversity rule:

```text
limit consecutive items from one creator
```

This must be visible and documented.

The initial Home feed should include:

```text
new posts
new articles
new images
site launch/update announcements
```

It should not initially include:

```text
likes
reposts
algorithmic recommendations
paid placements
hidden engagement ranking
people-you-may-know
global trend manipulation
```

Explore may later contain:

```text
recent public content
manually curated categories
transparent deterministic discovery
```

Home remains following-only.

## 3.5 Feed hydration

Recommended path:

```text
CrabLink Home
→ svc-gateway following-feed route
→ omnigate
→ svc-index relationship + publication projections
→ bounded hydrated summaries
→ CrabLink cards
```

Do not hydrate full content bytes into the feed response.

Feed cards link to typed content routes.

## 3.6 Offline/cache truth

Local feed cache may:

```text
show previously fetched summaries
label stale/offline
preserve scroll position
```

It may not:

```text
invent follows
invent posts
invent deletion state
invent paid entitlement
unlock paid content
claim fresh profile truth
```

---

# 4. Safe Site Template Model

## 4.1 Beta rule

Normal beta users choose from reviewed templates.

They do not submit executable code.

Normal beta mode must remove:

```text
Import HTML
raw Root HTML editor
custom JavaScript
inline event handlers
forms with arbitrary actions
iframes
remote scripts
arbitrary remote CSS
custom network requests
WebAssembly
plugin execution
```

## 4.2 Template architecture

Use one structured engine:

```text
SiteTemplateDefinitionV1
  template_id
  template_version
  name
  allowed_content_kinds
  allowed_sections
  allowed_theme_tokens
  renderer_version
  sandbox_policy
```

User-owned site data:

```text
SiteTemplateInstanceV1
  site_name
  owner_passport
  template_id
  template_version
  title
  description
  theme_tokens
  navigation
  section_configuration
  referenced_content
  moderation_configuration
```

The client generates reviewed scriptless HTML or a reviewed declarative render tree.

The generated site manifest records:

```text
template ID
template version
renderer version
structured source fields
referenced content objects
B3 roots
```

## 4.3 Shared engine, three presentations

Do not build three unrelated site systems.

Build one content/index/comment engine and present it as:

```text
Blog
Imageboard
Forum
```

This keeps the launch efficient.

## 4.4 Blog template

Required behavior:

```text
site header
about block
chronological article/post list
article detail
tags/categories
archive
author profile
optional featured image
comments using typed comment objects
RSS/export later
```

No arbitrary theme code.

Allowed customization:

```text
approved palette
approved typography set
density
hero image
logo/avatar
section visibility
```

## 4.5 Imageboard template

Required behavior:

```text
boards/categories
image-first threads
original post
typed comment replies
thumbnail grid
thread detail
content warning
moderation status
pagination
```

Images remain separate B3-addressed assets.

Thread pages reference:

```text
image objects
post objects
comment objects
```

No embedded executable code.

## 4.6 Forum template

Required behavior:

```text
categories
thread list
thread detail
post/reply chain
sticky/locked state
moderation labels
pagination
latest activity
```

The forum and imageboard share:

```text
ThreadV1
PostV1
Comment/ReplyV1
category projection
moderation projection
```

The presentation differs.

## 4.7 Custom code future gate

Custom site code may be reconsidered only after a separate security plan proves:

```text
strict origin isolation
CSP
network isolation
storage isolation
process isolation where needed
capability isolation
resource limits
navigation restrictions
sandbox escape testing
malicious CSS testing
malicious markup testing
plugin signing
review/revocation
```

This is explicitly outside the desktop beta.

---

# 5. Beta Milestones

## Milestone A — Desktop reference product

Phases:

```text
0–5
```

Outcome:

```text
stable current baseline
clean visual system
simple consumer shell
coherent onboarding/Profile/Passport flow
developer surfaces quarantined
```

## Milestone B — Social product

Phases:

```text
6–10
```

Outcome:

```text
typed publication summaries
profile posts timeline
follow/unfollow
following feed
consumer Home experience
```

## Milestone C — Safe site launch

Phases:

```text
11–16
```

Outcome:

```text
custom code disabled
reviewed template engine
blog
imageboard
forum
site creation and browsing
```

## Milestone D — Economic and network truth

Phases:

```text
17–21
```

Outcome:

```text
paid access stabilized
receipts/ROC coherent
private QuickChain working
multi-node soak
private-testnet ROX working
```

## Milestone E — Release

Phases:

```text
22–26
```

Outcome:

```text
security/moderation
UX/accessibility/performance
packaging
beta operations
final acceptance
```

---

# 6. Detailed Phase Plan

## FINAL_BETA Phase 0 — Scope Freeze, Platform Park, and Baseline Inventory

### Goal

Freeze the desktop private-beta target and prevent mobile/TV work from re-entering the critical path.

### Work

```text
- Add FINAL_BETA.MD.
- Add a desktop beta status document.
- Record Android TV exact pause point.
- Record Android exact pause point.
- Confirm Android scaffold absent or parked.
- Inventory desktop routes.
- Inventory normal versus advanced surfaces.
- Inventory current Home behavior.
- Inventory current profile behavior.
- Inventory current site custom-code entry.
- Inventory QuickChain actual versus display-only status.
- Inventory ROX actual private-testnet status.
- Define beta-supported OS decision.
```

Recommended OS scope:

```text
primary physical beta:
  macOS

compile/test posture:
  Windows
  Linux

additional public beta binaries:
  only after hardware/CI acceptance
```

### Acceptance

```text
FINAL_BETA_PHASE0_SCOPE_FREEZE=GREEN
DESKTOP_IS_REFERENCE_PRODUCT=YES
ANDROID_TV_BETA_GATE=NO
ANDROID_PHONE_TABLET_BETA_GATE=NO
IOS_BETA_GATE=NO
ARBITRARY_SITE_CODE_BETA=NO
PRIMARY_BETA_OS=MACOS
RUNTIME_BEHAVIOR_CHANGED=NO
NEXT_PHASE=FINAL_BETA_PHASE1_CLEAN_DESKTOP_BASELINE
```

---

## FINAL_BETA Phase 1 — Clean Desktop Baseline and Real User Journey Audit

### Goal

Prove the existing app from a clean install before redesign.

### Manual journey

```text
clean app data
launch
onboarding
choose username
create Passport
recovery ceremony
set PIN
profile setup
home handoff
restart
unlock
open own profile
publish one image
publish one post/article
create one site
read one paid item
view receipt
view confirmed ROC
lock
unlock
clear/reset in test profile
```

### Work

```text
- Add a single acceptance runner.
- Record every confusing label, dead end, duplicate action, stale dev surface, or incoherent route.
- Record every page with raw JSON in normal mode.
- Record every page with developer/test wording.
- Record every fake-looking fallback.
- Record every inconsistent button/style.
- Record all profile/onboarding handoff defects.
- Fix only blocker defects in this phase.
```

### Acceptance

```text
FINAL_BETA_PHASE1_CLEAN_BASELINE=GREEN
CLEAN_FIRST_RUN=RECORDED
RESTART_UNLOCK=RECORDED
PROFILE_HANDOFF=RECORDED
CONTENT_PUBLISH_BASELINE=RECORDED
PAID_RECEIPT_BASELINE=RECORDED
UI_PROBLEM_INVENTORY=COMPLETE
NEXT_PHASE=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

---

## FINAL_BETA Phase 2 — Design System and Visual Foundation

### Goal

Create one coherent visual system before page-by-page cleanup.

### Work

```text
- Freeze typography scale.
- Freeze spacing scale.
- Freeze radius scale.
- Freeze elevation/shadow scale.
- Freeze semantic color tokens.
- Freeze light/dark themes.
- Freeze focus/hover/pressed/disabled states.
- Freeze button variants.
- Freeze form field styles.
- Freeze card/list/feed styles.
- Freeze modal/drawer/toast styles.
- Add skeleton/loading patterns.
- Add empty/error/offline patterns.
- Add responsive desktop window rules.
- Add accessibility token checks.
```

### Components

```text
AppShell
PrimaryNavigation
UtilityBar
CrabAddressField
FeedCard
ProfileHeader
ContentCard
MediaCard
SiteCard
ReceiptRow
RocSummary
EmptyState
ErrorState
OfflineState
LoadingSkeleton
ConfirmDialog
DeveloperDisclosure
```

### Rule

No page owns a private color/spacing system without a documented exception.

### Acceptance

```text
FINAL_BETA_PHASE2_DESIGN_SYSTEM=GREEN
LIGHT_THEME=GREEN
DARK_THEME=GREEN
FOCUS_STATES=GREEN
CORE_COMPONENTS=GREEN
NO_PAGE_LOCAL_THEME_DRIFT=YES
NEXT_PHASE=FINAL_BETA_PHASE3_SHELL_AND_INFORMATION_ARCHITECTURE
```

---

## FINAL_BETA Phase 3 — Shell, Navigation, and Home Icon Semantics

### Goal

Make CrabLink immediately understandable.

### Work

```text
- Replace engineering-first navigation with consumer-first navigation.
- Home icon always navigates to crab://home.
- Add Home, Explore, Create, Library, Profile.
- Keep address/search field.
- Keep Back/Forward.
- Move advanced surfaces to Advanced.
- Preserve direct routes.
- Make tabs secondary or optional.
- Add simple mode default.
- Add power-user mode setting if needed.
- Make Passport/ROC status concise.
- Remove normal-shell raw developer labels.
```

### Acceptance

```text
FINAL_BETA_PHASE3_SHELL=GREEN
HOME_ICON_TARGET=crab://home
PRIMARY_NAV=CONSUMER_FACING
ADVANCED_SURFACES=QUARANTINED
ADDRESS_FIELD=PRESERVED
BACK_FORWARD=PRESERVED
NORMAL_SHELL_RAW_JSON=ABSENT
NEXT_PHASE=FINAL_BETA_PHASE4_IDENTITY_PROFILE_COHERENCE
```

---

## FINAL_BETA Phase 4 — Onboarding, Passport, and Profile Coherence

### Goal

Make identity feel like one product.

### Work

```text
- Ensure onboarding username maps to own profile route.
- Ensure own profile opens without manual username entry.
- Separate public profile and Profile Studio.
- Make startup lock behavior coherent.
- Simplify Passport drawer.
- Move developer Passport facts behind Advanced.
- Add clear device/account status.
- Add recovery/export guidance.
- Keep PIN/recovery native-only.
- Ensure profile saved/skipped states render honestly.
- Ensure username draft versus confirmed status is clear.
```

### Own-profile route

Recommended:

```text
crab://profile
  owner workspace/studio when current user

crab://@username
  public profile
```

A clear `View public profile` action bridges them.

### Acceptance

```text
FINAL_BETA_PHASE4_IDENTITY_PROFILE=GREEN
OWN_PROFILE_AUTO_ROUTE=GREEN
PUBLIC_PROFILE_ROUTE=GREEN
PROFILE_STUDIO=GREEN
PASSPORT_DRAWER_CONSUMER_MODE=GREEN
PIN_IN_REACT=NO
RECOVERY_WORDS_IN_REACT=NO
NEXT_PHASE=FINAL_BETA_PHASE5_DEVELOPER_SURFACE_QUARANTINE
```

---

## FINAL_BETA Phase 5 — Developer and Operator Surface Quarantine

### Goal

Keep advanced power without confusing beta users.

### Work

Move behind Advanced/Developer Mode:

```text
raw manifests
raw JSON
route smoke dashboard
proof anchors
QuickChain engineering details
local node diagnostics
operator controls
migration labels
development bypasses
known-good fixture routes
manual test sequences
```

Normal mode retains:

```text
simple status
clear errors
explicit retry
receipt details
security notices
advanced link when appropriate
```

### Acceptance

```text
FINAL_BETA_PHASE5_DEV_QUARANTINE=GREEN
NORMAL_MODE_ENGINEERING_DASHBOARD=ABSENT
ADVANCED_MODE=EXPLICIT
OPERATOR_MODE=EXPLICIT
DEVELOPMENT_BYPASSES=NOT_RELEASE_VISIBLE
NEXT_PHASE=FINAL_BETA_PHASE6_PUBLICATION_CONTRACT
```

---

## FINAL_BETA Phase 6 — Canonical Publication Summary and Creator Timeline Contract

### Goal

Create one social-display contract used by profiles, Home, Explore, and templates.

### Work

```text
- Add PublicationSummaryV1 DTO.
- Add strict bounds and unknown-field rejection.
- Add typed content kinds.
- Add creator identity fields.
- Add timestamps.
- Add paid/visibility posture.
- Add thumbnail/reference fields.
- Add pagination cursor.
- Add svc-index creator publication projection.
- Add gateway/omnigate read route.
- Add CrabLink adapter.
- Add memory/test adapter.
```

### No follow mutation yet

This phase is read projection only.

### Acceptance

```text
FINAL_BETA_PHASE6_PUBLICATION_CONTRACT=GREEN
PROFILE_PUBLICATION_PROJECTION=GREEN
PAGINATION=BOUNDED
UNKNOWN_FIELDS=REJECTED
ECONOMIC_TRUTH_IN_PROJECTION=NO
NEXT_PHASE=FINAL_BETA_PHASE7_PROFILE_TIMELINE
```

---

## FINAL_BETA Phase 7 — Public Profile Timeline and Social Profile UI

### Goal

Make profiles show what the creator publishes.

### Work

```text
- Add posts/content tab.
- Add About tab.
- Add Sites tab where relevant.
- Add media/content cards.
- Add pinned publication.
- Add bounded pagination.
- Add empty profile state.
- Add stale/offline display.
- Add owner edit action only on own profile.
- Add follow button placeholder only after real relationship contract is ready.
```

Do not use local catalog as public profile authority.

### Acceptance

```text
FINAL_BETA_PHASE7_PROFILE_TIMELINE=GREEN
PUBLIC_PROFILE_POSTS=GREEN
PROFILE_CONTENT_BACKEND_DERIVED=YES
OWNER_EDIT_BOUNDARY=GREEN
LOCAL_CATALOG_AUTHORITY=NO
NEXT_PHASE=FINAL_BETA_PHASE8_FOLLOW_GRAPH
```

---

## FINAL_BETA Phase 8 — Follow/Unfollow Graph

### Goal

Implement real signed follows.

### Work

```text
- Add FollowTransitionV1.
- Add pure proof/policy review.
- Add replay and idempotency behavior.
- Add svc-index relationship storage/projection.
- Add followers/following counts.
- Add relationship lookup.
- Add gateway/omnigate routes.
- Add CrabLink adapter.
- Add Follow/Unfollow UI.
- Add optimistic pending UI without claiming confirmation.
- Add block/suspension policy hooks.
- Add audit events.
```

Required routes conceptually:

```text
POST /social/follow
POST /social/unfollow
GET /social/relationship/:target
GET /social/followers/:profile
GET /social/following/:profile
```

Exact routes must follow existing route conventions.

### Acceptance

```text
FINAL_BETA_PHASE8_FOLLOW_GRAPH=GREEN
FOLLOW_REQUIRES_AUTHORIZED_DEVICE=YES
UNFOLLOW_REQUIRES_AUTHORIZED_DEVICE=YES
REPLAY_REJECTED=YES
IDEMPOTENT_RETRY=YES
FOLLOW_COUNT_BACKEND_DERIVED=YES
LOCAL_FOLLOW_AUTHORITY=NO
NEXT_PHASE=FINAL_BETA_PHASE9_HOME_FEED_BACKEND
```

---

## FINAL_BETA Phase 9 — Following Feed Backend

### Goal

Build a real deterministic Home feed.

### Work

```text
- Add following-feed query DTO.
- Resolve followed profiles.
- Resolve latest publication summaries.
- Merge in deterministic chronological order.
- Add stable pagination cursor.
- Add per-creator consecutive-item limit if selected.
- Add deleted/blocked/moderated filtering.
- Add bounded hydration.
- Add gateway/omnigate route.
- Add cache headers appropriate for private profile context.
- Add offline display cache contract.
```

Beta ordering:

```text
chronological
```

No opaque algorithm.

### Acceptance

```text
FINAL_BETA_PHASE9_FOLLOWING_FEED_BACKEND=GREEN
ORDERING=CHRONOLOGICAL
OPAQUE_RANKING=NO
PAID_RANKING=NO
FEED_HYDRATION=BOUNDED
DELETED_CONTENT_FILTERED=YES
BLOCKED_CONTENT_FILTERED=YES
NEXT_PHASE=FINAL_BETA_PHASE10_HOME_FEED_UI
```

---

## FINAL_BETA Phase 10 — Consumer Home Feed and Explore Separation

### Goal

Replace the proof dashboard with the social Home product.

### Home

```text
Following feed
composer/create shortcut
feed refresh
pagination
offline/stale label
empty-following guidance
```

### Explore

```text
recent public content
template sites
public creators
transparent categories
```

### Developer proof dashboard

Move to:

```text
crab://diagnostics
or Advanced
```

### Acceptance

```text
FINAL_BETA_PHASE10_HOME_FEED=GREEN
HOME_IS_FOLLOWING_FEED=YES
HOME_ICON_OPENS_FEED=YES
PROFILE_FOLLOW_UPDATES_FEED=YES
PROFILE_POSTS_MATCH_FEED_OBJECTS=YES
EXPLORE_SEPARATE=YES
PROOF_DASHBOARD_NORMAL_HOME=NO
NEXT_PHASE=FINAL_BETA_PHASE11_SITE_SECURITY_BOUNDARY
```

This closes the initial social product milestone.

---

## FINAL_BETA Phase 11 — Site Security Boundary and Custom-Code Quarantine

### Goal

Remove arbitrary site code from normal beta creation.

### Work

```text
- Add release-mode custom-code boundary test.
- Remove Import HTML from normal mode.
- Remove raw Root HTML editor from normal mode.
- Gate both behind development-only build flag if retained.
- Reject script, form, iframe, event, and remote-resource inputs.
- Add template ID/version to site manifests.
- Add renderer version.
- Add safe theme-token allowlist.
- Add declarative embed allowlist.
- Keep sandbox defense in depth.
```

### Acceptance

```text
FINAL_BETA_PHASE11_SITE_SECURITY=GREEN
NORMAL_IMPORT_HTML=ABSENT
NORMAL_ROOT_HTML_EDITOR=ABSENT
CUSTOM_JAVASCRIPT=FORBIDDEN
IFRAMES=FORBIDDEN
ARBITRARY_FORMS=FORBIDDEN
REMOTE_SCRIPT=FORBIDDEN
TEMPLATE_VERSION_RECORDED=YES
NEXT_PHASE=FINAL_BETA_PHASE12_TEMPLATE_ENGINE
```

---

## FINAL_BETA Phase 12 — Shared Structured Site Template Engine

### Goal

Build one engine for all beta site types.

### Work

```text
- Define SiteTemplateDefinitionV1.
- Define SiteTemplateInstanceV1.
- Define allowed blocks.
- Define theme tokens.
- Define navigation schema.
- Define content query sections.
- Define thread/list/detail sections.
- Generate scriptless render output.
- Add B3 and manifest references.
- Add migration/version behavior.
- Add snapshot tests.
- Add malicious input tests.
```

### Acceptance

```text
FINAL_BETA_PHASE12_TEMPLATE_ENGINE=GREEN
ONE_SHARED_ENGINE=YES
SCRIPTLESS_OUTPUT=YES
THEME_TOKENS_BOUNDED=YES
DECLARATIVE_BLOCKS_ONLY=YES
TEMPLATE_MIGRATION=DEFINED
NEXT_PHASE=FINAL_BETA_PHASE13_BLOG_TEMPLATE
```

---

## FINAL_BETA Phase 13 — Blog Template

### Goal

Ship a polished creator/personal blog.

### Work

```text
- Blog landing.
- Featured article.
- Chronological posts/articles.
- Tags/categories.
- Article detail.
- Author/profile integration.
- Comments.
- Archive.
- Empty/loading/error states.
- Theme choices.
- Site launch and update.
```

### Acceptance

```text
FINAL_BETA_PHASE13_BLOG=GREEN
BLOG_CREATE=GREEN
BLOG_PUBLISH=GREEN
BLOG_READ=GREEN
BLOG_COMMENTS=GREEN
BLOG_SCRIPTLESS=YES
NEXT_PHASE=FINAL_BETA_PHASE14_IMAGEBOARD_TEMPLATE
```

---

## FINAL_BETA Phase 14 — Imageboard Template

### Goal

Ship a safe image-first board.

### Work

```text
- Board categories.
- Image thread creation.
- Thumbnail grid.
- Thread detail.
- Replies/comments.
- Content warning.
- Moderation state.
- Pagination.
- Deleted/blocked projection.
- B3 image verification.
```

### Acceptance

```text
FINAL_BETA_PHASE14_IMAGEBOARD=GREEN
IMAGEBOARD_CREATE=GREEN
IMAGE_THREAD=GREEN
IMAGE_REPLIES=GREEN
B3_IMAGE_VERIFY=GREEN
MODERATION_PROJECTION=GREEN
NEXT_PHASE=FINAL_BETA_PHASE15_FORUM_TEMPLATE
```

---

## FINAL_BETA Phase 15 — Forum Template

### Goal

Ship a discussion-first community template.

### Work

```text
- Categories.
- Thread list.
- Thread creation.
- Reply chain.
- Sticky state.
- Locked state.
- Moderation labels.
- Pagination.
- Latest activity.
- Creator/moderator controls through reviewed policy.
```

The forum and imageboard reuse the same thread/post/reply contracts.

### Acceptance

```text
FINAL_BETA_PHASE15_FORUM=GREEN
FORUM_CREATE=GREEN
FORUM_THREAD=GREEN
FORUM_REPLY=GREEN
FORUM_LOCK_STICKY=GREEN
SHARED_THREAD_ENGINE=YES
NEXT_PHASE=FINAL_BETA_PHASE16_SITE_PRODUCT_ACCEPTANCE
```

---

## FINAL_BETA Phase 16 — Site Product Acceptance

### Goal

Prove the complete safe site lifecycle.

### Flow

```text
choose template
→ choose site name
→ fill structured settings
→ preview
→ publish root/manifest
→ resolve named site
→ create content
→ update site
→ visit site
→ comment/reply
→ paid visit where configured
→ receipt
```

### Work

```text
- Fix duplicate manifest parser drift.
- Use shared manifest types/helpers.
- Add gateway route tests.
- Add restart/recreate tests.
- Add paid-site tests.
- Add template update/migration tests.
- Add malicious input tests.
- Add sandbox tests.
```

### Acceptance

```text
FINAL_BETA_PHASE16_SITE_ACCEPTANCE=GREEN
BLOG_END_TO_END=GREEN
IMAGEBOARD_END_TO_END=GREEN
FORUM_END_TO_END=GREEN
CUSTOM_CODE_NORMAL_MODE=NO
NAMED_SITE_RESOLUTION=GREEN
PAID_SITE_RECEIPT=GREEN
NEXT_PHASE=FINAL_BETA_PHASE17_ECONOMIC_PRODUCT_STABILIZATION
```

---

## FINAL_BETA Phase 17 — Paid Access, Receipts, and Confirmed ROC Product Stabilization

### Goal

Make the internal ROC loop feel like a finished product.

### Work

```text
- Simplify wallet/ROC display.
- Simplify receipt list/detail.
- Add clear pending/confirmed/failed states.
- Add explicit spend confirmation.
- Add cancellation behavior.
- Add idempotent retry.
- Add paid site/content handling.
- Add stale/offline labels.
- Add receipt source labels.
- Add confirmed ROC refresh.
- Add no-cache-unlock checks.
- Add end-to-end repeatability runner.
```

### Acceptance

```text
FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=GREEN
SILENT_SPEND=NO
EXPLICIT_CONFIRMATION=YES
FAILED_PAYMENT_UNLOCK=NO
CANCELLED_PAYMENT_MUTATION=NO
RECEIPT_BACKEND_DERIVED=YES
CONFIRMED_ROC_BACKEND_DERIVED=YES
CACHE_ONLY_UNLOCK=NO
NEXT_PHASE=FINAL_BETA_PHASE18_QUICKCHAIN_ACTIVATION_FOUNDATION
```

---

## FINAL_BETA Phase 18 — QuickChain Beta Activation Foundation

### Goal

Move beyond boundary-only readiness into an actual private QuickChain implementation gate.

### Work

Follow the authoritative QuickChain plan and complete remaining implementation prerequisites:

```text
- Freeze canonical serialization.
- Freeze golden vectors.
- Freeze operation/receipt/state/hold/epoch identities.
- Implement deterministic state and receipt roots.
- Implement independent vector verification.
- Prove replay rebuild.
- Prove tamper rejection.
- Prove idempotency.
- Prove no floating-point economics.
- Prove wallet/ledger ownership.
```

Do not duplicate QuickChain rules inside CrabLink.

### Acceptance

```text
FINAL_BETA_PHASE18_QUICKCHAIN_FOUNDATION=GREEN
CANONICAL_BYTES=LOCKED
GOLDEN_VECTORS=LOCKED
DETERMINISTIC_ROOTS=GREEN
REPLAY_REBUILD=GREEN
TAMPER_REJECTION=GREEN
NEXT_PHASE=FINAL_BETA_PHASE19_QUICKCHAIN_MULTI_NODE
```

---

## FINAL_BETA Phase 19 — QuickChain Multi-Node, Committee, and Finality Proof

### Goal

Prove QuickChain as a private system, not isolated crates.

### Work

```text
- Bring up multiple Service Nodes.
- Bring up at least one User Node verifier.
- Execute deterministic operation batches.
- Produce candidate roots/checkpoints.
- Run committee/validator lifecycle.
- Prove quorum/finality rules.
- Prove duplicate/replay rejection.
- Prove member failure handling.
- Prove restart/recovery.
- Prove challenge path.
- Prove DA/archive fallback where required.
- Prove reward evidence remains ledger-confirmed.
- Run soak.
- Run chaos.
```

### CrabLink role

CrabLink may display:

```text
network ready
checkpoint observed
verification result
challenge result
degraded state
```

CrabLink may not decide finality.

### Acceptance

```text
FINAL_BETA_PHASE19_QUICKCHAIN_MULTI_NODE=GREEN
MULTI_NODE_TOPOLOGY=GREEN
CHECKPOINTS=GREEN
QUORUM=GREEN
FAILURE_RECOVERY=GREEN
CHAOS=GREEN
SOAK=GREEN
CRABLINK_FINALITY_AUTHORITY=NO
NEXT_PHASE=FINAL_BETA_PHASE20_ROX_PRIVATE_TESTNET
```

---

## FINAL_BETA Phase 20 — ROX Anchor Private-Testnet Completion

### Goal

Complete the remaining ROX Anchor private-testnet plan.

### Work

```text
- Run actual negative drills.
- Run invalid proof drills.
- Run replay drills.
- Run halt drills.
- Run recovery drills.
- Prove authority separation.
- Prove key rotation.
- Prove upgrade-authority handling.
- Prove RustyOnions dry-run handoff.
- Add CrabLink display-only private-testnet status.
- Run receipt reconciliation.
- Run final private-testnet closeout.
```

### ROC → ROX controlled test

```text
internal ROC evidence
→ proof package
→ ROX validation
→ coordinator decision
→ relayer simulation
→ explicitly approved capped testnet send
→ test-only Solana state change
→ RPC readback
→ redacted reconciliation
```

### ROX → ROC controlled test

```text
test-only burn/finalization evidence
→ RPC proof
→ deterministic review
→ coordinator decision
→ dry-run ROC release intent
→ no direct internal ROC mutation
```

### Acceptance

```text
FINAL_BETA_PHASE20_ROX_PRIVATE_TESTNET=GREEN
PUBLIC_MAINNET=NO
PUBLIC_BRIDGE=NO
PRODUCTION_MINT_BURN=NO
HALT_RECOVERY=GREEN
AUTHORITY_SEPARATION=GREEN
RPC_READBACK=GREEN
RECONCILIATION=GREEN
NEXT_PHASE=FINAL_BETA_PHASE21_FULL_SYSTEM_DEMONSTRATION
```

---

## FINAL_BETA Phase 21 — Full Desktop Decentralized Beta Demonstration

### Goal

Prove the entire selected beta vision in one controlled run.

### Demonstration

```text
1. Start private RustyOnions network.
2. Start multiple Service Nodes.
3. Start User Node verifier.
4. Launch clean CrabLink Desktop.
5. Create/restore Passport.
6. Claim/confirm username.
7. Create profile.
8. Follow another profile.
9. Publish post/image/article.
10. Confirm profile timeline.
11. Confirm follower Home feed.
12. Create blog.
13. Create imageboard.
14. Create forum.
15. Resolve all sites.
16. Complete paid content/site flow.
17. Confirm receipt.
18. Confirm ROC display.
19. Produce QuickChain checkpoint/finality evidence.
20. Display redacted QuickChain status.
21. Execute capped ROC → ROX private-testnet path.
22. Execute ROX → ROC dry-run path.
23. Run revocation/halt/failure drill.
24. Restart and reconcile.
```

### Acceptance

```text
FINAL_BETA_PHASE21_FULL_SYSTEM_DEMO=GREEN
SOCIAL_FLOW=GREEN
SITE_TEMPLATES=GREEN
PAID_FLOW=GREEN
QUICKCHAIN_FLOW=GREEN
ROX_TESTNET_FLOW=GREEN
RESTART_RECONCILIATION=GREEN
NEXT_PHASE=FINAL_BETA_PHASE22_SECURITY_MODERATION_PRIVACY
```

---

## FINAL_BETA Phase 22 — Security, Moderation, Privacy, and Abuse Controls

### Goal

Harden the beta against realistic misuse.

### Security

```text
- Tauri command allowlist.
- Capability file audit.
- URL/origin audit.
- secret surface scan.
- log/crash redaction.
- no PIN/recovery in React.
- no arbitrary HTML in release.
- sandbox malicious corpus.
- parser fuzzing.
- bounded bodies.
- decompression guards.
- replay tests.
- privilege separation.
```

### Social abuse

```text
- block user.
- mute user.
- unfollow.
- profile suspension projection.
- post deletion/tombstone.
- content report.
- local content hide.
- rate limits.
- follow spam limits.
- thread spam limits.
```

### Site moderation

```text
- operator block.
- global deny.
- owner tombstone.
- quarantine.
- template moderation.
- forum/imageboard thread locks.
- no ROC reward for denied content service.
```

### Privacy

```text
- no public User Node IP.
- no direct-provider fallback.
- no secret/high-cardinality metrics.
- no public alt linkage.
- cache clear.
- local data clear.
- diagnostic export redacted.
```

### Acceptance

```text
FINAL_BETA_PHASE22_SECURITY_MODERATION_PRIVACY=GREEN
SECRET_SCAN=GREEN
SANDBOX_CORPUS=GREEN
BLOCK_MUTE=GREEN
REPORT=GREEN
TOMBSTONE=GREEN
RATE_LIMITS=GREEN
PRIVACY_BOUNDARY=GREEN
NEXT_PHASE=FINAL_BETA_PHASE23_UX_ACCESSIBILITY_PERFORMANCE
```

---

## FINAL_BETA Phase 23 — UX, Accessibility, and Performance Acceptance

### Goal

Make the app pleasant enough to invite real users.

### UX

```text
- consistent navigation.
- clear calls to action.
- meaningful empty states.
- useful onboarding copy.
- no unexplained acronyms in normal mode.
- no raw hashes unless requested.
- clear offline status.
- clear paid status.
- clear Passport lock status.
- coherent profile/site/feed flow.
```

### Accessibility

```text
- keyboard navigation.
- focus order.
- semantic controls.
- screen-reader labels.
- contrast.
- font scaling.
- reduced motion.
- no color-only state.
```

### Performance

```text
- cold launch.
- warm launch.
- Home feed first render.
- profile timeline.
- site render.
- image memory.
- media cleanup.
- large local catalog.
- receipt list.
- node status polling.
- long-session leak review.
```

### Acceptance

```text
FINAL_BETA_PHASE23_UX_A11Y_PERFORMANCE=GREEN
CLEAN_USER_ACCEPTANCE=GREEN
KEYBOARD=GREEN
SCREEN_READER=GREEN
CONTRAST=GREEN
REDUCED_MOTION=GREEN
STARTUP=GREEN
LONG_SESSION=GREEN
NEXT_PHASE=FINAL_BETA_PHASE24_DESKTOP_PACKAGING
```

---

## FINAL_BETA Phase 24 — Desktop Packaging, Signing, Update, and Recovery

### Goal

Produce installable beta artifacts.

### Primary beta

```text
macOS
```

### Work

```text
- Release build profile.
- Production/dev config separation.
- Signing identity.
- Remove obsolete self-signed development identity if still present.
- Notarization decision and implementation.
- App data path review.
- Upgrade migration.
- uninstall/reinstall behavior.
- Passport preservation rules.
- backup/export guidance.
- crash-safe update.
- diagnostic bundle.
- version display.
- release notes.
```

### Windows/Linux

Run:

```text
compile checks
platform sealer tests
package configuration checks
```

Produce beta artifacts only after target hardware/CI acceptance.

### Acceptance

```text
FINAL_BETA_PHASE24_DESKTOP_PACKAGING=GREEN
MACOS_SIGNED_ARTIFACT=GREEN
DEV_CERTIFICATE_NOT_SHIPPED=YES
UPGRADE_MIGRATION=GREEN
PASSPORT_DATA_POLICY=GREEN
RELEASE_CONFIG_DEV_BYPASS=NO
NEXT_PHASE=FINAL_BETA_PHASE25_PRIVATE_BETA_OPERATIONS
```

---

## FINAL_BETA Phase 25 — Private Beta Operations

### Goal

Run a controlled beta rather than an uncontrolled public launch.

### Work

```text
- Invite list.
- Beta environment identity.
- Service Node operator list.
- emergency contacts.
- issue intake.
- privacy notice.
- beta disclaimer.
- content policy.
- moderation response.
- emergency halt.
- Passport recovery support boundaries.
- no server recovery promise.
- release channel.
- update process.
- rollback process.
- known issue list.
- daily/weekly network health review.
```

### Data policy

```text
advertisers receive no conversations or Passport secrets
beta diagnostics are redacted
no sale of user data
no cloud custody of Passport secrets
no hidden telemetry
```

### Acceptance

```text
FINAL_BETA_PHASE25_OPERATIONS=GREEN
INVITE_FLOW=GREEN
UPDATE_FLOW=GREEN
ROLLBACK_FLOW=GREEN
INCIDENT_RUNBOOK=GREEN
MODERATION_RUNBOOK=GREEN
KNOWN_ISSUES=PUBLISHED
NEXT_PHASE=FINAL_BETA_PHASE26_FINAL_ACCEPTANCE
```

---

## FINAL_BETA Phase 26 — Final Beta Acceptance and Launch

### Goal

Make one honest release decision.

### Automated gates

```text
CrabLink React build
Tauri Rust check
strict focused Clippy
Passport regressions
onboarding acceptance
profile timeline tests
follow graph tests
feed tests
template tests
site sandbox tests
paid flow tests
receipt/ROC tests
QuickChain multi-node tests
ROX private-testnet tests
security boundaries
installer/package checks
```

### Manual gates

```text
clean user
returning user
wrong PIN
cancel PIN
recovery flow
follow/unfollow
feed refresh
publish post
create three site types
paid content
offline mode
node degraded mode
QuickChain degraded mode
ROX halted mode
restart
upgrade
uninstall/reinstall policy
```

### Final green markers

```text
CRABLINK_DESKTOP_FINAL_BETA=GREEN
DESKTOP_REFERENCE_PRODUCT=GREEN
HOME_FOLLOWING_FEED=GREEN
PUBLIC_PROFILE_TIMELINE=GREEN
FOLLOW_GRAPH=GREEN
BLOG_TEMPLATE=GREEN
IMAGEBOARD_TEMPLATE=GREEN
FORUM_TEMPLATE=GREEN
ARBITRARY_SITE_CODE=DISABLED
PASSPORT=GREEN
PAID_ACCESS=GREEN
RECEIPTS=GREEN
CONFIRMED_ROC=GREEN
QUICKCHAIN_PRIVATE_NETWORK=GREEN
ROX_PRIVATE_TESTNET=GREEN
SECURITY=GREEN
MODERATION=GREEN
MACOS_BETA_ARTIFACT=GREEN
ANDROID_TV_REQUIRED_FOR_DESKTOP_BETA=NO
ANDROID_REQUIRED_FOR_DESKTOP_BETA=NO
IOS_REQUIRED_FOR_DESKTOP_BETA=NO
```

### Launch label

Correct:

```text
CrabLink Desktop decentralized private beta
QuickChain private-network beta
ROX Anchor private Solana testnet demonstration
```

Incorrect:

```text
public blockchain live
public ROX bridge live
mainnet live
production mint/burn live
staking live
liquidity live
exchange ready
arbitrary decentralized web code hosting live
```

---

# 7. Efficient Build Rules

## 7.1 Build the product spine first

Critical path:

```text
clean baseline
→ design system
→ shell
→ identity/profile
→ publication timeline
→ follows
→ Home feed
→ templates
→ paid/receipt/ROC
→ QuickChain
→ ROX
→ release
```

Do not polish every legacy creator surface before the spine works.

## 7.2 One social engine

Reuse:

```text
PublicationSummaryV1
ThreadV1
PostV1
ReplyV1
FollowTransitionV1
```

Across:

```text
profiles
Home
Explore
blog
imageboard
forum
```

## 7.3 One template engine

Do not create:

```text
blog backend
imageboard backend
forum backend
```

Create:

```text
shared site/template/content engine
```

with three reviewed presentations.

## 7.4 Preserve advanced code without shipping it as normal UX

Prefer:

```text
quarantine
hide behind explicit development mode
remove from release navigation
add boundary tests
```

over a risky mass deletion.

## 7.5 Do not rewrite working security code for visual cleanup

UI cleanup must not rewrite:

```text
Passport vault
native PIN
recovery ceremony
wallet mutation
ledger truth
B3 validation
receipt normalization
QuickChain boundaries
ROX proof validation
```

unless a focused failure requires it.

---

# 8. Parked Platform Resume Gates

## 8.1 Resume Android TV when

```text
physical TV and Android TV box available
desktop product navigation frozen
social feed API frozen
profile timeline API frozen
template read model frozen
```

Then complete:

```text
Phase 16E3B3C physical acceptance
Phase 16F
final TV acceptance
```

## 8.2 Resume regular Android when

```text
desktop design tokens frozen
desktop primary navigation frozen
social API frozen
Passport UX frozen
template API frozen
```

The Android app should adapt those contracts, not copy desktop JSX.

## 8.3 Resume iOS when

```text
Android root-capable Passport integration is green
shared mobile contracts are stable
```

---

# 9. Hard Out-of-Scope List

The desktop beta does not add:

```text
arbitrary user JavaScript
arbitrary custom HTML in normal mode
arbitrary iframes
arbitrary remote resources
browser extensions/plugins
public code execution
public Wasm execution
public mainnet bridge
public ROX mint/burn
staking
liquidity
exchange behavior
cloud Passport account
email/password identity authority
server recovery of Passport
silent spend
cache-only paid unlock
fake receipts
fake ROC
fake follow counts
fake feed items
fake profile posts
fake QuickChain finality
fake ROX settlement
```

---

# 10. Development Workflow

Continue the established workflow:

```text
1. Apply-only patch.
2. User runs patch.
3. User posts output.
4. Review the first failure.
5. Verification-only block.
6. Move forward only when focused behavior is green.
```

Never include:

```text
git commands
opaque payloads
downloads without request
large mutation plus full verification in one block
automatic codebundle regeneration after every patch
fake physical or network acceptance
```

Use:

```text
small real behavior
focused matching tests
compile checks
rollback
truthful APPLIED/GREEN/RED output
```

---

# 11. Default Next Patch

Begin with:

```text
FINAL_BETA_PHASE0_SCOPE_FREEZE_AND_BASELINE_INVENTORY
```

The first apply-only patch should:

```text
1. Add FINAL_BETA.MD to the CrabLink repository.
2. Add FINAL_BETA_NOTES.md.
3. Add a source inventory checker.
4. Record current Home as proof/dashboard.
5. Record public profile as read-only/no-follow/no-timeline.
6. Record current custom HTML/import surfaces.
7. Record feed/graph backend stubs.
8. Record QuickChain boundary/preflight state versus runtime state.
9. Record ROX phase state.
10. Record TV/Android as parked.
11. Mutate no runtime behavior.
```

Expected result:

```text
FINAL_BETA_PHASE0_SCOPE_FREEZE=GREEN
RUNTIME_BEHAVIOR_CHANGED=NO
MOBILE_PLATFORM_MUTATION=NO
RUSTYONIONS_MUTATED=NO
NEXT_PATCH=FINAL_BETA_PHASE1_CLEAN_DESKTOP_BASELINE
```

---

# 12. Final Doctrine

```text
Make the desktop product lovable first.

Home is the following feed.
Profiles show the creator's work.
Follows are real signed network relationships.
Sites use reviewed templates.
Custom code waits for a real sandbox security program.
Receipts and ROC remain backend truth.
QuickChain must work as a private network, not a collection of labels.
ROX must work on private Solana testnet, not pretend to be a public bridge.
TV and mobile return after the product model is stable.
```
# STUB NOTE - ADDENDUM

Product decision

CrabLink will not reproduce the conventional social-media follower model.

A user’s list of followed creators belongs to that user’s CrabLink application.

FOLLOWING_LIST_OWNER=LOCAL_CRABLINK_APP
FOLLOWING_LIST_DEFAULT_STORAGE=OFFLINE_LOCAL_STORAGE
PUBLIC_FOLLOWER_COUNT=FORBIDDEN
PUBLIC_FOLLOWING_COUNT=FORBIDDEN
PUBLIC_FOLLOWER_LIST=FORBIDDEN
PUBLIC_FOLLOWING_LIST=FORBIDDEN
NETWORK_FOLLOW_MUTATION=NOT_REQUIRED
SERVER_SOCIAL_GRAPH=NOT_REQUIRED_FOR_BETA

Only the user needs to know whom they follow.

Other creators do not need to be notified that the user followed them, and the network does not need to maintain a durable relationship edge between the two identities.

Core doctrine
Public content lives on the network.
Personal content selection lives on the user’s device.

The network may provide:

public creator profiles
public creator timelines
public post manifests
public content indexes
pagination cursors
content publication timestamps
content verification information

The local CrabLink app owns:

the user’s followed-creator list
local follow and unfollow actions
local feed assembly
local feed ordering
local read state
local hidden or muted entries
local cached timeline results
local refresh cursors where safe

The user’s complete following list must not be uploaded merely to generate a Home feed.

Privacy and scaling rationale

Traditional public follow graphs require the network to store, update, fetch, count, paginate, and potentially expose extremely large relationship lists.

CrabLink does not need that architecture for its initial product.

Removing public follower graphs avoids:

massive follower-list storage
expensive relationship lookups
public popularity counters
follower-count manipulation
follow-bot markets
social-status pressure
centralized graph surveillance
unnecessary disclosure of user interests
network-wide graph synchronization

It also keeps the product aligned with the broader CrabLink principle:

Whatever can safely and truthfully remain offline should remain offline.
Local follow record

The local app should persist a bounded, versioned record similar to:

{
  "schema": "crablink.local-following.v1",
  "entries": [
    {
      "profileRef": "public-profile-reference",
      "username": "example",
      "followedAt": "ISO-8601 timestamp",
      "lastTimelineCursor": null,
      "lastRefreshAt": null
    }
  ],
  "updatedAt": "ISO-8601 timestamp"
}

The exact stored identity reference must use an already reviewed public profile or Passport reference.

The record must not contain:

Passport private material
device private keys
PINs
recovery phrases
raw capabilities
wallet authority
private profile data
invented ownership claims
invented usernames

The following list should be stored through CrabLink’s reviewed local persistence adapter rather than directly scattered through React component state or unversioned browser storage.

Follow and unfollow behavior

Following a creator is a local application action.

Correct flow:

user opens a public creator profile
→ user selects Follow
→ CrabLink validates the public profile reference
→ CrabLink adds the creator to the local following record
→ the profile UI displays locally followed state
→ the Home feed includes that creator during future hydration

Unfollow flow:

user selects Unfollow
→ CrabLink removes the local entry
→ future Home feed hydration excludes that creator
→ existing locally cached content may be expired or removed according to cache policy

Follow and unfollow must not:

mutate svc-index relationship truth
create a public graph edge
increment or decrement a follower count
create an economic event
create a wallet receipt
notify the followed creator by default
claim network confirmation
require QuickChain confirmation
require ROX or Solana interaction

The UI should use language such as:

Follow
Following
Unfollow
Added to your feed
Removed from your feed

It must not claim:

network follow confirmed
follower count updated
creator notified
relationship recorded on-chain
Public profile behavior

Public profiles should not display:

follower count
following count
public follower list
public following list
popularity rank based on follower count
verified social-graph relationships

A public profile may display:

profile identity
username
avatar
bio
public links
public posts
public media
public sites
pinned public content
publication timeline
locally derived Follow or Following button state

The Following state visible on a profile is derived solely from the current user’s local following record.

# END STUB NOTE 
---

# Addendum — Local Following, Network-Hydrated Feed, and QuickChain Reward Continuity

<!-- FINAL_BETA_LOCAL_FOLLOWING_QUICKCHAIN_ADDENDUM_V1 -->

## Status

This addendum supersedes any conflicting `FINAL_BETA.md` requirement for:

```text
public follower counts
public following counts
public follower lists
public following lists
backend-custodied following lists
server-owned social graph edges
network follow/unfollow mutations
```

It does not remove public creator timelines, network content hydration, eligible creator reward evidence, service-node evidence, internal ROC accounting, or QuickChain.

## Product decision

CrabLink will not reproduce the conventional public follower-graph model.

A user’s list of followed creators belongs to that user’s CrabLink application.

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

Only the user needs to know whom they follow.

The creator does not need to receive a notification merely because someone added the creator to a local feed, and RustyOnions does not need to maintain a durable public relationship edge between the two identities.

## Core doctrine

```text
Public content lives on the network.
Personal content selection lives on the user’s device.
Verified delivery and eligible consumption evidence remain network-aware.
```

The critical distinction is:

```text
social-selection privacy
is not
economic-event invisibility
```

The complete following list remains private and local.

Publications, public creator timelines, verified content delivery, eligible consumption evidence, accounting, creator rewards, service-node rewards, and QuickChain remain in scope.

## Local application ownership

The local CrabLink application owns:

```text
the user’s followed-creator list
local follow and unfollow actions
local feed assembly
local chronological ordering
local read state
local hidden or muted entries
bounded verified timeline caches
safe per-creator refresh cursors
```

The network may provide:

```text
public creator profiles
public creator timelines
public publication manifests
public content indexes
pagination cursors
content publication timestamps
content verification information
verified content bytes
```

The user’s complete following list must not be uploaded merely to generate a Home feed.

## Home feed posture

Use the following terminology and architecture:

```text
HOME_FEED_COMPOSITION=LOCAL_FIRST
HOME_FEED_CONTENT_SOURCE=PUBLIC_NETWORK_TIMELINES
HOME_FEED_NETWORK_HYDRATION=REQUIRED_WHEN_ONLINE
HOME_FEED_OFFLINE_CACHE=OPTIONAL_AND_BOUNDED
HOME_FEED_ORDER=CHRONOLOGICAL
HOME_FEED_PUBLIC_SOCIAL_GRAPH_REQUIRED=NO
HOME_FEED_LOCAL_FOLLOW_LIST_REQUIRED=YES
```

Correct feed path:

```text
local following list
→ request followed creators’ public timelines
→ retrieve public publication records
→ verify content and metadata
→ merge timelines locally
→ deduplicate locally
→ order chronologically
→ retain a bounded verified cache
→ render the Home feed
```

Feed assembly is local because the client chooses which public timelines to combine.

The content remains network-published and network-hydrated.

## QuickChain and creator rewards

Local following must not scope out creator rewards or QuickChain.

```text
QUICKCHAIN_REWARD_EVIDENCE=NOT_SCOPED_OUT
CREATOR_REWARD_PIPELINE=REQUIRED
LOCAL_FOLLOW_ACTION_ECONOMIC_EVENT=NO
VERIFIED_CONTENT_CONSUMPTION_EVIDENCE=MAY_BE_REWARD_ELIGIBLE
```

Removing the public follower graph must not remove:

```text
verified content-delivery evidence
eligible content-access evidence
eligible content-view evidence
creator reward accounting
service-node delivery evidence
internal ROC reward planning
wallet and ledger-confirmed payouts
QuickChain checkpoint commitments
QuickChain replay verification
QuickChain confirmation
QuickChain challenge handling
```

The reviewed value path remains conceptually:

```text
public content publication
→ network retrieval or delivery
→ content verification
→ eligible bounded evidence
→ ron-accounting classification
→ policy and anti-farming review
→ svc-rewarder bounded planning
→ svc-wallet approved mutation
→ ron-ledger durable receipt and balance truth
→ QuickChain commitment and replay where authorized
```

CrabLink remains display and explicit user intent only.

CrabLink does not determine that a view earned ROC, calculate the authoritative reward, finalize a reward, create a ledger receipt, or declare a QuickChain checkpoint confirmed.

## Follow actions are not economic events

Following and unfollowing are local subscription-preference changes.

They must not:

```text
create ROC
create creator rewards
create engagement reward evidence
create wallet receipts
create ledger mutations
create QuickChain evidence
increment popularity metrics
notify creators by default
```

Where content consumption is eligible for evidence, that eligibility comes from separately reviewed delivery or consumption behavior—not from the local follow entry.

## Local follow record

The application should persist a bounded and versioned record similar to:

```json
{
  "schema": "crablink.local-following.v1",
  "entries": [
    {
      "profileRef": "public-profile-reference",
      "username": "example",
      "followedAt": "ISO-8601 timestamp",
      "lastTimelineCursor": null,
      "lastRefreshAt": null
    }
  ],
  "updatedAt": "ISO-8601 timestamp"
}
```

The record must use an already reviewed public profile or Passport reference.

It must not contain:

```text
Passport private material
device private keys
PINs
recovery phrases
raw capabilities
wallet authority
private profile data
invented ownership claims
invented usernames
```

The record belongs behind CrabLink’s reviewed local persistence adapter rather than scattered through component state or unversioned browser storage.

## Public profile behavior

Public profiles must not display:

```text
follower count
following count
public follower list
public following list
follower-based popularity ranking
verified public follow relationships
```

A public profile may display:

```text
profile identity
username
avatar
bio
public links
public posts
public media
public sites
pinned public content
publication timeline
locally derived Follow or Following state
```

The visible `Following` state derives solely from the current device’s local following record.

## Cached and disconnected behavior

CrabLink may retain bounded, previously verified public content for resilience and disconnected viewing.

```text
OFFLINE_ACCESS=ALLOWED
CACHE_SIZE=BOUNDED
CACHE_CONTENT=PREVIOUSLY_VERIFIED
CACHE_ONLY_REWARD_FINALITY=FORBIDDEN
CACHE_ONLY_QUICKCHAIN_CONFIRMATION=FORBIDDEN
CACHE_HIT_AUTOMATIC_NEW_VIEW_REWARD=FORBIDDEN
```

Rendering cached content must not silently invent:

```text
a new network delivery
a confirmed eligible view
a creator reward
a service-node reward
a ledger receipt
a QuickChain checkpoint
```

A future reviewed mechanism may reconcile eligible disconnected activity only if it is bounded, privacy-preserving, signed, replay-safe, and explicitly tested.

Until that exists, cached activity alone is not finalized reward evidence.

## Data-class separation

The local following record and network economic evidence are separate data classes.

The local record may contain only local subscription and refresh information.

Network evidence may contain only fields required by its reviewed event contract, such as:

```text
content reference
creator or reward recipient where required
delivery or consumption class
bounded timestamp or epoch
idempotency and replay protection
provider evidence where applicable
policy version
```

Economic evidence must not unnecessarily disclose:

```text
the user’s complete following list
unrelated followed creators
local mute state
private feed ordering
the complete local feed
private browsing history
```

## Revised principle

Use:

```text
Whatever can safely and truthfully remain local should remain local.
```

Do not use `offline feed` as the primary architecture label.

Preferred terms:

```text
local following list
local-first feed composition
network-hydrated feed
bounded verified feed cache
offline-capable cached viewing
private local subscription preferences
```

## Final invariant

```text
CrabLink keeps social selection private without making creator work
economically invisible.

Users choose creators locally.
CrabLink hydrates public content from the network.
The client composes the feed privately.
RustyOnions verifies eligible delivery and consumption evidence.
QuickChain remains available for deterministic commitment, replay,
confirmation, and challenge.
Only svc-wallet and ron-ledger create durable economic truth.
```

