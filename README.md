
# CrabLink Extension for Chrome

CrabLink Extension for Chrome is the first browser-client proof for RustyOnions.

It resolves `crab://` links, opens typed b3 asset pages, opens named RON sites, renders sandboxed site HTML, resolves `<crab-image>` references, opens local creator workspaces, and talks to the local RustyOnions gateway.

CrabLink is a thin browser client. RustyOnions remains the source of truth for identity, wallet balance, ROC receipts, site manifests, storage, index state, raw b3 bytes, creator ownership, profile truth, reputation/moderator scores, and backend publication status.

CrabLink must stay:

```text
thin
honest
safe
explicit
local-first
gateway-only
receipt-driven
permission-minimal
future-browser-ready
```

---

## Load unpacked

1. Open Chrome.
2. Go to:

```text
chrome://extensions
```

3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select:

```text
extensions/chrome
```

6. Click the CrabLink extension icon to open the full-tab CrabLink browser.

---

## Default local gateway

```text
http://127.0.0.1:8090
```

Gateway settings are configured in the extension options page.

---

## Current MVP behavior

CrabLink currently supports:

```text
- Configure local gateway URL in options.
- Check RustyOnions node health/readiness.
- Check gateway-backed identity state.
- Display backend-derived ROC balance.
- Resolve crab:// links through svc-gateway.
- Open typed b3 image asset pages.
- Open built-in product pages:
  - crab://site
  - crab://image
  - crab://music
  - crab://article
  - crab://video
  - crab://stream
  - crab://podcast
  - crab://profile
- Open local creator workspaces:
  - crab://article
  - crab://video
  - crab://stream
  - crab://podcast
- Upload paid image assets with explicit wallet hold.
- Create paid named sites with explicit wallet hold.
- Open named crab:// sites.
- Render named sites as sandboxed full-tab pages.
- Render <crab-image src="crab://<hash>.image"> inside site HTML.
- Fetch rendered image bytes through gateway /o only.
- Show local Passport/profile UX scaffolds without claiming backend profile publication.
- Show local alt draft UX without claiming public alt identity truth.
```

---

## Current local creator workspaces

These routes currently work as local UX / prepare scaffolds:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

They are intentionally **not** backend-published assets yet.

They may:

```text
- collect local creator metadata
- render safe local previews
- save local drafts in chrome.storage.local
- generate future manifest JSON
- copy local manifest/metadata JSON
- make explicit non-mutating gateway prepare attempts
- show honest 404 / not wired yet responses when backend routes do not exist
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
- create fake comments/moderation truth
- invent ownership/provenance/receipt truth
```

Current expected prepare routes:

```text
POST /assets/article/prepare
POST /assets/video/prepare
POST /streams/prepare
POST /podcasts/prepare
```

A `404`, `405`, or `501` from these prepare routes is acceptable until backend routes are wired. The UI must label that honestly as “backend route not wired yet,” not as a failed publication.

---

## Creator workspace regression rule

The current working model is:

```text
page.js:
  Parses local built-in routes.
  Prevents article/video/stream/podcast from falling through to named-site lookup.
  Keeps normal browser history/rendering behavior.

Each creator workspace module:
  Owns its own local UI.
  Checks the current address/page payload.
  Cleans up its own stale sibling workspace sections.
```

Do not reintroduce:

```text
extensions/chrome/src/page-local-route-mode.js
```

That file previously caused a route-controller collision with the per-page creator workspace modules.

After any change touching page routing, script order, `page.js`, `page.html`, or the creator modules, test this exact sequence:

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

Expected:

```text
- each route opens the correct workspace
- no stale previous workspace remains stuck
- no /sites/article fallback happens
- no /sites/video fallback happens
- no /sites/stream fallback happens
- no /sites/podcast fallback happens
- no blank screen appears
- no slow load caused by failed site fallback appears
- no fake backend publication is claimed
- no ROC mutation happens on page load
```

---

## Public URL forms

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

Public typed asset URLs use:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Example:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Named site URLs use:

```text
crab://<site_name>
```

Example:

```text
crab://thedustyonion6
```

Do not use the old public URL form:

```text
crab://b3/<hash>.<asset_kind>
```

---

## Canonical proof assets

Known-good paid image asset:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known-good reference-graph image embed asset:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Current named site reference-graph proof:

```text
crab://thedustyonion6
```

`crab://thedustyonion6` proves:

```text
site root HTML
→ stored as its own b3 object
→ named site manifest points at the HTML root
→ HTML contains <crab-image src="crab://...image">
→ CrabLink detects the referenced image asset
→ CrabLink fetches bytes through svc-gateway /o
→ image renders inside the sandboxed site page
```

---

## Safe green gate

From the CrabLink repo:

```bash
scripts/green-gate-local.sh
```

The safe default gate proves:

```text
- static extension checks
- Chrome package build
- non-mutating gateway read/prepare route smoke
- codebundle regeneration
```

Expected ending:

```text
CrabLink local green gate passed.

Non-mutating gates proved:
- static extension checks
- Chrome package build
- gateway read/prepare route smoke

Optional mutating gates run:
- bootstrap:         0
- known-good raw:    0
- paid image upload: 0
- site create/open:  0
```

---

## Full dev green gate

This spends dev ROC and creates dev test objects/sites.

Run only when you intentionally want the full proof:

```bash
CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

The full gate proves:

```text
- static extension checks
- Chrome package build
- non-mutating gateway route smoke
- passport/bootstrap smoke
- known-good raw preview smoke
- paid image upload smoke
- paid site create/open smoke
- named crab:// site resolver
- codebundle regeneration
```

Expected ending:

```text
CrabLink local green gate passed.

Optional mutating gates run:
- bootstrap:         1
- known-good raw:    1
- paid image upload: 1
- site create/open:  1
```

---

## Individual smoke commands

Static check and package:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Non-mutating route smoke:

```bash
scripts/smoke-local-gateway.sh
```

Passport/bootstrap smoke:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Known-good raw preview smoke:

```bash
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
```

Paid image upload smoke:

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Site create/open smoke:

```bash
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Regenerate codebundle:

```bash
scripts/make_codebundle.sh
```

---

## Paid image proof path

The paid image smoke proves:

```text
/assets/image/prepare
→ /wallet/hold
→ /assets/image
→ /crab/resolve?url=crab://<hash>.image
→ /o/b3:<hash>
→ raw byte match
→ wallet balance refresh
```

Rules:

```text
- Upload body must be raw image bytes.
- Do not JSON-stringify image files.
- Use explicit wallet hold proof.
- Use x-ron-wallet-txid for paid image upload.
- Raw preview must come back through svc-gateway /o.
- No direct svc-storage call from the extension.
```

---

## Site create/open proof path

The site smoke proves:

```text
/sites/prepare
→ /wallet/hold
→ /sites
→ /sites/<site_name>
→ /crab/resolve?url=crab://<site_name>
→ wallet balance refresh
```

Rules:

```text
- Site prepare is non-mutating.
- Wallet hold is explicit.
- Site creation uses paid proof headers.
- Site opens through public gateway routes.
- No direct svc-index or svc-storage call from CrabLink.
```

---

## Manual UI proof: named site renderer

Open:

```text
crab://thedustyonion6
```

Expected:

```text
- CrabLink URL bar remains visible.
- Quick-nav buttons are hidden while viewing the named site.
- Site renders as a first-class sandboxed website.
- Site content spans the browser viewport.
- Top site toolbar includes:
  - site creator:
  - @username or backend-provided handle
  - reputation chip
  - moderator chip
  - Site Manifest button
- Embedded <crab-image> loads automatically.
- No binary PNG/IHDR/IDAT text appears.
- No direct wallet/storage/index/ledger call is added.
```

Navigation regression check:

```text
crab://thedustyonion6
→ crab://site
```

Expected:

```text
The old rendered site iframe disappears completely before crab://site appears.
```

---

## Manual UI proof: local creator workspaces

Open each route:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

Expected:

```text
- Correct workspace opens.
- Local draft fields render.
- Local preview area renders.
- Future manifest JSON renders.
- Copy actions work.
- Save local draft works.
- Clear local draft works.
- Send Prepare Request is explicit and non-mutating.
- Failed prepare routes are labeled honestly.
- No backend publication is claimed.
- No b3 CID is invented.
- No ROC is charged.
- No wallet mutation occurs.
```

Route switching regression check:

```text
crab://article
→ crab://video
→ crab://stream
→ crab://podcast
→ crab://video
→ crab://podcast
→ crab://stream
→ crab://article
```

Expected:

```text
The previous workspace disappears before the next workspace appears.
```

---

## Security rules

Before merging extension changes, check:

```text
- Did this add a Chrome permission?
- Did this add a backend route dependency?
- Did this call anything other than svc-gateway?
- Did this store anything sensitive?
- Did this add a paid action path?
- Does the paid path require explicit confirmation?
- Does the UI distinguish backend truth from local state?
- Are errors useful but redacted?
- Does the code avoid broad page injection?
- Does the code preserve crab://<hash>.<kind> public URL format?
- Does scripts/check-chrome.sh still pass?
- Should CODEBUNDLE_CHROME_EXTENSION.md be regenerated?
```

CrabLink must not become:

```text
- a wallet truth engine
- a ledger
- a passport private-key authority
- a storage service
- an index service
- a policy engine
- a gateway replacement
- a fake backend simulator
- a route hijack controller
```

The browser client should stay:

```text
thin
honest
safe
explicit
local-first
gateway-only
receipt-driven
permission-minimal
future-browser-ready
```

---

## Current next product direction

The current foundation is green enough to continue the next NEXT_LEVEL layer:

```text
1. First-run @username selection UX.
2. Passport/profile manifest read-only display.
3. Site creator @username resolved from backend/public profile truth.
4. Reputation/moderator score display from backend truth only.
5. Later: .post, .comment, .article primitives.
6. Later: backend .video, .stream, and .podcast routes after text/content primitives are stable.
```

Do not implement fake profile or reputation truth locally. Until backend contracts exist, CrabLink may show placeholders, but must label them honestly.

---

## Current local creator implementation direction

The local creator pages are useful product prototypes, but backend should be wired in stages.

Recommended backend order:

```text
1. Text primitives first:
   - .post
   - .comment
   - .article

2. Media-lite primitives:
   - .video metadata/upload planning
   - .music/.audio metadata/upload planning
   - .podcast episode metadata

3. Live stream primitives:
   - .stream session prepare
   - ingest/session policy
   - stream manifest
   - archive/VOD
   - chat/mod policy
   - tips/subscription later
```

Do not start with live streaming backend complexity first. Live streaming touches session state, ingest credentials, moderation, chat, storage, and payout complexity.

---

## Important docs

```text
extensions/chrome/docs/blueprint.md
extensions/chrome/test/manual-checklist.md
```

Optional future docs that may be added:

```text
extensions/chrome/docs/GREEN_GATE_LOCAL.md
extensions/chrome/docs/NEXT_LEVEL_NEXT_BATCHES.md
extensions/chrome/docs/CREATOR_WORKSPACES.md
```

---

## Packaging

```bash
scripts/package-chrome.sh
```

Output:

```text
dist/crablink-extension-chrome.zip
```

---

## Code bundle

```bash
scripts/make_codebundle.sh
```

Output:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

The codebundle is for review and AI handoff. Source of truth remains the repo files.

---

## Recommended after README updates

Run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
scripts/green-gate-local.sh
scripts/make_codebundle.sh
```

If route behavior looks stale after reloading:

```text
chrome://extensions
→ CrabLink Extension for Chrome
→ Reload
→ close old CrabLink tabs
→ open a fresh CrabLink tab
```
```
