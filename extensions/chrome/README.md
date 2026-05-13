Excellent — that URL confirms the **React-primary extension-origin cutover is working correctly**:

```text
chrome-extension://hoimlidjdmbkminaejimgaebfjjpfepn/react.html?url=crab%3A%2F%2Fsite
```

The newest codebundle still shows some root docs are scaffold placeholders and the Chrome README still says to load `extensions/chrome`, but the working path is now the packaged staging folder, so this batch is a **refactor closure / docs-contract batch**. It does not risk site/image/profile code. It locks the current React-primary state so we can move back into `NEXT_LEVEL.MD`. 

Replace these files.

## `extensions/chrome/README.md`

````markdown
# CrabLink Extension for Chrome

RO:WHAT — Chrome-specific setup and testing guide for CrabLink.
RO:WHY — CrabLink is now React-primary from the packaged/staged extension, while the old page lane remains a fallback.
RO:INTERACTS — Chrome Manifest V3, Vite build output, package-chrome.sh, react.html, page.html.
RO:INVARIANTS — gateway-only; no fake backend truth; no silent ROC spend; no private-key custody.
RO:SECURITY — load the staged extension output for React; do not run raw JSX from src/react.html.
RO:TEST — npm run build; check scripts; package; reload staged unpacked extension.

## Current status

CrabLink is now in the **React-primary / legacy-preserved** state.

Primary browser lane:

```text
react.html
````

Legacy fallback lane:

```text
page.html
```

Do not load the raw source folder for normal React testing anymore.

Use this staged folder:

```text
/Users/mymac/Desktop/crablink/dist/chrome-extension-staging
```

Do not use this source folder for the React-primary extension test:

```text
/Users/mymac/Desktop/crablink/extensions/chrome
```

The raw source folder contains `src/react.html`, which imports `.jsx` source files directly. Chrome may serve those files with the wrong MIME type. The staged build contains Vite-built JavaScript bundles and is the correct extension-origin test path.

## Build and package

From the CrabLink repo root:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
scripts/check-react-lane.sh
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

Expected outputs:

```text
dist/chrome-src/react.html
dist/chrome-src/page.html
dist/chrome-extension-staging/
dist/crablink-extension-chrome.zip
CODEBUNDLE_CHROME_EXTENSION.md
```

## Load unpacked

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select:

```text
/Users/mymac/Desktop/crablink/dist/chrome-extension-staging
```

After reloading, the extension toolbar should open a URL shaped like:

```text
chrome-extension://<extension-id>/react.html?url=crab%3A%2F%2Fsite
```

It should not open:

```text
chrome-extension://<extension-id>/src/react.html?url=crab%3A%2F%2Fsite
```

## Default local gateway

```text
http://127.0.0.1:8090
```

The RustyOnions stack should normally include:

```text
svc-wallet
svc-passport
svc-storage
svc-index
omnigate
svc-gateway
```

## Main routes to smoke test

```text
crab://site
crab://image
crab://profile
crab://home
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://music
crab://lyrics
crab://ad
crab://algo
crab://code
crab://game
crab://definitely-missing-site
```

Known current React image proof, if the local dev DB still contains it:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Older proof URLs may disappear after local stack resets.

## MVP behavior

CrabLink should:

```text
- open the React browser shell by default
- keep legacy page.html reachable as fallback
- call public svc-gateway routes only
- resolve crab:// links through the gateway
- render typed b3 asset pages
- support explicit paid image/site flows
- show profile/passport/wallet display state honestly
- keep local-only creator workspaces honest
```

CrabLink must not:

```text
- call internal services directly
- silently spend ROC
- fake receipts
- fake b3 CIDs
- fake backend publication
- store private keys
- store seed phrases
- execute arbitrary crab:// code
```

## Optional HTTP preview fallback

Use this only for layout/debug fallback, not final extension-origin proof:

```bash
cd /Users/mymac/Desktop/crablink/dist/chrome-src
python3 -m http.server 4173 --bind 127.0.0.1
```

Example:

```text
http://127.0.0.1:4173/react.html?url=crab%3A%2F%2Fsite
```

HTTP preview may not have the same extension storage behavior as the loaded Chrome extension.

````

## `docs/CRABLINK_REFACTOR_PLAN.md`

```markdown
# CRABLINK_REFACTOR_PLAN

RO:WHAT — Completion plan and current state for the CrabLink React refactor.
RO:WHY — Locks the React-primary architecture so product work can return to NEXT_LEVEL.MD.
RO:INTERACTS — Chrome extension, React app shell, route registry, shared APIs, legacy fallback lane, gateway-facing client code.
RO:INVARIANTS — gateway-only client boundary; no fake backend truth; no silent ROC spend; no arbitrary crab:// code execution.
RO:SECURITY — do not store private keys, seed phrases, spend authority, or secrets here.
RO:TEST — npm run build; check-react-lane; check-chrome; package-chrome; reload staged extension.

---

## 0. Current state

CrabLink is now in the **React-primary / legacy-preserved** state.

Primary user-facing lane:

```text
dist/chrome-extension-staging/react.html
````

Fallback lane:

```text
dist/chrome-extension-staging/page.html
```

The toolbar/action path now opens the React lane from the staged extension root:

```text
chrome-extension://<extension-id>/react.html?url=crab%3A%2F%2Fsite
```

The legacy lane remains reachable only as a fallback:

```text
chrome-extension://<extension-id>/page.html?url=crab%3A%2F%2Fsite
```

Do not return to opening raw source pages as the normal extension path:

```text
chrome-extension://<extension-id>/src/react.html
chrome-extension://<extension-id>/src/page.html
```

Raw `src/react.html` imports `.jsx` source directly and can white-screen in Chrome extension context.

---

## 1. What the refactor has achieved

The refactor converted CrabLink from a patch-heavy page script prototype into a route-owned React browser shell.

Current React architecture:

```text
extensions/chrome/src/react.html
extensions/chrome/src/app/main.jsx
extensions/chrome/src/app/App.jsx
extensions/chrome/src/app/router.js
extensions/chrome/src/app/routeRegistry.js
extensions/chrome/src/app/shell/
extensions/chrome/src/pages/
extensions/chrome/src/shared/
```

The React shell owns:

```text
topbar
address bar
browser navigation
passport chip/drawer
ROC balance chip
theme provider
header Ad Space slot
toast host
modal host
route outlet
```

Each built-in route has a route owner under:

```text
extensions/chrome/src/pages/<route>/
```

The key architectural rule is now:

```text
one route = one page owner
```

---

## 2. Proven product flows preserved

The following flows must continue working from the staged React extension:

```text
crab://site
  create/open/render workspace
  root HTML storage
  explicit ROC hold
  site pointer creation
  named-site resolve
  sandbox render

crab://image
  image prepare
  explicit ROC hold
  image byte upload
  typed crab://<hash>.image return
  image asset resolve
  hydrated preview

crab://profile
  profile/passport workspace
  local identity labels
  gateway identity refresh
  wallet display refresh
  no fake confirmed username

crab://<64hex>.image
  typed asset route
  gateway resolve
  image preview
  manifest/proof display
```

Protected routes to avoid risky rewrites unless intentionally entering a parity phase:

```text
site
image
profile
asset
```

---

## 3. Local-only creator workspaces

These routes are React-owned local workspaces, not backend publication proof:

```text
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
```

They may:

```text
collect local draft metadata
render local previews
save local drafts
generate future manifest JSON
show stats/completeness
show truth boundaries
copy local JSON
```

They must not:

```text
claim backend publication
claim b3 CID assignment
claim manifest CID assignment
claim wallet mutation
claim ROC spend
claim receipts
claim policy approval
claim executable sandbox launch
claim live stream/session creation
```

Backend publication for these belongs to future `NEXT_LEVEL.MD` route work.

---

## 4. Legacy-preserved policy

The old lane remains in the repo temporarily:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.js
extensions/chrome/src/page-*.js
extensions/chrome/src/page.css
```

It remains because it protects earlier proven behavior and provides a fallback if a late React regression appears.

It should not receive new product features.

Allowed legacy changes:

```text
critical bug fixes
fallback preservation
docs/comments
static check compatibility
```

Forbidden legacy changes:

```text
new asset types
new route ownership
new wallet behavior
new product truth
new paid flows
new backend contracts
```

---

## 5. Legacy deletion criteria

Do not delete legacy files until all of this has passed repeatedly from the staged extension:

```text
React toolbar launch works
React popup launch works
React site create works
React named site render works
React image publish works
React typed image preview works
React profile/passport drawer works
React wallet balance display works
React missing-site problem page works
all local creator routes load
theme toggle works
header Ad Space slot is visible
check-react-lane passes
check-chrome passes
package-chrome passes
manual extension smoke passes
```

Only then begin deletion in a separate cleanup batch.

---

## 6. Completion status

CrabLink React refactor is functionally near-complete.

Estimated completion:

```text
React refactor: 92–94%
```

Remaining refactor work:

```text
manual staged-extension smoke for all routes
site/image/profile parity verification
fill root docs/contracts
tighten static checks around staged extension path
update README/checklist language
eventual legacy cleanup
```

This means CrabLink is close enough that new product work can return to `NEXT_LEVEL.MD` once the final manual smoke checks are green.

---

## 7. NEXT_LEVEL return point

After React-primary stabilization, resume product implementation in this order:

```text
1. post/comment/article backend primitives
2. profile/@username backend publish/resolve
3. typed asset catalog and profile asset lists
4. paid view/access flows
5. reputation/moderation display truth
6. media-lite routes: music/video/podcast manifests
7. stream session contracts
8. ad campaign manifests
9. code/facet sandbox contracts
10. game manifests
```

CrabLink remains the browser client. RustyOnions remains source of truth.

---

## 8. Core principle

CrabLink should be:

```text
thin
honest
safe
explicit
gateway-only
route-owned
receipt-driven
theme-consistent
sandbox-first
```

The extension proves the UX.

RustyOnions proves the backend truth.

````

## `docs/ROUTE_CONTRACTS.md`

```markdown
# ROUTE_CONTRACTS

RO:WHAT — Route contract reference for CrabLink built-in and typed crab:// routes.
RO:WHY — Keeps route ownership, backend truth boundaries, and NEXT_LEVEL product work aligned.
RO:INTERACTS — app/router.js, app/routeRegistry.js, pages/*, shared/api/*, svc-gateway product routes.
RO:INVARIANTS — one route = one owner; backend validation remains canonical; no fake b3, receipts, wallet truth, or publication truth.
RO:SECURITY — route selection never grants capabilities, spend authority, code execution, or direct internal-service access.
RO:TEST — check-react-lane; check-chrome; manual route smoke from staged extension.

---

## 0. Public URL rules

Canonical public typed asset URL:

```text
crab://<64 lowercase hex>.<asset_kind>
````

Examples:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.article
```

Internal content ID:

```text
b3:<64 lowercase hex>
```

Named site URL:

```text
crab://<site_name>
```

Profile handle URL:

```text
crab://@username
```

Forbidden public format:

```text
crab://b3/<hash>.<kind>
```

The frontend may normalize old/typed inputs for convenience, but new public UX must use:

```text
crab://<hash>.<kind>
```

---

## 1. Route ownership model

The React router owns parsing and dispatch.

The route registry owns page modules.

Each page owns its own content.

```text
address input
  ↓
parse route
  ↓
route registry
  ↓
one lazy page owner
  ↓
shared shell stays mounted
```

A route owner may render:

```text
builder UI
developer UI
truth boundary
safe local preview
gateway-backed truth
problem panel
```

A route owner must not render another route's stale page.

---

## 2. Built-in routes

### `crab://home`

Owner:

```text
pages/home/HomePage.jsx
```

Purpose:

```text
start page
quick actions
route shortcuts
safe gateway/status overview
```

Backend truth:

```text
none required
```

### `crab://site`

Owner:

```text
pages/site/SitePage.jsx
```

Purpose:

```text
site creation
root document workflow
site open/render
site manifest/proof
named-site fallback for crab://<site_name>
```

Backend truth:

```text
required for prepare/create/open/render
```

Must preserve:

```text
explicit prepare
explicit ROC hold
store root bytes
create named site pointer
sandboxed render
no auto-spend
no fake site
```

### `crab://image`

Owner:

```text
pages/image/ImagePage.jsx
```

Purpose:

```text
paid image publish
image preview
image manifest/rendition planning
typed image asset proof
```

Backend truth:

```text
required for publish and typed asset preview
```

Must preserve:

```text
prepare
explicit ROC hold
upload with hold proof headers
returned crab://<hash>.image
image preview
no fake CID
```

### `crab://profile`

Owner:

```text
pages/profile/ProfilePage.jsx
```

Purpose:

```text
local profile workspace
passport drawer entry
future public @username profile
avatar/banner image references
asset/site catalog
```

Backend truth:

```text
partial today
future profile publish/resolve required
```

Must not claim:

```text
confirmed username unless gateway confirms it
reputation/mod score unless backend supplies it
main/alt links unless policy allows it
```

---

## 3. Local creator routes

The following routes are local workspaces until backend routes exist:

```text
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
```

They may prepare local drafts and future manifests.

They may not claim publication.

### `crab://music`

Purpose:

```text
music/song draft
artist/album metadata
cover image reference
lyrics asset reference
rights/access/economics draft
```

Special rule:

```text
cover art is a linked .image asset
lyrics are a linked .lyrics asset
```

### `crab://lyrics`

Purpose:

```text
standalone lyrics asset draft
linked from music/song manifests
separate rights/licensing/paywall boundary
```

### `crab://article`

Purpose:

```text
long-form article draft
hero image reference
tags
rights/access/economics draft
```

### `crab://post`

Purpose:

```text
short post/social primitive draft
thread/context references
tags and visibility
```

### `crab://comment`

Purpose:

```text
comment/reply primitive draft
parent post/article/site/comment references
moderation mode
author/alt display boundary
```

### `crab://video`

Purpose:

```text
video asset draft
poster/thumbnail image reference
rendition group planning
captions/dubs references
access policy draft
```

### `crab://stream`

Purpose:

```text
live stream setup draft
chat/moderation policy
future stream session/ingest plan
stream + podcast companion mode
```

Must not claim:

```text
live session exists
ingest key exists
chat room exists
tips route exists
```

### `crab://podcast`

Purpose:

```text
podcast/show/episode draft
audio reference
cover image reference
stream-derived episode planning
```

### `crab://ad`

Purpose:

```text
protocol-native ad campaign draft
creative image reference
budget/access/economics draft
header slot preview
```

Must preserve:

```text
one header ad slot
no invasive third-party tracking
clear Ad Space label
```

### `crab://algo`

Purpose:

```text
open algorithm draft
ranking/recommendation/moderation/search transparency
input/output contract
policy notes
```

Must not execute arbitrary code.

### `crab://code`

Purpose:

```text
code primitive draft
facet contract preview
sandbox/policy/capability declaration
```

Hard rule:

```text
crab://<hash>.code does not mean download and execute arbitrary code.
```

### `crab://game`

Purpose:

```text
game manifest draft
runtime policy
asset bundles
save-data policy
multiplayer/session future
facet/sandbox/economics draft
```

Must not launch executable game code.

---

## 4. Typed asset route

Input:

```text
crab://<64hex>.<kind>
```

Owner:

```text
pages/asset/AssetPage.jsx
```

Specialized route pages may assist display for known kinds, but backend truth still comes from gateway resolve/hydration.

Typed asset route must show:

```text
canonical crab URL
internal b3 CID
kind
title/metadata if available
manifest/provenance if available
owner/payout if available
storage/provider data if available
receipts if available
safe preview if supported
raw developer DTO
```

Must not invent missing fields.

---

## 5. Named site fallback

If `crab://<body>` is not a built-in route, not a profile handle, and not a typed asset, the router treats it as a named site.

Example:

```text
crab://ron6
```

Owner:

```text
pages/site/SitePage.jsx
```

Expected behavior:

```text
resolve named site through gateway
show structured problem if missing
render site in sandbox if found
do not fake a site if 404
```

---

## 6. Problem route

Owner:

```text
pages/problem/ProblemPage.jsx
```

Used for:

```text
gateway unavailable
not found
policy denied
validation failure
unsupported route
upstream unavailable
feature not wired yet
```

Problem pages should include:

```text
friendly summary
route/action
HTTP status
safe reason
correlation ID if available
developer JSON if useful
```

Problem pages must not include:

```text
auth tokens
private keys
seed phrases
full bearer tokens
```

---

## 7. Route smoke list

Every staged extension smoke should cover:

```text
crab://home
crab://site
crab://image
crab://profile
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
crab://definitely-missing-site
```

If local dev DB contains a known image proof:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Expected for every route:

```text
route loads
address bar updates
previous page disappears
header Ad Space visible
theme toggle works
passport drawer opens
no console white screen
no fake backend truth
```

````

## `docs/MANIFEST_MODEL.md`

```markdown
# MANIFEST_MODEL

RO:WHAT — Uniform manifest model for CrabLink asset, site, creator, media, and future NEXT_LEVEL primitives.
RO:WHY — Prevents each route from inventing incompatible JSON and keeps future backend DTOs aligned.
RO:INTERACTS — shared/manifest/*, pages/*DraftModel.js, asset/site/profile routes, NEXT_LEVEL backend contracts.
RO:INVARIANTS — local draft manifests are not backend DTOs; no fake b3 CIDs; no fake receipts; immutable bytes remain b3-addressed.
RO:SECURITY — manifests declare policy and permissions; they do not grant execution or wallet authority by themselves.
RO:TEST — schema fixtures, local draft previews, check-react-lane static contract checks.

---

## 0. Manifest truth boundary

There are two different concepts:

```text
local draft manifest
backend-published manifest
````

Local draft manifests are generated by CrabLink creator workspaces.

Backend-published manifests are created, validated, stored, indexed, and resolved by RustyOnions services.

Local drafts must mark:

```text
local_draft_only: true
assigns_b3_cid: false
assigns_manifest_cid: false
publishes_asset: false
writes_index_pointer: false
performs_paid_action: false
backend_route_claimed: false
```

Only backend responses may claim:

```text
canonical b3 CID
manifest CID
published asset
index pointer
receipt
paid access
owner proof
provider proof
```

---

## 1. Canonical IDs

Internal content ID:

```text
b3:<64 lowercase hex>
```

Public typed URL:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Each immutable byte object receives a BLAKE3 CID.

Names are optional human pointers.

Hashes are canonical.

---

## 2. Uniform top-level shape

Target manifest shape:

```json
{
  "schema": "crablink.asset.manifest.v1",
  "manifest_version": 1,
  "kind": "image",
  "asset": {},
  "ownership": {},
  "metadata": {},
  "linked_assets": [],
  "renditions": {},
  "versions": [],
  "rights_policy": {},
  "access_policy": {},
  "economics": {},
  "provenance": {},
  "storage": {},
  "receipts": [],
  "truth_boundary": {}
}
```

Routes may add kind-specific fields inside `metadata`, but they should not create entirely unrelated top-level structures.

---

## 3. Required common sections

### `asset`

Expected fields:

```text
kind
title
description
tags
language
created_at
updated_at
canonical_cid
canonical_crab_url
manifest_cid
```

Local draft values for CID fields must be empty/null.

### `ownership`

Expected fields:

```text
owner_passport_subject
owner_handle
owner_wallet_account
payout_account
curator_handle
publisher_handle
```

Local draft ownership is display/config only.

### `metadata`

Kind-specific fields live here.

Examples:

```text
image dimensions/format/role
article body/summary/hero image
music artist/album/lyrics link
video duration/rendition set/poster
stream schedule/chat/mod policy
code runtime/facet contract
game runtime/save policy
```

### `linked_assets`

Every linked asset should include:

```text
role
crab_url
expected_kind
backend_verified
notes
```

Examples:

```text
cover_image
thumbnail
poster
hero_image
lyrics
dub
caption_track
trailer
creative_image
asset_bundle
```

### `renditions`

Expected fields:

```text
rendition_group_id
canonical
original
alternates
siblings
selection_policy
```

Each real rendition byte object should have its own b3 CID and typed crab URL.

### `versions`

Expected fields:

```text
version
manifest_cid
asset_cid
created_at
reason
author
receipt_hash
notes
```

Versions describe manifest/history. They do not make mutable bytes.

### `rights_policy`

Expected fields:

```text
license
rights_holder
derivative_policy
commercial_policy
territory
expiry
dmca_contact
drm_mode
```

### `access_policy`

Expected fields:

```text
mode
price_minor
asset
subscriber_only
owner_only
preview_policy
paid_view_policy
age_or_region_gate
```

No floating-point money.

Use integer minor units only.

### `economics`

Expected fields:

```text
asset
price_minor
splits_bps
creator_bps
provider_bps
curator_bps
treasury_bps
remainder_policy
```

Basis points must sum to 10000 where applicable.

### `provenance`

Expected fields:

```text
source
import_mode
creator_statement
original_author
generated_by
proofs
parent_assets
```

### `storage`

Expected fields:

```text
providers
replication
availability
byte_count
content_type
stored_at
```

CrabLink local drafts do not store bytes.

### `receipts`

Expected fields:

```text
txid
receipt_hash
operation
asset
amount_minor
from
to
created_at
```

Local drafts cannot create receipts.

### `truth_boundary`

Expected fields:

```text
local_draft_only
assigns_b3_cid
assigns_manifest_cid
publishes_asset
writes_index_pointer
performs_paid_action
backend_route_claimed
notes
```

This section is mandatory for local creator routes.

---

## 4. Image-like asset rule

All image-like bytes are `.image` assets.

This includes:

```text
album covers
video thumbnails
film posters
game covers
profile avatars
profile banners
article hero images
post images
ad creative images
site logos
gallery images
```

Other manifests reference image assets by role.

They do not create separate image-like kinds.

---

## 5. Lyrics/dub rule

Lyrics are separate assets:

```text
crab://<hash>.lyrics
```

Music manifests link to lyrics.

Dubs/captions/subtitles are separate future assets:

```text
crab://<hash>.dub
```

Film/video manifests link to dub/caption assets.

---

## 6. Rendition rule

Every separate byte rendition gets its own CID.

Example:

```text
crab://aaa.image original
crab://bbb.image desktop
crab://ccc.image mobile
crab://ddd.image thumbnail
```

Each rendition manifest should cross-link to its siblings through:

```text
rendition_group_id
canonical
alternates
siblings
```

This applies to:

```text
images
videos
audio variants
film variants
game bundles
stream recordings
trailers
previews
captions
dubs
```

---

## 7. Code/facet rule

A code manifest does not execute code.

Future `.code` assets must include:

```text
runtime
facet contract
permissions
limits
declared routes/actions
required capabilities
sandbox policy
deny-by-default policy
```

Plain-English rule:

```text
b3hash.code is the address.
facet.toml is the contract.
svc-sandbox is the cage.
ron-policy is the judge.
CrabLink is the renderer/launcher, not the executor.
```

---

## 8. Backend handoff

When NEXT_LEVEL backend work resumes, use these local manifests as product shape guidance, not final DTO truth.

Backend DTOs must be stricter.

Backend services must enforce:

```text
validation
capabilities
policy
payments
content addressing
index writes
receipt generation
```

CrabLink must only display what the backend proves.

````

## `docs/SANDBOX_MODEL.md`

```markdown
# SANDBOX_MODEL

RO:WHAT — CrabLink sandbox and trusted/untrusted content model.
RO:WHY — CrabLink must render a new internet without letting crab content become privileged extension code.
RO:INTERACTS — site renderer, safe embed registry, sandboxFrame.js, future facet/code/game/algo routes, Chrome MV3.
RO:INVARIANTS — trusted shell and untrusted content are separate; no arbitrary code execution from crab links; wallet mutation remains explicit.
RO:SECURITY — deny by default; no direct internal-service access; no extension APIs in untrusted render surfaces.
RO:TEST — manual site render smoke; static checks for forbidden direct URLs and executable claims.

---

## 0. Trust zones

CrabLink has these trust zones:

```text
trusted extension shell
trusted React route UI
gateway-backed DTO data
local draft state
untrusted site/content bytes
future executable primitives
````

Trusted shell includes:

```text
topbar
address bar
passport drawer
wallet prompts
theme controls
settings
toasts/modals
```

Untrusted content includes:

```text
site HTML
user-uploaded media
comments/posts/articles
future game/code/algo bytes
third-party creative assets
```

Untrusted content must not run inside the privileged extension shell.

---

## 1. Site rendering rule

Bad model:

```text
site HTML is injected directly into the React app DOM
site script can touch extension state
site script can call wallet helpers
```

Good model:

```text
site manifest is validated
safe renderer builds allowed structure
untrusted HTML is isolated
scripts are disabled by default
declarative crab embeds are resolved by trusted renderers
```

The React shell remains trusted.

Site content remains sandboxed.

---

## 2. Sandboxed frame target

Future site rendering should use a sandboxed surface.

Expected properties:

```text
unique origin
no extension API access
no direct wallet access
no direct internal service calls
no arbitrary script by default
restricted navigation
restricted forms
restricted popups
```

Allowed content should be declarative and safe.

Examples:

```text
text
images
safe links
safe layout
crab-image embeds
crab-video embeds when supported
crab-audio embeds when supported
```

---

## 3. Safe embed registry

CrabLink should prefer declarative tags rendered by trusted components.

Examples:

```text
<crab-image src="crab://<hash>.image">
<crab-video src="crab://<hash>.video">
<crab-audio src="crab://<hash>.music">
<crab-post src="crab://<hash>.post">
<crab-comment src="crab://<hash>.comment">
```

Each safe embed must:

```text
validate crab URL
go through svc-gateway
render preview safely
show loading/error states
avoid arbitrary script
avoid direct internal services
```

---

## 4. Code primitive rule

Future code assets require a facet contract.

A `.code` asset is not directly executable.

Required pieces:

```text
b3 code bytes
code manifest
facet.toml permissions
declared runtime
declared routes/actions
resource limits
required capabilities
deny-by-default policy
sandbox runtime policy
```

CrabLink may display and launch through a trusted backend/sandbox flow.

CrabLink must not run arbitrary code directly in the extension page.

---

## 5. Game primitive rule

Future games require the same sandbox-first model.

A game manifest may reference:

```text
runtime
asset bundles
cover image
screenshots
save data policy
multiplayer/session policy
economics policy
facet contract
```

CrabLink should not run game code directly.

Game launch requires:

```text
policy approval
capability check
sandbox/runtime selection
resource limits
wallet/access prompt if paid
receipt-backed backend flow
```

---

## 6. Algo primitive rule

Algorithms may affect:

```text
feeds
ranking
search
recommendation
moderation
curation
discovery
```

They must be:

```text
inspectable
versioned
policy-bound
explainable where possible
sandboxed if executable
deny-by-default if permissions are unclear
```

CrabLink may display algorithm contracts, but should not silently execute arbitrary ranking code.

---

## 7. Wallet/value boundary

No site, asset, game, code primitive, stream, comment, or ad creative may mutate wallet state directly.

All value movement requires:

```text
visible operation
visible amount
visible payer
visible recipient/escrow
explicit user confirmation
gateway/wallet route
hold/capture/release semantics
receipt or clear failure
```

CrabLink never becomes ledger truth.

---

## 8. Direct-service ban

Browser client code must not call:

```text
svc-wallet directly
svc-storage directly
svc-index directly
omnigate directly
ron-ledger directly
svc-passport directly
```

CrabLink calls public `svc-gateway` routes only.

---

## 9. Security acceptance gate

Before any route can load untrusted content or future executable material, verify:

```text
content isolated from shell
no extension API access
no arbitrary script by default
wallet prompts remain shell-owned
gateway-only access preserved
policy/facet shown for executable primitives
developer JSON does not leak secrets
problem routes are clear
static checks pass
```

---

## 10. Core principle

```text
React is the trusted renderer.
crab:// content is data.
facet.toml is the contract.
svc-sandbox is the cage.
ron-policy is the judge.
svc-wallet is the value mutation front door.
```

````

## `docs/THEME_AND_AD_SLOT.md`

```markdown
# THEME_AND_AD_SLOT

RO:WHAT — Global theme and standardized header ad-slot contract for CrabLink.
RO:WHY — CrabLink pages should feel like one coherent browser layer, not unrelated route-specific prototypes.
RO:INTERACTS — ThemeProvider, themeStore, theme CSS, HeaderAdSlot, creator workspaces, site renderer.
RO:INVARIANTS — default light mode; black/neutral dark mode; one clearly labeled header ad slot; no invasive ad scripts.
RO:SECURITY — ads are protocol-native content, not third-party script injection or adversarial anti-adblock behavior.
RO:TEST — manual light/dark smoke; check route visibility; visual pass for all built-ins.

---

## 0. Theme status

Current supported theme modes:

```text
light
dark
system
````

Default:

```text
light
```

Design direction:

```text
neutral off-white light mode
true black/neutral dark mode
minimal blue
high readability
consistent cards/forms/buttons
```

Dark mode should not produce large white input/card blocks.

Light mode should not become blue-heavy.

---

## 1. Theme ownership

Theme belongs to the shared shell and theme provider.

Relevant files:

```text
extensions/chrome/src/shared/theme/ThemeProvider.jsx
extensions/chrome/src/shared/theme/themeStore.js
extensions/chrome/src/shared/theme/themeTokens.css
extensions/chrome/src/shared/theme/light.css
extensions/chrome/src/shared/theme/dark.css
```

Pages should use shared semantic tokens.

Pages should not invent disconnected themes.

---

## 2. Semantic token categories

Every page should use shared tokens for:

```text
background
surface
card
text
muted text
border
accent
danger
warning
success
focus
ad slot
developer JSON
inputs
buttons
```

Route-specific CSS may lay out a page, but color should usually come from theme tokens.

---

## 3. Header ad slot

CrabLink reserves one standardized header ad space.

Current development label:

```text
Ad Space
```

Current owner:

```text
extensions/chrome/src/app/shell/HeaderAdSlot.jsx
```

Rules:

```text
one header ad only
clearly labeled
visible in normal shell routes
responsive
no popups
no autoplay
no third-party tracking scripts
no invasive page takeover
no adversarial anti-adblock tricks
```

This slot should feel protocol-native and creator-supporting, not like hostile web advertising.

---

## 4. Future ad campaign model

Future ad campaigns belong to:

```text
crab://ad
```

Potential campaign manifest fields:

```text
campaign owner
creative image asset
destination crab URL
budget
placement policy
audience policy
review status
payout split
impression/view accounting
receipts
```

Creative images are normal `.image` assets.

Example:

```text
linked_assets.creative_image = crab://<hash>.image
```

No ad creative should execute arbitrary scripts.

---

## 5. Site theming

A future crab site may request accent styling, but the browser shell remains in control of global readability and safety.

Allowed future site theming:

```text
accent color
banner image
safe typography preference
light/dark compatibility hints
```

Forbidden:

```text
arbitrary CSS execution in privileged shell
hiding wallet prompts
hiding ad labels
overriding browser controls
obscuring problem/warning panels
```

---

## 6. Visual route smoke

Every route should be checked in both light and dark mode:

```text
crab://home
crab://site
crab://image
crab://profile
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
crab://definitely-missing-site
```

Expected:

```text
header visible
address bar readable
Ad Space visible
page cards readable
forms readable
developer JSON readable
truth boundary readable
theme toggle works
no white screen
no huge bright blocks in dark mode
```

---

## 7. Core principle

CrabLink theme and ads should support the new internet without recreating the worst parts of the old web.

```text
coherent theme
minimal ad surface
privacy-preserving
creator-supporting
clearly labeled
safe by default
```

````

## `docs/TESTING_MATRIX.md`

```markdown
# TESTING_MATRIX

RO:WHAT — Testing and regression matrix for the CrabLink React-primary extension.
RO:WHY — Converts the hard-won React cutover, image/site proofs, and safety boundaries into repeatable checks.
RO:INTERACTS — scripts/check-react-lane.sh, scripts/check-chrome.sh, scripts/package-chrome.sh, smoke scripts, manual Chrome reload.
RO:INVARIANTS — gateway-only; no fake backend truth; no silent ROC spend; no direct internal-service calls; no arbitrary crab:// code execution.
RO:SECURITY — paid actions require explicit confirmation and strict backend DTOs.
RO:TEST — run after every refactor/NEXT_LEVEL browser-client batch.

---

## 0. Full local gate

Run:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
scripts/check-react-lane.sh
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
````

Expected:

```text
npm run build passes
React lane checks passed
CrabLink Chrome extension checks passed
dist/crablink-extension-chrome.zip written
CODEBUNDLE_CHROME_EXTENSION.md written
```

---

## 1. Correct extension load path

Load unpacked from:

```text
/Users/mymac/Desktop/crablink/dist/chrome-extension-staging
```

Do not load unpacked from:

```text
/Users/mymac/Desktop/crablink/extensions/chrome
```

Expected toolbar URL shape:

```text
chrome-extension://<extension-id>/react.html?url=crab%3A%2F%2Fsite
```

Failure URL shape:

```text
chrome-extension://<extension-id>/src/react.html?url=crab%3A%2F%2Fsite
```

If the URL includes `/src/react.html`, Chrome may try to load `.jsx` directly and white-screen.

---

## 2. RustyOnions local stack

Typical local stack windows:

```text
svc-wallet
svc-passport
scripts/web3_crablink_dev_stack.sh
```

Stack command:

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"
env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Gateway health:

```bash
curl -s http://127.0.0.1:8090/healthz
curl -s http://127.0.0.1:8090/readyz
```

A local dev reset can roll balance back to starter values or clear previously uploaded local assets.

---

## 3. React route smoke

From the staged extension, test:

```text
crab://home
crab://site
crab://image
crab://profile
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
crab://definitely-missing-site
```

Expected for each:

```text
route loads
address bar shows route
previous route disappears
header Ad Space visible
theme toggle works
passport drawer opens
no console white screen
no stale site iframe
no fake backend truth
```

---

## 4. Paid image publish smoke

Open:

```text
crab://image
```

Flow:

```text
select small local image
prepare
confirm explicit ROC hold
upload
copy returned crab://<hash>.image
open returned URL
confirm image preview renders
```

Required `/wallet/hold` body fields only:

```text
from
to
asset
amount_minor
nonce
memo
idempotency_key
```

Forbidden `/wallet/hold` body fields:

```text
schema
api_request
ui_preview_request
hold_template
wallet_hold
paid_storage
client-only preview fields
```

Expected:

```text
no silent spend
no manual nonce typing when backend gives expected nonce
hold proof headers used for upload
returned asset resolves
image preview visible
```

---

## 5. Site create/render smoke

Open:

```text
crab://site
```

Flow:

```text
choose template or enter root HTML
prepare site
confirm explicit ROC hold
store root document bytes
create site pointer
open crab://<site_name>
```

Expected:

```text
root CID auto-fills after store
nonce recovery is automatic
create request uses strict JSON
site renders in page
manifest/proof available
no auto-create before explicit action
no stale iframe after leaving route
```

---

## 6. Profile/passport/wallet smoke

Open:

```text
crab://profile
```

Expected:

```text
profile workspace loads
passport chip opens drawer
identity refresh is read-only
wallet refresh is read-only
balance displays only gateway/local settings truth
HTTP test mode is labeled if not extension-origin
no fake username confirmation
no private key or seed phrase fields
```

---

## 7. Typed image asset smoke

Open the current known proof if local DB still contains it:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Expected:

```text
gateway resolve works
hydrated asset page appears
image preview visible
developer DTO available
no raw PNG/IHDR/IDAT text rendered as page body
no fake owner/receipt/payout invented
```

If local DB was reset, upload a fresh image and use the new returned URL.

---

## 8. Missing site/problem smoke

Open:

```text
crab://definitely-missing-site
```

Expected:

```text
structured missing-site problem
HTTP status/reason visible if returned
correlation ID visible if returned
no fake placeholder site
no silent fallback to local content
```

---

## 9. Sandbox/facet smoke

Open:

```text
crab://code
crab://game
crab://algo
```

Expected:

```text
clear no-execution language
facet/sandbox/policy boundary visible
no claim of executable launch
no wallet mutation
no direct service calls
no arbitrary script execution
```

---

## 10. Theme/ad smoke

Check all major routes in both light and dark mode.

Expected:

```text
neutral off-white light mode
black/neutral dark mode
Ad Space visible
forms readable
cards readable
developer JSON readable
no huge white blocks in dark mode
```

---

## 11. Forbidden regression list

Fail the batch if any appear:

```text
src/react.html as toolbar target
src/page.html as toolbar target
page-local-route-mode.js returns
crab://b3/<hash> public URL
<all_urls>
chrome.history
chrome.cookies
webRequestBlocking
nativeMessaging
direct svc-wallet URL
direct svc-storage URL
direct svc-index URL
direct omnigate URL
direct ron-ledger URL
x-ron-wallet-hold-txid
private key storage
seed phrase storage
fake b3 CID in local draft route
fake receipt in local draft route
silent ROC spend
```

---

## 12. Completion gate

Before declaring the refactor complete enough for NEXT_LEVEL product work:

```text
build/check/package/codebundle gate green
staged extension reload green
toolbar opens React root react.html
popup opens React root react.html
legacy fallback opens root page.html
all route smoke tests pass
paid image publish passes after fresh stack
site create/render passes after fresh stack
profile/passport drawer works
typed image preview works
missing site problem works
no console white screens
```

````

## `extensions/chrome/test/manual-checklist.md`

```markdown
# CrabLink Chrome Extension Manual Checklist

RO:WHAT — Manual verification checklist for the React-primary CrabLink Chrome extension.
RO:WHY — Locks the hard-won React cutover, image/site/profile proofs, staged-extension loading path, and safety boundaries.
RO:INTERACTS — extensions/chrome, dist/chrome-extension-staging, React lane, legacy fallback lane, svc-gateway, omnigate, svc-wallet, svc-storage, svc-index.
RO:INVARIANTS — gateway-only; no silent ROC spend; no fake receipts; b3 hashes canonical; local creator workspaces are not backend publication.
RO:METRICS — use gateway correlation/request IDs for backend log correlation.
RO:CONFIG — assumes local gateway at http://127.0.0.1:8090 unless changed in options.
RO:SECURITY — verify minimal permissions, strict wallet hold body, sandboxed site rendering, and no private key exposure.
RO:TEST — scripts/check-react-lane.sh, scripts/check-chrome.sh, scripts/package-chrome.sh, scripts/smoke-local-gateway.sh, live UI checks.

---

## 0. Preconditions

RustyOnions local WEB3/CrabLink stack should be running before live paid flows are tested.

Recommended wallet startup:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
````

Recommended CrabLink dev stack startup:

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"
env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Wallet startup order matters. If the stack starts before `svc-wallet`, identity or balance display may fall back to stale/dev-only values. That fallback must not be treated as spend authority.

A reboot or local stack reset may clear transient dev assets and roll wallet/account state back to starter values.

---

## 1. Build and package gate

From the CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
scripts/check-react-lane.sh
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

Expected:

```text
React lane checks passed.
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

Also confirm:

```text
dist/chrome-src/react.html exists
dist/chrome-src/page.html exists
dist/chrome-extension-staging/react.html exists
dist/chrome-extension-staging/page.html exists
extensions/chrome/src/page-local-route-mode.js does not exist
```

---

## 2. Correct Chrome reload path

Open:

```text
chrome://extensions
```

Then load or reload from:

```text
/Users/mymac/Desktop/crablink/dist/chrome-extension-staging
```

Do not load from:

```text
/Users/mymac/Desktop/crablink/extensions/chrome
```

The source folder is not the normal React-primary extension path.

---

## 3. React-primary entry check

Click the extension toolbar icon.

Expected URL shape:

```text
chrome-extension://<extension-id>/react.html?url=crab%3A%2F%2Fsite
```

Bad URL shape:

```text
chrome-extension://<extension-id>/src/react.html?url=crab%3A%2F%2Fsite
```

If `/src/react.html` appears, the wrong path is being opened and Chrome may white-screen with a module MIME error.

---

## 4. Legacy fallback check

Open the popup or use the explicit legacy path if available.

Expected URL shape:

```text
chrome-extension://<extension-id>/page.html?url=crab%3A%2F%2Fsite
```

Legacy fallback should exist, but it is no longer the primary route.

---

## 5. Main React route smoke

Open each route in the React address bar:

```text
crab://home
crab://site
crab://image
crab://profile
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
crab://definitely-missing-site
```

Expected for each route:

```text
route loads
address bar updates
previous route disappears
header Ad Space is visible
theme toggle works
passport drawer opens
no white screen
no stale site iframe
no fake backend truth
```

---

## 6. Paid image smoke

Open:

```text
crab://image
```

Test:

```text
select a small image
prepare
explicitly confirm ROC hold
upload
copy returned crab://<hash>.image
open returned URL
verify preview
```

Expected:

```text
no silent ROC spend
strict wallet hold JSON
automatic nonce recovery
hold proof headers on upload
image preview visible
```

---

## 7. Site create/render smoke

Open:

```text
crab://site
```

Test:

```text
choose a template or enter root HTML
prepare
explicitly confirm ROC hold
store root HTML
create site
open named site
```

Expected:

```text
root CID auto-fills
nonce recovery is automatic
create request is strict JSON
named site resolves
site renders
site manifest/proof available
```

---

## 8. Profile/passport/wallet smoke

Open:

```text
crab://profile
```

Expected:

```text
profile workspace loads
passport drawer opens
identity refresh is read-only
wallet refresh is read-only
ROC chip does not fake balance
no private-key fields
no seed-phrase fields
no fake confirmed username
```

---

## 9. Known image proof smoke

If the local dev DB still contains the asset, open:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Expected:

```text
gateway resolve succeeds
hydrated asset page appears
image preview appears
developer DTO is visible
raw binary is not rendered as text
```

If it fails after a stack reset, upload a fresh image and use the new returned URL.

---

## 10. Local-only workspace truth boundary

For these routes:

```text
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
```

Expected:

```text
local draft only
manifest preview available
stats/completeness visible
truth boundary visible
no fake b3 CID
no fake manifest CID
no fake receipt
no wallet mutation
no backend publication claim
```

---

## 11. Code/game/algo sandbox boundary

Open:

```text
crab://code
crab://game
crab://algo
```

Expected:

```text
facet/sandbox/policy language visible
no arbitrary execution claim
no launch of executable code
no wallet spend path
no direct internal-service calls
```

---

## 12. Theme/ad-slot check

Test light and dark mode.

Expected:

```text
light mode is neutral/off-white
dark mode is black/neutral
Ad Space is visible
forms are readable
developer JSON is readable
no large bright white blocks in dark mode
```

---

## 13. Final refactor-complete checklist

The refactor is ready for NEXT_LEVEL work when:

```text
toolbar opens React root react.html
legacy fallback opens root page.html
all built-in routes smoke green
paid image publish green
site create/render green
profile drawer/wallet display green
known typed image preview green
missing-site problem green
check-react-lane green
check-chrome green
package-chrome green
codebundle regenerated
```

````

Run after pasting:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
scripts/check-react-lane.sh
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
````

Then reload from:

```text
/Users/mymac/Desktop/crablink/dist/chrome-extension-staging
```
