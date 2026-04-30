
## `extensions/chrome/test/manual-checklist.md`

````markdown
# CrabLink Extension for Chrome Manual Checklist

## Load extension

- Open `chrome://extensions`.
- Enable Developer Mode.
- Click "Load unpacked".
- Select `extensions/chrome`.

## Settings

- Open extension options.
- Confirm gateway URL defaults to `http://127.0.0.1:8090`.
- Confirm passport and wallet labels are empty on a fresh reset.
- Save settings.
- Reopen popup and confirm settings appear.

## Backend dev stack

From the RustyOnions repo root, keep this running in a terminal:

```bash
scripts/web3_crablink_dev_stack.sh
````

Expected stack:

```text
svc-index    http://127.0.0.1:5304/healthz
svc-storage  http://127.0.0.1:5303/healthz
omnigate     http://127.0.0.1:9090/healthz
svc-gateway  http://127.0.0.1:8090/healthz
```

Expected smoke ending:

```text
WEB3 identity stack smoke passed
CrabLink dev stack is online
```

## Popup online checks

* Open the popup.
* Confirm status badge shows `ONLINE`.
* Confirm gateway displays `http://127.0.0.1:8090`.
* Click "Check Node".
* Confirm gateway remains online.
* Click "Check Passport".
* Confirm passport subject is loaded.
* Click "Refresh Balance".
* Confirm balance is loaded from backend response.

## Route diagnostics

* Click "Run Diagnostics".
* Confirm these read-only routes pass:

  * `GET /healthz`
  * `GET /readyz`
  * `GET /identity/me`
  * `GET /wallet/:account/balance`
  * `GET /b3/<sample>.image`
  * `GET /crab/resolve?url=crab://<sample>.image`
* Confirm `POST /identity/passport/bootstrap` is skipped by diagnostics.
* Confirm the skip is intentional because bootstrap can become a real mutation route later.

## Passport bootstrap checks

* Open the popup with no saved passport label.
* Confirm the RON Passport card says a passport is needed.
* Click "Check Passport".
* If backend routes are not implemented, confirm the UI shows a warning, not a crash.
* When gateway exposes `GET /identity/me`, confirm the extension loads:

  * passport subject
  * wallet account, when available
  * last identity check timestamp
* When gateway exposes `POST /identity/passport/bootstrap`, click "Create RON Passport".
* Confirm the extension stores only safe labels:

  * passport subject
  * wallet account
  * bootstrap receipt id, if returned
* Confirm no private key, seed phrase, or PIN is requested in this MVP.
* Confirm no local fake ROC balance appears.

## Wallet balance checks

* With a wallet account loaded, click "Refresh Balance".
* If backend routes are not implemented, confirm the UI shows a warning, not a crash.
* When gateway exposes `GET /wallet/:account/balance`, confirm the extension displays the backend-returned ROC balance.
* Confirm balance is displayed as backend truth and not calculated locally.

## Resolve checks

* Enter a valid `crab://<64hex>.image`.
* Confirm the extension calls the gateway and renders JSON.
* Enter an invalid hash.
* Confirm local validation rejects it cleanly.

## Safety checks

* Confirm no payment action happens automatically.
* Confirm no private key or seed phrase field exists.
* Confirm extension permissions are minimal.
* Confirm all backend calls go through the configured gateway.
* Confirm mutation requests include an idempotency key.

````

---

Run from the **`crablink` repo root**:

```bash
scripts/check-chrome.sh
````

Then reload the extension in `chrome://extensions` and click **Run Diagnostics**.
