
### BEGIN NOTE - JUNE 9 2026 - 16:30 CST

>HERE ARE THE NOTES REGARDING THE REFACTOR OF THE MAKE PAGE
>IT WAS A PRETTY LARGE REFACTOR PROJECT SO I REQUESTED THAT WE HAVE A DETAILED BREAKDOWN OF WHERE EVERYTHING IS AT SINCE THE FILE WAS A MONOLITH AT ALMOST 10K LOC

# CARRYOVER NOTES — CrabLink Tauri `crab://make` Page Refactor Map

Date: June 9, 2026
Status: Major Make page refactor plateau reached
Area: `apps/crablink-tauri/src/pages/make/`
Primary route: `crab://make`

## 0. TL;DR

The `crab://make` page has been successfully refactored from one oversized route file into a route orchestrator plus focused UI components, controller hooks, and local model/helper files.

The big win:

```text
MakePage.jsx
  before deep refactor: ~7k+ lines during earlier batches
  after Batch 3U:       ~1.9k lines

MakePreviewStudioChrome.jsx
  before preview refactor: ~2.9k lines
  after Batch 3T:          ~386 lines
```

The page is now much easier to navigate.

Current high-level architecture:

```text
MakePage.jsx
  route orchestrator / state hub / app integration

MakePageLayout.jsx
  route JSX shell / page layout / card wiring

useMakePageTimelineController.js
  Make page timeline, linked-media, local audio, undo/redo mutation controller

MakePreviewStudioChrome.jsx
  preview studio shell / chrome wrapper

useMakePreviewTimelineController.js
  preview timeline state, cursor, selection, playback, trim, drag controller

MakePreviewTimelineOverlay.jsx
  mini timeline overlay UI inside preview studio

MakePreviewAudioLane.jsx
  preview audio lane UI

MakeTimelineCard.jsx
  lower main timeline card UI

model/helper files
  pure local draft, timeline, audio, linked media, preview canvas, export, sequence helpers
```

Do not re-collapse this back into `MakePage.jsx`.

The current structure is good enough to move on to new work, but when returning to `crab://make`, use this file map first.

---

## 1. Non-negotiable architecture rules for `crab://make`

`crab://make` is a creator/editor page. It may help users compose local media, link draft references, preview content, and hand off a locally exported source into `crab://video`.

It must not become a backend truth authority.

### Must preserve

```text
React owns display and user intent.
Tauri Rust owns native privilege.
RustyOnions backend owns durable truth.
svc-wallet owns wallet mutation front door.
ron-ledger owns economic truth.
storage/index/gateway/omnigate do not mutate ledger truth.
```

### `crab://make` may do

```text
local preview
local draft editing
local clip arrangement
local audio timeline editing
local linked-media draft references
local source-handle handoff to video page
backend-derived receipt display
explicit paid/reuse preparation UI
verified display cache
bounded Tauri media export requests
```

### `crab://make` must not do

```text
fake CIDs
fake b3 truth
fake ROC balances
fake receipts
fake ownership
fake reuse rights
fake payout splits
silent spend
paid unlock from cache alone
raw wallet authority in React
private keys/seeds/capabilities in React state
external settlement
ROX/Solana/public bridge/staking/liquidity logic
QuickChain settlement logic
```

QuickChain is future work. Do not let QuickChain creep into Make page paid media, reuse fees, payouts, receipts, or minting until the internal ROC loop is proven.

---

## 2. Current key line counts after the refactor

Current reported line counts after Batch 3U:

```text
1916 src/pages/make/MakePage.jsx
 470 src/pages/make/MakePageLayout.jsx
 916 src/pages/make/useMakePageTimelineController.js
 386 src/pages/make/MakePreviewStudioChrome.jsx
1483 src/pages/make/useMakePreviewTimelineController.js
 341 src/pages/make/MakePreviewTimelineOverlay.jsx
 252 src/pages/make/MakePreviewLocalTimelineClip.jsx
 145 src/pages/make/MakePreviewLinkedVideoTimelineClip.jsx
 161 src/pages/make/MakePreviewMiniTimelineHeader.jsx
 371 src/pages/make/MakePreviewAudioLane.jsx
  58 src/pages/make/MakeLinkedVideoPaymentInspector.jsx
  90 src/pages/make/MakePreviewTimelineMarker.jsx
 109 src/pages/make/MakePreviewRecordControls.jsx
 214 src/pages/make/MakePreviewDrawer.jsx
 114 src/pages/make/MakeLinkedMediaComposerPopover.jsx
  54 src/pages/make/makeLocalFileModel.js
 269 src/pages/make/MakeTimelineCard.jsx
 251 src/pages/make/MakePreviewPlaybackLayer.jsx
 320 src/pages/make/makePreviewCanvasModel.js
 371 src/pages/make/makeSequenceModel.js
```

This is a solid plateau.

`MakePage.jsx` is still above the 1k ideal, but it is no longer dangerously oversized. The largest remaining file is `useMakePreviewTimelineController.js`, which is intentionally a cohesive controller extracted out of preview chrome. Later, it can be split into smaller hooks once preview/audio features stabilize.

---

## 3. File ownership map

### `MakePage.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePage.jsx
```

Current role:

```text
Route orchestrator
Top-level page state hub
App integration boundary
Draft/session lifecycle
Camera/screen/media stream lifecycle
Recording/export orchestration
Preview/canvas refs
Background/cutout/subject state
Sequence state
Export handoff state
Wires controller hooks into layout
```

Use this file when changing:

```text
top-level route behavior
page boot/load behavior
draft persistence
session plan persistence
camera/screen/mic startup and shutdown
recording countdown
recording start/stop
subject/background/cutout top-level state
export state wiring
Make → Video handoff wiring
which props get passed into MakePageLayout
which controller hooks own which page actions
```

Avoid putting these back into `MakePage.jsx`:

```text
timeline clip mutation details
audio track overlap/swap logic
preview timeline cursor drag math
mini timeline JSX
timeline bubble JSX
audio lane JSX
linked media popover JSX
pure model helpers
formatting helpers
large card JSX blocks
```

Mental model:

```text
MakePage.jsx should answer:
“What is the page state, and what system does each feature call?”

It should not answer:
“How does every timeline drag, audio overlap, linked clip trim, and preview bubble render?”
```

---

### `MakePageLayout.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePageLayout.jsx
```

Current role:

```text
Presentational route shell
Owns the main JSX layout for crab://make
Receives a large `view` prop from MakePage
Places cards, preview studio, command deck, timeline, project/handoff panels
```

Use this file when changing:

```text
page visual layout
card ordering
main columns/sections
where preview studio appears
where timeline card appears
where project/handoff/sequence review cards appear
page-level badges
page-level buttons that are already backed by callbacks from MakePage
```

Do not put business logic here.

Avoid:

```text
new useState
new useEffect
media stream logic
wallet/receipt logic
timeline mutation logic
audio mutation logic
Tauri command calls
backend calls
large helper functions
```

Mental model:

```text
MakePageLayout.jsx should be dumb display glue.
MakePage.jsx prepares the view model.
MakePageLayout.jsx renders it.
```

Potential future improvement:

```text
The `view` prop is large. That is acceptable for now because it keeps the refactor stable.
Later, split the page into section-specific view objects:
  previewView
  commandView
  timelineView
  projectView
  handoffView
```

Do not do that unless the page is being actively worked again.

---

### `useMakePageTimelineController.js`

Path:

```text
apps/crablink-tauri/src/pages/make/useMakePageTimelineController.js
```

Current role:

```text
Make page timeline mutation controller
Local clip mutation controller
Linked video/audio draft mutation controller
Local audio track mutation controller
Undo/redo timeline history controller
Timeline item order controller
Clip split/delete/move/reorder controller
```

Use this file when changing:

```text
add local timeline clips
remove local clips
clear clips
retake last clip
move selected clip
split clips at selected timeline time
delete selected timeline range
commit timeline item order
commit timeline clips
timeline undo/redo
timeline history snapshots
add linked video draft
remove linked video draft
update linked video draft timing
handle linked video preview ready
add linked audio draft
add local audio track files
remove audio tracks
update audio track volume
update audio track timing
resolve audio track overlap / slot swap
audio track object URL cleanup ownership
```

Important functions expected here:

```text
addTimelineClipsFromFiles
requestAddTimelineClip
removeClip
clearClips
retakeLastClip
moveSelectedClip
commitTimelineClips
commitTimelineItemOrder
updateClipTimelineById
updateSelectedClipTimeline
splitTimelineAt
deleteTimelineRange
captureTimelineHistory
undoTimeline
redoTimeline

addLinkedVideoDraft
removeLinkedVideoDraft
updateLinkedVideoDraftTiming
handleLinkedVideoPreviewReady

requestAddAudioTrack
addAudioTracksFromFiles
addLinkedAudioDraft
removeAudioTrack
updateAudioTrackVolume
updateAudioTrackTiming
```

Important invariants:

```text
All history snapshots are local editor history only.
Undo/redo must not create backend truth.
Linked video/audio drafts remain draft references.
Linked media reuse/payouts are not real until backend policy/wallet/receipt paths exist.
Local audio tracks are editor/export inputs, not ownership proof.
```

Likely future bugfix location:

```text
audio clip undo/redo
audio clip overlap resolution
audio clip slot swapping
audio clip track ordering
audio clip move/resize mutation finalization
linked video timing updates
timeline history correctness after audio edits
```

If audio undo/redo breaks again, start here.

---

### `MakePreviewStudioChrome.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewStudioChrome.jsx
```

Current role:

```text
Preview studio chrome component
Renders preview frame shell
Wires preview controller hook into preview UI
Owns small presentational wrapper around preview studio
Delegates timeline overlay/audio lane/record controls/drawers
```

Use this file when changing:

```text
preview studio shell layout
how preview controller outputs are wired to components
which preview subcomponents appear in the studio
high-level preview frame classes
top-level preview studio props
```

Avoid putting into this file:

```text
timeline cursor math
drag handlers
audio lane mutation details
linked video trim logic
large JSX for timeline bubbles
sequence playback logic
record controls JSX
drawer JSX
```

Mental model:

```text
MakePreviewStudioChrome.jsx is now a thin preview shell.
Do not let it become a second MakePage.jsx.
```

---

### `useMakePreviewTimelineController.js`

Path:

```text
apps/crablink-tauri/src/pages/make/useMakePreviewTimelineController.js
```

Current role:

```text
Preview timeline controller
Mini timeline state
Preview cursor/selection/range state
Preview playback state
Timeline zoom/tool state
Trim editor state
Selected audio/linked video state
Preview clip drag state
Linked video drag/trim state
Audio track drag/trim state
Linked media composer state
Timeline loop playback behavior
Preview video seek behavior
```

Use this file when changing:

```text
preview mini timeline cursor
I/O range selection
timeline selection loop playback
split-at-cursor UI behavior
delete-selected-range UI behavior
timeline play/pause behavior inside preview
timeline hover behavior
timeline zoom
timeline tool selection
trim editor toggling
preview clip drag
preview clip trim
linked video clip drag
linked video clip trim
audio track offset drag
audio track trim drag
linked media composer open/close/submit
selected audio track behavior
selected linked video behavior
```

Important functions/state expected here:

```text
timelinePreviewVideoRef
previewTimelineRailRef
timelineSelection
timelineZoom
timelineTool
trimEditorClipId
selectedTimelineMediaKind
selectedAudioTrackId
selectedLinkedVideoId
linkedVideoPreviewId
linkedMediaComposer
audioMoveDrag
audioTrimDrag
previewClipMoveDrag

beginTimelineCursorDrag
beginPreviewClipMoveDrag
beginPreviewTrimDrag
beginLinkedVideoMoveDrag
beginLinkedVideoTrimDrag
beginAudioTrackOffsetDrag
beginAudioTrackTrimDrag
handleTimelinePlayClick
seekTimelinePreviewVideo
splitAtTimelineSelection
deleteSelectedTimelineRange
openLinkedMediaComposer
closeLinkedMediaComposer
handleLinkedMediaComposerSubmit
```

Known concern:

```text
This file is currently large at ~1.5k lines.
That is acceptable as a temporary plateau because it pulled the complexity out of MakePreviewStudioChrome.
When we return to timeline/audio UX work, split this file into:
  useMakePreviewTimelineSelection.js
  useMakePreviewTimelinePlayback.js
  useMakePreviewClipDragController.js
  useMakePreviewAudioDragController.js
  useMakePreviewLinkedMediaComposer.js
```

Do not split it just for line count until we are actively fixing timeline/audio bugs.

---

### `MakePreviewTimelineOverlay.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewTimelineOverlay.jsx
```

Current role:

```text
Mini timeline overlay UI rendered inside the preview studio
Composes mini timeline header
Local clip timeline bubbles
Linked video timeline bubbles
Audio lane
Timeline marker
Linked payment inspector
```

Use this file when changing:

```text
preview mini timeline visual structure
where audio lane appears under mini timeline
how local/linked clip bubbles are arranged in the overlay
timeline marker placement
preview overlay toolbar layout
show/hide payment inspector area
```

Avoid putting here:

```text
drag math
timeline mutation logic
audio overlap logic
backend payment logic
reuse policy truth
```

Mental model:

```text
This file renders the timeline overlay.
The preview controller decides what it means.
The Make page timeline controller mutates the actual draft state.
```

---

### `MakePreviewMiniTimelineHeader.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewMiniTimelineHeader.jsx
```

Current role:

```text
Header/toolbar for the preview mini timeline
Timeline summary
Play controls
Zoom/tool controls
Split/delete/trim actions
```

Use this file when changing:

```text
small timeline toolbar buttons
timeline summary wording
preview timeline play button UI
cursor/select/trim tool buttons
split/delete button placement
zoom controls
```

Do not put timeline mutation logic here. It should call callbacks.

---

### `MakePreviewLocalTimelineClip.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewLocalTimelineClip.jsx
```

Current role:

```text
Preview mini timeline bubble for local clips
Local video/audio/image clip representation inside preview timeline
Local clip trim handles
Local clip drag surface
Local clip labels and timing plates
```

Use this file when changing:

```text
local clip bubble UI
local clip selection visual state
local clip trim handles
local clip drag handle affordance
local clip duration/trim labels
local clip thumbnail/timeline styling
```

Do not put global timeline ordering or history logic here.

---

### `MakePreviewLinkedVideoTimelineClip.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewLinkedVideoTimelineClip.jsx
```

Current role:

```text
Preview mini timeline bubble for linked video draft clips
Linked video clip trim handles
Linked video clip drag surface
Linked video labels/timing plates
```

Use this file when changing:

```text
linked video timeline bubble UI
linked video trim handles
linked video reuse/payment badge display
linked video clip selected/preview state
```

Important invariant:

```text
Linked video clips are draft references.
Do not treat linked video as fully imported local bytes unless backend/local export path explicitly supports that.
Do not fake reuse rights or payout splits.
```

---

### `MakePreviewAudioLane.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewAudioLane.jsx
```

Current role:

```text
Preview mini timeline audio lane UI
Local audio track bubble display
Linked audio draft display
Audio clip move/trim handles
Audio volume display/control hooks
```

Use this file when changing:

```text
audio lane visual layout
audio track bubbles
audio resize/pull handles
audio lane labels
audio selected/dragging visual state
audio preview buttons
audio volume controls
touchpad-friendly resize handles
```

If audio dragging looks buggy visually, start here.

If audio dragging mutates incorrectly, go to:

```text
useMakePreviewTimelineController.js
useMakePageTimelineController.js
makeAudioTimelineStateModel.js
```

Important distinction:

```text
MakePreviewAudioLane.jsx renders audio tracks.
useMakePreviewTimelineController.js manages pointer drag/trim interaction.
useMakePageTimelineController.js commits actual audio timing changes/history.
makeAudioTimelineStateModel.js resolves overlap/snapshot/history model behavior.
```

---

### `MakeLinkedVideoPaymentInspector.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeLinkedVideoPaymentInspector.jsx
```

Current role:

```text
Small display panel for linked video reuse/payment proof state
```

Use this file when changing:

```text
linked video reuse/payment display wording
receipt/proof summary display
warning labels around draft-only reuse
```

Important invariant:

```text
This is display-only unless backed by real backend quote/receipt/policy.
No fake ROC spend.
No fake reuse authorization.
No fake split payout.
```

---

### `MakePreviewTimelineMarker.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewTimelineMarker.jsx
```

Current role:

```text
Visual marker/playhead/range marker for preview timeline
```

Use this file when changing:

```text
timeline cursor UI
I/O marker UI
range highlight marker UI
playhead styling
```

Behavior lives in the preview controller.

---

### `MakePreviewRecordControls.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewRecordControls.jsx
```

Current role:

```text
Preview record/start/stop controls
Countdown and recording controls
Input readiness button display
```

Use this file when changing:

```text
record button UI
start/stop button text
disabled states
countdown display
recording elapsed display
input-ready display
```

Do not put recorder stream logic here.

Recording state is owned by `MakePage.jsx`.

---

### `MakePreviewDrawer.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewDrawer.jsx
```

Current role:

```text
Preview drawer shell
Mode/settings/effects drawers around the preview area
```

Use this file when changing:

```text
preview drawer layout
drawer tabs
drawer titles/eyebrows
drawer open/close UI
```

Do not put settings mutation details here unless it is simple callback wiring.

---

### `MakeLinkedMediaComposerPopover.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeLinkedMediaComposerPopover.jsx
```

Current role:

```text
Popover for adding linked video/audio draft references
```

Use this file when changing:

```text
paste linked video URL UI
paste linked audio URL UI
linked media title/note fields
reuse/payment explanatory text
popover placement
composer submit/cancel controls
```

Actual submit handling lives in:

```text
useMakePreviewTimelineController.js
```

Actual linked draft mutation lives in:

```text
useMakePageTimelineController.js
makeLinkedMediaModel.js
```

Important invariant:

```text
Adding linked media is not the same as paying, importing, proving reuse rights, or creating payout splits.
```

---

## 4. Main page cards and decks

### `MakeCommandDeck.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeCommandDeck.jsx
```

Current role:

```text
Top/main command buttons for Make page
```

Use this for:

```text
primary action button layout
record/start input command grouping
high-level page commands
```

---

### `MakeModeDeck.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeModeDeck.jsx
```

Current role:

```text
Mode selection deck
```

Use this for:

```text
mode buttons
camera/screen/podcast/video modes
mode selection visual UX
```

---

### `MakePresetDeck.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePresetDeck.jsx
```

Current role:

```text
Output/style preset deck
```

Use this for:

```text
preset selection buttons
preset display layout
preset badge styling
```

---

### `MakeCutoutCard.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeCutoutCard.jsx
```

Current role:

```text
Cutout/background/subject card
```

Use this for:

```text
software cutout controls
background image/video controls
subject transform controls
subject preview mode toggles
cutout readiness UI
```

The cutout model itself is not here; this is UI.

Related files:

```text
makePersonSegmentation.js
makeCompositor.js
makePreviewCanvasModel.js
MakePreviewOverlayWidgets.jsx
```

---

### `MakePrompterEditor.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePrompterEditor.jsx
```

Current role:

```text
Prompter script editor UI
```

Use this for:

```text
prompter text field
prompter run/pause UI
script editing UX
```

Prompter overlay display is in:

```text
MakePreviewOverlayWidgets.jsx
```

---

### `MakeSidePanel.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeSidePanel.jsx
```

Current role:

```text
Side panel card/auxiliary controls
```

Use this for:

```text
secondary make-page details
side information panels
```

---

### `MakeSequenceReviewCard.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeSequenceReviewCard.jsx
```

Current role:

```text
Sequence review/approval card
```

Use this for:

```text
review sequence UI
approve sequence UI
sequence status display
sequence playback summary
```

Sequence math/status helpers live in:

```text
makeSequenceModel.js
```

Sequence playback display layer lives in:

```text
MakePreviewPlaybackLayer.jsx
```

---

### `MakeProjectCard.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeProjectCard.jsx
```

Current role:

```text
Project/session/draft settings card
```

Use this for:

```text
title/description/project settings display
draft/session facts
project-level creator inputs
```

Draft normalization/persistence helpers are in:

```text
makeDraftModel.js
```

---

### `MakeHandoffCard.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeHandoffCard.jsx
```

Current role:

```text
Make → Video handoff/export card
```

Use this for:

```text
export approved sequence button
copy session plan
open video page
handoff status display
make export readiness display
local source handle display
```

Important invariant:

```text
This card may show local export/handoff readiness.
It must not show fake backend CID/crab URL/receipt.
The video page/mint path owns backend prepare/mint truth.
```

Related files:

```text
makeExportUiModel.js
src/shared/api/makeExportClient.js
src-tauri/src/media/make_export.rs
```

---

### `MakeTimelineCard.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeTimelineCard.jsx
```

Current role:

```text
Main lower timeline card
```

Use this for:

```text
main timeline card layout
timeline item order display
clip list display
basic timeline controls
```

Important caveat:

```text
This is still not the final full editor timeline architecture.
If we return to make editor UX, this may eventually split into:
  MakeVideoTimeline.jsx
  MakeAudioTimeline.jsx
  MakeTimelineToolbar.jsx
  MakeTimelineClipBubble.jsx
  MakeAudioTrackBubble.jsx
  MakeTimelineSelectionOverlay.jsx
```

For now, do not split unless adding/fixing timeline UX.

---

## 5. Model/helper file map

### `makeDraftModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
```

Owns:

```text
draft defaults
draft normalization
draft storage
session plan shaping
formatBytes
formatDurationMs
mode/preset lookup
recorder MIME selection
```

Use this for:

```text
draft fields
session persistence
session plan serialization
formatting bytes/durations
recorder MIME option selection
```

Do not add timeline drag logic here.

---

### `makeExportUiModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeExportUiModel.js
```

Owns:

```text
Make export UI state helpers
local export status label helpers
local exported video blob validation
short local handle display
```

Use this for:

```text
export status labels
export UI facts
guarding against stale/non-video export blobs
```

Important invariant:

```text
This file does not mint.
This file does not create backend truth.
This file does not create fake b3/receipt truth.
```

---

### `makeLinkedMediaModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeLinkedMediaModel.js
```

Owns:

```text
linked video draft creation
linked audio draft creation
local audio track draft creation
linked video range updates
audio track URL cleanup helper
linked media session summary
```

Use this for:

```text
draft object shape for linked media
local audio track object shape
linked video range object shape
linked media summary included in export/session plan
```

Important invariant:

```text
Linked media model creates local draft records only.
It does not prove rights.
It does not authorize reuse.
It does not create payout splits.
It does not create receipts.
```

---

### `makeRuntimeMediaModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeRuntimeMediaModel.js
```

Owns:

```text
runtime media error shaping
track facts
stream facts
safe error messages
```

Use this for:

```text
normalizing media errors
displaying camera/screen/mic stream facts
debug facts that must be safe for UI
```

Do not leak private paths, raw stack traces, tokens, or capabilities.

---

### `makeSequenceModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeSequenceModel.js
```

Owns:

```text
sequence review state
timeline math helpers
timeline cursor frame snapping
source/visible time conversion
sequence playback helper functions
sequence status labels
general clamp helper
```

Important helpers:

```text
createSequenceReviewState
snapTimelineFrameMs
formatTimelinePreciseTimeMs
getTimelineClipVisibleDurationMs
sourceMsToVisiblePct
visiblePctToSourceMs
sourceRangeToVisiblePlate
getTimelineAbsolutePositionMs
requestSequenceVideoPlay
waitForSequenceVideoReady
prepareSequenceVideoForClipStart
settleSequenceVideoSeek
sequenceStatusLabel
clamp
```

Use this for:

```text
timeline math
frame snapping
sequence review state defaults
video seek/play readiness helpers
```

Important:

```text
This file is already near the preferred size.
If it grows, split timing helpers into makeTimelineTimingModel.js.
```

---

### `makeTimelineModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeTimelineModel.js
```

Owns:

```text
clip timeline model
clip normalization
clip timeline labels
clip timeline duration/trim helpers
timeline effects
render timeline clips for export
seek video to timeline start
timeline preview end detection
```

Use this for:

```text
local clip timeline data shape
clip trim start/end
clip duration calculations
timeline effect CSS filter
export rendering list preparation
```

Do not put pointer drag handlers here.

---

### `makeTimelineClipStateModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeTimelineClipStateModel.js
```

Owns:

```text
timeline clip array snapshots
timeline clip signatures
timeline segment IDs
segment clip cloning
```

Use this for:

```text
undo/redo snapshot support for clips
split clip cloning
stable timeline clip array comparisons
```

---

### `makeAudioTimelineModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeAudioTimelineModel.js
```

Owns:

```text
audio track timeline preparation
audio active-time mapping
audio lane plate geometry helpers
audio timeline clock formatting
```

Use this for:

```text
display-ready audio track lane models
audio time relative to timeline
audio track plate positioning
audio clock display
```

---

### `makeAudioTimelineStateModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeAudioTimelineStateModel.js
```

Owns:

```text
audio track snapshots
audio track array signatures
timeline history snapshot normalization
Make timeline state snapshots
audio overlap resolution / slot swap
```

Use this for:

```text
audio undo/redo state
audio drag finalization snapshots
audio overlap/swap behavior
audio lane collision model
```

Likely future bugfix location:

```text
audio clips overlapping unexpectedly
audio tracks not swapping positions
undo/redo not capturing audio changes
dragging one audio clip moves another
audio track history snapshot mismatch
```

---

### `makeLocalFileModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeLocalFileModel.js
```

Owns:

```text
local ID creation
clip name creation
local clip URL cleanup
```

Use this for:

```text
new local clip IDs
safe local clip display names
revoke object URLs for local clips
```

---

### `makePreviewCanvasModel.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makePreviewCanvasModel.js
```

Owns:

```text
preview canvas draw loop
scene/background drawing
audio card drawing
idle overlay drawing
footer HUD drawing
cover/contain video drawing
stream attachment helper
stream/recorder cleanup helpers
```

Important helpers:

```text
attachStream
drawPreviewLoop
drawPreviewFrame
drawSceneBackground
drawAudioCard
drawIdleOverlay
drawFooterHud
drawGlassLabel
drawCoverVideo
drawContainVideo
roundRect
pipRect
isVideoReady
audioTracksFrom
stopAllStreams
stopRecorderStream
```

Use this for:

```text
canvas preview rendering
background image/video drawing
camera/screen preview composition
safe stream cleanup
```

Important invariant:

```text
This is local preview/canvas only.
It does not export final truth.
It does not mint.
It does not own backend truth.
```

---

### `makeCompositor.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeCompositor.js
```

Owns:

```text
Make compositor state helpers
frame drawing/compositor status
clear compositor state
```

Use this for:

```text
render/composition status
clearing local compositor state
compositor-related frame operations
```

---

### `makePersonSegmentation.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makePersonSegmentation.js
```

Owns:

```text
software person cutout / segmentation helpers
```

Use this for:

```text
cutout readiness
person/background separation
future cutout quality controls
```

Do not call this “green screen” logic. This is software cutout/segmentation.

---

### `makeAudioProbe.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeAudioProbe.js
```

Owns:

```text
local browser audio duration probing
```

Use this for:

```text
getting duration for imported local audio files
fallback duration metadata
```

---

### `makePageConstants.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makePageConstants.js
```

Owns:

```text
empty states
timeline item key helpers
local/linked timeline item key helpers
timeline order normalization
preview timeline effect constants
```

Important helpers:

```text
EMPTY_INPUT_STATE
EMPTY_RECORDER_STATE
PREVIEW_TIMELINE_EFFECTS
createTimelineItemKeys
idFromTimelineItemKey
isLocalTimelineItemKey
isLinkedVideoTimelineItemKey
makeLocalTimelineItemKey
makeLinkedVideoTimelineItemKey
normalizeTimelineItemOrderKeys
timelineOrderSignature
```

Use this for:

```text
timeline item identity
timeline order keys
empty input/recorder defaults
shared constants
```

---

## 6. Linked video preview files

### `MakeLinkedVideoDraftPreview.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeLinkedVideoDraftPreview.jsx
```

Current role:

```text
linked video draft preview panel/player shell
```

Use this for:

```text
previewing linked video draft references
showing linked video hydrate/proof/load status
```

---

### `MakeLinkedVideoPreviewFrame.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeLinkedVideoPreviewFrame.jsx
```

Current role:

```text
frame/player element for linked video preview
```

Use this for:

```text
linked video frame/player UI
linked video playback fallback wording
```

---

### `MakeLinkedVideoPreviewProofPanel.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeLinkedVideoPreviewProofPanel.jsx
```

Current role:

```text
proof/facts panel for linked video preview
```

Use this for:

```text
hydrate facts
source facts
gateway/object route facts
proof/status display
```

Do not turn displayed facts into wallet/rights truth.

---

### `makeLinkedVideoPreviewRoutes.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeLinkedVideoPreviewRoutes.js
```

Current role:

```text
route/URL normalization helpers for linked video preview
```

Use this for:

```text
gateway/object/video source route construction
linked video URL route handling
```

---

### `makeLinkedVideoPreviewFetch.js`

Path:

```text
apps/crablink-tauri/src/pages/make/makeLinkedVideoPreviewFetch.js
```

Current role:

```text
fetch/hydration helpers for linked video preview
```

Use this for:

```text
linked video preview hydration
fetch status
safe preview loading behavior
```

Important invariant:

```text
Fetching linked video preview is not a paid reuse authorization.
```

---

## 7. Shared small UI files

### `MakeRangeControl.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeRangeControl.jsx
```

Use this for:

```text
range sliders
small numeric controls
shared range UI
```

---

### `MakeSharedControls.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakeSharedControls.jsx
```

Use this for:

```text
small reusable Make controls
shared control widgets
```

---

### `MakePreviewOverlayWidgets.jsx`

Path:

```text
apps/crablink-tauri/src/pages/make/MakePreviewOverlayWidgets.jsx
```

Owns:

```text
preview overlay widgets
prompter overlay
subject preview overlay
prompter controls
timeline visual helper labels/effects
```

Use this for:

```text
HUD-style overlay widgets
subject transform overlay UI
prompter display overlay
small preview overlay components
```

---

## 8. Common “where do I change X?” lookup table

### “I want to change page layout”

Start with:

```text
MakePageLayout.jsx
```

Then maybe:

```text
MakeCommandDeck.jsx
MakeModeDeck.jsx
MakePresetDeck.jsx
MakeTimelineCard.jsx
MakeHandoffCard.jsx
MakeProjectCard.jsx
```

---

### “I want to change top-level state or lifecycle”

Start with:

```text
MakePage.jsx
```

Examples:

```text
camera startup
screen share startup
recording countdown
recording lifecycle
draft load/save
session plan persistence
export/handoff state wiring
background/cutout top-level state
```

---

### “I want to change preview studio layout”

Start with:

```text
MakePreviewStudioChrome.jsx
MakePreviewTimelineOverlay.jsx
MakePreviewDrawer.jsx
MakePreviewRecordControls.jsx
```

---

### “I want to change preview timeline behavior”

Start with:

```text
useMakePreviewTimelineController.js
```

Then check:

```text
MakePreviewTimelineOverlay.jsx
MakePreviewMiniTimelineHeader.jsx
MakePreviewLocalTimelineClip.jsx
MakePreviewLinkedVideoTimelineClip.jsx
MakePreviewTimelineMarker.jsx
makeSequenceModel.js
makePageConstants.js
```

---

### “I want to fix local clip dragging/resizing”

Start with behavior:

```text
useMakePreviewTimelineController.js
```

Then UI:

```text
MakePreviewLocalTimelineClip.jsx
```

Then mutation/history:

```text
useMakePageTimelineController.js
makeTimelineClipStateModel.js
makeTimelineModel.js
```

---

### “I want to fix linked video dragging/resizing”

Start with behavior:

```text
useMakePreviewTimelineController.js
```

Then UI:

```text
MakePreviewLinkedVideoTimelineClip.jsx
```

Then mutation:

```text
useMakePageTimelineController.js
makeLinkedMediaModel.js
```

Then preview/hydration:

```text
MakeLinkedVideoDraftPreview.jsx
makeLinkedVideoPreviewRoutes.js
makeLinkedVideoPreviewFetch.js
```

---

### “I want to fix audio track dragging/resizing/overlap”

Start with interaction behavior:

```text
useMakePreviewTimelineController.js
```

Then actual mutation/history:

```text
useMakePageTimelineController.js
makeAudioTimelineStateModel.js
```

Then display:

```text
MakePreviewAudioLane.jsx
makeAudioTimelineModel.js
```

Likely files for the old audio bugs:

```text
useMakePreviewTimelineController.js
useMakePageTimelineController.js
makeAudioTimelineStateModel.js
MakePreviewAudioLane.jsx
```

Known old bug class:

```text
undo/redo buttons grayed out for audio edits
dragging one audio clip affects another
audio clips overlap unexpectedly
audio clips do not swap/reflow cleanly
resize handles not obvious enough
touchpad manipulation feels buggy
```

---

### “I want to add better audio clip handles”

Start with:

```text
MakePreviewAudioLane.jsx
make.css
```

Then wire behavior in:

```text
useMakePreviewTimelineController.js
```

Do not put handle drag math directly in `MakePreviewAudioLane.jsx`.

---

### “I want to add imported linked video as a more real clip”

Start with:

```text
useMakePageTimelineController.js
useMakePreviewTimelineController.js
MakePreviewLinkedVideoTimelineClip.jsx
MakeLinkedVideoDraftPreview.jsx
```

Then inspect:

```text
makeLinkedMediaModel.js
makeLinkedVideoPreviewRoutes.js
makeLinkedVideoPreviewFetch.js
makeSequenceModel.js
```

Important caution:

```text
Linked video currently behaves as a draft/reference/preview.
Making it behave like an imported clip requires clear policy and backend/export rules.
Do not silently treat paid/reuse linked media as local owned media.
Do not fake automatic payout splits.
```

---

### “I want to add reuse fee / split payout manifest support”

Do not start in Make UI first.

Correct future path:

```text
ron-proto economics/reuse DTOs
ron-policy reuse/split policy
svc-wallet paid prepare/confirm/receipt path
ron-ledger durable receipt truth
omnigate/gateway product hydration
then CrabLink display/confirmation UI
```

Make page files can later display/collect draft intent:

```text
MakeLinkedMediaComposerPopover.jsx
MakeLinkedVideoPaymentInspector.jsx
makeLinkedMediaModel.js
MakeHandoffCard.jsx
```

But Make page must not invent the receipt, payout, or rights truth.

---

### “I want to change Make → Video handoff”

Start with UI:

```text
MakeHandoffCard.jsx
```

Then state/wiring:

```text
MakePage.jsx
makeExportUiModel.js
src/shared/api/makeExportClient.js
```

Then Rust export backend:

```text
apps/crablink-tauri/src-tauri/src/media/make_export.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
```

Important current working path:

```text
Make exports a local MP4 source handle.
Video page receives that local source handle.
Video page prepare/mint owns backend prepare/mint flow.
```

---

### “I want to change final export composition”

Start with frontend export request wiring:

```text
MakePage.jsx
makeExportUiModel.js
src/shared/api/makeExportClient.js
```

Then Rust backend:

```text
src-tauri/src/media/make_export.rs
src-tauri/src/media/mod.rs
src-tauri/src/commands/media.rs
src-tauri/src/lib.rs
```

Important invariant:

```text
Do not route large full-file media bytes through React/Tauri command results.
Use bounded chunks, temp files, handles, or staged files.
```

---

### “I want to change preview canvas drawing”

Start with:

```text
makePreviewCanvasModel.js
```

Then:

```text
MakePreviewPlaybackLayer.jsx
MakePreviewOverlayWidgets.jsx
makeCompositor.js
makePersonSegmentation.js
```

---

### “I want to change cutout/background controls”

Start with UI:

```text
MakeCutoutCard.jsx
MakePreviewOverlayWidgets.jsx
```

Then model/runtime:

```text
makePersonSegmentation.js
makeCompositor.js
makePreviewCanvasModel.js
MakePage.jsx
```

---

### “I want to change project settings”

Start with:

```text
MakeProjectCard.jsx
makeDraftModel.js
MakePage.jsx
```

---

### “I want to change prompter behavior”

Start with UI:

```text
MakePrompterEditor.jsx
MakePreviewOverlayWidgets.jsx
```

Then top-level state:

```text
MakePage.jsx
```

---

### “I want to change sequence review”

Start with UI:

```text
MakeSequenceReviewCard.jsx
MakePreviewPlaybackLayer.jsx
```

Then model:

```text
makeSequenceModel.js
```

Then state:

```text
MakePage.jsx
```

---

## 9. Data flow summary

### Local clip flow

```text
User adds local file
→ MakePage.jsx file input / callback
→ useMakePageTimelineController.js
→ createClipFromLocalFile / normalizeMakeClip
→ clips state updated
→ timeline item order updated
→ MakePageLayout.jsx renders
→ MakeTimelineCard.jsx and preview timeline receive clips
→ MakePreviewTimelineOverlay.jsx renders local clip bubbles
→ MakePreviewLocalTimelineClip.jsx renders each local clip
```

### Local audio flow

```text
User adds local audio
→ MakePage.jsx audio input / callback
→ useMakePageTimelineController.js
→ probeLocalAudioDurationMs
→ createLocalAudioTrackFromFile
→ audioTracks state updated
→ MakePreviewTimelineOverlay.jsx includes audio lane
→ MakePreviewAudioLane.jsx renders audio tracks
→ useMakePreviewTimelineController.js handles drag/trim interactions
→ useMakePageTimelineController.js commits final audio timing/history
→ Rust Make export later receives bounded audio chunks/temp files for FFmpeg mix
```

### Linked video flow

```text
User adds linked video
→ MakeLinkedMediaComposerPopover.jsx
→ useMakePreviewTimelineController.js submit handler
→ useMakePageTimelineController.js addLinkedVideoDraft
→ makeLinkedMediaModel.js creates draft reference
→ linkedVideoDrafts state updated
→ MakePreviewLinkedVideoTimelineClip.jsx shows linked bubble
→ MakeLinkedVideoDraftPreview.jsx can hydrate/preview
→ MakeLinkedVideoPaymentInspector.jsx can display draft/proof/payment facts
```

Caution:

```text
This is draft/reference/preview state unless backend receipt/reuse policy exists.
```

### Timeline edit flow

```text
User selects/drags/trims/splits/deletes
→ useMakePreviewTimelineController.js handles immediate pointer/selection UI
→ callback into useMakePageTimelineController.js
→ useMakePageTimelineController.js mutates clips/audio/linked drafts and captures history
→ MakePage.jsx owns actual React state
→ MakePageLayout.jsx passes state back into preview/timeline cards
```

### Export/handoff flow

```text
User approves sequence
→ MakeSequenceReviewCard.jsx / MakeHandoffCard.jsx UI
→ MakePage.jsx export orchestration
→ makeExportUiModel.js guards local export UI state
→ src/shared/api/makeExportClient.js calls Tauri bridge
→ Rust make_export.rs performs bounded export/mix
→ local source handle registered
→ CrabLink video page opens/receives local source handle
→ video page prepare/mint does backend truth work
```

---

## 10. Known stable plateau

The current refactor reached the desired practical shape:

```text
MakePage.jsx is no longer huge.
Preview chrome is no longer huge.
The route layout is extracted.
The route mutation controller is extracted.
The preview interaction controller is extracted.
Most cards/components are now standalone.
Most model helpers are in lowerCamel JS files.
```

This is a good stopping point.

Do not keep refactoring for line count alone. Future work should be feature-driven.

---

## 11. Known remaining technical debt

### 11.1 `useMakePreviewTimelineController.js` is too large

Current size:

```text
~1483 lines
```

Why acceptable:

```text
It is cohesive controller complexity extracted out of preview chrome.
It is easier to split later than mixed JSX/controller code.
```

Future split candidates:

```text
useMakePreviewTimelineSelection.js
useMakePreviewTimelinePlayback.js
useMakePreviewClipDragController.js
useMakePreviewAudioDragController.js
useMakePreviewLinkedVideoDragController.js
useMakePreviewLinkedMediaComposer.js
```

Split only when working on timeline/audio behavior.

---

### 11.2 `useMakePageTimelineController.js` may become crowded

Current size:

```text
~916 lines
```

Future split candidates:

```text
useMakePageClipController.js
useMakePageAudioController.js
useMakePageLinkedMediaController.js
useMakePageTimelineHistory.js
```

Split only when adding significant audio/linked-media/timeline features.

---

### 11.3 `MakePage.jsx` is still ~1.9k lines

This is acceptable for now because it still owns broad route orchestration.

Future split candidates:

```text
useMakePageMediaInputs.js
useMakePageRecorderController.js
useMakePageSubjectController.js
useMakePageExportController.js
useMakePageDraftPersistence.js
```

Do not split until actively working on those areas.

---

### 11.4 Main timeline is not final architecture

`MakeTimelineCard.jsx` is a useful extracted card, but not a full professional timeline system yet.

Future split:

```text
MakeTimelineToolbar.jsx
MakeVideoTimelineLane.jsx
MakeAudioTimelineLane.jsx
MakeTimelineClipBubble.jsx
MakeAudioTrackBubble.jsx
MakeTimelineSelectionOverlay.jsx
makeTimelineDragModel.js
makeTimelineSelectionModel.js
```

---

### 11.5 Audio UX still deserves a dedicated pass

Known desired improvements:

```text
stable one-clip-only pointer ownership
clear left/right resize handles
touchpad-friendly drag zones
drag-vs-resize separation
audio lane slot swapping
no accidental multi-clip moves
no overlapping unless explicitly allowed
undo/redo captures audio add/move/trim/volume/remove
```

Likely files:

```text
useMakePreviewTimelineController.js
useMakePageTimelineController.js
makeAudioTimelineStateModel.js
MakePreviewAudioLane.jsx
make.css
```

---

## 12. Test gates before touching Make again

Always run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
```

Useful line-count command:

```bash
echo
echo "Make page line counts:"
wc -l \
  src/pages/make/MakePage.jsx \
  src/pages/make/MakePageLayout.jsx \
  src/pages/make/useMakePageTimelineController.js \
  src/pages/make/MakePreviewStudioChrome.jsx \
  src/pages/make/useMakePreviewTimelineController.js \
  src/pages/make/MakePreviewTimelineOverlay.jsx \
  src/pages/make/MakePreviewLocalTimelineClip.jsx \
  src/pages/make/MakePreviewLinkedVideoTimelineClip.jsx \
  src/pages/make/MakePreviewMiniTimelineHeader.jsx \
  src/pages/make/MakePreviewAudioLane.jsx \
  src/pages/make/MakeLinkedVideoPaymentInspector.jsx \
  src/pages/make/MakePreviewTimelineMarker.jsx \
  src/pages/make/MakePreviewRecordControls.jsx \
  src/pages/make/MakePreviewDrawer.jsx \
  src/pages/make/MakeLinkedMediaComposerPopover.jsx \
  src/pages/make/makeLocalFileModel.js \
  src/pages/make/MakeTimelineCard.jsx \
  src/pages/make/MakePreviewPlaybackLayer.jsx \
  src/pages/make/makePreviewCanvasModel.js \
  src/pages/make/makeSequenceModel.js
```

Manual smoke after future Make changes:

```text
crab://make route loads
no CRABLINK UI GUARD crash
preview studio renders
mode drawer opens
settings/effects drawer opens
record/start button renders
disabled states are sane
camera/screen input still starts
record countdown still works
local clip add works
local clip appears in timeline
local clip appears in preview timeline
local clip trim/drag does not crash
linked media composer opens/closes
linked video draft can be added
linked video draft appears in preview timeline
linked video preview still opens if available
audio file can be added
audio lane appears
audio clip can be selected
audio clip can be moved/trimmed without moving another clip
undo/redo works after clip/audio edits
sequence review card renders
handoff/export card renders
Make → Video handoff still works
no fake wallet/payment/receipt/b3 truth appears
```

Media/export smoke when practical:

```text
record a short local clip
add local audio
export sequence
confirm Rust/FFmpeg path runs
confirm final MP4 exists
confirm local source handle is registered
open crab://video with exported source
prepare/mint only through real video page/backend flow
```

---

## 13. Where to start next time for likely feature work

### Feature: polished audio timeline

Start:

```text
MakePreviewAudioLane.jsx
useMakePreviewTimelineController.js
useMakePageTimelineController.js
makeAudioTimelineStateModel.js
makeAudioTimelineModel.js
make.css
```

Goal:

```text
professional audio clip manipulation
clear handles
stable drag ownership
slot swap/reflow
undo/redo correctness
```

---

### Feature: linked video as real imported/commentary clip

Start:

```text
useMakePageTimelineController.js
useMakePreviewTimelineController.js
MakePreviewLinkedVideoTimelineClip.jsx
MakeLinkedVideoDraftPreview.jsx
makeLinkedMediaModel.js
makeLinkedVideoPreviewRoutes.js
makeLinkedVideoPreviewFetch.js
```

Backend/policy work needed before truth claims:

```text
reuse quote
reuse confirmation
backend receipt
manifest split declaration
creator payout plan
wallet/ledger integration
```

---

### Feature: split payout/reuse fee in manifest

Start outside Make page:

```text
ron-proto
ron-policy
svc-wallet
ron-ledger
omnigate
svc-gateway
```

Then return to Make UI:

```text
MakeLinkedMediaComposerPopover.jsx
MakeLinkedVideoPaymentInspector.jsx
makeLinkedMediaModel.js
MakeHandoffCard.jsx
```

---

### Feature: export improvements

Start:

```text
MakeHandoffCard.jsx
MakePage.jsx
makeExportUiModel.js
src/shared/api/makeExportClient.js
src-tauri/src/media/make_export.rs
```

Keep:

```text
bounded media paths
no full-file command result buffering
no raw FFmpeg args from React
no raw private paths in UI
no fake backend truth
```

---

### Feature: cutout/background polish

Start:

```text
MakeCutoutCard.jsx
MakePreviewOverlayWidgets.jsx
makePersonSegmentation.js
makeCompositor.js
makePreviewCanvasModel.js
MakePage.jsx
```

---

### Feature: page UI polish

Start:

```text
MakePageLayout.jsx
MakeCommandDeck.jsx
MakeModeDeck.jsx
MakePresetDeck.jsx
MakeProjectCard.jsx
MakeHandoffCard.jsx
MakeTimelineCard.jsx
make.css
```

---

## 14. Final recommendation

Leave the Make page alone unless:

```text
we are fixing audio/timeline UX,
adding linked media/reuse functionality,
improving export/handoff,
or polishing creator-facing UI.
```

The refactor is now good enough to move forward.

For the next big project area, proceed with QuickChain only as future-gated scaffolding/readiness and docs unless explicitly building internal-only prototypes. Do not connect QuickChain to ROC, wallets, receipts, creator payouts, paid unlocks, staking, liquidity, public bridges, or external settlement until the internal ROC economy is proven end-to-end.

The Make page is now in a maintainable shape. Future sessions should use this map before editing.

### END NOTE - JUNE 9 2026 - 16:30 CST



### BEGIN NOTE - JUNE 9 2026 - 16:35 CST

I reviewed the new QuickChain blueprint, RustyOnions Rust bundle, CrabLink Tauri bundle, and combined crate docs. The key tension is important: `QUICKCHAIN.MD` says QuickChain is the future settlement spine, but also explicitly says it is **not active chain implementation yet** and must stay gated until internal ROC, wallet receipts, ledger replay, accounting snapshots, and reward planning are proven.  The existing CrabLink QuickChain page already enforces that posture as a readiness dashboard only, with no validators, checkpoints, ROX/Solana, bridge anchors, or chain state in CrabLink.  The RustyOnions repo does have the right raw materials: `ron-ledger`, `svc-wallet`, `ron-accounting`, `svc-rewarder`, `ron-kms`, `ron-auth`, `svc-registry`, `ron-audit`, `ron-proto`, `ron-policy`, `ron-transport`, `svc-storage`, `svc-dht`, and the node profiles are already present in the Rust bundle/docs.  

Here are the carryover notes for the next session.

# CARRYOVER NOTES — Beginning QUICKCHAIN Safely

Date: June 9, 2026
Project: RustyOnions / CrabLink
Area: QuickChain
Status: Pre-implementation / future-gated settlement design
Primary docs: `QUICKCHAIN.MD`, `CODEBUNDLE_RS.md`, `ALL_DOCS_COMBINED.MD`, `CODEBUNDLE_TAURI_APP.md`

---

# 0. Executive summary

QuickChain is the most dangerous and most important phase of RustyOnions because it moves us from an internal replayable value plane toward distributed, cryptographically verifiable settlement.

The emotional framing is correct: exciting and terrifying.

The correct engineering posture is:

```text
Do not rush consensus.
Do not rush public chain logic.
Do not rush ROX/Solana.
Do not rush bridges.
Do not rush validator markets.
Do not put chain logic in CrabLink.
Do not move economic truth out of ron-ledger/svc-wallet.
```

The next session should begin QuickChain work, but it must begin as:

```text
QuickChain Phase 0:
  threat model
  invariants
  DTO boundaries
  canonicalization decisions
  deterministic root test design
  crate ownership map
  acceptance gates
  disabled-by-default scaffolding only
```

The first actual code patch, if we do code, should be boring and strict:

```text
No live chain.
No consensus.
No validators.
No bridge.
No external settlement.
No token launch.
No staking.
No liquidity.
No Solana.
No ROX.
No CrabLink chain authority.
```

The first safe QuickChain code should be either:

```text
Option A — docs/test-only preflight:
  docs + threat model + acceptance checklist + no runtime behavior

Option B — pure DTO/canonical-vector scaffolding:
  ron-proto quickchain DTOs behind disabled feature gate
  deterministic serialization/hash test vectors
  no service integration
  no mutation path
  no consensus path
```

The best next-session target is probably:

```text
Batch QC-0A:
  Add QuickChain preflight docs and a threat-model checklist,
  then optionally add strict ron-proto DTO stubs and golden hash vectors,
  all disabled and disconnected from runtime.
```

---

# 1. Current project posture

## 1.1 Active mission still comes first

The active mission remains:

```text
Prove ROC as a fully internal token/accounting/value plane first.
```

The active value loop is:

```text
ron-proto econ DTOs
→ ron-ledger durable replayable truth
→ svc-wallet balance/issue/transfer/burn/hold/capture/release/receipt
→ svc-storage/svc-gateway/omnigate paid-use enforcement
→ ron-accounting snapshots
→ svc-rewarder deterministic reward/payout planning
→ wallet/ledger committed receipts
```

QuickChain does not replace this loop. QuickChain eventually settles, proves, compresses, signs, prunes, and optionally anchors this loop.

## 1.2 QuickChain is future-gated

QuickChain must remain future-gated until:

```text
[ ] paid site visit proof works end-to-end
[ ] Visitor B balance decreases
[ ] Creator A balance increases
[ ] wallet receipt displays in CrabLink
[ ] ron-ledger replay proves balances
[ ] ron-accounting has sealed usage snapshot proof
[ ] svc-rewarder can compute deterministic payout plan
[ ] wallet/rewarder replay does not double issue
[ ] product smoke scripts prove internal ROC loop
[ ] paid view/content patterns are stable enough to know real transaction volume
```

Until these are true, QuickChain work must be:

```text
research
docs
threat model
DTO design
hash vectors
deterministic local root experiments
disabled feature-gated scaffolding
```

Not:

```text
live validators
public chain
bridge
staking
liquidity
ROX
Solana
external settlement
```

---

# 2. North-star QuickChain definition

QuickChain is not “a blockchain bolted onto RustyOnions.”

QuickChain is the future ROC settlement spine:

```text
receipt-first
epoch-settled
state-root verified
chunk-carried
passport-trusted
proof-prunable
externally anchorable
```

The central design is:

```text
hot user actions produce signed wallet receipts immediately;
many receipts and usage events settle into epoch roots;
epoch roots become validator-signed checkpoints;
old raw history can be pruned only by proof;
optional external anchors commit compact checkpoint hashes later.
```

This is specifically designed for the RustyOnions creator economy, not generic DeFi.

RustyOnions has high-volume economic actions:

```text
site visits
paid content views
image views
article views
post/comment interactions
music plays
video watch seconds
storage byte-days
pinning
provider rewards
creator payouts
curator splits
ad impressions
moderation/reputation effects
validator rewards
carrier/archive rewards
```

A naive chain would make every site visit an on-chain transaction. That is not acceptable.

QuickChain must instead do:

```text
site visit
→ signed wallet receipt
→ accounting usage event
→ sealed accounting window
→ reward manifest
→ ledger epoch transition
→ state root / receipt root / reward root
→ validator checkpoint
→ carrier/archive proof chunks
→ optional external anchor
```

---

# 3. Absolute forbidden scope for next session

The next session must not implement:

```text
ROX
Solana integration
external settlement
public bridge
staking
liquidity
exchange-facing logic
public validator market
slashing logic
real validator rewards
chain state in CrabLink
gateway-side ledger mutation
omnigate direct ledger mutation
accounting direct balance mutation
rewarder direct balance mutation
storage direct economic mutation
unreviewed crypto
custom signature schemes
floating-point money math
unsafe Rust
```

Also forbidden:

```text
“Temporary” fake balances
“Temporary” fake receipts
“Temporary” fake checkpoint proofs
“Temporary” fake validator signatures
“Temporary” fake payout splits
“Temporary” fake bridge events
```

If a proof is not real, label it as mock/dev/demo and keep it disconnected from economic flows.

---

# 4. The most important architectural boundary

QuickChain must evolve the existing value plane.

It must not move authority into the wrong places.

Correct ownership:

```text
ron-proto:
  DTOs and wire types

ron-ledger:
  durable economic truth
  append-only/replayable log
  deterministic balance state
  future state-root engine

svc-wallet:
  mutation front-door
  issue/transfer/burn/hold/capture/release
  nonce/idempotency
  receipts
  account balances

ron-accounting:
  usage events
  metering
  sealed snapshots
  not balance truth

svc-rewarder:
  deterministic reward planning
  payout manifests
  wallet intents
  no direct mutation

ron-policy:
  side-effect-free rules/pricing/payout policy
  basis points
  integer minor units
  feature gates

svc-registry:
  governance signer set
  validator set descriptors later
  signed registry facts
  quorum-gated changes

ron-kms:
  signing/verifying key handles
  rotation
  batch verify
  future PQ adapters

ron-auth / svc-passport:
  capabilities
  passport identity
  validator eligibility
  no wallet substitution

ron-audit:
  canonical audit records
  BLAKE3 hash chains
  tamper evidence

svc-storage / svc-index / svc-dht / svc-edge:
  content/proof chunk storage, discovery, delivery
  no ledger mutation

svc-gateway:
  public route surface
  quotas/admission/proxy
  no wallet/ledger mutation

omnigate:
  product hydrator/coordinator
  no durable economic truth

CrabLink:
  display and user intent
  gateway client
  no chain logic
  no fake receipts
  no private keys
```

This boundary is the difference between jaw-dropping and catastrophic.

---

# 5. Existing crates we should leverage

## 5.1 `ron-proto`

Use for:

```text
QuickChain DTOs
checkpoint headers
receipt inclusion proof DTOs
account proof DTOs
validator signature DTOs
challenge DTOs
chain parameter DTOs
anchor payload DTOs
```

Rules:

```text
serde deny_unknown_fields
strict versioned schemas
integer money as strings or bounded integer wrappers
b3:<64 lowercase hex> only
no floats
golden vectors
cross-version tests
```

Possible future modules:

```text
crates/ron-proto/src/quickchain/mod.rs
crates/ron-proto/src/quickchain/checkpoint.rs
crates/ron-proto/src/quickchain/receipt.rs
crates/ron-proto/src/quickchain/account.rs
crates/ron-proto/src/quickchain/proof.rs
crates/ron-proto/src/quickchain/challenge.rs
crates/ron-proto/src/quickchain/params.rs
crates/ron-proto/src/quickchain/anchor.rs
```

Do not wire these into runtime yet unless explicitly behind a disabled feature.

## 5.2 `ron-ledger`

Use for:

```text
deterministic replay
balance truth
ledger sequence
receipt root
state root
account state tree
epoch transition proof
checkpoint root engine
```

Potential first local-root work:

```text
state_root_determinism.rs
receipt_root_determinism.rs
epoch_transition_replay.rs
idempotency_epoch.rs
```

Do not turn this into consensus yet.

## 5.3 `svc-wallet`

Use for:

```text
mutation front-door
receipt production
nonce/idempotency
hold/capture/release
balance reads
receipt replay tests
site_visit receipt tests
```

Critical invariants:

```text
no double spend
no negative balance
capture cannot exceed hold
release returns remaining escrow
duplicate idempotency key cannot double-commit
receipt hash binds op/from/to/amount/nonce/root
```

QuickChain consumes wallet truth. It does not replace wallet mutation.

## 5.4 `ron-accounting`

Use for:

```text
usage events
metering
sealed accounting snapshots
usage roots
reward inputs
carrier proof events later
```

QuickChain should treat accounting as:

```text
input to rewards
input to checkpoint roots
not balance truth
```

## 5.5 `svc-rewarder`

Use for:

```text
deterministic reward planning
provider/carrier/archive/validator reward manifests later
payout plan root
wallet intents
no direct mutation
```

Acceptance requirement:

```text
same accounting input + same policy hash = same reward manifest root
```

## 5.6 `ron-policy`

Use for:

```text
pricing rules
basis points
reward formulas
validator admission policy
carrier reward policy
challenge windows
feature gates
```

Rules:

```text
side-effect-free
deterministic
policy_hash included in checkpoint
no hidden runtime policy drift
```

## 5.7 `svc-registry`

Use later for:

```text
validator set registry
signer set
chain parameter registry
governance-approved validator admission
quorum-gated updates
signed descriptors
freeze/thaw governance
```

Important:

```text
validator set changes must be signed/versioned
operators cannot bypass quorum
all changes append-only
```

## 5.8 `ron-kms`

Use for:

```text
checkpoint signing
validator signature verification
key rotation
batch verify
future PQ signatures
sealed key handles
zeroize discipline
```

Do not expose raw private key material to services that do not need it.

## 5.9 `ron-audit`

Use for:

```text
checkpoint proposal audit
validator signature audit
registry mutation audit
challenge evidence audit
tamper-evident append-only records
BLAKE3 canonical record hashes
```

Potential long-term:

```text
QuickChain checkpoint production should emit audit records.
Challenge/fraud evidence should emit audit records.
Governance freezes should emit audit records.
```

## 5.10 `ron-auth` / `svc-passport`

Use for:

```text
validator capability tokens
passport-gated validator admission
attenuated signing rights
main passport vs alt passport separation
```

Important:

```text
anonymous alt passports should not validate economic truth by default.
main passport / registered validator identity required for validator roles.
```

## 5.11 `ron-kernel`, `ron-bus`, `ryker`

Use later for:

```text
bounded eventing
supervision
checkpoint proposal eventing
validator worker lifecycle
shutdown/backpressure
```

Do not create unbounded validator channels.

## 5.12 `ron-metrics`

Use for:

```text
checkpoint metrics
validator metrics
fork/challenge metrics
carrier proof metrics
anchor metrics
```

Metrics must avoid high-cardinality labels:

```text
no account IDs in labels
no wallet txids in labels
no CIDs in labels
route/result/reason buckets only
```

## 5.13 `svc-storage`, `svc-index`, `svc-dht`, `svc-edge`

Use later for:

```text
receipt batch chunks
accounting snapshot chunks
reward manifest chunks
ledger transition chunks
state proof chunks
carrier/archive storage
data availability
proof chunk discovery
```

They do not mint or mutate balances.

## 5.14 `ron-transport`, `oap`, `macronode`, `micronode`

Use later for:

```text
validator communication
node profiles
carrier/archive node behavior
bounded OAP frames
transport readiness
```

Rules:

```text
OAP remains Rust-side.
Frames bounded.
No locks across await.
No unbounded buffers.
No raw chain authority in frontend.
```

---

# 6. The next session’s correct mission

The next session should not be “build a blockchain.”

The next session should be:

```text
Begin QuickChain correctly by freezing its safety model,
choosing the first non-dangerous implementation slice,
and adding proof-oriented scaffolding that cannot affect live ROC balances.
```

Best next-session title:

```text
QuickChain Phase 0A — Preflight, Threat Model, DTO Boundary, and Deterministic Root Plan
```

Primary deliverable:

```text
A paste-ready patch that either:
  A) adds docs/checklists/readiness artifacts only, or
  B) adds pure ron-proto QuickChain DTO scaffolding and golden tests behind a disabled feature.
```

Preferred order:

```text
1. Add docs/quickchain/THREAT_MODEL.md
2. Add docs/quickchain/PHASE_0_PRE_FLIGHT.md
3. Add docs/quickchain/ROOTS_AND_CANONICALIZATION.md
4. Add docs/quickchain/CRATE_OWNERSHIP.md
5. Update QuickchainReadinessPage only if needed to show the new gates
6. Then, only after that is green, consider ron-proto DTO stubs
```

If the user wants code immediately, the least dangerous code is:

```text
ron-proto DTOs + golden serialization tests only.
No service runtime.
No ledger mutation.
No consensus.
No external anchor.
```

---

# 7. Proposed next patch: Batch QC-0A

## 7.1 Goal

Create a QuickChain preflight foundation.

This patch should make the project safer before it becomes more powerful.

## 7.2 Files to add or update

Potential docs-only files:

```text
docs/quickchain/README.md
docs/quickchain/THREAT_MODEL.md
docs/quickchain/PHASE_0_PRE_FLIGHT.md
docs/quickchain/ROOTS_AND_CANONICALIZATION.md
docs/quickchain/CRATE_OWNERSHIP.md
docs/quickchain/ACCEPTANCE_GATES.md
docs/quickchain/ATTACK_CLASSES.md
docs/quickchain/NO_GO_LIVE_CHECKLIST.md
```

Potential CrabLink display update:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
apps/crablink-tauri/src/pages/quickchain/quickchain.css
```

Only update CrabLink if adding visible readiness gates. Do not put chain logic there.

Potential first DTO code, if we choose code:

```text
crates/ron-proto/src/quickchain/mod.rs
crates/ron-proto/src/quickchain/checkpoint.rs
crates/ron-proto/src/quickchain/receipt.rs
crates/ron-proto/src/quickchain/account.rs
crates/ron-proto/src/quickchain/proof.rs
crates/ron-proto/src/quickchain/challenge.rs
crates/ron-proto/src/quickchain/params.rs
crates/ron-proto/tests/quickchain_dto_strict.rs
crates/ron-proto/tests/quickchain_golden_vectors.rs
```

But only if behind a disabled feature or not wired into runtime.

## 7.3 Acceptance

The patch is acceptable only if:

```text
cargo test -p ron-proto
cargo test -p ron-ledger
cargo test -p svc-wallet
cargo test -p ron-accounting
cargo test -p svc-rewarder
cargo test -p svc-registry
cargo test -p ron-kms
cargo check --workspace
```

For CrabLink-only display changes:

```text
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
```

No new feature should claim QuickChain is live.

---

# 8. The central first technical decision: canonicalization

Before consensus, before validators, before pruning, before anchoring, we must decide canonical bytes.

This is the first dragon.

If two honest nodes serialize the same logical checkpoint differently, they get different hashes. That breaks consensus.

Therefore the first QuickChain implementation decision must be:

```text
What exact bytes are hashed?
```

## 8.1 Requirements

Canonical encoding must be:

```text
deterministic
portable
versioned
strict
unknown-field rejecting
float-free
stable across Rust versions
stable across platforms
stable across map ordering
explicit about strings and Unicode
explicit about integer formatting
golden-vector tested
```

## 8.2 Safe early strategy

Use a deliberately small canonical surface:

```text
money values as decimal strings
timestamps as u64 milliseconds
hashes as b3:<64 lowercase hex>
maps sorted by bytewise key order
no floats
no NaN
no locale-dependent formatting
no implicit defaults in hashed payloads
no unknown fields
```

## 8.3 Open decision

We need to decide:

```text
canonical JSON v1
canonical CBOR v1
fixed binary v1
```

Recommendation for next session:

```text
Start with canonical JSON v1 for human-readable test vectors,
but isolate the canonicalizer behind a trait so CBOR/fixed-binary can replace it later.
```

Do not rely on normal JSON serialization unless we prove it is canonical enough.

Create explicit golden vectors:

```text
same logical checkpoint -> exact same bytes -> exact same b3
field order changed input -> same canonical bytes -> same b3
unknown field -> reject
float input -> reject
uppercase b3 -> reject
invalid money string -> reject
```

---

# 9. The second technical decision: state tree

QuickChain needs account state roots.

Potential designs:

```text
simple sorted Merkle map
sparse Merkle tree
account trie
Verkle-like tree later
```

Do not overbuild yet.

Recommendation:

```text
Phase 1 local prototype:
  sorted Merkle map over canonical AccountStateV1 bytes
```

Why:

```text
simple
auditable
easy to test
enough for deterministic roots
can migrate later behind versioned state_root_scheme
```

State root config must include:

```text
state_root_scheme = "sorted_merkle_map_v1"
hash = "blake3"
leaf_prefix = domain separation byte/string
node_prefix = domain separation byte/string
empty_root = defined constant
sort_order = bytewise account_id
```

Domain separation is mandatory:

```text
hash("quickchain.leaf.v1" || canonical_account_state)
hash("quickchain.node.v1" || left_hash || right_hash)
```

Do not use raw concatenation without domain separation.

---

# 10. The third technical decision: receipt root

Every wallet mutation must have a receipt.

Receipt root should commit to:

```text
receipt_hash
ledger sequence range
operation
from/to
amount
nonce/idempotency
previous ledger root
new ledger root
```

Important:

```text
receipt_hash must be computed without receipt_hash field included.
receipt inclusion proof must bind to epoch receipt root.
receipt replay must prove same root.
idempotency must prevent double inclusion.
```

Potential first tests:

```text
same receipt list -> same root
receipt reordered -> deterministic sorted or sequence-order root, whichever spec chooses
duplicate idempotency -> reject
missing receipt -> root mismatch
modified amount -> root mismatch
modified recipient -> root mismatch
```

Recommendation:

```text
Use ledger sequence order for receipt batches.
Use explicit batch metadata.
Hash each receipt canonically.
Build Merkle root over receipt hashes.
```

---

# 11. The fourth technical decision: epoch model

Epochs are where QuickChain starts becoming more than wallet receipts.

Epoch should bind:

```text
previous_checkpoint_hash
previous_state_root
new_state_root
receipt_root
accounting_snapshot_root
reward_manifest_root
data_availability_root
policy_hash
validator_set_hash
chain_params_hash
supply_delta
conservation proof
time range
height
```

Do not let wall-clock time decide validity alone.

Time is metadata. State transition must be deterministic from inputs.

Epoch IDs must be deterministic or strictly specified:

```text
roc-dev:height:000000000001
roc-main:height:000000000001
```

Avoid ambiguous human strings.

---

# 12. Existing blockchain failure modes we must explicitly avoid

## 12.1 Double spend

Cause:

```text
same funds committed twice
nonce/idempotency bypass
parallel mutation race
forked ledger state
```

Defenses:

```text
svc-wallet front-door only
ron-ledger sequence truth
idempotency keys
nonce monotonicity
single writer per account or deterministic conflict handling
replay tests
loom tests for concurrency paths
```

## 12.2 Replay attack

Cause:

```text
old receipt or signed request accepted again
```

Defenses:

```text
nonce per account
idempotency store
chain_id in signed payload
epoch/height domain separation
expiry for capabilities
signature context strings
```

## 12.3 Integer overflow / rounding bugs

Cause:

```text
u64 overflow
float money
basis point rounding drift
```

Defenses:

```text
u128 or checked integer wrappers
integer minor units only
checked_add / checked_sub
basis points with deterministic rounding rules
no floats anywhere in money
property tests for conservation
```

## 12.4 Canonicalization split-brain

Cause:

```text
same checkpoint serializes differently across nodes
```

Defenses:

```text
canonical encoding spec
golden vectors
unknown field rejection
sorted maps
no floats
stable string normalization rules
hash exact bytes
cross-platform tests
```

## 12.5 Signature malleability / wrong-domain signatures

Cause:

```text
signature verifies over bytes from another context
```

Defenses:

```text
domain-separated signing preimage
chain_id included
height included
checkpoint hash included
validator role included
key purpose included
algorithm included
no raw “sign arbitrary bytes” API in service logic
```

## 12.6 Validator equivocation

Cause:

```text
validator signs two different checkpoints at same height
```

Defenses:

```text
equivocation evidence type
registry signer identity
audit record
validator local double-sign guard
future slashing/penalty
manual beta quarantine
```

## 12.7 Weak validator set governance

Cause:

```text
operator or attacker changes validator set without quorum
```

Defenses:

```text
svc-registry signed descriptors
quorum-gated mutations
append-only signer set changes
capability-gated writes
auditable freeze/thaw
validator_set_hash in checkpoint
```

## 12.8 Data availability failure

Cause:

```text
checkpoint signed but receipt/accounting/reward chunks unavailable
```

Defenses:

```text
data_availability_root
carrier assignments
challenge window
archive fallback
withhold rewards if data missing
checkpoint challenge path
```

## 12.9 Unsafe pruning

Cause:

```text
raw history deleted before proof roots are signed/challenge window expires
```

Defenses:

```text
pruning disabled by default
challenge window enforced
state restore tests
receipt proof tests
archive fallback tests
carrier chunk recovery tests
```

## 12.10 Bridge exploit

Cause:

```text
external anchor treated as source of truth
```

Defenses:

```text
ROX/Solana disabled
anchors store compact commitments only
ROC facts stay internal
anchor verifier cannot mutate balances
anchor not hot-path dependency
no public bridge until audited
```

## 12.11 Privacy leakage

Cause:

```text
public account state reveals browsing history or links alt identities
```

Defenses:

```text
do not claim privacy yet
separate alt passports by default
minimize public receipt details
research account proof privacy
do not expose raw browsing histories
no analytics labels with account IDs
```

## 12.12 MEV / ordering abuse

Cause:

```text
validators reorder paid actions or rewards for advantage
```

Defenses for beta:

```text
wallet receipts already committed before epoch settlement
epoch settlement uses existing ledger sequence
no validator discretion over hot-path ordering
auditable proposer ordering
deterministic replay
```

## 12.13 Governance capture

Cause:

```text
small signer set can alter params/validators maliciously
```

Defenses:

```text
quorum
public audit
freeze path
delayed activation for high-risk changes
multi-region signer policy
eventual bond/slashing
operator runbooks
```

## 12.14 Dependency / crypto supply-chain risk

Cause:

```text
unreviewed crypto crate or unsafe dependency
```

Defenses:

```text
prefer existing audited crates
no custom crypto
cargo deny
cargo audit
pin versions
review unsafe
fuzz parsers
minimize dependencies in consensus crates
```

---

# 13. QuickChain security rules

Every QuickChain patch must obey:

```text
No unsafe Rust unless separately justified and audited.
No floating-point money math.
No direct ledger mutation outside approved wallet/ledger boundary.
No signature verification shortcuts.
No unknown fields in chain DTOs.
No pruning without signed checkpoint roots.
No anchor without checkpoint verification.
No external bridge until internal ROC is proven.
No privacy claims without real protocol.
No anonymous alt validators by default.
No reward minting by carriers/providers/validators directly.
No high-cardinality metrics labels.
No unbounded queues.
No locks across await.
No blocking crypto/fs on async hot path.
No raw private keys crossing service boundaries.
```

---

# 14. QuickChain crate strategy

We should avoid creating a giant `quickchain` service too early.

Possible phased crate strategy:

## Phase 0

No new service.

Maybe no new crate.

Use:

```text
docs/quickchain/*
ron-proto DTOs behind feature
ron-ledger local root helpers behind feature
```

## Phase 1

Maybe introduce:

```text
crates/ron-quickchain/
```

Only if needed for pure library logic:

```text
canonical checkpoint hashing
Merkle root helpers
receipt inclusion proof verification
account state proof verification
checkpoint header validation
```

Important:

```text
ron-quickchain must be a pure library.
No network.
No wallet mutation.
No runtime actor.
No validator service.
```

## Phase 2+

Only later introduce service actors:

```text
svc-quickchain-validator
svc-quickchain-carrier
svc-quickchain-archive
```

Do not create these next session.

Better to keep service count low until roots and proofs are right.

---

# 15. Recommended first code architecture if DTOs are added

If next session adds DTO scaffolding, shape it like this:

```text
ron-proto::quickchain
  CheckpointHeaderV1
  ValidatorSignatureV1
  AccountStateV1
  ReceiptProofV1
  AccountProofV1
  ChallengeV1
  ChainParamsV1
  AnchorPayloadV1
```

DTO requirements:

```text
#[serde(deny_unknown_fields)]
schema field required
version explicit
chain_id required
all b3 hashes validate
all money fields integer strings or checked wrappers
all arrays bounded by validation
all timestamps u64 ms
no floats
no generic serde_json::Value in canonical structs
```

Validation helpers:

```text
validate_b3_hash
validate_chain_id
validate_epoch_id
validate_decimal_minor_units
validate_quorum_bps
validate_time_range
validate_checkpoint_height
```

Tests:

```text
reject_unknown_fields
reject_uppercase_b3
reject_bad_hash_len
reject_float_amount
reject_negative_amount
reject_missing_schema
same_dto_same_canonical_hash
field_order_irrelevant_if canonical JSON selected
```

---

# 16. Recommended first ledger-root architecture

Do not start with distributed consensus.

Start with a local proof:

```text
Given a replayed ron-ledger state,
produce a deterministic AccountStateV1 list,
canonicalize it,
Merkleize it,
return state_root.
```

First tests:

```text
empty_state_root_is_stable
single_account_state_root_is_stable
two_accounts_sort_independent
balance_change_changes_root
nonce_change_changes_root
hold_change_changes_root
same_replay_same_root
different_insert_order_same_root
invalid_account_id_rejects
```

Potential file locations later:

```text
crates/ron-ledger/src/quickchain/mod.rs
crates/ron-ledger/src/quickchain/account_state.rs
crates/ron-ledger/src/quickchain/state_root.rs
crates/ron-ledger/tests/state_root_determinism.rs
```

But only when we are ready for local root work.

---

# 17. Recommended first wallet receipt root architecture

The wallet already has receipt tests and hold/capture/release behavior. QuickChain should consume wallet receipts.

First receipt-root prototype:

```text
wallet receipts
→ canonical receipt DTO
→ receipt_hash
→ receipt_batch_root
→ epoch receipt_root
```

Tests:

```text
site_visit_receipt_hash_stable
hold_capture_release_receipt_hash_stable
duplicate_idempotency_not_double_included
receipt_amount_mutation_changes_hash
receipt_recipient_mutation_changes_hash
receipt_ordering_rule_is_deterministic
```

Do not let QuickChain generate receipts directly.

---

# 18. Recommended first accounting/reward root architecture

Accounting and rewards are lower priority than ledger roots but must be designed early.

Accounting root:

```text
UsageEventV1 list
→ event_hashes
→ event_root
→ aggregate_root
→ AccountingWindowV1
→ accounting_snapshot_root
```

Reward root:

```text
sealed accounting root
+ policy_hash
+ reward algorithm version
→ RewardManifestV1
→ reward_manifest_root
```

Tests:

```text
duplicate_usage_event_no_double_count
same_accounting_window_same_root
same_reward_input_same_reward_root
policy_change_changes_reward_root
rewarder_replay_no_double_issue
```

Important:

```text
ron-accounting is not balance truth.
svc-rewarder does not mutate ledger.
svc-wallet commits reward intents.
```

---

# 19. Consensus plan: do not start here

Consensus is where projects die.

Do not begin with Tendermint/HotStuff/Raft code.

Start with:

```text
single local checkpoint header
deterministic roots
offline signature verification
quorum verifier over a static signer set
```

Only after local roots are stable:

```text
CheckpointProposalV1
ValidatorSignatureV1
ValidatorSetV1
QuorumVerifier
ForkDetector
```

Still no network.

Then later:

```text
replicated committee
proposal broadcast
signature collection
fork evidence
```

Initial consensus research options:

```text
Raft-like beta committee:
  easier ops
  not BFT against malicious validators
  useful only for early controlled replication

Tendermint-like BFT:
  mature mental model
  good for accountable committees
  more complex

HotStuff-like BFT:
  modern pipelined BFT
  elegant but complex
```

Recommendation:

```text
Do not decide implementation yet.
Write the consensus evaluation document first.
For beta, start with offline quorum signatures over deterministic checkpoints.
```

---

# 20. Validator admission strategy

Initial validator model should be conservative:

```text
governance-approved
main RON Passport required
registered validator identity
capability token required
uptime/history tracked
manual beta admission
no anonymous alt validators
no public market
no automatic slashing until audited
```

Later:

```text
passport + reputation threshold
ROC bond
slashing evidence
validator rotation
broader validator market
```

Validator set facts should come from:

```text
svc-registry
```

Checkpoint must bind:

```text
validator_set_hash
```

---

# 21. Carrier/archive strategy

Carrier/archive nodes are a future jaw-drop feature because normal users can earn ROC by carrying proof chunks.

But do not implement early.

Design target:

```text
receipt batches
accounting snapshots
reward manifests
ledger transition chunks
state proof chunks
carrier assignment map
erasure metadata
```

Carrier proof flow:

```text
assigned chunk
→ random challenge
→ segment proof / Merkle proof
→ accounting event
→ rewarder computes reward
→ wallet commits payout
→ ledger receipt
```

Rules:

```text
carrier does not mint
carrier does not self-report reward truth
missing chunks reduce score
fraudulent proofs become challenge evidence
```

Open questions:

```text
random assignment source
geo balance
storage capacity weighting
reputation weighting
challenge frequency
reward formula
erasure coding scheme
```

---

# 22. Pruning strategy

Pruning is the promise and the trap.

Unsafe:

```text
delete history and trust current balance
```

Safe:

```text
raw history
→ Merkle roots
→ signed checkpoint
→ data availability proof
→ challenge window expires
→ normal nodes prune raw history
→ proof remains verifiable
```

Do not implement pruning until:

```text
receipt inclusion proof works
account proof works
state snapshot restore works
archive fallback works
carrier chunk recovery works
challenge window exists
```

Pruning disabled by default.

---

# 23. ROX/Solana anchor strategy

External anchoring is future only.

Good design:

```text
ROC stores facts.
ROX/Solana anchors compact proof that facts existed.
```

Bad design:

```text
Solana stores raw ROC history.
Solana becomes ROC source of truth.
Solana required for page load.
Bridge mints based on unverified internal claims.
```

Anchor payload later:

```text
quickchain_version
roc_chain_id
checkpoint_height
epoch_id
checkpoint_hash
previous_checkpoint_hash
state_root
receipt_root
accounting_root
reward_root
data_availability_root
validator_set_hash
policy_hash
produced_at_ms
```

Rules:

```text
anchor disabled by default
not a hot-path dependency
not required for internal ROC beta
not a replacement for QuickChain consensus
not added before audit
```

---

# 24. CrabLink role

CrabLink must remain a display and user-intent client.

Allowed:

```text
show QuickChain readiness
show checkpoint proofs later
show account proof later
show receipt inclusion proof later
copy proof JSON
navigate to proof routes
explain locked/unlocked milestones
```

Forbidden:

```text
create checkpoint
validate consensus as authority
sign validator messages
hold validator private keys
mutate wallet/ledger
create fake receipt proof
unlock paid content from cached proof alone
submit bridge transactions
```

Current QuickChain readiness page is correct because it is display-only. Keep that posture.

Future CrabLink route ideas:

```text
crab://quickchain
  readiness dashboard

crab://quickchain/checkpoint/<height>
  proof viewer only

crab://quickchain/receipt/<txid>
  receipt inclusion viewer only

crab://quickchain/account/<account>
  account proof viewer only, privacy-gated

crab://quickchain/challenge/<id>
  challenge evidence viewer only
```

All data should come through gateway/omnigate, not local invented truth.

---

# 25. Testing philosophy

QuickChain should be test-first.

Minimum test families:

```text
unit tests
integration tests
property tests
golden vectors
fuzz tests
loom tests
chaos tests
interop vectors
replay tests
migration tests
```

## 25.1 Unit tests

For:

```text
DTO validation
hash formatting
money parsing
canonicalization
Merkle root helpers
signature preimage generation
```

## 25.2 Property tests

For:

```text
conservation
non-negativity
sort-order independence
root determinism
duplicate idempotency rejection
checked arithmetic
```

## 25.3 Fuzz tests

For:

```text
checkpoint parser
receipt parser
proof parser
challenge parser
canonicalizer
anchor payload parser
```

## 25.4 Loom tests

For:

```text
wallet concurrent mutation
checkpoint proposal worker shutdown
bounded queue behavior
single-writer ledger paths
signature collection races later
```

## 25.5 Golden vectors

For:

```text
checkpoint_hash
receipt_hash
state_root
receipt_root
accounting_root
reward_root
validator_set_hash
policy_hash
anchor_payload_hash
```

Golden vectors are not optional.

## 25.6 Chaos tests later

For:

```text
validator down
validator equivocation
missing chunk
archive unavailable
registry freeze
clock skew
network partition
checkpoint proposal timeout
```

---

# 26. Metrics plan

Future metrics:

```text
quickchain_checkpoints_total{result}
quickchain_checkpoint_height
quickchain_epoch_duration_seconds
quickchain_receipts_per_epoch
quickchain_state_root_changes_total
quickchain_validator_signatures_total{validator,result}
quickchain_quorum_failures_total{reason}
quickchain_forks_detected_total
quickchain_challenges_total{type,result}
quickchain_pruned_epochs_total
quickchain_carrier_chunks_assigned_total
quickchain_carrier_proofs_total{result}
quickchain_archive_chunks_total
quickchain_anchor_submissions_total{chain,result}
quickchain_anchor_verify_total{chain,result}
```

Metrics rules:

```text
Do not put account IDs in labels.
Do not put txids in labels.
Do not put CIDs in labels.
Do not put user/passport IDs in labels.
Use bounded result/reason/type enums.
```

---

# 27. Governance and emergency controls

QuickChain beta must have manual governance controls.

Needed concepts:

```text
freeze checkpoints
pause validator signing
quarantine checkpoint
mark validator equivocation
rotate validator set
reject checkpoint proposal
publish challenge evidence
thaw after review
```

Important:

```text
operator may freeze
operator may not inject commits
operator may not rewrite history
validator set changes require quorum
signer set changes require quorum
```

All emergency actions must emit audit records.

---

# 28. Privacy questions we must not hand-wave

Open privacy questions:

```text
What account data is public?
Are receipt amounts public?
Are content IDs public inside receipts?
Can a site_visit receipt reveal browsing history?
How do alt passports avoid linkage?
Can creators prove payment without exposing all visitors?
Can users prove payment without exposing global account history?
Can account proofs be scoped?
What is shown in CrabLink?
What is stored in carrier chunks?
```

Do not claim privacy until protocol exists.

Early default:

```text
privacy claims = none
proof claims = exact and limited
CrabLink wording = cautious
```

---

# 29. Genesis strategy

QuickChain genesis must be signed, replayable, and boring.

Genesis input later:

```text
current ron-ledger replayed balances
current account nonces
current holds
current supply
current policy hash
current validator set
genesis timestamp
```

Genesis checkpoint:

```text
height = 0
previous_checkpoint_hash = explicit genesis marker
previous_state_root = empty root
new_state_root = replayed current state
receipt_root = empty root
accounting_snapshot_root = empty root
reward_manifest_root = empty root
validator_set_hash = genesis validator set
signatures = genesis committee signatures
```

Genesis must be:

```text
replayable
auditable
signed
documented
not silently mutable
```

Do not create genesis next session.

---

# 30. Suggested next-session command/test baseline

Before QuickChain work:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo check --workspace
```

Core tests to run during QuickChain preflight:

```bash
cargo test -p ron-proto
cargo test -p ron-ledger
cargo test -p svc-wallet
cargo test -p ron-accounting
cargo test -p svc-rewarder
cargo test -p ron-policy
cargo test -p svc-registry
cargo test -p ron-kms
cargo test -p ron-audit
```

If touching CrabLink readiness page:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
```

Later, once QuickChain crates exist:

```bash
cargo test -p ron-quickchain
cargo test -p ron-quickchain --features proptest
cargo fuzz build -p ron-quickchain
```

---

# 31. Recommended exact next-session opening

Use this mental prompt:

```text
We are beginning QuickChain, but only as future-gated preflight work.
Do not implement a live chain, consensus, validators, ROX, Solana, staking,
liquidity, public bridge, or any runtime settlement path.

First build the safety foundation:
- threat model
- crate ownership map
- canonicalization/root design
- acceptance gates
- no-go checklist
- optional ron-proto DTO skeleton behind disabled feature
- golden vectors only if deterministic
```

---

# 32. Suggested next-session first patch

## Patch QC-0A — QuickChain Preflight Docs

Preferred files:

```text
docs/quickchain/README.md
docs/quickchain/THREAT_MODEL.md
docs/quickchain/PHASE_0_PRE_FLIGHT.md
docs/quickchain/ROOTS_AND_CANONICALIZATION.md
docs/quickchain/CRATE_OWNERSHIP.md
docs/quickchain/ATTACK_CLASSES.md
docs/quickchain/NO_GO_LIVE_CHECKLIST.md
```

Acceptance:

```text
docs are clear
docs match QUICKCHAIN.MD
no runtime behavior changed
no chain logic added
no bridge/ROX/Solana added
cargo check still green
```

## Patch QC-0B — Optional DTO Skeleton

Only if QC-0A is done and green.

Potential files:

```text
crates/ron-proto/src/quickchain/mod.rs
crates/ron-proto/src/quickchain/types.rs
crates/ron-proto/src/quickchain/checkpoint.rs
crates/ron-proto/src/quickchain/receipt.rs
crates/ron-proto/src/quickchain/account.rs
crates/ron-proto/src/quickchain/proof.rs
crates/ron-proto/src/quickchain/challenge.rs
crates/ron-proto/tests/quickchain_dto_strict.rs
```

Acceptance:

```text
strict serde
no unknown fields
no floats
integer minor units only
hash validation
chain_id validation
no runtime service integration
cargo test -p ron-proto
```

---

# 33. What “jaw-dropping” means here

Jaw-dropping is not launching a token quickly.

Jaw-dropping is:

```text
a creator web where paid actions feel instant,
but every receipt can be proven;
where high-volume usage is batched,
but balances are replayable;
where history can be pruned,
but proofs survive;
where normal nodes can carry chunks and earn ROC,
but cannot mint;
where external anchoring is optional,
not a dependency;
where the UI shows truth,
not promises;
where the system is small enough to audit,
but powerful enough to scale.
```

The wow factor is:

```text
fast UX + cryptographic seriousness + content-addressed creator economy + safe pruning + carrier rewards
```

Not:

```text
speculative liquidity
bridge hype
token launch
fake decentralization
```

---

# 34. Final north-star for next session

Begin QuickChain like this:

```text
Slow is smooth.
Smooth is fast.
Roots before validators.
Receipts before consensus.
Determinism before distribution.
Proofs before pruning.
Internal ROC before external anchors.
Rust before glue code.
Tests before claims.
Truth before hype.
```

Next session should make QuickChain harder to accidentally implement wrong.

That is the correct first move.


### END NOTE - JUNE 9 2026 - 16:35 CST


### BEGIN NOTE - JUNE 10 2026 - 13:20 CST


I based these notes on the new `QUICKCHAIN_REVIEW_BUNDLE.MD`, which contains both the updated `QUICKCHAIN.MD` and the full `QUICKCHAIN_QC0A_COMBINED.MD` package. That bundle now says QC-0A-R1 is the active Phase 0 safety/preflight reference, while Phase 1 root-producing implementation is still blocked until locked vectors exist. 

The most useful next-session attachments are also listed inside the notes, but the key idea is: **attach the QuickChain review bundle plus a fresh focused `ron-proto` bundle**, not the entire universe unless needed. The current Rust codebundle is useful for repo shape, but it is large and generated as Rust-only source, so a focused crate bundle will be more efficient. 

# QuickChain Carryover Notes — Next Session

## 0. Files/docs to attach to the next session

Attach these first, in this order:

```text
1. QUICKCHAIN_REVIEW_BUNDLE.MD
```

This is the master QuickChain blueprint. It contains both:

```text
QUICKCHAIN.MD
QUICKCHAIN_QC0A_COMBINED.MD
```

It is the authoritative QuickChain reference going forward.

Attach this next if we are writing code:

```text
2. Fresh focused ron-proto bundle
```

Best form:

```text
workspace Cargo.toml
crates/ron-proto/Cargo.toml
crates/ron-proto/src/lib.rs
crates/ron-proto/src/id/content_id.rs
crates/ron-proto/src/econ/mod.rs
crates/ron-proto/src/error/*
crates/ron-proto/tests/*
any existing crates/ron-proto/src/quickchain/* if present
any existing crates/ron-proto/tests/quickchain* if present
```

Reason: the next safe implementation slice should touch only `ron-proto` if possible.

Attach these only if the next session needs them:

```text
3. CODECHECK.MD
4. CODECOMMENTS.MD
5. CODEBUNDLE_RS.md
```

`CODECHECK.MD` and `CODECOMMENTS.MD` matter if we are generating full files with RO headers. `CODEBUNDLE_RS.md` is useful as a broader Rust repo reference, but it is large. Prefer the focused `ron-proto` bundle for speed.

Do not attach CrabLink Tauri code unless the next session explicitly works on UI/display. QuickChain’s next safe slice is backend DTO/preflight work, not Tauri UI.

Do not attach full Tauri app bundle for the next QuickChain session unless the goal changes to display-only QuickChain readiness/status in CrabLink. That is not the next recommended step.

Optional but helpful terminal output to attach:

```text
cargo test -p ron-proto --all-targets
cargo clippy -p ron-proto --all-targets -- -D warnings
cargo fmt --check -p ron-proto
```

Also useful:

```text
find crates/ron-proto/src -maxdepth 3 -type f | sort
find crates/ron-proto/tests -maxdepth 2 -type f | sort
```

---

## 1. Current QuickChain status

QuickChain docs are now complete enough for Phase 0 reference use.

The current master file is:

```text
QUICKCHAIN_REVIEW_BUNDLE.MD
```

It contains:

```text
QUICKCHAIN.MD
QUICKCHAIN_QC0A_COMBINED.MD
```

The bundle has been reviewed and is ready to serve as the active QuickChain safety foundation.

Current accepted status:

```text
QC-0A-R1 docs: complete for active preflight reference
Threat model: complete enough for current phase
Canonicalization posture: defined
State tree candidate: selected for Phase 1 candidate
Concurrent holds model: tightened
Closed-hold compaction rule: defined
Test vector format: defined
No-go checklist: defined
Phase 1 root-producing implementation: still blocked
```

The important distinction:

```text
Docs foundation complete: yes
QuickChain implementation authorized: no
Root-producing code authorized: no
Validator/checkpoint/pruning/anchor code authorized: no
DTO-only scaffolding may be allowed: yes, if kept strict and safe
```

---

## 2. Master doctrine to preserve

QuickChain is future settlement infrastructure, not current runtime.

The doctrine remains:

```text
determinism before distribution
DTOs before roots
roots before validators
proofs before pruning
internal ROC before external anchors
```

Active mission still comes first:

```text
prove ROC as a fully internal token/accounting/value plane
```

The value loop remains:

```text
ron-proto econ DTOs
→ ron-ledger durable replayable truth
→ svc-wallet issue/transfer/burn/hold/capture/release/receipt
→ svc-storage/svc-gateway/omnigate paid enforcement
→ ron-accounting snapshots
→ svc-rewarder payout planning
→ wallet/ledger committed receipts
```

QuickChain must not skip ahead of this.

---

## 3. Hard forbidden scope for the next session

Do not write:

```text
root-producing code
state_root code
receipt_root code
hold_root code
checkpoint_hash code
validator code
signature/quorum code
fork choice code
pruning code
DA/challenge/archive runtime
external anchor code
bridge code
ROX code
Solana code
staking/liquidity/exchange-facing code
gateway ledger mutation
omnigate ledger mutation
rewarder direct ledger mutation
CrabLink chain authority
```

Do not create fake vectors.

Do not create placeholder hashes.

Do not write code that hashes live ledger state.

Do not introduce public settlement semantics.

Do not create any code path that treats QuickChain as active runtime.

---

## 4. What is allowed next

The next safe implementation slice is:

```text
ron-proto::quickchain DTO scaffolding only
```

Allowed scope:

```text
strict DTO shapes
schema constants
domain separator constants
validation helpers
serde deny_unknown_fields
integer minor-unit string validation
b3 lowercase validation
event-class enum validation
operation_id/idempotency_key/hold_id shape validation
vector status enum
test-vector metadata DTOs
unit tests for rejection behavior
```

Still forbidden inside this DTO-only slice:

```text
no hashing function that produces real roots
no state tree construction
no receipt root
no checkpoint root
no ledger replay
no service calls
no sockets
no async tasks
no persistence
no wallet mutation
no ledger mutation
no validator signatures
no external anchors
```

This keeps us inside `ron-proto` and avoids scope creep.

---

## 5. Recommended next-session crate focus

Work on only one crate first:

```text
crates/ron-proto
```

Only after `ron-proto` is clean should we consider a second crate.

Possible second crate later:

```text
ron-ledger
```

But `ron-ledger` should not be touched until DTOs and locked byte vectors are stable enough to justify integration planning. For the next session, prefer `ron-proto` only.

Reason:

```text
ron-proto = DTOs and validation
ron-ledger = economic truth and future replay/root work
```

Starting in `ron-ledger` too early risks accidentally creating implementation authority before vectors are locked.

---

## 6. Recommended next-session goal

The next session should aim for:

```text
QC-0B / DTO-only QuickChain preflight slice
```

Suggested outcome:

```text
crates/ron-proto/src/quickchain/ exists
QuickChain DTOs compile
validation helpers compile
unknown fields reject
invalid b3 rejects
invalid money strings reject
invalid event classes reject
invalid operation_id/idempotency_key/hold_id shapes reject
tests pass
clippy passes
no root/hash/checkpoint code exists
```

This is the safest next move after docs.

---

## 7. Suggested file plan for the next patch

Possible files to create or update:

```text
crates/ron-proto/src/quickchain/mod.rs
crates/ron-proto/src/quickchain/domain.rs
crates/ron-proto/src/quickchain/ids.rs
crates/ron-proto/src/quickchain/money.rs
crates/ron-proto/src/quickchain/event_class.rs
crates/ron-proto/src/quickchain/vector.rs
crates/ron-proto/src/quickchain/operation.rs
crates/ron-proto/src/quickchain/hold.rs
crates/ron-proto/src/lib.rs
```

Possible tests:

```text
crates/ron-proto/tests/quickchain_domain.rs
crates/ron-proto/tests/quickchain_ids.rs
crates/ron-proto/tests/quickchain_money.rs
crates/ron-proto/tests/quickchain_event_class.rs
crates/ron-proto/tests/quickchain_vector_dto.rs
crates/ron-proto/tests/quickchain_unknown_fields.rs
```

However, the next assistant should inspect the current `ron-proto` layout first. If some of these files already exist, update them instead of duplicating.

---

## 8. DTOs to prioritize first

Prioritize small, low-risk DTOs and helpers first.

### 8.1 Domain separator constants

Required current domains:

```text
quickchain.receipt.v1
quickchain.account-state.v1
quickchain.hold-state.v1
quickchain.receipt-root.v1
quickchain.state-root.v1
quickchain.accounting-root.v1
quickchain.reward-root.v1
quickchain.checkpoint.v1
```

Reserved supporting domains:

```text
quickchain.chain-params.v1
quickchain.validator-set.v1
quickchain.policy.v1
quickchain.data-availability-root.v1
quickchain.receipt-batch.v1
quickchain.accounting-window.v1
quickchain.reward-manifest.v1
quickchain.challenge-evidence.v1
quickchain.anchor-payload.v1
```

Important: constants only. No hashing implementation.

### 8.2 Money validation

Implement validation for integer minor-unit strings.

Allowed examples:

```text
"0"
"1"
"1000000"
```

Rejected examples:

```text
""
"01"
"+1"
"-1"
"1.0"
"1_000"
"1 ROC"
```

Also reject numeric JSON values if represented in DTOs where strings are required.

### 8.3 b3 validation

Accept only:

```text
b3:<64 lowercase hex>
```

Reject:

```text
bare hash
uppercase hex
too short
too long
wrong prefix
non-hex characters
```

Use existing `ContentId` helper if appropriate and already available in `ron-proto`.

### 8.4 Event class enum

Closed enum values:

```text
economic_receipt
metering
proof_eligible
ad_budgeted
analytics_only
```

Unknown values must reject.

No ambiguous event class.

### 8.5 Vector status enum

Allowed statuses:

```text
sketch
locked_bytes
locked_hash
```

Rules:

```text
sketch:
  human-readable only; cannot drive root/hash tests

locked_bytes:
  canonical_payload_utf8 and canonical_payload_hex required

locked_hash:
  preimage_hex and expected_b3 required
```

Do not compute expected hashes yet unless the session explicitly moves into locked vector generation and the bundle allows it. For now, validation only.

### 8.6 Operation/idempotency/hold IDs

Candidate shape from docs:

```text
operation_id: op_<32 lowercase hex>
hold_id: hold_<32 lowercase hex>
idempotency_key: visible ASCII, max 128 bytes, no secrets
```

Validation only.

No authority.

No persistence.

No uniqueness DB.

No replay engine.

---

## 9. Tests to require in the next session

Run at minimum:

```text
cargo fmt -p ron-proto
cargo test -p ron-proto --all-targets
cargo clippy -p ron-proto --all-targets -- -D warnings
```

If workspace impact seems small:

```text
cargo check --workspace
```

But to stay efficient, start with `ron-proto` only.

Expected test categories:

```text
unknown fields rejected
invalid money rejected
valid money accepted
invalid b3 rejected
valid b3 accepted
unknown event class rejected
valid event class roundtrips
invalid operation_id rejected
valid operation_id accepted
invalid hold_id rejected
valid hold_id accepted
idempotency_key bounds enforced
vector status validation works
locked_bytes requires canonical payload fields
locked_hash requires preimage_hex and expected_b3
```

---

## 10. Important implementation style

Use full paste-ready files or terminal scripts.

Do not use:

```text
git apply
unified diffs
patch blocks requiring git patch mechanics
```

Preferred patch style:

```text
cat > path <<'EOF'
...
EOF
```

or full file replacements.

Preserve RO headers.

Use safe Rust.

No unsafe.

No secrets.

No hidden authority.

Keep functions small.

Keep modules focused.

---

## 11. Suggested exact next-session prompt

Use this prompt to start the next session:

```text
We are continuing QuickChain. Please read QUICKCHAIN_REVIEW_BUNDLE.MD first. It is the master QuickChain blueprint and contains QUICKCHAIN.MD + QUICKCHAIN_QC0A_COMBINED.MD. QC-0A-R1 docs are complete enough for preflight reference, but Phase 1 root-producing code is still forbidden.

Goal for this session: implement the first DTO-only QuickChain slice in crates/ron-proto, touching only ron-proto if possible. No roots, no checkpoints, no validators, no pruning, no anchors, no live ledger hashing, no service calls, no sockets, no ledger mutation.

Please inspect the attached focused ron-proto bundle and provide full paste-ready files or direct terminal scripts. Include tests. Required gates:
cargo fmt -p ron-proto
cargo test -p ron-proto --all-targets
cargo clippy -p ron-proto --all-targets -- -D warnings
```

---

## 12. Recommended first patch contents

The first patch should probably include:

```text
1. quickchain module skeleton
2. domain separator constants
3. schema constants
4. money string validator
5. b3 validator or wrapper using existing ContentId
6. event class enum
7. vector status enum
8. operation_id/hold_id/idempotency validators
9. strict serde tests
```

Avoid implementing:

```text
AccountStateV1 root logic
HoldStateV1 root logic
Receipt hash logic
State tree logic
Checkpoint DTO with hash semantics
Validator signatures
External anchor payloads
```

A DTO struct is allowed only if it is clearly inert and not wired into any service as authority.

---

## 13. Suggested sequencing across sessions

### Session 1 — DTO-only `ron-proto`

Target:

```text
ron-proto::quickchain compiles
strict validation helpers exist
tests green
```

Crates touched:

```text
ron-proto only
```

### Session 2 — Locked byte vector planning

Target:

```text
docs/quickchain/vectors/ sketch files or locked_bytes draft plan
possibly ron-proto tests for canonical JSON bytes
no locked_hash unless exact bytes are settled
```

Crates touched:

```text
ron-proto only
docs/quickchain only
```

### Session 3 — Independent vector verifier planning

Target:

```text
small verifier test harness design
still no live ledger roots
```

Crates touched:

```text
ron-proto only
possibly a tiny test helper under ron-proto/tests
```

### Session 4 — Only after vectors mature

Target:

```text
discuss whether ron-ledger should receive inert export/replay interfaces
```

Crates touched:

```text
ron-ledger maybe
ron-proto maybe
```

Do not touch `ron-ledger` until DTO tests and vector format are stable.

---

## 14. Things to watch carefully

### 14.1 Do not accidentally create consensus fields

Avoid fields that look authoritative but are not frozen.

Examples to avoid too early:

```text
validator_signature
checkpoint_height authority
finalized flag
anchor txid
root hash outputs
committee quorum fields
```

### 14.2 Do not allow unknown fields

All root-adjacent DTOs should use:

```rust
#[serde(deny_unknown_fields)]
```

This is critical.

### 14.3 Do not use floats

All money must be strings.

No `f64`.

No decimal floats.

No `serde_json::Number` for money.

### 14.4 Do not use maps casually

Root-producing future payloads should avoid unordered maps.

If maps are needed, they must be converted into explicitly sorted arrays later.

### 14.5 Do not create fake hashes

Use examples only as examples, not golden values.

If a test uses `b3:111...`, it must only validate shape, not claim cryptographic truth.

No placeholder hash should be called a golden vector.

### 14.6 Do not wire QuickChain into services

No service should consume QuickChain DTOs as authority yet.

No gateway/omnigate/wallet/ledger/accounting/rewarder mutation path should be added.

---

## 15. Current architecture reminders

RustyOnions boundaries:

```text
ron-proto = DTOs
ron-ledger = economic truth
svc-wallet = mutation front-door
ron-accounting = snapshots, not balance truth
svc-rewarder = payout planning, not mutation
svc-storage = bytes by b3
svc-index = lookup/pointers
svc-gateway = public route boundary
omnigate = product hydration
ron-policy = declarative policy
```

CrabLink boundary:

```text
CrabLink Tauri is a client.
React owns display/user intent only.
Tauri Rust mediates native privilege.
CrabLink must not mutate ledger truth or invent balances/receipts.
```

QuickChain boundary:

```text
QuickChain is future settlement spine.
QC-0A-R1 is preflight reference.
DTO-only work is allowed.
Root-producing work is blocked.
```

---

## 16. Current mental model for QuickChain

QuickChain is not “add blockchain now.”

QuickChain is:

```text
future verifiable ROC settlement spine
receipt-first
epoch-settled
state-root verified
validator-executable later
bot-aware
proof-prunable only later
external-anchorable only later
```

Its first practical job is not to launch a public chain.

Its first practical job is to make ROC truth:

```text
strictly typed
canonically encoded
replayable
vector-tested
hard to fake
hard to mutate outside wallet/ledger
hard to confuse with raw engagement metrics
```

---

## 17. Definition of success for the next session

The next session is successful if:

```text
1. QUICKCHAIN_REVIEW_BUNDLE.MD was read first.
2. Only ron-proto was touched unless absolutely necessary.
3. QuickChain DTO-only scaffolding exists or is improved.
4. Validation helpers are strict.
5. Unknown fields reject.
6. Money strings reject invalid forms.
7. b3 values reject invalid forms.
8. event_class rejects unknown values.
9. operation_id/hold_id/idempotency_key shapes are checked.
10. Tests are included.
11. cargo fmt/test/clippy for ron-proto are green or errors are clearly documented.
12. No roots/checkpoints/validators/pruning/anchors/settlement code was introduced.
```

---

## 18. Things not to spend time on next session

Do not spend the next session on:

```text
CrabLink UI
Tauri readiness page
external settlement
Solana/ROX
validator design
Merkle implementation
checkpoint implementation
ledger integration
rewarder integration
carrier/archive reward logic
pruning
DA
public bridge
```

Those are future.

The efficient path is:

```text
1 crate: ron-proto
1 mission: strict QuickChain DTO/preflight scaffolding
1 outcome: tests green
```

---

## 19. Final carryover summary

We finished the QuickChain docs phase for now.

The current master artifact is:

```text
QUICKCHAIN_REVIEW_BUNDLE.MD
```

It should be attached to every future QuickChain session.

The next safe step is not blockchain implementation.

The next safe step is:

```text
strict ron-proto::quickchain DTO scaffolding + validation tests
```

Keep the work small, boring, testable, and confined to `ron-proto`.

No roots until vectors.

No validators until roots.

No pruning until proofs and DA/challenge/archive fallback.

No external anchors until internal ROC is proven.

No raw engagement payouts ever as protocol truth.

That is how QuickChain stays serious.



### END NOTE - JUNE 10 2026 - 13:20 CST



### BEGIN NOTE - JUNE 18 2026 - 19:20 CST

Absolutely. Here are repo-ready notes you can drop into the CrabLink repo.

The current codebundle confirms this was generated from `/Users/mymac/Desktop/crablink`, includes the Tauri app, Tauri Rust command bridge, Tauri docs, platform/core packages, and selected scripts, and shows the repo as dirty with **416 text files** in the bundle.  The underlying Tauri IDB boundary is also clear: CrabLink displays backend-derived truth, `svc-gateway` is the public route boundary, `svc-wallet` is the mutation front-door, and `ron-ledger` is durable truth. 

Paste this into something like:

```text
docs/tauri/QUICKCHAIN_PHASE0_NOTES.md
```

or into your CrabLink repo notes file.

# CrabLink Tauri QuickChain Phase-0 / QC-0A Notes

RO:WHAT — Documents the CrabLink Tauri QuickChain Phase-0 / QC-0A client-boundary work, what changed, why it changed, what is now guarded, and what remains deferred.

RO:WHY — CrabLink Tauri is the primary client/product surface for crab:// links, paid access, b3 assets, RON Passports, receipts, creator pages, and future facets. During QuickChain Phase-0, the client must become safer and more explicit without becoming chain authority, wallet authority, ledger authority, settlement authority, bridge authority, or paid-cache authority.

RO:INTERACTS — CrabLink Tauri React app, Tauri Rust command bridge, TypeScript/JavaScript adapters, route registry, QuickChain readiness page, local catalog, recent receipt display cache, paid asset viewers, `svc-gateway`, `omnigate`, `svc-wallet`, `ron-ledger`, `svc-storage`, `svc-index`, `ron-accounting`, `svc-rewarder`.

RO:INVARIANTS — CrabLink Tauri is display/user-intent only. Backend services own truth. `svc-wallet` remains the economic mutation front-door. `ron-ledger` remains durable balance truth. Receipt cache is display-only. Offline cache cannot unlock paid content alone. QuickChain remains future settlement/proof infrastructure, not active CrabLink runtime.

RO:SECURITY — No roots, checkpoints, validators, settlement, bridge, ROX, Solana, staking, liquidity, external settlement, fake balances, fake receipts, silent spend, cache-backed paid unlock, direct ledger mutation, direct wallet mutation, raw spend authority in React/TypeScript, shell/eval/run/native escape hatches, or local cache becoming entitlement truth.

RO:TEST — `scripts/dev-quickchain-tauri-park.sh`, `scripts/check-tauri.sh`, `npm run check`, `npm run check:quickchain-boundary`, `npm run check:quickchain-paid-cache-boundary`, `npm run check:quickchain-readiness-boundary`, `npm run build`, `npm run check:rust:mac-media`.

---

## 1. Summary

This QuickChain Phase-0 / QC-0A CrabLink pass hardened the Tauri client boundary.

The purpose was not to implement QuickChain runtime behavior.

The purpose was to prove that CrabLink Tauri can safely participate in the future QuickChain/ROC value-plane as a client without becoming the value-plane itself.

The work added automated checks and documentation around three major client risks:

```text
1. Tauri bridge / command authority drift.
2. Paid receipt/cache/offline-cache authority drift.
3. QuickChain readiness page becoming fake chain authority.
```

The result is that CrabLink Tauri can now show QuickChain readiness, paid receipt state, and local proof memory while preserving the correct authority split:

```text
React:
  display, forms, route rendering, user intent

TypeScript/JavaScript adapters:
  typed calls, gateway requests, UI-safe DTO plumbing

Tauri Rust:
  native privilege boundary, bounded commands, media/file helpers

svc-gateway:
  public service boundary

omnigate:
  hydration/enforcement surface

svc-wallet:
  economic mutation front-door

ron-ledger:
  durable balance truth

local receipt/cache/catalog:
  display and convenience only
```

The client remains a client.

---

## 2. High-level status

Current CrabLink Tauri QuickChain Phase-0 status:

```text
CrabLink Tauri QC-0A boundary automation: GREEN
CrabLink Tauri paid/cache boundary: GREEN
CrabLink Tauri readiness page boundary: GREEN
CrabLink Tauri Vite build: GREEN
CrabLink Tauri Rust macOS media check: GREEN
CrabLink Tauri Phase-0 client-boundary slice: parkable
Estimated CrabLink Tauri slice completion: ~94-97%
Best estimate: ~96%
```

This percentage applies only to the CrabLink Tauri QC-0A client-boundary slice.

It does not mean full QuickChain is 96%.

Full QuickChain still needs later work in `ron-proto`, `ron-ledger`, service roots/proofs, checkpoint/root logic, validators/committee phases, DA/archive/challenge posture, pruning safety, and eventually external anchoring if explicitly approved later.

---

## 3. What changed

### 3.1 Added `docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md`

This doc defines the top-level QuickChain client boundary for CrabLink Tauri.

It records that:

```text
CrabLink Tauri is not QuickChain authority.
Local receipt caches are display-only.
Offline cache cannot unlock paid content alone.
```

The doc exists to prevent CrabLink from drifting into forbidden roles such as:

```text
QuickChain runtime
root producer
checkpoint producer
validator
settlement authority
bridge authority
ROX integration
Solana integration
staking
liquidity
external settlement
wallet truth
ledger truth
receipt truth
paid unlock authority
```

Why this matters:

CrabLink needs to expose future QuickChain readiness and ROC receipt status to users, but the client must never become a root producer, validator, bridge, or economic authority. The backend value-plane remains authoritative.

---

### 3.2 Added `scripts/check-quickchain-client-boundary.mjs`

This script scans the CrabLink Tauri source tree for boundary drift.

It checks for:

```text
direct Tauri invoke usage outside known/allowed files
forbidden Tauri command names
shell/plugin-shell creep
raw/native/shell/execute/eval/run-style authority naming
QuickChain root/checkpoint/validator/settlement command names
ROX/Solana/bridge/staking/liquidity command names
ledger/wallet mutation command names
suspicious localStorage/sessionStorage authority keys
Rust command names that imply forbidden authority
process spawning outside bounded media modules
required QuickChain client-boundary doc phrases
```

The scanner is intentionally conservative.

Its role is not to prove full correctness. Its role is to catch obvious authority creep before it becomes normal app structure.

Important allowed posture:

```text
Tauri can still expose small, typed, allowlisted commands.
Media modules may still use bounded FFmpeg/process helpers where already expected.
Gateway-first adapters are allowed.
Display-only readiness and receipt views are allowed.
```

Forbidden posture:

```text
Tauri command names that imply QuickChain authority.
Raw shell/native/eval/execute/run escape hatches.
Client-side wallet or ledger mutation.
Client-side roots/checkpoints/validators.
Bridge/ROX/Solana/staking/liquidity behavior.
```

---

### 3.3 Added `docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md`

This doc defines the paid-access, receipt-cache, and offline-cache boundary.

It states the correct paid flow:

```text
prepare / quote
→ explicit user confirmation
→ backend wallet path
→ backend receipt/access response
→ backend storage/gateway/omnigate paid enforcement
→ unlock/render
→ display-only receipt cache
→ balance refresh from backend
```

It explicitly forbids local/cache-only unlock logic such as:

```text
local UI says paid=true
local cache says paid=true
receipt-shaped JSON exists in localStorage
recent receipt cache contains an item
offline cache has bytes
manifest says paid=true
index pointer exists
policy allow decision exists
therefore unlock paid content
```

Key invariant:

```text
Receipt display cache is display-only.
Cached receipt cannot unlock paid content.
Offline cache cannot create receipt, balance, or entitlement truth.
```

Why this matters:

CrabLink has local receipt panels, local catalog display, offline/public cache concepts, asset viewers, and paid content flows. These are useful UX features, but they must never become wallet truth, receipt truth, entitlement truth, or paid access truth.

---

### 3.4 Added `scripts/check-quickchain-paid-cache-boundary.mjs`

This script scans the Tauri app source for paid/cache authority drift.

It checks for:

```text
cache-only paid unlock naming
receipt-cache entitlement naming
local/session storage keys that look like paid/wallet/ledger/access truth
balance-from-cache naming
receipt-from-cache fabrication naming
allow_paid_unlock_from_cache=true style flags
paid offline entitlement shortcuts
fakeReceipt / fakeBalance style helpers
cache/localStorage/sessionStorage authorizing paid access
receipt cache becoming finality/wallet/ledger/balance/entitlement truth
offline/cache paths spending, publishing, mutating wallet/ledger/index, creating receipts, or setting balances
```

It also requires the receipt cache file to retain display-only language.

The intended allowed state is:

```text
recentReceipts can display recent backend-returned receipts.
localCatalog can show local proof memory.
offline cache can help render verified public/cached objects.
```

The forbidden state is:

```text
recentReceipts cannot unlock paid content.
localCatalog cannot create entitlement.
offline cache cannot spend.
offline cache cannot publish.
offline cache cannot mutate wallet.
offline cache cannot mutate ledger.
offline cache cannot mutate index.
offline cache cannot create receipt.
offline cache cannot set balance.
```

Why this matters:

This preserves the core ROC rule:

```text
backend receipt/access response unlocks paid content,
not local cache shape.
```

---

### 3.5 Added `docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md`

This doc defines the boundary for the `crab://quickchain` readiness dashboard.

It records that the readiness page is allowed to show:

```text
local proof memory
local receipt counts
backend-derived receipt summaries
missing prerequisite gates
locked/future milestones
manual test commands
truth-boundary notes
developer JSON previews
```

But the page must remain display-only.

It must not:

```text
produce QuickChain roots
produce checkpoint hashes
produce state roots
produce receipt roots
produce accounting roots
produce reward roots
claim finality
claim settlement
claim validator status
mutate wallets
mutate ledgers
unlock paid content
authorize spend
derive balances
fabricate receipts
fabricate replay proof
fabricate accounting proof
fabricate reward proof
```

Allowed local sources for display:

```text
readLocalCatalog
subscribeLocalCatalog
readRecentReceipts
subscribeRecentReceipts
```

These sources are display memory only.

They are not proof of:

```text
wallet truth
ledger truth
balance truth
entitlement truth
finality
settlement
```

Why this matters:

The QuickChain readiness page is useful because it makes progress and missing gates visible. However, readiness UX can easily become misleading if it starts showing fake proofs, fake roots, fake finality, or fake economic status. This doc locks the page as a display dashboard only.

---

### 3.6 Added `scripts/check-quickchain-readiness-boundary.mjs`

This script scans the QuickChain readiness page and its supporting doc/CSS expectations.

It checks that the readiness page retains key phrases and allowed posture:

```text
CrabLink QuickChain readiness dashboard
display-only
no chain logic
no ROX/Solana
no wallet mutation
no fake replay/accounting/reward proofs
readLocalCatalog
subscribeLocalCatalog
readRecentReceipts
subscribeRecentReceipts
```

It blocks:

```text
direct Tauri invoke from readiness page
callTauri calls from readiness page
localStorage/sessionStorage writes from readiness page
paid/wallet execution client imports
root/checkpoint producer naming
validator/bridge/ROX/Solana/staking/liquidity client naming
mutateWallet / mutateLedger / authorizeSpend helpers
unlockPaidFromCache helpers
deriveBalanceFromCache helpers
fabricateReceipt / fakeReceipt / fakeBalance helpers
local truth/finality/entitlement authority claims
```

Why this matters:

The readiness page should help the developer and user understand QuickChain progress, not become a fake chain console.

---

### 3.7 Updated `apps/crablink-tauri/package.json`

The Tauri app `check` script was expanded to include the QuickChain boundary gates before build and Rust check.

The intended check chain is:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
```

New/expected scripts:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:rust:mac-media
park:quickchain
```

Why this matters:

QuickChain client-boundary regressions now fail before the app build is considered green.

This makes the safety doctrine executable.

---

### 3.8 Updated `scripts/check-tauri.sh`

The root Tauri check script was updated so the standard Tauri verification path runs:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
```

Why this matters:

Developers do not need to remember each individual QuickChain scanner. The normal Tauri check path now includes the relevant client-boundary gates.

---

### 3.9 Added `docs/tauri/QUICKCHAIN_PHASE0_STATUS.md`

This doc records final CrabLink Tauri QC-0A status.

It states that the slice is parkable when:

```text
scripts/dev-quickchain-tauri-park.sh
```

passes.

It records the current status estimate:

```text
CrabLink Tauri QuickChain Phase-0 client boundary: 94-97%
Best current estimate: 96%
```

It also documents that this estimate applies only to the CrabLink Tauri slice, not full QuickChain.

The doc explicitly says full QuickChain remains future work because these are not implemented here:

```text
canonical roots
locked vectors
state proofs
validators
DA/archive/challenge
pruning
public anchors
external settlement
```

Why this matters:

This prevents future readers from mistaking “CrabLink client boundary is parked” for “QuickChain is implemented.”

---

### 3.10 Added `scripts/dev-quickchain-tauri-park.sh`

This is the final parking gate for the CrabLink Tauri QC-0A slice.

It verifies:

```text
required docs exist
required scanners exist
check-tauri.sh exists
package.json exists
required boundary phrases exist
check-tauri wiring includes QuickChain gates
package script wiring includes QuickChain gates
shell scripts pass bash -n
Node scanner scripts pass node --check
QuickChain client-boundary scanner passes
QuickChain paid/cache scanner passes
QuickChain readiness scanner passes
Vite production build passes
Tauri Rust macOS media check passes
final anti-scope sanity checks pass
```

Expected final marker:

```text
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

Why this matters:

It provides one command that proves the CrabLink Tauri QuickChain Phase-0 client-boundary slice is safe to leave parked.

---

## 4. Terminal proof from this session

The following checks were run and passed from the CrabLink repo:

```text
node scripts/check-quickchain-readiness-boundary.mjs
scripts/check-tauri.sh
```

Observed successful output included:

```text
QuickChain readiness boundary check passed.

QuickChain client-boundary check passed.
Scanned 318 CrabLink Tauri source files.

QuickChain paid/cache boundary check passed.
Scanned 318 CrabLink Tauri source files.

QuickChain readiness boundary check passed.

vite build passed.
313 modules transformed.

cargo check --manifest-path src-tauri/Cargo.toml passed.
Finished dev profile.
```

This proves the current boundary scanners, frontend build, and Tauri Rust check are green.

---

## 5. What is now protected

### 5.1 Tauri command bridge drift

Protected against:

```text
raw invoke sprawl
forbidden Tauri command names
shell/eval/run/native command creep
QuickChain command authority names
ledger/wallet mutation command names
bridge/ROX/Solana/staking/liquidity names
```

Allowed:

```text
small typed commands
gateway-first calls
bounded media commands
diagnostics/status/health
display-only readiness paths
```

---

### 5.2 Paid/cache drift

Protected against:

```text
cache-only paid unlock
cached receipt entitlement
localStorage paid truth
sessionStorage paid truth
fake receipts
fake balances
cache-created receipts
cache-derived balance
offline paid entitlement shortcuts
```

Allowed:

```text
display-only recent receipts
display-only local catalog
verified public offline cache
backend-derived receipt display
explicit paid action UX
```

---

### 5.3 QuickChain readiness drift

Protected against:

```text
readiness page producing roots
readiness page producing checkpoints
readiness page claiming settlement
readiness page claiming validator status
readiness page mutating wallet/ledger
readiness page faking replay/accounting/reward proofs
readiness page direct Tauri invoke
readiness page paid/wallet execution client imports
```

Allowed:

```text
readiness dashboard
missing gate display
locked future milestone display
local proof memory display
backend receipt summary display
developer JSON preview
manual test command display
```

---

### 5.4 Build/check path drift

Protected by:

```text
npm run check
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
```

These now ensure boundary checks are not optional side tasks.

---

## 6. What did not change

No QuickChain runtime was added.

No root-producing code was added.

No checkpoint-producing code was added.

No validator code was added.

No bridge code was added.

No ROX code was added.

No Solana code was added.

No staking code was added.

No liquidity code was added.

No external settlement code was added.

No wallet mutation was moved into CrabLink.

No ledger mutation was moved into CrabLink.

No paid content unlock was moved into local cache.

No receipt cache was promoted into entitlement truth.

No local catalog was promoted into ownership truth.

No offline cache was promoted into paid access truth.

No client-side fake balance or fake receipt path was added.

This was intentionally a guardrail and documentation pass, not a feature-expansion pass.

---

## 7. Why this was the correct CrabLink work for QuickChain Phase-0

CrabLink Tauri is the user-facing client. That makes it high-risk for accidental authority creep.

Without this pass, future development could accidentally blur the boundaries:

```text
readiness UI could start looking like chain finality
receipt cache could start acting like entitlement
offline cache could start acting like paid unlock
Tauri commands could grow raw native authority
React state could drift into wallet/balance truth
```

The goal of this pass was to prevent those mistakes before later QuickChain phases add more formal roots/proofs.

This follows the doctrine:

```text
backend owns truth
CrabLink displays truth
Tauri mediates native privilege
QuickChain is future settlement/proof infrastructure
ROC remains internal first
no external settlement creep
```

---

## 8. Updated operational commands

### Standard CrabLink Tauri check

```bash
scripts/check-tauri.sh
```

This should run the QuickChain boundary checks, Vite build, and Tauri Rust check.

### Individual QuickChain boundary checks

```bash
node scripts/check-quickchain-client-boundary.mjs
node scripts/check-quickchain-paid-cache-boundary.mjs
node scripts/check-quickchain-readiness-boundary.mjs
```

### App package check

```bash
cd apps/crablink-tauri
npm run check
```

### Final parking gate

```bash
scripts/dev-quickchain-tauri-park.sh
```

### Regenerate codebundle

```bash
scripts/make_codebundle.sh
```

---

## 9. Current completion estimate

For this CrabLink Tauri slice:

```text
CrabLink Tauri QC-0A client-boundary work: ~94-97%
Best estimate: 96%
```

Reason:

```text
core boundary docs added
core boundary scanners added
package check flow wired
check-tauri wired
readiness page guarded
paid/cache boundary guarded
client command boundary guarded
Vite build green
Tauri Rust check green
parking gate added
```

Remaining small items:

```text
run final parking gate after latest patch
regenerate codebundle after parking gate
drop these notes into repo
carry forward notes for next QuickChain phase
```

---

## 10. Relationship to full QuickChain completion

This CrabLink pass moves the overall QuickChain project forward because it locks the client boundary.

However, it does not complete full QuickChain.

After the next full crate-pair phase, estimated status would be:

```text
QC-1A Prep phase: 100%
internal ROC / QuickChain functional beta path: ~75-82%
full QuickChain project: ~55-65%
best full QuickChain estimate after next phase: ~60%
```

The next crate-pair phase should focus on backend determinism and service-boundary preservation, not client authority.

---

## 11. Next crate-pair order after CrabLink parks

Recommended next-phase order:

```text
0. ron-proto + ron-ledger
1. svc-wallet + ron-accounting
2. svc-rewarder + svc-storage
3. svc-gateway + omnigate
4. svc-index + ron-policy
5. CrabLink Tauri + client adapters
```

CrabLink Tauri should move to the end of the next phase as a final smoke/client-boundary verification target.

It should not be the first coding target again unless a regression is found.

---

## 12. Next technical focus

The next phase should be called:

```text
QC-1A Prep: Canonical Inputs + Ledger Replay + Service Boundary Preservation
```

It should not be called:

```text
Phase 1 chain runtime
validator phase
settlement phase
bridge phase
```

The next safe backend focus is:

```text
ron-proto:
  canonical DTO hardening
  unknown-field rejection
  b3 lowercase validation
  integer minor-unit validation
  operation/event-class DTO checks

ron-ledger:
  deterministic replay hardening
  account sequence invariants
  idempotency invariants
  hold lifecycle invariants
  snapshot input preparation
```

Still forbidden:

```text
fake roots
placeholder hashes
validators
settlement
bridge
external anchors
ROX
Solana
staking
liquidity
```

---

## 13. Important future regression checklist

Before approving future CrabLink Tauri work, verify:

```text
[ ] Does npm run check pass?
[ ] Does scripts/check-tauri.sh pass?
[ ] Does scripts/dev-quickchain-tauri-park.sh pass?
[ ] Does the app still call gateway-first paths?
[ ] Does React avoid wallet/ledger truth?
[ ] Does Tauri avoid hidden service logic?
[ ] Are receipts display-only unless backend-derived?
[ ] Can cached receipts unlock paid content? Must be no.
[ ] Can offline cache unlock paid content alone? Must be no.
[ ] Can localCatalog become ownership truth? Must be no.
[ ] Can recentReceipts become entitlement truth? Must be no.
[ ] Are there new direct invoke call sites? If yes, are they intentionally allowlisted?
[ ] Are there shell/eval/run/native/raw command names? Must be no.
[ ] Are there QuickChain root/checkpoint/validator command names? Must be no.
[ ] Are there ROX/Solana/bridge/staking/liquidity references in active runtime? Must be no.
[ ] Does crab://quickchain remain display-only?
[ ] Does the app avoid fake balances and fake receipts?
[ ] Does paid access still require backend receipt/access response?
```

---

## 14. Explicit anti-scope retained

CrabLink Tauri must not implement any of the following in this phase:

```text
QuickChain runtime
root producer
checkpoint producer
validator
committee node
settlement authority
bridge authority
external anchor authority
ROX runtime
Solana runtime
staking
liquidity
exchange-facing logic
client-side wallet authority
client-side ledger truth
client-side receipt minting
client-side balance truth
client-side paid unlock from cache
offline paid entitlement
cache-backed paid access
silent spend
fake receipt
fake balance
```

---

## 15. Final plain-English summary

This CrabLink Tauri QuickChain Phase-0 pass made the client safer.

It did not make CrabLink into QuickChain.

It made CrabLink prove that it knows it is only the client.

The app can display readiness, receipts, local catalog state, and paid-access status, but it cannot create economic truth.

The local cache can help display things, but it cannot unlock paid content.

The receipt cache can help users review receipts, but it cannot authorize anything.

The readiness page can show progress, but it cannot create roots, checkpoints, validators, settlement, or finality.

The Tauri command bridge can run typed native commands, but it cannot become a shell/eval/raw/native authority surface.

The backend remains the source of truth.

This slice is now ready to park after `scripts/dev-quickchain-tauri-park.sh` passes.


### END NOTE - JUNE 18 2026 - 19:20 CST



### BEGIN NOTE - JUNE 19 2026 - 17:45 CST

The green result matches the intended CrabLink Tauri QC-0A target: client-boundary hardening, not QuickChain runtime implementation. The prior carryover defined this pass as display-only, gateway-first, backend-truth-derived, typed, redacted, bounded, non-authoritative, non-mutating, non-settlement, non-validator, and non-bridge.  The Tauri IDB also says the app is the client, the services/wallet/ledger/gateway keep their separate authority, and the boundaries must not blur. 

Here are the paste-ready CrabLink notes:

### BEGIN NOTE - JUNE 19 2026 - CrabLink Tauri QuickChain QC-0A Client-Boundary Pass

# CrabLink Tauri / QuickChain Phase-0 Notes

## Session focus

```text
CrabLink Tauri + client adapters
```

## Phase

```text
QuickChain QC-0A / Phase-0 safety-preflight and boundary-hardening
```

## Status

```text
GREEN AND PARKED
```

The CrabLink Tauri QuickChain QC-0A client-boundary slice has passed the parking gate:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Latest successful terminal output proved:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
Vite production build passed.
Tauri Rust mac-media cargo check passed.
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

This means the current CrabLink Tauri client-boundary slice is now parkable.

---

# 1. What this pass was supposed to prove

This pass was not intended to add QuickChain runtime behavior.

It was intended to prove that CrabLink Tauri remains:

```text
display-only
gateway-first
backend-truth-derived
typed
redacted
bounded
non-authoritative
non-mutating
non-settlement
non-validator
non-bridge
```

The pass specifically guarded against CrabLink Tauri becoming:

```text
wallet authority
ledger authority
receipt authority
balance authority
paid-unlock authority
QuickChain root authority
checkpoint authority
validator authority
settlement authority
bridge authority
staking/liquidity authority
ROX/Solana/external-settlement authority
```

The correct boundary remains:

```text
React:
  display and user intent only

TypeScript/platform adapters:
  typed calls, request shaping, command allowlist, error redaction, client orchestration

Tauri Rust:
  native privilege bridge, bounded command handlers, gateway calls, media/file/cache helpers

RustyOnions backend:
  paid truth, wallet truth, ledger truth, policy truth, storage/index truth, receipt truth
```

---

# 2. Important files changed or hardened

## 2.1 Central Tauri invoke adapter

Added or hardened:

```text
apps/crablink-tauri/src/platform/tauriPlatform.js
```

Purpose:

```text
central typed Tauri invoke adapter
```

This file now owns the frontend-side Tauri command boundary:

```text
ALLOWED_TAURI_COMMANDS
isAllowedTauriCommand()
callTauri()
normalizeCommandName()
redactForDisplay()
```

Key protections:

```text
React/product code should call callTauri(), not raw invoke().
Tauri command names are allowlisted.
Forbidden command names are rejected.
Errors are redacted before display.
Command strings are normalized before use.
```

Forbidden command/name patterns include:

```text
raw_*
run
execute
eval
shell
native
quickchain_root
quickchain_state
quickchain_receipt
quickchain_checkpoint
quickchain_validator
quickchain_settle
quickchain_settlement
checkpoint
validator
settle
settlement
bridge
staking
liquidity
rox
solana
mint
issue
transfer
burn
hold
capture
release
unlock_paid_from_cache
```

Important nuance:

Some product flows may indirectly reach backend wallet/payment paths through approved gateway/backend APIs after explicit user confirmation. That is allowed.

What is forbidden is client-side ownership of wallet, ledger, receipt, balance, paid unlock, root, checkpoint, validator, bridge, or settlement authority.

---

## 2.2 Raw invoke replacement

Updated scattered frontend raw Tauri invoke use to route through:

```text
callTauri()
```

Affected areas included app/platform/shared API/media/product paths such as:

```text
apps/crablink-tauri/src/App.jsx
apps/crablink-tauri/src/TauriScaffoldApp.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/AssetPaidAudioPlayer.jsx
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/api/gatewayClient.js
apps/crablink-tauri/src/pages/make/makeLinkedVideoPreviewFetch.js
apps/crablink-tauri/src/shared/api/musicAssetClient.js
apps/crablink-tauri/src/shared/api/podcastAssetClient.js
apps/crablink-tauri/src/shared/api/videoAssetClient.js
```

The desired pattern is now:

```text
React component
→ shared API / adapter function
→ platform abstraction
→ allowlisted Tauri command or gateway client
→ backend-derived result
→ display-only state
```

This prevents UI files from accumulating direct native privilege calls.

---

## 2.3 QuickChain readiness page label hardening

Updated:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

The readiness label was made explicit:

```text
QC-0A preflight readiness
```

Reason:

A percentage/status shown in the QuickChain UI must be understood as project-readiness / preflight status, not live chain state.

Acceptable meaning:

```text
boundary checks
future Phase-1 readiness posture
docs/client-preflight progress
non-authority status
```

Forbidden implied meaning:

```text
chain live
settled
finalized
validator online
checkpoint produced
root produced
bridge active
external anchor active
balance finalized
receipt finalized
```

---

# 3. New or hardened scripts

## 3.1 Client boundary scanner

Added:

```text
scripts/check-quickchain-client-boundary.mjs
```

Purpose:

```text
Proves React/TS/Tauri command surfaces do not drift into QuickChain, wallet, ledger, settlement, or arbitrary native authority.
```

The scanner verifies:

```text
required QuickChain boundary docs exist
frontend command allowlist exists
registered Tauri commands match frontend allowlist
forbidden command names are absent
raw Tauri invoke imports are blocked outside the platform adapter
window.__TAURI__.invoke-style raw access is blocked
local/session storage does not store wallet secret / private key / seed phrase / spend authority / current balance / paid entitlement truth
```

This is a structural guardrail against the client becoming authority.

---

## 3.2 Paid/cache boundary scanner

Added:

```text
scripts/check-quickchain-paid-cache-boundary.mjs
```

Purpose:

```text
Proves local receipt/cache helpers remain display-only and cannot unlock paid content by themselves.
```

The scanner verifies the intended paid path:

```text
quote / prepare
→ explicit user confirmation
→ backend wallet path
→ backend receipt/access response
→ backend paid enforcement
→ unlock/render
→ display-only receipt cache
→ balance refresh from backend
```

It guards against forbidden shortcuts such as:

```text
local UI says paid=true
local cache says paid=true
receipt-shaped JSON exists in local storage
recent receipt cache contains an item
offline cache has bytes
manifest says paid=true
index pointer exists
policy allow decision exists
therefore unlock paid content
```

The important boundary is:

```text
receipt cache = display-only
offline cache = convenience/rendering only
backend wallet/ledger/gateway/omnigate = paid truth
```

---

## 3.3 Readiness boundary scanner

Added:

```text
scripts/check-quickchain-readiness-boundary.mjs
```

Purpose:

```text
Keeps crab://quickchain / QuickchainReadinessPage as display-only project readiness, not fake chain state.
```

The scanner verifies that the readiness page and docs stay explicit about:

```text
display-only status
no chain logic
no ROX/Solana
no wallet mutation
no fake replay/accounting/reward proofs
QC-0A preflight readiness
```

It blocks readiness-page drift into:

```text
Tauri invoke
gateway/wallet mutation helpers
live chain/finality/validator/bridge claims
fake chain height
fake checkpoint/root/receipt/account-root status
```

---

## 3.4 Parking gate

Added:

```text
scripts/dev-quickchain-tauri-park.sh
```

Purpose:

```text
Single parking command for the CrabLink Tauri QuickChain QC-0A client-boundary pass.
```

The script delegates through:

```text
scripts/check-tauri.sh
```

The purpose is to avoid duplicate exhaustive runs.

Important workflow rule:

```text
Do not run the individual QuickChain checks and then also run the park script unless files changed between runs.
```

The park script already runs the delegated check path.

---

# 4. Existing package/check path now proven

The Tauri app package scripts proved:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
```

The top-level parking command proved:

```text
scripts/dev-quickchain-tauri-park.sh
```

The final green marker was:

```text
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

---

# 5. What is now protected

## 5.1 React boundary

React remains:

```text
display
route rendering
user intent collection
confirmation UI
backend-derived status display
backend-derived receipt display
backend-derived balance display
```

React must not become:

```text
wallet truth
ledger truth
balance truth
receipt truth
paid entitlement truth
QuickChain runtime truth
root/checkpoint/validator/finality truth
native command authority
```

## 5.2 TypeScript/platform adapter boundary

TypeScript/platform adapters remain:

```text
typed request wrappers
gateway/client orchestration
display-safe normalization
redacted error handling
Tauri command allowlist enforcement
```

They must not become:

```text
secret storage
private key storage
spend authority
receipt fabricators
balance fabricators
paid unlock fabricators
QuickChain state machines
root/checkpoint producers
validator or bridge logic
```

## 5.3 Tauri Rust bridge boundary

Tauri Rust commands remain:

```text
small
typed
allowlisted
bounded
redacted
source-labeled
policy-aware
feature-gated
testable
```

They must not become:

```text
arbitrary shell/native executor
wallet mutation authority
ledger mutation authority
QuickChain root/checkpoint/validator authority
settlement/bridge/staking/liquidity authority
cache-only paid unlock authority
```

## 5.4 Paid/cache boundary

Receipt display cache remains:

```text
display-only
backend-derived
review/history convenience
not entitlement
not balance truth
not receipt truth
not ledger truth
not wallet truth
not finality
```

Offline cache remains:

```text
verified rendering convenience
b3 integrity helper
not paid access truth
not receipt truth
not balance truth
not wallet/ledger mutation authority
not live name truth
```

## 5.5 QuickChain readiness UI boundary

QuickChain UI remains:

```text
docs/status/readiness display
QC-0A preflight status
future-facing labels
non-runtime boundary explanation
```

It does not claim:

```text
live chain
settlement
finality
validators
checkpoints
roots
bridge
ROX
Solana
external anchor
paid access
wallet balance truth
receipt truth
```

---

# 6. What this pass does not prove

This pass does not prove or implement:

```text
QuickChain runtime
canonical root production
account state roots
receipt roots
hold roots
epoch roots
checkpoint production
validator execution
committee replication
distributed consensus
challenge windows
DA/archive fallback
pruning safety
carrier/archive network
external anchors
public bridge
ROX
Solana
staking
liquidity
external settlement
offline paid entitlement
cache-backed paid access
client-side wallet authority
client-side ledger authority
```

All of the above remain forbidden for CrabLink Tauri in this phase.

---

# 7. Current completion estimate

For the narrow CrabLink Tauri QuickChain QC-0A client-boundary slice:

```text
CrabLink Tauri QuickChain Phase-0 client boundary: approximately 96-98%
```

This is not a full QuickChain completion estimate.

Full QuickChain remains future work because the following remain deferred:

```text
locked vectors
canonical bytes
canonical hashes
root engines
receipt/state/hold/epoch roots
proof formats
validator-executable deterministic state machine
committee replication
DA/archive/challenge
pruning
anchors
public bridge
external settlement
```

This slice is green because it proves the client does not become that machinery.

---

# 8. Remaining CrabLink Tauri QuickChain follow-ups

The current pass is parkable, but future hardening could add:

```text
Tauri Rust-side command registration boundary tests
src-tauri/capabilities/default.json scanner
Rust command error redaction unit tests
gateway-first adapter tests
local/offline b3 verification non-unlock tests
receipt display cache shape tests
dev/prod localhost-mode distinction tests
route registry QuickChain non-authority tests
docs check for QuickChain anti-scope drift
```

Do not add runtime chain behavior.

Do not add root/checkpoint/validator/settlement code.

Do not add ROX/Solana/external settlement.

---

# 9. Low-disk workflow note

The user is low on disk.

Avoid duplicate exhaustive runs.

Preferred workflow for CrabLink Tauri QuickChain after this point:

```text
focused edit
→ focused scanner if needed
→ scripts/dev-quickchain-tauri-park.sh once
→ regenerate CODEBUNDLE_TAURI_APP.md only after green
```

Do not run:

```text
individual scanner checks
+ scripts/check-tauri.sh
+ scripts/dev-quickchain-tauri-park.sh
```

unless there was a file change between them.

The park script already delegates through the full check path.

---

# 10. Recommended command after notes

After adding these notes, regenerate the CrabLink Tauri codebundle only if the repo notes/code changed and a fresh bundle is needed for the next session:

```bash
scripts/make_codebundle.sh
```

If no code changed after the green parking gate, do not rerun the full parking gate just to create notes.

---

# 11. Next target recommendation

Since the CrabLink Tauri QC-0A client-boundary pass is green and parked, the next QuickChain work should move to one of the following:

```text
Option A:
  Write carryover notes for the next session and close this pass.

Option B:
  Begin the next QuickChain phase planning pass:
    - consolidate phase status
    - identify remaining QC-0A gaps
    - prepare transition criteria toward locked vectors / canonical bytes work
    - keep CrabLink client non-authoritative

Option C:
  Do one small additional CrabLink Tauri hardening patch:
    - Rust command/capabilities scanner
    - route registry scanner
    - gateway-first adapter scanner
```

Recommended next step:

```text
Write comprehensive carryover notes next.
```

Reason:

```text
The current slice is already green and parked.
More code now risks widening scope.
The next session needs a clean handoff that preserves the client non-authority boundary.
```

---

# 12. Final session verdict

CrabLink Tauri now has a green QC-0A client-boundary safety gate.

This is a strong result because it closes the major product-layer risk after the backend crate-pair passes:

```text
backend owns truth
wallet/ledger own economic mutation
gateway/omnigate/storage/index/policy do not invent paid truth
CrabLink Tauri displays/requests/refreshes backend-derived truth only
QuickChain remains future settlement infrastructure
no client chain authority exists
```

CrabLink Tauri must continue to obey:

```text
no fake balances
no fake receipts
no fake finality
no silent spend
no cache-only paid unlock
no client wallet authority
no client ledger authority
no root production
no checkpoint production
no validators
no bridge
no ROX
no Solana
no staking
no liquidity
no external settlement
```

### END NOTE - JUNE 19 2026 - CrabLink Tauri QuickChain QC-0A Client-Boundary Pass

This is ready to append to the CrabLink notes.


### END NOTE - JUNE 19 2026 - 17:45 CST