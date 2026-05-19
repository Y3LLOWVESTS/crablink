
````markdown
---
title: MEDIA_TAURI_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, media engineers, security reviewers, ops, auditors
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
  - OFFLINE_CACHE_IDB.MD
  - FACET_SANDBOX_IDB.MD
  - TESTING_MATRIX_TAURI_IDB.MD
related-rusty-onions-docs:
  - INTEROP_BLUEPRINT.MD
  - APP_INTEGRATION_BLUEPRINT.MD
  - FULL_PROJECT_BLUEPRINT.MD
  - HARDENING_BLUEPRINT.MD
  - CONCURRENCY_AND_ALIASING_BLUEPRINT.MD
  - NEXT_LEVEL.MD
  - WEB3.MD
  - WEB3_2.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - generic browser-only media assumptions
  - small-file-only media demos pretending to be streaming
does-not-delete:
  - existing Chrome extension music/video/podcast/stream draft pages
  - gateway-first route behavior
  - typed b3 asset page model
  - offline cache b3 verification rules
  - paid-action confirmation and receipt rules
---

# MEDIA_TAURI_IDB

RO:WHAT — Defines CrabLink Tauri’s native media model for `.music`, `.song`, `.podcast`, `.video`, `.stream`, future `.film`, captions/dubs, posters, renditions, previews, range/segment playback, upload staging, offline media cache, paid media gates, and honest media security limits.

RO:WHY — Tauri gives CrabLink native filesystem, player, cache, and streaming capability. Media is one of the biggest product differentiators, but large audio/video must be bounded, verified, source-labeled, paid-gated, and honest about DRM/anti-rip limits. Media must not become an unbounded command-bridge blob path or a shortcut around RustyOnions service boundaries.

RO:INTERACTS — CrabLink React app, TypeScript media adapters, Tauri command bridge, Tauri Rust media manager, native player adapter, offline cache, OAP client, sidecar/local node supervisor, gateway client, svc-gateway, omnigate, svc-storage, svc-edge, svc-index, svc-wallet, ron-ledger, ron-accounting, svc-rewarder, ron-policy, ron-naming, ron-proto, ron-app-sdk, svc-mod, svc-sandbox, svc-passport, ron-auth, ron-kms.

RO:INVARIANTS — b3 hashes are canonical. Media bytes are immutable. Manifests describe relationships. Large media must not cross the Tauri command boundary as one full in-memory blob. Playback uses bounded range/segment paths. Cached media is trusted only after verification. Paid media does not unlock from cache alone. No fake receipts. No fake balances. No silent spend. No fake DRM or anti-rip promises. Transcoding/mod work is feature-gated behind svc-mod/svc-sandbox.

RO:METRICS — Media manifest load outcomes, playback start/stop, range request outcomes, segment cache hits/misses, stream bytes, verification results, digest mismatches, player errors, buffering events, paid-gate outcomes, receipt linkage outcomes, egress/accounting events, offline media cache quota, rendition selection, and redacted error classes.

RO:CONFIG — Media-lite enabled flag, media streaming enabled flag, player backend, max media object size, max segment bytes, range size, prefetch policy, offline media cache quota, paid media cache policy, rendition policy, autoplay policy, captions/dubs policy, upload staging policy, OAP/media source policy, sidecar media policy, developer diagnostics, mobile limits, and amnesia mode.

RO:SECURITY — Media paths are bounded and allowlisted. Local paths are not exposed to React. Cached media cannot grant paid entitlement by itself. Media links cannot execute arbitrary code. Native player surfaces receive verified/safe handles only. No path traversal. No secret leakage in metadata/logs. Capability-gated media fails closed. Watermarking may be explored honestly; DRM/anti-rip guarantees must not be claimed without real enforcement.

RO:TEST — Media-lite descriptor tests, manifest/rendition tests, b3 verification tests, range/segment tests, command-boundary no-full-blob tests, player error tests, paid-gate tests, offline media cache quota tests, digest mismatch tests, caption/dub tests, mobile constraint tests, redaction tests, and local-stack media smokes.

---

## 0. Status

This IDB defines the Tauri-native media model for CrabLink.

It is not a request to implement full production video streaming immediately.

It is not a request to replace gateway behavior.

It is not a request to build a DRM system.

It is not a request to add arbitrary media transcoding inside the client.

Correct implementation order:

```text
1. Preserve gateway-first route behavior.
2. Reuse existing React media draft pages where practical.
3. Add media-lite descriptors and manifests.
4. Add safe poster/thumbnail/cover image handling.
5. Add bounded local file staging for creator drafts.
6. Add verified small media object preview.
7. Add range/segment playback plumbing.
8. Add offline media cache after OFFLINE_CACHE_IDB gates.
9. Add OAP-backed media transfer after OAP_CLIENT_IDB gates.
10. Add sidecar media source after SIDECAR_LOCAL_NODE_IDB gates.
11. Add svc-edge/range/egress accounting route contracts.
12. Add optional transcoding/mod jobs after FACET_SANDBOX_IDB and service contracts.
```

Important sequencing rule:

```text
media-lite first
full streaming later
```

Do not jump directly to production video streaming.

---

## 1. Plain-language rule

Media in CrabLink Tauri should feel native, fast, and creator-first.

But media must stay honest.

Correct mental model:

```text
media bytes = immutable b3 objects
media manifest = description, ownership, renditions, rights, payout, receipts
renditions = separate b3 objects linked by manifest
playback = bounded range/segment reads
cache = verified local copy, not entitlement truth
paid media = backend-gated, receipt-backed access
```

Wrong mental model:

```text
video file in React state
full movie through one Tauri command
local cache means paid access forever
poster image owns the video
site owns media bytes
media player bypasses gateway/OAP policy
client-side "DRM" magically prevents copying
```

---

## 2. Why this IDB exists

The Chrome extension already has media route scaffolds:

```text
music
lyrics
video
stream
podcast
linked assets
renditions
rights
draft metadata
```

The product layer also already defines media as a b3 asset family:

```text
.video
.music
.song
.podcast
.stream
.future film/dub/captions
poster image
cover image
audio-only rendition
mobile rendition
low-bandwidth rendition
```

Tauri adds native capabilities:

```text
native file picker
local staging
media metadata extraction later
bounded streaming
native media cache
native playback adapters
OAP-backed large object transfer
sidecar/local node media source
desktop/mobile player differences
```

Those capabilities need strict rules because media can easily create:

```text
unbounded memory use
unbounded disk use
full-file command bridge blobs
path traversal
secret-leaking file paths
paid-gate bypass
copyright/DRM overclaims
fake ownership
fake publication
fake provider accounting
```

This IDB prevents those risks.

---

## 3. Goals

### 3.1 Product goals

CrabLink Tauri should eventually support:

```text
music/song asset pages
video asset pages
podcast asset pages
stream descriptor pages
cover/poster image linking
lyrics as separate assets
captions/dubs as separate assets
rendition groups
audio-only variants
mobile/desktop/low-bandwidth variants
native playback
offline verified media cache
paid media access gates
creator upload staging
manifest preview
rights/licensing display
receipt display
provider/edge/accounting summaries
```

### 3.2 Engineering goals

The implementation should provide:

```text
media-lite descriptor model
manifest/rendition model
safe player adapter
range/segment read interface
bounded command bridge
verified cache integration
OAP streaming hook
sidecar source hook
gateway fallback
typed media errors
source labels
quota-aware media cache
amnesia behavior
desktop/mobile abstraction
```

### 3.3 Security goals

The design must prevent:

```text
full-file blobs through React/Tauri command result
unverified cached media playback as trusted
paid media unlock from cache alone
arbitrary local file reads
arbitrary remote URLs in player
secret leakage in metadata/logs
fake media receipts
fake media ownership
fake publication
fake DRM/anti-rip claims
unbounded prefetch
unbounded buffering
transcoding without sandbox
```

---

## 4. Non-goals

This IDB does not implement:

```text
DRM
anti-rip guarantees
complete copyright enforcement
full production transcoding
public live streaming infrastructure
QuickChain
ROX
Solana
external settlement
staking
liquidity
exchange-facing logic
arbitrary plugin execution
browser-wide media capture
screen recording prevention
seed/capability vault logic
```

Future dedicated blueprints are required for these.

---

## 5. Definitions

### 5.1 Media asset

A media asset is a b3-backed asset whose bytes or playback representation are audio/video/stream-related.

Examples:

```text
crab://<hash>.music
crab://<hash>.song
crab://<hash>.podcast
crab://<hash>.video
crab://<hash>.stream
crab://<hash>.film
crab://<hash>.dub
crab://<hash>.lyrics
```

### 5.2 Media-lite

Media-lite is the first MVP phase.

It supports:

```text
metadata descriptors
small-file proof paths
manifest preview
poster/cover links
lyrics/caption links
basic route rendering
safe draft UI
no claim of production streaming
```

Media-lite does not mean:

```text
full video streaming
large file upload solved
range serving solved
edge caching solved
provider accounting solved
transcoding solved
```

### 5.3 Full media streaming

Full media streaming means:

```text
bounded range reads
segment reads
seek support
progressive playback
verified cache
edge/source selection
egress accounting
paid gates
error recovery
desktop/mobile constraints
```

Full streaming is later.

### 5.4 Media manifest

A media manifest describes:

```text
asset kind
canonical/original b3
content type
duration
byte length
renditions
poster/cover image
captions/dubs
lyrics
rights
ownership
payout splits
storage/provider data
receipts
version history
```

A manifest is not the raw media bytes unless it is itself a b3 object.

### 5.5 Rendition

A rendition is a separate media object derived from or related to a canonical original.

Examples:

```text
original/master
desktop 1080p
mobile 720p
low-bandwidth 480p
audio-only
poster image
thumbnail
preview clip
caption track
dub track
transcript
waveform
```

Each rendition must have its own b3 ID and typed asset URL when published.

### 5.6 Rendition group

A rendition group links sibling renditions that belong to the same media work.

It should include:

```text
rendition_group_id
canonical/original pointer
sibling rendition list
compatibility metadata
rights/licensing metadata
version history
```

### 5.7 Poster image

A poster image is a separate `.image` asset used as preview art for video/film/stream.

It has its own b3 ID and manifest.

### 5.8 Cover image

A cover image is a separate `.image` asset used for music/song/podcast.

It has its own b3 ID and manifest.

### 5.9 Lyrics asset

Lyrics should be a separate `.lyrics` asset.

Lyrics are not embedded into a `.music` or `.song` manifest as their only source of truth.

### 5.10 Caption/subtitle asset

A caption/subtitle asset is a separate text/timed-text object.

Possible kinds:

```text
.caption
.subtitle
.dub
.transcript
```

Exact public extension names may be finalized later.

### 5.11 Stream descriptor

A `.stream` asset is a descriptor for live or scheduled stream metadata.

It is not necessarily a raw media recording.

It may point to:

```text
schedule
access policy
chat/mod policy
stream endpoint descriptor
future recording
future podcast companion
future VOD asset
```

### 5.12 Podcast asset

A `.podcast` asset may represent:

```text
show
episode
feed descriptor
audio object
episode manifest
stream companion recording
```

Exact route contracts must distinguish show-level and episode-level later.

### 5.13 Media source

A media source is where bytes are read from.

Examples:

```text
gateway
oap
sidecar_gateway
sidecar_oap
offline_verified_cache
local_draft
```

### 5.14 Media range

A media range is a byte range requested for playback or caching.

### 5.15 Segment

A segment is a bounded media piece used for streaming/cache/playback.

Segments may be protocol-defined later.

### 5.16 Verified media cache

A verified media cache stores media bytes or segments only after b3 or manifest-defined verification.

### 5.17 Paid media gate

A paid media gate is a backend access decision requiring explicit payment or verified entitlement before media playback.

### 5.18 Watermark

A watermark is a visible or invisible mark identifying source/account/session/content.

Watermarking may discourage misuse but is not DRM.

### 5.19 DRM

DRM means technical enforcement of playback/copy restrictions.

CrabLink must not claim DRM until a real, audited enforcement design exists.

---

## 6. Non-negotiable invariants

### [I-1] b3 hashes are canonical

All published media bytes use canonical b3 IDs:

```text
b3:<64 lowercase hex>
```

Public typed media URLs use:

```text
crab://<64 lowercase hex>.<media_kind>
```

Examples:

```text
crab://<hash>.video
crab://<hash>.music
crab://<hash>.song
crab://<hash>.podcast
crab://<hash>.stream
crab://<hash>.lyrics
```

Names are pointers.

Hashes are canonical.

---

### [I-2] Media bytes are immutable

Once bytes have a b3 ID, the bytes must not change.

Changing media creates:

```text
new bytes
new b3 ID
new typed crab URL
new manifest/version pointer
```

Do not overwrite existing b3 content.

---

### [I-3] Manifests describe relationships

Media relationships belong in manifests:

```text
renditions
poster/cover links
lyrics
captions
dubs
rights
ownership
payouts
receipts
storage/provider data
version history
```

Do not hide these relationships inside ad hoc UI state.

---

### [I-4] Each rendition is its own object

A rendition must have:

```text
own b3 ID
own byte length
own content type
own typed URL when published
own verification path
own manifest or manifest entry
```

Do not treat variants as mutable properties of one file.

---

### [I-5] Large media must not cross the command boundary as one blob

Forbidden:

```text
entire movie in React state
entire song as base64 in command result
full video file passed as JSON
unbounded Vec<u8> in Tauri command result
full media file copied into localStorage
```

Allowed:

```text
stream handle
safe render handle
range request
segment request
verified cache handle
local draft handle
bounded metadata DTO
```

---

### [I-6] Playback uses bounded range/segment paths

Serious media playback must use:

```text
range reads
segment reads
bounded buffers
cancel support
backpressure
source labels
typed errors
```

No unbounded buffering.

---

### [I-7] Media cache is verified before trusted playback

Cached media may be played as trusted only after verification rules pass.

For whole-object b3 media:

```text
compute BLAKE3(bytes)
compare to expected b3
```

For segmented media:

```text
verify segment against manifest-defined proof
or verify whole object after full completion
or mark segment as temporary/untrusted until proof exists
```

Do not pretend partial unverified bytes are trusted.

---

### [I-8] Paid media cannot unlock from cache alone

Default:

```text
cached receipt + cached media bytes != entitlement
```

Paid media playback requires backend access decision unless a future offline entitlement proof is explicitly defined.

---

### [I-9] No silent media spend

Media playback must not trigger silent spend.

Examples requiring explicit confirmation:

```text
paid song play
paid video view
paid podcast episode
paid stream access
paid high-resolution rendition
paid download/cache entitlement
paid creator subscription
```

Autoplay cannot spend.

Preload cannot spend.

---

### [I-10] Receipts are backend-derived

Media receipts may be displayed if backend returns them.

CrabLink Tauri must not invent:

```text
play receipt
purchase receipt
download receipt
publish receipt
storage receipt
provider receipt
```

---

### [I-11] Media does not own wallet/ledger truth

Media pages may show payment/receipt state.

They must not calculate authoritative balance or mutate ledger.

Wallet/ledger path remains:

```text
CrabLink Tauri
→ gateway/OAP route
→ svc-wallet
→ ron-ledger
```

---

### [I-12] Media does not own storage/index truth

Media pages may request publish/upload through product routes.

They must not directly mutate:

```text
svc-storage
svc-index
ron-ledger
ron-accounting
svc-rewarder
```

---

### [I-13] No fake DRM promises

The UI/docs must not claim:

```text
cannot be copied
cannot be recorded
anti-piracy guaranteed
DRM protected
secure stream cannot be ripped
```

unless a real enforcement system exists.

Honest wording:

```text
Watermarking may discourage misuse.
Access is policy-gated.
Playback may be receipt-gated.
Files may still be copied once rendered on a user-controlled device.
```

---

### [I-14] Watermarking is optional and honest

Watermarking may be explored for:

```text
creator branding
session/account traceability
discouraging reupload
forensic investigation
```

But watermarking is not DRM.

Watermarking must not reveal private main→alt linkage by default.

---

### [I-15] Transcoding is not client-owned

Production transcoding should not be implemented inside CrabLink Tauri as arbitrary local code.

Future path:

```text
svc-mod
→ svc-sandbox
→ bounded transcode job
→ svc-storage
→ manifest update
```

Client-side preview/transcode experiments must be local-only and clearly labeled.

---

### [I-16] Media accounting is backend-owned

Playback/serve/storage events may feed `ron-accounting`.

CrabLink may emit or forward safe client events only when a backend route contract exists.

CrabLink must not invent reward/payout truth.

---

### [I-17] Mobile constraints are first-class

Mobile must not depend on:

```text
desktop-only player APIs
large persistent cache
sidecar/local node
background daemon
hover UI
desktop file paths
```

---

### [I-18] Amnesia mode is honored

In amnesia mode:

```text
media cache is session-only or disabled
draft staging policy is explicit
logs are redacted
playback handles are cleared
partial media downloads are purged
```

---

### [I-19] Source labels are mandatory

Media responses and playback surfaces should identify source:

```text
gateway
oap
sidecar_gateway
sidecar_oap
offline_verified_cache
local_draft
```

---

### [I-20] Media is not arbitrary code execution

Media files/manifests must not execute arbitrary JS/WASM/native code.

Embedded players are trusted CrabLink/Tauri code.

Remote media metadata is data, not executable logic.

---

## 7. Media asset classes

### 7.1 `.music`

Represents music/audio work or audio asset.

MVP fields:

```text
title
artist
album
duration
content type
asset b3
cover image
lyrics link
rights
tags
```

Future fields:

```text
stems
preview clip
audio-only renditions
waveform
licensing splits
ISRC-like identifiers if desired
```

### 7.2 `.song`

May represent a song as a specific music asset type.

If `.music` and `.song` both exist, route contracts must define the difference.

Possible model:

```text
.music = broad audio asset category
.song = song-specific subtype
```

Do not duplicate semantics indefinitely.

### 7.3 `.podcast`

Represents podcast show/episode assets.

MVP:

```text
episode metadata
audio b3
cover image
duration
description
tags
rights
```

Future:

```text
show feed
episode list
chapters
transcript
stream companion
paid episode access
```

### 7.4 `.video`

Represents video/VOD asset.

MVP:

```text
title
description
video b3
poster image
duration
byte length
content type
basic rendition list
```

Future:

```text
range/segment playback
desktop/mobile/low-bandwidth renditions
audio-only rendition
captions/dubs
thumbnails
chapters
paid access
edge/provider accounting
```

### 7.5 `.stream`

Represents live/scheduled stream descriptor.

MVP:

```text
title
category
schedule
access policy
creator
chat/mod policy placeholder
future endpoint descriptor
```

Future:

```text
live OAP/edge stream
stream + podcast companion
recording to VOD
post-stream podcast publish
live receipts
moderation events
```

### 7.6 `.lyrics`

Represents lyrics as separate rights-bearing content.

Rules:

```text
lyrics are separate b3 asset
lyrics have separate manifest
lyrics may have separate paid/access policy
lyrics may have separate takedown/version history
```

### 7.7 `.caption` / `.subtitle` / `.dub`

Future timed-text/audio localization assets.

Rules:

```text
separate b3 objects
linked from media manifest
language metadata
timing metadata
version history
rights metadata
```

Exact public type names can be finalized later.

### 7.8 `.film`

Future long-form video/film asset.

Should use the same rendition/range/paid/cache rules as `.video`.

Not first-batch scope.

---

## 8. Media-lite model

### 8.1 Purpose

Media-lite lets CrabLink Tauri represent media assets before full streaming exists.

Media-lite is valuable because it can prove:

```text
route UX
metadata model
manifest structure
cover/poster linking
lyrics/caption linking
rights display
receipt display
small-file preview
draft flow
```

### 8.2 Media-lite allowed

Allowed:

```text
small audio/video test files
metadata forms
manifest preview
cover/poster image selection
linked lyrics/captions
safe object fetch by gateway
basic playback if file is small and bounded
no production streaming claims
```

### 8.3 Media-lite forbidden

Forbidden:

```text
claim full streaming is done
unbounded upload
unbounded playback buffer
paid offline media access
production transcoding
edge accounting claims
provider payout claims
DRM claims
```

### 8.4 Media-lite manifest example

```json
{
  "schema": "ron.media-asset.v1",
  "kind": "video",
  "title": "Example Video",
  "content_type": "video/mp4",
  "asset_cid": "b3:0000000000000000000000000000000000000000000000000000000000000000",
  "byte_length": 123456,
  "duration_ms": 12345,
  "poster_image": "crab://1111111111111111111111111111111111111111111111111111111111111111.image",
  "rendition_group_id": "rg_example",
  "rights": {
    "license": "creator-defined"
  }
}
```

---

## 9. Media manifest model

### 9.1 Required manifest fields

Suggested minimum:

```text
schema
asset_kind
title
description
creator/owner
canonical_asset_cid
manifest_cid when known
content_type
byte_length
duration_ms when known
poster_or_cover
renditions
linked_assets
rights
payout
storage/provider summary
receipts
version history
```

### 9.2 Linked assets

Media manifests may link:

```text
cover image
poster image
thumbnail
lyrics
captions
subtitles
dubs
transcript
preview clip
audio-only rendition
waveform
chapters
related article/post
```

### 9.3 Linked asset rule

Every linked asset must remain independent:

```text
own b3 ID
own manifest
own ownership/payout metadata where applicable
own paid/access policy where applicable
```

### 9.4 Version history

Media manifests should support version/history from the beginning.

Reasons:

```text
rights changes
rendition changes
caption fixes
poster updates
takedowns
ownership changes
payout changes
receipt/provenance changes
```

### 9.5 Do not embed everything

Do not put giant captions, lyrics, transcripts, or media bytes directly into the primary manifest if they should be separate assets.

Use references.

---

## 10. Rendition model

### 10.1 Example video rendition family

```text
crab://aaa....video  original/master
crab://bbb....video  desktop 1080p
crab://ccc....video  mobile 720p
crab://ddd....video  low-bandwidth 480p
crab://eee....music  audio-only
crab://fff....image  poster/thumbnail
crab://ggg....caption captions/subtitles
crab://hhh....dub    dub track
```

### 10.2 Rendition fields

Suggested fields:

```text
rendition_id
rendition_group_id
kind
asset_cid
crab_url
content_type
byte_length
duration_ms
width
height
bitrate
audio_channels
language
role
is_original
is_default
created_from
created_at
```

### 10.3 Rendition roles

Possible roles:

```text
original
desktop
mobile
low_bandwidth
audio_only
preview
poster
thumbnail
caption
subtitle
dub
transcript
waveform
```

### 10.4 Rendition selection

The app may choose rendition based on:

```text
user preference
device type
network condition
screen size
available cache
paid/access policy
backend availability
```

The app must not choose a paid rendition without access.

### 10.5 Rendition cache

Each rendition caches separately.

Cache key should be b3 ID.

Not:

```text
title
filename
quality label
site name
```

---

## 11. Playback model

### 11.1 Player ownership

React owns:

```text
player UI
controls
progress display
source labels
error display
```

Tauri Rust owns:

```text
safe media source resolution
range/segment access
cache handles
local path safety
redaction
verification state
```

Native/WebView player owns:

```text
actual playback
decode
seek
pause
resume
buffering
```

### 11.2 Player source

Player should receive a safe handle, not arbitrary file path.

Possible safe handles:

```text
app://media/<safe-handle>
blob URL mediated by app
custom protocol URL
verified cache render handle
gateway URL with policy token if allowed
```

Avoid:

```text
file:///Users/... raw path to React
arbitrary local path
unverified remote URL
full bytes in JS memory
```

### 11.3 Autoplay

Default:

```text
autoplay = false
```

Autoplay must never spend.

Autoplay must respect platform rules.

### 11.4 Preload

Preload must be bounded.

Possible settings:

```text
none
metadata
small_initial_range
first_segment
```

Preload must not trigger paid spend.

### 11.5 Seek

Seek requires range/segment support.

If range is unavailable:

```text
show limited playback mode
do not full-buffer giant media to emulate seek
```

### 11.6 Cancel

Playback and prefetch must support cancel.

On cancel:

```text
stop source request
release buffers
preserve verified cache only if complete/proven
quarantine partials if needed
```

---

## 12. Range and segment model

### 12.1 Range request

A range request asks for a byte span.

Suggested fields:

```text
content_id
asset_kind
range_start
range_end
source_preference
access_context
correlation_id
```

### 12.2 Segment request

A segment request asks for a manifest-defined segment.

Suggested fields:

```text
content_id
segment_id
segment_index
source_preference
access_context
correlation_id
```

### 12.3 Bounds

All range/segment requests must enforce:

```text
max_range_bytes
max_segment_bytes
max_inflight_ranges
max_prefetch_segments
timeout
cancel token
```

### 12.4 Verification

Whole-object verification is easy.

Segment verification requires one of:

```text
manifest-defined segment hashes
Merkle/chunk proof later
full object verification after completion
temporary untrusted status until verified
```

Do not overclaim segment trust without proof.

### 12.5 Range fallback

If range unsupported:

```text
use small media fallback only if within configured bounds
else show unsupported streaming path
```

---

## 13. Upload and creator staging

### 13.1 Local staging

Tauri may stage local creator media before publish.

Rules:

```text
file picker selected by user
bounded metadata scan
do not upload immediately without user action
compute local preview b3 if desired
mark as local draft
```

### 13.2 Publish flow

Media publish should eventually follow:

```text
select media file
extract safe metadata
compute local b3 preview
create media draft manifest
prepare paid publish/storage quote
show explicit confirmation
upload through backend product/storage route
backend stores bytes by b3
backend stores manifest by b3
backend writes index pointer
backend returns crab URL
backend returns receipt(s)
local catalog display entry written
```

### 13.3 Chunked upload

Large media upload requires chunked/bounded path.

Do not upload large media through one giant command body.

Possible future path:

```text
Tauri Rust reads local file in chunks
OAP/gateway upload stream
svc-storage receives bounded chunks
backend verifies b3
product route publishes manifest/index pointer
```

### 13.4 Upload anti-scope

First media batch must not claim:

```text
resumable upload solved
transcoding solved
edge distribution solved
provider payout solved
DRM solved
```

---

## 14. Offline media cache

### 14.1 Relation to OFFLINE_CACHE_IDB

Offline media cache must obey `OFFLINE_CACHE_IDB.MD`.

Rules:

```text
verified before trusted playback
quota enforced
source-labeled
partial files quarantined
paid content not unlocked by cache alone
amnesia purges as configured
```

### 14.2 Media cache categories

Suggested categories:

```text
media_original
media_rendition
media_segment
media_preview
media_thumbnail
media_caption
media_waveform
```

### 14.3 Quotas

Media needs separate quota.

Suggested config:

```text
max_media_cache_bytes
max_media_entry_bytes
max_segment_bytes
max_prefetch_bytes
max_offline_downloads
```

### 14.4 Partial cache

Partial media cache is common.

Partial cache must track:

```text
range/segment coverage
verification status
source label
last access
expiry
paid/access state
```

### 14.5 Paid media cache

Default:

```text
paid media body cache disabled
paid receipt display cache allowed
paid unlock from cache disabled
```

Future paid offline media requires backend route contract.

---

## 15. Paid media

### 15.1 Paid media actions

Examples:

```text
paid song play
paid podcast episode
paid video view
paid stream access
paid download/cache access
paid high-resolution rendition
paid full-length access after free preview
```

### 15.2 Required flow

```text
resolve media page
detect paid gate
prepare/quote
show explicit confirmation
wallet operation through backend
backend receipt returned
backend unlock/access decision returned
player receives allowed source
receipt display cache updated
```

### 15.3 Preview/free sample

A manifest may define free preview:

```text
first 30 seconds
trailer clip
low-resolution preview
watermarked preview
audio preview
thumbnail gallery
```

Preview must be explicit in backend/manifest policy.

### 15.4 No spend on playback side effects

No spend triggered by:

```text
autoplay
preload
hover
scroll
thumbnail load
poster load
route open
deep link
```

### 15.5 Paid timeout ambiguity

If paid media operation times out:

```text
do not assume success
do not assume failure
show verify receipt/status path
do not retry mutation without idempotency
```

---

## 16. Accounting and rewards

### 16.1 Accounting events

Media may eventually generate events:

```text
play_started
play_completed
watch_seconds
listen_seconds
range_served
egress_bytes
cache_hit
cache_miss
storage_byte_days
paid_view
preview_view
```

### 16.2 Backend ownership

`ron-accounting` owns usage/metering snapshots.

CrabLink does not own final accounting truth.

### 16.3 Rewarder ownership

`svc-rewarder` plans rewards.

CrabLink does not calculate final payouts.

### 16.4 Safe first accounting

Safer first events:

```text
paid_view
storage_bytes
egress_bytes
range_served
cache_hit/miss summary
```

Avoid raw free impression rewards in early MVP.

### 16.5 Anti-abuse

Do not implement view-farming rewards in the client.

Do not pay based solely on client-reported watch seconds.

---

## 17. svc-edge relation

`svc-edge` is the natural future owner for:

```text
range delivery
edge cache
egress accounting
provider role
media serving
```

CrabLink Tauri may consume edge routes.

CrabLink Tauri must not become svc-edge.

Initial media can be gateway-first.

Future serious media likely needs edge-aware route contracts.

---

## 18. svc-storage relation

`svc-storage` owns bytes by b3.

Rules:

```text
storage stores bytes only
media manifest/ownership/payout lookup is upstream
storage does not own media player semantics
storage does not own wallet mutation
storage does not own index pointers
```

CrabLink must use product/storage route contracts.

---

## 19. svc-index relation

`svc-index` owns pointers/catalog/lookup.

Media index may include:

```text
asset CID → manifest CID
rendition group lookup
creator catalogue
site reference graph
search facets later
```

CrabLink must not write index pointers directly.

---

## 20. OAP relation

OAP is likely important for large media.

Rules:

```text
OAP is Rust-side only
frame max remains 1 MiB
stream chunks are bounded
large media uses streaming/range/segment, not full command result
capabilities fail closed
OAP does not bypass paid gates
gateway fallback remains available
```

Possible OAP media paths:

```text
oap_media_get_manifest
oap_media_get_range
oap_media_get_segment
oap_media_stream_to_cache
oap_media_cancel_stream
```

---

## 21. Sidecar relation

Sidecar may later improve local media serving.

Rules:

```text
sidecar disabled by default
source label required
sidecar does not grant media entitlement
sidecar does not grant wallet authority
sidecar media cache still verifies b3
paid gates remain backend/service-gated
```

---

## 22. Passport/vault relation

Passport/vault rules apply to media.

Media must not expose:

```text
private keys
capability tokens
private alt linkage
wallet secrets
vault handles
```

Paid media access may depend on active passport/wallet link.

Switching passport must clear pending paid media confirmations.

Shared wallet/payout warnings may matter for creator media identities.

---

## 23. Offline cache relation

Media cache must obey offline cache.

Rules:

```text
verified b3 before trusted playback
source labels
quota
quarantine digest mismatch
paid cache disabled by default
amnesia purge
```

---

## 24. Facet/sandbox relation

Media transcoding, filters, AI enhancement, code/game-algo playback, or executable media facets require `FACET_SANDBOX_IDB.MD`.

Forbidden in media IDB first phase:

```text
arbitrary ffmpeg-like command execution from UI
untrusted codec plugin execution
untrusted WASM media processor
creator-supplied JS player
site-supplied native player
```

---

## 25. DRM, anti-rip, and watermark honesty

### 25.1 DRM

Current stance:

```text
no DRM claims
```

Allowed wording:

```text
Access is paid-gated.
Receipts can prove paid access.
Watermarks may discourage misuse.
```

Forbidden wording:

```text
cannot be copied
cannot be ripped
DRM protected
unrecordable
piracy-proof
```

### 25.2 Anti-rip honesty

Once media plays on a user-controlled device, perfect prevention is not realistic without a full DRM platform.

CrabLink should be honest.

### 25.3 Watermarking possibility

Future watermarking could include:

```text
visible creator watermark
session watermark
account-scoped watermark
download watermark
preview watermark
```

Risks:

```text
privacy leaks
main→alt linkage
false accusation
watermark removal
creator UX friction
```

Watermarking requires separate route/policy design before production claims.

### 25.4 Forensic logs

Do not build client-side surveillance.

Any forensic/media audit design must be privacy-reviewed and policy-gated.

---

## 26. Native player model

### 26.1 Player backends

Possible backends:

```text
WebView native HTML media element
Tauri custom protocol serving verified cache
platform media APIs later
external OS player disabled by default
```

### 26.2 Initial player

Initial player should prefer:

```text
HTML audio/video element
safe app URL
bounded source
no raw local path exposure
```

### 26.3 Player events

Allowed safe events:

```text
play
pause
ended
timeupdate summary
error
buffering
range requested
source changed
```

Avoid high-frequency telemetry by default.

### 26.4 Player error normalization

Player errors must map to typed app-safe errors.

Do not expose raw platform stack traces with secrets or local paths.

---

## 27. Desktop and mobile constraints

### 27.1 Desktop

Desktop can support:

```text
larger cache
local staging
drag/drop
sidecar later
developer diagnostics
file picker
range-to-cache
```

### 27.2 iOS/Android

Mobile constraints:

```text
smaller cache
OS background limits
no sidecar assumption
platform media permissions
battery impact
network switching
limited file paths
stricter autoplay
```

### 27.3 Mobile default

Mobile should remain:

```text
gateway-first
small cache
no sidecar
media-lite first
no large offline downloads by default
```

---

## 28. Command boundary

### 28.1 Initial commands

Recommended first commands:

```text
media_get_status
media_get_config_summary
media_validate_manifest
media_get_supported_types
media_get_player_capabilities
```

### 28.2 Media-lite commands

```text
media_create_draft
media_update_draft
media_validate_draft
media_get_manifest_preview
media_select_local_file
media_get_local_file_summary
media_compute_local_b3_preview
```

### 28.3 Playback commands

```text
media_prepare_playback
media_get_safe_source
media_get_range
media_cancel_playback_source
media_report_player_event
```

### 28.4 Cache commands

```text
media_cache_get_status
media_cache_store_verified
media_cache_get_render_handle
media_cache_clear
media_cache_get_quota
```

### 28.5 Future upload commands

```text
media_prepare_publish
media_stage_upload
media_upload_chunked
media_cancel_upload
media_verify_uploaded_b3
```

Exact names should follow TAURI_COMMAND_BRIDGE_IDB conventions.

### 28.6 Forbidden commands

Forbidden:

```text
media_raw_read_path
media_raw_write_path
media_trust_unverified_file
media_full_blob_to_react
media_unlock_paid_from_cache
media_create_receipt
media_set_balance
media_direct_storage_write
media_direct_index_write
media_run_transcoder_shell
media_execute_plugin
```

---

## 29. React/TypeScript boundary

### 29.1 React may

```text
render player UI
show metadata
show manifest preview
show paid gate
show receipt display
show source labels
show cache state
show errors
request typed media actions
```

### 29.2 React must not

```text
read arbitrary local files
receive raw local paths
own media verification
own paid unlock truth
hold full large media bytes
build OAP frames
execute media plugins
```

### 29.3 TypeScript may

```text
normalize safe metadata
call typed Tauri commands
format duration/size
render source labels
map errors
```

### 29.4 TypeScript must not

```text
declare b3 verification truth
own player entitlement truth
persist raw secrets
full-buffer large media
directly mutate backend services
```

---

## 30. Suggested TypeScript adapter surface

Design target:

```ts
type MediaKind =
  | 'music'
  | 'song'
  | 'podcast'
  | 'video'
  | 'stream'
  | 'lyrics'
  | 'caption'
  | 'dub'
  | 'film';

type MediaSource =
  | 'gateway'
  | 'oap'
  | 'sidecar_gateway'
  | 'sidecar_oap'
  | 'offline_verified_cache'
  | 'local_draft';

type MediaTrustStatus =
  | 'backend_confirmed'
  | 'verified_b3'
  | 'display_copy'
  | 'local_draft'
  | 'pending_verification'
  | 'paid_locked'
  | 'unavailable'
  | 'quarantined';

type MediaRendition = {
  renditionId: string;
  groupId: string;
  role: 'original' | 'desktop' | 'mobile' | 'low_bandwidth' | 'audio_only' | 'preview' | 'poster' | 'caption' | 'dub';
  crabUrl?: string;
  contentId?: string;
  contentType?: string;
  byteLength?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  language?: string;
  source?: MediaSource;
  trustStatus?: MediaTrustStatus;
};

type MediaPlaybackSource = {
  schema: 'crablink.media-playback-source.v1';
  mediaKind: MediaKind;
  source: MediaSource;
  trustStatus: MediaTrustStatus;
  safeHandle: string;
  contentType: string;
  byteLength?: number;
  durationMs?: number;
  warnings: string[];
};
```

Rules:

```text
TypeScript shape is display/adapter only.
Rust verifies b3/cache/local path safety.
Backend remains truth.
```

---

## 31. Suggested Tauri Rust module targets

Likely future modules:

```text
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/types.rs
apps/crablink-tauri/src-tauri/src/media/config.rs
apps/crablink-tauri/src-tauri/src/media/errors.rs
apps/crablink-tauri/src-tauri/src/media/redact.rs
apps/crablink-tauri/src-tauri/src/media/manifest.rs
apps/crablink-tauri/src-tauri/src/media/renditions.rs
apps/crablink-tauri/src-tauri/src/media/player.rs
apps/crablink-tauri/src-tauri/src/media/source.rs
apps/crablink-tauri/src-tauri/src/media/range.rs
apps/crablink-tauri/src-tauri/src/media/cache.rs
apps/crablink-tauri/src-tauri/src/media/staging.rs
apps/crablink-tauri/src-tauri/src/media/upload.rs
apps/crablink-tauri/src-tauri/src/media/amnesia.rs

apps/crablink-tauri/src-tauri/src/commands/media.rs
```

Likely frontend files:

```text
apps/crablink-tauri/src/shared/media/mediaTypes.ts
apps/crablink-tauri/src/shared/media/mediaClient.ts
apps/crablink-tauri/src/shared/media/mediaErrors.ts
apps/crablink-tauri/src/shared/media/mediaLabels.ts
apps/crablink-tauri/src/shared/media/renditions.ts

apps/crablink-tauri/src/pages/music/
apps/crablink-tauri/src/pages/video/
apps/crablink-tauri/src/pages/podcast/
apps/crablink-tauri/src/pages/stream/
apps/crablink-tauri/src/pages/lyrics/
```

Do not add dependencies without reviewing CODECHECK and project dependency policy.

---

## 32. Config

Suggested config:

```toml
[media]
enabled = true
media_lite_enabled = true
media_streaming_enabled = false
developer_diagnostics = true
autoplay = false
preload = "metadata"
max_media_object_bytes = 104857600
max_command_payload_bytes = 1048576
max_range_bytes = 1048576
max_segment_bytes = 1048576
max_inflight_ranges = 4
range_timeout_ms = 5000
playback_source_preference = "gateway_first"

[media.kinds]
music = true
song = true
podcast = true
video = true
stream = true
lyrics = true
caption = false
dub = false
film = false

[media.renditions]
enabled = true
prefer_mobile_on_mobile = true
allow_audio_only = true
allow_low_bandwidth = true
allow_preview = true

[media.cache]
enabled = false
max_media_cache_bytes = 1073741824
max_media_entry_bytes = 524288000
max_prefetch_bytes = 67108864
allow_offline_public_media = true
allow_paid_media_cache = false
allow_paid_unlock_from_cache = false

[media.oap]
enabled = false
allow_range_reads = false
allow_stream_to_cache = false
fallback_gateway = true

[media.sidecar]
enabled = false
allow_local_gateway_source = false
allow_local_oap_source = false

[media.upload]
enabled = false
chunked_upload_enabled = false
max_staging_bytes = 1073741824
compute_local_b3_preview = true

[media.security]
deny_full_blob_to_react = true
deny_raw_local_paths = true
deny_unverified_playback = true
deny_paid_cache_unlock = true
deny_fake_drm_claims = true
deny_transcoder_shell = true
redact_diagnostics = true

[media.amnesia]
purge_cache_on_shutdown = true
purge_staging_on_shutdown = true
persist_media_cache = false
persist_drafts = false
```

Config rules:

```text
media-lite may be on before full streaming
media_streaming_enabled false until range/segment gates pass
media cache disabled until offline cache gates pass
paid media cache disabled by default
OAP media disabled until OAP gates pass
sidecar media disabled until sidecar gates pass
upload disabled until publish route contracts exist
amnesia overrides persistence
```

---

## 33. Error taxonomy

Suggested app-safe errors:

```text
media_disabled
media_lite_only
media_streaming_disabled
media_kind_unsupported
media_manifest_invalid
media_manifest_unverified
media_rendition_missing
media_source_unavailable
media_source_policy_denied
media_paid_locked
media_paid_confirmation_required
media_paid_unlock_denied
media_receipt_missing
media_cache_disabled
media_cache_miss
media_cache_unverified
media_cache_digest_mismatch
media_cache_quota_exceeded
media_range_unsupported
media_range_invalid
media_range_too_large
media_segment_missing
media_segment_unverified
media_playback_failed
media_playback_cancelled
media_codec_unsupported
media_content_type_denied
media_local_file_denied
media_path_denied
media_upload_disabled
media_upload_too_large
media_upload_cancelled
media_oap_unavailable
media_sidecar_unavailable
media_amnesia_persistence_denied
media_fake_drm_claim_denied
media_redacted_internal_error
```

### 33.1 User-facing copy examples

```text
This media type is not supported yet.
This route is media-lite only; full streaming is not enabled.
This media file is too large for the current preview path.
This cached media could not be verified.
Paid media requires backend access verification before playback.
This platform cannot play this media format.
This stream path is unavailable; try gateway mode.
No DRM guarantee is provided. Access is policy-gated, not copy-proof.
```

### 33.2 Developer diagnostics

May include:

```text
media kind
source label
trust status
content type
byte length
range size
segment index
safe b3 ID
route class
correlation ID
redacted backend error
```

Must not include:

```text
raw capability tokens
Authorization headers
private keys
seed material
private alt linkage
raw local path
full media bytes
```

---

## 34. Metrics

Suggested metrics:

```text
crablink_media_manifest_load_total{kind,source,outcome}
crablink_media_playback_start_total{kind,source,outcome}
crablink_media_playback_stop_total{kind,reason}
crablink_media_range_request_total{kind,source,outcome}
crablink_media_segment_request_total{kind,source,outcome}
crablink_media_stream_bytes_total{kind,source}
crablink_media_cache_hit_total{kind}
crablink_media_cache_miss_total{kind}
crablink_media_verify_total{kind,outcome}
crablink_media_digest_mismatch_total{kind}
crablink_media_paid_gate_total{kind,outcome}
crablink_media_rendition_select_total{kind,role,outcome}
crablink_media_upload_stage_total{kind,outcome}
crablink_media_player_error_total{kind,error_class}
crablink_media_amnesia_purge_total{outcome}
crablink_media_redaction_total{field_class}
```

Metric label safety:

```text
avoid full b3 hash if high-cardinality policy forbids
avoid full crab URLs
avoid titles
avoid passport subjects
avoid wallet accounts
avoid receipt hashes
avoid local paths
avoid private filenames
```

Use bounded labels:

```text
kind
source
outcome
role
error_class
```

---

## 35. UI requirements

### 35.1 Media page truth labels

Media pages should show:

```text
source
trust status
paid/access state
cache state
manifest state
rendition selected
```

Examples:

```text
Source: Gateway
Verified cached copy
Media-lite preview
Paid media locked
Offline preview unavailable
```

### 35.2 Media-lite label

When full streaming is not enabled:

```text
Media-lite — metadata and small-file preview only. Full streaming is not enabled yet.
```

### 35.3 Paid media label

```text
This media requires backend access verification before playback.
```

### 35.4 Cache label

```text
Verified media cache — b3 matched.
```

or:

```text
Cached media unavailable because verification failed.
```

### 35.5 DRM honesty label

Where appropriate:

```text
CrabLink can gate access and show receipts, but it does not currently provide DRM or anti-rip guarantees.
```

### 35.6 Rendition selector

Rendition UI should show:

```text
Original
Desktop
Mobile
Low bandwidth
Audio only
Preview
Captions
Dubs
```

Only selectable renditions that are available and policy-allowed should be active.

### 35.7 Upload/draft UI

Creator UI should distinguish:

```text
local draft
local b3 preview
prepared publish
published asset
backend-confirmed b3
backend receipt
```

---

## 36. Mobile UI requirements

Mobile UI should:

```text
default to smaller rendition
avoid auto-download
avoid large offline cache by default
show storage warning
use touch-safe controls
avoid hover-only controls
handle app background/foreground
show network source changes
```

Mobile should not require:

```text
sidecar
desktop file paths
developer diagnostics
large persistent cache
```

---

## 37. Testing matrix

### 37.1 React tests

Test:

```text
media-lite label
player source label
paid media gate
rendition selector
caption/lyrics links
cache verified label
DRM honesty copy
upload draft state
mobile layout
```

### 37.2 TypeScript adapter tests

Test:

```text
media manifest normalization
rendition normalization
source label mapping
trust status mapping
duration/size formatting
error mapping
no secret field display
```

### 37.3 Rust unit tests

Test:

```text
manifest validation
b3 validation
content type allowlist
range validation
segment validation
source selection
safe handle creation
path redaction
error mapping
amnesia purge plan
```

### 37.4 Rust integration tests

Test:

```text
small media preview
range request bounded
oversized range rejected
cache hit playback source
digest mismatch rejection
paid cache unlock denial
local file summary without raw path leak
cancel range request
player error mapping
```

### 37.5 Security regression tests

Test:

```text
full media blob cannot cross command boundary
React cannot read raw local path
unverified media cannot render as trusted
paid media cannot unlock from cache alone
deep link cannot trigger paid media spend
deep link cannot select arbitrary local file
media command cannot run transcoder shell
metadata cannot execute JS/WASM/native code
logs redact paths/tokens/secrets
```

### 37.6 Smoke scripts

Recommended future scripts:

```text
scripts/smoke-tauri-media-status.sh
scripts/smoke-tauri-media-lite-video.sh
scripts/smoke-tauri-media-lite-music.sh
scripts/smoke-tauri-media-range-bounds.sh
scripts/smoke-tauri-media-cache-verify.sh
scripts/smoke-tauri-media-paid-gate.sh
scripts/smoke-tauri-media-no-full-blob.sh
scripts/smoke-tauri-media-amnesia.sh
scripts/smoke-tauri-media-mobile-config.sh
```

---

## 38. First implementation batch recommendation

### Batch M1 — Media status shell + media-lite descriptors

Do this after base Tauri command bridge and route migration are stable.

Likely files:

```text
apps/crablink-tauri/src/shared/media/mediaTypes.ts
apps/crablink-tauri/src/shared/media/mediaClient.ts
apps/crablink-tauri/src/shared/media/mediaErrors.ts
apps/crablink-tauri/src/shared/media/mediaLabels.ts
apps/crablink-tauri/src/shared/media/renditions.ts

apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/types.rs
apps/crablink-tauri/src-tauri/src/media/config.rs
apps/crablink-tauri/src-tauri/src/media/errors.rs
apps/crablink-tauri/src-tauri/src/media/redact.rs
apps/crablink-tauri/src-tauri/src/media/manifest.rs
```

Initial scope:

```text
media_get_status
media_get_config_summary
media_validate_manifest
media-lite display DTOs
no full streaming
no upload
no cache entitlement
```

Acceptance:

```text
- Media-lite status is truthful.
- Full streaming reports disabled.
- Manifest validation is typed.
- React receives no raw paths.
- No full media blob command exists.
```

---

### Batch M2 — Reuse media route pages

Scope:

```text
port/reuse music/video/podcast/stream/lyrics route pages
connect to shared media descriptor adapter
show media-lite labels
show manifest preview
```

Acceptance:

```text
- Existing React media pages render in Tauri.
- Media pages show draft/manifest state.
- No backend truth is faked.
- Full streaming not claimed.
```

---

### Batch M3 — Cover/poster/lyrics linked assets

Scope:

```text
cover image link
poster image link
lyrics as separate asset link
captions/dubs placeholder links
```

Acceptance:

```text
- Linked asset references use crab:// typed URLs.
- Linked assets remain independent.
- Missing linked asset shows safe unavailable state.
```

---

### Batch M4 — Bounded local file staging

Scope:

```text
file picker
safe local file summary
metadata preview
local b3 preview
draft state
```

Acceptance:

```text
- User-selected file only.
- Raw local path not exposed to React.
- Oversized file rejected or marked unsupported.
- Local b3 preview is not called published.
```

---

### Batch M5 — Safe small-file preview

Scope:

```text
small media preview within configured limit
safe playback handle
basic player errors
source label local_draft or gateway
```

Acceptance:

```text
- Small media can preview.
- Large media refuses full-buffer preview.
- Error copy is typed.
- No fake streaming claims.
```

---

### Batch M6 — Range/segment proof

Scope:

```text
bounded range read interface
safe player source
cancel support
range errors
```

Acceptance:

```text
- Range size is bounded.
- Cancel works.
- Seek does not full-buffer giant file.
- Metrics track range outcome.
```

---

### Batch M7 — Offline media cache proof

Requires OFFLINE_CACHE_IDB gates.

Scope:

```text
verified cache source
digest mismatch rejection
media cache quota
amnesia purge
```

Acceptance:

```text
- Verified media cache plays public media.
- Digest mismatch refuses playback.
- Paid media still locked by default.
- Quota enforced.
```

---

### Batch M8 — OAP/sidecar media source proof

Requires OAP and sidecar gates.

Scope:

```text
OAP range/segment source
sidecar source label
gateway fallback
```

Acceptance:

```text
- OAP source is Rust-side only.
- Gateway fallback works when semantics match.
- No paid gate bypass.
```

---

### Batch M9 — Paid media gate proof

Requires paid-action route contracts.

Scope:

```text
paid media prepare/confirm/unlock/play
receipt display
no cache-only unlock
```

Acceptance:

```text
- Paid media requires explicit confirmation.
- Receipt returned by backend.
- Player starts only after backend access decision.
- Reload does not double-charge.
```

---

## 39. Review checklist

Before approving media work:

```text
[ ] Is media-lite clearly separated from full streaming?
[ ] Are large media files kept out of command result blobs?
[ ] Are range/segment paths bounded?
[ ] Are source labels present?
[ ] Are b3 IDs canonical?
[ ] Are manifests used for relationships?
[ ] Are renditions independent b3 objects?
[ ] Are poster/cover/lyrics/captions separate assets?
[ ] Is playback source a safe handle, not raw path?
[ ] Does cache verify before trusted playback?
[ ] Does paid media not unlock from cache alone?
[ ] Does autoplay/preload never spend?
[ ] Are receipts backend-derived only?
[ ] Does wallet mutation stay through svc-wallet?
[ ] Does ledger truth stay in ron-ledger?
[ ] Does media avoid direct storage/index mutation?
[ ] Are DRM/anti-rip claims honest?
[ ] Is transcoding sandbox-gated?
[ ] Is accounting backend-owned?
[ ] Are mobile constraints visible?
[ ] Is amnesia honored?
[ ] Are metrics safe?
```

---

## 40. Product checklist

Before calling media product-ready:

```text
[ ] Music page renders media-lite descriptor.
[ ] Video page renders media-lite descriptor.
[ ] Podcast page renders media-lite descriptor.
[ ] Stream page renders descriptor without fake live support.
[ ] Cover/poster links render safely.
[ ] Lyrics link renders as separate asset.
[ ] Rendition selector exists or is stubbed honestly.
[ ] Small media preview works within bounds.
[ ] Large media refuses unsafe full-buffer preview.
[ ] Range/segment proof exists for serious playback.
[ ] Offline media cache is verified and quota-bound.
[ ] Paid media gate requires explicit confirmation.
[ ] Receipt display works.
[ ] Player errors are typed.
[ ] UI makes no fake DRM claims.
[ ] Mobile defaults are conservative.
```

---

## 41. Anti-scope

Forbidden in this implementation phase:

```text
- Full-file large media through Tauri command result.
- Full video in React memory.
- Base64 movie/song payloads in JSON.
- Raw local paths exposed to React.
- Unverified cached media trusted for playback.
- Cached paid media unlocking content by itself.
- Autoplay/preload causing ROC spend.
- Fake media receipts.
- Fake media ownership.
- Fake media publication.
- Fake provider payout/accounting.
- Client-side final reward calculations.
- Direct ron-ledger mutation.
- Direct svc-wallet mutation outside route contract.
- Direct svc-storage writes from UI.
- Direct svc-index writes from UI.
- Production transcoding inside CrabLink Tauri.
- Shelling out to arbitrary transcoder commands.
- Creator-supplied JS/WASM/native media players.
- DRM/anti-rip guarantees.
- Public main→alt linkage through watermarks.
- Unbounded media cache.
- Unbounded media prefetch.
- Sidecar dependency for mobile.
- QuickChain/ROX/Solana/external settlement.
- Staking/liquidity/exchange-facing media economy.
```

---

## 42. Future expansion order

Recommended expansion order:

```text
1. Media status shell.
2. Media-lite descriptors.
3. Reuse music/video/podcast/stream/lyrics pages.
4. Cover/poster/lyrics linked assets.
5. Rendition group display.
6. Bounded local file staging.
7. Safe small-file preview.
8. Range/segment proof.
9. Verified offline media cache.
10. OAP media range/stream proof.
11. Sidecar media source proof.
12. Paid media gate proof.
13. svc-edge/range route contracts.
14. egress/accounting events.
15. provider reward planning.
16. sandboxed transcode jobs.
17. watermarking research.
18. live streaming infrastructure.
```

Do not jump directly to:

```text
production video streaming
live broadcast network
transcoding farm
DRM
paid offline entitlement
provider reward payout
```

---

## 43. Plain-English summary

Media is where CrabLink can start feeling like a real next-internet client.

But media is also where it is easiest to lie accidentally.

The rule is:

```text
Start with media-lite.
Make manifests and renditions correct.
Keep bytes b3-addressed.
Keep playback bounded.
Verify cache before trust.
Keep paid gates backend-owned.
Do not claim DRM.
Do not full-buffer giant media through Tauri commands.
```

The first goal is not to become Netflix.

The first goal is:

```text
CrabLink Tauri can represent music/video/podcast/stream assets correctly,
preview safe media honestly,
prepare for bounded native playback,
and preserve every RustyOnions truth boundary.
```
````
