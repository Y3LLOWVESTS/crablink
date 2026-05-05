
# CrabLink Extension for Chrome

CrabLink Extension for Chrome is the first browser-client proof for RustyOnions.

It resolves `crab://` links, opens typed b3 asset pages, opens named RON sites, and talks to the local RustyOnions gateway. It is a thin client. RustyOnions remains the source of truth for identity, wallet balance, ROC receipts, site manifests, storage, and index state.

## Load unpacked

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select:

```text
extensions/chrome
```

## Default local gateway

```text
http://127.0.0.1:8090
```

## MVP behavior

CrabLink currently supports:

```text
- Configure local gateway URL in options.
- Check RustyOnions node health/readiness.
- Check gateway-backed identity state.
- Display backend-derived ROC balance.
- Resolve crab:// links through svc-gateway.
- Open b3 image asset pages.
- Open built-in product pages:
  - crab://site
  - crab://image
  - crab://music
  - crab://article
- Upload paid image assets with explicit wallet hold.
- Create paid named sites with explicit wallet hold.
- Render named sites as sandboxed full-tab pages.
- Render <crab-image src="crab://<hash>.image"> inside site HTML.
```

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
crab://crablink-site-smoke-20260504-194050
```

Do not use the old public URL form:

```text
crab://b3/<hash>.<asset_kind>
```

## Green-gate checks

From the CrabLink repo:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
bash syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

Regenerate the codebundle after changes:

```bash
scripts/make_codebundle.sh
```

Expected:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

## Gateway smoke

Run the non-mutating route/DTO smoke:

```bash
scripts/smoke-local-gateway.sh
```

Expected:

```text
CrabLink local gateway smoke passed.
```

## Optional passport/bootstrap smoke

This tests gateway-backed passport/bootstrap behavior and starter ROC display.

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
bootstrap JSON: ok
wallet JSON: ok
CrabLink local gateway smoke passed.
```

## Optional paid image upload smoke

This performs a real paid hold and image upload. It spends dev ROC.

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
running opt-in paid image upload smoke
ok: POST /assets/image/prepare -> HTTP 200
image prepare JSON: ok
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /assets/image -> HTTP 200
image upload JSON: ok
ok: GET /crab/resolve?url=crab://<hash>.image -> HTTP 200
asset page JSON: ok
ok: GET /o/b3:<hash> -> HTTP 200 raw bytes
raw byte match: paid_image_raw
ok: GET /wallet/acct_dev/balance -> HTTP 200
paid image upload JSON/raw bytes: ok
paid image crab URL: crab://<64 lowercase hex>.image
CrabLink local gateway smoke passed.
```

Rules:

```text
- Upload body must be raw image bytes.
- Do not JSON-stringify image bytes.
- Use x-ron-wallet-txid for paid image upload.
- Raw preview must come back through svc-gateway /o.
- No direct svc-storage call from the extension.
```

## Optional site create/open smoke

This performs a real paid hold and named site creation. It spends dev ROC.

```bash
scripts/smoke-site-create-local.sh
```

Expected:

```text
CrabLink site create/open smoke
ok: GET /healthz -> HTTP 200
ok: GET /readyz -> HTTP 200
ok: POST /sites/prepare -> HTTP 200
site prepare JSON: ok
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /sites -> HTTP 200
site create JSON: ok
ok: GET /sites/<site_name> -> HTTP 200
site page JSON: ok
ok: GET /crab/resolve?url=crab://<site_name> -> HTTP 200
named crab resolver JSON: ok
ok: GET /wallet/acct_dev/balance -> HTTP 200
wallet balance JSON: ok
CrabLink site create/open smoke passed.
```

To force named crab resolver support as a hard gate:

```bash
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Rules:

```text
- Site prepare is non-mutating.
- Wallet hold is explicit.
- Site creation uses paid proof headers.
- Site opens through public gateway routes.
- No direct svc-index or svc-storage call from CrabLink.
```

## Manual UI proofs

Known-good paid image asset:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known-good reference-graph site proof:

```text
crab://thedustyonion6
```

Expected for `crab://thedustyonion6`:

```text
- Named site renders as a sandboxed page.
- Site content spans the browser viewport.
- Quick-nav buttons are hidden while viewing the named site.
- Top CrabLink browser bar remains visible.
- Site toolbar shows site creator / @username placeholder.
- Site Manifest remains available.
- <crab-image> resolves through gateway raw /o bytes.
- No binary PNG/IHDR/IDAT text appears.
```

## Security rules

Before merging extension changes, check:

```text
- Did this add a permission?
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

```

## `extensions/chrome/test/manual-checklist.md`

```markdown
# CrabLink Chrome Extension Manual Checklist

RO:WHAT — Manual verification checklist for CrabLink Chrome beta flows.
RO:WHY — DX/GOV/SEC gate before moving from image/site proof into NEXT_LEVEL asset primitives.
RO:INTERACTS — Chrome extension UI, svc-gateway, omnigate, svc-wallet, svc-storage, svc-index.
RO:INVARIANTS — no silent ROC spend; gateway-only calls; b3 hashes canonical; crab://<hash>.kind public URLs.
RO:METRICS — backend services expose /metrics; this checklist records user-visible behavior only.
RO:CONFIG — local gateway defaults to http://127.0.0.1:8090; dev passport passport:main:dev; wallet acct_dev.
RO:SECURITY — never paste dev bearer tokens into screenshots/issues; paid actions require explicit confirmation.
RO:TEST — run with scripts/check-chrome.sh, scripts/package-chrome.sh, scripts/smoke-local-gateway.sh, scripts/smoke-site-create-local.sh.

---

## 0. Purpose

This checklist verifies the current CrabLink beta surface:

```text
CrabLink extension
→ svc-gateway
→ omnigate
→ svc-wallet / svc-storage / svc-index
→ hydrated crab:// pages
→ safe raw preview bytes through gateway /o only
```

Current NEXT_LEVEL order:

```text
1. Keep image upload green.
2. Keep site create/open green.
3. Keep asset-page rendering and raw preview green.
4. Keep named-site sandbox rendering green.
5. Only then start .post/.comment/.article primitives.
```

Do not skip directly into new asset kinds until image and site are repeatably green after a full stack restart.

---

## 1. Backend startup prerequisite

RustyOnions should be running with the CrabLink dev stack.

Terminal A, from RustyOnions repo:

```bash
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Terminal B, from RustyOnions repo:

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

Expected public gateway:

```text
http://127.0.0.1:8090
```

Expected service chain:

```text
CrabLink
→ svc-gateway
→ omnigate
→ svc-wallet / svc-storage / svc-index
```

If `configs/roc-economics.dev.toml` is not present, recreate it or use the current checked-in dev economics path. Local dev image/site prepare should return a small fixed price such as:

```text
25 ROC
```

not legacy byte-size pricing.

---

## 2. Static checks and package

From CrabLink repo:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
bash syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

Then regenerate the codebundle after changes:

```bash
scripts/make_codebundle.sh
```

Expected:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

---

## 3. Non-mutating gateway smoke

Run:

```bash
scripts/smoke-local-gateway.sh
```

Expected:

```text
GET /healthz                                      ok
GET /readyz                                       ok
GET /identity/me                                  ok
GET /wallet/acct_dev/balance                      ok
GET /b3/<sample>.image                            ok
GET /crab/resolve?url=crab://<sample>.image       ok
GET /crab/resolve?url=crab://site                 ok
GET /crab/resolve?url=crab://image                ok
GET /crab/resolve?url=crab://music                ok / coming_soon
GET /crab/resolve?url=crab://article              ok / coming_soon
POST /sites/prepare                               ok
POST /assets/image/prepare                        ok

CrabLink local gateway smoke passed.
```

Rules:

```text
- Default smoke does not spend ROC.
- Default smoke does not upload image bytes.
- Default smoke does not create a site.
- Default smoke proves routes and DTO contracts only.
```

---

## 4. Passport/bootstrap smoke

Run only when testing dev starter passport/grant behavior:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
ok: POST /identity/passport/bootstrap -> HTTP 200
bootstrap JSON: ok
ok: GET /wallet/acct_dev/balance after bootstrap -> HTTP 200
wallet JSON: ok
CrabLink local gateway smoke passed.
```

Rules:

```text
- Do not fake ROC in the extension.
- Display only backend wallet truth.
- If ledger_backed=true, prefer /wallet/:account/balance over bootstrap metadata.
- Passport is identity/capability context, not wallet truth.
```

---

## 5. Paid image upload smoke

This performs a real paid hold and image upload. It spends dev ROC.

Run:

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

If the wallet returns a nonce conflict, rerun with the expected nonce it reports:

```bash
CRABLINK_SMOKE_HOLD_NONCE=<expected_nonce> CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
running opt-in paid image upload smoke
ok: POST /assets/image/prepare -> HTTP 200
image prepare JSON: ok
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /assets/image -> HTTP 200
image upload JSON: ok
ok: GET /crab/resolve?url=crab://<hash>.image -> HTTP 200
asset page JSON: ok
ok: GET /o/b3:<hash> -> HTTP 200 raw bytes
raw byte match: paid_image_raw
ok: GET /wallet/acct_dev/balance -> HTTP 200
paid image upload JSON/raw bytes: ok
paid image crab URL: crab://<64 lowercase hex>.image
CrabLink local gateway smoke passed.
```

Rules:

```text
- Upload body must be raw image bytes.
- Do not JSON-stringify image files.
- Use x-ron-wallet-txid.
- Do not use direct svc-storage.
- Raw preview must come back through svc-gateway /o.
```

---

## 6. Site create/open smoke

This performs a real paid hold and named site creation. It spends dev ROC.

Run:

```bash
scripts/smoke-site-create-local.sh
```

Expected:

```text
CrabLink site create/open smoke
ok: GET /healthz -> HTTP 200
ok: GET /readyz -> HTTP 200
ok: POST /sites/prepare -> HTTP 200
site prepare JSON: ok
site prepare amount: 25 ROC minor units
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /sites -> HTTP 200
site create JSON: ok
ok: GET /sites/<site_name> -> HTTP 200
site page JSON: ok
ok: GET /crab/resolve?url=crab://<site_name> -> HTTP 200
named crab resolver JSON: ok
ok: GET /wallet/acct_dev/balance -> HTTP 200
wallet balance JSON: ok

created site: crab://<site_name>
CrabLink site create/open smoke passed.
```

To require named-site crab resolution as a hard gate:

```bash
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Rules:

```text
- Site prepare is non-mutating.
- Wallet hold is explicit.
- Site create sends paid proof headers.
- Site open goes through public gateway routes.
- No direct svc-index or svc-storage call from CrabLink.
```

---

## 7. Chrome reload

Open:

```text
chrome://extensions
```

Then:

```text
CrabLink
→ Reload
```

Confirm there are no extension errors.

---

## 8. Full-tab browser shell checks

Verify top bar:

```text
CrabLink logo visible
Back button visible
Forward button visible
Home button visible
Address bar visible
Go button visible
Refresh button visible
ROC chip visible
Passport button visible
Settings gear visible
```

Verify navigation:

```text
Home opens crab://site
Refresh reloads current page
Back/Forward work after navigating between pages
Settings opens extension options
Passport button opens drawer
```

---

## 9. Built-in crab:// pages

Open:

```text
crab://site
```

Expected:

```text
page badge: active
site workflow visible
Build Request Preview button enabled
Send Prepare Request disabled until preview exists
Available Actions section visible
Developer JSON available behind details
```

Open:

```text
crab://image
```

Expected:

```text
page badge: active
image workflow visible
file selector visible
title/description/tags fields visible
Build Request Preview button enabled
Developer JSON available behind details
```

Open:

```text
crab://music
```

Expected:

```text
page badge: coming soon
no mutating flow starts automatically
```

Open:

```text
crab://article
```

Expected:

```text
page badge: coming soon
no mutating flow starts automatically
```

---

## 10. Known-good image asset page

Open:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Expected:

```text
Asset page resolves.
Schema is omnigate.asset-page.v1.
Asset kind is image.
Storage is available.
Owner/passport/payout fields display when backend provides them.
Image preview loads automatically if raw bytes are available.
Developer JSON remains available.
No direct storage/index/ledger call is added.
```

Backend proof:

```bash
curl -sG "http://127.0.0.1:8090/crab/resolve" \
  --data-urlencode "url=crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Raw byte proof:

```bash
curl -i "http://127.0.0.1:8090/o/b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4" | head -n 20
```

Expected:

```text
HTTP 200
image bytes returned
```

---

## 11. Named site render proof

Open:

```text
crab://thedustyonion6
```

Expected:

```text
CrabLink URL bar remains visible.
Quick-nav buttons are hidden while viewing the named site.
Site renders as a first-class sandboxed website.
Site content spans the browser viewport.
Top site toolbar includes:
  site creator:
  @username or backend-provided handle
  reputation chip
  moderator chip
  Site Manifest button
Embedded <crab-image> loads automatically.
No binary PNG/IHDR/IDAT text appears.
No direct wallet/storage/index/ledger call is added.
```

Current canonical embedded image proof:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Expected after navigating away:

```text
crab://thedustyonion6
→ crab://site
```

The old rendered site iframe disappears completely before `crab://site` appears.

---

## 12. Site Manifest proof

On a named site, click:

```text
Site Manifest
```

Expected:

```text
Manifest/proof details appear.
Root document CID is visible.
Manifest CID is visible if backend provides it.
Owner passport/wallet fields are visible if backend provides them.
Payout fields are visible if backend provides them.
Source/proof view remains read-only.
```

Close/toggle manifest details.

Expected:

```text
Site view returns without losing page.
Embedded image remains loaded or reloads safely.
```

---

## 13. Site creation UI flow

Open:

```text
crab://site
```

Run:

```text
Fill site name/title/description.
Build Request Preview.
Send Prepare Request.
Confirm ROC Hold.
Paste/write root HTML.
Store Root HTML.
Confirm returned b3 root document CID auto-fills Root Document CID.
Create Site.
Open returned crab://<site_name>.
```

Expected:

```text
Prepare is non-mutating.
Hold requires explicit confirmation.
Store Root HTML requires wallet hold/proof.
Root Document CID is a b3:<64 lowercase hex> returned by backend.
Root Document CID is not an embedded image CID.
Create Site calls public gateway route only.
Returned site opens immediately.
Wallet balance refreshes from backend.
```

---

## 14. Image upload UI flow

Open:

```text
crab://image
```

Run:

```text
Select image file.
Fill title/description/tags.
Build Request Preview.
Send Prepare Request.
Review Prepare Summary.
Confirm ROC Hold.
Submit Image Upload.
Open Asset Page.
```

Expected:

```text
Prepare Summary shows backend-derived amount/bytes/action.
No paid action happens before explicit hold.
Upload includes x-ron-wallet-txid.
Backend returns b3 asset CID and crab://<hash>.image.
Asset page opens and image preview loads.
Wallet balance refreshes from backend.
```

---

## 15. Omnibox flow

Chrome raw custom scheme entry is not solved yet.

Supported beta flow:

```text
Type: crab
Press: Tab
Type: site
Press: Enter
```

Also test:

```text
crab [Tab] image
crab [Tab] thedustyonion6
crab [Tab] 984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Expected:

```text
A CrabLink full-tab page opens.
Address bar contains normalized crab:// URL.
Resolution goes through local gateway.
```

---

## 16. Failure behavior

Stop the RustyOnions gateway and refresh a CrabLink page.

Expected:

```text
Clear error panel.
No blank screen.
No unhandled exception.
No fake status.
Popup shows offline/failed state.
```

Restart gateway and click Refresh.

Expected:

```text
Page resolves again.
```

---

## 17. Security regressions to watch

Fail the manual check if any of these appear:

```text
Silent ROC spend.
Fake receipt.
Fake balance.
Direct ron-ledger call.
Direct svc-storage call from extension.
Direct svc-index call from extension.
Direct svc-wallet call that bypasses public gateway route.
Old crab://b3/<hash> UX.
Broad Chrome permissions.
Untrusted site HTML running extension-privileged code.
Private key, seed phrase, or long-lived uncapped spend authority stored in chrome.storage.local.
```

---

## 18. Current product proof freeze

Do not expand into `.post`, `.comment`, or `.article` until these remain green after a fresh stack restart:

```text
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh

crab://image
→ prepare
→ hold
→ upload
→ open asset page
→ safe preview loads

crab://site
→ prepare
→ hold
→ store root HTML
→ create site
→ open named crab site
→ rendered site appears
→ Site Manifest opens proof/details

crab://thedustyonion6
→ root HTML renders
→ <crab-image> loads
→ site creator toolbar remains
→ no binary text regression
```

---

## 19. Completion note

Current NEXT_LEVEL product-proof slice is green only when:

```text
scripts/check-chrome.sh passes
scripts/package-chrome.sh passes
scripts/smoke-local-gateway.sh passes
CRABLINK_SMOKE_RUN_UPLOAD=1 passes when intentionally spending dev ROC
scripts/smoke-site-create-local.sh passes
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh passes
known-good image assets resolve
named sites resolve and render
site creator proof toolbar appears
Site Manifest remains available
no silent spend/direct internal service calls are introduced
```

```

Run this after pasting:

```bash
cd /Users/mymac/Desktop/crablink
chmod +x scripts/check-chrome.sh scripts/package-chrome.sh scripts/smoke-local-gateway.sh scripts/smoke-site-create-local.sh scripts/make_codebundle.sh
scripts/check-chrome.sh && scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
scripts/make_codebundle.sh
```
