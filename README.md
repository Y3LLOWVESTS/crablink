

## `extensions/chrome/README.md`

````markdown
# CrabLink Extension for Chrome

CrabLink Extension for Chrome is the first browser-client proof for RustyOnions.

It resolves `crab://` links, opens typed b3 asset pages, opens named RON sites, renders sandboxed site HTML, resolves `<crab-image>` references, and talks to the local RustyOnions gateway.

CrabLink is a thin browser client. RustyOnions remains the source of truth for identity, wallet balance, ROC receipts, site manifests, storage, index state, and raw b3 bytes.

---

## Load unpacked

1. Open Chrome.
2. Go to:

```text
chrome://extensions
````

3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select:

```text
extensions/chrome
```

---

## Default local gateway

```text
http://127.0.0.1:8090
```

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
- Upload paid image assets with explicit wallet hold.
- Create paid named sites with explicit wallet hold.
- Open named crab:// sites.
- Render named sites as sandboxed full-tab pages.
- Render <crab-image src="crab://<hash>.image"> inside site HTML.
- Fetch rendered image bytes through gateway /o only.
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

Known-good image asset:

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

The current foundation is green enough to start the next NEXT_LEVEL layer:

```text
1. First-run @username selection UX.
2. Passport/profile manifest read-only display.
3. Site creator @username resolved from backend/public profile truth.
4. Reputation/moderator score display from backend truth only.
5. Later: .post, .comment, .article primitives.
```

Do not implement fake profile or reputation truth locally. Until backend contracts exist, CrabLink may show placeholders, but must label them honestly.

````

## `extensions/chrome/docs/GREEN_GATE_LOCAL.md`

```markdown
# CrabLink Local Green Gate

RO:WHAT — Documents the current local green-gate workflow for CrabLink Chrome Extension.
RO:WHY — Freezes the proven NEXT_LEVEL image/site/passport smoke foundation before expanding into profile, post, comment, article, and reputation primitives.
RO:INTERACTS — scripts/check-chrome.sh, scripts/package-chrome.sh, scripts/smoke-local-gateway.sh, scripts/smoke-site-create-local.sh, scripts/green-gate-local.sh, CODEBUNDLE_CHROME_EXTENSION.md.
RO:INVARIANTS — safe default is non-mutating; mutating proofs are explicit; CrabLink remains gateway-only; no fake ROC, fake receipts, or direct internal service calls.
RO:METRICS — backend service metrics remain in RustyOnions; this document records client-side proof commands.
RO:CONFIG — local gateway defaults to http://127.0.0.1:8090; dev passport passport:main:dev; dev wallet acct_dev.
RO:SECURITY — dev ROC spends are opt-in; no private key or seed phrase handling; no broad Chrome permissions.
RO:TEST — run scripts/green-gate-local.sh and the full mutating proof command below.

---

## 0. Current milestone

CrabLink has a complete local green gate for the current NEXT_LEVEL product-proof foundation.

The full green gate proves:

```text
Chrome extension static checks
→ Chrome package build
→ gateway read/prepare route smoke
→ passport/bootstrap smoke
→ known-good raw preview smoke
→ paid image upload smoke
→ paid site create/open smoke
→ named crab:// site resolver
→ codebundle regeneration
````

This is the current checkpoint before moving deeper into:

```text
@username passport UX
public profile manifests
site creator identity hydration
reputation/moderator score display
.post / .comment / .article primitives
```

---

## 1. Required local RustyOnions stack

Run `svc-wallet` first.

From RustyOnions repo:

```bash
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

In a second terminal, start the CrabLink WEB3 stack:

```bash
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Expected gateway:

```text
http://127.0.0.1:8090
```

Wallet startup order matters. If the stack starts before `svc-wallet`, CrabLink can show fallback identity/wallet display with stale or non-ledger-backed state. That fallback is not spend authority.

---

## 2. Safe default green gate

From CrabLink repo:

```bash
scripts/green-gate-local.sh
```

This does not intentionally spend ROC.

It runs:

```text
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
scripts/make_codebundle.sh
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

## 3. Full mutating green gate

Run this only when intentionally spending dev ROC:

```bash
CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

This runs:

```text
static checks
package build
non-mutating gateway smoke
passport/bootstrap smoke
known-good raw preview smoke
paid image upload smoke
site create/open smoke
codebundle regeneration
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

## 4. What the non-mutating smoke proves

Command:

```bash
scripts/smoke-local-gateway.sh
```

Proves:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/acct_dev/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
GET /crab/resolve?url=crab://music
GET /crab/resolve?url=crab://article
POST /sites/prepare
POST /assets/image/prepare
```

Expected built-in page statuses:

```text
crab://site     active
crab://image    active
crab://music    coming_soon
crab://article  coming_soon
```

---

## 5. What passport/bootstrap smoke proves

Command:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Proves:

```text
POST /identity/passport/bootstrap
GET /wallet/acct_dev/balance
```

Expected:

```text
bootstrap JSON: ok
wallet JSON: ok
```

Rules:

```text
- Bootstrap is explicit.
- Starter ROC is backend-issued.
- CrabLink displays backend-derived state.
- CrabLink does not fake receipt IDs.
- CrabLink stores labels and display metadata only.
```

---

## 6. What known-good raw preview proves

Command:

```bash
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
```

Default known-good URL:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Proves:

```text
GET /crab/resolve?url=crab://<hash>.image
GET /o/b3:<hash>
raw byte response is non-empty
```

Expected:

```text
known-good raw preview JSON/bytes: ok
```

This is the image used by the current `<crab-image>` named-site embed proof.

---

## 7. What paid image upload smoke proves

Command:

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Proves:

```text
/assets/image/prepare
→ /wallet/hold
→ /assets/image
→ /crab/resolve?url=crab://<hash>.image
→ /o/b3:<hash>
→ raw byte match
→ wallet balance refresh
```

Expected:

```text
paid image upload JSON/raw bytes: ok
paid image crab URL: crab://<64 lowercase hex>.image
```

Rules:

```text
- Upload body is raw image bytes.
- Paid hold is explicit.
- Raw bytes are verified through gateway /o.
- Upload result must include canonical crab://<hash>.image.
- Wallet balance refreshes after mutation.
```

---

## 8. What site create/open smoke proves

Command:

```bash
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Proves:

```text
/sites/prepare
→ /wallet/hold
→ /sites
→ /sites/<site_name>
→ /crab/resolve?url=crab://<site_name>
→ wallet balance refresh
```

Expected:

```text
CrabLink site create/open smoke passed.
```

Rules:

```text
- Site prepare is non-mutating.
- Wallet hold is explicit.
- Site creation uses paid proof headers.
- Site lookup goes through public gateway routes.
- Named crab:// site resolver is a hard gate.
```

---

## 9. Current proof addresses

Known-good paid image asset:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known-good reference image used by `<crab-image>` proof:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Named site reference-graph proof:

```text
crab://thedustyonion6
```

---

## 10. Current no-regression requirements

Do not move into `.post`, `.comment`, or `.article` primitives unless these still pass after a fresh stack restart:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Or run the one-command full proof:

```bash
CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

---

## 11. Debugging common failures

### Wallet nonce conflict

Expected sometimes:

```text
HTTP 409 NONCE_CONFLICT
```

The smoke scripts retry once with the backend-provided expected nonce.

If retry fails, run with an explicit nonce:

```bash
CRABLINK_SMOKE_HOLD_NONCE=<expected_nonce> CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

For site create:

```bash
CRABLINK_SITE_HOLD_NONCE=<expected_nonce> CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

### Idempotency key too long

This should be fixed in the current scripts.

If it returns:

```text
Idempotency-Key must be 1..=64 bytes
```

check that the smoke scripts are using compact idempotency keys rather than long descriptive strings.

### Gateway offline

Check:

```bash
curl -i http://127.0.0.1:8090/healthz
curl -i http://127.0.0.1:8090/readyz
```

### Raw bytes mismatch

Run the known-good raw preview smoke first:

```bash
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
```

Then rerun paid upload.

---

## 12. Why this gate matters

This gate proves the current RustyOnions product loop:

```text
Passport context
→ wallet balance
→ prepare
→ hold
→ publish bytes/site
→ resolve crab URL
→ hydrate manifest
→ render content
→ verify raw b3 bytes
→ refresh wallet state
```

That is the foundation for:

```text
creator economy routing
reference-graph sites
public profile manifests
site creator @username display
reputation/moderation summaries
post/comment/article primitives
future browser UX
```

CrabLink should not add those next layers by faking local truth. It should expose backend truth as the backend contracts become available.

````

## `extensions/chrome/docs/NEXT_LEVEL_NEXT_BATCHES.md`

```markdown
# CrabLink NEXT_LEVEL Next Batches

RO:WHAT — Implementation ordering for CrabLink after the local green gate.
RO:WHY — Prevents feature spaghetti by sequencing passport/profile/reputation/content primitives after the proven image/site foundation.
RO:INTERACTS — NEXT_LEVEL.MD, WEB3_2.MD, CrabLink extension UI, svc-gateway route contracts, future passport/profile routes.
RO:INVARIANTS — gateway-only; no fake identity/reputation/wallet truth; no silent ROC spend; no public main↔alt linkage by default.
RO:METRICS — future profile/view/moderation events belong in backend metrics/accounting, not local fake counters.
RO:CONFIG — feature gates should remain explicit; risky or incomplete backend contracts should be hidden or labeled experimental.
RO:SECURITY — no private key custody, no seed phrases, no hidden spend authority, no fake privacy claims.
RO:TEST — each batch must keep scripts/green-gate-local.sh passing.

---

## 0. Current foundation

The following foundation is now green:

```text
CrabLink local green gate
safe default gate
full mutating gate
passport/bootstrap smoke
known-good raw preview
paid image upload
paid site create/open
named crab:// site resolver
sandboxed site rendering
<crab-image> embed rendering
codebundle regeneration
````

This gives CrabLink a stable base for NEXT_LEVEL product work.

---

## 1. Batch A — Checkpoint docs and runbook

Status:

```text
in progress / current batch
```

Purpose:

```text
Freeze the proven green gate before new feature work.
```

Files:

```text
extensions/chrome/README.md
extensions/chrome/docs/GREEN_GATE_LOCAL.md
extensions/chrome/docs/NEXT_LEVEL_NEXT_BATCHES.md
```

Acceptance:

```text
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/green-gate-local.sh
```

---

## 2. Batch B — First-run @username UX scaffold

Purpose:

```text
Let first-run users choose an @username while clearly treating the value as pending backend reservation until RustyOnions confirms it.
```

Rules:

```text
- Do not fake ownership of @username.
- Do not claim global uniqueness unless backend confirms it.
- Store only local draft/pending labels.
- Do not link alt passports to main identities publicly.
- Do not add private key custody.
```

Likely UI states:

```text
No passport:
  Create your RON Passport
  Choose @username
  Create Passport

Pending backend:
  @username requested
  waiting for RustyOnions confirmation

Backend confirmed:
  @username active
  profile route available when backend publishes it
```

Likely files:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
shared/schemas/extension-settings.schema.json
shared/fixtures/passport-bootstrap.sample.json
shared/schemas/passport-bootstrap.schema.json
```

Backend dependency:

```text
POST /identity/passport/bootstrap may need optional username/requested_handle fields.
GET /identity/me may need username/handle/public_profile fields.
```

If backend does not support username yet:

```text
CrabLink may show local draft @username.
CrabLink must label it as pending/local.
CrabLink must not show it as confirmed creator identity.
```

Acceptance:

```text
First-run card appears when no passport is configured.
User can enter a syntactically valid @username.
Invalid @username fails locally before request.
Bootstrap sends requested username only if field is enabled.
Confirmed username only displays when backend returns it.
scripts/green-gate-local.sh still passes.
```

---

## 3. Batch C — Read-only profile/passport page placeholder

Purpose:

```text
Prepare CrabLink to open read-only profile/passport pages without inventing profile truth.
```

Target UX:

```text
Click site creator @username
→ open read-only profile page if backend provides profile crab URL
→ otherwise show honest placeholder
```

Rules:

```text
- Profile pages are read-only.
- No spend authority appears on public profile.
- No private alt/main linkage.
- No fake reputation.
- No fake moderation score.
```

Possible public routes:

```text
crab://@username
crab://profile/@username
crab://<profile-manifest-hash>.profile
```

Use whichever route the backend contract settles on.

Likely files:

```text
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/page.js
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/ronClient.js
shared/schemas/profile-page.schema.json
shared/fixtures/profile-page.sample.json
```

Acceptance:

```text
Clicking @username never breaks current site view.
If profile route exists, it resolves through gateway.
If profile route does not exist, user sees clear read-only pending message.
No direct svc-passport call.
scripts/green-gate-local.sh still passes.
```

---

## 4. Batch D — Site creator identity hydration

Purpose:

```text
Replace @username placeholder with backend-provided site creator identity when available.
```

Input truth sources:

```text
site page payload
site manifest
public profile manifest
identity route output
```

Rules:

```text
- Backend-provided username may display as confirmed.
- Placeholder remains @username when not provided.
- Reputation/moderator chips remain dash/unknown until backend provides scores.
- CrabLink never invents score values.
```

Likely files:

```text
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/page-site-render-mode.js
shared/fixtures/site-page.sample.json
shared/schemas/site-page.schema.json
```

Acceptance:

```text
crab://thedustyonion6 still renders.
Site toolbar still spans full viewport.
Site Manifest still works.
Creator handle uses backend field if present.
Unknown values remain honest placeholders.
scripts/green-gate-local.sh still passes.
```

---

## 5. Batch E — Reputation/moderator display from backend truth

Purpose:

```text
Expose reputation and moderator score summaries near creator identity without creating local fake scores.
```

Rules:

```text
- No local score computation in CrabLink MVP.
- No fake score defaults like 100 or 5 stars.
- Unknown is shown as unknown/dash.
- Site-scoped moderator role must be labeled site-scoped.
- Global/passport reputation must be labeled separately from site moderator privileges.
```

Possible display:

```text
site creator: @alice
rep 42
mod 7
site moderator: yes
```

Unknown display:

```text
site creator: @username
rep —
mod —
```

Backend dependency:

```text
public profile manifest or site payload must publish score fields.
```

Acceptance:

```text
No backend score → dash.
Backend score → display exact integer/string returned.
Malformed score → ignored or shown as unknown.
scripts/green-gate-local.sh still passes.
```

---

## 6. Batch F — Article/post/comment primitive planning

Purpose:

```text
Extend the image/site reference-graph model to text content assets without breaking the existing image/site proof.
```

Order:

```text
.article
.post
.comment
```

Do not start with video/music streaming yet.

Rules:

```text
- Every content object gets canonical b3:<hash>.
- Public URL format stays crab://<hash>.<kind>.
- Site stores references to assets.
- Asset manifests store ownership/payout/provenance.
- Site owns route maps/layout/moderation policy/reference graph.
- No arbitrary executable linked code.
```

Potential built-ins:

```text
crab://article
crab://post
crab://comment
```

Acceptance before code:

```text
Image and site full green gate still passes.
Backend route contract for at least one primitive exists or is clearly mocked as coming_soon.
```

---

## 7. Batch G — Receipt history and paid-flow polish

Purpose:

```text
Make paid actions easier for users to understand and audit.
```

Scope:

```text
recent receipts display
hold txid display
receipt hash display
copy receipt JSON
explain hold/capture/release semantics
```

Rules:

```text
- Receipts are backend returned.
- No fake receipt.
- No local ledger.
- No hidden retry spend.
```

Likely files:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/styles.css
```

Acceptance:

```text
Paid image upload displays receipt summary.
Paid site create displays receipt summary.
Copy receipt JSON works.
No token in copied/user-visible errors.
scripts/green-gate-local.sh still passes.
```

---

## 8. Always-run gates before advancing

Safe gate:

```bash
scripts/green-gate-local.sh
```

Full gate:

```bash
CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

Manual named-site check:

```text
crab://thedustyonion6
→ crab://site
```

Expected:

```text
No stale iframe.
Full-width site render.
Quick-nav hidden on named site.
Site creator toolbar visible.
Site Manifest works.
Embedded image loads.
```

---

## 9. Do not do yet

Avoid these until backend contracts and privacy/security design are ready:

```text
- Main↔alt wallet cash-out promises.
- Public alt→main linkage.
- Local private key custody.
- Seed phrase UX.
- Browser-stored long-lived spend authority.
- Reputation scores computed locally.
- Clearnet attribution claims.
- External settlement / ROX / Solana bridge.
- Staking/liquidity/exchange-facing logic.
- Video/music streaming before image/site/article primitives are stable.
```

---

## 10. Product goal

The near-term product goal is:

```text
Install CrabLink
→ create/load RON Passport
→ see backend-derived ROC balance
→ choose/request @username
→ open crab:// image/site pages
→ publish paid image/site content
→ inspect receipts/proofs
→ navigate creator identity and profile manifests
```

The long-term product goal is:

```text
A better creator web:
content-addressed
reference-graph based
transparent payout routing
manifest-backed attribution
privacy-honest passports/alts
moderation/reputation surfaced from backend truth
```

````

Run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
scripts/green-gate-local.sh
scripts/make_codebundle.sh
````

Because these are docs-only additions/replacements, the safe green gate should continue to pass.
