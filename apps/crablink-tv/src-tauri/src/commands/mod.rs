//! RO:WHAT — Declares the CrabLink TV native command modules.
//! RO:WHY — Keeps the TV command registry separate from the desktop registry.
//! RO:INTERACTS — lib.rs invoke handler.
//! RO:INVARIANTS — diagnostics, settings, reviewed gateway profile, and pairing readiness only.

pub(crate) mod diagnostics;
pub(crate) mod gateway;
pub(crate) mod pairing;
pub(crate) mod settings;
