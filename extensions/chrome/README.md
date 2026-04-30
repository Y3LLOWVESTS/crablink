# CrabLink Extension for Chrome

This is the first CrabLink browser extension.

## Load unpacked

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click "Load unpacked".
5. Select `extensions/chrome`.

## Default local gateway

```text
http://127.0.0.1:8090
```

## MVP behavior

- Configure local gateway URL in options.
- Check RustyOnions node health/readiness.
- Resolve `crab://` links through `svc-gateway`.
- View b3 asset and site route responses.
