

## `extensions/chrome/test/manual-checklist.md`

````markdown
# CrabLink Chrome Extension Manual Checklist

RO:WHAT — Manual verification checklist for CrabLink Chrome extension beta flows.
RO:WHY — Locks current NEXT_LEVEL proof paths before expanding to backend post/comment/article/media primitives.
RO:INTERACTS — extensions/chrome, svc-gateway, omnigate, svc-wallet, svc-storage, svc-index.
RO:INVARIANTS — gateway-only; no silent ROC spend; no fake receipts; b3 hashes canonical; names are pointers; local creator workspaces are not backend publication.
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
bash syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

Also confirm:

```text
extensions/chrome/src/page-local-route-mode.js does not exist.
page.html does not reference page-local-route-mode.js.
```

That file previously regressed local creator-page navigation and should not be reintroduced.

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

If behavior seems stale, close all old CrabLink tabs and open a fresh CrabLink tab.

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
Identity comes from backend route when available.
Wallet balance is backend-derived when available.
No fake ledger truth is invented by the extension.
```

---

## 5. Full-tab browser launch

Open full-tab CrabLink through the extension icon, popup built-in buttons, or omnibox.

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
  crab://profile
  crab://music
  crab://article
  crab://video
  crab://stream
  crab://podcast
Developer JSON hidden behind details
```

---

## 6. Built-in page checks

In the CrabLink full-tab address bar, test:

```text
crab://site
crab://image
crab://profile
crab://music
```

Expected:

```text
crab://site resolves as active built-in page.
crab://image resolves as active built-in page.
crab://profile opens the local profile UX.
crab://music is allowed to be coming_soon/local scaffold depending on current backend.
No wallet mutation happens on page load.
Developer JSON remains available.
```

---

## 7. Local creator route regression checks

These four routes are currently local UX/prepare scaffolds:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

Test in this exact sequence:

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
URL changes correctly.
Page content changes correctly.
The previous creator page does not remain stuck.
No /sites/article, /sites/video, /sites/stream, or /sites/podcast fallback appears.
No page-local-route-mode.js is required.
Only the current creator workspace is visible.
No blank screen.
No slow loading caused by a failed site lookup.
```

Truth boundary for all four:

```text
No backend asset publication.
No b3 CID assigned.
No manifest CID assigned.
No ROC charged.
No wallet mutation.
No fake success.
```

Expected prepare routes today may return 404:

```text
/assets/article/prepare
/assets/video/prepare
/streams/prepare
/podcasts/prepare
```

That is acceptable. It means the frontend is making honest non-mutating gateway prepare attempts, while the backend route is not wired yet.

---

## 8. Article local workspace check

Open:

```text
crab://article
```

Expected:

```text
Article title/subtitle/summary/body fields render.
Live preview renders.
Word/character/body-byte stats update.
Future article manifest JSON updates.
Copy Manifest JSON works.
Copy Plain Text works.
Save Local Draft works.
Clear Draft works.
Send Prepare Request is non-mutating and may return HTTP 404.
```

Failure if:

```text
A fake b3 CID is displayed as real.
ROC is charged.
A wallet mutation happens.
A backend success is claimed when the route 404s.
```

---

## 9. Video local workspace check

Open:

```text
crab://video
```

Expected:

```text
Local video file picker renders.
Safe local video preview works after selecting a local video.
Metadata fields render.
Thumbnail crab URL field renders.
Suggested price minor units field renders.
Future video manifest JSON updates.
Copy Manifest JSON works.
Copy Metadata JSON works.
Save Local Draft works.
Clear Draft works.
Send Prepare Request is non-mutating and may return HTTP 404.
```

Failure if:

```text
Article UI remains visible above video UI.
A fake upload is claimed.
A b3 CID is invented locally.
ROC is charged.
A wallet mutation happens.
```

---

## 10. Stream local workspace check

Open:

```text
crab://stream
```

Expected:

```text
Local camera/mic preview controls render.
Local screen-share preview controls render.
Stream title/category/description/tags fields render.
Visibility/chat/moderation/stream mode fields render.
Creator handle field renders.
Thumbnail crab URL field renders.
Tips enabled later checkbox renders.
Future stream manifest JSON updates.
Copy Manifest JSON works.
Copy Metadata JSON works.
Save Local Draft works.
Clear Draft works.
Send Prepare Request is non-mutating and may return HTTP 404.
```

Failure if:

```text
A real stream session is claimed.
An ingest key is invented.
A chat room is invented.
Tips route is invented.
ROC is charged.
A wallet mutation happens.
```

---

## 11. Podcast local workspace check

Open:

```text
crab://podcast
```

Expected:

```text
Local audio file picker renders.
Local audio preview works after selecting a local audio file.
Local live mic preview can start after user gesture and can stop.
Show title / episode title / season / episode fields render.
Podcast kind and audio mode fields render.
Description / category / tags fields render.
Cover image crab URL field renders.
Suggested access price minor units field renders.
Tips enabled later checkbox renders.
Future podcast manifest JSON updates.
Copy Manifest JSON works.
Copy Metadata JSON works.
Save Local Draft works.
Clear Draft works.
Send Prepare Request is non-mutating and may return HTTP 404.
```

Failure if:

```text
A podcast episode is claimed as published.
Audio upload is claimed.
A live audio session is claimed.
A b3 CID is invented.
An RSS/feed is claimed.
ROC is charged.
A wallet mutation happens.
```

---

## 12. Known-good image asset checks

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

---

## 13. Site render and reference-graph checks

Open known-good site:

```text
crab://thedustyonion6
```

Expected:

```text
Root HTML renders in the site view.
<crab-image> embed hydrates through gateway object fetch.
Image renders safely.
Site creator toolbar remains available.
Site Manifest opens proof/details.
No binary text regression appears.
No site-provided JavaScript executes as extension-privileged code.
```

Also check a freshly created named site if the stack has one.

---

## 14. Image publish proof check

Open:

```text
crab://image
```

Run the paid image flow only when you intentionally want a mutating paid test:

```text
Prepare image request
Confirm ROC hold
Submit image upload
Open returned crab://<hash>.image
```

Expected:

```text
Prepare shows expected price.
Hold is explicit.
Upload requires hold proof.
Asset page opens.
Image preview loads.
ROC balance reflects backend truth after refresh.
```

Failure if:

```text
Payment is silent.
Hold proof is skipped.
A fake receipt appears.
A local-only balance is treated as spend authority.
```

---

## 15. Site create/open proof check

Open:

```text
crab://site
```

Run the site flow only when you intentionally want a mutating paid test:

```text
Prepare site
Confirm ROC hold
Store root HTML
Create site
Open returned crab://site_name
Open Site Manifest
```

Expected:

```text
Site root uses an HTML/document CID, not an image CID.
Site creation returns a named crab:// URL.
Named site resolves.
Rendered site appears.
Site Manifest proof/details remain available.
```

Failure if:

```text
Image CID is accepted as root HTML without guard.
Site creation happens silently.
Manifest proof disappears.
```

---

## 16. Omnibox flow

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
crab [Tab] profile
crab [Tab] article
crab [Tab] video
crab [Tab] stream
crab [Tab] podcast
crab [Tab] thedustyonion6
crab [Tab] 2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Expected:

```text
A CrabLink full-tab page opens.
Address bar contains normalized crab:// URL.
Resolution goes through the local gateway or the local workspace module.
```

---

## 17. Failure behavior

Stop the RustyOnions gateway and refresh a CrabLink page.

Expected:

```text
Clear error panel.
No blank screen.
No unhandled exception.
No fake status.
Popup shows offline/failed state.
Local creator pages still load because they do not require backend truth to display local drafts.
```

Restart gateway and click Refresh.

Expected:

```text
Gateway-backed pages resolve again.
```

---

## 18. Security regressions to watch

Fail the manual check if any of these appear:

```text
Silent ROC spend.
Fake receipt.
Fake balance.
Fake b3 CID.
Fake profile publication.
Fake username ownership.
Fake REP/MOD score.
Fake video upload.
Fake live stream.
Fake podcast publication.
Direct ron-ledger call.
Direct svc-storage call from extension.
Direct svc-index call from extension.
Direct svc-wallet call that bypasses public gateway route.
Old crab://b3/<hash> UX.
Broad Chrome permissions.
Untrusted site HTML running extension-privileged code.
Private key, seed phrase, or long-lived uncapped spend authority stored in chrome.storage.local.
page-local-route-mode.js reintroduced.
```

---

## 19. Current product proof freeze

Do not expand into backend `.post`, `.comment`, `.article`, `.video`, `.stream`, or `.podcast` until these remain green after a fresh stack restart:

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

crab://article / crab://video / crab://stream / crab://podcast
→ local creator workspace opens
→ no stale previous workspace
→ no fake backend publication
→ no ROC mutation
```

---

## 20. Completion note

Current NEXT_LEVEL product-proof slice is considered green only when:

```text
scripts/check-chrome.sh passes
scripts/package-chrome.sh passes
scripts/smoke-local-gateway.sh passes
crab://thedustyonion6 renders
known-good image assets resolve
site creator proof toolbar appears
Site Manifest remains available
article/video/stream/podcast local pages switch correctly
no page-local-route-mode.js regression is present
no silent spend/direct internal service calls are introduced
```

---

## 21. Recommended next implementation order

After this checklist is green:

```text
1. Improve visual polish of the four local creator workspaces.
2. Add a small docs page explaining local creator routes and truth boundaries.
3. Add backend DTO/parser foundations for .post before .comment or .article.
4. Add media-lite DTO planning for .video/.music only after text primitives are stable.
5. Keep all backend publication claims feature-gated and route-contract tested.
```

````

Run after pasting:

```bash
cd /Users/mymac/Desktop/crablink
chmod +x scripts/check-chrome.sh scripts/make_codebundle.sh scripts/package-chrome.sh
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
````

This batch intentionally avoids touching `page.js` or the four working creator-page modules.
