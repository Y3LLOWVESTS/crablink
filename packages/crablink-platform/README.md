# @crablink/platform

Adapter contracts and implementations for CrabLink platforms.

- `contracts/` defines platform-neutral ports.
- `chrome/` wraps Chrome extension APIs.
- `tauri/` wraps Tauri invoke APIs.
- `memory/` supports tests and static previews.

Shared React code should depend on these contracts rather than importing platform APIs directly.
