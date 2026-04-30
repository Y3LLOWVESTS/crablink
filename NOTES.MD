### BEGIN NOTE - APRIL 29 2026 - 23:00 CST


````markdown
# CrabLink / RustyOnions WEB3_2 Carryover Notes — Chrome Extension + Passport Next Steps

## 0. Current checkpoint

We created the separate browser-client repo:

```text
crablink
````

GitHub repo:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

Product naming decisions:

```text
- Repo: crablink
- Future full browser: CrabLink
- Browser extensions: CrabLink Extension
- First extension target: Chrome
```

The repo is intentionally separate from the RustyOnions core repo. This is the right boundary. RustyOnions remains the backend/substrate/value-plane repo. CrabLink is the browser-client repo.

The current extension is a thin browser client. It is not a wallet, not a ledger, not storage, not index, and not a backend service.

Current high-level purpose:

```text
CrabLink Extension for Chrome lets normal browser users interact with RustyOnions crab:// links, b3 asset pages, and future RON Passport / ROC flows through svc-gateway.
```

The extension must remain gateway-only. It should not call internal services directly.

---

## 1. Current repo scaffold

The repo scaffold currently includes:

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
.gitignore
CODEBUNDLE_CHROME_EXTENSION.md

assets/
  logo.png

docs/
  CHROME_EXTENSION_BLUEPRINT.md
  EXTENSION_SECURITY_MODEL.md
  CRAB_URL_UX.md
  BACKEND_ROUTE_CONTRACTS.md
  FUTURE_BROWSER_PLAN.md

extensions/
  chrome/
    manifest.json
    README.md

    docs/
      BLUEPRINT.md

    src/
      background.js
      content.js
      popup.html
      popup.js
      options.html
      options.js
      styles.css
      ronClient.js
      storage.js
      crab.js

    assets/
      icons/
        logo.png
        icon16.png
        icon32.png
        icon48.png
        icon128.png

    test/
      manual-checklist.md
      fixtures/
        asset-page.sample.json
        site-page.sample.json
        problem.not-found.json
        problem.policy-denied.json

  firefox/
    README.md
    PLACEHOLDER.md

  edge/
    README.md
    PLACEHOLDER.md

  safari/
    README.md
    PLACEHOLDER.md

shared/
  js/
    crab.js
    ronClient.js
    storageSchema.js
    errors.js
    ids.js

  schemas/
    asset-page.schema.json
    site-page.schema.json
    problem.schema.json
    extension-settings.schema.json

  fixtures/
    asset-page.sample.json
    site-page.sample.json
    problem.not-found.json
    problem.policy-denied.json

browser/
  README.md
  FUTURE.md

scripts/
  check-chrome.sh
  package-chrome.sh
  smoke-local-gateway.sh
  make_codebundle.sh

tools/
  README.md
```

Important note: the user may have named the codebundle generator:

```text
scripts/make_codebundle.sh
```

not the earlier name:

```text
scripts/make_chrome_codebundle.sh
```

Use the current repo file name.

---

## 2. Current extension state

The Chrome extension loads successfully from:

```text
extensions/chrome
```

The popup renders successfully in Chrome.

Current visible UI includes:

```text
- CrabLink logo
- CrabLink title
- RustyOnions browser client subtitle
- online/offline badge
- gateway URL display
- passport label display
- wallet label display
- Check Node button
- Settings button
- crab:// / b3 CID / raw hash input
- default asset kind selector
- Resolve button
- Clear button
- safety notes
```

The extension currently shows offline when the gateway is not running, which is expected. It tries to hit:

```text
http://127.0.0.1:8090/healthz
```

Current behavior verified:

```text
Extension loads:       yes
Popup renders:         yes
Settings load:         yes
Health check fires:    yes
Offline error displays: yes
Logo transparency:     fixed
```

The transparent logo issue was resolved using a background-removal tool. The logo now looks clean on the dark header.

---

## 3. Current important files and what they do

### `extensions/chrome/manifest.json`

Chrome Manifest V3 file. Current permissions should remain minimal:

```text
storage
activeTab
```

Current host permissions should remain local gateway only:

```text
http://127.0.0.1:*/*
http://localhost:*/*
```

Do not add broad permissions unless absolutely necessary.

Avoid for now:

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

### `extensions/chrome/src/storage.js`

Owns durable extension settings.

Current settings include roughly:

```text
schemaVersion
gatewayUrl
passportSubject
walletAccount
authToken
requireSpendConfirm
devMode
requestTimeoutMs
lastCrabUrl
recentReceipts
```

Important invariant: extension local storage is convenience state only. It is not backend truth.

### `extensions/chrome/src/crab.js`

Owns local lightweight input normalization for:

```text
raw 64-character hashes
b3:<64 lowercase hex>
crab://<64 lowercase hex>.<asset_kind>
crab://<site_name>
```

Important current public asset URL format:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Do not reintroduce the old public format:

```text
crab://b3/<hash>.<asset_kind>
```

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

### `extensions/chrome/src/ronClient.js`

Centralized HTTP client for gateway calls.

Important invariant: all backend HTTP calls from the extension must go through this file.

It currently supports calls like:

```text
GET /healthz
GET /readyz
GET /crab/resolve?url=...
GET /b3/:hash.kind
GET /sites/:name
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
```

Future passport and wallet calls should also be centralized here.

### `extensions/chrome/src/popup.html` and `popup.js`

Own popup UI and behavior.

Current behavior:

```text
- load settings
- show gateway/passport/wallet labels
- check node health/readiness
- normalize crab/b3 input
- resolve asset or site through gateway
- render result card
- copy crab URL / b3 CID / JSON
```

### `extensions/chrome/src/options.html` and `options.js`

Own settings UI and settings validation.

Current settings page includes:

```text
gateway URL
request timeout
passport subject label
wallet account label
dev bearer/cap token
require spend confirmation
dev mode
test gateway
clear token
save/reset
```

### `extensions/chrome/src/styles.css`

Owns the popup/options visual style.

Logo styling exists through:

```css
.brand-row
.brand-logo
```

The logo now appears cleanly on the dark header.

### `extensions/chrome/docs/BLUEPRINT.md`

This is the Chrome extension local blueprint. It defines the extension’s hard rules:

```text
thin client only
gateway-only backend target
no private-key custody in MVP
no silent ROC spending
no fake receipts
no direct ledger/wallet/storage/index/internal service calls
minimal permissions
explicit paid-action prompts
backend-derived truth only
```

---

## 4. Codebundle workflow

We added a codebundle generator for the Chrome extension. Use it before asking AI to review or patch the extension.

Command:

```bash
scripts/make_codebundle.sh
```

It generates:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

The script was updated to use four-backtick fences so nested Markdown code blocks render correctly.

Normal check workflow:

```bash
scripts/check-chrome.sh
scripts/make_codebundle.sh
git status
```

Commit workflow after changes:

```bash
git add CODEBUNDLE_CHROME_EXTENSION.md <changed files>
git commit -m "<message>"
git push
```

---

## 5. Current visual/branding state

Logo is now in at least:

```text
assets/logo.png
extensions/chrome/assets/icons/logo.png
extensions/chrome/assets/icons/icon16.png
extensions/chrome/assets/icons/icon32.png
extensions/chrome/assets/icons/icon48.png
extensions/chrome/assets/icons/icon128.png
```

README can embed the repo logo with:

```markdown
<p align="center">
  <img src="assets/logo.png" alt="CrabLink logo" width="140" />
</p>
```

The logo looks clean in the extension header now.

---

## 6. Critical invariants for next work

These are the rules the next instance must preserve.

### 6.1 Extension boundary invariants

```text
- The extension is a thin client.
- The extension calls svc-gateway public routes only.
- The extension does not call svc-passport directly.
- The extension does not call svc-wallet directly.
- The extension does not call ron-ledger directly.
- The extension does not call svc-storage directly.
- The extension does not call svc-index directly.
- The extension does not call omnigate directly unless the gateway contract explicitly says otherwise. Prefer gateway only.
- The extension displays backend truth; it does not invent backend truth.
```

### 6.2 Wallet / ROC invariants

```text
- No silent ROC spending.
- No fake balances.
- No fake receipts.
- No local ledger truth.
- No local wallet truth.
- No hidden hold/capture/release.
- No paid action without explicit confirmation.
- No direct economic mutation outside backend wallet/ledger path.
```

The extension may display a ROC balance returned by the backend, but it must label it as backend-derived and should show the source/status.

### 6.3 Passport invariants

```text
- Passports are identities, not wallets.
- A passport may link to a wallet account, but it is not itself wallet spend authority.
- Alt passports must not automatically inherit main wallet authority.
- Persistent private keys should not be introduced casually.
- If local passport private keys are added later, that needs a separate secure design.
- MVP can support dev/local passport bootstrap without seed phrase UX.
```

### 6.4 Capability invariants

```text
- Capabilities fail closed.
- No ambient authority.
- No long-lived uncapped spend authority stored in Chrome local storage.
- Tokens must be redacted from logs/errors/UI.
- Dev token field is local-development only.
```

### 6.5 URL/content invariants

```text
Internal content ID: b3:<64 lowercase hex>
Public asset URL:   crab://<64 lowercase hex>.<asset_kind>
Public site URL:    crab://<site_name>
```

Do not use:

```text
crab://b3/<hash>.<asset_kind>
```

---

## 7. Recommended next major focus: Passport bootstrap in CrabLink

The next session should focus on adding the **RON Passport bootstrap UX** to the Chrome extension.

User’s product goal:

```text
When the user opens CrabLink:
1. If a passport is already configured/loaded, show it.
2. If no passport exists, offer to create one.
3. After passport creation, automatically load/display the linked ROC balance.
4. New users should receive a small starter ROC balance before they earn more.
```

Important architectural refinement:

```text
The extension should not call svc-passport directly.
The extension should call svc-gateway routes that expose a public identity/passport bootstrap contract.
svc-gateway/omnigate/backend may then talk to svc-passport and svc-wallet internally.
```

This keeps the extension’s security boundary clean.

---

## 8. Passport UX concept

### 8.1 Popup behavior

On popup load:

```text
load settings
check gateway health/ready
check identity state
if passport exists:
  show passport card
  show wallet account
  load ROC balance
else:
  show “Create RON Passport” card
```

Suggested visible states:

```text
Identity: Not set
Identity: Creating...
Identity: Ready
Identity: Error
Wallet: Not linked
Wallet: Linked
ROC: Loading...
ROC: <balance> ROC
```

### 8.2 Settings behavior

Options page should eventually include:

```text
Passport section:
- current passport subject
- current wallet account
- create/reset dev passport button
- refresh identity button
- clear local identity labels button

Wallet section:
- load balance
- show account
- show last receipt/last update
```

### 8.3 First-run flow

Suggested first-run flow:

```text
1. User opens popup.
2. Extension detects no passportSubject or walletAccount.
3. Popup shows a first-run card:
   “Create your local RON Passport”
4. User clicks Create.
5. Extension calls gateway bootstrap route.
6. Backend creates/returns passport subject and linked wallet account.
7. Backend optionally issues starter ROC through the proper wallet/ledger path.
8. Extension saves only safe labels:
   passportSubject
   walletAccount
9. Extension fetches balance.
10. Popup shows:
   Passport ready
   Wallet account
   ROC balance
```

Important: for MVP, this can be a dev/local bootstrap flow. Do not pretend it is production-grade key custody unless backend supports it.

---

## 9. Backend route contracts needed for Passport MVP

The next instance should decide the exact backend route shape. Recommended route family through `svc-gateway`:

```text
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
```

Alternative route names:

```text
GET  /passport/me
POST /passport/bootstrap
GET  /wallet/balance?account=<account>
```

Use whichever is easiest to add consistently to `svc-gateway` and backend contracts later.

Recommended clean contract:

### `GET /identity/me`

Purpose:

```text
Return current identity context from configured headers/token.
```

Request headers from extension:

```text
x-correlation-id
Authorization: Bearer <dev token>          optional dev mode
x-ron-passport: <passport subject>         optional
x-ron-wallet-account: <wallet account>     optional
```

Possible success response:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Dev Passport",
    "created_at": "2026-04-29T00:00:00Z"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  }
}
```

If no identity:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": null,
  "wallet": null,
  "capabilities": {}
}
```

### `POST /identity/passport/bootstrap`

Purpose:

```text
Create or return a local/dev RON Passport identity and linked wallet account.
```

Request body:

```json
{
  "kind": "main",
  "display_name": "Local Passport",
  "create_wallet": true,
  "starter_grant": true
}
```

Possible response:

```json
{
  "schema": "crablink.identity.bootstrap.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Passport",
    "created_at": "2026-04-29T00:00:00Z"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true
  },
  "starter_grant": {
    "issued": true,
    "amount_minor_units": 1000,
    "receipt_id": "receipt_..."
  }
}
```

Important backend invariant:

```text
Starter ROC grant must be issued through svc-wallet → ron-ledger.
The extension must not fake a grant.
```

### `GET /wallet/:account/balance`

Purpose:

```text
Return backend-derived wallet balance.
```

Possible response:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": 1000,
  "held_minor_units": 0,
  "display": "10.00 ROC",
  "as_of": "2026-04-29T00:00:00Z"
}
```

If minor units are integer, display can be computed either by backend or extension from explicit decimals, but do not use floating-point money math for truth. The extension may format a string for UI but backend integer minor units are canonical.

---

## 10. Extension files likely needed for next batch

Likely files to update:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/BLUEPRINT.md
shared/schemas/extension-settings.schema.json
shared/schemas/problem.schema.json
```

Possibly add new shared schemas:

```text
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

Possibly add new fixtures:

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json

extensions/chrome/test/fixtures/identity-me.empty.sample.json
extensions/chrome/test/fixtures/identity-me.ready.sample.json
extensions/chrome/test/fixtures/passport-bootstrap.sample.json
extensions/chrome/test/fixtures/wallet-balance.sample.json
```

---

## 11. Extension-side storage changes recommended

Add safe identity/balance convenience fields:

```text
identityStatus
passportSubject
passportDisplayName
passportKind
walletAccount
lastBalanceDisplay
lastBalanceAvailableMinorUnits
lastBalanceHeldMinorUnits
lastBalanceAsOf
lastIdentityRefreshAt
```

Do not store:

```text
private keys
seed phrases
wallet private keys
raw spend authority
long-lived production bearer tokens
ledger truth
unverified balance truth
```

Balance fields in local storage must be treated as UI cache only. The UI should say something like:

```text
Last known balance
```

unless freshly loaded from the backend.

---

## 12. Extension-side RonClient changes recommended

Add methods:

```javascript
async getIdentityMe()
async bootstrapPassport(body)
async getWalletBalance(account)
```

All through `RonClient.request`.

Example route choices:

```javascript
getIdentityMe() {
  return this.request('/identity/me', { label: 'Identity status' });
}

bootstrapPassport(body) {
  return this.request('/identity/passport/bootstrap', {
    method: 'POST',
    body,
    label: 'Passport bootstrap',
    mutation: true
  });
}

getWalletBalance(account) {
  return this.request(`/wallet/${encodeURIComponent(account)}/balance`, {
    label: 'Wallet balance'
  });
}
```

Important: `bootstrapPassport` is a mutation and should attach `Idempotency-Key`.

---

## 13. Popup UI additions recommended

Add a new card near the top, probably after gateway status:

```text
Identity & ROC
```

When no passport:

```text
No RON Passport loaded.
Create a local passport to use CrabLink.
[Create RON Passport]
```

When ready:

```text
Passport: passport:main:dev
Wallet: acct_dev
ROC Balance: 10.00 ROC
[Refresh Balance]
```

Safety note:

```text
This extension stores identity labels only. Wallet and balance truth come from RustyOnions.
```

Potential popup sections:

```text
- Gateway card
- Identity & ROC card
- Crab resolver card
- Result card
- Safety card
```

---

## 14. Options UI additions recommended

Add a “Passport / Wallet” section:

```text
Current passport subject
Current wallet account
Passport display name
Create local passport
Refresh identity
Refresh balance
Clear local identity labels
```

The “clear local identity labels” button should only clear extension-local fields. It should not revoke the backend passport.

A real revoke/delete flow must be designed separately and should require explicit confirmation.

---

## 15. Starter ROC grant idea

User wants new users to receive a small amount of ROC before they can earn more.

Recommended framing:

```text
Starter ROC Grant
```

Purpose:

```text
Let a new local user test storage, site launch, image upload, and paid access flows before earning mechanisms are finalized.
```

Rules:

```text
- Grant must be backend-issued through svc-wallet.
- Grant must be auditable in ron-ledger.
- Grant must have deterministic receipt.
- Grant amount must be config-driven, not hardcoded in the extension.
- Extension only displays the result.
```

Suggested backend config later:

```toml
[starter_grant]
enabled = true
amount_minor_units = 1000
max_grants_per_passport = 1
max_grants_per_device_hint = 1
issuer_account = "acct_system_faucet"
```

Security concerns:

```text
- Faucet abuse
- Duplicate passport creation
- Sybil abuse
- Dev-only vs beta vs production grant policy
```

For early beta, it is acceptable to keep this as dev/local/testnet behavior.

Suggested UI wording:

```text
Starter grant available
Create your local RON Passport and receive starter ROC for testing.
```

Do not say “free money” or imply external value.

---

## 16. Future earning ideas, not immediate blockers

The user is still deciding how users earn ROC.

Candidate earning sources mentioned:

```text
- leaving comments
- performing moderation tasks
- relaying assets
- sharing bandwidth
- pinning/storage contribution
- serving popular content
- curation work
```

Recommended future design direction:

```text
ron-accounting records contribution events.
svc-rewarder consumes sealed accounting/policy signals.
svc-rewarder plans deterministic payouts.
svc-wallet commits reward issuance/transfer.
ron-ledger remains durable truth.
```

Do not implement earning directly in the extension.

The extension can later show:

```text
Earn ROC
- Run a node
- Pin content
- Moderate queue
- Curate assets
- Relay bandwidth
```

But actual reward logic belongs in backend accounting/rewarder/wallet.

---

## 17. Important caution for passport creation in Chrome

The user wants to create a passport in the extension. This needs careful staging.

There are two possible implementation levels:

### Level A — Dev/bootstrap identity labels only

This is safest for the next session.

```text
Backend creates or returns a dev/local passport subject and wallet account.
Extension stores subject/account labels.
No private key custody in Chrome.
No seed phrase.
No local signing.
```

This is consistent with current MVP safety.

### Level B — Real local persistent passport keys in extension

This is future work and requires a serious security design.

Would need decisions about:

```text
- WebCrypto key generation
- extractable vs non-extractable keys
- export/recovery UX
- password protection
- encrypted backup
- Chrome storage limitations
- loss/recovery behavior
- multi-device sync policy
- phishing/extension compromise threat model
```

Do not jump to Level B unless explicitly designing passport key custody.

Recommended next session path:

```text
Build Level A first.
Make the UI/product flow real.
Keep key custody backend/local-dev for now.
Later design Level B as a separate security milestone.
```

---

## 18. Manual testing goals for next session

After passport batch, manual checklist should include:

```text
- Extension loads unpacked.
- Popup opens with no console errors.
- Gateway offline state still works.
- Gateway online state still works.
- No passport state displays first-run card.
- Create passport button calls gateway bootstrap route.
- Bootstrap response saves passport subject and wallet account.
- Balance loads after passport creation.
- Refresh balance works.
- Clear local identity labels works.
- No private key or seed phrase fields exist.
- No token appears in visible error output.
- Mutating bootstrap call uses Idempotency-Key.
- Backend errors display clearly.
- scripts/check-chrome.sh passes.
- scripts/make_codebundle.sh regenerates bundle.
```

---

## 19. Likely first batch for next session

Recommended Batch 2 for CrabLink:

```text
Batch 2 — Passport Bootstrap UI + Client Methods
```

Files to update:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/BLUEPRINT.md
shared/schemas/extension-settings.schema.json
```

Files to possibly add:

```text
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json

shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
```

Do not modify backend Rust crates from the CrabLink repo unless the user switches back to RustyOnions.

If backend routes do not exist yet, extension should fail gracefully with helpful messages.

---

## 20. Suggested UI copy

No passport state:

```text
Create your RON Passport
CrabLink needs a local RON Passport label before it can show wallet and ROC status.
```

Button:

```text
Create Passport
```

After creation:

```text
Passport Ready
Your passport and linked wallet were loaded from RustyOnions.
```

Balance:

```text
ROC Balance
Backend-derived balance from your configured RustyOnions gateway.
```

Safety note:

```text
CrabLink stores labels only. Wallet truth and receipts come from RustyOnions.
```

Starter grant:

```text
Starter ROC
A small test grant may be issued by the local gateway so you can try paid RustyOnions features.
```

---

## 21. Git workflow reminder

After next batch:

```bash
scripts/check-chrome.sh
scripts/make_codebundle.sh
git status
```

Commit example:

```bash
git add CODEBUNDLE_CHROME_EXTENSION.md \
  extensions/chrome/src/storage.js \
  extensions/chrome/src/ronClient.js \
  extensions/chrome/src/popup.html \
  extensions/chrome/src/popup.js \
  extensions/chrome/src/options.html \
  extensions/chrome/src/options.js \
  extensions/chrome/src/styles.css \
  extensions/chrome/test/manual-checklist.md \
  extensions/chrome/docs/BLUEPRINT.md \
  shared/schemas/extension-settings.schema.json

git commit -m "Add passport bootstrap UI scaffolding"
git push
```

If new schemas/fixtures are added, include them in the commit too.

---

## 22. What to tell the next instance

Start next session with:

```text
We are working in the separate crablink repo, not RustyOnions core. CrabLink is the browser-client repo for RustyOnions. Chrome extension is first. The extension already loads in Chrome, has the CrabLink logo, gateway health checks, settings, crab/b3 input normalization, and resolver UI. We need the next batch: Passport bootstrap + ROC balance display.

Important: Preserve the extension blueprint invariants. The extension is gateway-only. It must not call svc-passport, svc-wallet, ron-ledger, svc-storage, svc-index, or omnigate directly. Add frontend client methods and UI for identity/passport bootstrap through proposed svc-gateway routes. Store only safe labels locally. Do not add private key custody or seed phrase UX yet. Starter ROC must be backend-issued; the extension only displays backend-derived balance and receipts.
```

Attach or paste:

```text
CODEBUNDLE_CHROME_EXTENSION.md
extensions/chrome/docs/BLUEPRINT.md
README.md if relevant
```

Ask for:

```text
Full paste-ready files for Batch 2: Passport Bootstrap UI + ROC Balance Display.
```

---

## 23. Current strategic interpretation

The Chrome extension is becoming the first real user-facing proof that RustyOnions is more than infrastructure.

The product story is now:

```text
User installs CrabLink.
User connects to local RustyOnions gateway.
User creates or loads a RON Passport.
User sees a linked ROC wallet balance.
User opens crab:// links and b3 asset pages.
Later, user can upload/launch/consume paid content with explicit confirmation and receipts.
```

This is the correct path toward RON beta.

The extension should make the system feel real, but the backend must remain the source of truth.

```
```


### END NOTE - APRIL 29 2026 - 23:00 CST