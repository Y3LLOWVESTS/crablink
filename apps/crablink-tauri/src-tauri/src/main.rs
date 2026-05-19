//! RO:WHAT — Native entrypoint for the CrabLink Tauri app.
//! RO:WHY — Tauri-first client shell while Chrome remains proof/companion.
//! RO:INTERACTS — crablink_tauri_lib::run.
//! RO:INVARIANTS — no backend truth mutation here; no shell/eval/native escape hatch.
//! RO:SECURITY — secrets must not cross into React or logs.

fn main() {
    crablink_tauri_lib::run();
}
