# CrabLink Creator Workspaces

RO:WHAT — Product and implementation guide for CrabLink local creator workspaces.  
RO:WHY — NEXT_LEVEL needs article/video/stream/podcast creator surfaces, but they must remain honest until backend asset routes exist.  
RO:INTERACTS — `page-article-draft.js`, `page-video-draft.js`, `page-stream-draft.js`, `page-podcast-draft.js`, `page.html`, `page.js`, `svc-gateway` future prepare routes.  
RO:INVARIANTS — Local draft only; gateway-only prepare attempts; no fake b3 CIDs; no fake publication; no silent ROC spend; no wallet mutation.  
RO:SECURITY — No private keys, no seed phrases, no direct internal service calls, no route hijack controller, no extension-privileged execution of creator content.  
RO:TEST — `scripts/check-chrome.sh`, full-tab manual route sequence, local prepare-route attempts, fresh extension reload.

---

## 0. Current status

CrabLink currently has four local creator workspaces:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

These are **local UX / prepare scaffolds**.

They are not backend-published assets yet.

They are allowed to:

```text
- collect local creator metadata
- render safe local previews
- save local drafts in chrome.storage.local
- generate future manifest JSON
- copy local manifest/metadata JSON
- make non-mutating gateway prepare attempts
- show honest 404 / not wired yet responses
```

They must not:

```text
- claim backend publication
- create a b3 CID locally
- create a manifest CID locally
- upload bytes silently
- charge ROC
- mutate wallet state
- mint stream keys
- create chat rooms
- create RSS feeds
- create comments/moderation truth
- invent ownership/provenance/receipt truth
```

---

## 1. Known-good route behavior

The following route sequence must keep working:

```text
crab://article
crab://video
crab://stream
crab://podcast
crab://video
crab://podcast
crab://stream
crab://article
```

Expected behavior:

```text
- The address bar changes correctly.
- The current page content changes correctly.
- The previous workspace does not stay stuck.
- No `/sites/article`, `/sites/video`, `/sites/stream`, or `/sites/podcast` lookup is attempted.
- No blank screen appears.
- No slow load caused by failed site fallback appears.
- Only the current local workspace is visible.
```

Important regression note:

```text
Do not reintroduce page-local-route-mode.js.
```

That file created a route-controller collision with the existing per-page creator modules.

The current working model is:

```text
page.js:
  Parses local built-in routes and prevents named-site fallback.

Each creator module:
  Owns its own UI.
  Checks the current address/page payload.
  Cleans up only its own stale sibling sections.
```

Do not add another global local-route controller unless the architecture is redesigned deliberately.

---

## 2. Workspace truth boundaries

### 2.1 Article

Route:

```text
crab://article
```

Current file:

```text
extensions/chrome/src/page-article-draft.js
```

Current prepare route:

```text
POST /assets/article/prepare
```

Current capabilities:

```text
- title
- subtitle
- summary
- article body
- tags
- language
- license
- author handle
- live preview
- word/character/body-byte stats
- future article manifest JSON
- copy manifest JSON
- copy plain text
- save local draft
- clear local draft
- non-mutating prepare attempt
```

Truth boundary:

```text
No article asset exists yet.
No article bytes are stored.
No b3 CID is assigned.
No manifest CID is assigned.
No ROC is charged.
No wallet mutation happens.
```

A 404 from `/assets/article/prepare` is acceptable until backend article routes are wired.

---

### 2.2 Video

Route:

```text
crab://video
```

Current file:

```text
extensions/chrome/src/page-video-draft.js
```

Current prepare route:

```text
POST /assets/video/prepare
```

Current capabilities:

```text
- local video file picker
- safe local video preview
- title
- description
- tags
- language
- license
- creator handle
- thumbnail crab URL
- suggested price minor units
- future video manifest JSON
- copy manifest JSON
- copy metadata JSON
- save local draft
- clear local draft
- non-mutating prepare attempt
```

Truth boundary:

```text
No video upload happens.
No b3 CID is assigned.
No manifest CID is assigned.
No streaming/range backend is claimed.
No ROC is charged.
No wallet mutation happens.
```

A 404 from `/assets/video/prepare` is acceptable until backend video routes are wired.

---

### 2.3 Stream

Route:

```text
crab://stream
```

Current file:

```text
extensions/chrome/src/page-stream-draft.js
```

Current prepare route:

```text
POST /streams/prepare
```

Current capabilities:

```text
- local camera/mic preview
- local screen-share preview
- stream title
- category/game
- description
- tags
- language
- visibility mode
- chat mode
- moderation mode
- stream mode
- creator handle
- thumbnail crab URL
- suggested access price minor units
- tips enabled later checkbox
- future stream manifest JSON
- copy manifest JSON
- copy metadata JSON
- save local draft
- clear local draft
- non-mutating prepare attempt
```

Truth boundary:

```text
No live stream starts.
No ingest key is minted.
No stream session is created.
No chat room is created.
No tips route is created.
No stream archive exists.
No b3 CID is assigned.
No ROC is charged.
No wallet mutation happens.
```

A 404 from `/streams/prepare` is acceptable until backend stream routes are wired.

---

### 2.4 Podcast

Route:

```text
crab://podcast
```

Current file:

```text
extensions/chrome/src/page-podcast-draft.js
```

Current prepare route:

```text
POST /podcasts/prepare
```

Current capabilities:

```text
- local audio file picker
- local audio preview
- local live mic preview after user gesture
- show title
- episode title
- season/episode numbers
- podcast kind
- audio mode
- description/show notes
- category
- tags
- language
- visibility
- creator handle
- cover image crab URL
- suggested access price minor units
- tips enabled later checkbox
- future podcast manifest JSON
- copy manifest JSON
- copy metadata JSON
- save local draft
- clear local draft
- non-mutating prepare attempt
```

Truth boundary:

```text
No podcast episode is published.
No audio bytes are uploaded.
No live audio session is created.
No RSS/feed is created.
No b3 CID is assigned.
No manifest CID is assigned.
No ROC is charged.
No wallet mutation happens.
```

A 404 from `/podcasts/prepare` is acceptable until backend podcast routes are wired.

---

## 3. File ownership rules

### `page.js`

Allowed responsibilities:

```text
- parse user input
- normalize known built-in routes
- prevent local creator routes from falling through to named-site lookup
- render backend DTOs
- keep browser history state
```

Forbidden responsibilities:

```text
- owning creator workspace UI
- deleting creator module DOM aggressively
- acting as a global local-route controller
- inventing backend publication state
- adding creator-specific payment logic
```

### Per-workspace files

Allowed responsibilities:

```text
- render their own local workspace
- save local draft metadata
- preview local media safely
- clean up their own object URLs/media streams
- remove stale sibling local workspace sections when necessary
- make explicit non-mutating prepare attempts through the configured gateway
```

Forbidden responsibilities:

```text
- direct calls to svc-wallet, svc-storage, svc-index, ron-ledger, or omnigate
- fake publication success
- silent paid actions
- private key handling
- seed phrase handling
- route hijacking
- permanent stream/mic capture without user gesture
```

---

## 4. Current local storage keys

Known local draft keys:

```text
crablinkArticleDraftV1
crablinkVideoDraftV1
crablinkStreamDraftV1
crablinkPodcastDraftV1
```

These are browser convenience state only.

They are not:

```text
- backend truth
- ownership truth
- publication truth
- wallet truth
- receipt truth
- account truth
```

Local draft data may be cleared without changing backend state.

---

## 5. Future backend route sequence

Backend should be wired in this order, not all at once.

### Phase A — Text primitives first

```text
.post
.comment
.article
```

Reason:

```text
Text primitives establish identity, reputation, moderation, payout, receipts, and manifest rules with smaller payloads.
```

Recommended backend order:

```text
1. ron-proto DTOs
2. ron-naming typed URL parser support
3. omnigate prepare/create/read route contracts
4. svc-gateway proxy routes
5. paid storage admission reuse
6. svc-index pointer write
7. asset-page hydration
8. extension prepare/create wiring
```

### Phase B — Media-lite

```text
.image already proven
.video metadata + upload planning
.music/audio metadata + upload planning
.podcast episode metadata
```

Media upload should reuse paid storage and manifest rules.

### Phase C — Live stream

```text
.stream session prepare
.stream ingest/session policy
.stream manifest
.stream archive/VOD
.stream chat/mod policy
.stream tips/subscription later
```

Live streaming should not be the first backend media primitive because it involves session state, ingest credentials, moderation, chat, storage, and payout complexity.

---

## 6. Acceptance gates before backend publication

Before any local creator route can claim backend publication, all of these must be true:

```text
- backend route exists
- route is gateway-facing
- prepare route is non-mutating
- mutating route requires explicit user confirmation
- paid operation uses wallet hold/capture/release
- response includes receipt or explicit no-charge reason
- response includes canonical b3 CID if bytes are stored
- response includes manifest CID if manifest is created
- response includes owner passport / wallet / payout fields
- asset resolves through crab://<64hex>.<kind>
- asset page hydrates through gateway
- extension shows backend truth only
- failure paths are visible and honest
```

---

## 7. Manual test recipe

Run static checks:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
```

Reload extension:

```text
chrome://extensions
→ CrabLink Extension for Chrome
→ Reload
```

Close old CrabLink tabs, then open a fresh CrabLink tab.

Run route sequence:

```text
crab://article
crab://video
crab://stream
crab://podcast
crab://video
crab://podcast
crab://stream
crab://article
```

For each route, verify:

```text
- correct page opens
- old page does not remain stuck
- no site lookup fallback appears
- no fake b3 CID appears
- no fake ROC charge appears
- no wallet mutation happens
- Developer JSON remains available
```

Then test known-good backend surfaces:

```text
crab://site
crab://image
crab://profile
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

---

## 8. Regression watchlist

Fail the change if any of these happen:

```text
page-local-route-mode.js returns
page.html imports page-local-route-mode.js
crab://video resolves through /sites/video
crab://stream resolves through /sites/stream
crab://podcast resolves through /sites/podcast
crab://article stays visible on crab://video
video stays visible on crab://stream
stream stays visible on crab://podcast
podcast stays visible on crab://article
site render iframe remains stuck after leaving a named site
Developer JSON claims backend publication for local drafts
local draft claims b3 CID assignment
local draft claims ROC charge
local draft claims wallet mutation
extension adds broad Chrome permissions
extension calls internal services directly
```

---

## 9. Backend handoff notes

When RustyOnions backend work resumes, use these local routes as product contracts, not proof that backend is finished.

The local workspaces define:

```text
- what creators want to enter
- what metadata fields are needed
- what future manifests should include
- what truth boundaries users need to see
- what prepare routes the UI expects
```

They do not define final backend DTOs by themselves.

Backend DTOs should be stricter than local draft JSON.

---

## 10. Current recommendation

The next implementation step should be one of:

```text
1. Improve visual polish and consistency of the four local creator workspaces.
2. Add backend DTO/parser scaffolding for `.post`.
3. Add a tiny docs/help link explaining local creator route truth boundaries.
4. Add smoke/check assertions that prevent page-local-route-mode.js from returning.
```

Do not do all of these at once.

The safest immediate next step is:

```text
Add docs/help/check guardrails around the current working local creator pages.
```