//! RO:WHAT — Declares the CrabLink TV native command modules.
//! RO:WHY — Keeps the TV command registry separate from the desktop registry.
//! RO:INTERACTS — lib.rs invoke handler.
//! RO:INVARIANTS — diagnostics/settings only in the host scaffold phase.

pub(crate) mod diagnostics;
pub(crate) mod settings;
