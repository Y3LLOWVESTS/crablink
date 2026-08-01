//! Starts the CrabLink Android Tauri application.
//! Application setup and command registration remain in the library.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    crablink_android_lib::run();
}
