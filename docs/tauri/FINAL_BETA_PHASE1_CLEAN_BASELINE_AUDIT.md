# FINAL_BETA Phase 1 — Clean Desktop Baseline Audit

<!-- FINAL_BETA_PHASE1_CLEAN_BASELINE_AUDIT_V1 -->

## Status

```text
FINAL_BETA_PHASE1_AUDIT_STATUS=GREEN
AUTOMATED_BASELINE_STATUS=GREEN
MANUAL_JOURNEY_STATUS=RECORDED_WITH_EXPLICIT_GAPS
SOURCE_PROBLEM_INVENTORY_STATUS=RECORDED
BLOCKER_REPAIR_STATUS=RELEASE_USERNAME_BOUNDARY_GREEN
RUNTIME_REDESIGN_ALLOWED=YES
NEXT_ACTION=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

This document records the existing CrabLink Desktop product before the
design-system and shell redesign phases begin.

Phase 1 must not be treated as visual redesign work.

---

## 1. Safety posture

Use only a disposable test profile for clear/reset testing.

Never write into this audit:

```text
PIN values
recovery phrase words
private keys
device keys
raw capabilities
wallet authority
unredacted bearer tokens
private Passport material
```

Allowed records:

```text
GREEN / RED / SKIPPED status
route names
visible labels
error classes
redacted screenshots
redacted observations
steps that failed
controls that were confusing
```

---

## 2. Required manual journey

The single Phase 1 runner records these steps:

| Step | Required observation |
|---|---|
| Clean first run | No stale identity, profile, balance, receipt, or dev user |
| Launch | App starts and accepts pointer/keyboard input |
| Username | Availability and selection are understandable |
| Passport creation | Local Passport creation succeeds or fails truthfully |
| Recovery ceremony | Native phrase display appears and no words enter React |
| PIN setup | Native PIN surface works without WebView PIN custody |
| Profile setup | Public profile fields save or skip coherently |
| Home handoff | Completion reaches the intended Home route |
| Restart | App startup posture is truthful |
| Unlock | PIN/lock behavior matches the intended policy |
| Own profile | User can reach the profile without manually reconstructing a route |
| Publish image | One real image publication path is recorded |
| Publish post/article | One textual publication path is recorded |
| Create site | One existing site creation path is recorded |
| Paid item | Explicit paid access path is recorded |
| Receipt | Backend-derived receipt display is recorded |
| Confirmed ROC | Backend-derived confirmed ROC display is recorded |
| Lock/unlock | Explicit lock and subsequent unlock are recorded |
| Clear/reset | Disposable test profile clears without leaving secret material |
| Pointer input | Buttons, inputs, scrollbars, and route controls respond reliably |

---

## 3. Known source baseline

These are expected baseline findings, not Phase 1 failures by themselves:

```text
HOME_ROUTE_SMOKE_DASHBOARD=PRESENT
HOME_MANUAL_REGRESSION_SEQUENCE=PRESENT
HOME_LOCAL_PROOF_DASHBOARD=PRESENT

PUBLIC_PROFILE_READ_ONLY=PRESENT
PUBLIC_PROFILE_PUBLICATION_TIMELINE=ABSENT
PUBLIC_PROFILE_LOCAL_FOLLOW_UI=ABSENT

NORMAL_SITE_HTML_IMPORT=PRESENT
NORMAL_SITE_ROOT_HTML_EDITOR=PRESENT
NORMAL_SITE_ARBITRARY_MARKUP_ENTRY=PRESENT

RUSTYONIONS_FEED_FACET=STUB_ONLY
RUSTYONIONS_GRAPH_FACET=STUB_ONLY
```

The local-following addendum supersedes network follower-graph requirements.

Phase 1 must not add a server-owned follower graph.

---

## 4. UI problem inventory categories

### Confusing labels

Record labels that require protocol or developer knowledge to understand.

Examples:

```text
unexplained proof terminology
unexplained migration terminology
unexplained capability terminology
unexplained receipt states
unexplained ROC confirmation states
```

### Dead ends

Record controls or pages that leave the user without a clear next action.

### Duplicate actions

Record multiple controls that appear to perform the same operation.

### Development surfaces in normal mode

Record:

```text
smoke dashboards
fixture controls
raw proof panels
test routes
developer-only buttons
migration panels
operator-only controls
```

### Raw JSON in normal mode

Record any page that presents unformatted JSON without an explicit
Developer/Advanced disclosure.

### Fake-looking fallbacks

Record placeholder avatars, mock identities, sample balances, synthetic
receipts, fake hashes, or other state that could be mistaken for truth.

### Style inconsistencies

Record:

```text
button shapes
button hierarchy
input styling
spacing
radius
card treatment
modal treatment
drawer treatment
empty states
error states
loading states
focus indication
```

Do not repair all style inconsistencies in Phase 1.

Phase 1 records them for Phase 2.

### Profile/onboarding handoff defects

Specifically confirm whether:

```text
profile creation follows onboarding automatically
own-profile navigation works without manual username entry
Home reflects the new identity
restart preserves only reviewed public/redacted state
unlock is required where policy requires it
```

### Pointer and keyboard defects

Confirm on at least:

```text
crab://home
crab://profile
crab://library
crab://receipts
one creation page
one form-heavy page
```

Test:

```text
single click
text-input focus
mouse-wheel scrolling
scrollbar dragging
scrollbar track click
keyboard Tab order
Enter/Space activation
window resize
```

---

## 5. Existing automated foundations reused

The Phase 1 runner reuses:

```text
scripts/check-crablink-tab-hit-testing-boundary.mjs
apps/crablink-tauri/scripts/onboarding_phase11a_desktop_automated_acceptance.sh
```

These automated checks do not replace the manual journey.

A source marker or automated test cannot prove:

```text
physical pointer reliability
native recovery-window usability
real keychain prompt behavior
clean-user comprehension
real visual coherence
paid-flow comprehension
```

---

## 6. Generated records

The runner may generate:

```text
docs/tauri/FINAL_BETA_PHASE1_SOURCE_INVENTORY.txt
docs/tauri/FINAL_BETA_PHASE1_MANUAL_RESULTS.md
```

The source inventory is diagnostic.

It may contain false positives and must not be treated as an automatic
requirement to remove every development term from source code.

The manual record must contain no secrets.

---

## 7. Phase 1 acceptance

Phase 1 can close only when the following are truthfully recorded:

```text
FINAL_BETA_PHASE1_CLEAN_BASELINE=GREEN
CLEAN_FIRST_RUN=RECORDED
RESTART_UNLOCK=RECORDED
PROFILE_HANDOFF=RECORDED
CONTENT_PUBLISH_BASELINE=RECORDED
PAID_RECEIPT_BASELINE=RECORDED
UI_PROBLEM_INVENTORY=COMPLETE
NEXT_PHASE=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

A RED journey step does not authorize a false Phase 1 green result.

Blocker defects must be repaired and the affected portion rerun.

Non-blocking style findings remain recorded for Phase 2.

---

## 8. Phase 1 Audit Closeout

<!-- FINAL_BETA_PHASE1E_AUDIT_CLOSEOUT_V1 -->

### Meaning of this closeout

```text
PHASE1_MEANING=AUDIT_COMPLETE_NOT_FINAL_PRODUCT_ACCEPTANCE
```

Phase 1 established and recorded the current desktop baseline before
visual-system work begins.

A Phase 1 green result does not claim that every final-beta feature is
implemented or that every route has final release acceptance.

Known gaps are explicitly carried into their dedicated phases.

### Acceptance evidence

```text
FINAL_BETA_PHASE1_CLEAN_BASELINE=GREEN

CLEAN_FIRST_RUN=RECORDED
CLEAN_FIRST_RUN_DETAIL=USER_CONFIRMED_GREEN

RESTART_UNLOCK=RECORDED
RESTART_UNLOCK_DETAIL=AUTOMATED_NATIVE_REGRESSIONS_GREEN
RESTART_UNLOCK_MANUAL_RETEST_THIS_RUN=NO

PROFILE_HANDOFF=RECORDED
PROFILE_HANDOFF_DETAIL=HOME_HANDOFF_GREEN_OWN_PROFILE_GAP_RECORDED
PROFILE_HANDOFF_FINAL_REPAIR_PHASE=FINAL_BETA_PHASE4

CONTENT_PUBLISH_BASELINE=RECORDED
CONTENT_PUBLISH_DETAIL=NOT_RETESTED_THIS_RUN
CONTENT_PUBLISH_FINAL_IMPLEMENTATION_PHASES=FINAL_BETA_PHASE6_THROUGH_PHASE10

PAID_RECEIPT_BASELINE=RECORDED
PAID_RECEIPT_DETAIL=NOT_RETESTED_THIS_RUN
PAID_RECEIPT_FINAL_STABILIZATION_PHASE=FINAL_BETA_PHASE17

UI_PROBLEM_INVENTORY=COMPLETE
UI_PROBLEM_INVENTORY_DETAIL=SOURCE_SCAN_AND_KNOWN_SURFACE_INVENTORY_RECORDED

RELEASE_USERNAME_BOUNDARY=FOCUSED_TESTS_GREEN
RELEASE_USERNAME_LOOKUP=PUBLIC_GATEWAY_PROFILE_READ
USERNAME_CLAIM_MUTATION=NO
USERNAME_OWNERSHIP_CONFIRMED=NO

NEXT_PHASE=FINAL_BETA_PHASE2_DESIGN_SYSTEM
```

### Confirmed baseline successes

```text
clean first-run onboarding
username entry
explicit development availability path
Passport creation
Home handoff
basic pointer and input response
automated onboarding source/model regression suite
native create/restart/status/root/clear regressions
tab hit-testing source boundary
release username availability focused Node tests
```

### Recorded product gaps

```text
Home remains a development-oriented proof dashboard.
Public profile remains read-only and lacks a publication timeline.
Own-profile handoff was not manually re-tested in this checkpoint.
Content publication paths were not manually re-tested in this checkpoint.
Paid access, receipt, and confirmed ROC paths were not manually re-tested.
Normal site creation still exposes HTML import and Root HTML editing.
Developer/test terminology remains widespread in source and some normal surfaces.
Visual tokens and component styles remain inconsistent.
```

These gaps are not erased by the Phase 1 green label.

They are the input to Phases 2 through 17.

### Verification tier for closeout

The separate Phase 1E verification should run only:

```text
focused username-availability Node tests
JavaScript syntax checks
one production Vite build
documentation marker checks
```

It must not run:

```text
Cargo
Tauri native build
optimized macOS app bundling
full onboarding acceptance
RustyOnions workspace checks
```

The native and release baseline was already freshly green during Phase 1B.

