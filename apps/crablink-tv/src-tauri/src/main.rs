//! RO:WHAT — Starts the CrabLink TV Tauri application.
//! RO:WHY — Keeps the executable entry point thin and delegates setup to the library.
//! RO:INTERACTS — crablink_tv_lib::run.
//! RO:INVARIANTS — no application authority or command registration in main.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    crablink_tv_lib::run();
}
