

## `extensions/chrome/test/manual-checklist.md`

````markdown
# CrabLink Chrome Extension Manual Checklist

RO:WHAT — Manual verification checklist for CrabLink Chrome extension beta flows.
RO:WHY — Locks current NEXT_LEVEL proof paths before expanding to post/comment/article primitives.
RO:INTERACTS — extensions/chrome, svc-gateway, omnigate, svc-wallet, svc-storage, svc-index.
RO:INVARIANTS — gateway-only; no silent ROC spend; no fake receipts; b3 hashes canonical; names are pointers.
RO:METRICS — use gateway correlation/request IDs for backend log correlation.
RO:CONFIG — assumes local gateway at http://127.0.0.1:8090 unless changed in options.
RO:SECURITY — verify minimal permissions and sandboxed site rendering; never expose private keys.
RO:TEST — scripts/check-chrome.sh, scripts/package-chrome.sh, scripts/smoke-local-gateway.sh, live UI checks.

---

## 0. Preconditions

RustyOnions local WEB3/CrabLink stack should be running.

Recommended startup order:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
````

In a second terminal:

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

---

## 1. Local extension checks

From the CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

---

## 2. Chrome reload

Open:

```text
chrome://extensions
```

Then:

```text
Developer mode ON
CrabLink Extension for Chrome
Reload
```

Confirm there are no extension errors.

---

## 3. Minimal permissions check

Open extension details and confirm permissions are still narrow:

```text
storage
activeTab
http://127.0.0.1:*/*
http://localhost:*/*
```

Confirm these are not present:

```text
<all_urls>
tabs
history
cookies
downloads
webRequest
webRequestBlocking
nativeMessaging
unlimitedStorage
clipboardRead
```

---

## 4. Popup health checks

Open popup.

Expected visible elements:

```text
CrabLink logo
gateway status
passport label
wallet label
ROC/balance label
Check Node
Check Passport
Refresh Balance
Create Dev Passport / Starter ROC if not configured
built-in page buttons
```

Click:

```text
Check Node
Check Passport
Refresh Balance
```

Expected:

```text
Gateway reports healthy/ready.
Identity comes from backend route.
Wallet balance is backend-derived.
No fake ledger truth is invented by the extension.
```

---

## 5. Full-tab browser launch

Open full-tab CrabLink through the popup built-in buttons or by extension page URL.

Expected full-tab layout:

```text
CrabLink top browser bar
address bar
Go
Refresh
ROC chip
Passport
Settings gear
quick nav buttons:
  crab://site
  crab://image
  crab://music
  crab://article
Developer JSON hidden behind details
```

---

## 6. Built-in page checks

In the CrabLink full-tab address bar, test:

```text
crab://site
crab://image
crab://music
crab://article
```

Expected:

```text
crab://site resolves as active built-in page.
crab://image resolves as active built-in page.
crab://music is allowed to be coming_soon.
crab://article is allowed to be coming_soon.
No wallet mutation happens on page load.
Developer JSON remains available.
```

---

## 7. Known-good image asset checks

Use these known-good image assets:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Expected:

```text
Asset page resolves.
Schema is omnigate.asset-page.v1.
Owner/passport/payout/storage fields display where backend provides them.
Image preview loads automatically if available.
Developer JSON remains available.
No direct storage/index/ledger call is added.
```

Backend check:

```bash
curl -sG "http://127.0.0.1:8090/crab/resolve" \
  --data-urlencode "url=crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected:

```text
schema = omnigate.asset-page.v1
asset_kind = image
storage.available = true
```

---

## 8. Canonical reference-graph site proof

Open:

```text
crab://thedustyonion6
```

Expected:

```text
CrabLink URL bar remains visible.
Site renders as a first-class site, not just JSON.
Site content spans the available browser width.
Top site toolbar is simple.
Site toolbar includes:
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

Backend raw-byte proof:

```bash
curl -i "http://127.0.0.1:8090/o/b3:2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058" | head -n 20
```

Expected:

```text
HTTP 200
image bytes returned
```

---

## 9. Site Manifest proof

On `crab://thedustyonion6`, click:

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

Close or toggle manifest details.

Expected:

```text
Site view returns without losing page.
Embedded image remains loaded or reloads safely.
```

---

## 10. Creator identity placeholder proof

On named site render:

```text
site creator: @username
rep —
mod —
```

or backend-provided values may appear.

Expected:

```text
If backend has no username, @username placeholder appears.
If backend has no reputation/moderation score, dashes appear.
CrabLink does not invent reputation truth.
Clicking creator handle opens future profile route if available, or shows read-only placeholder status.
No wallet authority is exposed.
No private main↔alt linkage is exposed.
```

---

## 11. Site creation flow

Open:

```text
crab://site
```

Run the creation path:

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
Store Root HTML requires a wallet hold/proof.
Root Document CID is a b3:<64 lowercase hex> returned by backend.
Root Document CID is not the embedded image CID.
Create Site calls public gateway route only.
Returned site opens immediately.
Wallet remains ledger_backed:true when svc-wallet is running.
```

---

## 12. Image upload flow

Open:

```text
crab://image
```

Run the upload path:

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
```

---

## 13. Omnibox flow

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
crab [Tab] 2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Expected:

```text
A CrabLink full-tab page opens.
Address bar contains normalized crab:// URL.
Resolution goes through local gateway.
```

---

## 14. Failure behavior

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

## 15. Security regressions to watch

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

## 16. Current product proof freeze

Do not expand into `.post`, `.comment`, or `.article` until these remain green after a fresh stack restart:

```text
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

## 17. Completion note

Current NEXT_LEVEL product-proof slice is considered green only when:

```text
scripts/check-chrome.sh passes
scripts/package-chrome.sh passes
scripts/smoke-local-gateway.sh passes
crab://thedustyonion6 renders
known-good image assets resolve
site creator proof toolbar appears
Site Manifest remains available
no silent spend/direct internal service calls are introduced
```

````

Run this after pasting:

```bash
cd /Users/mymac/Desktop/crablink
chmod +x scripts/check-chrome.sh scripts/make_codebundle.sh scripts/package-chrome.sh
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
````

This batch should make the latest working CrabLink site-render proof harder to regress.
