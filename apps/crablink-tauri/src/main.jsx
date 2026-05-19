/**
 * RO:WHAT — Tauri Vite entry that mounts the copied CrabLink React shell.
 * RO:WHY — Restores the proven route-owned React frontend inside the native Tauri host.
 * RO:INTERACTS — app/main.jsx copied from extensions/chrome/src/app/main.jsx.
 * RO:INVARIANTS — React remains display/user intent only; backend truth stays behind svc-gateway/Tauri commands.
 * RO:SECURITY — no private keys, wallet truth, ledger truth, fake receipts, or silent spend here.
 */

import './app/main.jsx';
