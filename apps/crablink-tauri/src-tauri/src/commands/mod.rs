//! RO:WHAT — Command module registry for CrabLink Tauri.
//! RO:WHY — Keeps native bridge small, typed, allowlisted, and testable.
//! RO:INTERACTS — diagnostics, settings, health, resolve, identity, wallet, gateway, assets, media, stream.
//! RO:INVARIANTS — no run/execute/eval/shell/raw_* commands.
//! RO:SECURITY — commands must stay typed, bounded, redacted, allowlisted, and gateway-first.

pub mod assets;
pub mod diagnostics;
pub mod gateway;
pub mod health;
pub mod identity;
pub mod media;
pub mod resolve;
pub mod settings;
pub mod stream;
pub mod wallet;