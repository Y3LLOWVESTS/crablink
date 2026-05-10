# Carryover Notes — CrabLink / RustyOnions NEXT_LEVEL Session

## 0. High-level checkpoint

This session moved CrabLink further into the **pre-refactor product-definition phase**. We did not just add UI; we clarified the structure of the next internet layer: built-in pages, asset kinds, manifest rules, rendition/version rules, theme rules, ad-slot rules, and the need for an elegant modular frontend architecture.

The current CrabLink extension is now a successful prototype, but it is also clearly patch-heavy. It proved the product ideas, but the current `page-*` module style has become fragile because many independent scripts are trying to patch, hide, show, or rescue the same DOM. The next session should focus on reviewing the current code with Grok and planning a real refactor into a folder-based, one-route-one-owner architecture.

The main strategic conclusion:

```text
The prototype has done its job.
Now we need to refactor the CrabLink page layer into something elegant, modular, professional, and maintainable.
```

---

## 1. What we accomplished this session

### 1.1 Added and discussed new built-in CrabLink pages

We expanded the foreseeable built-in `crab://` page universe beyond the earlier set.

Current built-in page set to preserve during the refactor:

```text
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
```

Future/down-the-line built-ins discussed:

```text
crab://film
crab://dub
```

The goal is to make the refactor aware of these now so we do not keep chopping up the code later.

### 1.2 Added stub concepts for lyrics, comments, posts, ads, algorithms, code, and games

We discussed and generated stub pages for:

```text
crab://lyrics
crab://comment
crab://post
crab://ad
crab://algo
crab://code
crab://game
```

These are intentionally local-only stubs for now. They should not claim backend support, publication, ROC charges, b3 CIDs, or wallet mutation.

The important truth boundary for all these stubs:

```text
no backend publication
no fake b3 CID
no fake manifest CID
no index pointer
no wallet mutation
no ROC charge
no fake policy enforcement
```

### 1.3 Introduced the shared uniform manifest idea

We clarified that every asset type should use a **uniform manifest structure** instead of each page inventing its own shape.

This should become one shared manifest builder/form in the refactor.

The shared manifest should have sections like:

```text
identity
ownership
metadata
linked_assets
renditions
versions/history
rights_policy
access_policy
ad_policy
economics
feature_gates
required_capabilities
provenance
storage/provider info
receipts
truth_boundary
```

The goal is to avoid duplicated JSON builders across every page. A music manifest, image manifest, post manifest, comment manifest, ad manifest, game manifest, code manifest, etc. should share the same top-level structure, with type-specific fields inside `metadata`, `linked_assets`, `policy`, and `renditions`.

### 1.4 Added the principle that every built-in page should eventually live in its own folder

We agreed the refactor should move away from one giant `src/` directory full of loosely coordinated `page-*` patches.

Target direction:

```text
extensions/chrome/src/
  app/
    main.js
    router.js
    shell.js
    routeRegistry.js
    state.js

  shared/
    dom.js
    route.js
    theme.js
    uniformManifest.js
    manifestForm.js
    facts.js
    jsonPreview.js
    truthBoundary.js
    creatorViewMode.js
    adSlot.js

  pages/
    site/
    image/
    profile/
    music/
    lyrics/
    article/
    post/
    comment/
    video/
    stream/
    podcast/
    ad/
    algo/
    code/
    game/
```

Each page folder should own its page-specific UI, helpers, and local styling.

Important rule:

```text
One route = one page owner.
```

Example:

```text
crab://music
→ router unmounts current page
→ router mounts pages/music/musicPage.js
→ musicPage owns the whole music page DOM
```

No more late-bound panels, lifecycle settlers, route guards fighting with creator pages, or focus hacks.

### 1.5 Identified current patch-heavy architecture as a refactor trigger

The current extension works, but much of it is now patch-like. We specifically noticed:

```text
page-creator-route-guard.js
page-next-level-panels.js
page-lifecycle-settler.js
page-music-rights.js
page-stream-podcast-mode.js
page-social-stubs.js
```

These modules were useful to prove ideas quickly, but they are not the desired final architecture.

The current bug pattern showed that Chrome/macOS focus, page lifecycle, and MutationObserver timing can create weird behavior when many independent modules are all trying to own the same page.

The next refactor should eliminate the need for:

```text
DOM rescue scripts
late panel injection
visibility patching
focus/lifecycle hacks
MutationObserver-based page ownership
duplicate Builder/Developer toggles
```

### 1.6 Clarified code quality goals for the refactor

The refactor is not just about “making it work.” The user wants the final page layer to feel elegant and professional.

Hard goals for refactor:

```text
efficient
modular
organized
elegant
professional
easy to reason about
easy to expand
minimal duplicate code
page files ideally under 400 lines each
```

A good pattern would be:

```text
page.js / page owner module: under 400 lines
manifest schema/spec: separate file
form renderer: shared
style: CSS file or page-specific style module
route registration: routeRegistry
shared cards/facts/truth-boundary helpers: shared/
```

---

## 2. Major product/design decisions captured this session

## 2.1 Uniform global light/dark mode

We decided CrabLink/RustyOnions should support a **uniform light/dark mode across the entire CrabLink internet**, regardless of which site or asset page is loaded.

Default should be:

```text
Light mode
```

Future theme options should include:

```text
Light
Dark
System
```

The theme should be browser/protocol-level, not each site inventing its own disconnected styling.

Refactor implication:

```text
Theme must live in the shared shell/theme system.
Every page must use semantic theme tokens.
```

Examples of semantic tokens:

```text
--ro-bg
--ro-surface
--ro-card
--ro-text
--ro-muted
--ro-accent
--ro-border
--ro-warning
--ro-danger
--ro-success
--ro-ad-bg
--ro-ad-border
```

We should leave the door open for future custom themes, but not let custom themes break safety, readability, or UX.

Future custom theme support should likely be constrained:

```text
user-selected global theme
site accent color
site banner styling
safe theme manifest
no arbitrary CSS execution
```

### 2.2 Standard header ad slot

We decided every site/page should eventually have a standardized header ad space.

During development it should visibly say:

```text
Ad Space
```

Long-term, this should connect to:

```text
crab://ad
```

and feature-gated ad campaign manifests.

Important UX decision:

```text
One header ad only.
No ad clutter.
No popups.
No autoplay.
No sidebars.
No injected third-party scripts.
```

Suggested design shape:

```text
Desktop: roughly 970x90 / 960x90 style slot
Tablet: roughly 728x90
Mobile: roughly 320x80 or 320x100
```

But it should be implemented as a responsive reserved header block rather than a fixed-only image box.

Preferred internal name:

```text
crab-ad-header-v1
```

Ad principles:

```text
clearly labeled
native/protocol-level
privacy-preserving
feature-gated
value-sharing
creator/site payout split
no third-party tracking
safe renderer only
```

Important caution: instead of building adversarial anti-adblock tricks, we should make ads minimal, transparent, safe, and creator-supporting so users do not feel abused by them. The goal is protocol-native ad rendering, not recreating the hostile modern ad web.

### 2.3 All image-like assets are canonical `.image` assets

We clarified that **all images**, regardless of use, must be stored as canonical image assets:

```text
crab://<hash>.image
internal: b3:<hash>
kind: image
```

This includes:

```text
album covers
music cover art
video thumbnails
film posters
film covers
game covers
profile avatars
profile banners
article hero images
post images
ad creative images
site logos
gallery images
thumbnails
```

Other manifests should reference these image assets instead of creating special image-like types.

Examples:

```text
crab://<music_hash>.music
  linked_assets.cover_image = crab://<image_hash>.image

crab://<film_hash>.film
  linked_assets.poster = crab://<image_hash>.image

crab://<game_hash>.game
  linked_assets.cover_image = crab://<image_hash>.image

crab://<ad_hash>.ad
  linked_assets.creative_image = crab://<image_hash>.image
```

This keeps the renderer, storage policy, thumbnail/rendition system, and manifest logic clean.

### 2.4 Image renditions must be independent `.image` assets that cross-link

Important rule:

```text
Every image resolution is its own real image asset.
Every image resolution gets its own b3 hash.
Every image resolution gets its own crab://<hash>.image URL.
Every image resolution gets its own image manifest.
Each image manifest points to the sibling renditions.
```

Example:

```text
crab://aaa....image  original
crab://bbb....image  desktop
crab://ccc....image  mobile
crab://ddd....image  thumbnail
```

Each manifest should include something like:

```json
{
  "kind": "image",
  "role": "desktop",
  "rendition_group_id": "image-set:b3:aaa...",
  "canonical": "crab://aaa....image",
  "renditions": {
    "original": "crab://aaa....image",
    "desktop": "crab://bbb....image",
    "mobile": "crab://ccc....image",
    "thumbnail": "crab://ddd....image"
  }
}
```

Key principle:

```text
Bytes are immutable.
Manifests describe relationships between immutable objects.
```

This lets CrabLink discover the full set of resolutions regardless of which resolution the user lands on.

### 2.5 Rendition cross-linking applies to video and other media too

The same rendition-group design should apply to videos and other media where variants matter.

Example video family:

```text
crab://aaa....video  original/master
crab://bbb....video  desktop 1080p
crab://ccc....video  mobile 720p
crab://ddd....video  low-bandwidth 480p
crab://eee....video  audio-only
crab://fff....image  poster/thumbnail
crab://ggg....dub    captions/subtitles/dub track
```

Each separate byte object gets:

```text
own b3 hash
own typed crab URL
own manifest
cross-links to sibling renditions
shared rendition_group_id
canonical/original pointer
```

This applies to:

```text
images
videos
music/audio if needed
film
game asset bundles if needed
stream recordings
trailers/previews
poster/thumbnail assets
captions/dubs
audio-only versions
```

### 2.6 Every manifest should support versions/history

We decided every manifest should support version/history entries.

Purpose:

```text
provenance
DRM/licensing history
rights changes
rendition changes
edits
rollback
takedowns
receipts
ownership history
```

Possible structure:

```json
{
  "manifest_version": 1,
  "current_version": {
    "cid": "b3:<current_manifest_hash>",
    "created_at": "...",
    "reason": "current"
  },
  "versions": [
    {
      "version": 1,
      "cid": "b3:<old_manifest_hash>",
      "created_at": "...",
      "reason": "initial_publish"
    },
    {
      "version": 2,
      "cid": "b3:<new_manifest_hash>",
      "created_at": "...",
      "reason": "updated_license_or_renditions"
    }
  ]
}
```

This should be part of the uniform manifest structure from the beginning.

### 2.7 Lyrics should be a separate `.lyrics` asset

Lyrics should not be embedded directly inside `.music` or `.song` as the only source of truth.

Preferred model:

```text
crab://<music_hash>.music
  linked_assets.lyrics = crab://<lyrics_hash>.lyrics
```

And:

```text
crab://<lyrics_hash>.lyrics
```

is its own b3-backed asset and manifest.

Reasons:

```text
separate rights
separate licensing
separate DRM/paywall boundary
separate takedown/version history
separate rendering policy
separate publication lifecycle
```

This mirrors the broader linked-assets model.

### 2.8 Stream + podcast companion mode

We discussed a feature-gated stream + podcast companion mode.

Possible product labels:

```text
Stream only
Stream + live podcast simulcast
Stream + podcast recording
Stream now, publish podcast later
```

Terminology:

```text
simulcast = same live content broadcast simultaneously to multiple outputs
record-for-later = stream captured/edited into podcast episode later
post-stream podcast publishing = podcast episode created after stream ends
```

This should remain feature-gated and not claim backend support until routes exist.

### 2.9 Future `crab://film` and `crab://dub`

Long-term future pages:

```text
crab://film
crab://dub
```

`film` should represent film/movie assets.

`dub` should represent script/subtitle/dub/caption/localization assets.

Model:

```text
crab://<film_hash>.film
  linked_assets.poster = crab://<image_hash>.image
  linked_assets.trailer = crab://<video_hash>.video
  linked_assets.dubs = [
    crab://<dub_hash>.dub
  ]
```

`dub` should be independently b3-addressed, just like lyrics.

This is future scope, but the uniform manifest should not box us out of it.

### 2.10 Code primitives require facet contracts

We preserved the earlier facet design for future `crab://code`.

Important rule:

```text
crab://<hash>.code must not mean “download and execute arbitrary code.”
```

Safe model:

```text
b3hash.code = address
facet.toml = contract
svc-sandbox = cage
ron-policy = judge
CrabLink = renderer/launcher, not unsafe executor
```

A code primitive should require:

```text
code bytes
code manifest
facet.toml permissions
declared runtime: wasm/js/ts/lua/etc.
declared routes/actions
resource limits
required capabilities
deny-by-default policy
sandbox execution
```

This should be feature-gated under `crab://code`.

### 2.11 `crab://algo` for open algorithms

We added the idea of `crab://algo` for open-source algorithms.

Potential uses:

```text
feed ranking
recommendation
moderation
search ranking
curation
discovery
```

Important design principle:

```text
Algorithms should be transparent, inspectable, and policy-bound.
```

If executable, they eventually need the same kind of facet/sandbox/capability model as code primitives.

### 2.12 `crab://game` for game assets

`crab://game` should represent future game manifests.

Potential fields:

```text
game title
game kind
runtime
asset bundles
save-data policy
permissions
multiplayer/session support
paid access
payout policy
```

Games likely need:

```text
sandbox/runtime policy
asset bundle references
save-data ownership policy
optional multiplayer routes
optional economics
```

### 2.13 `crab://ad` for ad campaigns

`crab://ad` should represent feature-gated ad campaign manifests.

Important principles:

```text
one header slot
clearly labeled
privacy preserving
no third-party tracking
budget/payout policy
feature gated
policy reviewed
safe renderer
```

Potential future backend involvement:

```text
svc-ads
ad campaign DTOs
budget hold/capture/release
policy review
placement rules
impression/view accounting
payout split
```

---

## 3. Current working state of CrabLink

CrabLink currently has working proof-of-concept coverage for:

```text
full-tab browser shell
quick nav
gateway settings
passport drawer
profile page prototype
paid image flow
site creation/open proof
known-good image asset loading
crab://site
crab://image
crab://profile
crab://music
crab://article
crab://video
crab://stream
crab://podcast
stub pages for new asset types
builder/developer concept
local manifest previews
truth-boundary panels
```

The important product proof remains:

```text
CrabLink UI → gateway → paid ROC hold → paid storage/image/site flow → b3 asset → crab:// typed page rendering
```

Known-good paid image example from earlier sessions:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

The project has proven:

```text
b3 hashes as canonical IDs
crab:// typed asset URLs
paid image upload path
site creation path
manifest-backed page rendering
local creator/stub workspaces
```

---

## 4. Current problems / why refactor is needed

The current UI works, but it is not elegant internally.

Main issues:

```text
too many independent scripts own the same DOM
many late-bound patch modules
race conditions around page render/focus/lifecycle
MutationObserver-based rescue logic
Builder/Developer view needed repeated stabilizing
some pages disappeared/reappeared due to hidden details/previews
controls got accidentally hidden when raw JSON was hidden
page behavior is too distributed
```

The current architecture is a successful prototype but not the right long-term architecture.

Current patch-like files/concepts that should be removed or absorbed during refactor:

```text
page-creator-route-guard.js
page-lifecycle-settler.js
page-next-level-panels.js
page-music-rights.js
page-stream-podcast-mode.js
page-social-stubs.js
```

These should become normal page-owned logic inside each route folder or shared helpers.

The refactor should eliminate the need for:

```text
visibility patching
late injection
focus hacks
global route rescue scripts
page-specific MutationObserver rescuers
duplicated manifest rendering
```

---

## 5. Refactor strategy for next session

The next session should **not start by coding blindly**. It should start by reviewing the current files with Grok and forming a strategy.

### 5.1 Suggested first step with Grok

Ask Grok to review:

```text
CODEBUNDLE_CHROME_EXTENSION.md
NEXT_LEVEL.MD
WEB3.MD
WEB3_2.MD
current carryover notes
```

Then ask for:

```text
- page ownership refactor plan
- route registry design
- shared manifest builder design
- theme system design
- folder structure recommendation
- risk analysis for not breaking site/image paid flows
```

### 5.2 Refactor should be phased

Do not refactor everything in one giant batch.

Recommended sequence:

```text
Phase 0: Freeze current working state / make backup branch.
Phase 1: Create app/router/shared folder structure.
Phase 2: Move local-only stub pages first: lyrics/post/comment/ad/algo/code/game.
Phase 3: Move creator pages: music/article/video/stream/podcast.
Phase 4: Move profile page.
Phase 5: Move image page, carefully preserving paid upload flow.
Phase 6: Move site page, carefully preserving site create/open/render flow.
Phase 7: Delete old patch/rescue files.
Phase 8: tighten check scripts and smoke tests.
```

Reason to move stubs first:

```text
They are low-risk because they do not mutate backend state.
```

Reason to move site/image later:

```text
They touch real proven backend flows and should not be broken early.
```

### 5.3 Target folder structure

Proposed structure:

```text
extensions/chrome/src/
  app/
    main.js
    router.js
    routeRegistry.js
    shell.js
    state.js
    settings.js

  shared/
    dom.js
    events.js
    route.js
    theme.js
    adSlot.js
    uniformManifest.js
    manifestForm.js
    jsonPreview.js
    truthBoundary.js
    facts.js
    cards.js
    creatorViewMode.js
    validation.js

  pages/
    site/
      sitePage.js
      siteCreate.js
      siteRender.js
      site.css

    image/
      imagePage.js
      imageCreate.js
      imageRenditions.js
      image.css

    profile/
      profilePage.js
      profileEditor.js
      profileGateway.js
      profile.css

    music/
      musicPage.js
      musicRights.js
      music.css

    lyrics/
      lyricsPage.js
      lyrics.css

    article/
      articlePage.js
      article.css

    post/
      postPage.js
      post.css

    comment/
      commentPage.js
      comment.css

    video/
      videoPage.js
      videoRenditions.js
      video.css

    stream/
      streamPage.js
      streamPodcast.js
      stream.css

    podcast/
      podcastPage.js
      podcast.css

    ad/
      adPage.js
      ad.css

    algo/
      algoPage.js
      algo.css

    code/
      codePage.js
      codeFacet.js
      code.css

    game/
      gamePage.js
      game.css
```

### 5.4 Desired route registry

The route registry should be explicit:

```javascript
{
  "site": sitePage,
  "image": imagePage,
  "profile": profilePage,
  "music": musicPage,
  "lyrics": lyricsPage,
  "article": articlePage,
  "post": postPage,
  "comment": commentPage,
  "video": videoPage,
  "stream": streamPage,
  "podcast": podcastPage,
  "ad": adPage,
  "algo": algoPage,
  "code": codePage,
  "game": gamePage
}
```

Router behavior:

```text
parse crab URL
identify route/page kind
unmount current page
mount exactly one page owner
page owns its section
shared shell owns header/topbar/footer/theme/ad slot
```

### 5.5 Page module contract

Each page module should follow a predictable interface:

```javascript
export const page = {
  kind: "music",
  title: "Music Studio",
  mount(ctx) {},
  unmount() {},
  getManifestDraft() {}
};
```

`ctx` should include:

```text
root element
settings
ronClient
theme
navigate()
showToast()
copyText()
manifestBuilder
```

### 5.6 File size goal

User preference:

```text
Each JS file should be under ~400 lines if possible.
```

If a page grows beyond that, split it:

```text
musicPage.js
musicForm.js
musicPreview.js
musicManifest.js
musicRights.js
```

Do not create giant files.

### 5.7 Elegant UI requirement

The refactor should not merely reorganize code. It should produce a more polished product.

Desired visual direction:

```text
professional
clean
spacious
consistent
premium
modern
creator-studio feeling
not debug-heavy by default
```

Builder/Developer model should remain, but cleaner:

```text
Builder View:
  clean creator-facing UI

Developer View:
  manifest JSON
  route contracts
  truth boundary
  diagnostics
```

Raw JSON should not dominate the default page.

---

## 6. Shared uniform manifest structure — proposed target

The uniform manifest should become the core shared data shape.

Proposed high-level form:

```json
{
  "schema": "ron.asset.manifest.v1",
  "manifest_version": 1,
  "asset": {
    "kind": "image",
    "canonical_cid": "b3:<hash>",
    "canonical_crab_url": "crab://<hash>.image",
    "title": "",
    "description": "",
    "tags": []
  },
  "ownership": {
    "owner_passport_subject": "",
    "owner_username": "",
    "owner_wallet_account": "",
    "payout_account": ""
  },
  "linked_assets": {},
  "renditions": {},
  "versions": [],
  "rights_policy": {},
  "access_policy": {},
  "ad_policy": {},
  "economics": {},
  "provenance": {},
  "storage": {},
  "receipts": [],
  "truth_boundary": {}
}
```

### 6.1 Required common sections

```text
identity / asset
ownership
metadata
linked_assets
renditions
versions/history
rights_policy
access_policy
economics
provenance
storage/provider data
receipts
truth_boundary
```

### 6.2 Optional type-specific sections

Examples:

```text
image:
  dimensions
  format
  color profile
  renditions

video:
  duration
  codec
  resolution
  bitrate
  renditions
  captions/dubs

music:
  duration
  codec
  album
  artist
  cover_image
  lyrics reference

lyrics:
  linked music/song
  rights mode
  access mode

post/comment:
  parent reference
  thread reference
  moderation state
  comment policy

ad:
  campaign
  budget
  placement
  policy review

code:
  runtime
  facet contract
  sandbox policy

game:
  runtime
  save policy
  asset bundles
```

---

## 7. Theme system requirements

Theme system must be global and shared.

Default:

```text
light mode
```

Supported modes:

```text
light
dark
system
```

Future:

```text
custom themes
site accent themes
safe theme manifests
```

Important design rule:

```text
No page should hardcode its own disconnected theme.
```

All pages should use shared semantic tokens.

Potential CSS structure:

```text
theme.css
tokens.css
components.css
pages/<page>/<page>.css
```

Theme should control:

```text
body background
page background
cards
forms
buttons
text
muted text
borders
warning panels
truth-boundary panels
ad slot
developer JSON blocks
```

The refactor should remove ad hoc hardcoded dark-only styling from many page modules.

---

## 8. Header ad-slot requirements

Every page/site should eventually include a standard ad slot in the shared shell/header.

Development placeholder:

```text
Ad Space
```

Suggested component:

```text
shared/adSlot.js
```

Possible HTML/DOM role:

```text
<header>
  topbar
  global ad slot
</header>
```

Rules:

```text
one header ad only
clearly labeled
responsive
privacy-preserving
protocol-native
safe renderer
feature-gated
no popups
no autoplay
no third-party tracking
```

Ad campaign route:

```text
crab://ad
```

Later ad manifests should support:

```text
campaign owner
creative asset
destination crab URL
budget
payout split
placement policy
review status
receipts
```

---

## 9. Built-in pages and their purpose

### `crab://site`

Purpose:

```text
site creation/open/rendering
route maps
reference graph
site manifest
site owner/profile link
```

Status:

```text
Proven with real backend flows.
Refactor later, carefully.
```

### `crab://image`

Purpose:

```text
image upload/asset page
paid storage proof
image manifest
renditions
image variants
```

Status:

```text
Real paid flow exists.
Refactor later, carefully.
```

### `crab://profile`

Purpose:

```text
passport-linked public profile page
@username
avatar/banner
reputation/mod score
public asset/site catalog
```

Status:

```text
Prototype exists.
Backend-published profile still future work.
```

### `crab://music`

Purpose:

```text
music/song draft
audio asset planning
cover image reference
lyrics asset reference
rights/access policy
```

Important:

```text
lyrics should be separate crab://<hash>.lyrics asset
cover art should be crab://<hash>.image
```

### `crab://lyrics`

Purpose:

```text
independent lyrics asset
linked to music/song manifests
separate rights/licensing/paywall/DRM boundary
```

### `crab://article`

Purpose:

```text
long-form written asset
tags
hero image reference
access policy
creator payout
```

### `crab://post`

Purpose:

```text
short/social post asset
comments/replies
tags
visibility
payout policy
```

### `crab://comment`

Purpose:

```text
comment asset
parent reference
moderation state
site policy
author/passport/alt display
```

### `crab://video`

Purpose:

```text
video asset
renditions
poster/thumbnail image references
captions/dubs if needed
streaming/range plan
```

### `crab://stream`

Purpose:

```text
live stream page
feature-gated stream + podcast companion mode
future stream session routes
```

### `crab://podcast`

Purpose:

```text
podcast/audio episode asset
audio upload/live capture
RSS/export future compatibility
```

### `crab://ad`

Purpose:

```text
feature-gated ad campaign manifests
header ad slot campaigns
budget/payout/policy review
```

### `crab://algo`

Purpose:

```text
open-source algorithms
feed/search/recommendation/moderation transparency
```

### `crab://code`

Purpose:

```text
code primitives
facet.toml contract
sandbox execution
safe embed/launch
```

### `crab://game`

Purpose:

```text
game manifests
asset bundles
runtime policy
save data
multiplayer/economy gates
```

### Future `crab://film`

Purpose:

```text
film/movie asset
video renditions
poster image
dubs/captions
rights/access policy
```

### Future `crab://dub`

Purpose:

```text
subtitle/dub/script/caption/localization asset
linked from film/video manifest
independently b3-addressed
```

---

## 10. Backend work that remains

Major backend areas still future or incomplete:

```text
real profile publishing
@username reservation/claiming
reputation score truth
moderator score truth
post/comment/article routes
lyrics routes
music/song routes
video routes
stream routes
podcast routes
ad campaign routes
algo registry routes
code primitive/facet routes
game manifest routes
film/dub routes later
rendition-group DTOs
manifest version/history DTOs
uniform manifest DTOs
paid view/access flows
creator payout splits
ad payout splits
policy gates
capability checks
route-contract tests
CrabLink smoke tests for each built-in
```

Important RustyOnions invariants remain:

```text
ROC remains internal
no external ROX/Solana/public settlement yet
svc-wallet remains mutation front-door
ron-ledger remains durable truth
storage stores bytes by content ID only
gateway/omnigate coordinate but do not directly mutate ledger
integer minor units only
no floating-point money math
deterministic receipts
deterministic errors
policy/capability gates fail closed
```

---

## 11. Testing / proof strategy after refactor

We should add or preserve checks for:

```text
node --check every JS file
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
smoke-local-gateway.sh
smoke-site-create-local.sh
known-good image load
paid image upload
site create/open
route navigation for every built-in
theme toggle light/dark
ad slot visible
manifest draft generated
no stale page leakage
no duplicate page ownership
```

Manual route test list after refactor:

```text
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
```

Expected:

```text
only one page owner visible
no profile appended to other pages
no stale creator panel
no hidden controls
theme applies consistently
ad slot visible
developer view available
builder view clean
```

---

## 12. Suggested Grok prompt for next session

Use something like this with Grok:

```text
We are about to refactor the CrabLink Chrome Extension page layer.

Current status:
- The prototype works but is patch-heavy.
- We have many page-* scripts that fight over the same DOM.
- We want one route = one page owner.
- Every built-in crab:// page should have its own folder.
- Each JS file should ideally stay below ~400 lines.
- We need a shared uniform manifest builder/form.
- We need global light/dark theme support, default light.
- We need a shared header Ad Space slot.
- We need elegant, professional UI.
- Preserve real working paid site/image flows until late in the refactor.

Please review CODEBUNDLE_CHROME_EXTENSION.md, NEXT_LEVEL.MD, WEB3.MD, WEB3_2.MD, and these carryover notes. Produce:
1. A phased refactor plan.
2. A target folder structure.
3. A route registry design.
4. A shared manifest builder design.
5. A theme/ad-slot strategy.
6. A risk plan to avoid breaking site/image paid flows.
7. A list of files to create/move first.
```

---

## 13. Final recommendation

The next session should **not add more product pages first** unless absolutely necessary. We have enough foreseeable built-ins now.

Next best move:

```text
1. Freeze current working prototype.
2. Review with Grok.
3. Design the refactor.
4. Start with low-risk stub pages.
5. Build shared router + shell + theme + ad slot + uniform manifest.
6. Move one page at a time.
7. Keep real paid site/image flows stable until the new architecture is proven.
```

The current prototype is valuable, but the final product must feel like:

```text
a real browser layer for a new internet
professional
fast
clean
trustworthy
elegant
creator-first
```

The refactor is now the correct path.

### Added note: We should also have it to where zip files are stored in the b3hash.image address alongside the additional resolutions with a b3hash of each one. We should feature gate this, it would save alot of bandwidth but could be risky to implement. I believe the most efficient compression algorithm we found was zstd but how would a browser extension decompress this? 

### Added note: Not sure if using react would be better or not we can probably have a more efficient design and better UX and cleaner design that way.

### UPDATE: Yes — I think **React would probably be better for the refactor**, especially for the full-tab CrabLink browser UI.

The current vanilla JS approach worked for fast prototyping, but the extension now has many `page-*` scripts that all patch the same page shell, which is exactly why we started seeing weird lifecycle and visibility bugs. The codebundle file tree shows the current extension has grown into many separate page modules and helpers under `extensions/chrome/src/`, which is a sign that the prototype has outgrown the original structure. 

My honest opinion:

```text
Use React for the full-tab CrabLink app.
Keep background.js, content.js, and low-level extension glue vanilla.
```

That gives us the best of both worlds.

React would help because it gives us:

```text
one route = one mounted component
clean unmount/remount behavior
shared layout components
shared manifest form component
shared theme provider
shared ad slot component
less manual DOM patching
less MutationObserver rescue code
better long-term UX polish
```

The refactor target could become:

```text
extensions/chrome/src/
  app/
    App.jsx
    router.jsx
    routeRegistry.js
    theme.jsx
    shell/
      BrowserShell.jsx
      HeaderAdSlot.jsx
      Topbar.jsx
      QuickNav.jsx

  shared/
    UniformManifestForm.jsx
    TruthBoundary.jsx
    JsonPreview.jsx
    FactGrid.jsx
    CreatorViewToggle.jsx
    Card.jsx

  pages/
    music/
      MusicPage.jsx
      MusicRightsPanel.jsx

    lyrics/
      LyricsPage.jsx

    stream/
      StreamPage.jsx
      StreamPodcastPanel.jsx

    ad/
      AdPage.jsx

    code/
      CodePage.jsx

    game/
      GamePage.jsx
```

The important thing is: **React should not become an excuse to make the project bloated.** We should use it surgically for the UI layer only. The extension still needs to remain a thin client, gateway-only, no fake backend truth, no hidden wallet mutation.

I would recommend:

```text
React + Vite
possibly TypeScript, but only if we are ready for that extra strictness
plain CSS modules or organized CSS files first
no huge UI framework at the beginning
```

I would **not** start with Next.js or a big web-app framework inside the Chrome extension. That is overkill. A Vite React app compiled into the extension is enough.

My refactor recommendation is now:

```text
1. Freeze current working vanilla prototype.
2. Create a new React page shell beside the old one.
3. Move low-risk stub pages first: lyrics, post, comment, ad, algo, code, game.
4. Build shared components: UniformManifestForm, ThemeProvider, HeaderAdSlot, TruthBoundary.
5. Move music/stream/podcast/article/video.
6. Move profile.
7. Move image/site last because they touch real paid backend flows.
8. Delete the old patch modules once parity is proven.
```

So yes: **React likely gives us the cleaner, more elegant, more professional UX we want.** It also fits your goal of making every built-in page live in its own folder and keeping files smaller than 400 lines.

### SANDBOXXING:


We can design CrabLink so that:

```text
CrabLink shell = trusted UI
crab:// pages = isolated render surfaces
user assets = inert by default
code primitives = never directly executed
facet.toml = permission contract
svc-sandbox = execution cage
ron-policy = capability judge
```

That would be very strong. Not “mathematically impossible to break,” because no real browser can promise that, but strong enough to be a serious security architecture.

## For the Chrome extension MVP

We should use layered sandboxing:

```text
1. Keep extension permissions minimal.
2. Keep all backend calls gateway-only.
3. Render crab:// sites/assets in a controlled content surface.
4. Use sandboxed iframes for untrusted HTML/site previews.
5. Use strict Content Security Policy.
6. Disable arbitrary scripts by default.
7. Treat images/videos/audio as media assets, not executable pages.
8. Only allow safe CrabLink-rendered primitives.
9. Put future code blocks behind facet.toml + sandbox + policy.
```

Chrome extensions support sandboxed extension pages that run in a unique origin, and sandboxed pages do not have direct extension API access. That is useful for untrusted rendering surfaces. ([Chrome for Developers][1]) Browser-level CSP sandboxing and iframe sandboxing are also standard tools for restricting what loaded content can do. ([MDN Web Docs][2])

## What we should not do

We should not let `crab://<hash>.code` or site content run arbitrary JavaScript directly in the privileged extension page.

Bad model:

```text
crab://site loads
→ injects arbitrary HTML/JS into extension DOM
→ JS can touch CrabLink app state
```

Good model:

```text
crab://site loads
→ manifest is validated
→ safe renderer builds page
→ untrusted content is isolated
→ code primitive requires facet.toml
→ execution happens in sandbox only
```

## Future full browser model

For a full CrabLink browser, the ideal design is:

```text
Browser shell process:
  trusted UI, navigation, settings, theme, wallet prompts

Renderer sandbox:
  crab:// site display only

Media sandbox:
  image/video/audio decode surfaces

Code sandbox:
  WASM/JS/Lua/etc. only if facet.toml allows it

Policy layer:
  ron-policy validates capabilities

Wallet/value layer:
  no page can mutate wallet directly
  explicit user confirmation required
```

That gives us a strong separation:

```text
site cannot access wallet
site cannot access private passport keys
site cannot call internal services
site cannot execute code unless policy allows it
site cannot escape its declared permissions
```

## My recommendation for the refactor

Yes, we should bake sandboxing into the refactor from day one.

The React refactor should include a structure like:

```text
shared/
  SafeRenderer.jsx
  SandboxedFrame.jsx
  CapabilityGate.jsx
  FacetPolicyViewer.jsx
  TruthBoundary.jsx

pages/code/
  CodePage.jsx
  FacetContractPanel.jsx

pages/site/
  SiteRenderer.jsx
```

And the rule should be:

```text
React renders trusted CrabLink UI.
Untrusted crab content renders inside a sandbox boundary.
Executable code requires a facet contract and a sandbox runtime.
```

So yes: we cannot make Chrome itself “completely sandboxed,” but we can make the CrabLink internet **sandbox-first by design**, which is exactly the right direction for the refactor.

[1]: https://developer.chrome.com/docs/extensions/reference/manifest/sandbox?utm_source=chatgpt.com "Manifest - Sandbox | Chrome Extensions"
[2]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox?utm_source=chatgpt.com "Content-Security-Policy: sandbox directive - MDN Web Docs"
