//! RO:WHAT — Declares the CrabLink TV native command modules.
//! RO:WHY — Keeps the TV command registry separate from the desktop registry.
//! RO:INTERACTS — lib.rs invoke handler.
//! RO:INVARIANTS — asset manifest checks, catalog, diagnostics, settings, reviewed gateway profile, and pairing reads only.

pub(crate) mod asset_manifest;
pub(crate) mod catalog_read;
pub(crate) mod diagnostics;
pub(crate) mod gateway;
pub(crate) mod gateway_health;
pub(crate) mod pairing;
pub(crate) mod pairing_begin;
pub(crate) mod settings;
