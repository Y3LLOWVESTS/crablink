# CrabLink Extension for Chrome Manual Checklist

## Load extension

- Open `chrome://extensions`.
- Enable Developer Mode.
- Click "Load unpacked".
- Select `extensions/chrome`.

## Settings

- Open extension options.
- Confirm gateway URL defaults to `http://127.0.0.1:8090`.
- Save settings.
- Reopen popup and confirm settings appear.

## Backend checks

- Start RustyOnions product stack.
- Click "Check Node".
- Confirm badge shows online or degraded with a useful message.
- Stop backend.
- Click "Check Node".
- Confirm badge shows offline with a useful message.

## Resolve checks

- Enter a valid `crab://<64hex>.image`.
- Confirm the extension calls the gateway and renders JSON.
- Enter an invalid hash.
- Confirm local validation rejects it cleanly.

## Safety checks

- Confirm no payment action happens automatically.
- Confirm no private key or seed phrase field exists.
- Confirm extension permissions are minimal.
