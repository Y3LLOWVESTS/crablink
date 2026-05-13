# CrabLink Chrome Extension Manual Checklist

RO:WHAT — Manual verification checklist for CrabLink Chrome extension beta and React-refactor flows.
RO:WHY — Locks the hard-won image/site/profile proofs before expanding backend article/video/podcast/stream primitives.
RO:INTERACTS — extensions/chrome, React lane, svc-gateway, omnigate, svc-wallet, svc-storage, svc-index.
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
```

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

---

## 1. Local static/build gate

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
extensions/chrome/src/page-local-route-mode.js does not exist.
extensions/chrome/src/page.html does not reference page-local-route-mode.js.
extensions/chrome/src/background.js keeps src/page.html?url= for the protected full-tab browser path.
extensions/chrome/src/background.js keeps src/react.html?url= for the React lane path.
```

`page-local-route-mode.js` previously caused route-controller collisions. It must not return.

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

Confirm there are no extension errors. If behavior seems stale, close all old CrabLink tabs and open a fresh CrabLink tab.

---

## 3. React lane entry path

Default manual path now uses extension origin:

```text
Open CrabLink
Click/open the React lane from the extension
Test routes from the extension-origin React tab
```

Use local HTTP only as a fallback/debug path:

```bash
cd /Users/mymac/Desktop/crablink/dist/chrome-src
python3 -m http.server 4173 --bind 127.0.0.1
```

Fallback URL shape:

```text
http://127.0.0.1:4173/react.html?url=crab%3A%2F%2Fprofile
```

---

## 4. Current proof URLs

Newest current React image proof:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Earlier React image proof:

```text
crab://6e343cbcbcd233a72ce45b197d1c45caea862480221ef0f7e4e4360f17e1fce0.image
```

Earlier old-lane image proof:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Older paid image proof:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known named-site proof:

```text
crab://ron6
```

Missing-site truth proof:

```text
crab://definitely-missing-site
```

---

## 5. React image preview regression check

Open:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Expected:

```text
- Route resolves through svc-gateway.
- Hydrated asset page opens.
- Image preview card appears.
- The image bytes visibly render.
- DTO truth remains visible.
- If the DTO says kind=asset but the route suffix is .image, the UI still attempts image preview safely.
- No binary PNG/IHDR/IDAT text appears in the page body.
- No fake owner, payout, receipt, or b3 truth is invented.
```

If preview fails, inspect:

```text
- gateway /crab/resolve response
- preview source URL
- failed preview sources panel
- assetClient.previewSources(hash, kind)
- route suffix parsing
```

---

## 6. React paid image publish smoke

Open:

```text
crab://image
```

Use a small image under 1 MiB.

Expected flow:

```text
select local image
send prepare request
confirm explicit ROC hold
upload image bytes
copy returned crab://<hash>.image URL
open returned URL
see image preview
```

Strict wallet hold body requirement:

```text
The real /wallet/hold API body must contain only strict wallet fields:
from
to
asset
amount_minor
nonce
memo
idempotency_key
```

The strict wallet hold body must not include:

```text
schema
api_request
ui_preview_request
hold_template
wallet_hold
paid_storage
client-only preview fields
```

Expected safety:

```text
- Hold requires an explicit click/confirmation.
- Upload requires backend hold proof.
- No silent ROC spend.
- No direct call to svc-wallet, svc-storage, svc-index, omnigate, or ron-ledger from the React page.
- Wallet mutation goes through gateway only.
```

---

## 7. Missing named-site truth check

Open:

```text
crab://definitely-missing-site
```

Expected:

```text
- Structured problem/diagnostics appear.
- Site is not invented locally.
- HTTP 404 or gateway problem truth is visible.
- Correlation IDs are visible when returned.
- No fake site manifest appears.
- No fallback creates placeholder content.
```

---

## 8. React route fallback guard

Open each built-in route:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

Expected:

```text
- Correct local creator workspace opens.
- Route does not fall through to /sites/article, /sites/video, /sites/stream, or /sites/podcast.
- Local draft fields render.
- Local preview area renders.
- Future manifest JSON renders.
- Copy actions work.
- Save local draft works if exposed.
- Clear local draft works if exposed.
- No backend publication is claimed.
- No b3 CID is invented.
- No ROC is charged.
- No wallet mutation occurs.
```

Route switching sequence:

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
- Previous workspace disappears before the next workspace appears.
- No stale previous workspace remains visible.
- No blank screen.
- No iframe from a named site remains stuck after leaving the site route.
```

---

## 9. Protected route checks

Open:

```text
crab://site
crab://image
crab://profile
```

Expected:

```text
- Page opens from React lane without breaking protected old-lane behavior.
- Profile truth is labeled local/backend clearly.
- Image paid flow requires explicit prepare and hold.
- Site flow does not auto-spend or auto-create without explicit actions.
- Header AD SPACE slot remains visible in normal shell mode.
- Light theme remains neutral/off-white.
- Dark theme remains black/neutral, not blue-heavy.
```

---

## 10. Named site render proof

Open:

```text
crab://ron6
```

Expected:

```text
- CrabLink URL bar remains visible.
- Site renders as a sandboxed website.
- Site content spans the browser viewport.
- Site Manifest remains available if the toolbar exposes it.
- Embedded <crab-image> loads automatically when present.
- No binary PNG/IHDR/IDAT text appears.
- No direct wallet/storage/index/ledger call is added.
```

Navigation regression:

```text
crab://ron6
crab://site
```

Expected:

```text
The old rendered site iframe disappears completely before crab://site appears.
```

---

## 11. Two walletClient.js files warning

There are two wallet client files with different responsibilities:

```text
shared/api/walletClient.js
extensions/chrome/src/shared/api/walletClient.js
```

Rules:

```text
- Do not paste the extension-local wallet hold implementation into root shared/api/walletClient.js.
- The extension-local file owns strict React wallet hold behavior.
- The root shared file stays a small shared browser-client helper.
- If a future batch changes both, explain why in the carryover notes.
```

---

## 12. Security review before merge

Check:

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
- Does scripts/check-react-lane.sh pass?
- Does scripts/check-chrome.sh pass?
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

CrabLink should stay:

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