# CrabLink Testing Matrix

RO:WHAT — Testing and regression matrix for the CrabLink Chrome/React refactor.
RO:WHY — Converts the latest working proofs into repeatable acceptance gates before deeper product routes are added.
RO:INTERACTS — scripts/check-react-lane.sh, scripts/check-chrome.sh, scripts/package-chrome.sh, extension manual checklist, svc-gateway smoke tests.
RO:INVARIANTS — gateway-only; no fake backend truth; no silent ROC spend; no direct internal-service calls; no arbitrary crab:// code execution.
RO:SECURITY — paid actions require explicit user confirmation and strict backend DTOs.
RO:TEST — run after every refactor batch and before regenerating CODEBUNDLE_CHROME_EXTENSION.md.

---

## 0. Current React image proof

Newest current React image proof:

```text
crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image
```

Acceptance:

```text
React crab://image
→ selected local image
→ /assets/image/prepare
→ explicit /wallet/hold
→ /assets/image upload
→ fresh crab://<hash>.image URL
→ gateway resolve
→ hydrated asset page
→ image preview visible
```

Regression fail conditions:

```text
- ImagePublishFlow white-screens.
- Wallet hold sends client-only fields to /wallet/hold.
- Returned crab://<hash>.image does not resolve.
- Resolved image asset page does not show an image preview card.
- Asset DTO kind=asset prevents .image preview.
- Binary PNG bytes render as page text.
```

---

## 1. Static gates

Run from the CrabLink repo:

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
Package zip is written.
CODEBUNDLE_CHROME_EXTENSION.md is regenerated.
```

---

## 2. Strict wallet hold body

The only strict wallet hold body fields allowed for `/wallet/hold` are:

```text
from
to
asset
amount_minor
nonce
memo
idempotency_key
```

Static check must fail if the API body includes:

```text
schema
api_request
ui_preview_request
hold_template
wallet_hold
paid_storage
client-only preview fields
```

Reason:

```text
The UI may display rich diagnostics, but the actual gateway /wallet/hold request must remain strict JSON accepted by svc-wallet/omnigate.
```

---

## 3. Route fallback guard

Built-in local creator routes must not fall through to named site lookup.

Guarded routes:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

Fail conditions:

```text
- crab://article resolves through /sites/article.
- crab://video resolves through /sites/video.
- crab://stream resolves through /sites/stream.
- crab://podcast resolves through /sites/podcast.
- A previous local workspace remains visible after route switch.
- A named-site iframe remains visible after leaving a site route.
```

Manual route switching sequence:

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
Each route owns its own page. The previous route unmounts/disappears cleanly.
```

---

## 4. Known-good route matrix

| Route | Expected behavior | Backend truth required? |
| --- | --- | --- |
| `crab://site` | Site launch/open workspace | Some actions yes |
| `crab://image` | Paid image prepare/hold/upload workspace | Yes for publish |
| `crab://profile` | Passport/profile local + gateway truth surface | Partial |
| `crab://3387356e7b89c7ef6a230e79cf82d6ed774a6c7a441f606c26351f739d03cd16.image` | Hydrated image asset with visible preview | Yes |
| `crab://definitely-missing-site` | Honest structured missing-site problem | Yes |
| `crab://ron6` | Named site render proof when stack contains it | Yes |
| `crab://article` | Local article creator workspace | No publication truth |
| `crab://video` | Local video creator workspace | No publication truth |
| `crab://stream` | Local stream creator workspace | No publication truth |
| `crab://podcast` | Local podcast creator workspace | No publication truth |

---

## 5. Local creator truth boundary

Local creator workspaces may:

```text
- collect local creator metadata
- render safe local previews
- save local drafts in chrome.storage.local
- generate future manifest JSON
- copy local manifest/metadata JSON
- make explicit non-mutating gateway prepare attempts
- show honest 404 / not-wired-yet responses
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
- invent ownership/provenance/receipt truth
```

---

## 6. Extension-origin React testing

Default path:

```text
Reload unpacked extension in chrome://extensions
Open CrabLink
Click/open the React lane from the extension
Test routes from extension origin
```

Fallback debug path only:

```bash
cd /Users/mymac/Desktop/crablink/dist/chrome-src
python3 -m http.server 4173 --bind 127.0.0.1
```

Fallback route example:

```text
http://127.0.0.1:4173/react.html?url=crab%3A%2F%2Fimage
```

---

## 7. Browser security checks

Fail if any batch introduces:

```text
<all_urls>
chrome.history
chrome.cookies
webRequestBlocking
nativeMessaging
private key storage
seed phrase storage
direct svc-wallet URL
direct svc-storage URL
direct svc-index URL
direct omnigate URL
direct ron-ledger URL
crab://b3/<hash> public URL format
page-local-route-mode.js
```

Public asset URLs must remain:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

---

## 8. Theme/ad-slot checks

Expected:

```text
- Header AD SPACE slot remains visible in normal shell routes.
- Light mode remains neutral/off-white, not blue-heavy.
- Dark mode remains black/neutral, not blue-heavy.
- Creator workspace cards do not use large white blocks in dark mode.
- Forms and preview panels remain readable in both themes.
```

---

## 9. Carryover after test run

After any successful batch, record:

```text
- exact command output summary
- whether extension-origin React testing was used
- whether local HTTP fallback was used
- newest working image URL if a new image was uploaded
- any failing route and exact error text
- whether CODEBUNDLE_CHROME_EXTENSION.md was regenerated
```