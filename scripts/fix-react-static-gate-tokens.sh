#!/usr/bin/env bash
# RO:WHAT — Removes stale/static-check-forbidden tokens after the React paid-flow refactor.
# RO:WHY — Keeps strict static gates green without weakening wallet/site safety checks.
# RO:INTERACTS — ImagePublishFlow.jsx, siteClient.js, check-react-lane.sh, check-chrome.sh.
# RO:INVARIANTS — no silent ROC spend; strict wallet hold JSON; use x-ron-wallet-txid, not obsolete hold-txid.
# RO:SECURITY — removes obsolete paid-proof header alias and client-only diagnostic snake_case keys.
# RO:TEST — npm run build; scripts/check-react-lane.sh; scripts/check-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IMAGE_FLOW="$ROOT/extensions/chrome/src/pages/image/ImagePublishFlow.jsx"
SITE_CLIENT="$ROOT/extensions/chrome/src/shared/api/siteClient.js"

if [[ ! -f "$IMAGE_FLOW" ]]; then
  echo "error: missing $IMAGE_FLOW"
  exit 1
fi

if [[ ! -f "$SITE_CLIENT" ]]; then
  echo "error: missing $SITE_CLIENT"
  exit 1
fi

python3 - "$IMAGE_FLOW" "$SITE_CLIENT" <<'PY'
from pathlib import Path
import sys

image_flow = Path(sys.argv[1])
site_client = Path(sys.argv[2])

image_text = image_flow.read_text()

image_text = image_text.replace("ui_preview_request:", "uiPreviewRequest:")
image_text = image_text.replace("strict_api_request_sent_to_wallet:", "strictWalletApiRequest:")
image_text = image_text.replace("strict_api_request:", "strictApiRequest:")
image_text = image_text.replace("api_request:", "walletApiRequest:")

site_text = site_client.read_text()
site_text = site_text.replace("      headers['x-ron-wallet-hold-txid'] = proof.txid;\n", "")

image_flow.write_text(image_text)
site_client.write_text(site_text)
PY

if grep -q "ui_preview_request:" "$IMAGE_FLOW"; then
  echo "error: ui_preview_request: still present in ImagePublishFlow.jsx"
  exit 1
fi

if grep -q "api_request:" "$IMAGE_FLOW"; then
  echo "error: api_request: still present in ImagePublishFlow.jsx"
  exit 1
fi

if grep -q "x-ron-wallet-hold-txid" "$SITE_CLIENT"; then
  echo "error: obsolete x-ron-wallet-hold-txid still present in siteClient.js"
  exit 1
fi

echo "static gate token cleanup complete"