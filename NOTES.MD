
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


### BEGIN NOTE - JUNE 21 2026 - 18:55 CST

These notes capture the **green CrabLink Tauri QuickChain boundary pass** and the important scanner fix we just landed. The current CrabLink QuickChain docs define the Tauri app as non-authority, gateway-first, display/user-intent only, with receipt caches display-only and offline cache unable to unlock paid content by itself.  The status doc also frames this slice as the CrabLink Tauri QC-0A client-boundary slice, not full QuickChain runtime completion. 

# CrabLink Tauri — QuickChain Boundary Notes

## Session status

CrabLink Tauri QuickChain Phase-0 / QC-0A client-boundary work is now green and parked.

The final parking command passed:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Final marker observed:

```text
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

This confirms the CrabLink Tauri client-boundary slice is green for the current QuickChain preflight / safety gate.

## What passed

The following checks passed in the final run:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
scripts/dev-quickchain-tauri-park.sh
```

Observed final green sequence:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
vite build passed.
cargo check --manifest-path src-tauri/Cargo.toml passed.
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

Vite production build completed successfully:

```text
✓ 313 modules transformed.
✓ built in 4.98s
```

Tauri Rust macOS media config check completed successfully:

```text
Checking crablink-tauri v0.1.0
Finished `dev` profile [unoptimized + debuginfo]
```

## Main result

CrabLink Tauri is now parked as a QuickChain-safe client surface.

This means the Tauri client has automated guardrails confirming:

```text
React remains display/user-intent only.
TypeScript adapters remain request/display wrappers.
Tauri invoke usage remains centralized and guarded.
Tauri command names remain typed and allowlisted.
No raw/eval/shell/native/execute command bridge creep is present.
No QuickChain root/checkpoint/validator/settlement/bridge authority is present.
No ROX/Solana/staking/liquidity/external settlement path is present.
No fake receipt/fake balance/silent spend path is present.
No cache-only paid unlock path is present.
QuickChain readiness UI remains display-only.
Gateway-first routing remains the intended runtime boundary.
```

## Important scanner fix

The main issue fixed this session was not a product bug. It was a scanner false positive.

The scanner was originally rejecting this safe pattern:

```js
const normalized = normalizeCommandName(command);

if (!isAllowedTauriCommand(normalized)) {
  throw new Error("...");
}

return await invoke(normalized, args && typeof args === "object" ? args : {});
```

The scanner previously only accepted direct dynamic invocation when the first argument was named:

```js
command
```

But the real adapter now correctly normalizes the command first and then calls:

```js
invoke(normalized, ...)
```

That was more secure than the old scanner expected.

The scanner was updated so `invoke(normalized, ...)` is allowed only inside the central Tauri platform adapter when all of the following are true:

```text
The file is apps/crablink-tauri/src/platform/tauriPlatform.js.
The command came from the callTauri(command, args) boundary.
The command is normalized with normalizeCommandName(command).
The normalized command is checked by isAllowedTauriCommand(normalized).
The adapter contains ALLOWED_TAURI_COMMANDS.
The adapter contains ALLOWED_TAURI_COMMAND_SET.
The adapter contains FORBIDDEN_COMMAND_PATTERNS.
The adapter contains redactForDisplay.
The actual invocation is invoke(normalized, safe_args).
```

This is a strict allowlist correction, not a weakening of the boundary.

## Why the v5 fix was correct

The v5 scanner patch used brace matching to replace `isAllowedDynamicInvoke(...)`.

This was necessary because the previous v4 patch assumed another `function` declaration followed `isAllowedDynamicInvoke(...)`. In the live scanner, `isAllowedDynamicInvoke(...)` was at or near the end of the file, so there was no next function marker. That is why v4 failed with:

```text
could not find end of function isAllowedDynamicInvoke
```

The v5 patch fixed this by parsing braces instead of relying on a later function marker.

After v5, the focused boundary check passed:

```text
QuickChain client-boundary check passed.
QuickChain Tauri client-boundary scanner patch v5 passed.
```

Then the full park gate passed.

## Files / areas involved

Primary scanner files:

```text
scripts/check-quickchain-client-boundary.mjs
scripts/check-quickchain-paid-cache-boundary.mjs
scripts/check-quickchain-readiness-boundary.mjs
scripts/dev-quickchain-tauri-park.sh
scripts/check-tauri.sh
```

Primary Tauri platform file:

```text
apps/crablink-tauri/src/platform/tauriPlatform.js
```

Primary QuickChain docs:

```text
docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md
docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md
docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md
docs/tauri/QUICKCHAIN_PHASE0_STATUS.md
```

Primary readiness UI files:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
apps/crablink-tauri/src/pages/quickchain/quickchain.css
```

Primary display-only local memory areas watched by scanners:

```text
apps/crablink-tauri/src/shared/receipts/recentReceipts.js
apps/crablink-tauri/src/shared/catalog/localCatalog.js
```

Primary paid-access UI areas watched by scanners:

```text
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/siteVisitClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
```

Primary Tauri Rust bridge areas covered by the check:

```text
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/commands/*.rs
apps/crablink-tauri/src-tauri/capabilities/default.json
apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json
```

## Boundary doctrine preserved

CrabLink Tauri remains a client, not a backend authority.

The correct authority split is:

```text
React:
  display
  user intent
  route rendering
  confirmation UX
  readiness/status UI

TypeScript/shared adapters:
  normalize inputs
  call typed platform/gateway wrappers
  shape display objects
  redact errors
  avoid secrets
  avoid truth invention

Tauri Rust:
  mediate native privilege
  enforce bounded commands
  call configured gateway routes
  handle bounded local/media helpers
  avoid wallet/ledger/QuickChain authority

RustyOnions backend:
  ledger truth
  wallet mutation
  receipt truth
  paid access enforcement
  storage truth
  index/policy truth
  accounting snapshots
  rewarder planning
  future QuickChain roots/proofs when gates authorize them
```

## Client authority boundary

CrabLink Tauri may:

```text
Display readiness/status.
Display backend-derived receipts.
Display local receipt history as display-only memory.
Display local catalog memory as display-only memory.
Help the user initiate paid actions.
Require explicit confirmation for paid actions.
Route normal runtime requests gateway-first.
Use bounded Tauri commands for native app functionality.
Use bounded media preview/export helpers.
Verify cached/public bytes before trusted render in future offline cache flows.
```

CrabLink Tauri must not:

```text
Produce QuickChain roots.
Produce state roots.
Produce receipt roots.
Produce account roots.
Produce checkpoints.
Claim finality.
Claim settlement.
Act as a validator.
Act as a chain authority.
Act as a bridge.
Anchor to Solana.
Implement ROX.
Implement staking.
Implement liquidity.
Implement external settlement.
Mutate wallet truth.
Mutate ledger truth.
Mint receipts.
Mint balances.
Fabricate receipts.
Fabricate balances.
Authorize spend from React/TS/local cache.
Unlock paid content from local cache alone.
Store private keys, seeds, raw capabilities, or uncapped spend authority in React/TS/localStorage/sessionStorage.
```

## Paid/cache boundary preserved

The paid/cache scanner now confirms that local display caches do not become authority.

Correct paid flow remains:

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

Forbidden paid flow remains:

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

The scanner guards against names and patterns such as:

```text
cache-only paid unlock
receipt-cache entitlement
offline paid entitlement
balance from cache
receipt from cache
fake receipt
fake balance
fabricated entitlement
allow_paid_unlock_from_cache=true
```

Safe local memory is allowed only when it is clearly display-only and backend-authoritative.

## Readiness page boundary preserved

The QuickChain readiness page remains a dashboard, not QuickChain.

It may show:

```text
project readiness labels
local receipt counts
local catalog memory
backend-derived receipt summaries
missing gates
locked future milestones
manual test commands
truth-boundary notes
developer JSON previews
```

It must not:

```text
produce roots
produce checkpoint hashes
claim finality
claim settlement
claim validator status
mutate wallets
mutate ledgers
unlock paid content
authorize spend
derive balances
fabricate receipts
fabricate replay proofs
fabricate accounting proofs
fabricate reward proofs
call Tauri invoke directly
call wallet mutation paths
call ledger mutation paths
call QuickChain root/checkpoint APIs
call bridge/anchor APIs
call ROX/Solana APIs
```

Allowed local sources for the readiness page remain display-only:

```text
readLocalCatalog
subscribeLocalCatalog
readRecentReceipts
subscribeRecentReceipts
```

These sources must never become:

```text
wallet truth
ledger truth
receipt truth
balance truth
entitlement truth
finality truth
settlement truth
```

## Tauri command bridge boundary

The Tauri bridge remains centralized through the platform adapter.

The desired safe path is:

```text
React component
→ shared API / adapter
→ platform abstraction
→ callTauri(command, args)
→ normalizeCommandName(command)
→ isAllowedTauriCommand(normalized)
→ invoke(normalized, safe_args)
→ redacted result/error
→ display-only UI state
```

Forbidden patterns remain:

```text
raw invoke scattered across React pages
window.__TAURI__.invoke direct calls in UI code
run_* commands
execute_* commands
eval_* commands
shell_* commands
native_* commands
raw_* commands
quickchain root/checkpoint/validator/settlement command names
bridge/anchor/staking/liquidity/ROX/Solana command names
wallet mutation command names exposed directly to React
ledger mutation command names exposed directly to React
```

The central adapter can use dynamic invocation only because it has:

```text
explicit allowlist
forbidden command pattern checks
normalization
redacted display errors
bounded command names
scanner coverage
```

## What the current green pass proves

This green pass proves:

```text
The CrabLink Tauri app builds.
The Tauri Rust bridge compiles under the macOS media config.
The QuickChain client-boundary scanner passes.
The paid/cache boundary scanner passes.
The readiness page scanner passes.
The central Tauri adapter has a guarded dynamic invoke path.
The scanner understands the guarded normalized invoke path.
No forbidden QuickChain runtime authority appears in the scanned client surface.
No cache-only paid unlock path appears in the scanned paid/cache surface.
No readiness page chain-authority path appears in the scanned readiness surface.
```

## What the current green pass does not prove

This green pass does not prove:

```text
QuickChain Phase 1 roots are implemented.
Canonical account-state roots are implemented.
Receipt roots are implemented.
Checkpoint production is implemented.
Validator execution is implemented.
Committee replication is implemented.
Passport-gated validators are implemented.
DA/archive/challenge paths are implemented.
Pruning is implemented.
External anchoring is implemented.
ROX is implemented.
Solana integration is implemented.
External settlement is implemented.
Offline paid entitlement is implemented.
Cache-backed paid access is implemented.
Client-side wallet mutation is safe.
Client-side ledger mutation is safe.
```

Those remain explicitly deferred and forbidden in CrabLink Tauri.

## Phase/completion interpretation

For the CrabLink Tauri QuickChain Phase-0 / QC-0A client-boundary slice, current status is effectively parked/green.

A reasonable estimate for this specific CrabLink Tauri client-boundary slice is:

```text
CrabLink Tauri QuickChain client-boundary slice: 96% parked
```

That number only applies to this client-boundary slice.

It does not mean all QuickChain phases are 96%.

Full QuickChain remains incomplete until the backend QuickChain phases implement and prove:

```text
canonical bytes
locked vectors
single-authority deterministic roots/proofs
state proofs
receipt proofs
checkpoint flow
validator/replication phases
challenge/archive/DA strategy
pruning safety
future anchoring strategy
```

## Non-regression rules

Do not add any of the following to CrabLink Tauri:

```text
QuickChain runtime
root producer
checkpoint producer
validator
settlement authority
bridge authority
staking
liquidity
ROX
Solana integration
external settlement
client-side wallet authority
client-side ledger truth
client-side receipt minting
client-side paid unlock from cache
fake balance
fake receipt
silent spend
```

Do not weaken:

```text
ALLOWED_TAURI_COMMANDS
ALLOWED_TAURI_COMMAND_SET
FORBIDDEN_COMMAND_PATTERNS
normalizeCommandName
isAllowedTauriCommand
redactForDisplay
DYNAMIC_INVOKE_ALLOWLIST
paid/cache boundary scanner
readiness boundary scanner
park script
```

Do not treat these as authority:

```text
localCatalog
recentReceipts
theme/settings storage
developer labels
readiness display state
manifest paid flags
localStorage receipt-shaped JSON
sessionStorage receipt-shaped JSON
offline bytes
IndexedDB cached bytes
```

## Important low-disk workflow note

Do not duplicate heavy runs.

For CrabLink Tauri QuickChain boundary work, the preferred final check is:

```bash
scripts/dev-quickchain-tauri-park.sh
```

This delegates through the intended check path and avoids unnecessary duplicate exhaustive runs.

Do not run every subcheck repeatedly unless debugging a focused failure.

Suggested flow after small scanner or doc changes:

```text
1. Run the focused failing scanner.
2. Fix the issue.
3. Run scripts/dev-quickchain-tauri-park.sh once.
4. Regenerate CODEBUNDLE_TAURI_APP.md only after the gate is green.
```

## Recommended final codebundle command

After a green park gate, regenerate the current codebundle:

```bash
bash scripts/make_codebundle.sh
```

This captures:

```text
green scanner state
patched check-quickchain-client-boundary.mjs
current QuickChain docs
current Tauri platform adapter
current app build surface
current scripts/dev-quickchain-tauri-park.sh
```

## Current final acceptance command

The command to prove this slice remains parked is:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Expected final output:

```text
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

## Summary

CrabLink Tauri is now correctly parked as a QuickChain-safe client boundary.

The app can display readiness, route user intent, show backend-derived receipt metadata, and use bounded Tauri/native helpers. It cannot create QuickChain authority, wallet authority, ledger authority, paid entitlement truth, settlement truth, validator truth, ROX/Solana behavior, or cache-only paid unlocks.

The important scanner correction was to recognize the safe normalized-command flow:

```text
command
→ normalizeCommandName(command)
→ isAllowedTauriCommand(normalized)
→ invoke(normalized, safe_args)
```

That correction is strict and appropriate because it only applies inside the central Tauri adapter and only when the allowlist, forbidden-pattern guard, normalizer, and redaction boundary are present.

The final park gate is green.


### END NOTE - JUNE 21 2026 - 18:55 CST


### BEGIN NOTE - JUNE 22 2026 - 15:00 CST

Paste this into your CrabLink notes for the QC-1A client-adapter work:

# CrabLink Tauri + Client Adapters — QuickChain Phase 1 Round 1 / QC-1A Notes

## Status

CrabLink Tauri + client adapters received the QuickChain Phase 1 Round 1 / QC-1A client interlock hardening patch.

Focused validation is green:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 client interlock check passed.
QC-1A SiteVisitAccess receiptKey cleanup passed.
```

This means the focused static QC-1A client-boundary checks are passing. The full CrabLink Tauri park gate should still be run and recorded separately with:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Expected final marker:

```text
== CrabLink Tauri QuickChain Phase 1 Round 1 foundation parking gate passed ==
```

Once that marker is green, CrabLink Tauri + client adapters can be considered parked for QuickChain Phase 1 Round 1 / QC-1A.

## Purpose of this patch

This patch hardens CrabLink Tauri as a QuickChain client-boundary participant for Phase 1 Round 1.

The goal is not to implement live QuickChain roots, proofs, validators, settlement, anchoring, bridges, staking, liquidity, or public-chain behavior inside CrabLink. The goal is to ensure CrabLink remains a safe display/user-intent layer while the backend RustyOnions crates prepare deterministic root/proof material.

CrabLink Tauri must not become economic truth, ledger truth, chain authority, receipt authority, finality authority, or paid-access authority.

## Main boundary enforced

CrabLink Tauri remains a client.

It may:

* show backend-derived wallet and receipt information;
* request explicit user-confirmed paid actions through the configured gateway path;
* display QuickChain readiness and boundary status;
* show local receipts and local catalog entries as display-only hints;
* verify b3 cache material before trusted render;
* use Tauri Rust as the native privilege boundary;
* route user intent through typed client adapters.

It must not:

* mint, transfer, burn, hold, capture, release, or mutate ledger state;
* invent balances;
* invent receipts;
* silently spend ROC;
* unlock paid content from local cache alone;
* treat sessionStorage/localStorage/IndexedDB/local catalog/recent receipts as paid-access authority;
* claim root finality;
* claim proof finality;
* claim validator authority;
* create QuickChain roots/checkpoints;
* act as a settlement, bridge, anchor, staking, liquidity, or ROX/Solana layer.

## Files changed / affected

### Added

```text
docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md
scripts/check-quickchain-phase1-client-interlock.mjs
```

### Updated

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
apps/crablink-tauri/src/app/shell/BalanceChip.jsx
apps/crablink-tauri/src/app/shell/PassportSummary.jsx
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/pages/profile/profileDraftModel.js
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

## Important fix: SiteVisitAccess paid unlock boundary

The most important security/architecture fix was in:

```text
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

Before this cleanup, `SiteVisitAccess.jsx` still contained session receipt cache authority markers such as:

```text
SESSION_PREFIX
receiptKey
readSessionReceipt
writeSessionReceipt
removeSessionReceipt
paidFromSession
Clear session receipt
sessionReceiptKey
```

That shape was dangerous for QuickChain Phase 1 because it allowed local session receipt memory to appear too close to paid-access authority.

The patch removed the sessionStorage receipt path and the `receiptKey`-based unlock flow.

Current rule:

* a successful live backend site-visit payment response may unlock the current view;
* local receipt/session/cache/catalog data may be displayed as history or UX hint only;
* local receipt/session/cache/catalog data must not independently unlock paid site content;
* paid access must remain backend-derived and explicit.

This matches the RustyOnions/CrabLink doctrine:

```text
backend owns truth;
svc-wallet mutates;
ron-ledger is economic truth;
CrabLink displays and routes user intent;
cache is convenience, not authority.
```

## New scanner: Phase 1 client interlock

The new scanner is:

```text
scripts/check-quickchain-phase1-client-interlock.mjs
```

It verifies that CrabLink Tauri stays inside QC-1A client boundaries.

It checks that:

* `package.json` exposes `check:quickchain-phase1-interlock`;
* `scripts/check-tauri.sh` runs the Phase 1 interlock check;
* the park script identifies this as the Phase 1 Round 1 foundation parking gate;
* `SiteVisitAccess.jsx` no longer contains session receipt authority markers;
* paid site access does not become cache-only access;
* asset paid access remains backend-derived and does not use local cache as authority;
* shell balance/profile UI does not treat settings/local hints as verified ledger truth;
* QuickChain readiness UI stays display-only;
* Tauri command bridge remains allowlisted, typed, redacted, and bounded;
* client adapters remain gateway-first;
* wallet/payment paths require explicit confirmation;
* no active client-side QuickChain root/finality/validator/settlement behavior appears.

## Package / script integration

The Tauri app package now includes:

```text
check:quickchain-phase1-interlock
```

The regular check path now includes the Phase 1 interlock check alongside the existing QuickChain boundary checks.

The intended local check flow is:

```bash
node scripts/check-quickchain-client-boundary.mjs
node scripts/check-quickchain-paid-cache-boundary.mjs
node scripts/check-quickchain-readiness-boundary.mjs
node scripts/check-quickchain-phase1-client-interlock.mjs
```

The intended full parking command is:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Low-disk reminder: do not run duplicate exhaustive gates unnecessarily. For CrabLink, after focused checks pass, run the park script once and record the final marker.

## Balance/profile display cleanup

The shell/profile display code was tightened so local settings cannot imply verified ledger truth.

Affected files:

```text
apps/crablink-tauri/src/app/shell/BalanceChip.jsx
apps/crablink-tauri/src/app/shell/PassportSummary.jsx
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/pages/profile/profileDraftModel.js
```

Important rule:

* backend wallet response can display backend-derived ledger/cache status;
* settings/local hints are display preferences only;
* local settings must not cause the UI to claim ledger-backed truth.

This protects against fake balances, fake ledger status, and accidental wallet authority drift into React state.

## Readiness page boundary

The QuickChain readiness page remains a local display/readiness surface only.

It must not import active gateway/payment adapters, call wallet routes, call Tauri commands for QuickChain authority, fetch roots/proofs, or claim finality.

It is allowed to show:

* readiness status;
* boundary doctrine;
* docs links;
* QC-1A client-side guardrail status.

It is not allowed to become:

* a root verifier;
* a checkpoint producer;
* a validator console;
* a settlement client;
* a bridge/anchor client;
* a paid-access authority.

## Tauri command bridge boundary

The patch keeps the Tauri Rust bridge inside the existing CrabLink boundary model.

Allowed:

* small typed commands;
* bounded command outputs;
* redacted errors;
* allowlisted command surface;
* source-labeled native behavior;
* b3 verification/cache helpers;
* gateway/client support.

Forbidden:

* raw shell/eval/run/execute commands;
* unbounded native privilege;
* leaking secrets/tokens/capabilities/private keys;
* exposing spend authority;
* local ledger mutation;
* QuickChain root/checkpoint/validator authority;
* settlement/bridge/staking/liquidity commands.

## Paid/cache doctrine confirmed

This patch reinforces the existing paid/cache rule:

```text
prepare/quote -> explicit user confirmation -> backend wallet path -> backend receipt -> unlock/render -> display-only receipt cache -> balance refresh
```

Cache may improve UX, but cache cannot unlock paid content alone.

Recent receipts and local catalog entries are display-only. They are not entitlement truth.

## Forbidden scope explicitly avoided

This patch does not add:

* QuickChain roots;
* checkpoints;
* validators;
* validator signatures as authority;
* pruning;
* settlement;
* external anchoring;
* public bridge behavior;
* ROX;
* Solana;
* staking;
* liquidity;
* exchange-facing logic;
* client-side finality;
* client-side proof authority;
* gateway/omnigate/rewarder ledger mutation;
* fake balances;
* fake receipts;
* silent spend;
* cache-only paid unlock.

## Result

CrabLink Tauri is now better aligned with QuickChain Phase 1 Round 1 / QC-1A.

The client now has stronger static checks proving that it remains a user-intent and display layer while the deterministic root/proof work stays in the appropriate backend/core crates.

This is the correct posture for the final Phase 1 Round 1 crate pair:

```text
CrabLink Tauri + client adapters = display/user intent only.
RustyOnions backend = truth.
ron-ledger = economic truth.
svc-wallet = mutation front door.
QuickChain roots/proofs = future/core deterministic work, not CrabLink authority.
```

## Completion label

If the full park gate passes, use this label:

```text
CrabLink Tauri + client adapters are parked for QuickChain Phase 1 Round 1 / QC-1A.
```

If all Phase 1 Round 1 crate pairs are green and parked, use:

```text
QuickChain Phase 1 Round 1 / QC-1A foundation complete.
```

Do not call this full Phase 1 complete yet.

The next QuickChain work should be Phase 1 Round 2, centered on deterministic roots/proofs in `ron-proto` + `ron-ledger`, with downstream crates kept as boundary-confirmation only unless a specific interlock gap appears.


### END NOTE - JUNE 22 2026 - 15:00 CST


### BEGIN NOTE - JUNE 23 2026 - 16:15 CST

These notes line up with the buildplan’s fixed crate-pair order and non-authority rules for CrabLink Tauri/client adapters. The buildplan explicitly keeps CrabLink as display/user-confirmation only and forbids client authority over balances, roots, finality, or settlement truth.  The prior carryover also says this pair is the final Phase 1 Round 2 pair before the separate final Phase 1 audit. 

### BEGIN NOTE - JUNE 23 2026 - QUICKCHAIN PHASE 1 ROUND 2 - CRABLINK TAURI + CLIENT ADAPTERS

# CrabLink Tauri + Client Adapters — QuickChain Phase 1 Round 2 Notes

Project: RustyOnions / CrabLink
Repo: crablink
Focus: CrabLink Tauri + client adapters
Phase: QuickChain Phase 1 — single-authority deterministic roots/proofs
Round: Phase 1 Round 2 — final downstream/client boundary pass
Status: GREEN / PARKED

## 0. One-Sentence Result

CrabLink Tauri + client adapters are now **GREEN / PARKED for QuickChain Phase 1 Round 2 client boundary**, proving the client remains display/user-intent only and does not become wallet, ledger, root, proof, checkpoint, validator, finality, settlement, bridge, or paid-cache authority.

## 1. Final Parking Marker

The final park command completed successfully:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Final marker:

```text
== CrabLink Tauri QuickChain Phase 1 Round 2 final client parking gate passed ==
```

## 2. Commands / Gates Proven Green

The park script ran and passed the full focused CrabLink Tauri gate:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run check:quickchain-phase1-interlock
npm run build
npm run check:rust:mac-media
```

Observed successful markers:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
vite build completed successfully.
Tauri Rust mac-media cargo check completed successfully.
== CrabLink Tauri QuickChain Phase 1 Round 2 final client parking gate passed ==
```

Vite build summary:

```text
vite v5.4.21 building for production...
✓ 313 modules transformed.
✓ built in 4.93s
```

Tauri Rust check summary:

```text
Checking crablink-tauri v0.1.0
Finished dev profile target(s) in 4.00s
```

## 3. Patch Summary

This session added and wired the final Phase 1 Round 2 CrabLink client interlock.

New / updated boundary document:

```text
docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md
```

New / updated scanner:

```text
scripts/check-quickchain-phase1-client-interlock.mjs
```

Updated app package script:

```text
apps/crablink-tauri/package.json
```

Expected script now exists:

```text
check:quickchain-phase1-interlock
```

Updated park/check wiring:

```text
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
```

The parking marker was relabeled from the older Phase 1 Round 1 / QC-1A wording to the correct current label:

```text
CrabLink Tauri QuickChain Phase 1 Round 2 final client parking gate passed
```

## 4. What the New Interlock Proves

The new interlock proves the final downstream/client boundary for Phase 1 Round 2:

```text
CrabLink Tauri remains display/user-intent only.
React does not own wallet truth.
React does not own ledger truth.
React does not own QuickChain authority.
TypeScript adapters remain the boundary path.
Tauri Rust commands remain allowlisted and bounded.
Paid access requires backend-derived receipt/access response.
Receipt cache remains display-only.
Local catalog remains display-only.
QuickChain readiness UI remains informational only.
Wallet balance verification must come from gateway wallet response.
No client-side roots.
No client-side proofs.
No client-side checkpoints.
No client-side validators.
No client-side finality.
No client-side settlement.
No cache-only paid unlock.
No fake balances.
No fake receipts.
No silent spend.
No direct wallet mutation.
No direct ledger mutation.
No ROX runtime.
No Solana runtime.
No bridge/staking/liquidity/exchange-facing creep.
```

## 5. Files / Surfaces Covered by the New Scanner

The new scanner requires and inspects:

```text
docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh

apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/shared/api/gatewayClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/siteVisitClient.js

apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx

apps/crablink-tauri/src/app/shell/BalanceChip.jsx
apps/crablink-tauri/src/app/shell/PassportSummary.jsx
apps/crablink-tauri/src/app/shell/TopBar.jsx

apps/crablink-tauri/src/pages/profile/profileDraftModel.js
apps/crablink-tauri/src/shared/receipts/recentReceipts.js
apps/crablink-tauri/src/shared/catalog/localCatalog.js
```

It also recursively checks relevant JS/TS/JSX/TSX runtime files for raw Tauri invoke bypasses and forbidden authority-shaped route/command calls.

## 6. Important Boundary Assertions Now Locked

### Paid access

Correct paid flow remains:

```text
prepare / quote
→ explicit user confirmation
→ backend wallet path
→ backend ledger truth
→ backend receipt / authorization
→ unlock/render
→ display-only receipt cache
→ balance refresh from backend
```

Forbidden shortcuts remain blocked:

```text
client cache says paid → unlock
local receipt summary says paid → unlock
React state says paid → unlock
TS adapter says paid → unlock
Tauri local state says paid → unlock
policy allow says paid → unlock
index pointer says paid → unlock
b3 exists → unlock
manifest exists → unlock
site route exists → unlock
```

Important locked phrase:

```text
Display-only receipt cache is not paid unlock authority.
```

### Wallet and balance

Wallet and balance UI may show display labels or cached hints, but verified/ledger-backed status must come from gateway wallet response.

Important locked rule:

```text
Stored display hints must not be treated as verified balance or ledger truth.
```

### Offline / b3 cache

Offline cache may verify bytes, but byte integrity is not economic entitlement.

Important locked phrase:

```text
Verified b3 proves bytes, not paid entitlement.
```

### QuickChain readiness UI

QuickChain readiness/status UI is display-only and informational.

Important locked phrase:

```text
QuickChain readiness UI is informational, not authority.
```

## 7. What Was Not Added

This pass intentionally did **not** add:

```text
root production
proof production
checkpoint production
validator logic
validator signatures
settlement logic
finality logic
bridge logic
anchor logic
ROX runtime
Solana runtime
staking
liquidity
exchange-facing logic
wallet mutation from client
ledger mutation from client
cache-only paid unlock
fake receipt generation
fake balance generation
silent spend
```

This was a boundary and parking pass, not a new feature pass.

## 8. Current Phase 1 Round 2 Pair Status

The Phase 1 Round 2 sequence is now parked across all planned crate/client pairs:

```text
1. ron-proto + ron-ledger              ✅ complete / parked
2. svc-wallet + ron-accounting         ✅ complete / parked
3. svc-rewarder + svc-storage          ✅ complete / parked
4. svc-gateway + omnigate              ✅ complete / parked
5. svc-index + ron-policy              ✅ complete / parked
6. CrabLink Tauri + client adapters    ✅ complete / parked
```

Correct current label:

```text
QuickChain Phase 1 Round 2: complete / parked
```

Do not yet use this label until the final audit passes:

```text
Full QuickChain Phase 1 complete
```

## 9. Why Full Phase 1 Should Wait for Final Audit

Even though all Round 2 crate/client pairs are now parked, full Phase 1 should still receive one final cross-stack audit.

The final audit should confirm:

```text
canonical bytes are locked where required
real reproducible BLAKE3-256 hashes only
deterministic root/proof material remains core-only
downstream crates remain non-authority
CrabLink remains display/user-intent only
no external settlement scope entered
no fake balances
no fake receipts
no fake finality
all park gates remain green
phase docs match QUICKCHAIN_BUILDPLAN.MD
```

Only after that audit is green should the project say:

```text
QuickChain Phase 1 is complete.
```

## 10. Recommended Next Step

Next session should be:

```text
Final QuickChain Phase 1 audit
```

Recommended attachments for the final audit session:

```text
QUICKCHAIN_REVIEW_BUNDLE.MD
QUICKCHAIN_BUILDPLAN.MD
CODEBUNDLE_RS.md
CODEBUNDLE_TAURI_APP.md
COMBINED_IDB.MD
ALLNOTES.MD or latest crate notes
latest terminal output showing CrabLink Tauri parked
these CrabLink notes
```

If disk is tight, prefer a focused final audit script/check over rerunning every exhaustive crate-local park script.

## 11. Low-Disk / Low-Duplicate Reminder

Do not run duplicate exhaustive gates unless debugging a real failure.

Preferred workflow after this CrabLink park:

```text
1. Save these notes.
2. Regenerate CODEBUNDLE_TAURI_APP.md if needed.
3. Move to final Phase 1 audit.
4. Avoid rerunning the same Tauri park gate unless a file changes.
```

Do not run broad backend workspace clippy/build from the CrabLink repo.

Do not run Chrome extension checks unless explicitly needed.

## 12. Final Status Label

Use this status label going forward:

```text
CrabLink Tauri + client adapters: GREEN / PARKED for QuickChain Phase 1 Round 2 client boundary
```

Short version for carryover:

```text
We completed the CrabLink Tauri + client adapters QuickChain Phase 1 Round 2 client-boundary pass. A new Phase 1 Round 2 client interlock doc/scanner was added and wired into the Tauri park script. The full Tauri park gate passed: client boundary, paid/cache boundary, readiness boundary, Phase 1 Round 2 interlock, Vite build, and Tauri Rust mac-media cargo check. CrabLink remains display/user-intent only; React does not own wallet/ledger truth; TS adapters preserve the boundary; Tauri Rust remains typed/redacted/bounded/allowlisted; paid access requires backend receipt/access response; receipt/local catalog caches remain display-only; QuickChain readiness remains informational only. No roots, proofs, checkpoints, validators, settlement, bridge, ROX, Solana, staking, liquidity, wallet mutation, ledger mutation, fake balances, fake receipts, silent spend, or cache-only paid unlock were introduced. All Phase 1 Round 2 crate/client pairs are now parked. Next step is the final QuickChain Phase 1 audit before declaring Phase 1 complete.
```

### END NOTE - JUNE 23 2026 - QUICKCHAIN PHASE 1 ROUND 2 - CRABLINK TAURI + CLIENT ADAPTERS


### END NOTE - JUNE 23 2026 - 16:15 CST


### BEGIN N0TE - JUNE 23 2026 - 22:35 CST

Here are the paste-ready **CrabLink Tauri + client adapters notes** for **QuickChain Phase 2 Round 1**.

### BEGIN NOTE - JUNE 23 2026 - QUICKCHAIN PHASE 2 ROUND 1 - CRABLINK TAURI + CLIENT ADAPTERS

# CrabLink Tauri + Client Adapters — QuickChain Phase 2 Round 1 Notes

## 0. Status

CrabLink Tauri + client adapters are now **complete / parked** for:

```text
QuickChain Phase 2 Round 1 — verifier artifact / read-only replication
```

This was the final crate pair in the Phase 2 Round 1 sweep.

The correct status label is now:

```text
QuickChain Phase 2 Round 1 — COMPLETE / PARKED across all crate pairs
```

Important distinction:

```text
Phase 2 Round 1 is complete.
Phase 2 overall is not complete yet.
Phase 2 still has Round 2 remaining.
```

## 1. What this CrabLink pass accomplished

This pass added a CrabLink Tauri boundary layer for Phase 2 Round 1 without giving the client any QuickChain runtime authority.

The core rule locked by this pass:

```text
CrabLink may display backend-derived replay/verifier/readiness status.
CrabLink must not become verifier truth, quorum truth, fork-choice truth, finality truth, settlement truth, wallet truth, ledger truth, paid-unlock authority, cache authority, or chain authority.
```

This keeps CrabLink aligned with the active QuickChain doctrine:

```text
determinism before distribution
DTOs before roots
roots before validators
proofs before pruning
internal ROC before external anchors
```

## 2. Boundary meaning for CrabLink Phase 2 Round 1

CrabLink Phase 2 Round 1 means:

```text
- display-only verifier/replay/readiness posture
- backend-derived status only
- no client-side QuickChain authority
- no local replay artifact used as paid entitlement
- no cache-only unlock
- no fake receipt
- no fake balance
- no silent spend
- no wallet mutation
- no ledger mutation
- no validator/committee/quorum/fork-choice/finality behavior
- no bridge/anchor/staking/slashing/liquidity/ROX/Solana runtime
```

Allowed in CrabLink:

```text
- show Phase 2 Round 1 readiness status
- show backend-derived replay/verifier artifact status
- explain that replay/verifier artifacts are display-only
- keep recent receipts as display-only UI cache
- keep local catalog as display-only convenience cache
- keep paid unlock tied to backend wallet/ledger receipt truth
- keep Tauri Rust as the native privilege boundary
- keep React as display/user-intent only
```

Forbidden in CrabLink:

```text
- constructing QuickChain roots
- verifying roots as authority
- finalizing checkpoints
- signing validator messages
- running committee/quorum logic
- selecting fork choice
- treating replay/verifier artifacts as settlement
- treating replay/verifier artifacts as paid entitlement
- unlocking content from local cache alone
- mutating wallet/ledger truth from React/client code
- exposing bridge/anchor/staking/slashing/liquidity/ROX/Solana commands
```

## 3. Files added or materially changed

### Added

```text
docs/tauri/QUICKCHAIN_PHASE2_CLIENT_REPLAY_BOUNDARY.md
scripts/check-quickchain-phase2-client-replay-boundary.mjs
```

### Updated

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

## 4. New Phase 2 client replay boundary doc

Added:

```text
docs/tauri/QUICKCHAIN_PHASE2_CLIENT_REPLAY_BOUNDARY.md
```

Purpose:

```text
Document the Phase 2 Round 1 CrabLink boundary:
CrabLink may display backend-derived replay/verifier readiness,
but must not treat replay/verifier artifacts as authority.
```

The doc explicitly locks:

```text
- Phase 2 Round 1 = verifier artifact / read-only replication
- CrabLink Tauri + client adapters are the final Phase 2 Round 1 pair
- backend-derived verifier/replay/readiness status is display-only
- not verifier truth
- not quorum truth
- not finality truth
- not settlement truth
- replay/verifier artifacts cannot replace the backend paid path
- no client-side paid unlock from replay artifacts
```

## 5. New Phase 2 scanner

Added:

```text
scripts/check-quickchain-phase2-client-replay-boundary.mjs
```

This scanner enforces the Phase 2 Round 1 client boundary.

It verifies:

```text
- Phase 2 doc exists and contains required boundary phrases
- package scripts include check:quickchain-phase2-replay-boundary
- check-tauri.sh runs Phase 2 check after Phase 1 interlock and before build
- dev-quickchain-tauri-park.sh carries the Phase 2 parking marker
- QuickchainReadinessPage carries Phase 2 display-only wording
- QuickchainReadinessPage does not import active gateway/wallet/Tauri clients
- QuickchainReadinessPage does not call invoke/callTauri/fetch/gateway APIs
- Tauri command allowlist does not expose QuickChain authority commands
- gateway/wallet/content/site clients do not expose authority-shaped QuickChain methods/routes
- paid gates do not grant access from replay/verifier/finality material
- local catalog and recent receipts remain display-only caches
- client source does not call active QuickChain authority routes
```

The scanner was refined after an initial over-match. The first version incorrectly treated ordinary asset proof/provenance UI/routes as active QuickChain authority. The final scanner is stricter and more precise:

```text
It rejects active QuickChain authority routes and truth flags,
but does not reject normal asset proof/provenance product UI.
```

## 6. Package and runner integration

Updated:

```text
apps/crablink-tauri/package.json
```

The Tauri app now includes:

```text
check:quickchain-phase2-replay-boundary
```

The app check chain now runs:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:quickchain-phase1-interlock
check:quickchain-phase2-replay-boundary
build
check:rust:mac-media
```

Updated:

```text
scripts/check-tauri.sh
```

This now runs the Phase 2 replay boundary check after the Phase 1 interlock and before the frontend build.

Updated:

```text
scripts/dev-quickchain-tauri-park.sh
```

The park script now represents:

```text
CrabLink Tauri QuickChain Phase 2 Round 1 verifier artifact client parking gate
```

It also intentionally preserves the legacy Phase 1 scanner compatibility marker:

```text
Phase 1 Round 2 final client parking gate
```

That marker is required because the existing Phase 1 interlock scanner still checks for it.

## 7. Tauri command boundary update

Updated:

```text
apps/crablink-tauri/src/platform/tauriPlatform.js
```

The Tauri command boundary now rejects Phase 2 authority creep.

Forbidden command vocabulary now covers concepts such as:

```text
quickchain
root
checkpoint
proof
replay
verifier
validator
committee
quorum
fork-choice
finality
settlement
bridge
anchor
staking
slashing
liquidity
rox
solana
```

Important invariant:

```text
Allowed Tauri commands remain small, typed, bounded, redacted, and product/client oriented.
No allowed Tauri command exposes QuickChain verifier/committee/quorum/finality/settlement/bridge/anchor authority.
```

## 8. Quickchain readiness page update

Updated:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

The page now explicitly displays Phase 2 Round 1 status as display-only.

It includes a Phase 2 replay boundary object:

```text
PHASE2_REPLAY_BOUNDARY
```

The page states:

```text
Phase 2 Round 1: read-only verifier artifact replication
backend-derived replay/verifier artifact status
not verifier truth, quorum, fork-choice, finality, settlement, or paid unlock authority
read-only replay/verifier display only
Replay artifacts are not entitlement
This page displays Phase 2 Round 1 readiness only
```

The page also preserves required legacy readiness phrases from the Phase 1 scanner:

```text
display-only
no chain logic
no ROX/Solana
no wallet mutation
no fake replay/accounting/reward proofs
```

Important invariant:

```text
QuickchainReadinessPage remains a passive UI explanation/readiness surface.
It imports display caches only and does not call active gateway/wallet/Tauri/fetch APIs.
```

## 9. Display cache boundary preserved

The following remain display-only convenience caches:

```text
apps/crablink-tauri/src/shared/receipts/recentReceipts.js
apps/crablink-tauri/src/shared/catalog/localCatalog.js
```

They must not become:

```text
- entitlement truth
- paid-unlock truth
- verifier truth
- finality truth
- settlement truth
- wallet truth
- ledger truth
```

Recent receipts are still only a display cache of backend-derived receipt information.

Local catalog is still only a local convenience/indexing cache.

## 10. Paid gate boundary preserved

The Phase 2 scanner verifies that paid gates do not grant content access from QuickChain replay/verifier/finality material.

Relevant paid gate files:

```text
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

Required rule:

```text
Paid unlock must still come from the backend wallet/ledger/receipt path.
Replay artifacts are not entitlement.
Caches are not entitlement.
Readiness is not entitlement.
Verifier status is not entitlement.
```

The backend paid path remains:

```text
prepare/quote
→ explicit user confirmation
→ backend wallet path
→ backend ledger truth
→ backend receipt
→ unlock/render
→ display-only receipt cache
→ balance refresh
```

## 11. Final commands run

The final successful park command was:

```bash
scripts/dev-quickchain-tauri-park.sh
```

The full park run proved:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 Round 1 client replay boundary check passed.
vite build passed.
Tauri Rust cargo check passed.
```

Final success marker:

```text
== CrabLink Tauri QuickChain Phase 2 Round 1 verifier artifact client parking gate passed ==
```

## 12. Terminal proof from final run

Final relevant terminal output:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 Round 1 client replay boundary check passed.
vite v5.4.21 building for production...
✓ 313 modules transformed.
✓ built in 5.07s
cargo check --manifest-path src-tauri/Cargo.toml
Finished `dev` profile [unoptimized + debuginfo] target(s) in 3.87s
== CrabLink Tauri QuickChain Phase 2 Round 1 verifier artifact client parking gate passed ==
```

## 13. What this proves

This proves:

```text
- CrabLink Tauri still builds
- Tauri Rust command bridge still checks
- Phase 0 client boundary remains green
- paid/cache boundary remains green
- readiness boundary remains green
- Phase 1 client interlock remains green
- Phase 2 client replay boundary is now green
- Phase 2 Round 1 client display-only posture is locked
```

This does not prove:

```text
- Phase 2 overall is complete
- committee/quorum/finality exists
- verifier artifacts are authoritative
- client verifies roots as authority
- settlement is decentralized
- ROX/Solana/external anchors are active
- replay artifacts can unlock paid content
```

## 14. Phase 2 Round 1 overall crate-pair status

After this CrabLink pass, Phase 2 Round 1 is complete across all crate pairs:

```text
1. ron-proto + ron-ledger — COMPLETE / PARKED
2. svc-wallet + ron-accounting — COMPLETE / PARKED
3. svc-rewarder + svc-storage — COMPLETE / PARKED
4. svc-gateway + omnigate — COMPLETE / PARKED
5. svc-index + ron-policy — COMPLETE / PARKED
6. CrabLink Tauri + client adapters — COMPLETE / PARKED
```

Correct label:

```text
QuickChain Phase 2 Round 1 — COMPLETE / PARKED across all crate pairs
```

Do not label Phase 2 fully complete yet.

## 15. Recommended next step

The next QuickChain work should begin:

```text
QuickChain Phase 2 Round 2
```

Round 2 should be treated as the final Phase 2 hardening pass.

Expected Round 2 theme:

```text
small committee / replicated verification hardening
```

Likely Round 2 focus:

```text
- tighten verifier artifact replay semantics
- strengthen replicated verification tests
- confirm no accidental authority leakage in downstream services
- improve failure/rejection/tamper boundary tests
- lock final Phase 2 audit notes
- keep all committee/quorum/finality authority future-gated unless explicitly authorized by the buildplan
```

Round 2 should still preserve:

```text
- no public validators
- no validator economy
- no staking/slashing
- no bridge
- no ROX/Solana
- no external settlement
- no client authority
- no gateway/omnigate/index/policy authority over balances/finality/settlement
- no cache-only paid unlock
- no fake balances/receipts/silent spend
```

## 16. Carry-forward warning for next session

When beginning Phase 2 Round 2, attach or review:

```text
QUICKCHAIN_BUILDPLAN.MD
QUICKCHAIN_REVIEW_BUNDLE.MD
CODEBUNDLE_RS.md
CODEBUNDLE_TAURI_APP.md
COMBINED_IDB.MD
latest NOTES.MD / ALLNOTES.MD
```

Also mention clearly:

```text
Phase 2 Round 1 is complete/parked across all crate pairs.
We are beginning Phase 2 Round 2, which is the remaining Phase 2 pass.
```

The next session should not re-open Phase 2 Round 1 unless a regression appears.

### END NOTE - JUNE 23 2026 - QUICKCHAIN PHASE 2 ROUND 1 - CRABLINK TAURI + CLIENT ADAPTERS


### END NOTE - JUNE 23 2026 - 22:35 CST


### BEGIN NOTE - JUNE 24 2026 - 02:45 CST

Here are the paste-ready CrabLink notes. They record that the final CrabLink Tauri/client-adapter pass is parked, and that **QuickChain Phase 2 is complete** with the safe label **small committee replicated verification complete**. Your terminal output shows the boundary checks, Vite build, Tauri Rust check, and final Phase 2 completion markers all passing. 

### BEGIN NOTE - JUNE 24 2026 - QUICKCHAIN PHASE 2 ROUND 2 - CRABLINK TAURI + CLIENT ADAPTERS

# QuickChain App Notes — CrabLink Tauri + Client Adapters

Date: June 24, 2026
Project: RustyOnions / CrabLink
Track: QuickChain Phase 2 Round 2
Round purpose: small committee agreement/readiness
Product/crate pair: `CrabLink Tauri + client adapters`
Status: COMPLETE / PARKED for QuickChain Phase 2 Round 2

---

## 0. Status Summary

`CrabLink Tauri + client adapters` are now complete and parked for QuickChain Phase 2 Round 2.

Final status:

```text
QuickChain Phase 2 Round 2 — CrabLink Tauri + client adapters COMPLETE / PARKED
```

Because CrabLink was the final remaining Phase 2 Round 2 pair, the whole phase is now complete.

Safe global status label:

```text
QuickChain Phase 2 complete
small committee replicated verification complete
```

Do **not** call this:

```text
public validator network
staking network
public chain live
bridge-ready
external settlement
ROX runtime
Solana runtime
validator economy
liquidity/exchange-facing system
```

This pass proves CrabLink can display backend-derived replay/verifier/committee readiness information while remaining strictly client-side display/user-intent infrastructure.

CrabLink does not become verifier truth, committee truth, quorum truth, fork-choice truth, finality truth, settlement truth, wallet truth, ledger truth, paid entitlement truth, or QuickChain state authority.

---

## 1. Final Terminal Evidence

The final parking command was run from the CrabLink repo root:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Final successful checks:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 replay boundary check passed.
QuickChain Phase 2 committee boundary check passed.
vite build passed.
Tauri Rust mac-media cargo check passed.
```

Final markers:

```text
== CrabLink Tauri QuickChain Phase 2 Round 2 committee readiness client parking gate passed ==
== Phase 2 complete ==
== small committee replicated verification complete ==
```

Interpretation:

```text
CrabLink Tauri + client adapters are parked for QuickChain Phase 2 Round 2.
QuickChain Phase 2 is complete.
The correct completion label is small committee replicated verification complete.
```

---

## 2. What This Pass Proved

This pass proved that CrabLink remains a client/product layer only while Phase 2 introduces small committee/readiness semantics elsewhere.

CrabLink may:

```text
display backend-derived replay status
display backend-derived verifier readiness
display backend-derived committee readiness
display backend-derived attestation status labels
display backend-derived quorum-readiness labels
display deterministic disagreement/error taxonomy labels
show source-labeled readiness/status information
request paid prepare/quote flows
ask for explicit user confirmation before paid actions
call typed TS adapters
call allowlisted Tauri commands
call configured svc-gateway
verify b3 cache before trusted render
keep display-only localCatalog entries
keep display-only recentReceipts entries
```

CrabLink must not:

```text
mutate ron-ledger
bypass svc-wallet
invent balances
invent receipts
invent paid unlocks
unlock paid content from cache alone
treat localStorage/cache as entitlement truth
create QuickChain roots
create checkpoint hashes
create proof truth
create signed verification attestations
sign attestations
verify attestations as authority
decide verifier result truth
decide committee membership
decide quorum
decide fork choice
decide finality
decide settlement
anchor externally
bridge externally
implement staking
implement slashing
implement liquidity
act as validator runtime
act as settlement runtime
```

---

## 3. Files Changed / Added

Added:

```text
docs/tauri/QUICKCHAIN_PHASE2_COMMITTEE_BOUNDARY.md
scripts/check-quickchain-phase2-committee-boundary.mjs
```

Replaced / updated:

```text
scripts/check-quickchain-phase2-client-replay-boundary.mjs
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
apps/crablink-tauri/package.json
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
apps/crablink-tauri/src/platform/tauriPlatform.js
scripts/check-quickchain-client-boundary.mjs
scripts/make_codebundle.sh
```

No dependency changes were required.

No backend/service crate source was changed in this final CrabLink pass.

No ROX, Solana, public bridge, staking, slashing, liquidity, or external settlement code was introduced.

---

## 4. New Phase 2 Round 2 Boundary Coverage

New scanner:

```text
scripts/check-quickchain-phase2-committee-boundary.mjs
```

Package script:

```text
npm run check:quickchain-phase2-committee-boundary
```

The scanner locks the final client-side committee boundary:

```text
requires docs/tauri/QUICKCHAIN_PHASE2_COMMITTEE_BOUNDARY.md
requires QuickchainReadinessPage committee boundary markers
requires package script wiring
requires check-tauri.sh ordering
requires dev-quickchain-tauri-park.sh final markers
rejects active adapter imports from QuickchainReadinessPage
rejects fetch/invoke/gateway calls from QuickchainReadinessPage
rejects QuickChain authority routes in client adapters
rejects authority-shaped committee/attestation methods
rejects unlock from committee/replay/proof material
rejects authorization-shaped true flags from display caches
checks Tauri forbidden command patterns include committee/attestation/quorum/finality/settlement/bridge/staking/slashing/ROX/Solana terms
checks Tauri allowlist does not contain QuickChain authority commands
```

This makes the readiness page and client adapters safe for display-only labels without letting them become authority.

---

## 5. Existing Boundary Coverage Preserved

The final park run preserved all prior CrabLink QuickChain checks:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:quickchain-phase1-interlock
check:quickchain-phase2-replay-boundary
check:quickchain-phase2-committee-boundary
build
check:rust:mac-media
```

The preserved boundaries are:

```text
React owns display/user intent only.
Tauri Rust mediates native privilege.
TypeScript adapters do not own backend truth.
Tauri commands remain typed and allowlisted.
No raw invoke authority drift.
No shell/eval/run/raw/native command creep.
No client-side roots/checkpoints/proofs as authority.
No client-side validator/committee/quorum/finality/settlement authority.
No fake balances.
No fake receipts.
No silent spend.
No cache-only paid unlock.
No localCatalog entitlement truth.
No recentReceipts entitlement truth.
No offline cache paid entitlement.
Gateway-first path remains preserved.
```

---

## 6. QuickChain Readiness Page Status

`QuickchainReadinessPage.jsx` now covers:

```text
Phase 2 Round 1: read-only verifier artifact replication
Phase 2 Round 2: small committee agreement/readiness
```

The page may show:

```text
backend-derived replay/verifier artifact status
backend-derived small committee readiness
backend-derived attestation status
backend-derived quorum-readiness
backend-derived disagreement/error taxonomy
```

But the page remains display-only.

It must not:

```text
fetch QuickChain truth directly
invoke Tauri commands
call gateway/wallet/content/site adapters directly
create attestations
sign attestations
verify attestations as authority
unlock content
settle payments
decide finality
decide quorum
decide committee membership
```

The page’s role is honest status display only.

---

## 7. Tauri Command Boundary

`tauriPlatform.js` now hardens forbidden command patterns against Phase 2 authority drift.

Forbidden command / route concepts include:

```text
quickchain root
quickchain proof
quickchain replay authority
quickchain verifier authority
quickchain validator authority
quickchain committee authority
quickchain attestation authority
quickchain quorum authority
fork choice
finality
settlement
anchor
bridge
staking
slashing
liquidity
ROX
Solana
```

Allowed Tauri commands remain ordinary client/product commands only.

CrabLink must continue to use typed adapters and allowlisted Tauri commands.

React must not call raw `invoke` directly.

---

## 8. Paid Flow Boundary Preserved

Paid flow remains:

```text
prepare/quote
→ explicit user confirmation
→ backend wallet path
→ backend receipt
→ unlock/render
→ display-only receipt cache
→ balance refresh from backend
```

CrabLink must not shortcut the paid flow with:

```text
cache-only unlock
client-only proof unlock
committee label unlock
quorum label unlock
attestation label unlock
finality label unlock
index pointer unlock
policy-only unlock
local receipt fabrication
fake balance
silent spend
```

Backend wallet/ledger receipt truth remains the only paid unlock authority.

---

## 9. Local Cache / Display Cache Boundary

Accepted display-only local sources:

```text
localCatalog
recentReceipts
theme/settings storage
dev labels
readiness display state
```

These must never become:

```text
wallet truth
ledger truth
balance truth
receipt truth
entitlement truth
paid access truth
committee truth
quorum truth
finality truth
settlement truth
```

Offline/b3 cache may help trusted render only after integrity verification.

Offline cache cannot unlock paid content alone.

---

## 10. Final CrabLink Phase 2 Interpretation

This pass completes the final Phase 2 pair:

```text
CrabLink Tauri + client adapters
```

The full Phase 2 crate-pair order is now complete / parked:

```text
1. ron-proto + ron-ledger                  complete / parked
2. svc-wallet + ron-accounting             complete / parked
3. svc-rewarder + svc-storage              complete / parked
4. svc-gateway + omnigate                  complete / parked
5. svc-index + ron-policy                  complete / parked
6. CrabLink Tauri + client adapters        complete / parked
```

Global Phase 2 completion status:

```text
QuickChain Phase 2 complete
small committee replicated verification complete
```

This means:

```text
multiple/small committee replicated verification semantics are bounded and parked
downstream services remain non-authority
CrabLink remains display/user-intent only
paid unlock remains wallet/ledger receipt-derived
no public validator economy was introduced
no external settlement was introduced
```

---

## 11. Commands for Future Regression Checks

Preferred one-shot CrabLink park command:

```bash
cd /Users/mymac/Desktop/crablink
scripts/dev-quickchain-tauri-park.sh
```

Expected final markers:

```text
== CrabLink Tauri QuickChain Phase 2 Round 2 committee readiness client parking gate passed ==
== Phase 2 complete ==
== small committee replicated verification complete ==
```

Focused checks:

```bash
cd /Users/mymac/Desktop/crablink

node scripts/check-quickchain-client-boundary.mjs
node scripts/check-quickchain-paid-cache-boundary.mjs
node scripts/check-quickchain-readiness-boundary.mjs
node scripts/check-quickchain-phase1-client-interlock.mjs
node scripts/check-quickchain-phase2-client-replay-boundary.mjs
node scripts/check-quickchain-phase2-committee-boundary.mjs
bash -n scripts/check-tauri.sh
bash -n scripts/dev-quickchain-tauri-park.sh
```

Full wrapper:

```bash
scripts/check-tauri.sh
```

Codebundle regeneration:

```bash
scripts/make_codebundle.sh
```

---

## 12. Current Safe Status Statement

Use this exact status wording going forward:

```text
QuickChain Phase 2 is complete / parked.
The Phase 2 result is small committee replicated verification complete.
CrabLink Tauri + client adapters are complete / parked for Phase 2 Round 2.
CrabLink remains display/user-intent only and does not own verifier, committee, quorum, finality, settlement, wallet, ledger, or paid-unlock authority.
```

Avoid:

```text
QuickChain complete
public chain live
validator network live
staking live
bridge live
ROX live
Solana live
external settlement live
exchange-ready
liquidity-ready
```

---

## 13. Recommended Next Step

Next QuickChain work should begin only after fresh carryover notes are prepared.

According to the buildplan, the next major phase would be:

```text
Phase 3 — passport-gated validator set
```

Do not begin Phase 3 casually.

Before Phase 3 work, create a comprehensive carryover note set and re-read:

```text
QUICKCHAIN_BUILDPLAN.MD
QUICKCHAIN_REVIEW_BUNDLE.MD
latest CODEBUNDLE_RS.md
latest CODEBUNDLE_TAURI_APP.md
latest terminal output proving Phase 2 complete
these CrabLink notes
```

Phase 3 should remain bounded and must not introduce bonded economics, staking, slashing, public bridge, ROX/Solana runtime, public validator economy, or external settlement unless explicitly authorized by the correct later phase.

### END NOTE - JUNE 24 2026 - QUICKCHAIN PHASE 2 ROUND 2 - CRABLINK TAURI + CLIENT ADAPTERS


### END NOTE - JUNE 24 2026 - 02:45 CST


### BEGIN NOTE - JUNE 24 2026 - 17:20 CST

Here are the CrabLink notes for the completed QuickChain Phase 3 Round 1 pass.

### BEGIN NOTE - JUNE 24 2026 - QUICKCHAIN PHASE 3 ROUND 1 - CrabLink Tauri + client adapters

# QuickChain Phase 3 Round 1 Notes — CrabLink Tauri + client adapters

## 0. Status

CrabLink Tauri + client adapters are **GREEN / PARKED** for **QuickChain Phase 3 Round 1**.

This completes the final crate/client pair for Phase 3 Round 1.

Safe completion label:

QuickChain Phase 3 Round 1 complete.

Passport-gated validator identity/registry boundary foundation is complete.

No bonded economics, staking, slashing, bridge, public validator economy, or external settlement has been introduced.

Important distinction:

Phase 3 as a whole is **not complete**.
Phase 3 **Round 1** is complete.

This round only establishes the validator/passport identity and registry boundary foundation. It does not authorize public validators, staking, slashing, bonded economics, bridge behavior, public settlement, or external-chain integration.

---

## 1. What this CrabLink pass accomplished

This pass hardened CrabLink Tauri and client adapters so they can safely acknowledge QuickChain Phase 3 Round 1 readiness without becoming authority.

CrabLink may now display backend-derived Phase 3 readiness language such as:

* validator-readiness-display
* backend-derived validator/readiness status
* passport-required labels
* registry-checked labels
* governance-review labels
* revoked/expired validator labels

But CrabLink still does **not** become:

* validator authority
* passport registry authority
* validator capability authority
* validator-set authority
* quorum authority
* fork-choice authority
* finality authority
* settlement authority
* wallet authority
* ledger authority
* paid unlock authority
* staking authority
* slashing authority
* bonding authority
* bridge authority
* external-chain authority

This preserves the Tauri-first CrabLink doctrine:

React displays and collects user intent.
Tauri Rust mediates native privilege.
Backend services own truth.
svc-wallet mutates ROC.
ron-ledger remains economic truth.
CrabLink never invents balances, receipts, settlement, validator authority, or paid entitlement.

---

## 2. Files changed or added

### Added

* docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md
* scripts/check-quickchain-phase3-client-validator-boundary.mjs

### Updated

* apps/crablink-tauri/package.json
* scripts/check-tauri.sh
* scripts/dev-quickchain-tauri-park.sh
* apps/crablink-tauri/src/platform/tauriPlatform.js
* apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx

---

## 3. New Phase 3 client boundary document

Added:

docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md

Purpose:

Defines the CrabLink/Tauri-side Phase 3 Round 1 boundary for validator/passport readiness display.

It explicitly states that CrabLink may display backend-derived validator/readiness status only as display information. It must not become validator truth, passport registry truth, capability truth, validator-set truth, quorum truth, finality truth, settlement truth, payment truth, wallet truth, ledger truth, or paid entitlement truth.

Key safe phrases added:

* QuickChain Phase 3 Round 1 — validator identity + registry gating
* passport-gated validator identity/registry boundary foundation
* validator-readiness-display
* backend-derived validator/readiness status
* no client-side validator authority
* no passport registry authority
* no validator capability authority
* no validator-set authority
* no staking/slashing/bonding

The document also locks safe completion language:

QuickChain Phase 3 Round 1 complete.

Passport-gated validator identity/registry boundary foundation is complete.

No bonded economics, staking, slashing, bridge, public validator economy, or external settlement has been introduced.

---

## 4. New scanner

Added:

scripts/check-quickchain-phase3-client-validator-boundary.mjs

Purpose:

Static boundary scanner for Phase 3 Round 1 CrabLink client safety.

It verifies that CrabLink does not accidentally drift into validator/passport/settlement authority.

The scanner checks:

* required Phase 3 boundary doc exists
* QuickchainReadinessPage includes display-only Phase 3 language
* package.json exposes the new check script
* check-tauri.sh runs Phase 3 after Phase 2 committee and before build
* dev-quickchain-tauri-park.sh includes Phase 3 completion markers
* tauriPlatform forbidden command patterns include Phase 3 validator/passport authority drift
* QuickchainReadinessPage does not import active adapters
* QuickchainReadinessPage does not invoke/fetch/call backend authority paths
* client API files do not expose QuickChain validator/root/proof/finality/settlement/bridge/staking/slashing authority routes
* display caches do not export authorization-shaped truth flags
* no paid unlock is tied to validator/passport/committee/proof material

The scanner passed.

Observed terminal output:

QuickChain Phase 3 validator boundary check passed.

---

## 5. package.json wiring

Updated:

apps/crablink-tauri/package.json

Added script:

check:quickchain-phase3-validator-boundary

The full app check flow now includes the Phase 3 validator boundary after Phase 2 committee boundary and before build.

This preserves the existing layered client safety sequence:

1. QuickChain client boundary
2. paid/cache boundary
3. readiness boundary
4. Phase 1 client interlock
5. Phase 2 replay boundary
6. Phase 2 committee boundary
7. Phase 3 validator boundary
8. Vite build
9. Tauri Rust mac-media cargo check

---

## 6. check-tauri.sh wiring

Updated:

scripts/check-tauri.sh

The script now runs:

npm run check:quickchain-phase3-validator-boundary

after:

npm run check:quickchain-phase2-committee-boundary

and before:

npm run build

This keeps the low-disk CrabLink gate efficient while still making Phase 3 safety part of the standard Tauri check path.

---

## 7. Tauri platform command hardening

Updated:

apps/crablink-tauri/src/platform/tauriPlatform.js

The Tauri platform command boundary was hardened to reject Phase 3 authority-shaped command drift.

The forbidden patterns now explicitly guard against command names or routes shaped like:

* passport registry authority
* validator registry authority
* validator capability authority
* validator admission
* validator registration
* validator authorization
* validator grant
* validator issuance
* validator revocation
* validator rotation
* validator set authority
* staking
* slashing
* bridge
* settlement
* finality
* quorum
* root/proof/checkpoint/replay authority

This is important because CrabLink may eventually display validator/passport readiness, but no Tauri command may quietly become a local validator-management or settlement authority path.

The allowed Tauri command list remains bounded to app diagnostics, settings, gateway, identity display, wallet display, upload/media/stream, and existing safe bridge functions.

No QuickChain validator, proof, replay, committee, quorum, finality, bridge, staking, slashing, or settlement authority commands were added.

---

## 8. QuickchainReadinessPage update

Updated:

apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx

The page now includes Phase 3 Round 1 readiness language.

Added display-only boundary object:

PHASE3_VALIDATOR_BOUNDARY

Purpose:

Represent the validator/passport readiness display boundary in local UI state only.

Key fields:

* schema: crablink.quickchain-phase3-validator-boundary.v1
* label: Phase 3 Round 1: passport-gated validator identity/registry boundary
* status: display-only
* completionLabel: passport-gated validator identity/registry boundary foundation

The page now explains that backend-derived validator/readiness labels may be displayed but are not:

* validator truth
* passport registry truth
* validator capability truth
* validator-set truth
* quorum truth
* fork-choice truth
* finality truth
* settlement truth
* wallet truth
* ledger truth
* paid unlock authority

The page now includes a Phase 3 progress card:

QuickChain Phase 3 R1
DISPLAY
Validator/passport-registry readiness may be displayed only as backend-derived status, never trusted as validator-set, capability, finality, settlement, or paid unlock.

The page remains display-only. It does not import active gateway, wallet, receipt, settings, or Tauri adapters. It does not fetch, invoke, or call backend APIs.

---

## 9. Park script update

Updated:

scripts/dev-quickchain-tauri-park.sh

The park script now preserves legacy Phase 1 and Phase 2 scanner compatibility markers while adding Phase 3 Round 1 final parking markers.

Preserved legacy markers:

* Phase 1 Round 2 final client parking gate
* Phase 2 Round 2 final client parking gate
* Phase 2 complete
* small committee replicated verification complete

Added active Phase 3 markers:

* Phase 3 Round 1 final client parking gate
* QuickChain Phase 3 Round 1 complete
* passport-gated validator identity/registry boundary foundation

Observed terminal output:

== CrabLink Tauri QuickChain Phase 2 Round 2 committee readiness client parking gate passed ==
== Phase 2 complete ==
== small committee replicated verification complete ==
== CrabLink Tauri QuickChain Phase 3 Round 1 validator/passport client parking gate passed ==
== QuickChain Phase 3 Round 1 complete ==
== passport-gated validator identity/registry boundary foundation complete ==
== no bonded economics, staking, slashing, bridge, public validator economy, or external settlement introduced ==

---

## 10. Tests and gates run

The following focused checks passed:

* node scripts/check-quickchain-readiness-boundary.mjs
* node scripts/check-quickchain-phase1-client-interlock.mjs
* node scripts/check-quickchain-phase2-client-replay-boundary.mjs
* node scripts/check-quickchain-phase2-committee-boundary.mjs
* node scripts/check-quickchain-phase3-client-validator-boundary.mjs

The full park script passed:

* bash scripts/dev-quickchain-tauri-park.sh

The park script ran the full CrabLink Tauri check stack:

* QuickChain client-boundary check passed.
* QuickChain paid/cache boundary check passed.
* QuickChain readiness boundary check passed.
* QuickChain Phase 1 Round 2 client interlock check passed.
* QuickChain Phase 2 replay boundary check passed.
* QuickChain Phase 2 committee boundary check passed.
* QuickChain Phase 3 validator boundary check passed.
* Vite production build passed.
* Tauri Rust mac-media cargo check passed.

Observed build result:

vite v5.4.21 building for production
313 modules transformed
built in 4.87s

Observed Rust result:

crablink-tauri cargo check finished successfully.

---

## 11. What this proves

This proves CrabLink is properly parked for Phase 3 Round 1 as the final client/display layer.

CrabLink can now show Phase 3 validator/passport readiness state in a safe, display-only form.

It does not own or infer validator authority.

It does not own passport registry authority.

It does not own validator capability authority.

It does not own validator-set authority.

It does not own quorum, finality, or settlement truth.

It does not unlock paid content from validator status, registry status, local caches, proofs, attestations, or committee status.

It does not mutate wallets or ledger state.

It does not introduce staking, slashing, bonding, bridge, ROX, Solana, liquidity, exchange-facing logic, or external settlement.

---

## 12. Full Phase 3 Round 1 completion state

The full QuickChain Phase 3 Round 1 crate-pair order is now green:

1. ron-proto + ron-ledger — GREEN / PARKED
2. svc-wallet + ron-accounting — GREEN / PARKED
3. svc-rewarder + svc-storage — GREEN / PARKED
4. svc-gateway + omnigate — GREEN / PARKED
5. svc-index + ron-policy — GREEN / PARKED
6. CrabLink Tauri + client adapters — GREEN / PARKED

This means QuickChain Phase 3 Round 1 is complete across the full stack.

---

## 13. Safe wording for project status

Use:

QuickChain Phase 3 Round 1 is complete.

Passport-gated validator identity/registry boundary foundation is complete.

The full Round 1 pass is green across ron-proto, ron-ledger, svc-wallet, ron-accounting, svc-rewarder, svc-storage, svc-gateway, omnigate, svc-index, ron-policy, and CrabLink Tauri/client adapters.

CrabLink remains display/user-intent only.

No bonded economics, staking, slashing, public validator economy, bridge, ROX, Solana, liquidity, exchange-facing logic, or external settlement has been introduced.

Do not use:

* QuickChain Phase 3 is complete
* public validator network live
* staking is live
* slashing is live
* bonded validators are live
* public settlement is live
* bridge-ready
* external settlement ready
* ROX/Solana integrated
* CrabLink validates the chain
* CrabLink owns validator state
* CrabLink verifies finality
* CrabLink unlocks paid content from validator state

---

## 14. Next likely work: Phase 3 Round 2

Phase 3 Round 2 should continue from the beginning of the fixed crate-pair order unless the buildplan explicitly says otherwise:

1. ron-proto + ron-ledger
2. svc-wallet + ron-accounting
3. svc-rewarder + svc-storage
4. svc-gateway + omnigate
5. svc-index + ron-policy
6. CrabLink Tauri + client adapters

Round 2 should harden validator/passport operation semantics while staying inside the allowed Phase 3 scope.

Likely allowed Round 2 themes:

* validator registry DTO refinement
* validator lifecycle status DTOs
* rotation/revocation display and replay semantics
* evidence DTOs for equivocation or conflicting claims
* degraded validator/readiness states
* challenge/evidence shaping
* registry snapshot determinism
* backend-derived display of validator readiness
* stronger no-authority tests across service/client boundaries

Still forbidden:

* staking
* slashing
* bonding
* public validator economy
* public bridge
* ROX
* Solana
* liquidity
* exchange-facing logic
* external settlement
* client-side validator authority
* gateway/omnigate ledger mutation
* rewarder ledger mutation
* index/policy as settlement truth
* cache as paid unlock truth
* root-producing code without canonical bytes and golden vectors
* pruning before DA/challenge/archive fallback

---

## 15. Final verdict

CrabLink Tauri + client adapters are complete for QuickChain Phase 3 Round 1.

The client boundary is stronger after this pass.

The architecture remains correct:

backend owns truth
svc-wallet mutates ROC
ron-ledger remains economic truth
CrabLink displays/user-confirms
Tauri Rust mediates native privilege
React owns no authority
validator/passport readiness is display-only
no fake balances
no fake receipts
no silent spend
no external settlement creep

### END NOTE - JUNE 24 2026 - QUICKCHAIN PHASE 3 ROUND 1 - CrabLink Tauri + client adapters


### END NOTE - JUNE 24 2026 - 17:20 CST


### BEGIN NOTE - JUNE 25 2026 - 01:55 CST

Here are the **paste-ready CrabLink Tauri notes** for the completed QuickChain Phase 3 Round 2 client pass.

### BEGIN NOTE - JUNE 25 2026 - QUICKCHAIN PHASE 3 ROUND 2 - CrabLink Tauri + Client Adapters

# CrabLink Tauri + Client Adapters Notes — QuickChain Phase 3 Round 2

## 0. Status

CrabLink Tauri + client adapters are now parked for:

```text
QuickChain Phase 3 Round 2
validator operation / lifecycle hardening
```

Final safe status:

```text
CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 3.
QuickChain Phase 3 is complete under the safe label:
passport-gated validator set complete.
```

Do not use stronger labels such as:

```text
QuickChain complete
chain live
public validator network live
staking live
slashing live
bridge live
ROX live
Solana live
external settlement live
exchange ready
```

Those remain future/deferred.

---

## 1. Terminal proof

The final park command completed successfully:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/dev-quickchain-tauri-park.sh
```

The run proved:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 replay boundary check passed.
QuickChain Phase 2 committee boundary check passed.
QuickChain Phase 3 validator boundary check passed.
QuickChain Phase 3 lifecycle boundary check passed.
vite build passed.
Tauri Rust cargo check passed.
```

Build details:

```text
vite v5.4.21 building for production...
313 modules transformed.
✓ built in 4.64s
```

Rust check details:

```text
TAURI_CONFIG="$(cat src-tauri/tauri.macos.dev-media.conf.json)" cargo check --manifest-path src-tauri/Cargo.toml
Finished dev profile target(s)
```

Final park script labels printed:

```text
== CrabLink Tauri QuickChain Phase 3 Round 2 validator lifecycle client parking gate passed ==
== validator operation/lifecycle hardening client boundary complete ==
== QuickChain Phase 3 complete ==
== passport-gated validator set complete ==
== no bonded economics, staking, slashing, bridge, public validator economy, ROX/Solana, or external settlement introduced ==
```

---

## 2. Files added or hardened

### Added

```text
docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md
docs/tauri/QUICKCHAIN_PHASE3_CLIENT_LIFECYCLE_BOUNDARY.md
scripts/check-quickchain-phase3-client-validator-boundary.mjs
scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs
```

### Updated

```text
apps/crablink-tauri/package.json
apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
```

---

## 3. What the Phase 3 CrabLink pass proves

CrabLink can now safely display Phase 3 QuickChain readiness/lifecycle information without becoming authority.

Allowed client behavior:

```text
display backend-derived validator readiness
display backend-derived passport/registry readiness context
display backend-derived validator lifecycle context
display backend-derived governance review context
display backend-derived replay challenge context
display backend-derived downtime/degraded/revoked/expired/evidence context
display local catalog and recent receipts as display-only evidence
route explicit user intent through typed adapters
keep paid unlock tied to backend wallet/ledger receipts
```

Forbidden client behavior remains blocked:

```text
client-side validator authority
client-side validator admission
client-side validator revocation
client-side validator rotation
client-side validator lifecycle mutation
client-side validator downtime authority
client-side equivocation evidence authority
client-side replay challenge authority
client-side governance parameter-update authority
client-side passport registry authority
client-side validator capability authority
client-side validator-set authority
client-side quorum/finality/settlement authority
client-side wallet or ledger truth
cache-only paid unlock
validator/passport/lifecycle-based paid unlock
fake receipts
fake balances
silent spend
staking
slashing
bonding
validator rewards
public validator economy
bridge
ROX
Solana
liquidity
exchange-facing logic
external settlement
```

---

## 4. Boundary documents

### `docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md`

Purpose:

```text
Locks Phase 3 Round 1 validator identity / registry display-only boundary.
```

It states that CrabLink may display backend-derived validator/passport/registry readiness labels, but those labels are not:

```text
validator truth
passport registry truth
validator capability truth
validator-set truth
quorum truth
fork-choice truth
finality truth
settlement truth
payment truth
paid entitlement truth
wallet truth
ledger truth
```

### `docs/tauri/QUICKCHAIN_PHASE3_CLIENT_LIFECYCLE_BOUNDARY.md`

Purpose:

```text
Locks Phase 3 Round 2 validator operation / lifecycle display-only boundary.
```

It states that CrabLink may display backend-derived lifecycle/governance/replay-challenge context, but those labels are not:

```text
validator lifecycle truth
passport registry truth
validator capability truth
governance truth
replay challenge truth
evidence truth
quorum truth
finality truth
settlement truth
payment truth
paid entitlement truth
wallet truth
ledger truth
bridge truth
```

---

## 5. Scanner scripts

### `scripts/check-quickchain-phase3-client-validator-boundary.mjs`

This scanner validates that CrabLink does not introduce validator/passport/registry authority.

It checks:

```text
required docs exist
required page references exist
package scripts exist
check-tauri ordering is correct
QuickchainReadinessPage remains display-only
QuickchainReadinessPage does not import active gateway/wallet/content/site adapters
QuickchainReadinessPage does not call invoke/fetch/gateway/wallet commands
tauriPlatform forbidden command patterns include validator/passport/registry/capability/committee/quorum/finality/settlement/bridge/staking/slashing/ROX/Solana
Tauri allowlist does not include QuickChain authority commands
client API files do not contain validator/passport authority-shaped routes or functions
```

### `scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs`

This scanner validates that CrabLink does not introduce validator lifecycle/governance/replay-challenge authority.

It checks:

```text
required docs exist
required page references exist
package scripts exist
check-tauri ordering is correct
QuickchainReadinessPage lifecycle boundary closes before MILESTONES
QuickchainReadinessPage remains display-only
QuickchainReadinessPage does not import active gateway/wallet/content/site adapters
QuickchainReadinessPage does not call invoke/fetch/gateway/wallet commands
tauriPlatform forbidden command patterns include validator lifecycle, downtime, equivocation, replay challenge, governance parameter updates
Tauri allowlist does not include lifecycle/governance/challenge/finality/settlement commands
client API files do not contain lifecycle authority-shaped routes or functions
client files do not unlock from lifecycle/challenge/governance material
client files do not introduce staking/slashing/bonding/validator rewards/public validator economy/bridge/ROX/Solana/external settlement runtime
```

---

## 6. QuickchainReadinessPage update

`apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx` now includes:

```text
Phase 3 Round 1 validator/passport display boundary
Phase 3 Round 2 lifecycle display boundary
phase3_validator_boundary in export/copy payload
phase3_lifecycle_boundary in export/copy payload
QuickChain Phase 3 R2 progress card
Phase 3 lifecycle truth boundary warning
Phase 3 lifecycle rule card
new milestone:
  quickchain_phase3_lifecycle_display_boundary
```

The page remains static/display-only for QuickChain readiness.

It does not import active adapters and does not call Tauri/gateway/wallet commands.

---

## 7. Tauri platform boundary

`apps/crablink-tauri/src/platform/tauriPlatform.js` now rejects authority-shaped Tauri command names for:

```text
QuickChain roots
state
receipts
checkpoints
proofs
replay
verifiers
validators
committees
attestations
quorum
fork choice
finality
settlement
anchors
bridges
passport registry
validator capability
validator lifecycle
downtime
equivocation
replay challenge
governance parameter updates
staking
slashing
bonding
ROX
Solana
external settlement
```

The allowed command list remains free of QuickChain validator/lifecycle/finality/settlement authority commands.

---

## 8. Check ordering

`apps/crablink-tauri/package.json` now includes:

```text
check:quickchain-phase3-validator-boundary
check:quickchain-phase3-lifecycle-boundary
```

`check` runs the gates in order:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:quickchain-phase1-interlock
check:quickchain-phase2-replay-boundary
check:quickchain-phase2-committee-boundary
check:quickchain-phase3-validator-boundary
check:quickchain-phase3-lifecycle-boundary
build
```

`src-tauri` Rust check also remains part of the Tauri park path.

---

## 9. Final park script

`scripts/dev-quickchain-tauri-park.sh` now acts as the low-duplicate final Tauri park runner.

It preserves older compatibility markers for Phase 1 and Phase 2 scanners and adds:

```text
Phase 3 Round 1 final client parking gate
Phase 3 Round 2 final client parking gate
```

It prints the safe final labels only after all checks and build pass.

---

## 10. Important bug fixed during patching

Initial patch caused a JSX syntax splice in:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

The error was:

```text
Expected ":" but found "MILESTONES"
```

Root cause:

```text
PHASE3_LIFECYCLE_BOUNDARY was inserted without a correct closing `});` before `const MILESTONES`.
```

Fix applied:

```text
Added a repair script that ensures PHASE3_LIFECYCLE_BOUNDARY closes before MILESTONES.
Updated lifecycle scanner to check that closure structurally.
Fixed an over-escaped scanner regex false failure by replacing it with index/slice/endsWith logic.
```

Final result:

```text
Phase 3 lifecycle scanner passed.
vite build passed.
Tauri Rust cargo check passed.
park script passed.
```

---

## 11. Current QuickChain phase status

Current completed phases:

```text
Phase 0 complete / parked
Phase 1 complete / parked
Phase 2 complete / parked
Phase 3 complete / parked
```

Safe Phase 3 completion wording:

```text
QuickChain Phase 3 complete.
passport-gated validator set complete.
```

Meaning of that wording:

```text
The project has completed the planned Phase 3 boundary/hardening pass across the normal crate-pair order.
It does not mean QuickChain is live.
It does not mean public validators exist.
It does not mean staking/slashing/bonding exist.
It does not mean bridge/external settlement exists.
It does not mean ROX/Solana exists.
```

---

## 12. Commands to rerun later

Focused scanner rerun:

```bash
cd /Users/mymac/Desktop/crablink

node scripts/check-quickchain-phase3-client-validator-boundary.mjs
node scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs
```

Full Tauri park rerun:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/dev-quickchain-tauri-park.sh
```

Expected final labels:

```text
== CrabLink Tauri QuickChain Phase 3 Round 2 validator lifecycle client parking gate passed ==
== validator operation/lifecycle hardening client boundary complete ==
== QuickChain Phase 3 complete ==
== passport-gated validator set complete ==
== no bonded economics, staking, slashing, bridge, public validator economy, ROX/Solana, or external settlement introduced ==
```

---

## 13. Next recommended session step

Next session should begin with a comprehensive carryover note and buildplan review before starting the next phase.

Do not automatically jump into:

```text
ROX
Solana
public bridge
staking
slashing
bonding
external settlement
liquidity
exchange-facing logic
```

without explicit later-phase authorization.

Likely next work should be determined from:

```text
QUICKCHAIN_BUILDPLAN.MD
QUICKCHAIN_REVIEW_BUNDLE.MD
latest carryover notes
```

The next phase after Phase 3 should remain fortress-style and boundary-first.

### END NOTE - JUNE 25 2026 - QUICKCHAIN PHASE 3 ROUND 2 - CrabLink Tauri + Client Adapters


### END NOTE - JUNE 25 2026 - 01:55 CST


### BEGIN NOTE - JUNE 25 2026 - 23:05 CST

Here are the paste-ready **CrabLink Tauri notes** for QuickChain Phase 4 Round 1.

# CrabLink Tauri Notes — QuickChain Phase 4 Round 1 Client Bond Boundary

Date: June 25/26, 2026
Repo: crablink
Area: CrabLink Tauri + client adapters
Phase: QuickChain Phase 4 Round 1
Status: COMPLETE / PARKED

## 0. TL;DR

CrabLink Tauri + client adapters are now complete and parked for QuickChain Phase 4 Round 1.

This closes the CrabLink client side of:

* bond DTOs
* no-op accounting model
* backend-derived bond status display
* slash evidence display as diagnostics only
* no staking market
* no liquidity
* no automatic slashing live
* no exchange-facing logic
* no ROX/Solana
* no bridge
* no external settlement

The client remains display/user-intent only. It does not become bond truth, slash truth, staking authority, liquidity authority, wallet truth, ledger truth, finality truth, settlement truth, paid-unlock truth, bridge authority, or external-chain authority.

## 1. What changed

Added the Phase 4 Round 1 CrabLink client bond boundary.

New doc added:

* docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_BOUNDARY.md

New scanner added:

* scripts/check-quickchain-phase4-client-bond-boundary.mjs

Package/check wiring added:

* apps/crablink-tauri/package.json now includes:

  * check:quickchain-phase4-bond-boundary
  * check chain runs Phase 4 bond boundary after Phase 3 lifecycle boundary and before build

Tauri check wrapper updated:

* scripts/check-tauri.sh now runs:

  * Phase 3 lifecycle boundary
  * Phase 4 bond boundary
  * Vite build
  * Rust cargo check

Tauri park script updated:

* scripts/dev-quickchain-tauri-park.sh now parks Phase 4 Round 1 and prints safe completion labels:

  * CrabLink Tauri QuickChain Phase 4 Round 1 bond/no-op accounting client parking gate passed
  * bond DTOs and no-op accounting client boundary complete
  * QuickChain Phase 4 Round 1 complete
  * bond DTOs and no-op accounting model complete
  * no automatic slashing live, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, or external settlement introduced

Tauri platform command bridge hardened:

* apps/crablink-tauri/src/platform/tauriPlatform.js

Added explicit forbidden command patterns for Phase 4 authority-shaped commands, including:

* bond intent
* validator bond
* bond account
* bond lifecycle
* slash evidence
* slash decision
* staking market
* liquidity pool

QuickChain readiness UI updated:

* apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx

The page now includes:

* Phase 4 Round 1 bond/no-op accounting wording
* PHASE4_BOND_BOUNDARY constant
* Phase 4 bond display milestone
* Phase 4 bond TruthBoundary
* Phase 4 progress card
* Developer JSON field:

  * phase4_bond_boundary
* explicit forbidden scope entries:

  * no client-side bond truth
  * no client-side slash truth
  * no staking market authority
  * no liquidity authority
  * no automatic slashing live
  * no public staking market
  * no paid unlock from bond status

Display cache comments updated:

* apps/crablink-tauri/src/shared/receipts/recentReceipts.js
* apps/crablink-tauri/src/shared/catalog/localCatalog.js

These now explicitly state that bond/slash/stake/liquidity labels are display-only and never paid unlock authority.

## 2. Terminal result

The park script ran successfully:

* QuickChain client-boundary check passed
* QuickChain paid/cache boundary check passed
* QuickChain readiness boundary check passed
* QuickChain Phase 1 Round 2 client interlock check passed
* QuickChain Phase 2 replay boundary check passed
* QuickChain Phase 2 committee boundary check passed
* QuickChain Phase 3 validator boundary check passed
* QuickChain Phase 3 lifecycle boundary check passed
* QuickChain Phase 4 bond boundary check passed
* vite build passed
* cargo check passed for Tauri Rust mac-media config

Vite build result:

* 313 modules transformed
* production build completed successfully

Rust check result:

* cargo check --manifest-path src-tauri/Cargo.toml completed successfully

Park output confirmed:

* CrabLink Tauri QuickChain Phase 4 Round 1 bond/no-op accounting client parking gate passed
* bond DTOs and no-op accounting client boundary complete
* QuickChain Phase 4 Round 1 complete
* bond DTOs and no-op accounting model complete
* no automatic slashing live, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, or external settlement introduced

## 3. Small non-blocking issue

The command:

```
scripts/make_codebundle.sh
```

hit:

```
zsh: permission denied: scripts/make_codebundle.sh
```

This was not a QuickChain, build, scanner, Vite, or Rust failure.

The workaround succeeded:

```
bash scripts/make_codebundle.sh
```

Codebundle was generated successfully:

```
/Users/mymac/Desktop/crablink/CODEBUNDLE_TAURI_APP.md
```

Recommended small cleanup:

```
chmod +x scripts/make_codebundle.sh
```

## 4. Boundary status

CrabLink may display backend-derived Phase 4 labels only as diagnostics:

* bond status display
* slash evidence display
* no-op accounting display
* bond review display
* backend-derived validator bond/readiness context

CrabLink must not:

* open validator bonds
* close validator bonds
* lock validator bonds
* unlock validator bonds
* capture validator bonds
* release validator bonds
* slash validators
* execute slashing
* commit slash decisions
* create staking markets
* create liquidity pools
* settle bonds
* unlock paid content from bond status
* treat slash evidence as ledger mutation authority
* create any bridge, ROX/Solana, public staking, liquidity, exchange-facing, or external settlement runtime

## 5. Paid unlock rule preserved

Accepted backend wallet/ledger receipts remain the only paid unlock authority.

The following must never unlock paid content:

* local cache status
* bond status
* slash evidence
* no-op accounting labels
* validator status
* readiness labels
* lifecycle labels
* committee labels
* attestation labels
* replay/verifier labels

## 6. CrabLink role preserved

CrabLink Tauri remains:

* client/product layer
* display surface
* user-intent surface
* confirmation surface
* gateway-first app shell
* Tauri Rust mediated command bridge

CrabLink Tauri is not:

* ledger
* wallet
* accounting truth
* rewarder
* storage authority
* index authority
* policy authority
* validator authority
* bond authority
* slash authority
* staking authority
* liquidity authority
* bridge authority
* settlement authority
* external-chain authority

## 7. Safe completion labels

Safe crate-pair completion label:

```
CrabLink Tauri + client adapters are COMPLETE / PARKED for QuickChain Phase 4 Round 1.
```

Safe round completion label:

```
QuickChain Phase 4 Round 1 complete.
bond DTOs and no-op accounting model complete.
```

Unsafe labels to avoid:

```
QuickChain complete
chain live
staking live
slashing live
public validator economy live
public staking market live
liquidity live
bridge live
external settlement live
ROX/Solana live
exchange ready
```

## 8. Current conclusion

CrabLink Tauri + client adapters are green for QuickChain Phase 4 Round 1.

Assuming the prior RustyOnions crate pairs remain green from earlier Phase 4 Round 1 sessions, QuickChain Phase 4 Round 1 is complete across the planned crate-pair sequence.

Next project step should be carryover notes for the next session before beginning QuickChain Phase 4 Round 2.


### END NOTE - JUNE 25 2026 - 23:05 CST


### BEGIN NOTE - JUNE 26 2026 - 03:40 CST

# CrabLink Tauri + Client Adapters Notes — QuickChain Phase 4 Round 2

## Status

**COMPLETE / PARKED for QuickChain Phase 4 Round 2.**

The final CrabLink park run is green. The log shows the full Tauri/client gate chain passing through Phase 1, Phase 2, Phase 3, Phase 4 Round 1, and **Phase 4 Round 2 bond dispute boundary**, followed by a successful Vite production build and successful Tauri Rust `cargo check`. 

Final status label:

```text
CrabLink Tauri + client adapters are COMPLETE / PARKED for QuickChain Phase 4 Round 2.
```

Because all prior backend crate pairs for Phase 4 Round 2 were already green, this also closes:

```text
QuickChain Phase 4 Round 2 complete.
bond dispute and challenge simulation boundary complete.
```

This does **not** mean all of Phase 4 is complete. **Phase 4 Round 3** remains future work.

---

## Final Green Gates Proven

The final park run proved:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 replay boundary check passed.
QuickChain Phase 2 committee boundary check passed.
QuickChain Phase 3 validator boundary check passed.
QuickChain Phase 3 lifecycle boundary check passed.
QuickChain Phase 4 bond boundary check passed.
QuickChain Phase 4 bond dispute boundary check passed.
vite build passed.
Tauri Rust mac-media cargo check passed.
```

The final output also restored the older parking markers required by Phase 1, Phase 2, and Phase 3 scanners, then emitted the Phase 4 Round 1 and Round 2 completion markers. 

---

## Codebundle Reference

Latest CrabLink codebundle reference:

```text
CODEBUNDLE_TAURI_APP.md
Generated: 2026-06-26T08:21:24Z
Root: /Users/mymac/Desktop/crablink
Git: 6dd0214 (dirty)
Text files: 435
Binary assets omitted: 122
```

The bundle includes the Tauri app source, Rust command bridge, Tauri docs, platform/core packages, and selected Tauri scripts, including the QuickChain boundary scanners and park/check scripts. 

---

## What Changed / Was Locked

CrabLink now has a Phase 4 Round 2 client-side boundary for **bond dispute / challenge simulation readiness**.

The key additions/updates were:

```text
docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_DISPUTE_BOUNDARY.md
scripts/check-quickchain-phase4-client-bond-dispute-boundary.mjs
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

`package.json` now wires:

```text
check:quickchain-phase4-bond-dispute-boundary
```

The main `check` chain now runs Phase 4 Round 2 before build:

```text
check:quickchain-phase4-bond-boundary
check:quickchain-phase4-bond-dispute-boundary
build
check:rust:mac-media
```

The new Phase 4 Round 2 doc states that CrabLink may display backend-derived dispute, challenge, appeal, freeze, slash-evidence, disputed-bond lifecycle, replayable dispute-state, and simulation-risk labels, but those labels are diagnostic UI only and not authority. 

---

## Boundary Preserved

CrabLink remains:

```text
display/user-intent only
gateway-first
typed adapter driven
Tauri-mediated for native privilege
non-authoritative for QuickChain state
non-authoritative for wallet/ledger truth
non-authoritative for paid unlock truth
```

CrabLink may display:

```text
backend-derived dispute status
backend-derived challenge-window status
backend-derived slash evidence validation display
backend-derived appeal state
backend-derived freeze state
backend-derived disputed-bond lifecycle
backend-derived replayable dispute state labels
simulation-risk disclosures
```

CrabLink must not create or decide:

```text
dispute truth
challenge-window truth
slash evidence validation truth
appeal authority
freeze authority
irreversible slash authority
slash simulation authority
bond truth
wallet truth
ledger truth
paid entitlement truth
settlement truth
bridge truth
external-chain truth
```

---

## Forbidden Scope Still Blocked

The Phase 4 Round 2 CrabLink pass did **not** introduce:

```text
live irreversible slash
one-step irreversible slash
public staking market
liquidity
exchange-facing logic
public bridge
ROX
Solana
external settlement
fake balances
fake receipts
fake finality
silent spend
cache-only paid unlock
client-side dispute truth
client-side challenge-window truth
client-side appeal authority
client-side freeze authority
client-side slashing authority
CrabLink chain authority
```

This is exactly the right posture for Phase 4 Round 2: **simulation/readiness display only, no live enforcement from the client.**

---

## Failure/Fix Trail

The initial Round 2 CrabLink patch had two issues:

1. The new dispute scanner file was missing, so the first attempt could not prove the Phase 4 Round 2 gate.
2. The park script rewrite dropped older marker strings required by Phase 1, Phase 2, and Phase 3 scanners.

Both were repaired.

The final run confirms the new dispute scanner exists, is wired into the check chain, passes before build, and the older marker expectations are restored. 

---

## Final CrabLink Notes

CrabLink Tauri + client adapters are now parked for Phase 4 Round 2.

The client can safely show Phase 4 Round 2 dispute/challenge readiness material, but it still cannot mutate QuickChain, produce settlement truth, perform slashing, adjudicate disputes, freeze bonds, unlock paid content from cache/dispute/challenge metadata, or bypass backend wallet/ledger receipts.

The completed Phase 4 Round 2 client boundary is consistent with the project doctrine:

```text
backend owns truth
CrabLink displays truth
wallet/ledger own economic mutation
cache is convenience
QuickChain remains future settlement infrastructure
ROC remains internal
no external settlement creep
```

## Next

Next QuickChain work should be **Phase 4 Round 3**, starting again at:

```text
ron-proto + ron-ledger
```

Round 3 is the controlled live internal-only bond enforcement round. It should stay backend-first and internal-only: no public staking market, no liquidity, no bridge, no ROX/Solana, no external settlement, and no CrabLink-side authority.


### END NOTE - JUNE 26 2026 - 03:40 CST


### BEGIN NOTE - JUNE 26 2026 - 20:45 CST

The terminal output confirms CrabLink is green: the new Phase 4 Round 3 checker passed, all prior QuickChain client boundary checks passed, Vite built successfully, Tauri Rust cargo check finished cleanly, and the final park markers show QuickChain Phase 4 complete / internal bonded validator model complete. 

Here are the paste-ready CrabLink notes:

### BEGIN NOTE - JUNE 26 2026 - QUICKCHAIN PHASE 4 ROUND 3 - CRABLINK TAURI

# CrabLink Tauri + client adapters — QuickChain Phase 4 Round 3 Notes

## Status

CrabLink Tauri + client adapters are COMPLETE / PARKED for QuickChain Phase 4 Round 3.

CrabLink Tauri + client adapters are also COMPLETE / PARKED for all of QuickChain Phase 4.

Safe final status label:

```text
CrabLink Tauri + client adapters: GREEN / PARKED for QuickChain Phase 4.
QuickChain Phase 4 complete.
internal bonded validator model complete.
```

This completes the final Phase 4 portion after these crate pairs were already parked:

```text
1. ron-proto + ron-ledger
2. svc-wallet + ron-accounting
3. svc-rewarder + svc-storage
4. svc-gateway + omnigate
5. svc-index + ron-policy
6. CrabLink Tauri + client adapters
```

## What this pass finished

This pass added and parked the final CrabLink client boundary for:

```text
QuickChain Phase 4 Round 3 — controlled live internal-only bond enforcement
```

For CrabLink, the rule is:

```text
display-only bond enforcement status
backend-derived bond enforcement/capture/release status only
no client-side bond enforcement truth
no reserve-slash authority
no capture authority
no release authority
no controlled slash authority
no paid unlock from enforcement metadata
```

CrabLink may display backend-derived Phase 4 bond enforcement context, but it must never create, execute, infer, finalize, settle, unlock, or mutate anything locally.

## Files touched

The Phase 4 Round 3 CrabLink patch touched these files:

```text
docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_ENFORCEMENT_BOUNDARY.md
scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

No Cargo.toml changes.

## New boundary doc

Added:

```text
docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_ENFORCEMENT_BOUNDARY.md
```

The doc locks the final CrabLink Phase 4 doctrine:

```text
QuickChain Phase 4 Round 3
controlled live bond enforcement
display-only bond enforcement status
backend-derived bond enforcement/capture/release status
no client-side bond enforcement truth
no reserve-slash authority
no capture authority
no release authority
no paid unlock from bond enforcement, slash reserve, capture, release, policy, index, cache, localStorage, or sessionStorage
svc-wallet remains the mutation front-door
ron-ledger remains durable economic truth
QuickChain Phase 4 complete
internal bonded validator model complete
```

## New checker

Added:

```text
scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs
```

The checker verifies that CrabLink does not become:

```text
bond enforcement truth
slash reserve truth
capture authority
release authority
controlled slash authority
validator consequence authority
wallet authority
ledger authority
paid unlock authority
finality authority
settlement authority
staking authority
liquidity authority
bridge authority
ROX/Solana authority
external settlement authority
exchange-facing authority
```

The checker scans the Tauri/React/client surface for unsafe command names, route names, dependencies, capability grants, and suspicious paid-unlock truth derived from enforcement/policy/index/cache metadata.

## package.json changes

Added the new npm script:

```text
check:quickchain-phase4-bond-enforcement-boundary
```

It runs:

```text
node ../../scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs
```

The app check chain now includes the Phase 4 Round 3 bond enforcement boundary before build.

## Tauri check script changes

Updated:

```text
scripts/check-tauri.sh
```

The script now runs the full QuickChain client sequence:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:quickchain-phase1-interlock
check:quickchain-phase2-replay-boundary
check:quickchain-phase2-committee-boundary
check:quickchain-phase3-validator-boundary
check:quickchain-phase3-lifecycle-boundary
check:quickchain-phase4-bond-boundary
check:quickchain-phase4-bond-dispute-boundary
check:quickchain-phase4-bond-enforcement-boundary
build
check:rust:mac-media
```

## Park script changes

Updated:

```text
scripts/dev-quickchain-tauri-park.sh
```

The park script now emits final Phase 4 closeout markers:

```text
CrabLink Tauri QuickChain Phase 4 Round 3 bond enforcement client parking gate passed
controlled live bond enforcement client boundary complete
QuickChain Phase 4 Round 3 complete
controlled live bond enforcement complete
QuickChain Phase 4 complete
internal bonded validator model complete
CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 4
```

It also preserves the forbidden-scope closeout:

```text
no public staking market
no liquidity
no exchange-facing logic
no public bridge
no ROX/Solana
no external settlement
no fake receipts
no fake balances
no fake finality
no client paid-unlock truth introduced
```

## Codebundle generator changes

Updated:

```text
scripts/make_codebundle.sh
```

The codebundle generator now includes the Phase 4 client scripts, including:

```text
scripts/check-quickchain-phase4-client-bond-boundary.mjs
scripts/check-quickchain-phase4-client-bond-dispute-boundary.mjs
scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs
```

This keeps future CrabLink Tauri bundles complete for Phase 4 review.

## QuickchainReadinessPage changes

Updated:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
```

The readiness page now includes Phase 4 Round 3 controlled bond enforcement display context.

Added boundary schema:

```text
crablink.quickchain-phase4-bond-enforcement-boundary.v1
```

The page now labels:

```text
Phase 4 Round 3: controlled live bond enforcement
display-only bond enforcement status
backend-derived bond enforcement/capture/release status
no client-side bond enforcement truth
no reserve-slash authority
no capture authority
no release authority
accepted wallet/ledger receipts remain the only paid unlock authority
QuickChain Phase 4 complete
internal bonded validator model complete
```

The page remains display-only and uses local display sources only:

```text
readLocalCatalog
subscribeLocalCatalog
readRecentReceipts
subscribeRecentReceipts
```

It does not import active gateway/wallet/client adapters for QuickChain readiness status.

It does not invoke Tauri commands.

It does not fetch backend truth directly.

It does not create paid unlock truth.

## Terminal proof

Focused patch proof:

```text
QuickChain Phase 4 bond enforcement client boundary check passed.
QuickChain Phase 4 Round 3 CrabLink bond enforcement boundary patch applied.
```

Full CrabLink park proof:

```text
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 replay boundary check passed.
QuickChain Phase 2 committee boundary check passed.
QuickChain Phase 3 validator boundary check passed.
QuickChain Phase 3 lifecycle boundary check passed.
QuickChain Phase 4 bond boundary check passed.
QuickChain Phase 4 bond dispute boundary check passed.
QuickChain Phase 4 bond enforcement client boundary check passed.
vite build passed.
cargo check passed.
```

Final terminal markers:

```text
CrabLink Tauri QuickChain Phase 4 Round 3 bond enforcement client parking gate passed.
controlled live bond enforcement client boundary complete.
QuickChain Phase 4 Round 3 complete.
controlled live bond enforcement complete.
QuickChain Phase 4 complete.
internal bonded validator model complete.
CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 4.
```

## What this proves

This pass proves:

```text
CrabLink remains display/user-intent only.
React owns display, not authority.
TypeScript owns no backend truth.
Tauri Rust remains a bounded native bridge, not wallet or ledger authority.
CrabLink may display backend-derived bond enforcement status only.
CrabLink may display backend-derived slash reserve/capture/release status only.
CrabLink does not execute bond enforcement.
CrabLink does not reserve slash material.
CrabLink does not capture slash reserves.
CrabLink does not release slash reserves.
CrabLink does not execute controlled slashing.
CrabLink does not create validator consequences.
CrabLink does not create finality.
CrabLink does not create settlement truth.
CrabLink does not create paid unlock truth.
CrabLink does not unlock paid content from policy, index, enforcement metadata, cache, localStorage, sessionStorage, or IndexedDB.
Accepted wallet/ledger receipts remain the only paid unlock authority.
svc-wallet remains the mutation front-door.
ron-ledger remains durable economic truth.
```

## What remains forbidden

Still forbidden in CrabLink:

```text
executeBondEnforcement
commitBondEnforcement
enforceBond
reserveSlash
createSlashReserve
captureSlashReserve
releaseSlashReserve
captureValidatorBond
releaseValidatorBond
slashValidator
controlledSlash
executeControlledSlash
commitControlledSlash
createValidatorConsequence
createFinality
createSettlementTruth
createPaidUnlockTruth
unlockFromBondEnforcement
unlockFromSlashReserve
unlockFromPolicyAllow
unlockFromIndexPointer
unlockFromCache
unlockFromLocalStorage
unlockFromSessionStorage
openStakingMarket
createStakingMarket
createLiquidityPool
grantLiquidityAuthority
bridgeSettlement
externalSettlement
solanaSettlement
mintRox
public staking market
liquidity
exchange-facing logic
bridge
ROX
Solana
external settlement
fake receipts
fake balances
fake finality
silent spend
client paid-unlock truth
```

## Safe claims now

Safe to say:

```text
QuickChain Phase 4 complete.
internal bonded validator model complete.
CrabLink Tauri + client adapters are complete / parked for QuickChain Phase 4.
All six planned Phase 4 crate pairs are green / parked.
The internal bonded validator model is complete at the boundary/proof level intended for Phase 4.
```

## Not safe to claim

Do not say:

```text
QuickChain fully complete
public staking live
public validator economy live
exchange-ready
liquidity-ready
bridge live
ROX live
Solana live
external settlement live
public settlement chain live
public validator market live
```

## Correct architecture statement

The correct Phase 4 closeout architecture statement is:

```text
Backend owns truth.
svc-wallet mutates ROC.
ron-ledger is durable economic truth.
ron-accounting reports snapshots only.
svc-rewarder plans payouts only.
svc-storage stores bytes only.
svc-gateway and omnigate expose backend-derived flows only.
svc-index points only.
ron-policy declares only.
CrabLink displays and captures explicit user intent only.
```

## Recommended next action

Next, write comprehensive carryover notes for beginning QuickChain Phase 5.

Those notes should start from:

```text
QuickChain Phase 4 is complete / parked.
Internal bonded validator model complete.
The next phase is QuickChain Phase 5.
```

Phase 5 must not begin by introducing bridge/ROX/Solana/external settlement unless the buildplan explicitly authorizes a narrow docs/threat-model/vector-planning slice.

Phase 5 should begin with the buildplan and review bundle read first.

### END NOTE - JUNE 26 2026 - QUICKCHAIN PHASE 4 ROUND 3 - CRABLINK TAURI


### END NOTE - JUNE 26 2026 - 20:45 CST


### BEGIN NOTE - JUNE 27 2026 - 23:10 CST

## CrabLink Tauri + client adapters — QuickChain Phase 5 Round 1 notes

**Status:** complete / parked for **QuickChain Phase 5 Round 1**.

The final run is green. The Phase 2 committee compatibility check passed, the focused Phase 5 anchor-only client boundary check passed, all prior QuickChain client gates passed, Vite built successfully, and the Tauri Rust check completed successfully. 

## What this round proved

CrabLink can now safely display **backend-derived anchor dry-run metadata** without becoming QuickChain authority.

The Phase 5 scanner locks the client surface around these files and surfaces: the Phase 5 Tauri doc, `QuickchainReadinessPage.jsx`, app `package.json`, `scripts/check-tauri.sh`, `scripts/dev-quickchain-tauri-park.sh`, `scripts/make_codebundle.sh`, `tauriPlatform.js`, Tauri Rust command files, and Tauri capability config. 

The scanner requires the Phase 5 client doctrine phrases: anchor evidence is display-only, external anchors do not mutate ROC balances, anchors do not replace wallet/ledger truth, anchors do not unlock paid content, no ROX/Solana active runtime, no public bridge, no external settlement, and no client-side paid unlock from anchor evidence. 

## Files touched / locked in this CrabLink round

`docs/tauri/QUICKCHAIN_PHASE5_CLIENT_ANCHOR_BOUNDARY.md`

`apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx`

`scripts/check-quickchain-phase5-client-anchor-boundary.mjs`

`apps/crablink-tauri/package.json`

`package.json`

`scripts/check-tauri.sh`

`scripts/dev-quickchain-tauri-park.sh`

`scripts/make_codebundle.sh`

The generated codebundle also confirms the Tauri app bundle includes the Tauri source, docs, platform/core packages, selected QuickChain scripts, and excludes build output, transient state, secrets, lockfile bodies, and binary file bodies. 

## Important fixes applied during the round

The root `package.json` needed a repo-root alias for:

`check:quickchain-phase5-anchor-boundary`

That alias delegates to the app package’s Phase 5 check so the normal repo-root workflow works.

The Phase 5 doc needed the exact scanner phrase:

`no client-side paid unlock from anchor evidence`

The Phase 5 scanner had one false-positive around defensive bridge/staking/liquidity wording in `tauriPlatform.js`. The fix narrowed “package reference” detection to real dependency/import/package contexts instead of comments or deny-pattern text.

`QuickchainReadinessPage.jsx` needed the legacy Phase 2 phrase:

`no quorum/finality/settlement`

That restored compatibility with the older committee-boundary scanner without adding any authority.

The failed `node --check "$PAGE"` line was only a bad validation command because Node does not directly syntax-check `.jsx` in this ESM setup. The real JSX validation was covered by the Vite build, which passed. 

## Locked client boundary

CrabLink remains:

```text
display-only
user-intent-only
gateway-first
backend-derived-truth-only
cache-convenience-only
Tauri-first
React display/user intent only
TypeScript adapter boundary only
Rust-side native privilege boundary
```

The backend truth model remains unchanged:

```text
svc-wallet = mutation front-door
ron-ledger = durable economic truth
ron-accounting = reporting/snapshots, not balance truth
svc-rewarder = payout planning, not mutation
svc-storage = bytes/artifacts, not settlement
svc-gateway = public boundary, not ledger mutation
omnigate = hydration/access composition, not ledger mutation
svc-index = lookup/pointer metadata, not payment truth
ron-policy = declarative policy, not settlement truth
CrabLink = display/user intent only
```

The prior carry notes explicitly preserve this source-of-truth boundary. 

## Paid/cache boundary preserved

CrabLink must not unlock paid content from anchor material.

Allowed paid unlock path remains:

```text
quote / prepare
→ explicit user confirmation
→ backend wallet path
→ backend receipt
→ unlock/render
→ display-only receipt cache
→ balance refresh
```

Forbidden unlock paths remain:

```text
anchor evidence unlocks paid content
cache-only unlocks paid content
index pointer unlocks paid content
policy allow unlocks paid content
gateway header unlocks paid content
omnigate hydration unlocks paid content
client-side anchor status unlocks paid content
```

The carry notes also preserve that verified cache cannot unlock paid content alone and anchor evidence cannot become entitlement, receipt, balance, finality, or settlement truth. 

## Green commands from this round

The final successful run used:

```bash
npm --prefix apps/crablink-tauri run check:quickchain-phase2-committee-boundary
npm run check:quickchain-phase5-anchor-boundary
bash scripts/dev-quickchain-tauri-park.sh
```

The park run executed all existing QuickChain client checks, the Phase 5 check, Vite build, and Tauri Rust check. 

## Final park markers

The final terminal output includes:

```text
== CrabLink Tauri QuickChain Phase 5 Round 1 anchor-only client parking gate passed ==
== anchor-only dry-run client boundary complete ==
== QuickChain Phase 5 Round 1 complete ==
== anchor-only dry-run boundary sweep complete ==
== CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 5 Round 1 ==
== no anchor authority, no external-chain ROC truth, no paid unlock from anchor evidence, no bridge, no ROX/Solana, no external settlement, no fake receipts, no fake balances, no fake finality, and no silent spend introduced ==
```

These markers are present in the successful terminal output and are also wired into the park script/codebundle.  

## Safe status language

Safe to say:

```text
CrabLink Tauri + client adapters are complete / parked for QuickChain Phase 5 Round 1.
QuickChain Phase 5 Round 1 is complete.
The anchor-only dry-run boundary sweep is complete.
```

Do **not** say:

```text
Phase 5 complete
QuickChain complete
bridge live
Solana live
ROX live
external settlement live
public chain live
exchange ready
```

Those forbidden labels are part of the carryover completion criteria. 

## Carry-forward warnings for the next QuickChain work

Phase 5 Round 1 was **anchor-only design and dry-run**. It did not introduce live anchors as authority, external settlement, public bridge logic, ROX/Solana runtime code, public staking, liquidity, exchange-facing logic, fake receipts, fake balances, fake finality, client-side paid unlock truth, or silent spend.

For the next round, keep this doctrine intact:

```text
anchors are evidence/status only
wallet/ledger remain ROC truth
paid unlock still requires backend receipt/access response
CrabLink displays, but does not decide
cache verifies b3 for render safety, but cannot unlock paid content alone
no external-chain material mutates ROC balances
```

The likely next milestone should be read from `QUICKCHAIN_BUILDPLAN.MD`, but based on Phase 5 structure, the next safe theme after Round 1 is expected to be DA/archive/challenge fallback work, not live external settlement.


### END NOTE - JUNE 27 2026 - 23:10 CST


### BEGIN NOTE - JUNE 28 2026 - 13:10 CST

## QuickChain Phase 5 Round 2 Crate Notes — CrabLink Tauri + client adapters

**Status:** COMPLETE / GREEN / PARKED.

**Phase / Round:** QuickChain Phase 5 Round 2 — DA/archive/challenge fallback.

**Crate / app surface:** CrabLink Tauri + client adapters.

**Round purpose:** Allow CrabLink to display backend-derived DA/archive/challenge fallback status while keeping the client strictly display-only. CrabLink does not become DA truth, archive restore truth, missing-data challenge truth, pruning authority, paid unlock authority, wallet truth, ledger truth, finality truth, settlement truth, bridge truth, or external-chain ROC truth.

The terminal output confirms the focused Phase 5 DA/archive/challenge checker passed, the full QuickChain client check chain passed, Vite built successfully, Rust `cargo check` finished, the Phase 5 Round 2 park markers printed, and the Tauri codebundle regenerated. 

## Files changed

```text
docs/tauri/QUICKCHAIN_PHASE5_CLIENT_DA_FALLBACK_BOUNDARY.md
scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
CODEBUNDLE_TAURI_APP.md
```

## What changed

Added the new Phase 5 Round 2 CrabLink boundary doc:

```text
docs/tauri/QUICKCHAIN_PHASE5_CLIENT_DA_FALLBACK_BOUNDARY.md
```

This doc defines the client-side DA/archive/challenge fallback rule:

```text
CrabLink may display backend-derived DA/archive/challenge fallback metadata.
CrabLink may display DA bundle labels.
CrabLink may display archive restore labels.
CrabLink may display missing-data challenge labels.
CrabLink may display retention-window labels.
CrabLink may display pruning-blocked labels.
CrabLink may display b3 artifact references.
CrabLink must not treat any of that as authority.
```

Added the focused boundary scanner:

```text
scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs
```

The scanner checks that CrabLink does not introduce authority-shaped DA/archive/challenge/pruning surfaces, forbidden invoke names, forbidden routes, forbidden external-chain package references, or paid unlock coupling from DA/archive/challenge evidence.

Updated `apps/crablink-tauri/package.json` with:

```text
check:quickchain-phase5-da-fallback-boundary
```

The aggregate `npm run check` now includes the new Phase 5 Round 2 DA/archive/challenge boundary check.

Updated `scripts/check-tauri.sh` so the standard Tauri check lane runs the new DA/archive/challenge scanner.

Updated `scripts/dev-quickchain-tauri-park.sh` so the park gate now prints the Phase 5 Round 2 completion markers.

Updated `apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx` so the readiness dashboard now includes Phase 5 Round 2 DA/archive/challenge fallback readiness as display-only metadata.

Repaired and hardened `scripts/make_codebundle.sh` after the malformed insertion issue, then regenerated:

```text
CODEBUNDLE_TAURI_APP.md
```

## Validation run

The final run covered:

```text
node --check scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs
node scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs
bash scripts/dev-quickchain-tauri-park.sh
bash scripts/make_codebundle.sh
```

The park script delegated the full Tauri lane and confirmed all prior QuickChain client gates remained green, including Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 Round 1 anchor-only, and the new Phase 5 Round 2 DA/archive/challenge fallback check. 

## Green proof summary

```text
QuickChain Phase 5 DA/archive/challenge client boundary check passed.
QuickChain client-boundary check passed.
QuickChain paid/cache boundary check passed.
QuickChain readiness boundary check passed.
QuickChain Phase 1 Round 2 client interlock check passed.
QuickChain Phase 2 replay boundary check passed.
QuickChain Phase 2 committee boundary check passed.
QuickChain Phase 3 validator boundary check passed.
QuickChain Phase 3 lifecycle boundary check passed.
QuickChain Phase 4 bond boundary check passed.
QuickChain Phase 4 bond dispute boundary check passed.
QuickChain Phase 4 bond enforcement client boundary check passed.
QuickChain Phase 5 anchor-only client boundary check passed.
QuickChain Phase 5 DA/archive/challenge client boundary check passed.
Vite build succeeded.
Rust cargo check succeeded.
CrabLink Tauri QuickChain Phase 5 Round 2 DA/archive/challenge fallback client parking gate passed.
QuickChain Phase 5 Round 2 complete.
DA/archive/challenge fallback boundary sweep complete.
CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 5 Round 2.
CODEBUNDLE_TAURI_APP.md regenerated.
```

## Forbidden scope confirmed locked

```text
no DA truth
no archive restore truth
no missing-data challenge truth
no pruning authority
no paid unlock from DA/archive/challenge evidence
no bridge
no ROX/Solana
no external settlement
no fake receipts
no fake balances
no fake finality
no silent spend
```

## Notes / risks

The earlier `make_codebundle.sh` syntax break was caused by a malformed insertion inside the `selected_scripts()` shell list. That has been repaired, `bash -n scripts/make_codebundle.sh` passed, and the codebundle regenerated successfully. 

The current CrabLink DA/archive/challenge work is still intentionally **display-only**. It does not implement pruning, live DA, archive restore authority, challenge adjudication authority, finality, settlement, bridge logic, ROX/Solana runtime, staking, liquidity, or exchange-facing logic.

## Completion label

```text
QuickChain Phase 5 Round 2 — CrabLink Tauri + client adapters: COMPLETE / GREEN / PARKED
```

Because CrabLink was the final pair in Round 2:

```text
QuickChain Phase 5 Round 2 complete
DA/archive/challenge fallback boundary sweep complete
```


### END NOTE - JUNE 28 2026 - 13:10 CST


### BEGIN NOTE - JUNE 28 2026 - 22:05 CST

Your CrabLink terminal output is green: the new Phase 5 Round 3 external-posture checker passed, all previous QuickChain client checks passed, Vite built successfully, Tauri Rust `cargo check` completed, and the final park script printed the Phase 5 complete markers. 

Paste this into your CrabLink notes.

```text id="5fqzct"
### BEGIN NOTE - JUNE 28 2026 - QUICKCHAIN PHASE 5 ROUND 3 - CRABLINK TAURI + CLIENT ADAPTERS

# QuickChain Phase 5 Round 3 Notes — CrabLink Tauri + Client Adapters

Date: June 28, 2026
Project: RustyOnions / CrabLink
Area: QuickChain
Phase / round: QuickChain Phase 5 Round 3
Target: CrabLink Tauri + client adapters
Status: COMPLETE / GREEN / PARKED

---

## 0. Final status

CrabLink Tauri + client adapters are complete and parked for QuickChain Phase 5 Round 3.

Safe final label:

QuickChain Phase 5 Round 3 — CrabLink Tauri + client adapters complete / green / parked

Stronger safe label:

QuickChain current authorized boundary/preflight scope is COMPLETE / GREEN / PARKED through Phase 5.

Formal final label:

QuickChain Phase 5 external anchoring/decentralization option complete for the current internal-ROC, evidence-only, no-external-settlement scope.

This completes the final client/product boundary layer after the backend crate-pair sweep.

---

## 1. What this final CrabLink pass proved

This pass proves that CrabLink can display the selected Phase 5 Round 3 external posture without becoming authority over ROC, paid unlocks, balances, receipts, wallet truth, ledger truth, settlement, finality, bridge status, external-chain truth, or public market behavior.

Selected posture:

anchor-only
evidence-only
report/status metadata only
display-only where hydrated
reference-only where indexed
declarative-only where policy-gated
backend-derived only

CrabLink may display selected external posture evidence/status as UI/readiness metadata.

CrabLink must not use selected external posture evidence as:

payment truth
balance truth
receipt truth
paid unlock truth
wallet truth
ledger truth
settlement truth
finality truth
bridge truth
external-chain ROC truth
outside-program ROC truth
public market authority
staking authority
liquidity authority
exchange-facing authority

---

## 2. Files added / updated

Added:

docs/tauri/QUICKCHAIN_PHASE5_CLIENT_EXTERNAL_POSTURE_BOUNDARY.md

scripts/check-quickchain-phase5-client-external-posture-boundary.mjs

Updated:

apps/crablink-tauri/package.json
package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx

No Tauri Rust authority command was added.

No backend mutation path was added.

No external runtime dependency was added.

No Cargo.toml dependency change was required.

---

## 3. New boundary added

New checker:

scripts/check-quickchain-phase5-client-external-posture-boundary.mjs

New npm script:

check:quickchain-phase5-external-posture-boundary

New document:

docs/tauri/QUICKCHAIN_PHASE5_CLIENT_EXTERNAL_POSTURE_BOUNDARY.md

New UI/readiness schema:

crablink.quickchain-phase5-external-posture-boundary.v1

New UI label:

Phase 5 Round 3: chosen external integration posture

New safe display rule:

selected external posture is display-only
external posture evidence is display-only
external integration is evidence/anchoring only
internal wallet/ledger truth remains canonical
external posture evidence does not unlock paid content
anchor-only is the selected posture

---

## 4. Commands that passed

Focused patch gate passed:

node --check scripts/check-quickchain-phase5-client-external-posture-boundary.mjs
node scripts/check-quickchain-client-boundary.mjs
node scripts/check-quickchain-paid-cache-boundary.mjs
node scripts/check-quickchain-readiness-boundary.mjs
node scripts/check-quickchain-phase5-client-anchor-boundary.mjs
node scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs
node scripts/check-quickchain-phase5-client-external-posture-boundary.mjs

Patch completion marker:

QuickChain Phase 5 Round 3 CrabLink selected external posture boundary patch applied.

Park command passed:

bash scripts/dev-quickchain-tauri-park.sh

The park script delegated the full Tauri check gate and ran:

npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run check:quickchain-phase1-interlock
npm run check:quickchain-phase2-replay-boundary
npm run check:quickchain-phase2-committee-boundary
npm run check:quickchain-phase3-validator-boundary
npm run check:quickchain-phase3-lifecycle-boundary
npm run check:quickchain-phase4-bond-boundary
npm run check:quickchain-phase4-bond-dispute-boundary
npm run check:quickchain-phase4-bond-enforcement-boundary
npm run check:quickchain-phase5-anchor-boundary
npm run check:quickchain-phase5-da-fallback-boundary
npm run check:quickchain-phase5-external-posture-boundary
npm run build
npm run check:rust:mac-media

Vite build passed:

313 modules transformed
built in 5.70s

Tauri Rust check passed:

TAURI_CONFIG="$(cat src-tauri/tauri.macos.dev-media.conf.json)" cargo check --manifest-path src-tauri/Cargo.toml
Finished dev profile successfully

---

## 5. Final terminal markers

The final park script printed:

CrabLink Tauri QuickChain Phase 5 Round 3 selected external posture client parking gate passed

selected external posture client boundary complete

QuickChain Phase 5 Round 3 complete

selected external integration posture boundary sweep complete

QuickChain Phase 5 complete

external anchoring/decentralization option complete

CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 5 boundary/preflight scope

no external posture authority, no external settlement, no public bridge, no ROX/Solana, no staking, no liquidity, no exchange-facing logic, no paid unlock from external posture evidence, no fake receipts, no fake balances, no fake finality, and no silent spend introduced

---

## 6. Boundaries preserved

CrabLink Tauri remains:

primary client/product layer
display surface
user-intent surface
explicit confirmation surface
gateway-first client
backend truth viewer
display-only receipt viewer
verified b3 cache consumer
bounded media renderer
Tauri-mediated native app

CrabLink Tauri is not:

wallet truth
ledger truth
balance truth
receipt truth
reward truth
settlement truth
finality truth
root authority
proof authority
validator authority
external posture authority
external chain authority
bridge authority
ROX runtime
Solana runtime
staking authority
liquidity authority
exchange-facing authority
public market authority
outside-program authority

React/TS owns display and user intent only.

Tauri Rust mediates native privilege.

Backend services own truth.

svc-wallet remains the mutation front door.

ron-ledger remains durable economic truth.

---

## 7. Forbidden scope still blocked

This pass did not introduce:

external posture authority
external settlement
public bridge
ROX active runtime
Solana active runtime
staking
liquidity
exchange-facing logic
public validator economy
public market authority
outside-program authority
external-chain ROC truth
settlement truth from external posture evidence
finality truth from external posture evidence
wallet mutation from external posture evidence
ledger mutation from external posture evidence
balance from external posture evidence
receipt from external posture evidence
paid unlock from external posture evidence
fake receipts
fake balances
fake finality
silent spend

---

## 8. What QuickChain completion means

Correct:

QuickChain is complete for the current authorized boundary/preflight scope through Phase 5.

QuickChain Phase 5 external anchoring/decentralization option is complete for the current internal-ROC, evidence-only, no-external-settlement scope.

CrabLink Tauri + client adapters are complete / green / parked for QuickChain Phase 5 Round 3.

Incorrect:

public blockchain live
external settlement live
ROX live
Solana live
public bridge live
staking live
liquidity live
exchange ready
public validator economy live
QuickChain production chain live
CrabLink chain authority live
gateway settlement authority live
omnigate settlement authority live
client paid-unlock authority live

---

## 9. Whole-project QuickChain status

Backend crate-pair sweep through Phase 5 Round 3:

ron-proto + ron-ledger:
  COMPLETE / GREEN / PARKED

svc-wallet + ron-accounting:
  COMPLETE / GREEN / PARKED

svc-rewarder + svc-storage:
  COMPLETE / GREEN / PARKED

svc-gateway + omnigate:
  COMPLETE / GREEN / PARKED

svc-index + ron-policy:
  COMPLETE / GREEN / PARKED

Client/product layer:

CrabLink Tauri + client adapters:
  COMPLETE / GREEN / PARKED

Final safe project label:

QuickChain current authorized boundary/preflight scope:
  COMPLETE / GREEN / PARKED through Phase 5

---

## 10. Recommended housekeeping

If not already run after the final park gate:

scripts/make_codebundle.sh

Then, if maintaining aggregated notes/codebundles:

copy this note into CrabLink NOTES.MD
regenerate CODEBUNDLE_TAURI_APP.md
collect notes if using a notes aggregation script

Do not rerun backend crate park scripts unless backend files were changed.

Do not run workspace-wide clippy for this note-only step.

---

## 11. Next likely project direction

QuickChain’s current planned scope is done.

Next work should move back to product/runtime proof work around the internal ROC value loop and CrabLink user-facing surfaces, without re-opening QuickChain unless a new explicitly scoped phase is created.

Good next areas:

internal ROC paid-flow polish
wallet/ledger receipt UX
CrabLink paid unlock flow polish
content creation flows
site/profile/creator pages
media bounded rendering
stream/podcast backend follow-through
chat paid flow fix
tokenomics TOML/config validation
developer docs and route contracts
beta-readiness hardening

QuickChain should remain parked unless the next session explicitly defines a new post-Phase-5 scope.

### END NOTE - JUNE 28 2026 - QUICKCHAIN PHASE 5 ROUND 3 - CRABLINK TAURI + CLIENT ADAPTERS
```


### END NOTE - JUNE 28 2026 - 22:05 CST


### BEGIN NOTE - JUNE 29 2026 - 15:15 CST

CrabLink is now **GREEN / PARKED** for the Internal ROC Beta Phase 1 paid-content client boundary. The terminal output shows the focused Internal ROC client check passed, the full Tauri check path passed, Vite build succeeded, Rust `cargo check` succeeded, all QuickChain client gates stayed green, and the parking marker printed cleanly. 

### BEGIN NOTE - JUNE 29 2026 - INTERNAL ROC BETA PHASE 1 - CrabLink Tauri / Client Adapters

## Status

CrabLink Tauri + client adapters are GREEN / PARKED for Internal ROC Beta Phase 1 paid-content client boundary proof.

This completes the CrabLink side of the Phase 1 paid content proof.

This also means the larger Phase 1 paid content flow proof is now GREEN / PARKED across:

```text
ron-proto + ron-ledger
svc-wallet + ron-accounting
svc-rewarder + ron-policy
svc-storage + svc-index
svc-gateway + omnigate
CrabLink Tauri + client adapters
```

Safe label:

```text
Internal ROC Beta Phase 1 CrabLink paid content client boundary is GREEN / PARKED.
```

Larger safe label:

```text
Internal ROC Beta Phase 1 paid content flow proof is GREEN / PARKED.
```

This does not mean bridge, staking, ROX, Solana, external settlement, liquidity, exchange-facing logic, public chain runtime, or public validator economy is live.

Those remain deferred / parked.

---

## Files added or updated

### Added

```text
docs/tauri/INTERNAL_ROC_BETA_PHASE1_PAID_CONTENT_CLIENT_BOUNDARY.md
scripts/check-internal-roc-paid-content-boundary.mjs
```

### Updated

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
```

### Regenerated after green

```text
CODEBUNDLE_TAURI_APP.md
```

---

## Main new check

New npm check:

```bash
npm --prefix apps/crablink-tauri run check:internal-roc-paid-content-boundary
```

New package scripts added:

```text
check:internal-roc-paid-content-boundary
check:internal-roc-no-silent-spend
check:internal-roc-receipt-display-only
check:internal-roc-paid-cache-boundary
```

These currently delegate to:

```text
scripts/check-internal-roc-paid-content-boundary.mjs
```

---

## Focused check result

Focused Internal ROC client check passed:

```text
Internal ROC Beta Phase 1 CrabLink paid content client boundary check passed.
Explicit confirmation, backend-derived receipts, backend-derived balance refresh, display-only receipt cache, and no-silent-spend boundaries are intact.
```

This proves the new client-side scanner is active and passing.

---

## App-local park result

The full app-local Tauri park path passed.

The terminal printed:

```text
== Internal ROC Beta Phase 1 CrabLink paid content client boundary parking gate passed ==
== explicit confirmation and backend-derived receipt UX proof complete ==
== display-only receipt cache and backend-derived balance refresh boundary complete ==
== no fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced ==
```

The park run also kept all previous QuickChain client boundary gates green.

---

## Build and Rust checks

The app build passed:

```text
vite build
313 modules transformed
built successfully
```

The Tauri Rust check passed:

```text
cargo check --manifest-path src-tauri/Cargo.toml
Finished dev profile
```

No Rust/Tauri compile failure remained.

---

## Existing QuickChain client gates stayed green

The app-local park re-ran and passed:

```text
check:quickchain-boundary
check:quickchain-paid-cache-boundary
check:quickchain-readiness-boundary
check:quickchain-phase1-interlock
check:quickchain-phase2-replay-boundary
check:quickchain-phase2-committee-boundary
check:quickchain-phase3-validator-boundary
check:quickchain-phase3-lifecycle-boundary
check:quickchain-phase4-bond-boundary
check:quickchain-phase4-bond-dispute-boundary
check:quickchain-phase4-bond-enforcement-boundary
check:quickchain-phase5-anchor-boundary
check:quickchain-phase5-da-fallback-boundary
check:quickchain-phase5-external-posture-boundary
```

This means the new Internal ROC Beta client check did not weaken the previously parked QuickChain client boundary posture.

---

## What the new CrabLink check proves

The new checker proves the CrabLink side of the paid-content UX boundary:

```text
paid post flow uses adapter path
paid comment flow uses adapter path
paid article flow uses adapter path
generic content_view uses adapter path
site_visit uses adapter path
wallet hold/payment helpers require confirmed=true
publish flows require explicit hold/review path
content_view payment requires explicit user action
site_visit payment requires explicit user action
backend receipts are displayed, not invented
recent receipt cache remains display-only
local catalog remains display/display-cache only
balance refresh remains backend-derived
Tauri invoke remains centralized through the typed platform adapter
Tauri Rust command bridge remains allowlisted/bounded/redacted
```

---

## Paid publish flows covered

The scanner covers these client publish flows:

```text
PostPublishFlow.jsx
CommentPublishFlow.jsx
ArticlePublishFlow.jsx
```

Required boundary evidence:

```text
createPostAssetClient / createCommentAssetClient / createArticleAssetClient
createWalletClient
walletClient.hold
confirmed: true
publishPost / publishComment / publishArticle
refreshWallet after accepted path
visible review / confirmation posture
no local wallet authority shortcut
```

This preserves the publish path:

```text
prepare
→ explicit hold/review
→ wallet hold through backend path
→ paid proof headers
→ publish through gateway/backend route
→ backend-derived result
→ backend-derived balance refresh
```

Forbidden publish shortcuts remain blocked:

```text
publish because cache says paid
publish because manifest says paid
publish because local state says paid
publish because index pointer exists
invent paid proof in React
invent receipt in React
silently open hold
silently capture hold
store spend authority in localStorage
```

---

## Generic content_view flow covered

The scanner covers:

```text
AssetContentViewAccess.jsx
contentViewClient.js
```

Required evidence includes:

```text
createContentViewClient
client.pay
confirmed: true
persistContentViewProof
writeRecentReceipt
writeLocalCatalogEntry
backend-derived balance refresh
error state does not unlock
```

This preserves the content_view path:

```text
quote
→ explicit click / confirmation
→ pay through gateway/backend
→ backend wallet receipt
→ backend access result
→ render only after backend success
→ display-only receipt/cache write
→ backend-derived balance refresh
```

Forbidden content_view shortcuts remain blocked:

```text
unlock from local receipt cache
unlock from local catalog
unlock from b3 existence
unlock from offline cache
unlock from manifest paid=true
unlock from index pointer
unlock from policy allow
unlock from QuickChain/readiness/anchor metadata
```

---

## Site visit flow covered

The scanner covers:

```text
SiteVisitAccess.jsx
siteVisitClient.js
```

The final scanner was tightened to accept the actual implemented site_visit naming:

```text
visitClient.pay
notifyBalanceRefresh(app, payment, persistedReceipt)
```

The implementation uses a named site_visit client and a helper wrapper for backend-derived balance refresh rather than direct inline `app.refreshWallet(...)`.

This is acceptable because the balance refresh still happens after the accepted backend payment/access path and remains display/backend-derived.

Required evidence includes:

```text
createSiteVisitClient
visitClient.pay
confirmed: true
writeRecentReceipt
writeLocalCatalogEntry
notifyBalanceRefresh
canRender
```

Forbidden site_visit shortcuts remain blocked:

```text
local balance edits
fake unlock
cache-only unlock
receipt-cache unlock
silent spend
client-generated receipt truth
client-generated balance truth
```

---

## Receipt cache boundary

The scanner covers:

```text
recentReceipts.js
```

Required doctrine:

```text
Read-only recent receipt collector
display-only
no wallet mutation
no fake receipts
Backend wallet and ledger remain authoritative.
```

Allowed receipt cache use:

```text
display recent backend-returned receipt metadata
help users review past actions
show receipt-like details as local history
clear local display cache
```

Forbidden receipt cache use:

```text
authorize spend
authorize paid access
set current balance
prove finality
become wallet truth
become ledger truth
become settlement truth
become bridge truth
become staking truth
```

---

## Balance boundary

The client may display backend-derived balances and refresh after accepted paid actions.

The client must not compute balance truth from:

```text
recent receipts
local catalog
cache
manifest
index pointer
accounting snapshots
reward plans
QuickChain readiness
anchor/finality labels
```

Correct rule:

```text
After paid action success, refresh from backend truth.
If refresh fails, show stale/failure honestly.
Do not locally invent the new balance.
```

---

## Tauri command bridge boundary

The scanner covers:

```text
tauriPlatform.js
src-tauri/src/commands/mod.rs
src-tauri/src/commands/gateway.rs
src-tauri/src/commands/wallet.rs
```

Allowed Tauri command posture:

```text
central typed Tauri invoke adapter
allowlisted commands only
gateway_request
wallet_balance_gateway
redacted errors
bounded body/response sizes
gateway-first service path
```

Forbidden command posture remains blocked:

```text
raw arbitrary invoke from paid surfaces
shell
execute
eval
native raw commands
direct ledger commands
direct wallet mutation authority commands
receipt fabrication commands
balance fabrication commands
finality fabrication commands
bridge commands
staking commands
liquidity commands
external settlement commands
uncapped spend authority
private keys/seeds/raw capabilities in outputs
```

---

## `make_codebundle.sh` repair

A temporary patch inserted an `echo` line into the selected script path-list area of:

```text
scripts/make_codebundle.sh
```

That caused a shell syntax failure.

It was repaired by keeping the new checker in the correct two locations:

```text
human-readable scope output:
  echo "scripts/check-internal-roc-paid-content-boundary.mjs"

selected_scripts path list:
  "$ROOT/scripts/check-internal-roc-paid-content-boundary.mjs" \
```

After repair:

```bash
bash scripts/make_codebundle.sh
```

succeeded and wrote:

```text
CODEBUNDLE_TAURI_APP.md
```

---

## Important terminal proof markers

Focused check:

```text
Internal ROC Beta Phase 1 CrabLink paid content client boundary check passed.
Explicit confirmation, backend-derived receipts, backend-derived balance refresh, display-only receipt cache, and no-silent-spend boundaries are intact.
```

Build:

```text
vite build
313 modules transformed
built successfully
```

Tauri Rust:

```text
cargo check --manifest-path src-tauri/Cargo.toml
Finished dev profile
```

Park marker:

```text
== Internal ROC Beta Phase 1 CrabLink paid content client boundary parking gate passed ==
== explicit confirmation and backend-derived receipt UX proof complete ==
== display-only receipt cache and backend-derived balance refresh boundary complete ==
== no fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced ==
```

Codebundle:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_TAURI_APP.md
```

---

## Authority boundaries preserved

CrabLink may:

```text
display backend-derived balances
display backend-derived receipts
display paid access status
collect user intent
show quote/prepare information
ask for explicit confirmation
call TypeScript adapters
request allowlisted Tauri commands
call configured gateway paths
render paid content after backend access truth
write display-only recent receipt entries
write display-only local catalog entries
verify b3 cache bytes before trusted render
```

CrabLink must not:

```text
own wallet truth
own ledger truth
invent balances
invent receipts
invent finality
invent paid entitlement
silently spend ROC
unlock paid content from cache alone
store private keys/seeds/raw capabilities in React
store spend authority in localStorage
store secrets in URLs
store secrets in logs
call raw Tauri invoke from arbitrary UI files
mutate ledger
mutate wallet
run bridge logic
run staking logic
run liquidity logic
run external settlement logic
```

The check now enforces these boundaries for the paid post/comment/article/content_view/site_visit client surfaces.

---

## Phase 1 total status after this patch

Internal ROC Beta Phase 1 paid content flow proof is now complete / parked for the intended round.

Backend route/authority proof is green across:

```text
ron-proto + ron-ledger
svc-wallet + ron-accounting
svc-rewarder + ron-policy
svc-storage + svc-index
svc-gateway + omnigate
```

Client UX/boundary proof is green across:

```text
CrabLink Tauri + client adapters
```

Safe final Phase 1 label:

```text
Internal ROC Beta Phase 1 paid content flow proof is GREEN / PARKED.
```

---

## What is not complete yet

This does not complete the full Internal ROC Beta value loop.

Still ahead:

```text
Phase 2 — Ledger replay + conservation proof
Phase 3 — Accounting → rewarder → wallet payout loop
Phase 4 — CrabLink Tauri wallet/receipt UX hardening
Phase 5 — Tokenomics TOML validation and anti-farming gates
Phase 6 — Reproducible internal ROC beta smoke suite
```

This also does not authorize:

```text
ROX runtime
Solana runtime
bridge runtime
public bridge
external settlement
staking runtime
staking UI
staking yield
liquidity
exchange-facing logic
public validator economy
QuickChain public chain live
```

Those remain parked until explicit later authorization.

---

## Recommended next session starting point

Next active phase should be:

```text
Internal ROC Beta Phase 2 — Ledger replay + conservation proof
```

Likely first crate pair:

```text
ron-proto + ron-ledger
```

Primary goal:

```text
Prove paid flows replay deterministically and conserve ROC.
```

Suggested Phase 2 Round 1 focus:

```text
same accepted operation history produces same balances
same accepted operation history produces same receipts
same accepted operation history produces same holds
paid transfers conserve value
holds conserve value
captures conserve value
releases conserve value
burns/remainders go to explicit sinks
duplicate terminal hold operations are rejected
replay cannot depend on DB iteration order or wall clock
```

Suggested focused tests from buildplan:

```text
ron-ledger:
  internal_roc_beta_paid_flow_replay_equality
  internal_roc_beta_balance_conservation
  internal_roc_beta_hold_terminality
  internal_roc_beta_replay_order_independence

svc-wallet:
  internal_roc_beta_paid_action_idempotency
  internal_roc_beta_receipt_lookup_after_replay

ron-accounting:
  internal_roc_beta_snapshot_cannot_change_replay
```

Do not start bridge/staking/ROX/Solana/external settlement work.

---

## Final CrabLink note

CrabLink now has an explicit Internal ROC Beta Phase 1 client boundary gate in the app-local park path.

This is exactly the right posture:

```text
CrabLink is the product/user-intent layer.
Tauri Rust mediates native privilege.
Gateway/Omnigate coordinate backend access.
svc-wallet mutates.
ron-ledger records truth.
CrabLink displays receipts and balances only after backend truth.
Local caches stay convenience/display-only.
```

### END NOTE - JUNE 29 2026 - INTERNAL ROC BETA PHASE 1 - CrabLink Tauri / Client Adapters


### END NOTE - JUNE 29 2026 - 15:15 CST



### BEGIN NOTE - JUNE 29 2026 - 17:10 CST

Here are the paste-ready **CrabLink Tauri notes** for the Phase 2 completion pass. The terminal output confirms the new Internal ROC Phase 2 CrabLink replay/audit visibility check passed, the QuickChain replay and Internal ROC paid-content regressions passed, Vite build passed, Tauri Rust cargo check passed, and the app-local park printed the final Phase 2 completion marker. 

Append this to:

```text
apps/crablink-tauri/NOTES.MD
```

### BEGIN NOTE - JUNE 29 2026 - INTERNAL ROC BETA PHASE 2 ROUND 2

# CrabLink Tauri — Internal ROC Beta Phase 2 Round 2 replay/audit visibility boundary

## Status

```text
Internal ROC Beta Phase 2 Round 2 — CrabLink Tauri + client adapters
Status: GREEN / PARKED
```

This pass completed the CrabLink Tauri/client-adapter side of Internal ROC Beta Phase 2 Round 2.

It also completed Internal ROC Beta Phase 2 overall.

Safe phase label:

```text
Internal ROC Beta Phase 2 replay/conservation proof complete.
Status: COMPLETE / GREEN / PARKED
```

This work is Internal ROC Beta value-loop proof only.

QuickChain boundary/preflight scope remains COMPLETE / GREEN / PARKED through Phase 5, but this is not QuickChain public runtime work.

No bridge, staking, ROX, Solana, liquidity, exchange-facing logic, public validator economy, external settlement, fake receipt, fake balance, fake finality, silent spend, or cache-only paid unlock was introduced.

## What changed

Added focused client boundary document:

```text
docs/tauri/INTERNAL_ROC_BETA_PHASE2_REPLAY_VISIBILITY_CLIENT_BOUNDARY.md
```

Added focused client boundary scanner:

```text
scripts/check-internal-roc-phase2-replay-visibility.mjs
```

Integrated the new check into the CrabLink app check flow:

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/dev-quickchain-tauri-park.sh
scripts/make_codebundle.sh
```

Added display-only source markers to the relevant client display/cache surfaces:

```text
apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx
apps/crablink-tauri/src/pages/receipts/ReceiptsPage.jsx
apps/crablink-tauri/src/app/shell/RecentReceiptsPanel.jsx
apps/crablink-tauri/src/shared/receipts/recentReceipts.js
```

A small follow-up repair fixed malformed quoted echo lines in:

```text
scripts/dev-quickchain-tauri-park.sh
```

After the repair, the app-local park passed.

## What the new check proves

The new Internal ROC Phase 2 CrabLink replay/audit visibility scanner proves that CrabLink may display replay/conservation/audit status only as optional, source-labeled, display-only status context.

Covered proof areas:

```text
display-only replay/audit labels
honest stale/offline status
missing replay/audit status does not fabricate truth
paid unlock still depends on backend access truth
accepted backend wallet/ledger receipts remain the paid unlock authority
receipt cache remains display-only
local catalog remains display-only
QuickchainReadinessPage remains display/evidence only
ReceiptsPage remains display-only
RecentReceiptsPanel remains display-only
recentReceipts local cache remains display-only
Tauri allowed command list does not expose replay/audit authority commands
client source scan rejects replay-status unlock authority markers
client source scan rejects replay-status receipt/balance/finality/settlement authority markers
client source scan rejects bridge/staking/liquidity/external settlement coupling
```

## Boundary preserved

CrabLink Tauri remains display, routing, user intent, and explicit confirmation UX only.

Allowed relationship:

```text
backend replay/conservation/audit evidence
→ source-labeled display metadata
→ optional UI label / receipt detail / readiness context
```

Forbidden relationship:

```text
replay/audit status
→ paid unlock

replay/audit status
→ balance truth

replay/audit status
→ receipt truth

replay/audit status
→ finality truth

replay/audit status
→ settlement truth

replay/audit status
→ wallet mutation

replay/audit status
→ ledger mutation

replay/audit status
→ bridge/staking/liquidity behavior

local receipt cache
→ paid unlock

local catalog cache
→ paid unlock
```

## Commands that passed

Focused syntax and boundary checks:

```text
node --check scripts/check-internal-roc-phase2-replay-visibility.mjs
bash -n scripts/check-tauri.sh
bash -n scripts/dev-quickchain-tauri-park.sh
bash -n scripts/make_codebundle.sh
npm --prefix apps/crablink-tauri run check:internal-roc-phase2-replay-visibility
npm --prefix apps/crablink-tauri run check:quickchain-phase2-replay-boundary
npm --prefix apps/crablink-tauri run check:internal-roc-paid-content-boundary
```

App-local park:

```text
bash scripts/dev-quickchain-tauri-park.sh
```

The app-local park delegated the full Tauri check gate and passed:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:internal-roc-paid-content-boundary
npm run check:quickchain-readiness-boundary
npm run check:quickchain-phase1-interlock
npm run check:quickchain-phase2-replay-boundary
npm run check:internal-roc-phase2-replay-visibility
npm run check:quickchain-phase2-committee-boundary
npm run check:quickchain-phase3-validator-boundary
npm run check:quickchain-phase3-lifecycle-boundary
npm run check:quickchain-phase4-bond-boundary
npm run check:quickchain-phase4-bond-dispute-boundary
npm run check:quickchain-phase4-bond-enforcement-boundary
npm run check:quickchain-phase5-anchor-boundary
npm run check:quickchain-phase5-da-fallback-boundary
npm run check:quickchain-phase5-external-posture-boundary
npm run build
npm run check:rust:mac-media
```

## Terminal proof

Internal ROC Phase 2 CrabLink replay/audit visibility boundary passed:

```text
Internal ROC Beta Phase 2 CrabLink replay/audit visibility boundary check passed.
Display-only replay/audit labels, honest stale/offline status, backend access truth, and no client-side replay authority are intact.
```

QuickChain Phase 2 replay regression passed:

```text
QuickChain Phase 2 replay boundary check passed.
```

Internal ROC Phase 1 paid-content client regression passed:

```text
Internal ROC Beta Phase 1 CrabLink paid content client boundary check passed.
Explicit confirmation, backend-derived receipts, backend-derived balance refresh, display-only receipt cache, and no-silent-spend boundaries are intact.
```

Vite build passed:

```text
vite v5.4.21 building for production...
✓ 313 modules transformed.
✓ built
```

Tauri Rust check passed:

```text
cargo check --manifest-path src-tauri/Cargo.toml
Finished `dev` profile
```

Final app-local park markers printed:

```text
== Internal ROC Beta Phase 2 CrabLink replay/audit visibility boundary parking gate passed ==
== Internal ROC Beta Phase 2 replay/conservation proof complete ==
== display-only replay/audit labels and honest stale/offline status complete ==
== no client-side replay authority, fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced ==
```

Final completion marker printed:

```text
Internal ROC Beta Phase 2 CrabLink park quote fix applied and app-local park passed.
Internal ROC Beta Phase 2 replay/conservation proof complete.
```

## Safe labels

CrabLink slice label:

```text
Internal ROC Beta Phase 2 Round 2 CrabLink Tauri + client adapters replay/audit visibility boundary is GREEN / PARKED.
```

Phase label:

```text
Internal ROC Beta Phase 2 replay/conservation proof complete.
Status: COMPLETE / GREEN / PARKED.
```

## Current Internal ROC Beta status

```text
Phase 0:
  docs/safe-language sync: COMPLETE / GREEN / PARKED

Phase 1:
  paid content flow proof: COMPLETE / GREEN / PARKED

Phase 2:
  replay/conservation proof: COMPLETE / GREEN / PARKED
```

Phase 2 completed crate-pair coverage:

```text
Round 1:
  ron-proto + ron-ledger: GREEN / PARKED
  svc-wallet + ron-accounting: GREEN / PARKED

Round 2:
  svc-gateway + omnigate: GREEN / PARKED
  CrabLink Tauri + client adapters: GREEN / PARKED
```

## Next planned work

The next active phase is:

```text
Internal ROC Beta Phase 3 — Accounting → rewarder → wallet payout loop
```

Expected next starting crate pair:

```text
ron-proto + ron-ledger
```

Phase 3 must preserve the same authority doctrine:

```text
ron-accounting snapshots are not balance truth.
svc-rewarder plans payouts but does not mutate ledger.
ron-policy gates/validates but does not create receipts.
svc-wallet remains the only approved payout mutation path.
ron-ledger remains durable receipt and balance truth.
CrabLink remains display/user intent only.
```

### END NOTE - JUNE 29 2026 - INTERNAL ROC BETA PHASE 2 ROUND 2


### END NOTE - JUNE 29 2026 - 17:10 CST




### BEGIN NOTE - JUNE 30 2026 - 14:05 CST

# Internal ROC Beta Phase 6 — Final Wrap-Up / Carry-Over Notes

## 1. Final status

```text id="27cpse"
Internal ROC Beta Phase 6: COMPLETE / GREEN / PARKED
```

The terminal review confirms that the live probe suite passed, the CrabLink checker passed, the full reproducible Phase 6 smoke suite completed, and the remaining deferred scopes stayed deferred. The decisive terminal line was:

```text id="7ctev8"
Internal ROC Beta Phase 6 reproducible smoke suite complete.
Phase 6 status: COMPLETE / GREEN / PARKED candidate, pending notes/terminal review.
```

After reviewing the terminal output, that candidate status is promoted to:

```text id="2qmgj3"
Phase 6 status: COMPLETE / GREEN / PARKED
```

The same terminal output also explicitly preserved the deferred boundary: ROX, Solana, bridge, staking runtime, liquidity, exchange-facing logic, public validator economy, and external settlement remain deferred. 

---

# 2. Big-picture result

Internal ROC Beta now has an end-to-end proof that the closed internal ROC value loop works without external settlement.

The proven loop is:

```text id="euyayd"
CrabLink user intent
→ backend quote / prepare
→ explicit confirmation
→ svc-wallet mutation front-door
→ ron-ledger receipt / balance truth
→ backend-derived access
→ CrabLink display-only receipt / balance UX
→ replay / conservation proof
→ accounting snapshot remains derivative
→ rewarder remains non-mutating planning-only
→ policy remains declarative gate-only
→ approved payout path remains wallet-only
```

This is the important milestone: **ROC is now proven as an internal accounting/value plane**, not just a design document.

---

# 3. What Phase 6 proved

## Live stack proof

The live CrabLink/RustyOnions stack proved:

```text id="c84xaj"
gateway health: ok
gateway readiness: ready
omnigate health: ok
wallet health: ok
CrabLink Tauri launched
image mint worked
paid image view worked
backend-derived receipt displayed
ledger-backed balances refreshed
gateway → omnigate → storage/index route resolution worked
raw asset bytes fetched correctly
manifest bytes fetched correctly
privacy-clean proof existed and passed
negative paid-flow probes failed closed
quote tamper probes failed closed after patch
```

## Reproducible smoke suite proof

The full Phase 6 smoke suite proved:

```text id="65ec77"
wallet/ledger proof target passed
replay/conservation proof target passed
tokenomics/anti-farming proof target passed
storage/index/gateway/omnigate access proof target passed
CrabLink Tauri proof target passed
```

The final terminal output ended with the full reproducible suite complete and the safe deferred-scope line intact. 

---

# 4. Final live image used for proof

The final post-patch live image used for Phase 6 proof:

```text id="a4hwm7"
crab_url:
crab://13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b.image

asset_cid:
b3:13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b

manifest_cid:
b3:86cfd6f845c3c993db664aa6c3b618f39b0dadab2b471bae29d322889dd404e9

asset_kind:
image

storage size:
134212 bytes

owner passport:
passport:main:visitor-b

owner wallet / payout recipient:
acct_visitor_b

payer / viewer account during final probes:
acct_dev
```

Final verified balances during the non-mutating probe suite:

```text id="0pp5wh"
acct_dev:       3547 ROC, ledger_backed=true, source=svc_wallet.v1
acct_visitor_b: 1756 ROC, ledger_backed=true, source=svc_wallet.v1
unfunded probe: 0 ROC
attacker probe: 0 ROC
```

---

# 5. Important live probes that passed

## Read-only integrity probe

Permanent script:

```text id="z0l66t"
scripts/probes/internal-roc-live-readonly.sh
```

Runner included it through:

```text id="i81rc0"
scripts/dev-internal-roc-beta-live-probes.sh
```

It verified:

```text id="k5hgfz"
gateway health
gateway readiness
omnigate health
wallet health
ledger-backed payer balance
ledger-backed creator balance
crab:// route resolution
b3 asset identity
manifest presence
manifest hydration
owner/payout routing
storage availability
raw asset byte count
manifest fetchability
privacy cleanup proof
warnings empty
```

Final result:

```text id="h5s89d"
LIVE READ-ONLY INTEGRITY CHECK PASSED
```

## Negative content_view probe

Permanent script:

```text id="cjs7pi"
scripts/probes/internal-roc-live-negative-content-view.sh
```

It verified rejection of:

```text id="v8jad3"
old crab://b3/<hash>.image slash form
uppercase b3 hash
recipient mismatch quote
unfunded payment
fake authority headers
self-payment
wrong amount payment
```

It also verified no balance mutation:

```text id="5irn1y"
acct_dev unchanged
acct_visitor_b unchanged
unfunded account unchanged / 0
```

Final result:

```text id="7fg2kg"
NEGATIVE CONTENT_VIEW PROBE PASSED
```

## Quote tamper probe

Permanent script:

```text id="t8n8cq"
scripts/probes/internal-roc-live-quote-tamper.sh
```

It verified that a valid quote cannot be reused with:

```text id="pp9ksq"
tampered recipient
tampered quote_hash
tampered quote_id
```

Expected and observed results after the patch:

```text id="yiqz0u"
tampered recipient: HTTP 400 content_view_recipient_mismatch
tampered quote_hash: HTTP 409 content_view_quote_hash_mismatch
tampered quote_id: HTTP 409 content_view_quote_id_mismatch
balances unchanged
```

Final result:

```text id="wki0qs"
QUOTE TAMPER PROBE PASSED
```

## Idempotency probe

Permanent script:

```text id="zv3j3w"
scripts/probes/internal-roc-live-idempotency.sh
```

This script is intentionally mutating and requires:

```text id="zkv1ha"
RUN_MUTATING=1
```

During the session, the temporary idempotency probe proved:

```text id="l494cn"
first payment mutated exactly once
duplicate retry did not double-spend
second retry returned safe HTTP 409 IDEMPOTENCY_CONFLICT
balances stayed unchanged after duplicate retry
```

Important nuance:

```text id="ysv2cw"
The duplicate retry is value-safe, but not ideal UX.
Future improvement: make content/view/pay retry bodies deterministic enough to replay the prior receipt instead of returning idempotency conflict.
Severity: medium UX/retry polish, not a value-integrity failure.
```

---

# 6. Critical bug found and fixed during Phase 6

## Bug summary

During live quote tamper probing, we found a real hardening bug:

```text id="n7jkau"
Route:
omnigate /content/view/pay

Problem:
pay accepted a tampered quote_hash

Impact:
The payment still went to the correct creator through svc-wallet,
but quote_id / quote_hash were not being enforced as payment preconditions.

Severity:
medium-high hardening bug

Value-integrity impact:
limited, because amount/recipient/wallet still enforced

Phase 6 closeout impact:
must fix before closeout
```

## Why it mattered

The old behavior allowed this:

```text id="o2mbbt"
valid quote for creator
→ tamper quote_hash
→ pay still accepted
→ wallet transfer executed
```

Even though money did not go to an attacker, this meant quote hash was not a real binding precondition.

## Fix applied

Patched:

```text id="yayrry"
crates/omnigate/src/routes/v1/content_view.rs
crates/omnigate/tests/content_view.rs
```

The patch made `/content/view/pay` enforce:

```text id="7pyiw5"
quote_id must match the deterministic current quote
quote_hash must match the deterministic current quote
missing quote_id rejects
missing quote_hash rejects
tampered quote_id rejects before wallet call
tampered quote_hash rejects before wallet call
```

The quote response now also lists required pay fields:

```text id="pyhhlf"
asset_crab_url
payer_account
amount_minor
recipient_account
quote_id
quote_hash
```

## Regression tests added

New focused tests:

```text id="6b9fs4"
pay_rejects_tampered_quote_hash_without_wallet_call
pay_rejects_tampered_quote_id_without_wallet_call
```

Focused Omnigate tests passed:

```text id="5ezu3u"
cargo test -p omnigate --test content_view
5 passed

cargo test -p omnigate --test internal_roc_beta_paid_content_access_boundary
5 passed

cargo test -p omnigate --test internal_roc_beta_phase4_confirmation_failure_boundary
2 passed
```

## Live fix verification

After restarting the stack and minting a fresh image, the same live quote tamper probe passed:

```text id="zq4rl8"
tampered recipient rejected
tampered quote_hash rejected
tampered quote_id rejected
balances unchanged
```

This is one of the strongest Phase 6 results: we found a real edge-case bug, fixed it, added regression coverage, restarted the stack, and proved the fix live.

---

# 7. Permanent scripts added / promoted

These scripts were promoted from `/tmp` probes into the RustyOnions repo:

```text id="yfa7sc"
scripts/probes/internal-roc-live-readonly.sh
scripts/probes/internal-roc-live-negative-content-view.sh
scripts/probes/internal-roc-live-quote-tamper.sh
scripts/probes/internal-roc-live-idempotency.sh
scripts/dev-internal-roc-beta-live-probes.sh
```

Purpose:

```text id="q2nlz8"
Make manual live Phase 6 hardening probes repeatable.
Keep default runner non-mutating.
Require RUN_MUTATING=1 for the idempotency spend probe.
Allow future sessions to re-run live proof against any new crab:// image.
```

Default non-mutating live runner:

```bash id="fbsr0j"
cd /Users/mymac/Desktop/RustyOnions

GATEWAY_URL=http://127.0.0.1:8090 \
OMNIGATE_URL=http://127.0.0.1:9090 \
WALLET_URL=http://127.0.0.1:8088 \
CRAB_URL='crab://<64hex>.image' \
ASSET_HEX='<64hex>' \
VISITOR_ACCOUNT='<payer_or_viewer_account>' \
CREATOR_ACCOUNT='<creator_or_recipient_account>' \
PAYER_ACCOUNT='<payer_account>' \
VIEWER_PASSPORT='<viewer_passport_subject>' \
EXPECT_VISITOR='<expected_payer_balance_optional>' \
EXPECT_CREATOR='<expected_creator_balance_optional>' \
bash scripts/dev-internal-roc-beta-live-probes.sh
```

Mutating idempotency probe, only when intentionally spending:

```bash id="tcgvsl"
RUN_MUTATING=1 \
GATEWAY_URL=http://127.0.0.1:8090 \
CRAB_URL='crab://<64hex>.image' \
PAYER_ACCOUNT='<payer_account>' \
CREATOR_ACCOUNT='<creator_account>' \
VIEWER_PASSPORT='<viewer_passport_subject>' \
AMOUNT=5 \
bash scripts/probes/internal-roc-live-idempotency.sh
```

---

# 8. CrabLink checker false positive fixed

## Problem

The Phase 6 CrabLink meta-checker previously scanned checker scripts as if they were runtime code.

That produced false positives because checker scripts intentionally contain forbidden deny-list words such as:

```text id="os1ycg"
solana
rox
fakebalance
fakereceipt
bridge
staking
liquidity
```

Those words were present in deny lists, not runtime authority paths.

## Fix applied

Updated:

```text id="96s2d8"
 /Users/mymac/Desktop/crablink/scripts/check-internal-roc-beta.mjs
```

Updated package script:

```text id="ft50l5"
/Users/mymac/Desktop/crablink/apps/crablink-tauri/package.json
```

The checker now:

```text id="zozsgs"
still verifies the aggregate Internal ROC Beta checks
still requires the paid-content boundary checks
still requires replay visibility checks
still requires wallet/receipt UX checks
still requires confirmation/failure UX checks
still requires build
still requires Rust mac-media check
does not treat checker deny-list text as runtime authority
does scan selected runtime/UI/adapter files for forbidden authority patterns
```

Final CrabLink proof target passed:

```text id="awxx6x"
Internal ROC Beta Phase 6 CrabLink Tauri proof target passed
CrabLink remains display/user intent only with backend-derived receipts/balances/access
```

---

# 9. Full Phase 6 smoke gate passed

Command run:

```bash id="spyk53"
cd /Users/mymac/Desktop/RustyOnions

CRABLINK_ROOT=/Users/mymac/Desktop/crablink \
  bash scripts/internal-roc-beta-crablink-check.sh

CRABLINK_ROOT=/Users/mymac/Desktop/crablink \
  bash scripts/dev-internal-roc-beta-phase6-smoke.sh
```

Final gate result:

```text id="q2yf0c"
Internal ROC Beta Phase 6 reproducible smoke suite complete.
Phase 6 status: COMPLETE / GREEN / PARKED candidate, pending notes/terminal review.
```

After review:

```text id="zqmdnj"
Internal ROC Beta Phase 6: COMPLETE / GREEN / PARKED
```

---

# 10. Test targets that passed in the final smoke suite

## Wallet / ledger proof target

Script:

```text id="rs8y1w"
scripts/internal-roc-beta-wallet-ledger-check.sh
```

Passed:

```text id="uw1bje"
cargo fmt -p svc-wallet -- --check
cargo fmt -p ron-ledger -- --check
cargo test -p svc-wallet --test internal_roc_beta_paid_content_receipt_path
cargo test -p svc-wallet --test internal_roc_beta_phase2_paid_action_idempotency
cargo test -p svc-wallet --test internal_roc_beta_phase2_receipt_lookup_after_replay
cargo test -p svc-wallet --test internal_roc_beta_phase3_approved_payout_execution_boundary
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_paid_content_replay_label
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_phase2_replay_conservation
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_phase3_approved_payout_replay
```

Key proof:

```text id="kyv3fs"
svc-wallet remains mutation front-door
ron-ledger remains durable receipt/balance truth
idempotency prevents double mutation
approved payout execution uses wallet issue path only
receipt lookup after replay does not fabricate truth
```

## Replay / conservation proof target

Script:

```text id="g0l0ky"
scripts/internal-roc-beta-replay-check.sh
```

Passed:

```text id="j3i6a0"
cargo fmt -p ron-ledger -- --check
cargo fmt -p ron-accounting -- --check
cargo fmt -p svc-wallet -- --check
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_phase2_replay_conservation
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_phase3_approved_payout_replay
cargo test -p ron-accounting --test internal_roc_beta_phase2_snapshot_cannot_change_replay
cargo test -p svc-wallet --test internal_roc_beta_phase2_receipt_lookup_after_replay
```

Key proof:

```text id="8h8mh1"
accepted replay stays deterministic
balance conservation holds
hold terminality holds
paid flow replay equality holds
accounting snapshots cannot change replay
receipt lookup does not fabricate backend truth
```

## Tokenomics / anti-farming proof target

Script:

```text id="9edx5q"
scripts/internal-roc-beta-tokenomics-check.sh
```

Passed:

```text id="0h5nnv"
cargo fmt -p ron-ledger -- --check
cargo fmt -p svc-wallet -- --check
cargo fmt -p ron-accounting -- --check
cargo fmt -p svc-rewarder -- --check
cargo fmt -p ron-policy -- --check
cargo test -p ron-ledger --features quickchain-preflight --test internal_roc_beta_phase5_economics_config_non_authority
cargo test -p svc-wallet --test internal_roc_beta_phase5_config_non_authority
cargo test -p ron-accounting --test internal_roc_beta_phase5_config_label_non_authority
cargo test -p ron-accounting --test internal_roc_beta_phase5_event_class_antifarming
cargo test -p svc-rewarder --test internal_roc_beta_phase5_config_driven_planning
cargo test -p svc-rewarder --test internal_roc_beta_phase5_antifarming_event_gates
cargo test -p svc-rewarder --test internal_roc_beta_phase5_policy_gate_interlock
cargo test -p ron-policy --test internal_roc_beta_phase5_economics_toml_policy_validation
cargo test -p ron-policy --test internal_roc_beta_phase5_antifarming_policy_gate
```

Key proof:

```text id="md8p3i"
configs/roc-economics.toml remains non-authority
no floats / numeric money in economics TOML
bridge and staking remain inert
raw engagement cannot directly mint or allocate ROC
metering cannot directly become payout or receipt truth
analytics_only is quarantined from reward material
ad_budgeted requires explicit non-protocol budget
proof_eligible requires verification/caps/policy
rewarder remains non-mutating planning-only
policy remains gate-only
```

## Access boundary proof target

Script:

```text id="n4zy4r"
scripts/internal-roc-beta-access-check.sh
```

Passed:

```text id="xleuy8"
cargo fmt -p svc-storage -- --check
cargo fmt -p svc-index -- --check
cargo fmt -p svc-gateway -- --check
cargo fmt -p omnigate -- --check
cargo test -p svc-storage --test internal_roc_beta_paid_content_artifact_boundary
cargo test -p svc-index --test internal_roc_beta_paid_content_pointer_boundary
cargo test -p svc-gateway --test internal_roc_beta_paid_content_route_boundary
cargo test -p svc-gateway --test internal_roc_beta_phase2_replay_visibility_boundary
cargo test -p svc-gateway --test internal_roc_beta_phase4_confirmation_failure_boundary
cargo test -p omnigate --test internal_roc_beta_paid_content_access_boundary
cargo test -p omnigate --test internal_roc_beta_phase2_replay_visibility_boundary
cargo test -p omnigate --test internal_roc_beta_phase4_confirmation_failure_boundary
```

Key proof:

```text id="eaoe9m"
svc-storage stores artifacts by b3, not payment truth
svc-index stores pointers/navigation metadata, not entitlement truth
svc-gateway proxies and labels backend-derived truth, not ledger authority
omnigate coordinates paid access, quote, pay, and hydration without direct ledger authority
fake receipt/balance/unlock/finality poison fields reject
replay visibility stays display metadata
confirmation/failure contract stays display-safe
```

## CrabLink Tauri proof target

Script:

```text id="sdqjl4"
scripts/internal-roc-beta-crablink-check.sh
```

Passed:

```text id="n02ze0"
node --check /Users/mymac/Desktop/crablink/scripts/check-internal-roc-beta.mjs
npm --prefix /Users/mymac/Desktop/crablink/apps/crablink-tauri run check:internal-roc-beta
npm run build
npm run check:rust:mac-media
```

Key proof:

```text id="cynlv4"
CrabLink remains display/user intent only
explicit confirmation intact
backend-derived receipts intact
backend-derived balance refresh intact
display-only receipt cache intact
no silent spend
replay/audit labels are display-only
honest stale/offline status
no client-side replay authority
no cache-only entitlement
failure-locked rendering
safe retry/idempotency UX
Vite production build passes
Tauri Rust mac-media cargo check passes
```

---

# 11. What remains deferred

Do **not** start any of these automatically in the next session:

```text id="7du0b7"
ROX
Solana
external settlement
public bridge
bridge mint/burn
staking runtime
yield-bearing staking
liquidity pool
exchange-facing logic
public validator economy
external L2 / DA
public checkpoint/anchor runtime
public chain claims
```

QuickChain remains:

```text id="3g1myk"
future settlement infrastructure
not public runtime
not current ROC balance authority
not external settlement
not a public validator economy
```

Internal ROC remains:

```text id="b61frx"
internal closed value loop
integer minor-unit accounting
svc-wallet mutation front-door
ron-ledger durable truth
CrabLink display/client UX only
```

---

# 12. Current project position after Phase 6

We should treat the project as having completed the active Internal ROC Beta buildplan:

```text id="7b6g3e"
Phase 0: doc sync / safe language
Phase 1: repeatable paid flows using wallet path
Phase 2: ledger replay + conservation
Phase 3: accounting → rewarder → wallet payout
Phase 4: CrabLink Tauri wallet/receipt UX
Phase 5: tokenomics TOML + anti-farming
Phase 6: reproducible beta smoke suite
```

Current state:

```text id="1ia7gb"
Internal ROC Beta value-loop proof is complete.
QuickChain remains parked through boundary/preflight Phase 5.
CrabLink Tauri is the primary client.
The backend owns truth.
The client displays truth and sends user intent.
No external settlement creep happened.
```

There is no Phase 7 in the current buildplan unless we create a new reviewed buildplan.

---

# 13. Recommended next workstream

The next session should not begin by inventing a new chain/bridge/staking phase.

Recommended next workstream name:

```text id="31jkd5"
Internal ROC Beta Stabilization / Product Beta Readiness
```

Purpose:

```text id="p22i36"
Turn the proven value loop into a smoother, safer, more repeatable beta product.
```

This should be product-hardening and packaging work, not external settlement.

---

# 14. Best next-session priorities

## Priority 1 — Write/update status docs

Create or update a final closeout doc, likely:

```text id="sb23hb"
docs/internal-roc-beta/PHASE6_CLOSEOUT.md
```

Should include:

```text id="6oip09"
Phase 6 final status
commands run
live image proof values
tests passed
bug found/fixed/proven
deferred scopes
next workstream recommendation
```

Also consider adding a shorter status line to:

```text id="inoc91"
ALLNOTES.MD
INTERNAL_ROC_BETA_BUILDPLAN.md
INTERNAL_ROC_BETA_VALUE_LOOP_BLUEPRINT.md
POST_QUICKCHAIN_DECISION_GATE.md
```

Only add to docs if the next session wants documentation patches.

## Priority 2 — Create fresh codebundles

Suggested commands:

```bash id="a7r82j"
cd /Users/mymac/Desktop/RustyOnions

bash scripts/make_crate_codex.sh --force -c omnigate
bash scripts/make_crate_codex.sh --force -c svc-gateway
bash scripts/make_crate_codex.sh --force -c svc-wallet
bash scripts/make_crate_codex.sh --force -c ron-ledger
bash scripts/make_crate_codex.sh --force -c ron-accounting
bash scripts/make_crate_codex.sh --force -c svc-rewarder
bash scripts/make_crate_codex.sh --force -c ron-policy
bash scripts/make_crate_codex.sh --force -c svc-storage
bash scripts/make_crate_codex.sh --force -c svc-index
```

For CrabLink, regenerate its codebundle using the project’s existing CrabLink bundle command if needed.

## Priority 3 — Product beta polish

Good targets:

```text id="iqzub7"
receipt history polish
copy/export receipt button
paid image access UX polish
better idempotency retry UX
clearer quote expiration messaging
better stale/offline balance labels
post-payment route refresh polish
friendly failure messages for quote_id / quote_hash mismatch
live probe docs for developers
```

## Priority 4 — Persistent/restart behavior review

The live proof used local dev stack behavior. Next session could inspect restart durability boundaries:

```text id="9qgcam"
What persists across restart?
What is intentionally in-memory for dev?
Which receipts survive service restart?
Which asset manifests survive service restart?
Which storage/index state is durable now?
What needs beta-grade persistence before broader testing?
```

This should remain internal ROC only.

## Priority 5 — Packaging / install readiness

For CrabLink beta readiness:

```text id="nxu1nz"
Tauri packaging smoke
macOS bundle smoke
dev/prod gateway config separation
first-run settings
gateway URL selection
safe localhost/dev labels
receipt cache migration behavior
error redaction in production mode
no raw backend stack traces in UI
```

## Priority 6 — More paid asset types

The proven flow is image/content_view. Next product work can expand similar checks to:

```text id="5bkzld"
article paid view
post paid view
comment paid view
music paid view
video paid view
site visit paid access
```

The rule stays:

```text id="3nfhrz"
No new ledger mutation paths.
All paid flows go through prepare/quote → explicit confirmation → svc-wallet → ron-ledger → backend receipt/access → display-only client UX.
```

---

# 15. Known improvement candidates

These are not blockers for Phase 6 completion.

## Idempotency retry polish

Observed:

```text id="7mfqwy"
Duplicate retry did not double-spend.
Second attempt returned IDEMPOTENCY_CONFLICT because wallet saw same key with different request body.
```

Desired future behavior:

```text id="879mgi"
Exact same content_view retry should return prior accepted receipt when possible.
```

Possible cause:

```text id="e4r5mw"
content/view/pay may include request fields or generated fields that differ between first attempt and retry.
```

Priority:

```text id="f8qyps"
medium
```

Reason:

```text id="b7sz00"
value-safe already, but retry UX can be better.
```

## b3sum not installed

Live probes skipped local independent b3 verification:

```text id="3em1r3"
b3sum not installed; skipped local raw-byte b3 verification
b3sum not installed; skipped local manifest b3 verification
```

Not a Phase 6 blocker because byte counts and backend b3 route identity passed, but future local hardening can install `b3sum` and turn this into a stronger local digest verification.

Possible install later:

```bash id="iuwwe4"
cargo install b3sum
```

Only do this when disk/time allows.

## Broader paid-flow coverage

Image content_view is proven strongly. Future product beta can repeat permanent live probes across other asset kinds.

---

# 16. What not to regress

Carry these boundaries forward aggressively:

```text id="frbusv"
CrabLink must not invent balances.
CrabLink must not invent receipts.
CrabLink must not claim finality.
CrabLink must not unlock paid content from cache alone.
CrabLink must not hold wallet authority.
CrabLink must not expose secrets in React state/localStorage/URL/logs.
Gateway must not mutate ledger.
Omnigate must not mutate ledger directly.
Storage must not provide paid entitlement truth.
Index must not provide paid entitlement truth.
Accounting must not become balance truth.
Rewarder must not mutate ledger.
Policy must not become authority.
Tokenomics config must not create supply, balances, receipts, or payouts by itself.
Raw engagement must not directly mint or allocate ROC.
External settlement must remain deferred.
```

---

# 17. Exact final commands that matter

Final live non-mutating probe command:

```bash id="s8w4ma"
cd /Users/mymac/Desktop/RustyOnions

GATEWAY_URL=http://127.0.0.1:8090 \
OMNIGATE_URL=http://127.0.0.1:9090 \
WALLET_URL=http://127.0.0.1:8088 \
CRAB_URL='crab://13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b.image' \
ASSET_HEX='13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b' \
VISITOR_ACCOUNT=acct_dev \
CREATOR_ACCOUNT=acct_visitor_b \
PAYER_ACCOUNT=acct_dev \
VIEWER_PASSPORT=passport:main:dev \
EXPECT_VISITOR=3547 \
EXPECT_CREATOR=1756 \
bash scripts/dev-internal-roc-beta-live-probes.sh
```

Final CrabLink proof command:

```bash id="ol7068"
cd /Users/mymac/Desktop/RustyOnions

CRABLINK_ROOT=/Users/mymac/Desktop/crablink \
  bash scripts/internal-roc-beta-crablink-check.sh
```

Final full Phase 6 smoke command:

```bash id="t78ce4"
cd /Users/mymac/Desktop/RustyOnions

CRABLINK_ROOT=/Users/mymac/Desktop/crablink \
  bash scripts/dev-internal-roc-beta-phase6-smoke.sh
```

---

# 18. Final carry-over summary for the next session

Paste this into the next session:

```text id="n672dm"
We completed Internal ROC Beta Phase 6.

Final status:
COMPLETE / GREEN / PARKED.

Important context:
QuickChain remains COMPLETE / GREEN / PARKED only as future settlement boundary/preflight through Phase 5, not public runtime.
Internal ROC Beta value-loop is now proven through Phase 6.
No ROX/Solana/bridge/staking/liquidity/exchange-facing/public validator/external settlement work is authorized.

What was proven:
- CrabLink Tauri launched.
- Image mint worked.
- Paid image view worked.
- Backend-derived receipt displayed.
- Ledger-backed balances refreshed.
- Gateway/omnigate/storage/index route worked.
- Raw asset and manifest fetched.
- Privacy-clean proof passed.
- Negative malformed/tampered/unfunded paid attempts rejected.
- Fake receipt/finality/paid headers did not authorize.
- Quote tamper bug was found, fixed, regression-tested, and live-proven.
- Full Phase 6 reproducible smoke suite completed.

Important bug fixed:
Omnigate /content/view/pay accepted a tampered quote_hash.
Patch added quote_id/quote_hash binding before wallet transfer.
Regression tests added:
pay_rejects_tampered_quote_hash_without_wallet_call
pay_rejects_tampered_quote_id_without_wallet_call
Live quote tamper probe after restart passed.

Permanent scripts added:
scripts/probes/internal-roc-live-readonly.sh
scripts/probes/internal-roc-live-negative-content-view.sh
scripts/probes/internal-roc-live-quote-tamper.sh
scripts/probes/internal-roc-live-idempotency.sh
scripts/dev-internal-roc-beta-live-probes.sh

CrabLink checker repaired:
scripts/check-internal-roc-beta.mjs no longer treats checker deny-list text as runtime authority.
apps/crablink-tauri/package.json check:internal-roc-beta updated.

Final live proof image:
crab://13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b.image
asset CID b3:13879a70bf77a3fac6458b23ddece6f3de02763a267c43c162ecc3e0105c456b
manifest CID b3:86cfd6f845c3c993db664aa6c3b618f39b0dadab2b471bae29d322889dd404e9
payer acct_dev balance 3547
creator acct_visitor_b balance 1756

Final full gate:
CRABLINK_ROOT=/Users/mymac/Desktop/crablink bash scripts/dev-internal-roc-beta-phase6-smoke.sh
Result:
Internal ROC Beta Phase 6 reproducible smoke suite complete.
Promoted after review to COMPLETE / GREEN / PARKED.

Recommended next workstream:
Internal ROC Beta Stabilization / Product Beta Readiness.

Recommended next priorities:
1. Write docs/internal-roc-beta/PHASE6_CLOSEOUT.md.
2. Update status docs/notes with Phase 6 complete.
3. Generate fresh codebundles.
4. Review persistence/restart behavior for beta readiness.
5. Polish CrabLink receipt/access UX.
6. Expand paid-flow probes to other asset types.
7. Improve idempotency retry UX so exact retries can replay prior receipt instead of returning conflict.
8. Keep all bridge/staking/ROX/Solana/external settlement work deferred unless explicitly authorized by a new reviewed decision gate.
```

---

# 19. Final recommendation

Next session should start with:

```text id="wrlvb7"
docs/internal-roc-beta/PHASE6_CLOSEOUT.md
```

Then choose the next workstream:

```text id="q3fvao"
Internal ROC Beta Stabilization / Product Beta Readiness
```

Do not start a Phase 7 unless we explicitly create a new buildplan.


### END NOTE - JUNE 30 2026 - 14:05 CST





### BEGIN NOTE - JULY 1 2026 - 13:45 CST

Yes — these notes should go into **`CRABLINK_NOTES.MD`** because this was a **CrabLink Tauri app stabilization slice**, not a RustyOnions backend crate slice.

Paste this near the top of `CRABLINK_NOTES.MD` as the newest note.

### BEGIN NOTE - JULY 1 2026 - INTERNAL ROC STABILIZATION PAID UX

# CrabLink Tauri Notes — Internal ROC Stabilization Paid UX Retry / Receipt Truth

Date: 2026-07-01
Workstream: Internal ROC Beta Stabilization / Product Beta Readiness
Area: CrabLink Tauri paid access UX
Status: COMPLETE / GREEN for this stabilization slice

---

## 0. Safe project label

```text
Internal ROC Beta Phase 6: COMPLETE / GREEN / PARKED.
Internal ROC beta value-loop proof: COMPLETE / GREEN / PARKED.
Current workstream: Internal ROC Beta Stabilization / Product Beta Readiness.
QuickChain boundary/preflight scope: COMPLETE / GREEN / PARKED through Phase 5.
Bridge work: docs / threat-model / decision-gate only.
No ROX/Solana/bridge/staking/liquidity/external settlement runtime.
```

This was **not** a restart of Internal ROC Beta Phase 1–6.

This was a stabilization/product beta readiness hardening pass over already-proven paid UX surfaces.

---

## 1. What this patch hardened

This slice hardened CrabLink Tauri paid access UX around:

```text
deterministic paid retry idempotency keys
backend-derived wallet/ledger receipt proof before render
operation_id display support
redacted/source-labeled paid failure state
failure remains locked
receipt cache remains display-only
no cache-only unlock
no silent spend
no fake receipt
no fake balance
no fake finality
no bridge/ROX/Solana/staking/liquidity/external settlement creep
```

The focused target was:

```text
CrabLink Tauri paid UX retry/receipt truth hardening
```

This affects product beta readiness by making paid failures safer, retries more deterministic, and receipt proof display more explicitly backend-derived.

---

## 2. Files added

### `apps/crablink-tauri/src/shared/paidAccess/paidAccessTruth.js`

New shared helper for paid access stabilization.

Primary responsibilities:

```text
makeStablePaidIdempotencyKey()
buildPaidRetryState()
clearPaidRetryKey()
describeBackendPaymentProof()
hasBackendPaymentProof()
ensureBackendPaymentProof()
sanitizePaidAccessError()
paidRetryStatusLabel()
redactForDisplay()
```

Important boundary:

```text
idempotency_key = retry glue, not authority
operation_id = backend durable ledger-op display metadata, not client authority
backend receipt/access proof is required before paid render
failure state is display-only and locked
```

The helper does not create balance truth, receipt truth, entitlement truth, payout truth, finality truth, or wallet authority.

### `docs/tauri/INTERNAL_ROC_STABILIZATION_PAID_UX.md`

New product-beta stabilization doc.

Locks the paid UX behavior:

```text
backend quote
→ visible user confirmation
→ deterministic retry idempotency key
→ confirmed backend payment route
→ backend wallet/ledger receipt/access proof
→ render paid content/site
→ display-only receipt cache
→ backend-derived balance refresh
```

Failure behavior:

```text
failure stays locked
failure is source-labeled
failure is redacted
failure may retry with the same idempotency key
failure never renders protected content by itself
```

### `scripts/check-internal-roc-stabilization-paid-ux.mjs`

New focused scanner/checker.

It enforces that the CrabLink Tauri paid UX surfaces contain:

```text
deterministic retry key helper usage
backend proof helper usage
operation_id support
display-only receipt cache boundary
locked failure state
redacted/source-labeled errors
no cache-only paid unlock
no fake balances/receipts/finality
no forbidden external runtime vocabulary coupled to paid UX
```

### `scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh`

New focused app-local preflight.

Runs:

```bash
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run build
```

---

## 3. Files patched

### `apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx`

Patched content-view paid access flow.

New behavior:

```text
uses useRef for payIdempotencyKeyRef
creates deterministic content-view payment retry key
stores retry state as display-only UI state
sends idempotencyKey into content_view pay request
requires backend payment proof before setting canView: true
adds backendProof to successful access event
sanitizes failure error
keeps failed paid access locked with canView: false
shows retry state in the proof/facts panel
includes retry data in debug/proof payload
```

Important invariant:

```text
Asset paid access only becomes renderable after backend-derived receipt/access proof.
```

### `apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx`

Patched site-visit paid access flow.

New behavior:

```text
uses payIdempotencyKeyRef
creates deterministic site-visit payment retry key
replaces older uniqueSiteVisitIdem behavior
keeps confirmation option shape compatible with older Phase 4 checker: { confirmed: true }
passes idempotency through the payment payload itself
requires backend payment proof before canRender: true
adds backendProof to successful site access event
sanitizes failure error
keeps failed paid access locked with canRender: false
shows retry state in the proof/facts panel
adds operation_id display support
clears retry key when quote retry starts
```

Important compatibility fix:

```text
The first patch used:
{ confirmed: true, idempotencyKey: payIdempotencyKey }

The old Phase 4 checker expected the literal:
{ confirmed: true }

The call shape was restored to { confirmed: true } while keeping the deterministic idempotency key in the payment payload.
```

This preserved both old Phase 4 checker compatibility and the new stabilization boundary.

### `apps/crablink-tauri/src/shared/api/contentViewClient.js`

Patched to preserve/display backend durable operation identifiers.

Added support for:

```text
operationId
operation_id
client_idempotency_key
```

Purpose:

```text
CrabLink may display backend durable ledger-op metadata, but does not treat it as client authority.
```

### `apps/crablink-tauri/src/shared/api/siteVisitClient.js`

Patched to preserve/display backend durable operation identifiers.

Added support for:

```text
operationId
operation_id
client_idempotency_key
```

Purpose:

```text
Site paid receipt/access display can include backend operation_id without becoming receipt or entitlement authority.
```

### `apps/crablink-tauri/src/shared/receipts/recentReceipts.js`

Patched display-only receipt normalization.

New behavior:

```text
captures operationId / operation_id
includes operationId in backendDerived proof check
includes operationId in stored display-only receipt object
includes operationId in receipt key/proof material
still requires backend-derived proof markers
keeps displayOnly: true
```

Important invariant:

```text
Recent receipts remain display-only convenience, never paid entitlement truth.
```

### `apps/crablink-tauri/package.json`

Added scripts:

```json
"check:internal-roc-stabilization-paid-ux": "node ../../scripts/check-internal-roc-stabilization-paid-ux.mjs",
"park:internal-roc-stabilization-paid-ux": "../../scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh"
```

Also wired the new checker into existing app check flow when applicable.

### `scripts/check-tauri.sh`

Patched to include:

```bash
npm run check:internal-roc-stabilization-paid-ux
```

### `scripts/make_codebundle.sh`

Patched to include the new checker and preflight scripts in future CrabLink codebundles:

```text
scripts/check-internal-roc-stabilization-paid-ux.mjs
scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
```

---

## 4. Validation results

The focused patch script completed successfully.

Observed green output:

```text
Internal ROC Stabilization paid UX retry/receipt truth check passed.
Deterministic retry keys, backend-derived proof checks, locked failures, redacted/source-labeled errors, and display-only receipt cache boundaries are intact.
Internal ROC Stabilization paid UX retry/receipt truth patch applied.
```

Then the focused preflight was run:

```bash
bash scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
```

Green checks:

```text
check:internal-roc-stabilization-paid-ux ✅
check:internal-roc-phase4-confirmation-failure-ux ✅
check:internal-roc-phase4-wallet-receipt-ux ✅
vite build ✅
dev-internal-roc-stabilization-paid-ux-preflight ✅
```

Final successful preflight output:

```text
== Internal ROC Stabilization paid UX retry/receipt truth preflight passed ==
== deterministic retry key; backend-derived payment proof; locked/redacted failure state; display-only receipt cache ==
== no silent spend, cache-only paid access, fake receipt, fake balance, fake finality, direct wallet/ledger mutation, bridge, staking, liquidity, ROX/Solana, or external settlement introduced ==
```

Vite build succeeded:

```text
✓ 314 modules transformed.
✓ built in 4.85s
```

---

## 5. One harmless terminal issue encountered

A temporary fix script ran:

```bash
node --check apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

Node 22 returned:

```text
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".jsx"
```

This was not a code failure.

Reason:

```text
node --check does not directly syntax-check .jsx files by default.
```

The real JSX validation happened through:

```bash
npm run build
```

That Vite build passed.

Conclusion:

```text
Ignore the node --check .jsx issue. Use Vite build or the existing app checkers for JSX validation.
```

---

## 6. Stabilization status for this slice

```text
Internal ROC Stabilization / Product Beta Readiness
CrabLink Tauri paid UX retry/receipt truth hardening: COMPLETE / GREEN
```

This slice is parked unless future regression output specifically points back to these files.

---

## 7. Boundaries preserved

This patch did not add:

```text
new ledger mutation paths
client wallet authority
client receipt authority
client paid entitlement authority
cache-only unlock
fake balances
fake receipts
fake finality
silent spend
gateway ledger mutation
omnigate ledger mutation
storage/index/payment authority
rewarder/accounting/policy mutation authority
ROX runtime
Solana runtime
bridge runtime
staking runtime
liquidity runtime
external settlement runtime
exchange-facing logic
public validator economy
```

The paid flow remains:

```text
CrabLink user intent
→ backend quote/prepare
→ explicit confirmation
→ backend payment route
→ svc-wallet / ron-ledger truth
→ backend receipt/access response
→ CrabLink display-only receipt/access UX
```

---

## 8. Suggested next stabilization target

Next best CrabLink/Product Beta Readiness targets:

```text
1. backend-derived balance refresh / stale status clarity
2. paid denial without protected content leakage
3. redacted/source-labeled gateway/omnigate paid errors
4. idempotent retry UX polish across additional paid surfaces
5. reproducible full-stack paid smoke script consolidation
```

Most likely next patch:

```text
CrabLink Tauri backend-derived balance refresh + stale/failure labeling
```

Reason:

```text
The receipt/access retry proof is now green. The next product-beta concern is making sure balance display is clearly backend-derived, stale-aware, and never interpreted as local truth.
```

### END NOTE - JULY 1 2026 - INTERNAL ROC STABILIZATION PAID UX

For the next session, also attach the updated `CRABLINK_NOTES.MD` plus a fresh `CODEBUNDLE_TAURI_APP.md` after regenerating it.


### END NOTE - JULY 1 2026 - 13:45 CST


### BEGIN NOTE - JULY 1 2026 - 15:00 CST

Yes — these should go into **`CRABLINK_NOTES.MD`** before we move to `svc-gateway + omnigate`.

The terminal output confirms the aggregate CrabLink Tauri stabilization park gate passed, including paid UX, balance refresh, render-lock, Phase 4 checks, Vite build, and Tauri Rust mac-media check.  The fresh CrabLink codebundle also confirms the new stabilization docs, checkers, and park script are now part of the Tauri app bundle.  The safe doctrine remains that Phase 6 is parked, stabilization is the current workstream, and CrabLink stays display/user-intent only. 

Paste this into **`CRABLINK_NOTES.MD`**:

## BEGIN NOTE — 2026-07-01 — INTERNAL ROC STABILIZATION / CRABLINK TAURI PAID-ACCESS PARK GATE

### Safe project label

Internal ROC Beta Phase 6: COMPLETE / GREEN / PARKED.

Internal ROC beta value-loop proof: COMPLETE / GREEN / PARKED.

Current workstream: Internal ROC Beta Stabilization / Product Beta Readiness.

CrabLink Tauri paid-access stabilization block: COMPLETE / GREEN / PARKED.

Bridge work remains docs / threat-model / decision-gate only.

No ROX, Solana, bridge runtime, staking runtime, liquidity runtime, exchange-facing runtime, public validator economy, or external settlement runtime is authorized.

This work did not restart Internal ROC Beta Phase 1–6. It hardened and parked the current CrabLink Tauri product-beta stabilization surface.

---

### Summary

This session completed a CrabLink Tauri stabilization block for the proven internal ROC value loop.

The focus was not new economic authority. The focus was product-beta readiness for paid access UX, backend-derived receipt proof, backend-derived balance refresh, locked denial states, and one aggregate Tauri park gate.

The final green label for this slice is:

```text
Internal ROC Stabilization / Product Beta Readiness
CrabLink Tauri paid-access stabilization block: COMPLETE / GREEN / PARKED
```

The parked Tauri block now includes:

```text
1. Paid UX retry / receipt truth hardening
2. Backend-derived balance refresh / stale labeling
3. Paid denial render-lock / protected payload fetch gating
4. Aggregate CrabLink Tauri Internal ROC Stabilization park gate
```

---

### Stabilization slice 1 — Paid UX retry / receipt truth

Status:

```text
COMPLETE / GREEN
```

Purpose:

```text
Make paid content/site UX retry-safe, backend-proof-gated, receipt-aware, and failure-locked.
```

Key behavior locked:

```text
backend quote
→ visible user confirmation
→ deterministic retry idempotency key
→ confirmed backend payment route
→ backend wallet/ledger receipt/access proof
→ paid render only after proof
→ display-only receipt cache
→ backend-derived balance refresh
```

Important invariants:

```text
idempotency_key = retry key, not authority
operation_id = backend durable ledger-op display metadata, not client authority
receipt cache = display-only
failure remains locked
failure is source-labeled
failure is redacted
failure can retry with same idempotency key
failure never renders protected content by itself
```

Files added or hardened included:

```text
apps/crablink-tauri/src/shared/paidAccess/paidAccessTruth.js
docs/tauri/INTERNAL_ROC_STABILIZATION_PAID_UX.md
scripts/check-internal-roc-stabilization-paid-ux.mjs
scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
```

Files patched included:

```text
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/siteVisitClient.js
apps/crablink-tauri/src/shared/receipts/recentReceipts.js
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

Validated by:

```text
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run build
```

Green result:

```text
Internal ROC Stabilization paid UX retry/receipt truth check passed.
Deterministic retry keys, backend-derived proof checks, locked failures, redacted/source-labeled errors, and display-only receipt cache boundaries are intact.
```

---

### Stabilization slice 2 — Backend-derived balance refresh / stale labeling

Status:

```text
COMPLETE / GREEN
```

Purpose:

```text
Ensure CrabLink balance display is backend-derived or visibly stale, never locally authoritative.
```

Key behavior locked:

```text
paid success
→ backend receipt/access proof
→ display-only receipt cache update
→ backend wallet balance refresh requested
→ backend-derived balance display if refresh succeeds
→ stale/failure label if refresh fails
```

Important invariants:

```text
backend-derived balance = display only
stale balance = last backend value, visibly stale, never truth
settings balance = stale display hint only, never truth
failed refresh never computes a new balance
local cache never creates balance truth
receipt cache never creates balance truth
CrabLink never mutates wallet/ledger balance
```

Files added or hardened included:

```text
docs/tauri/INTERNAL_ROC_STABILIZATION_BALANCE_REFRESH.md
scripts/check-internal-roc-stabilization-balance-refresh.mjs
scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh
```

Files patched included:

```text
apps/crablink-tauri/src/app/shell/BalanceChip.jsx
apps/crablink-tauri/src/app/appContext.js
apps/crablink-tauri/src/shared/api/walletClient.js
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

Validated by:

```text
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build
```

Green result:

```text
Internal ROC Stabilization backend balance refresh truth check passed.
Backend-derived balance normalization, stale/failure labels, paid-success refresh requests, and no local balance truth boundaries are intact.
```

---

### Stabilization slice 3 — Paid denial render-lock / protected fetch gating

Status:

```text
COMPLETE / GREEN
```

Purpose:

```text
Prevent paid denial, quote failure, payment failure, backend-pending routes, local cache, local catalog, or developer mode from fetching or rendering protected paid payloads.
```

Key behavior locked for paid sites:

```text
resolve named site metadata
→ derive site_visit policy
→ if paid: keep root document fetch locked
→ quote/pay through backend
→ require backend wallet/ledger receipt/access proof
→ fetch protected root document only after render is allowed
→ sandbox render only after backend-derived access
```

Required denial behavior locked:

```text
quote failure → no root document fetch, no render
payment failure → no root document fetch, no render
backend-pending route → no developer bypass render
cached receipt/display history → no render
local catalog/cache/settings → no render
```

Important invariants:

```text
metadata may resolve before payment
protected root/body/media bytes fetch only after backend proof
denial/failure keeps protected payload empty and locked
backend-pending stays locked
developer mode cannot preview paid protected content
cache-only unlock remains forbidden
```

Files added or hardened included:

```text
docs/tauri/INTERNAL_ROC_STABILIZATION_RENDER_LOCK.md
scripts/check-internal-roc-stabilization-render-lock.mjs
scripts/dev-internal-roc-stabilization-render-lock-preflight.sh
```

Files patched included:

```text
apps/crablink-tauri/src/pages/site/SiteRender.jsx
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/src/pages/site/SiteResolvedProof.jsx
apps/crablink-tauri/src/pages/site/siteRenderModel.js
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

Validated by:

```text
npm run check:internal-roc-stabilization-render-lock
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build
```

Green result:

```text
Internal ROC Stabilization paid denial render-lock check passed.
Protected site root fetch is deferred until backend access proof; backend-pending/developer bypass render remains locked; paid asset byte fetch gates remain intact.
```

---

### Stabilization slice 4 — Aggregate CrabLink Tauri product-beta park gate

Status:

```text
COMPLETE / GREEN / PARKED
```

Purpose:

```text
Create one reproducible local command proving the green Tauri paid-access stabilization slices stay green together.
```

Files added:

```text
docs/tauri/INTERNAL_ROC_STABILIZATION_TAURI_PARK.md
scripts/check-internal-roc-stabilization-tauri-park.mjs
scripts/dev-internal-roc-stabilization-tauri-park.sh
```

Package scripts added:

```text
check:internal-roc-stabilization-tauri-park
park:internal-roc-stabilization-tauri
```

Aggregate park command:

```bash
bash scripts/dev-internal-roc-stabilization-tauri-park.sh
```

Aggregate park gate runs:

```text
shell syntax checks
scanner syntax checks
check:internal-roc-stabilization-tauri-park
check:internal-roc-stabilization-render-lock
check:internal-roc-stabilization-balance-refresh
check:internal-roc-stabilization-paid-ux
check:internal-roc-phase4-wallet-receipt-ux
check:internal-roc-phase4-confirmation-failure-ux
npm run build
npm run check:rust:mac-media
```

Final green terminal result:

```text
== CrabLink Tauri Internal ROC Stabilization product beta park gate passed ==
== paid UX retry/receipt truth; backend-derived balance refresh; paid denial render-lock ==
== no fake receipt, fake balance, fake finality, silent spend, cache-only unlock, developer paid bypass, direct wallet/ledger mutation, ROX/Solana, bridge, staking, liquidity, or external settlement introduced ==
```

This makes the current Tauri paid-access stabilization block parkable before switching to backend crate pairs.

---

### One repair during the park-gate patch

The first aggregate park checker failed because the scanner inspected its own denylist marker strings.

Initial false-positive markers:

```text
fakebalancetrue
fakebackendreceipt
fakefinalitytrue
silentspendtrue
cacheonlyunlocktrue
developerpaidbypasstrue
ledgermutatefromtauri
walletmutatefromreact
```

Diagnosis:

```text
checker self-scan bug, not a product failure
```

Repair:

```text
scripts/check-internal-roc-stabilization-tauri-park.mjs still verifies the park checker file exists, but it no longer scans its own denylist literal strings as target source content.
```

After repair:

```text
Internal ROC Stabilization CrabLink Tauri park-gate check passed.
Paid UX, backend-derived balance refresh, paid denial render-lock, Phase 4 compatibility, build, and Tauri Rust mac-media checks are wired for one park gate.
```

The final aggregate park gate passed after the self-scan fix.

---

### Final validated gates

The final green CrabLink Tauri stabilization park run validated:

```text
check:internal-roc-stabilization-tauri-park ✅
check:internal-roc-stabilization-render-lock ✅
check:internal-roc-stabilization-balance-refresh ✅
check:internal-roc-stabilization-paid-ux ✅
check:internal-roc-phase4-wallet-receipt-ux ✅
check:internal-roc-phase4-confirmation-failure-ux ✅
vite build ✅
check:rust:mac-media ✅
```

This is the strongest current CrabLink Tauri local proof command:

```bash
bash scripts/dev-internal-roc-stabilization-tauri-park.sh
```

---

### Boundaries preserved

The CrabLink Tauri stabilization block preserved these boundaries:

```text
CrabLink remains display/user-intent only.
React owns no wallet truth.
React owns no ledger truth.
React owns no paid entitlement truth.
React owns no receipt truth.
React owns no balance truth.
Local caches remain display-only.
Recent receipts remain display-only.
Backend receipt/access proof gates paid render.
Backend-derived balance refresh gates balance display.
Stale/failure state is visible and honest.
Paid denial keeps protected payload locked.
Developer mode cannot bypass paid proof.
Idempotency key remains retry glue only.
operation_id remains durable backend ledger-op display metadata only.
```

Forbidden behavior remained absent:

```text
fake receipt
fake balance
fake finality
silent spend
cache-only unlock
developer paid bypass
direct wallet mutation from CrabLink
direct ledger mutation from CrabLink
ROX runtime
Solana runtime
bridge runtime
staking runtime
liquidity runtime
external settlement runtime
exchange-facing runtime
```

---

### Current CrabLink status

Use this label going forward:

```text
CrabLink Tauri paid-access stabilization block: COMPLETE / GREEN / PARKED.
```

Expanded status:

```text
Internal ROC Stabilization / Product Beta Readiness:
- CrabLink paid UX retry / receipt truth: COMPLETE / GREEN
- CrabLink backend-derived balance refresh / stale labeling: COMPLETE / GREEN
- CrabLink paid denial render-lock / protected payload fetch gating: COMPLETE / GREEN
- CrabLink aggregate Tauri stabilization park gate: COMPLETE / GREEN / PARKED
```

Do not say:

```text
Product beta is fully complete.
Backend stabilization is complete.
svc-gateway + omnigate are parked for this stabilization workstream.
ROX is ready.
Bridge is ready.
External settlement is ready.
```

Correct meaning:

```text
The focused CrabLink Tauri paid-access product-beta stabilization surface is now green and parked.
```

---

### Latest CrabLink codebundle status

A fresh `CODEBUNDLE_TAURI_APP.md` was generated after the green Tauri stabilization work.

The bundle includes the new docs, checkers, preflights, and aggregate park gate.

Relevant bundle scope now includes:

```text
docs/tauri/INTERNAL_ROC_STABILIZATION_PAID_UX.md
docs/tauri/INTERNAL_ROC_STABILIZATION_BALANCE_REFRESH.md
docs/tauri/INTERNAL_ROC_STABILIZATION_RENDER_LOCK.md
docs/tauri/INTERNAL_ROC_STABILIZATION_TAURI_PARK.md

scripts/check-internal-roc-stabilization-paid-ux.mjs
scripts/check-internal-roc-stabilization-balance-refresh.mjs
scripts/check-internal-roc-stabilization-render-lock.mjs
scripts/check-internal-roc-stabilization-tauri-park.mjs

scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh
scripts/dev-internal-roc-stabilization-render-lock-preflight.sh
scripts/dev-internal-roc-stabilization-tauri-park.sh
```

Important package scripts now include:

```text
check:internal-roc-stabilization-paid-ux
park:internal-roc-stabilization-paid-ux

check:internal-roc-stabilization-balance-refresh
park:internal-roc-stabilization-balance-refresh

check:internal-roc-stabilization-render-lock
park:internal-roc-stabilization-render-lock

check:internal-roc-stabilization-tauri-park
park:internal-roc-stabilization-tauri
```

---

### Current estimated completion impact

Before this CrabLink park gate, the active session-pack / stabilization completion estimate was around:

```text
~88%
```

After the aggregate CrabLink Tauri stabilization park gate passed, the updated estimate is:

```text
~90–91%
```

Reason:

```text
The Tauri paid-access product-beta stabilization surface is now parked, but backend paid-route/error hardening still needs a focused svc-gateway + omnigate pass before this workstream can be called broadly parked.
```

---

### Next recommended workstream

Next target after these notes:

```text
svc-gateway + omnigate
```

Recommended backend stabilization target:

```text
Internal ROC Stabilization backend paid-route/error hardening
```

Goals for the next backend pass:

```text
gateway/omnigate paid denial does not leak protected body
gateway/omnigate paid errors are redacted and source-labeled
accepted paid responses are backend-derived
backend response shapes match CrabLink’s stabilized expectations
no fake receipt
no fake access proof
no fake finality
no cache-only unlock
no gateway direct wallet mutation
no gateway direct ledger mutation
no omnigate direct wallet mutation
no omnigate direct ledger mutation
idempotency_key remains retry key only
operation_id remains durable backend ledger-op display metadata only
```

Recommended next upload set:

```text
crates/svc-gateway/CODEBUNDLE.md
crates/omnigate/CODEBUNDLE.md
latest RustyOnions notes/carryover if changed
```

No new CrabLink bundle is needed before the next backend patch unless CrabLink changes again.

---

### Carry-forward command summary

Best single CrabLink Tauri stabilization verification command:

```bash
bash scripts/dev-internal-roc-stabilization-tauri-park.sh
```

Focused sub-gates if needed:

```bash
bash scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
bash scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh
bash scripts/dev-internal-roc-stabilization-render-lock-preflight.sh
```

Package-level checks:

```bash
cd apps/crablink-tauri

npm run check:internal-roc-stabilization-tauri-park
npm run check:internal-roc-stabilization-render-lock
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build
npm run check:rust:mac-media
```

---

### Final note

CrabLink Tauri is now parked for this focused paid-access stabilization block.

The next phase of this same stabilization workstream should move to the backend public/enforcement layer:

```text
svc-gateway + omnigate
```

CrabLink is currently ready to consume stricter backend paid-route/error/access behavior without becoming authority.

## END NOTE — 2026-07-01 — INTERNAL ROC STABILIZATION / CRABLINK TAURI PAID-ACCESS PARK GATE

After this is pasted into `CRABLINK_NOTES.MD`, the next clean move is attaching `svc-gateway` and `omnigate` focused codebundles.


### END NOTE - JULY 1 2026 - 15:00 CST


### BEGIN NOTE - JULY 10 2026 - 13:05 CST

Grounded in the newer CrabLink Tauri codebundle and the BUILD_PLAN_Z notes. The codebundle confirms the current Tauri app scope, package check chain, `local_node` command bridge, frontend `localNodeClient`, app-context status normalization, and the local-node boundary scanner; the notes record Phase 6C/6D as the CrabLink work completed for BUILD_PLAN_Z.    

# BUILD_PLAN_Z — CrabLink Tauri Change Notes

## Exhaustive Carryover Notes for `apps/crablink-tauri` / CrabLink Frontend

## 0. Current CrabLink BUILD_PLAN_Z Status

Current repo:

```text
/Users/mymac/Desktop/crablink
```

Current app surface:

```text
apps/crablink-tauri
```

Current BUILD_PLAN_Z role:

```text
CrabLink is the normal-user product/client layer.
For BUILD_PLAN_Z Phase 6, CrabLink gained the safe local user-node controller/status boundary.
```

Current known status:

```text
CrabLink local-node controller boundary — GREEN / PARKED
BUILD_PLAN_Z Phase 6C — CrabLink local-node controller contract: GREEN / PARKED
BUILD_PLAN_Z Phase 6D — CrabLink local-node boundary scanner: GREEN / PARKED
```

Known green checks from the notes:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run check:local-node-boundary
npm run build
npm run check
```

Known Tauri Rust check:

```bash
TAURI_CONFIG="$(cat apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json)" \
  cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
```

The package check chain now includes `check:local-node-boundary`, and the codebundle’s `package.json` shows the full `npm run check` chain ending with `npm run check:local-node-boundary`, `npm run build`, and `npm run check:rust:mac-media`. 

---

## 1. CrabLink’s Role in BUILD_PLAN_Z

CrabLink is not the backend.

Correct role:

```text
CrabLink = client/product shell
CrabLink = Tauri-first desktop UX
CrabLink = local status/probe surface
CrabLink = user intent/display surface
CrabLink = optional local user-node controller surface
```

CrabLink must not become:

```text
wallet truth
ledger truth
receipt truth
confirmed ROC truth
node reward authority
local service authority by default
service-node registry authority
QuickChain runtime authority
ROX/Solana bridge authority
staking/liquidity/exchange authority
arbitrary shell/process runner
```

The newer Tauri codebundle includes the local-node/sidecar IDB language warning against the wrong mental model:

```text
CrabLink Tauri is the backend.
React owns services.
The app can mutate ledger locally.
Localhost is automatically safe.
A sidecar grants spend authority.
A deep link can start services.
The user must run a full node to use CrabLink.
```

That IDB exists to prevent hidden service startup, direct wallet/ledger mutation, unsafe binary execution, unbounded logs, public exposure by default, and fake backend truth. 

---

## 2. Main BUILD_PLAN_Z Phase Affecting CrabLink

The main BUILD_PLAN_Z phase that changed CrabLink was:

```text
Phase 6 — User Node as Passive CrabLink-Managed Runtime
```

The plan goal was:

```text
Make the User Node a CrabLink-managed passive verifier.
```

The plan originally listed:

```text
CrabLink starts/stops/restarts micronode.
Micronode binds loopback only.
Public inbound disabled.
Verification queue enabled.
Economic replay worker stub enabled.
Resource budgets enforced.
CrabLink shows privacy/status/pending evidence/confirmed ROC.
```

Important interpretation from the actual implementation:

```text
We implemented the safe controller/status boundary.
We intentionally parked real process start/stop/restart.
The commands exist, but lifecycle mutation is blocked until real sidecar supervision exists.
```

That was the right safety posture because we do not want CrabLink silently spawning local services before supervision, packaging, consent, permissions, crash handling, resource limits, and user controls are real. 

---

## 3. Phase 6C — CrabLink Local-Node Controller Contract

## 3.1 Goal

Phase 6C moved into the CrabLink repo after `micronode` had already been hardened.

Goal:

```text
Create a safe lifecycle/status boundary so CrabLink can display/probe a local micronode without silently spawning it or claiming economic truth.
```

Explicit non-goal:

```text
Do not implement full sidecar supervision yet.
Do not spawn micronode yet.
Do not kill processes yet.
Do not claim real local-node lifecycle mutation yet.
```

## 3.2 Rust Tauri command bridge added

Primary Rust file added/changed:

```text
apps/crablink-tauri/src-tauri/src/commands/local_node.rs
```

Command module registration files changed:

```text
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

The Tauri command list in the codebundle includes `apps/crablink-tauri/src-tauri/src/commands/local_node.rs`, and the notes record that the command module was registered in the Tauri invoke handler.  

## 3.3 Commands added

Commands added:

```text
local_node_status
local_node_start
local_node_stop
local_node_restart
```

These are Tauri invoke commands. They are exposed through the frontend local-node client.

## 3.4 `local_node_status` behavior

`local_node_status` is the only meaningful active command in the current phase.

It:

```text
probes an already-running loopback micronode
defaults to disabled unless request.enabled=true
only allows explicit loopback HTTP URLs
probes /healthz
probes /readyz
probes /api/v1/status
extracts privacy posture from micronode status
extracts economic non-authority posture from micronode status
returns a bounded status object to the frontend
```

Expected default local node URL:

```text
http://127.0.0.1:5310
```

Important safety:

```text
localhost is not treated as automatically safe.
The URL must be explicit loopback.
The command does not grant spend authority.
The command does not create receipt/finality truth.
```

## 3.5 `local_node_start`, `local_node_stop`, `local_node_restart`

These commands exist but are intentionally parked.

They must return blocked/ignored/non-mutating status.

Expected fields:

```text
supervisorEnabled = false
sidecarEnabled = false
startSupported = false
stopSupported = false
restartSupported = false
actionAccepted = false
```

Meaning:

```text
The app exposes the future lifecycle shape, but it does not claim to supervise a real sidecar yet.
```

## 3.6 Explicitly forbidden behavior

The Tauri local-node command bridge must not:

```text
spawn a process
kill a process
shell out
run arbitrary binary paths
execute user-provided commands
start from a deep link
start silently on app boot
mutate wallet
mutate ledger
claim confirmed ROC
claim receipt finality
claim ROX/Solana/bridge behavior
```

The Phase 6 notes explicitly lock “no process spawning,” “no shell execution,” “no arbitrary binary path,” “no wallet mutation,” “no ledger mutation,” “no confirmed ROC claim,” “no receipt finality claim,” and “no ROX/Solana/bridge behavior.” 

---

## 4. Frontend Local-Node Client Added

## 4.1 Primary file

```text
apps/crablink-tauri/src/shared/api/localNodeClient.js
```

## 4.2 Purpose

The local-node client gives React a narrow typed adapter for local-node status/lifecycle commands.

It exposes:

```text
getStatus()
start()
stop()
restart()
```

The current codebundle shows `getStatus()` calling:

```javascript
callTauri('local_node_status', { request: request() })
```

and the lifecycle methods calling:

```javascript
callTauri('local_node_start', { request: request() })
callTauri('local_node_stop', { request: request() })
callTauri('local_node_restart', { request: request() })
```

only when Tauri invoke is available. 

## 4.3 Tauri runtime unavailable fallback

If Tauri invoke is unavailable, the client returns a disabled fallback instead of throwing an authority-shaped or fake-success result.

The fallback reports:

```text
schema = crablink.local_node.status.v1
enabled = false
configured = false
mode = disabled
baseUrl = http://127.0.0.1:5310
lifecycleState = disabled
supervisorEnabled = false
sidecarEnabled = false
startSupported = false
stopSupported = false
restartSupported = false
actionAccepted = false
privacyMode = true
publicInboundEnabled = false
peerIpDisplay = forbidden
verificationEnabled = false
economicReplayEnabled = false
verificationQueueStatus = disabled
economicReplayWorkerStatus = disabled
pendingEvidenceItems = 0
confirmedRocMinorUnits = null
confirmedRocSource = wallet_ledger_receipt_only
walletMutation = false
ledgerMutation = false
walletExecutionParticipant = false
ledgerReplayEnabled = false
contentServingEnabled = false
```

The codebundle shows this exact disabled fallback shape in `localNodeClient.js`. 

## 4.4 Why the fallback matters

This prevents the browser/dev/non-Tauri frontend from pretending a node exists.

Correct behavior:

```text
No Tauri runtime -> local node unavailable/disabled.
```

Wrong behavior avoided:

```text
No Tauri runtime -> fake node active.
No Tauri runtime -> fake ROC confirmed.
No Tauri runtime -> fake wallet/ledger status.
```

## 4.5 URL normalization

`localNodeClient.js` normalizes local node URLs by trimming and removing trailing slashes.

Default:

```text
DEFAULT_LOCAL_NODE_URL = http://127.0.0.1:5310
```

The frontend default must remain loopback.

---

## 5. App Settings Changes

## 5.1 Primary files

```text
apps/crablink-tauri/src/storage.js
apps/crablink-tauri/src/app/settings.js
```

## 5.2 Settings added

BUILD_PLAN_Z local-node integration added or locked these settings:

```text
localNodeEnabled
localNodeUrl
localNodeMode
```

Expected defaults:

```text
localNodeEnabled = false
localNodeUrl = http://127.0.0.1:5310
localNodeMode = disabled
```

The Phase 6 notes explicitly list these defaults. 

## 5.3 Meaning

Default user posture:

```text
Local node is off.
No hidden background node starts.
No user is forced to run a full node.
No local service is silently trusted.
```

This follows BUILD_PLAN_Z’s “users are not sysadmins” posture.

---

## 6. App Context Integration

## 6.1 Primary file

```text
apps/crablink-tauri/src/app/appContext.js
```

## 6.2 State added

The app context now includes local-node state:

```text
localNodeStatus
```

Initial status:

```text
state = disabled
label = Local node disabled
checkedAt = ""
data = null
error = null
```

The current codebundle shows `INITIAL_LOCAL_NODE_STATUS` with this disabled default. 

## 6.3 Client added

`AppContextProvider` creates:

```javascript
const localNode = useMemo(() => createLocalNodeClient(settings), [settings]);
```

and adds it to the shared `clients` object:

```text
clients.localNode
```

The codebundle shows this in `appContext.js`. 

## 6.4 Actions added to context

The app context exports:

```text
checkLocalNode
startLocalNode
stopLocalNode
restartLocalNode
```

The current codebundle shows these being included in the provider value and dependency list. 

## 6.5 Status normalization

`appContext.js` now contains:

```text
normalizeLocalNodeStatus(data)
```

It converts raw Tauri/local-node response into UI state:

```text
online
disabled
degraded
```

Normalization logic:

```text
lifecycleState = active -> online
enabled=false or lifecycleState=disabled -> disabled
lifecycleState=blocked -> degraded
other states -> degraded
```

It also computes:

```text
privacy = peerIpDisplay === "forbidden" && publicInboundEnabled === false
rewardTruth = confirmedRocMinorUnits == null && walletMutation === false && ledgerMutation === false
```

Then the status label includes:

```text
Local node attached / Local node disabled / Local node not active
private / privacy degraded
no ROC claim / reward truth degraded
reason
```

The codebundle shows this normalization logic directly. 

## 6.6 Why normalization matters

The UI does not blindly trust a node response.

It evaluates:

```text
Is the node active?
Is privacy posture still safe?
Is reward truth still non-authoritative?
```

If reward truth degrades, the UI can show a warning instead of a fake “earned ROC” claim.

---

## 7. TopBar / UI Status Integration

## 7.1 Primary file

```text
apps/crablink-tauri/src/app/shell/TopBar.jsx
```

## 7.2 Behavior added

The TopBar gained a local-node status pill.

Expected labels from notes:

```text
Node off by default
Node when attached
Node! when degraded
```

## 7.3 Purpose

The user can see whether a local user node is:

```text
disabled
attached/online
degraded
```

without opening a raw admin UI.

This supports the BUILD_PLAN_Z user-node doctrine:

```text
Users are not sysadmins.
Normal user sees simple status.
No raw admin UI for normal user.
```

## 7.4 What the UI must not do

The TopBar pill must not:

```text
show fake ROC earned
show fake confirmed rewards
show wallet/ledger finality
show raw peer IP
show raw bind/socket addresses
start a process from a deep link
imply user is required to run a node
```

---

## 8. Settings / Status Rows Added

The frontend added local-node status rows in the app/settings/status surface.

Expected rows from notes:

```text
Local node enabled
Local node URL
Local node status
Local node boundary
```

Purpose:

```text
show whether the local node integration is enabled
show configured loopback URL
show current local-node status
show the safety boundary / non-authority posture
```

Important:

```text
These are display/config/status rows.
They are not wallet/ledger/reward authority.
```

---

## 9. Tauri Platform Adapter Boundary

## 9.1 Primary file

```text
apps/crablink-tauri/src/platform/tauriPlatform.js
```

## 9.2 Role

The platform adapter centralizes direct Tauri invoke calls.

Current pattern:

```javascript
import { invoke } from "@tauri-apps/api/core";

export function callTauri(command, args = {}) {
  return invoke(command, args);
}
```

The codebundle includes scaffold comments that say typed command names only, no raw shell/eval/native execution, and command results must be redacted before display. 

## 9.3 BUILD_PLAN_Z local-node relevance

`localNodeClient.js` uses this adapter rather than calling `invoke()` directly everywhere.

This matters because:

```text
React calls adapters, not raw authority surfaces.
Tauri command names stay centralized and scanner-friendly.
```

---

## 10. Tauri Command Registration

## 10.1 Primary files

```text
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

## 10.2 Change

The local-node commands were added to the Tauri command module and registered in the invoke handler.

Required command names:

```text
local_node_status
local_node_start
local_node_stop
local_node_restart
```

The local-node boundary scanner checks that these commands are registered. 

## 10.3 Non-regression

Do not remove registration unless replacing it with an equivalent, tested, safer local-node boundary.

Do not add unscanned raw process/shell commands.

---

## 11. Phase 6D — Local-Node Boundary Scanner

## 11.1 Primary script added

```text
scripts/check-crablink-local-node-boundary.mjs
```

## 11.2 Package script added

In:

```text
apps/crablink-tauri/package.json
```

New script:

```text
check:local-node-boundary
```

The codebundle package file shows:

```json
"check:local-node-boundary": "node ../../scripts/check-crablink-local-node-boundary.mjs"
```

and the full `check` chain includes `npm run check:local-node-boundary`. 

## 11.3 Scanner purpose

The scanner locks the CrabLink local-node boundary against authority creep.

It enforces:

```text
local-node integration disabled by default
default local-node URL is loopback
Tauri commands are registered
frontend command allowlist includes local-node commands
frontend client has disabled fallback
start/stop/restart are parked
supervisorEnabled=false
sidecarEnabled=false
startSupported=false
stopSupported=false
restartSupported=false
actionAccepted=false
confirmedRocMinorUnits=null
confirmedRocSource=wallet_ledger_receipt_only
walletMutation=false
ledgerMutation=false
walletExecutionParticipant=false
ledgerReplayEnabled=false
no Command::new
no std::process::Command
no spawn
no kill
no Solana/ROX/bridge/settlement/validator authority truth claims
```

The Phase 6 notes record this scanner contract explicitly. 

## 11.4 Scanner fixes made

Two scanner false negatives were fixed:

```text
1. Initial scanner regex was too brittle around multiline Rust URL guards.
2. Scanner checked JavaScript startsWith instead of Rust starts_with.
```

Meaning:

```text
The scanner was adjusted to match the actual Rust/JS code style without weakening the boundary.
```

## 11.5 Why this matters

Without the scanner, future frontend/Rust patches could accidentally introduce:

```text
process spawning
shell execution
arbitrary binary path
silent node start
fake local-node reward truth
Solana/ROX/bridge authority
wallet/ledger mutation claims
```

The scanner keeps Phase 6 parked safely until a real supervisor phase exists.

---

## 12. SiteVisitAccess Marker Compatibility Fix

## 12.1 File touched

```text
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

## 12.2 Reason

An existing QuickChain Phase 1 interlock script required the exact marker:

```text
render unlock follows the live backend quote/pay response only
```

During the CrabLink local-node work, this marker had to be restored while keeping stronger backend-proof wording.

The notes say this was a marker-only change and did not change behavior. 

## 12.3 Important boundary

Paid content render/unlock still follows:

```text
backend quote/pay/access response
backend wallet/ledger accepted receipt
backend-derived access proof
```

It must not follow:

```text
local node state
local-node status
cache-only receipt
frontend mock receipt
external posture evidence
b3 hash alone
manifest alone
policy allow alone
```

---

## 13. Package Check Chain

## 13.1 File

```text
apps/crablink-tauri/package.json
```

## 13.2 Important scripts

The current package includes:

```text
check
check:local-node-boundary
check:rust:mac-media
build
tauri:dev
tauri:build
```

The `check` script is broad and includes many QuickChain/Internal ROC boundary scans before build and Rust check. It now includes:

```text
npm run check:local-node-boundary
```

then:

```text
npm run build
npm run check:rust:mac-media
```

The codebundle shows this full check chain. 

## 13.3 Important consequence

For CrabLink BUILD_PLAN_Z work, a green `npm run check` means the local-node boundary passes alongside existing QuickChain/Internal ROC client-boundary scanners.

It is stronger than just `npm run build`.

---

## 14. Current Known Files Changed / Important Files

## 14.1 Tauri Rust files

```text
apps/crablink-tauri/src-tauri/src/commands/local_node.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/Cargo.lock
apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json
```

`Cargo.lock` and `Cargo.toml` are part of the app’s Rust boundary. The codebundle shows the Tauri Rust app depends on `reqwest`, `serde`, `serde_json`, `tauri`, `tokio`, `tokio-util`, `blake3`, and other app command dependencies. 

## 14.2 Frontend files

```text
apps/crablink-tauri/src/shared/api/localNodeClient.js
apps/crablink-tauri/src/storage.js
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/app/appContext.js
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
```

## 14.3 Scripts

```text
scripts/check-crablink-local-node-boundary.mjs
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

## 14.4 Docs / IDBs to watch

The codebundle contains:

```text
docs/tauri/SIDECAR_LOCAL_NODE_IDB.MD
docs/tauri/RUN_STACK_AND_MODES_IDB.MD
docs/tauri/TAURI_COMMAND_BRIDGE_IDB.MD
docs/tauri/SECURITY.MD
```

The local-node/sidecar IDB is especially important. It defines future sidecar goals but does not mean those goals are implemented yet. 

---

## 15. What CrabLink Does Now for BUILD_PLAN_Z

Current completed behavior:

```text
has local-node settings defaults
has local-node frontend client
has Tauri commands for status/start/stop/restart
status command can probe existing loopback micronode
status command extracts privacy/economic posture
frontend can normalize local-node status
TopBar can show disabled/attached/degraded node status
non-Tauri runtime gets disabled fallback
start/stop/restart are intentionally blocked/parked
scanner enforces no process spawn/kill/shell
scanner enforces no wallet/ledger/confirmed ROC claims
scanner is wired into npm run check
```

---

## 16. What CrabLink Does NOT Do Yet

CrabLink does not yet provide:

```text
real micronode sidecar packaging
real sidecar supervisor
real start/stop/restart process lifecycle
real crash-loop detection
real crash-loop backoff
real graceful shutdown
real bounded log capture
real binary provenance checks
real bundled micronode
real update/signature verification for node binary
real user consent flow for enabling local node
real OS resource scheduler
real battery-aware scheduling
real local-node tray/background lifecycle
real local-node data directory management
real pending evidence submission
real confirmed ROC display from actual wallet/ledger receipt through local-node path
real node reward claim UI
real service-node/macronode management UI
```

These are future phases.

Do not imply they are complete.

---

## 17. Economic Truth Boundary

CrabLink local-node status must continue to report:

```text
confirmedRocMinorUnits = null
confirmedRocSource = wallet_ledger_receipt_only
walletMutation = false
ledgerMutation = false
walletExecutionParticipant = false
ledgerReplayEnabled = false
```

Meaning:

```text
CrabLink can display local-node status.
CrabLink cannot turn local-node status into ROC truth.
CrabLink cannot treat pending evidence as confirmed ROC.
CrabLink cannot treat local-node cache as wallet/ledger receipt.
```

The frontend disabled fallback in the codebundle shows these exact fields and values. 

---

## 18. Privacy Boundary

CrabLink local-node status must continue to report and/or enforce:

```text
privacyMode = true
publicInboundEnabled = false
peerIpDisplay = forbidden
```

The app context computes the privacy label from:

```text
peerIpDisplay === "forbidden"
publicInboundEnabled === false
```

If this is not true, the UI labels the node as privacy degraded. 

CrabLink must not expose:

```text
peer IP
user residential IP
raw local bind address beyond configured local node URL
remote socket address
provider socket address
admin bind socket from node status
transport route
```

---

## 19. Lifecycle Boundary

Start/stop/restart commands exist but remain parked.

Expected response posture:

```text
actionAccepted = false
supervisorEnabled = false
sidecarEnabled = false
startSupported = false
stopSupported = false
restartSupported = false
```

This applies to:

```text
local_node_start
local_node_stop
local_node_restart
```

Wrong behavior:

```text
actionAccepted = true without real supervisor
spawn micronode directly
kill process directly
shell out
silently start node on app open
deep link starts node
```

---

## 20. Tauri Bridge Non-Regression Checklist

Future CrabLink/Tauri patches must preserve:

```text
typed command names only
frontend uses adapters/clients, not scattered raw invoke
local-node command bridge remains narrow
local-node default disabled
default local-node URL loopback
no Command::new
no std::process::Command
no spawn
no kill
no shell execution
no arbitrary binary path
no deep-link service start
no wallet mutation
no ledger mutation
no fake confirmed ROC
no receipt finality claim
no ROX/Solana/bridge/settlement authority
```

The package scanner exists specifically to enforce these boundaries. 

---

## 21. Frontend Non-Regression Checklist

Future frontend patches must preserve:

```text
localNodeEnabled defaults false
localNodeUrl defaults http://127.0.0.1:5310
localNodeMode defaults disabled
non-Tauri local node fallback is disabled
local-node status normalization checks privacy posture
local-node status normalization checks reward truth posture
TopBar shows status only, not reward finality
settings/status rows remain display/config only
no localStorage flag unlocks paid content
no cache-only unlocks paid content
no local-node status unlocks paid content
no local-node status creates confirmed ROC
```

---

## 22. Scripts / Boundary Scanner Non-Regression Checklist

Future scanner changes must keep checking:

```text
required files exist
local_node.rs exists
commands/mod.rs exports local_node
lib.rs registers local_node_* commands
package.json includes check:local-node-boundary
npm run check includes local-node boundary
local node disabled by default
loopback default URL
disabled fallback fields
start/stop/restart parked fields
no process spawning APIs
no shell execution APIs
no wallet/ledger mutation fields set true
no confirmed ROC value
no ROX/Solana/bridge authority creep
```

Do not weaken scanner checks just to make a patch pass.

---

## 23. Recommended CrabLink Baseline Commands

Before touching CrabLink local-node code again:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run check:local-node-boundary
npm run build
```

Then run the full app check:

```bash
npm run check
```

Rust-only Tauri check:

```bash
cd /Users/mymac/Desktop/crablink

TAURI_CONFIG="$(cat apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json)" \
  cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
```

If editing only frontend local-node files:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run check:local-node-boundary
npm run build
```

If editing Rust Tauri commands:

```bash
cd /Users/mymac/Desktop/crablink

TAURI_CONFIG="$(cat apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json)" \
  cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml

cd apps/crablink-tauri
npm run check:local-node-boundary
npm run build
```

---

## 24. How CrabLink Fits the Next BUILD_PLAN_Z Phase

The next official BUILD_PLAN_Z phase after Phase 7 is:

```text
Phase 8 — Service Node Foundation
```

CrabLink probably should not be the first surface touched for Phase 8 unless the task is specifically UI/status display.

Expected Phase 8 CrabLink role:

```text
display service-node status only after macronode exposes real service-node status
possibly show optional node-management/status surface
possibly show local user-node status alongside gateway status
not invent service-node provider readiness
not invent storage/index/OAP readiness
not invent reward binding finality
not manage macronode as normal-user default
```

Recommended Phase 8 sequencing:

```text
1. Start in macronode.
2. Expose real headless service-node foundation/readiness/status.
3. Only then project selected status into svc-admin or CrabLink.
4. Keep CrabLink display-only unless a real backend/Tauri command exists.
```

Potential future CrabLink work after macronode Phase 8:

```text
service-node readiness display
operator-facing service-node attach/status page
local-node settings refinement
user consent flow for local-node enablement
future sidecar supervisor UI, only after Rust supervisor exists
local node degraded/crash display
pending evidence display, only from real micronode status
confirmed ROC display, only from wallet/ledger receipt path
```

---

## 25. Good CrabLink Phase Marker to Carry Forward

Use this marker:

```text
CrabLink Tauri — BUILD_PLAN_Z status

Completed:
- added safe local-node Tauri command bridge:
  local_node_status
  local_node_start
  local_node_stop
  local_node_restart
- local_node_status probes existing loopback micronode only
- local_node_status probes:
  /healthz
  /readyz
  /api/v1/status
- local_node_status extracts privacy/economic posture
- start/stop/restart are parked:
  actionAccepted=false
  supervisorEnabled=false
  sidecarEnabled=false
  startSupported=false
  stopSupported=false
  restartSupported=false
- frontend localNodeClient added
- non-Tauri disabled fallback added
- settings defaults:
  localNodeEnabled=false
  localNodeUrl=http://127.0.0.1:5310
  localNodeMode=disabled
- app context localNodeStatus added
- app context actions added:
  checkLocalNode
  startLocalNode
  stopLocalNode
  restartLocalNode
- local node status normalization added:
  online
  disabled
  degraded
  private/privacy degraded
  no ROC claim/reward truth degraded
- TopBar Node pill added:
  Node off
  Node
  Node!
- local-node status/settings rows added
- SiteVisitAccess marker restored for existing QuickChain interlock
- local-node boundary scanner added:
  scripts/check-crablink-local-node-boundary.mjs
- package script added:
  check:local-node-boundary
- npm run check includes local-node boundary
- no process spawning
- no shell execution
- no arbitrary binary path
- no wallet mutation
- no ledger mutation
- no confirmed ROC claim
- no receipt finality claim
- no ROX/Solana/bridge behavior

Known green:
npm run check:local-node-boundary
npm run build
npm run check
TAURI_CONFIG="$(cat apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json)" cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
```

---

## 26. Short Summary

```text
Since starting BUILD_PLAN_Z, CrabLink Tauri has gained the safe local user-node controller/status boundary. It now has typed Tauri commands for local_node_status/start/stop/restart, a frontend localNodeClient, disabled-by-default local-node settings, app-context localNodeStatus normalization, a TopBar node status pill, and a dedicated local-node boundary scanner wired into npm run check. The implementation intentionally probes only an already-running loopback micronode and parks real start/stop/restart lifecycle mutation until a real sidecar supervisor exists. It preserves the critical guarantees: no process spawning, no shell execution, no arbitrary binary path, no wallet mutation, no ledger mutation, no confirmed ROC claim, no receipt finality, and no ROX/Solana/bridge authority.
```


### END NOTE - JULY 10 2026 - 13:05 CST




### BEGIN NOTE - JULY 14 2026 - 16:45 CST


# CrabLink / `crablink-tauri` — Session Changelog Notes

## Phase 21 Operator Mode

Completed the CrabLink-side implementation of **Service Node Operator Mode** and added the `crab://operator` route as an optional controller surface for a local or remote Service Node.

CrabLink remains a friendly client/controller rather than becoming the node daemon, policy engine, wallet, ledger, registry, quorum authority, storage authority, or external-finality authority.

## Optional Service Node connection

* Added explicit enable/disable control for Service Node Operator Mode.

* Kept Operator Mode **disabled by default**.

* Added separate connection postures:

  * local Service Node
  * remote Service Node

* Added local connection validation requiring an explicit loopback HTTP or HTTPS endpoint.

* Added remote connection validation requiring non-loopback HTTPS.

* Rejected URLs containing:

  * embedded usernames or passwords
  * query strings
  * fragments
  * unsupported schemes

* Added the default local endpoint:

  ```text
  http://127.0.0.1:8080
  ```

* Added bounded request timeouts and response-body limits.

* Made connection failures degrade only the Operator page rather than breaking normal CrabLink operation.

* Preserved CrabLink operation when no Service Node is configured or running.

* Prevented CrabLink from starting, stopping, restarting, killing, or otherwise managing the Service Node process.

## Ephemeral administrator authentication

* Added an administrator credential field for authenticated Service Node operations.
* Rendered the credential as a password-style input.
* Kept the credential only in route-local React memory.
* Prevented the credential from being written to:

  * CrabLink settings
  * `localStorage`
  * `sessionStorage`
  * IndexedDB
  * browser cache
* Cleared the credential when Operator Mode is disabled.
* Added explicit credential-clear behavior.
* Added validation for:

  * maximum credential length
  * control characters
  * unsafe whitespace
* Prevented credentials from being returned, logged, or projected into status output.

## Canonical Service Node status

Added the Tauri command:

```text
service_node_operator_status
```

The command now reads the Service Node’s real:

* `/healthz`
* `/readyz`
* `/api/v1/status`

CrabLink projects the backend response into a bounded canonical status view containing information such as:

* connection state
* Service Node profile
* node role
* readiness
* headless posture
* administrator UI posture
* public inbound posture
* IP-publication posture
* moderation state
* persistence-review counts
* reward-recipient binding state
* lifecycle state
* quorum state
* confirmed issuance evidence

The projection remains observational and cannot authorize backend state changes.

## Receipt-derived confirmed ROC display

* Added a dedicated **Confirmed ROC issuance evidence** section.

* Prevented pending reward plans, evidence records, review state, binding state, cached values, or quorum eligibility from appearing as confirmed ROC.

* Required accepted wallet and ledger receipt evidence before projecting confirmed issuance.

* Preserved the distinction between:

  * pending evidence
  * reward planning
  * receipt evidence
  * confirmed issuance
  * external finality

* Kept external finality explicitly false even when valid local ledger receipt evidence exists.

* Added a truthful empty state:

  ```text
  NO CONFIRMED RECEIPT EVIDENCE
  ```

* Added tests proving pending reward material cannot become confirmed issuance evidence.

## Signed reward-recipient binding

Added the Tauri command:

```text
service_node_operator_bind_reward_recipient
```

Implemented a signed reward-recipient intent compatible with the `macronode` contract.

### Signed intent behavior

* Added the canonical signing domain:

  ```text
  crablink.reward_binding.intent.v1
  ```

* Added the signing algorithm:

  ```text
  admin_bearer_blake3_keyed_v1
  ```

* Bound the signature to the exact:

  * administrator credential
  * reward-recipient `@address`
  * creation timestamp
  * nonce

* Generated a fresh nonce for each submission.

* Submitted the exact canonical payload expected by `macronode`.

* Required the backend to return:

  ```text
  signedIntentVerified: true
  ```

* Rejected responses that attempted to claim:

  * registry finality
  * wallet mutation
  * ledger mutation
  * confirmed ROC
  * external settlement

### Reward-binding UI

* Added a canonical lowercase CrabLink/RON `@address` input.

* Added an explicit acknowledgment:

  ```text
  I understand this records a binding request only
  ```

* Added the action:

  ```text
  Sign and submit binding request
  ```

* Added clear-form behavior.

* Added request status and failure display.

* Refreshed canonical Service Node status after a successful request.

* Kept binding explicitly separate from payment, payout, receipt creation, and confirmed ROC.

## Moderation-review queue

Added Tauri commands:

```text
service_node_operator_moderation_pending
service_node_operator_moderation_decide
```

Implemented a bounded authenticated moderation-review workflow.

### Queue behavior

* Added bounded pending-review retrieval.
* Enforced the backend queue limit.
* Accepted pending moderation items only.
* Required canonical lowercase `b3:<64 hex>` object IDs.
* Displayed:

  * object ID
  * review sequence
  * source
  * reason
  * effective policy state
  * current serve permission
* Refused malformed, oversized, or authority-poisoned responses.

### Moderation decisions

* Added explicit approve and reject operations.

* Defined approval as **approval for escalation**, not policy activation.

* Required exact backend result states.

* Made decisions explicit rather than automatic.

* Added required acknowledgment before mutation:

  ```text
  I understand this changes review metadata only
  ```

* Refreshed the queue and canonical Service Node status after a decision.

* Rejected responses claiming:

  * policy mutation
  * runtime activation
  * storage deletion
  * provider withdrawal
  * reward finality
  * wallet mutation
  * ledger mutation

## Persistence-review queue

Added Tauri commands:

```text
service_node_operator_persistence_pending
service_node_operator_persistence_decide
```

Added:

```text
PersistenceReviewCard.jsx
```

Implemented the complete CrabLink persistence-review interface.

### Pending persistence candidates

* Added bounded pending-candidate loading.
* Used a client default limit of 100.
* Enforced the client maximum of 256.
* Accepted only undecided backend candidate states:

  * `ephemeral_unvetted`
  * `pending_review`
* Required candidates to be initially ineligible for durable storage.
* Required canonical lowercase `b3:` object identifiers.
* Displayed:

  * object ID
  * asset kind
  * current persistence state
  * persistence eligibility
  * durable-byte status

### Persistence decisions

Added explicit actions for:

* submit for review
* approve persistence eligibility
* reject persistence

Required exact backend transitions:

```text
ephemeral_unvetted
→ pending_review
→ verified_persistent
```

or:

```text
ephemeral_unvetted / pending_review
→ operator_blocked
```

Added the acknowledgment:

```text
I understand approval changes eligibility metadata only
```

Added the explicit truth statement:

```text
No durable bytes were written.
```

Approval does not:

* write object bytes
* pin the object
* guarantee storage residency
* override moderation
* delete storage
* withdraw providers
* create a reward
* mutate a wallet
* append a ledger receipt
* claim external finality

The queue and canonical Service Node status refresh after each decision.

## Operator page and interface

Expanded `ServiceNodeOperatorPage.jsx` into the full Phase 21 controller interface.

The page now includes:

* disabled-by-default posture
* local/remote connection profile
* administrator credential handling
* canonical attachment state
* backend-derived Service Node status
* confirmed ROC receipt evidence
* signed reward-recipient binding
* moderation-review queue
* persistence-review queue
* explicit truth and authority boundaries throughout

The page was visually inspected in the running Tauri application and the new Phase 21 sections rendered successfully.

## Shared frontend model and client

Expanded the shared Service Node Operator surfaces, including:

```text
src/shared/operator/serviceNodeOperatorModel.js
src/shared/api/serviceNodeOperatorClient.js
```

* Added the operator connection model.
* Added disabled-by-default state.
* Added local and remote mode handling.
* Added Tauri command wrappers.
* Kept Service Node commands confined to operator-owned frontend modules.
* Prevented Operator Mode commands from becoming ambient capability across unrelated CrabLink pages.
* Kept all administrator state route-local and ephemeral.

## Tauri Rust command bridge

Added and registered the Operator Mode command modules:

```text
operator_node
operator_reward_binding
operator_moderation_review
operator_persistence_review
```

Updated:

```text
src-tauri/src/commands/mod.rs
src-tauri/src/lib.rs
```

Registered the full command family:

```text
service_node_operator_status
service_node_operator_bind_reward_recipient
service_node_operator_moderation_pending
service_node_operator_moderation_decide
service_node_operator_persistence_pending
service_node_operator_persistence_decide
```

The Operator Mode command bridge uses native Rust HTTP validation and does not expose raw browser fetch authority.

## Boundary and acceptance tooling

Added focused boundary gates:

```text
check-crablink-service-node-operator-boundary.mjs
check-crablink-service-node-operator-ui-boundary.mjs
check-crablink-signed-reward-binding-boundary.mjs
check-crablink-moderation-review-boundary.mjs
check-crablink-persistence-review-boundary.mjs
```

Added the integrated Phase 21 gate:

```text
check-crablink-phase21-operator-acceptance.mjs
```

The integrated checker verifies that:

* Operator Mode is disabled by default.
* Operator commands remain confined to the active operator frontend graph.
* credentials remain memory-only.
* CrabLink contains no daemon process-management path.
* signed binding remains non-authoritative.
* moderation cannot mutate or activate policy.
* persistence approval cannot claim durable bytes.
* confirmed ROC remains receipt-derived.
* all Operator command families are explicitly registered.

Added the cross-repository acceptance runner:

```text
scripts/check-phase21-operator-acceptance.sh
```

The runner verifies both:

* the independently headless `macronode`
* the optional CrabLink controller

## Package and verification integration

Updated:

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

Added npm scripts for:

```text
check:service-node-operator-boundary
check:service-node-operator-ui-boundary
check:signed-reward-binding-boundary
check:moderation-review-boundary
check:persistence-review-boundary
check:phase21-operator-acceptance
```

Added all new Operator sources and acceptance scripts to the generated CrabLink codebundle scope. The resulting codebundle includes the four Rust Operator command modules, Operator page components, shared operator model/client, and all Phase 21 boundary scripts. 

## Acceptance-runner repairs

Fixed several issues discovered while bringing up the integrated closeout runner:

* Corrected malformed Bash parameter expansion for `RUSTYONIONS_ROOT`.
* Replaced a broad source-tree scan with active frontend module-graph traversal.
* Distinguished operator-owned pages and shared operator modules from ambient application code.
* Changed command checks to detect real `callTauri(...)` invocations rather than incidental command-name strings.
* Aligned URL-security assertions with the actual compile-tested Rust error wording.
* Prevented unused legacy Tauri scaffold files and backup sources from creating false acceptance failures.

These were test-infrastructure repairs; they did not weaken Operator Mode security boundaries.

## Verification completed

The final Phase 21 CrabLink acceptance sweep completed successfully:

* Service Node Operator boundary gate: passed
* Operator UI boundary gate: passed
* signed reward-binding gate: passed
* moderation-review gate: passed
* persistence-review gate: passed
* integrated Phase 21 gate: passed
* Tauri Operator tests: **21 passed**
* Tauri `cargo check`: passed
* strict Tauri Clippy with `--all-targets --no-deps -D warnings`: passed
* Vite production build: passed
* production build transformed **319 modules**
* complete Phase 21 cross-repository acceptance runner: passed 

## Session result

CrabLink now contains a complete optional Service Node Operator surface for:

* canonical status
* signed reward-recipient binding
* moderation review
* persistence eligibility review
* confirmed ROC receipt evidence

The Service Node remains independent and headless, and CrabLink does not gain daemon, policy, storage, wallet, ledger, registry, quorum, mint, burn, or external-finality authority.

## Known unresolved issue discovered during visual inspection

A high-priority Tauri-wide mouse interaction defect was observed after launching the new Operator page:

* only about one out of four clicks registers
* some inputs require keyboard `Tab` navigation before they can be used
* multiple controls intermittently ignore mouse clicks
* the scrollbar does not reliably respond to mouse interaction
* the issue affects more than the Operator page

The Operator interface itself renders correctly, so the likely cause is in a shared input or window layer, such as:

* an invisible overlay
* incorrect `pointer-events`
* an oversized Tauri drag region
* a bad `z-index`
* a portal or toast layer intercepting clicks
* global event capture or `preventDefault()` behavior

This issue was **recorded but not fixed during this session**. It should be investigated before proceeding deeply into the Phase 22 live two-node smoke because it will interfere with runtime and Operator Mode testing.



### END NOTE - JULY 14 2026 - 16:45 CST




### BEGIN NOTE - JULY 14 2026 - 16:50 CST


# CrabLink / `crablink-tauri` — Session Changelog Notes

## Phase 21 Operator Mode

Completed the CrabLink-side implementation of **Service Node Operator Mode** and added the `crab://operator` route as an optional controller surface for a local or remote Service Node.

CrabLink remains a friendly client/controller rather than becoming the node daemon, policy engine, wallet, ledger, registry, quorum authority, storage authority, or external-finality authority.

## Optional Service Node connection

* Added explicit enable/disable control for Service Node Operator Mode.

* Kept Operator Mode **disabled by default**.

* Added separate connection postures:

  * local Service Node
  * remote Service Node

* Added local connection validation requiring an explicit loopback HTTP or HTTPS endpoint.

* Added remote connection validation requiring non-loopback HTTPS.

* Rejected URLs containing:

  * embedded usernames or passwords
  * query strings
  * fragments
  * unsupported schemes

* Added the default local endpoint:

  ```text
  http://127.0.0.1:8080
  ```

* Added bounded request timeouts and response-body limits.

* Made connection failures degrade only the Operator page rather than breaking normal CrabLink operation.

* Preserved CrabLink operation when no Service Node is configured or running.

* Prevented CrabLink from starting, stopping, restarting, killing, or otherwise managing the Service Node process.

## Ephemeral administrator authentication

* Added an administrator credential field for authenticated Service Node operations.
* Rendered the credential as a password-style input.
* Kept the credential only in route-local React memory.
* Prevented the credential from being written to:

  * CrabLink settings
  * `localStorage`
  * `sessionStorage`
  * IndexedDB
  * browser cache
* Cleared the credential when Operator Mode is disabled.
* Added explicit credential-clear behavior.
* Added validation for:

  * maximum credential length
  * control characters
  * unsafe whitespace
* Prevented credentials from being returned, logged, or projected into status output.

## Canonical Service Node status

Added the Tauri command:

```text
service_node_operator_status
```

The command now reads the Service Node’s real:

* `/healthz`
* `/readyz`
* `/api/v1/status`

CrabLink projects the backend response into a bounded canonical status view containing information such as:

* connection state
* Service Node profile
* node role
* readiness
* headless posture
* administrator UI posture
* public inbound posture
* IP-publication posture
* moderation state
* persistence-review counts
* reward-recipient binding state
* lifecycle state
* quorum state
* confirmed issuance evidence

The projection remains observational and cannot authorize backend state changes.

## Receipt-derived confirmed ROC display

* Added a dedicated **Confirmed ROC issuance evidence** section.

* Prevented pending reward plans, evidence records, review state, binding state, cached values, or quorum eligibility from appearing as confirmed ROC.

* Required accepted wallet and ledger receipt evidence before projecting confirmed issuance.

* Preserved the distinction between:

  * pending evidence
  * reward planning
  * receipt evidence
  * confirmed issuance
  * external finality

* Kept external finality explicitly false even when valid local ledger receipt evidence exists.

* Added a truthful empty state:

  ```text
  NO CONFIRMED RECEIPT EVIDENCE
  ```

* Added tests proving pending reward material cannot become confirmed issuance evidence.

## Signed reward-recipient binding

Added the Tauri command:

```text
service_node_operator_bind_reward_recipient
```

Implemented a signed reward-recipient intent compatible with the `macronode` contract.

### Signed intent behavior

* Added the canonical signing domain:

  ```text
  crablink.reward_binding.intent.v1
  ```

* Added the signing algorithm:

  ```text
  admin_bearer_blake3_keyed_v1
  ```

* Bound the signature to the exact:

  * administrator credential
  * reward-recipient `@address`
  * creation timestamp
  * nonce

* Generated a fresh nonce for each submission.

* Submitted the exact canonical payload expected by `macronode`.

* Required the backend to return:

  ```text
  signedIntentVerified: true
  ```

* Rejected responses that attempted to claim:

  * registry finality
  * wallet mutation
  * ledger mutation
  * confirmed ROC
  * external settlement

### Reward-binding UI

* Added a canonical lowercase CrabLink/RON `@address` input.

* Added an explicit acknowledgment:

  ```text
  I understand this records a binding request only
  ```

* Added the action:

  ```text
  Sign and submit binding request
  ```

* Added clear-form behavior.

* Added request status and failure display.

* Refreshed canonical Service Node status after a successful request.

* Kept binding explicitly separate from payment, payout, receipt creation, and confirmed ROC.

## Moderation-review queue

Added Tauri commands:

```text
service_node_operator_moderation_pending
service_node_operator_moderation_decide
```

Implemented a bounded authenticated moderation-review workflow.

### Queue behavior

* Added bounded pending-review retrieval.
* Enforced the backend queue limit.
* Accepted pending moderation items only.
* Required canonical lowercase `b3:<64 hex>` object IDs.
* Displayed:

  * object ID
  * review sequence
  * source
  * reason
  * effective policy state
  * current serve permission
* Refused malformed, oversized, or authority-poisoned responses.

### Moderation decisions

* Added explicit approve and reject operations.

* Defined approval as **approval for escalation**, not policy activation.

* Required exact backend result states.

* Made decisions explicit rather than automatic.

* Added required acknowledgment before mutation:

  ```text
  I understand this changes review metadata only
  ```

* Refreshed the queue and canonical Service Node status after a decision.

* Rejected responses claiming:

  * policy mutation
  * runtime activation
  * storage deletion
  * provider withdrawal
  * reward finality
  * wallet mutation
  * ledger mutation

## Persistence-review queue

Added Tauri commands:

```text
service_node_operator_persistence_pending
service_node_operator_persistence_decide
```

Added:

```text
PersistenceReviewCard.jsx
```

Implemented the complete CrabLink persistence-review interface.

### Pending persistence candidates

* Added bounded pending-candidate loading.
* Used a client default limit of 100.
* Enforced the client maximum of 256.
* Accepted only undecided backend candidate states:

  * `ephemeral_unvetted`
  * `pending_review`
* Required candidates to be initially ineligible for durable storage.
* Required canonical lowercase `b3:` object identifiers.
* Displayed:

  * object ID
  * asset kind
  * current persistence state
  * persistence eligibility
  * durable-byte status

### Persistence decisions

Added explicit actions for:

* submit for review
* approve persistence eligibility
* reject persistence

Required exact backend transitions:

```text
ephemeral_unvetted
→ pending_review
→ verified_persistent
```

or:

```text
ephemeral_unvetted / pending_review
→ operator_blocked
```

Added the acknowledgment:

```text
I understand approval changes eligibility metadata only
```

Added the explicit truth statement:

```text
No durable bytes were written.
```

Approval does not:

* write object bytes
* pin the object
* guarantee storage residency
* override moderation
* delete storage
* withdraw providers
* create a reward
* mutate a wallet
* append a ledger receipt
* claim external finality

The queue and canonical Service Node status refresh after each decision.

## Operator page and interface

Expanded `ServiceNodeOperatorPage.jsx` into the full Phase 21 controller interface.

The page now includes:

* disabled-by-default posture
* local/remote connection profile
* administrator credential handling
* canonical attachment state
* backend-derived Service Node status
* confirmed ROC receipt evidence
* signed reward-recipient binding
* moderation-review queue
* persistence-review queue
* explicit truth and authority boundaries throughout

The page was visually inspected in the running Tauri application and the new Phase 21 sections rendered successfully.

## Shared frontend model and client

Expanded the shared Service Node Operator surfaces, including:

```text
src/shared/operator/serviceNodeOperatorModel.js
src/shared/api/serviceNodeOperatorClient.js
```

* Added the operator connection model.
* Added disabled-by-default state.
* Added local and remote mode handling.
* Added Tauri command wrappers.
* Kept Service Node commands confined to operator-owned frontend modules.
* Prevented Operator Mode commands from becoming ambient capability across unrelated CrabLink pages.
* Kept all administrator state route-local and ephemeral.

## Tauri Rust command bridge

Added and registered the Operator Mode command modules:

```text
operator_node
operator_reward_binding
operator_moderation_review
operator_persistence_review
```

Updated:

```text
src-tauri/src/commands/mod.rs
src-tauri/src/lib.rs
```

Registered the full command family:

```text
service_node_operator_status
service_node_operator_bind_reward_recipient
service_node_operator_moderation_pending
service_node_operator_moderation_decide
service_node_operator_persistence_pending
service_node_operator_persistence_decide
```

The Operator Mode command bridge uses native Rust HTTP validation and does not expose raw browser fetch authority.

## Boundary and acceptance tooling

Added focused boundary gates:

```text
check-crablink-service-node-operator-boundary.mjs
check-crablink-service-node-operator-ui-boundary.mjs
check-crablink-signed-reward-binding-boundary.mjs
check-crablink-moderation-review-boundary.mjs
check-crablink-persistence-review-boundary.mjs
```

Added the integrated Phase 21 gate:

```text
check-crablink-phase21-operator-acceptance.mjs
```

The integrated checker verifies that:

* Operator Mode is disabled by default.
* Operator commands remain confined to the active operator frontend graph.
* credentials remain memory-only.
* CrabLink contains no daemon process-management path.
* signed binding remains non-authoritative.
* moderation cannot mutate or activate policy.
* persistence approval cannot claim durable bytes.
* confirmed ROC remains receipt-derived.
* all Operator command families are explicitly registered.

Added the cross-repository acceptance runner:

```text
scripts/check-phase21-operator-acceptance.sh
```

The runner verifies both:

* the independently headless `macronode`
* the optional CrabLink controller

## Package and verification integration

Updated:

```text
apps/crablink-tauri/package.json
scripts/check-tauri.sh
scripts/make_codebundle.sh
```

Added npm scripts for:

```text
check:service-node-operator-boundary
check:service-node-operator-ui-boundary
check:signed-reward-binding-boundary
check:moderation-review-boundary
check:persistence-review-boundary
check:phase21-operator-acceptance
```

Added all new Operator sources and acceptance scripts to the generated CrabLink codebundle scope. The resulting codebundle includes the four Rust Operator command modules, Operator page components, shared operator model/client, and all Phase 21 boundary scripts. 

## Acceptance-runner repairs

Fixed several issues discovered while bringing up the integrated closeout runner:

* Corrected malformed Bash parameter expansion for `RUSTYONIONS_ROOT`.
* Replaced a broad source-tree scan with active frontend module-graph traversal.
* Distinguished operator-owned pages and shared operator modules from ambient application code.
* Changed command checks to detect real `callTauri(...)` invocations rather than incidental command-name strings.
* Aligned URL-security assertions with the actual compile-tested Rust error wording.
* Prevented unused legacy Tauri scaffold files and backup sources from creating false acceptance failures.

These were test-infrastructure repairs; they did not weaken Operator Mode security boundaries.

## Verification completed

The final Phase 21 CrabLink acceptance sweep completed successfully:

* Service Node Operator boundary gate: passed
* Operator UI boundary gate: passed
* signed reward-binding gate: passed
* moderation-review gate: passed
* persistence-review gate: passed
* integrated Phase 21 gate: passed
* Tauri Operator tests: **21 passed**
* Tauri `cargo check`: passed
* strict Tauri Clippy with `--all-targets --no-deps -D warnings`: passed
* Vite production build: passed
* production build transformed **319 modules**
* complete Phase 21 cross-repository acceptance runner: passed 

## Session result

CrabLink now contains a complete optional Service Node Operator surface for:

* canonical status
* signed reward-recipient binding
* moderation review
* persistence eligibility review
* confirmed ROC receipt evidence

The Service Node remains independent and headless, and CrabLink does not gain daemon, policy, storage, wallet, ledger, registry, quorum, mint, burn, or external-finality authority.

## Known unresolved issue discovered during visual inspection

A high-priority Tauri-wide mouse interaction defect was observed after launching the new Operator page:

* only about one out of four clicks registers
* some inputs require keyboard `Tab` navigation before they can be used
* multiple controls intermittently ignore mouse clicks
* the scrollbar does not reliably respond to mouse interaction
* the issue affects more than the Operator page

The Operator interface itself renders correctly, so the likely cause is in a shared input or window layer, such as:

* an invisible overlay
* incorrect `pointer-events`
* an oversized Tauri drag region
* a bad `z-index`
* a portal or toast layer intercepting clicks
* global event capture or `preventDefault()` behavior

This issue was **recorded but not fixed during this session**. It should be investigated before proceeding deeply into the Phase 22 live two-node smoke because it will interfere with runtime and Operator Mode testing.



### END NOTE - JULY 14 2026 - 16:50 CST


### BEGIN NOTE - JULY 15 2026 - 12:25 CST


Here are the drop-in changelog notes for the third crate, **`crablink-tauri`**.

## `crablink-tauri` — Phase 22 Session Changelog

### Expanded the live two-node integration surface

* Continued Phase 22 integration between CrabLink, an independently managed Service Node, and an independently managed User Node.
* Preserved the architecture in which CrabLink observes and coordinates local workflows without owning either daemon.
* Reused production native command behavior in integration tests rather than introducing fake test-only success paths.
* Preserved the separation between:

  * Service Node operation
  * User Node verification
  * accounting and reward planning
  * wallet execution
  * ledger receipt truth
  * CrabLink display behavior

### Integrated native OAP object retrieval

* Exercised the production Rust OAP client against a real local Service Node.
* Retrieved seeded Service Node content through OAP/1.
* Kept all OAP frame and payload parsing inside the Rust/Tauri layer.
* Prevented React and JavaScript code from parsing OAP wire data.
* Applied bounded OAP parsing and object-size limits.
* Required complete object retrieval before admission.
* Verified the full object using canonical BLAKE3 before allowing it into the User Node verification path.
* Rejected corrupted live object streams.
* Rejected truncated live object streams.
* Preserved strict `b3:<64 lowercase hexadecimal characters>` object identity.

### Connected CrabLink to the real User Node verification queue

* Added the native `user_node_verify_service_object` workflow.
* Connected the production Service Node OAP fetch path to the real micronode object-verification endpoint.
* Forwarded only complete, full-BLAKE3-authenticated object bytes.
* Preserved a strict loopback-only User Node base URL boundary.
* Prevented non-loopback User Node endpoints from being accepted.
* Added configurable bounded request timeouts.
* Preserved the distinction between:

  * CrabLink’s initial OAP verification
  * micronode’s independent verification and evidence creation

### Added live User Node verification coverage

* Added a cross-process integration test for the complete Service Node object-to-User Node evidence workflow.
* Verified valid Service Node bytes create `verified_valid` pending evidence.
* Verified mismatched bytes create challenge evidence.
* Verified duplicate idempotency submissions are rejected.
* Verified the real micronode pending-evidence count increases truthfully.
* Verified the User Node remains active after the Service Node is shut down.
* Verified pending evidence does not become:

  * accounting acceptance
  * reward truth
  * payout authority
  * wallet mutation
  * ledger mutation
  * durable receipt
  * confirmed ROC

### Added User Node verification boundary checks

* Added static checks ensuring only authenticated OAP bytes enter the User Node verification route.
* Added checks confirming that the native command does not fabricate accounting or reward success.
* Added checks preserving the rule that pending evidence is non-authoritative.
* Added scripts for running the live User Node verification workflow.
* Registered the new checks in the CrabLink package scripts.
* Added the new files to CrabLink codebundle generation.

### Refactored User Node status into reusable production behavior

* Extracted the production User Node status request into `query_local_node_status`.
* Kept the Tauri command as a thin wrapper over the reusable implementation.
* Reused the same implementation in live Phase 22 tests.
* Added truthful status projection for:

  * enabled or disabled configuration
  * loopback base URL
  * health
  * readiness
  * node status
  * lifecycle state
  * verification queue status
  * pending evidence count
  * privacy mode
  * public inbound posture
  * wallet and ledger non-authority
  * confirmed-ROC source posture

### Added independent lifecycle-isolation proof

* Added `phase22_live_lifecycle_isolation.rs`.
* Added a three-stage cross-process lifecycle test.

The test verifies:

1. CrabLink can attach to both independently running nodes.
2. Exiting the CrabLink test client stops neither daemon.
3. Service Node loss degrades only the Operator surface.
4. User Node remains active when the Service Node is unavailable.
5. User Node loss degrades only the User Node surface.
6. Service Node remains connected when the User Node is unavailable.

* Confirmed CrabLink does not start, stop, restart, or supervise either daemon.
* Confirmed the Service Node remains headless and independently managed.
* Confirmed the User Node remains private, loopback-only, and independently managed.
* Confirmed neither degradation path creates confirmed ROC or finality.

### Added lifecycle boundary checks and runner

* Added `check-crablink-lifecycle-isolation-boundary.mjs`.
* Added `check-phase22-local-lifecycle-isolation.sh`.
* Added package commands for the static and live lifecycle checks.
* Added the lifecycle files to codebundle generation.
* The live runner:

  * builds the real macronode and micronode binaries
  * starts both as independent processes
  * attaches CrabLink through production status behavior
  * stops one node at a time
  * verifies the other node remains healthy
  * confirms CrabLink owns neither process

### Verified existing Operator workflows remained green

* Re-ran the live Service Node Operator attachment workflow.
* Verified authenticated attachment to the independently managed Service Node.
* Verified incorrect admin tokens remain rejected.
* Verified signed reward-recipient binding submission.
* Verified the signed binding does not itself create:

  * registry finality
  * wallet mutation
  * ledger mutation
  * receipt truth
  * confirmed ROC
* Re-ran live moderation and persistence review.
* Verified review decisions use real runtime state.
* Preserved the rule that UI review does not directly activate policy, write persistent bytes, mutate providers, or finalize rewards.

### Added native confirmed-ROC projection validation

* Added the native `confirmed_roc` module.
* Added a strict, versioned `ConfirmedRocProjectionV1` contract.
* Added JSON parsing with unknown-field rejection.
* Added validation for:

  * schema and version
  * epoch identity
  * account identity
  * canonical decimal ROC amount
  * receipt count
  * operation identities
  * ledger sequence
  * ledger root
  * epoch transition hash
  * economics configuration hash
  * wallet receipt confirmation
  * ledger replay confirmation
  * User Node replay acceptance
  * display-only posture
* Required canonical lowercase BLAKE3 identities.
* Required at least one wallet/ledger receipt.
* Required operation count to match receipt count.
* Required confirmed ROC to be greater than zero.

### Enforced the receipt-only confirmed-ROC source

* Required the exact source label:

```text
wallet_ledger_receipt_only
```

* Rejected pending evidence as a confirmed-ROC source.
* Rejected fake micronode evidence source labels.
* Rejected projections without durable receipts.
* Rejected projections without accepted ledger replay.
* Rejected projections without accepted User Node replay.
* Rejected projections claiming CrabLink wallet mutation.
* Rejected projections claiming CrabLink ledger mutation.
* Rejected projections claiming CrabLink finality authority.

### Added native confirmed-ROC unit tests

* Added a test proving a complete receipt-backed projection validates.
* Added tests proving pending evidence cannot validate as confirmed ROC.
* Added tests proving client-side mutation authority cannot be smuggled into the projection.
* Confirmed both native `confirmed_roc` unit tests pass.

### Added the cross-repository Phase 22H projection test

* Added `phase22_confirmed_roc_projection.rs`.
* The test reads the projection exported by the real Phase 22G backend reward loop.
* It passes the exported JSON through the production CrabLink native validator.
* It verifies the projection contains:

  * positive confirmed ROC
  * real wallet receipt confirmation
  * ledger replay confirmation
  * accepted User Node replay
  * no pending-only posture
  * no client mutation authority
* It additionally mutates the valid projection and verifies rejection of:

  * pending evidence
  * fake source labels
  * missing receipts

### Added frontend confirmed-ROC normalization

* Added `confirmedRocProjection.js`.
* Added a strict JavaScript normalization seam for receipt-backed confirmed ROC.
* Valid projections normalize to a display model with:

  * `state: confirmed`
  * `source: ledger`
  * backend-derived truth
  * positive ROC minor units
  * receipt metadata
  * ledger metadata
  * transition identity
  * economics identity
  * display-only posture
* Invalid projections normalize to:

  * `state: unconfirmed`
  * no confirmed amount
  * no economic authority
* Re-exported the normalization function through the existing wallet client module.
* Preserved the existing gateway-first wallet architecture.
* Did not add a direct browser-to-ledger or browser-to-wallet mutation path.

### Added confirmed-ROC frontend boundary checks

* Added `check-phase22-confirmed-roc-boundary.mjs`.
* Added source checks confirming:

  * the receipt-only source label is present
  * pending evidence is rejected
  * wallet mutation is false
  * ledger mutation is false
  * finality authority is false
  * confirmed display data is backend-derived
* Added runtime normalization checks for:

  * valid receipt-backed projection
  * pending evidence
  * fake source
  * missing receipt
* Added optional validation of the real Phase 22G exported projection.
* Confirmed the standalone confirmed-ROC boundary check passes.

### Added the final Phase 22 acceptance runner

* Added `check-phase22-final-acceptance.sh`.
* Registered `check:phase22-final-acceptance` in the Tauri package scripts.
* The runner is designed to verify the complete Phase 22 surface, including:

  * complete Phase 22G backend reward loop
  * strict Clippy for the reward-loop test
  * confirmed-ROC projection JSON
  * DHT provider and repair behavior
  * registry behavior
  * enforcement-aware reward denial
  * micronode object verification
  * User Node epoch replay
  * RustyOnions workspace check
  * native CrabLink confirmed-ROC projection
  * strict Tauri Clippy
  * OAP boundary
  * User Node verification boundary
  * lifecycle isolation
  * Operator attachment
  * Operator review
  * frontend production build
  * Tauri cargo check
* Added the intended conclusive final marker:

```text
PHASE22_FINAL_STATUS=GREEN_PARKED
```

### Tests and verification completed

The following checks passed during this session:

* CrabLink OAP object boundary check.
* CrabLink User Node verification boundary check.
* CrabLink lifecycle-isolation boundary check.
* Live OAP Service Node object retrieval.
* Corrupted and truncated OAP stream rejection.
* Live User Node pending-evidence workflow.
* Verification replay rejection.
* Three-stage lifecycle-isolation workflow.
* Live Service Node Operator attachment.
* Live moderation and persistence review.
* CrabLink frontend production build.
* Tauri `cargo check`.
* Native confirmed-ROC static boundary.
* Native confirmed-ROC unit tests.
* Strict Clippy for earlier Phase 22 integration targets.
* RustyOnions workspace check before the final Phase 22H temporary-path failure.

The lifecycle-isolation tests and the larger CrabLink regression sweep were green. 

### Current unresolved Phase 22H issue

* The final cross-repository projection test did not complete because the focused verification command used a macOS-incompatible `mktemp` template.
* The command attempted to create:

```text
phase22-confirmed-roc.XXXXXX.json
```

* On macOS, `mktemp` requires the `XXXXXX` placeholder at the end of the template unless a compatible suffix option is used.
* Temporary-file creation failed with:

```text
mktemp: mkstemp failed ... File exists
```

* The shell assignment therefore produced an empty `PROJECTION_PATH`.
* The Phase 22G backend test then attempted to write the confirmed-ROC projection to an empty path.
* The cross-repository CrabLink test subsequently failed because the projection file did not exist.
* These are temporary-path plumbing failures, not confirmed-ROC validation failures.
* The standalone frontend boundary check and native confirmed-ROC unit tests already passed.
* The next session should first repair the temporary path creation and then rerun:

  * Phase 22G projection export
  * Phase 22H native projection test
  * strict Tauri Clippy
  * final Phase 22 acceptance runner

### Recommended temporary-file correction for the next session

Use a directory plus a normal filename, or place `XXXXXX` at the end:

```text
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/phase22-confirmed-roc.XXXXXX")"
PROJECTION_PATH="$TMP_DIR/confirmed-roc.json"
```

This matches the approach already used inside the final acceptance runner and avoids the macOS suffix problem.

### Authority posture

* CrabLink remains a client and display surface.
* CrabLink does not own Service Node or User Node lifecycle.
* CrabLink does not mint, issue, transfer, or burn ROC.
* CrabLink does not choose arbitrary payout recipients.
* CrabLink does not create ledger receipts.
* CrabLink does not create finality.
* CrabLink does not convert pending evidence into confirmed ROC.
* Confirmed ROC is accepted only from wallet/ledger receipt truth after independent User Node replay.
* `ron-ledger` remains the durable economic source of truth.
* The confirmed-ROC projection remains display-only and grants no client mutation authority.

The three directly changed crates for this session are now covered: `micronode`, `svc-rewarder`, and `crablink-tauri`.



### END NOTE - JULY 15 2026 - 12:25 CST


### BEGIN NOTE - JULY 15 2026 - 18:30 CST

These notes cover the complete CrabLink implementation and acceptance work from the Operator Mode carryover through Phases 22–24, rather than only the final privacy test. The project notes confirm the Operator command family, native confirmed-ROC validation, User Node verification boundary, privacy-route failure behavior, and final green acceptance state.    

# CrabLink / crablink-tauri — Session Changelog

## Status

CrabLink completed and parked the client-side work required for the closing BUILD_PLAN_Z phases:

```text
Phase 21 — Operator Mode: GREEN / PARKED
Phase 22 — Local two-node reward loop: GREEN / PARKED
Phase 23 — Chaos and fail-closed validation: GREEN / PARKED
Phase 24 — Private-beta readiness: COMPLETE / GREEN / PARKED
```

CrabLink now supports the real User Node verification boundary, optional Service Node Operator Mode, receipt-derived confirmed ROC, and fail-closed privacy routing without becoming an economic or network authority.

---

## 1. Service Node Operator Mode

Added the complete optional Service Node Operator surface under:

```text
crab://operator
```

Operator Mode is:

```text
disabled by default
optional
separate from normal CrabLink use
compatible with headless Service Node operation
not required to keep the Service Node running
```

Added support for:

* Local and remote Service Node connection modes.
* Explicit operator connection state.
* Canonical Service Node status display.
* Memory-only administrator credentials.
* Reward-recipient binding and rotation.
* Moderation queue review.
* Persistence eligibility review.
* Receipt-derived confirmed-ROC display.
* Truthful disconnected, unavailable, and unauthorized states.

CrabLink does not start, stop, supervise, or become the required container for the Service Node daemon.

The Service Node remains independently headless and CLI-operable.

---

## 2. Operator frontend model and client boundary

Added shared Operator frontend modules for:

* Service Node connection configuration.
* Local-versus-remote connection handling.
* Canonical operator status normalization.
* Tauri command invocation.
* Reward-binding request preparation.
* Moderation pending-list and decision handling.
* Persistence pending-list and decision handling.
* Receipt-derived confirmed issuance display.

Administrator credentials remain route-local and memory-only.

Credentials are not stored in:

```text
localStorage
sessionStorage
persistent application settings
URL parameters
logs
frontend receipt caches
```

Operator commands remain confined to Operator-owned frontend modules rather than being exposed as generic browser-fetch authority.

---

## 3. Native Tauri Operator commands

Added and registered the native Rust Operator command modules:

```text
operator_node
operator_reward_binding
operator_moderation_review
operator_persistence_review
```

Registered command family:

```text
service_node_operator_status
service_node_operator_bind_reward_recipient
service_node_operator_moderation_pending
service_node_operator_moderation_decide
service_node_operator_persistence_pending
service_node_operator_persistence_decide
```

The native bridge performs bounded and typed HTTP handling rather than allowing the React layer to issue unrestricted administrative requests.

The bridge preserves:

* Explicit loopback and remote connection posture.
* Bounded request and response handling.
* Authentication requirements.
* Redacted error output.
* Canonical DTO validation.
* No raw browser administrative authority.

---

## 4. Signed reward-recipient binding

Added the CrabLink Operator workflow for binding a Service Node to an external CrabLink/RON reward recipient.

The UI can prepare and submit a binding request, but it does not decide the recipient or execute a payout.

The canonical path remains:

```text
Service Node identity
→ signed binding request
→ svc-registry resolution
→ reward plan
→ quorum approval
→ svc-wallet execution
→ ron-ledger receipt
→ confirmed ROC display
```

CrabLink does not:

```text
insert arbitrary payout addresses into evidence
resolve registry truth locally
approve its own binding
issue ROC
mutate a wallet
mutate the ledger
invent a payout receipt
claim reward finality
```

Binding and rotation results are displayed as backend-derived status only.

---

## 5. Moderation review boundary

Added Operator Mode support for viewing and deciding real pending moderation reviews.

The UI supports explicit operator actions while preserving the policy boundary.

CrabLink may submit operator intent, but it does not:

```text
become moderation-policy truth
activate signed policy locally
override a global deny
override an owner tombstone
silently release quarantined content
claim network-wide removal
mutate wallet or ledger state
```

Moderation responses are validated for prohibited authority claims before display.

---

## 6. Persistence review boundary

Added Operator Mode support for:

```text
listing pending persistence candidates
submitting a candidate for review
approving persistence eligibility
rejecting persistence
pinning or unpinning through the real operator path
```

The expected state flow remains:

```text
ephemeral_unvetted
→ pending_review
→ verified_persistent
```

Rejection may produce:

```text
ephemeral_unvetted / pending_review
→ operator_blocked
```

CrabLink explicitly distinguishes:

```text
persistence eligibility
```

from:

```text
proof that durable bytes were written
```

The UI rejects or refuses to present responses that falsely claim:

```text
durable bytes written
wallet mutation
ledger mutation
policy mutation
runtime activation
storage deletion
provider withdrawal
reward finality
external finality
```

---

## 7. Confirmed-ROC native projection

Added the native confirmed-ROC validation module:

```text
apps/crablink-tauri/src-tauri/src/confirmed_roc.rs
```

The module parses and validates the projection exported from the real Phase 22 reward-loop execution.

Validated fields include:

* Projection schema and version.
* Epoch identifier.
* Account identifier.
* Canonical positive ROC amount.
* Receipt-only source label.
* Receipt count.
* Sorted and unique operation identifiers.
* Last accepted ledger sequence.
* Canonical BLAKE3 ledger root.
* Canonical BLAKE3 transition hash.
* Canonical BLAKE3 economics-configuration hash.
* Wallet receipt confirmation.
* Ledger replay confirmation.
* User Node replay acceptance.
* Display-only posture.
* Explicit client non-authority flags.

The required source label is:

```text
wallet_ledger_receipt_only
```

The validator rejects:

* Pending evidence presented as confirmed ROC.
* Reward plans presented as confirmed ROC.
* Missing or zero receipt counts.
* Zero or malformed ROC amounts.
* Noncanonical decimal amounts.
* Invalid or duplicate operation identifiers.
* Missing ledger sequence.
* Malformed or prefixed ledger-root inputs where raw canonical form is required.
* Fake source labels.
* Client wallet-mutation claims.
* Client ledger-mutation claims.
* Client finality claims.

Confirmed ROC is displayed only when all of the following are true:

```text
wallet receipt exists
ledger replay succeeds
User Node replay accepts the epoch
projection remains display-only
client has no mutation or finality authority
```

---

## 8. Confirmed-ROC frontend boundary

Added frontend normalization and display handling for the native confirmed-ROC projection.

The frontend preserves the distinction between:

```text
pending evidence
pending accounting
pending reward plan
wallet request candidate
durable confirmed ROC
```

The empty Operator state truthfully reports that there is no confirmed receipt evidence instead of displaying a placeholder balance.

The frontend cannot promote pending evidence into confirmed ROC and cannot calculate authoritative balances from local data.

---

## 9. Native OAP object retrieval and verification

Added the CrabLink-native object-verification path for User Node work.

The native boundary:

1. Uses the configured privacy-compatible OAP route.
2. Requests the canonical B3-addressed object.
3. Applies bounded response handling.
4. Rejects truncated, malformed, oversized, or corrupt data.
5. Performs complete BLAKE3 verification.
6. Submits only authenticated bytes to the real User Node verification queue.

Only fully verified bytes may enter the pending-evidence path.

The React layer does not certify B3 truth and does not submit arbitrary unverified bytes as successful verification evidence.

---

## 10. User Node verification submission boundary

Added the real Tauri-to-User-Node submission path.

The submission contract requires:

```text
canonical User Node target
configured privacy route
complete BLAKE3-authenticated object bytes
explicit non-authority fields
bounded verification request
```

The returned result remains pending verification evidence.

The boundary requires economic-authority fields to remain false, including:

```text
accounting authority
reward authority
wallet mutation
ledger mutation
receipt truth
confirmed ROC
finality
```

Added native unit coverage proving:

* Authority fields are required to be false.
* User Node targets are validated.
* Privacy routes are fail-closed.
* Unverified or malformed inputs cannot enter the verification queue.

---

## 11. Privacy-route fail-closed behavior

Added the Phase 23 privacy-route-unavailable integration test:

```text
phase23_privacy_relay_unavailable.rs
```

The test proves that when the configured privacy route is unavailable:

* CrabLink makes one configured OAP attempt.
* The request fails truthfully.
* CrabLink does not fall back to a direct public provider route.
* CrabLink does not contact the User Node verification queue.
* No verification evidence is created.
* No reward state is created.
* No wallet or ledger state is created.
* No receipt is created.
* No confirmed ROC is displayed.
* No finality is claimed.

This locks the rule:

```text
privacy-route failure
≠ permission to expose the user through a direct route
```

---

## 12. Local Service Node attachment support

Added native Phase 22 support helpers for attaching CrabLink Operator Mode to a real local Service Node.

The live attachment coverage verifies:

* Service Node attachment.
* Unauthorized responses remain unauthorized.
* Correct bearer authentication is accepted.
* Canonical operator status is returned.
* Reward-binding status is backend-derived.
* Refresh remains bound to the configured Service Node.
* Operator attachment does not create process-control or economic authority.

Timeout handling was bounded so the attachment tests fail rather than hang indefinitely.

---

## 13. Lifecycle isolation

Added and verified lifecycle-isolation behavior across:

```text
CrabLink
User Node
Service Node
optional Operator UI
```

The tests confirm:

* CrabLink may stop without redefining Service Node truth.
* The Service Node remains independently headless.
* The optional Operator UI is not the Service Node runtime.
* User Node verification remains a separate local boundary.
* Operator attachment does not merge the client and node authority models.
* No lifecycle event creates wallet, ledger, receipt, or finality authority.

---

## 14. Operator acceptance and boundary tooling

Added focused boundary scanners for:

```text
Service Node Operator boundary
Operator UI boundary
signed reward-binding boundary
moderation-review boundary
persistence-review boundary
User Node verification boundary
OAP object boundary
confirmed-ROC projection boundary
```

Added the integrated Phase 21 Operator acceptance checker and cross-repository runner.

The checkers verify:

* Operator Mode is disabled by default.
* Administrator credentials remain memory-only.
* CrabLink has no daemon process-management path.
* Local and remote connection modes remain distinct.
* Operator commands remain in the intended frontend module graph.
* Reward binding remains non-authoritative.
* Moderation cannot activate or mutate policy truth.
* Persistence approval cannot claim durable bytes.
* Confirmed ROC remains receipt-derived.
* Native Tauri commands are explicitly registered.
* Browser code cannot bypass the native administrative boundary.
* No wallet, ledger, payout, or finality authority leaked into the client.

Package scripts, Tauri checking scripts, and codebundle generation were updated to include the new source files and acceptance scanners.

---

## 15. Tauri-wide mouse interaction regression

Investigated and corrected the Tauri-wide mouse interaction defect observed before Phase 22.

Symptoms included:

* Intermittent clicks.
* Controls requiring keyboard Tab focus.
* Inputs not consistently accepting mouse interaction.
* Scrollbar mouse interaction failing.
* Roughly one click in several registering.

The issue was treated as a real hit-testing or event-capture defect rather than a cosmetic problem.

After correction and rebuild, normal clicking, controls, and scrolling were confirmed working before continuing into Phase 22.

---

## 16. Integration and runner repairs

Several failures were found in new acceptance infrastructure and corrected without weakening product boundaries.

Repairs included:

### Rust module-layout mismatch

The initial confirmed-ROC patch expected:

```rust
pub mod commands;
```

The current application uses:

```rust
mod commands;
```

The repair aligned the new module registration with the real `lib.rs` layout and completed the missing confirmed-ROC files.

### macOS temporary-file failure

The first cross-repository confirmed-ROC projection command used an incompatible `mktemp` filename template.

This produced an empty projection path and caused:

```text
confirmed ROC projection write failed
No such file or directory
```

The repair switched to a temporary directory plus a normal projection filename, preserving the actual reward, receipt, replay, and projection logic.

### Acceptance-script matching

Operator acceptance tooling was repaired to:

* Use valid Bash parameter expansion.
* Scan the active frontend module graph instead of unrelated or legacy files.
* Distinguish operator-owned modules from ambient application code.
* Detect real Tauri command invocations instead of incidental strings.
* Match the actual compile-tested Rust error wording.
* Avoid false failures from inactive scaffold or backup files.

These were test-runner and source-discovery corrections, not relaxations of security behavior.

---

## 17. Verification completed

The completed CrabLink verification included:

* Operator boundary scanners.
* Operator UI boundary scanner.
* Signed reward-binding scanner.
* Moderation-review scanner.
* Persistence-review scanner.
* Integrated Phase 21 Operator acceptance.
* Native Operator command tests.
* Live local Service Node attachment.
* Native confirmed-ROC parser tests.
* Cross-repository confirmed-ROC projection validation.
* OAP object-boundary scanner.
* Live OAP object retrieval.
* Full BLAKE3 object verification.
* Corrupt and truncated stream rejection.
* User Node verification-boundary scanner.
* User Node native unit tests.
* Live pending-evidence submission.
* Verification replay rejection.
* Lifecycle-isolation tests.
* Privacy-route-unavailable integration test.
* Frontend production builds.
* Strict Tauri Clippy with `--all-targets --no-deps -D warnings`.
* Tauri `cargo check`.
* Final Phase 22 acceptance.
* Final Phase 23 acceptance.
* Final Phase 24 private-beta readiness acceptance.

The final Phase 23 CrabLink checks specifically passed:

```text
phase23_privacy_relay_unavailable: 1 passed
user_node_verification native tests: 2 passed
User Node verification boundary scanner: passed
strict Tauri Clippy: passed
Tauri cargo check: passed
```

The Phase 24 final acceptance reran the CrabLink privacy and User Node boundaries and completed with:

```text
PHASE24_FINAL_STATUS=GREEN_PARKED
```

---

## 18. Authority boundaries preserved

CrabLink remains:

```text
display and user-intent layer
native privilege client
optional Service Node controller
User Node lifecycle manager
receipt-derived status presenter
```

CrabLink does not become:

```text
wallet mutation authority
ledger mutation authority
registry truth
reward-plan authority
quorum authority
moderation-policy authority
persistence truth
provider truth
receipt issuer
balance authority
confirmed-ROC authority
finality authority
public node daemon
bridge runtime
ROX/Solana runtime
staking or liquidity runtime
exchange-facing settlement
```

Pending evidence is not confirmed ROC.

A reward plan is not confirmed ROC.

A wallet request is not confirmed ROC.

Confirmed ROC requires a durable wallet/ledger receipt and accepted replay.

---

## 19. Final result

CrabLink now provides:

* A private, managed User Node experience for normal users.
* Native, bounded OAP retrieval and complete BLAKE3 verification.
* A real pending-evidence submission path.
* Fail-closed privacy routing with no direct-provider fallback.
* An optional Service Node Operator Mode.
* Headless-compatible Service Node status and controls.
* Signed external reward-recipient binding.
* Moderation and persistence review.
* Receipt-only confirmed-ROC presentation.
* Strict separation from wallet, ledger, quorum, registry, policy, and finality authority.
* Reproducible acceptance tooling across the final BUILD_PLAN_Z phases.

Final status:

```text
CrabLink / crablink-tauri
BUILD_PLAN_Z closing phases
COMPLETE / GREEN / PARKED
```


### END NOTE - JULY 15 2026 - 18:30 CST




### BEGIN NOTE - JULY 21 2026 - 13:25 CST

# IMPORTANT NOTE REGARDING IDENTITY, LOGIN, SESSION ETC - PASSPORTS:

Absolutely. Here are three drop-in note blocks so the rule is reflected at the **RustyOnions substrate level**, the **CrabLink product/client level**, and the **CrabLink TV implementation level**.

## 1. Main RustyOnions notes

````markdown
## Platform Identity Rule — Passport Is Wallet-Like, Not Cloud Login

CrabLink / RustyOnions Passport identity must be treated as a wallet-like account model, closer to a Solflare / Phantom style account than a cloud login.

This applies across the full platform surface:

- RustyOnions backend/substrate
- CrabLink desktop
- CrabLink Android TV
- CrabLink Android
- CrabLink iOS
- future CrabLink clients

Core rule:

```text
CrabLink Passport = wallet-like identity/account
````

A Passport must not become:

```text
cloud login
password account
server-owned identity
cloud-stored Passport secret
backend-custodied account
backend-issued identity pretending to be source of truth
```

The correct posture:

```text
local Passport creation/import/unlock
offline-storable identity material
client-owned secret custody
backend/gateway verifies proofs/capabilities/receipts/entitlements/policy
backend does not own or custody the Passport secret
```

RustyOnions services may verify Passport-derived proofs, enforce policy, validate capabilities, resolve receipts, verify entitlement, and serve public-facing content paths. They must not become a cloud identity custodian or store user Passport secrets.

Nodes and services remain public-facing infrastructure surfaces where appropriate. The system should not drift into private cloud-account login semantics.

````

## 2. CrabLink notes

```markdown
## CrabLink Passport Model — Wallet-Like Local Identity

CrabLink identity must be platform-wide and wallet-like.

The Passport model should be understood like a Solana wallet account used through wallets such as Solflare or Phantom:

```text
Passport is created/imported/unlocked locally
Passport secret can be stored offline
client owns Passport custody
backend verifies proofs and capabilities
backend does not custody Passport secrets
````

CrabLink must not introduce a conventional cloud login model:

```text
no cloud password account
no cloud-stored login secret
no backend-custodied Passport
no server-owned source-of-truth identity
no backend-issued account identity pretending to be the Passport
```

This applies to every CrabLink client:

```text
desktop
Android TV
Android
iOS
future clients
```

The backend/gateway role is verification and service access:

```text
verify Passport-derived proof
verify capability scope
verify receipt truth
verify entitlement
verify policy/sanctions/privacy path
serve public-facing content routes
reject invalid or unauthorized requests
```

The backend/gateway role is not identity custody.

Future wording should prefer:

```text
Passport Onboarding
Local Passport Unlock
Passport Import / Restore
Read-Only Capability Review
Device-local session posture
Optional cross-device delegation
```

Avoid wording that implies:

```text
cloud login
central account registration
server-owned account
pairing one Passport into another Passport
backend custody of Passport secret
```

Optional cross-device delegation may exist later, but it must be explicit, scoped, reviewable, revocable, and proof/capability based. It must not replace local Passport ownership.

````

## 3. CrabLink TV notes

```markdown
## CrabLink TV Identity Direction — Replace Pairing With Passport-First Onboarding

CrabLink TV should not drift into cloud login or cloud account pairing.

The original TV build plan contains Phase 11 / Phase 12 language around pairing, challenge/session behavior, and companion approval. Before those phases are implemented, that model should be revised into a Passport-first model. The current plan’s pairing/session language should be treated as provisional and subject to rewrite. 

New direction:

```text
TV Passport Onboarding
Local Passport Unlock
Passport Import / Restore
Read-Only Capability Review
Device-local session posture
Optional cross-device delegation
No cloud account login
No server-custodied Passport secret
````

CrabLink TV should treat a Passport like a wallet-style account:

```text
local Passport identity
client-side custody
offline-storable secret material
no cloud password account
no backend-stored login secret
no server-owned identity
```

The TV may create/import/unlock a local Passport, but it must not store raw Passport secrets in React state, browser storage, URLs, QR codes, logs, or diagnostics.

Backend/gateway may verify:

```text
Passport proof
capability scope
receipt truth
entitlement truth
policy state
content access rules
```

Backend/gateway must not:

```text
own the Passport
custody the Passport secret
issue a fake source-of-truth identity
turn TV access into cloud login
```

Cross-device behavior, if added later, should be framed as optional delegation or review, not as “pairing” one Passport into another Passport.

Implementation impact:

```text
Phase 11 should become Passport onboarding/local unlock state machine.
Phase 12 should become Passport-backed capability/proof/session integration.
Pairing terminology should be replaced or narrowed.
No cloud login route should be added.
No server-side Passport custody should be introduced.
No backend-issued identity should pretend to be the Passport.
```

This does not block current Phase 9 work. It should be handled before starting the current plan’s Phase 11/12 identity/session phases. The TV build plan currently defines pairing/session phases, so those sections need a future rewrite before implementation.

````

The key phrase I would keep consistent everywhere is:

```text
CrabLink Passport is wallet-like identity, not cloud login.
````

### END NOTE - JULY 21 2026 - 13:25 CST


### BEGIN NOTE - JULY 24 2026 - 16:35 CST

Here are the **CrabLink Tauri changelog notes** for this session, ready to paste into the CrabLink crate/project notes.

# CrabLink Tauri Changelog — Native Passport Phase 15F–15S Session

## Session scope

This session continued the Passport Native Buildplan from Phase 15E and completed the CrabLink desktop integration work through Phase 15S.

Although the overall session began with the `svc-passport` Phase 15E inspection, the first CrabLink source changes began in Phase 15F.

CrabLink implementation range completed during this session:

```text
Phase 15F — Real passport_status Tauri command and native-consumer dependency posture
Phase 15J — Desktop atomic encrypted-vault store
Phase 15K — Windows replacement semantics and app-data VaultStore wiring
Phase 15L — macOS Keychain PlatformSealer
Phase 15M — Windows DPAPI PlatformSealer
Phase 15N — Linux Secret Service PlatformSealer
Phase 15O — Runtime platform selection and AppState ownership
Phase 15P — Truthful stored-vault status wiring
Phase 15R — Platform-factor generation and encrypted-vault creation orchestration
Phase 15S — Operational-factor unseal and native-only unlocked session runtime
```

CrabLink remained the desktop platform/runtime adapter.

It did not become the canonical owner of Passport identity, vault crypto, proof rules, or shared state machines. Those remain in `svc-passport`.

---

# Files added or changed

## Cargo and runtime registration

```text
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/Cargo.lock
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/state.rs
```

## Passport commands

```text
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/commands/passport.rs
```

## Passport runtime and storage modules

```text
apps/crablink-tauri/src-tauri/src/passport_vault_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_vault_store.rs
apps/crablink-tauri/src-tauri/src/passport_platform_sealer.rs
apps/crablink-tauri/src-tauri/src/passport_platform_sealer_windows.rs
apps/crablink-tauri/src-tauri/src/passport_platform_sealer_linux.rs
apps/crablink-tauri/src-tauri/src/passport_platform_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_status_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_vault_create_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_operational_unlock_runtime.rs
```

## Focused tests added

```text
apps/crablink-tauri/src-tauri/tests/phase15j_desktop_atomic_vault_store.rs
apps/crablink-tauri/src-tauri/tests/phase15k_windows_atomic_replace_and_app_data_store_wiring.rs
apps/crablink-tauri/src-tauri/tests/phase15l_macos_keychain_platform_sealer.rs
apps/crablink-tauri/src-tauri/tests/phase15m_windows_dpapi_platform_sealer.rs
apps/crablink-tauri/src-tauri/tests/phase15n_linux_secret_service_platform_sealer.rs
apps/crablink-tauri/src-tauri/tests/phase15o_platform_sealer_runtime_selection_and_app_state_wiring.rs
apps/crablink-tauri/src-tauri/tests/phase15p_real_stored_status_app_state_wiring.rs
apps/crablink-tauri/src-tauri/tests/phase15r_platform_factor_and_vault_create_orchestration.rs
apps/crablink-tauri/src-tauri/tests/phase15s_operational_unseal_and_locked_vault_unlock_runtime.rs
```

---

# Phase 15F — Real `passport_status` Tauri wiring

## Purpose

Connected the previously defined Native Passport status contract to the real CrabLink Tauri command surface.

This was the first live Native Passport command added to the desktop application.

## Command added

```text
passport_status
```

The command was registered through the real Tauri invoke handler.

It reused the `svc-passport` status contract and client-safe DTO projection rather than inventing a CrabLink-specific status model.

## DTO behavior

Added bounded serializable command result and problem DTOs suitable for the WebView boundary.

The command returns safe information such as:

```text
Passport presence state
lock state
safe development identity label where applicable
redacted status problem
```

It does not return:

```text
recovery phrase
root private key
device private key
PIN
vault key
platform factor
encrypted vault bytes
raw proof
raw capability
```

## Initial status posture

Before real VaultStore wiring existed, the command reported a truthful no-Passport posture rather than claiming an unlocked or active Passport.

## Native-consumer dependency posture

The CrabLink dependency on `svc-passport` remained:

```toml
svc-passport = {
    path = "../../../../RustyOnions/crates/svc-passport",
    default-features = false,
    features = ["native-passport"]
}
```

This ensures CrabLink receives the Native Passport contracts without enabling the server-side development KMS.

CrabLink did not gain `DevKms` or service-signing authority.

## Phase 15F Clippy issue and repair

The first strict Clippy run detected dead code because the newly added command/DTO helpers were not yet reachable from the actual Tauri invoke registry.

The repair registered the real command instead of suppressing the warnings with a broad dead-code allowance.

The final command path was compile-tested and remained redacted.

---

# Phase 15J — Desktop atomic encrypted-vault store

## Added module

```text
src/passport_vault_store.rs
```

This module implements the concrete desktop `NativeVaultStore` contract defined in `svc-passport`.

## Primary type

```text
DesktopAtomicVaultStore
```

## Storage behavior

The store persists only `NativeEncryptedVaultV1`.

It does not parse or own the plaintext Passport identity.

The implementation provides:

```text
load encrypted vault
atomically write encrypted vault
recover interrupted write
remove encrypted vault
```

## Atomic write posture

The write path uses a temporary encrypted file and replacement flow rather than writing directly over the active vault.

The sequence includes:

```text
validate encrypted-vault bounds
create or prepare the vault directory
write temporary encrypted bytes
flush the temporary file
sync as required
replace the active vault
clean up temporary state
```

## Interrupted-write recovery

Startup recovery distinguishes between:

```text
no recovery required
temporary file cleanup
temporary file promotion where appropriate
invalid interrupted state
```

The recovery logic does not expose or decrypt vault contents.

## Security boundaries

The store does not:

```text
write plaintext Passport material
log encrypted-vault bytes
parse recovery phrases
parse keys
unseal platform material
perform PIN derivation
perform encryption or decryption
return filesystem paths to React
```

---

# Phase 15K — Windows replacement semantics and app-data VaultStore wiring

## Purpose

Completed the desktop integration needed to use `DesktopAtomicVaultStore` from the running application.

## Windows replacement behavior

Windows filesystem replacement semantics differ from Unix rename behavior when the destination already exists.

The VaultStore received a Windows-specific replacement path so atomic encrypted-vault updates do not rely on Unix-only assumptions.

## App-data location

The Native Passport vault is initialized beneath the Tauri application data directory.

Startup obtains the path using the Tauri application path API rather than using:

```text
current working directory
source repository directory
user-selected arbitrary path
WebView-provided path
```

## Runtime initialization

Added or updated:

```text
passport_vault_runtime.rs
lib.rs
state.rs
```

Startup now:

```text
resolves the app-data directory
constructs DesktopAtomicVaultStore
runs interrupted-write recovery
places the store in AppState
```

## AppState ownership

`AppState` began owning the single initialized VaultStore instance.

Commands reuse that managed runtime object rather than constructing new stores per invocation.

## Initial patch repair

The first Phase 15K mutation encountered an anchor mismatch because the current `lib.rs` and `state.rs` layout differed from the assumed structure.

The repair used the actual current source anchors and then passed the focused Phase 15J/15K checks.

---

# Phase 15L — macOS Keychain PlatformSealer

## Added module

```text
src/passport_platform_sealer.rs
```

This file is the macOS PlatformSealer implementation.

## Cargo dependency

Added the exact macOS dependency:

```toml
[target.'cfg(target_os = "macos")'.dependencies]
security-framework = "=3.7.0"
```

## Primary type

```text
MacosKeychainPlatformSealer
```

## Keychain design

The adapter uses:

```text
one fixed CrabLink Native Passport service namespace
one account/reference for RecoveryRoot
one account/reference for DeviceKey
```

The two compartments remain independent.

The Keychain stores the factor material.

The encrypted vault stores only the bounded opaque Keychain reference.

## Supported operations

```text
seal recovery-root factor
seal operational/device factor
read and unseal recovery-root factor
read and unseal operational/device factor
create missing Keychain item
update existing Keychain item
```

## Validation

The adapter rejects:

```text
wrong platform family
wrong security compartment
unexpected Keychain reference
missing Keychain material
invalid bounded secret material
```

## Error posture

Security Framework error details are mapped into redacted `NativePlatformStorageError` values.

The adapter does not include secret material or raw backend details in:

```text
Debug
Display-like problem projections
Tauri output
logs
```

## Test backend

Focused tests use an in-memory backend abstraction to exercise create, update, reference validation, and unseal behavior without mutating the real user Keychain.

---

# Phase 15M — Windows DPAPI PlatformSealer

## Added module

```text
src/passport_platform_sealer_windows.rs
```

## Cargo dependency

Added Windows API features through:

```toml
[target.'cfg(windows)'.dependencies]
windows-sys = {
    version = "0.61",
    features = [
        "Win32_Foundation",
        "Win32_Storage_FileSystem",
        "Win32_Security_Cryptography"
    ]
}
```

## Primary type

```text
WindowsDpapiPlatformSealer
```

## DPAPI design

The adapter uses Windows DPAPI to protect and unprotect platform-factor material.

Unlike Keychain and Secret Service, DPAPI returns protected bytes rather than an external item reference.

The resulting sealed bytes can therefore be stored inside the platform-bound vault envelope.

## Compartment binding

The DPAPI implementation binds each sealed value to:

```text
WindowsDpapi platform family
RecoveryRoot or DeviceKey compartment
expected DPAPI payload posture
```

The adapter rejects attempts to unseal the material under the wrong compartment or platform family.

## Security behavior

The adapter does not expose:

```text
raw Windows user key material
reusable DPAPI master key
plaintext factor outside NativeSecretBytes
backend errors containing protected or plaintext bytes
```

The Windows adapter is conditionally compiled and does not become active on macOS or Linux.

---

# Phase 15N — Linux Secret Service PlatformSealer

## Added module

```text
src/passport_platform_sealer_linux.rs
```

## Cargo dependency

Added the Linux Secret Service dependency:

```toml
[target.'cfg(target_os = "linux")'.dependencies]
secret-service = {
    version = "=5.1.0",
    default-features = false,
    features = ["rt-tokio-crypto-rust"]
}
```

The same dependency is available to the focused test configuration where required.

## Primary type

```text
LinuxSecretServicePlatformSealer
```

## Secret Service design

The adapter uses the Linux desktop Secret Service API, serving the same architectural role that Keychain serves on macOS.

It maintains separate secure-storage entries for:

```text
RecoveryRoot
DeviceKey / operational factor
```

The encrypted vault stores only bounded opaque references.

## Behavior

The adapter provides:

```text
create secure-storage item
update secure-storage item
read secure-storage item
validate platform family
validate compartment
validate opaque reference
map backend failure to a redacted error
```

## Security boundaries

There is no plaintext filesystem fallback when Secret Service is unavailable.

Failure remains failure rather than silently weakening storage.

The adapter does not expose a reusable system/device secret to CrabLink or React.

---

# Phase 15O — Runtime platform selection and `AppState` ownership

## Added module

```text
src/passport_platform_runtime.rs
```

## Shared runtime type

```text
SharedNativePlatformSealer =
    Arc<dyn NativePlatformSealer>
```

## Runtime factory

Added:

```text
new_desktop_platform_sealer
selected_desktop_platform_family
```

The factory selects exactly one adapter at compile time:

```text
macOS   → MacosKeychainPlatformSealer
Windows → WindowsDpapiPlatformSealer
Linux   → LinuxSecretServicePlatformSealer
```

Unsupported or unknown platform posture is not treated as a successful secure-storage implementation.

## Startup behavior

Tauri startup now:

```text
initializes the app-data VaultStore
performs interrupted-write recovery
constructs the selected desktop PlatformSealer
passes both runtime objects into AppState
manages AppState once
```

## AppState after Phase 15O

`AppState` owns:

```text
passport_vault_store: DesktopAtomicVaultStore
passport_platform_sealer: SharedNativePlatformSealer
```

## Startup security boundary

Constructing the runtime objects does not:

```text
seal a factor
unseal a factor
load or decrypt a vault
derive a PIN key
unlock a Passport
touch recovery-root material
```

Startup establishes capability, not authority.

---

# Phase 15P — Truthful stored-vault status

## Added module

```text
src/passport_status_runtime.rs
```

## Stored status model

Added:

```text
StoredPassportStatus::NoPassport
StoredPassportStatus::Locked
```

## Status inspection

Added:

```text
inspect_stored_passport_status
```

The function uses the managed `NativeVaultStore`.

Behavior:

```text
no stored encrypted vault
  → NoPassport

valid bounded encrypted vault exists
  → Locked

load or validation failure
  → redacted unavailable error
```

## `passport_status` command update

The live Tauri command stopped returning a hardcoded no-Passport posture and began reading the real managed VaultStore.

The command reads:

```text
state.passport_vault_store
```

It deliberately does not read or call:

```text
state.passport_platform_sealer
seal
unseal
decrypt
unlock
storage write
capability material
wallet or ledger
```

## Truthfulness achieved

After Phase 15P:

```text
fresh installation:
  NoPassport

stored encrypted Native Passport vault:
  Locked
```

`OperationalUnlocked` was not yet possible because no unlocked-session runtime existed until Phase 15S.

---

# Phase 15R — Platform-factor generation and vault-create orchestration

## Cargo dependency

Added direct secure-randomness access:

```toml
getrandom = "0.3"
```

## Added module

```text
src/passport_vault_create_runtime.rs
```

## Purpose

Connected the shared `svc-passport` vault cryptography and platform-bound envelope to the real desktop PlatformSealer and VaultStore.

This phase creates the encrypted cryptographic vault container.

It does not yet create the complete Passport root/device identity payload.

## Randomness abstraction

Added:

```text
NativeVaultRandomSource
OsNativeVaultRandomSource
```

Production uses:

```text
getrandom::fill
```

Focused tests inject a deterministic source.

## Vault creation sequence

The runtime performs:

1. Load the VaultStore and reject an existing vault.
2. Validate PIN length before randomness or platform mutation.
3. Generate an independent recovery-root platform factor.
4. Generate an independent operational platform factor.
5. Generate an independent recovery-root VMK.
6. Generate an independent operational VMK.
7. Generate independent recovery-root and operational salts.
8. Generate independent recovery-root and operational XChaCha nonces.
9. Wrap the recovery-root VMK through `svc-passport`.
10. Wrap the operational VMK through `svc-passport`.
11. Seal the root factor through the selected PlatformSealer.
12. Seal the operational factor through the selected PlatformSealer.
13. Construct `NativePlatformBoundVaultV1`.
14. Encode the platform-bound encrypted vault.
15. Write it atomically through `NativeVaultStore`.
16. Return a non-secret `CreatedLocked` result.

## Existing-vault protection

Creation refuses to overwrite an existing encrypted vault.

The rejection occurs before:

```text
randomness generation
PlatformSealer mutation
VaultStore write
```

## PIN validation

Invalid PIN length is rejected before:

```text
randomness
factor generation
VMK generation
platform sealing
vault writing
```

## Randomness-failure posture

If secure OS randomness fails:

```text
no platform factor is sealed
no encrypted vault is written
temporary secret buffers are cleared or dropped
the result is a generic randomness failure
```

## Platform-sealing partial-failure posture

The PlatformSealer interface does not currently expose transactional rollback.

If creation fails after one secure-storage compartment has been written, the encrypted vault remains absent and therefore no Passport is considered created.

A retry overwrites/replaces the fixed secure-storage entries before creating the authoritative encrypted vault.

Secure-storage material without the encrypted vault is non-authoritative.

## Created state

Successful creation returns:

```text
CreatedLocked
```

It does not create an automatically unlocked session.

## Important limitation

The current Phase 15R runtime creates:

```text
platform factors
VMKs
wrapped VMKs
sealed-factor material/references
platform-bound encrypted vault envelope
```

It does not yet create:

```text
recovery phrase
root signing key
Passport ID
device signing key
Device ID
root-signed device authorization
encrypted root identity payload
encrypted operational identity payload
backup acknowledgement
```

Therefore, it must not be described as a complete user-facing `passport_create_native` implementation.

## Focused tests

The six Phase 15R CrabLink tests proved:

```text
create-only and secret-safe posture
two independent factors are sealed
one platform-bound vault is persisted
stored status becomes Locked
operational factor can later be unsealed
operational VMK can be recovered
existing vault rejects before side effects
invalid PIN rejects before side effects
randomness failure rejects before side effects
no public create command exists
no root unlock exists
no frontend secret-return surface exists
```

---

# Phase 15S — Operational unseal and locked-vault unlock runtime

## Added module

```text
src/passport_operational_unlock_runtime.rs
```

## Added AppState runtime owner

`AppState` now also owns:

```text
passport_operational_session:
    DesktopOperationalVaultSessionStore
```

## AppState after Phase 15S

The Native Passport-related runtime objects are:

```text
DesktopAtomicVaultStore
SharedNativePlatformSealer
DesktopOperationalVaultSessionStore
```

## Session states

Added:

```text
Locked
Unlocking
OperationalUnlocked
```

## Session storage

The session store retains the unlocked operational VMK in:

```text
NativeSecretBytes
```

This provides:

```text
zeroization on drop
redacted Debug
native-only ownership
no serialization
```

## Operational unlock sequence

The runtime:

1. Validates PIN bounds.
2. Rejects an unlock already in progress.
3. Rejects a second unlock when already operationally unlocked.
4. Moves the in-memory session state to `Unlocking`.
5. Loads the stored encrypted vault.
6. Decodes `NativePlatformBoundVaultV1`.
7. Reads the bound platform family.
8. Selects only the operational sealed factor.
9. Calls `unseal_native_secret` for `NativeSecureCompartment::DeviceKey`.
10. Calls `unlock_native_operational_vmk`.
11. Installs the zeroizing operational VMK into native session custody.
12. Changes the state to `OperationalUnlocked`.

## Root separation

The runtime does not:

```text
call recovery_root_factor
request RecoveryRoot from the PlatformSealer
unseal the root factor
unlock the root VMK
create a root session
```

Ordinary operational unlock remains separate from root authority.

## Failure behavior

### Invalid PIN length

Rejected before:

```text
VaultStore load
platform unseal
session mutation beyond validation
storage write
```

### No stored vault

Returns a bounded no-vault error and restores:

```text
Locked
```

### Wrong PIN

Returns:

```text
UnlockRejected
```

The error does not distinguish whether the PIN, factor, ciphertext, or authentication tag caused failure.

### Wrong platform factor

Returns the same generic:

```text
UnlockRejected
```

### Missing secure-storage material

Returns the same generic:

```text
UnlockRejected
```

### Failed unlock

The session returns to:

```text
Locked
```

No operational VMK remains installed.

### Duplicate unlock

When already operationally unlocked, the runtime rejects a second unlock without repeating the platform unseal.

### Concurrent unlock

The intermediate `Unlocking` state prevents two unlock attempts from installing competing sessions.

## Explicit lock behavior

Added:

```text
DesktopOperationalVaultSessionStore::lock
```

Locking:

```text
replaces the session with Locked
drops the NativeSecretBytes operational VMK
does not modify the encrypted vault
does not delete platform secure-storage material
does not access recovery-root material
```

## Current command boundary

Phase 15S remains an internal Rust runtime.

It does not add:

```text
passport_unlock_operational Tauri command
passport_lock Tauri command
PIN DTO
PIN serialization
VMK DTO
secret WebView output
```

The next phase must connect this runtime to commands without passing a plaintext PIN through React/Tauri serialization.

## Focused tests

The six Phase 15S tests proved:

```text
operational-only security posture
successful operational unlock
only DeviceKey factor is unsealed
operational VMK is retained in native-only session custody
duplicate unlock is rejected
explicit lock drops the session VMK
wrong PIN fails closed
wrong platform factor fails closed
missing platform material fails closed
invalid PIN rejects before side effects
absent vault rejects safely
AppState owns the session store
no Tauri command or secret DTO was added
no root material is accessed
```

Final verification included:

```text
Tauri format check
Phase 15S tests: 6 passed
Tauri consumer cargo check
source and authority boundary
```

---

# `lib.rs` integration changes

During the session, `lib.rs` was updated to register the new desktop Passport modules under desktop conditional compilation.

Registered modules include:

```text
passport_vault_runtime
passport_vault_store
passport_platform_sealer
passport_platform_sealer_windows
passport_platform_sealer_linux
passport_platform_runtime
passport_status_runtime
passport_vault_create_runtime
passport_operational_unlock_runtime
```

Startup setup was updated to:

```text
resolve the app-data directory
initialize the VaultStore
recover interrupted vault writes
construct the selected PlatformSealer
construct AppState with native Passport runtime ownership
manage the completed AppState
```

The real `passport_status` command was included in the Tauri invoke registry.

No secret-producing command was registered.

---

# `state.rs` integration changes

`AppState` now owns the persistent and in-memory Native Passport runtime surfaces.

Current fields include:

```text
passport_vault_store:
    DesktopAtomicVaultStore

passport_platform_sealer:
    SharedNativePlatformSealer

passport_operational_session:
    DesktopOperationalVaultSessionStore
```

The native Passport constructor initializes:

```text
the supplied VaultStore
the supplied PlatformSealer
a fresh Locked operational session
```

The session is not restored as unlocked across application restarts.

Restart therefore returns to the locked posture even when an encrypted vault exists.

---

# Cargo changes

Dependencies added or adjusted during the session include:

```toml
getrandom = "0.3"
```

macOS:

```toml
security-framework = "=3.7.0"
```

Windows:

```toml
windows-sys = {
    version = "0.61",
    features = [
        "Win32_Foundation",
        "Win32_Storage_FileSystem",
        "Win32_Security_Cryptography"
    ]
}
```

Linux:

```toml
secret-service = {
    version = "=5.1.0",
    default-features = false,
    features = ["rt-tokio-crypto-rust"]
}
```

The `svc-passport` dependency remained Native Passport-only with default features disabled.

CrabLink did not directly enable `dev-kms`.

---

# Final runtime architecture

## On application startup

CrabLink now:

```text
resolves its app-data directory
initializes the atomic encrypted-vault store
recovers interrupted vault writes
constructs exactly one supported PlatformSealer
initializes the operational session as Locked
stores all three objects in AppState
```

Startup does not:

```text
prompt for PIN
unseal platform material
unlock the operational VMK
unlock the root VMK
issue a capability
sign a proof
mutate a wallet or ledger
```

## While no encrypted vault exists

```text
passport_status → NoPassport
operational session → Locked
```

## After successful Phase 15R vault creation

```text
encrypted platform-bound vault exists
passport_status → Locked
operational session → Locked
```

## After successful Phase 15S internal unlock

```text
operational factor unsealed
operational VMK recovered
operational VMK held only in native memory
operational session → OperationalUnlocked
root factor remains sealed
root VMK remains unavailable
```

## After explicit internal lock

```text
operational VMK dropped
operational session → Locked
encrypted vault remains unchanged
platform secure-storage entries remain unchanged
```

---

# Secret-custody boundary

Throughout the session, CrabLink preserved the following rule:

```text
React and TypeScript never own Native Passport secrets.
```

React does not receive:

```text
PIN
recovery phrase
root private key
device private key
platform factor
VMK
decrypted vault payload
raw long-lived capability
```

CrabLink Tauri does not serialize those values through command DTOs.

No secret is stored in:

```text
localStorage
sessionStorage
indexedDB
URL parameters
deep links
React state
TypeScript module state
```

---

# Authority boundaries preserved

CrabLink did not become a second Passport authority.

It calls into `svc-passport` for:

```text
shared platform-storage contracts
platform-bound envelope validation
PIN and factor KDF
VMK wrapping
operational VMK unlock
safe client status projection
```

CrabLink owns only:

```text
desktop OS secure-storage calls
desktop filesystem persistence
runtime object construction
AppState custody
Tauri command integration
future native secure-input UI
```

CrabLink did not add:

```text
duplicate Passport ID rules
duplicate device state machines
duplicate username acceptance rules
duplicate proof validation
duplicate capability issuance rules
duplicate ron-kms key lifecycle
wallet or ledger authority
```

---

# Repairs and implementation issues encountered

## Phase 15F dead-code/registration issue

The first strict Clippy run detected the status command as unreachable.

The correct repair was real invoke-handler registration, not an allowance.

## Phase 15K source-anchor mismatch

The initial app-data/AppState mutation assumed outdated source anchors.

The patch was repaired against the actual `lib.rs` and `state.rs` layout.

## Phase 15R platform-family compile failure

The initial `svc-passport` platform encoder handled only macOS, Windows, and Linux.

Because CrabLink consumes that shared enum, the Tauri build also failed until the shared V3 repair added iOS/Android codes and rejected `UnknownLocal`.

No separate CrabLink source repair was required for the platform-family codec.

## Verification-script arithmetic defect

One intermediate verification block used invalid multiline shell arithmetic, causing the failure counter to become empty and later checks to continue.

Correct form:

```bash
failure_count=$((failure_count + 1))
```

Do not reuse the broken multiline form.

## Overly broad verification

An earlier Phase 15Q closeout ran too many old regressions and took approximately 15–20 minutes.

The workflow was changed to focused verification for normal implementation slices.

---

# Final green results

## Phase 15R

```text
CrabLink vault-create tests: 6 passed
platform-bound vault creation orchestration: green
secure OS randomness: green
sealed root factor: green
sealed operational factor: green
atomic encrypted-vault write: green
created state: Locked
```

## Phase 15S

```text
CrabLink operational-unlock tests: 6 passed
Tauri consumer cargo check: green
source boundary: green
operational factor unseal: green
operational VMK unlock: green
native-only session custody: green
explicit lock drops VMK: green
wrong PIN rejection: green
wrong factor rejection: green
missing platform material rejection: green
```

Final session marker:

```text
NATIVE_PASSPORT_PHASE15S_OPERATIONAL_UNSEAL_AND_LOCKED_VAULT_UNLOCK_RUNTIME=GREEN
```

---

# Safe claims after this session

Correct:

```text
CrabLink has a real desktop encrypted-vault store.
CrabLink uses app-data storage.
CrabLink has macOS, Windows, and Linux PlatformSealer adapters.
CrabLink selects one platform adapter at runtime/compile target.
AppState owns the VaultStore and PlatformSealer.
passport_status truthfully reports NoPassport or Locked.
CrabLink can internally create a platform-bound encrypted vault.
CrabLink can internally unlock only the operational VMK.
The operational VMK remains in native-only zeroizing session custody.
Explicit native lock drops the operational VMK.
Ordinary unlock does not unseal root material.
```

Incorrect:

```text
The full Passport UI is complete.
passport_create_native is complete.
A full root/device Passport identity is created.
Recovery phrase backup exists.
Restore/import exists.
A public operational-unlock command exists.
React can safely submit a PIN.
Root unlock exists.
Device authorization/revocation is wired.
Proof/capability/username flows are complete.
Phase 15 is complete.
```

---

# Immediate next CrabLink work

Exact next patch:

```text
NATIVE_PASSPORT_PHASE15T_OPERATIONAL_UNLOCK_COMMAND_LOCK_AND_STATUS_BRIDGE
```

## Phase 15T goals

Add safe command/status integration for:

```text
passport_lock
passport_status → OperationalUnlocked projection
passport_unlock_operational trigger
```

## Critical PIN boundary

Do not implement:

```rust
#[tauri::command]
fn passport_unlock_operational(pin: String, ...)
```

A plaintext PIN must not cross:

```text
React
TypeScript
Tauri command serialization
WebView IPC
```

The command must trigger a native secure-input surface that collects the PIN directly in native code.

Tests should inject a fake secure-input provider.

Production must receive `NativeSecretBytes` from the native secure-input implementation.

## Safe command outputs

The command bridge may return only redacted states such as:

```text
NoPassport
Locked
OperationalUnlocked
AlreadyUnlocked
UnlockRejected
Cancelled
Unavailable
```

It must never return:

```text
PIN
VMK
platform factor
sealed factor
vault bytes
root key
device key
```

## `passport_lock`

The public lock command should:

```text
call DesktopOperationalVaultSessionStore::lock
drop the operational VMK
return a redacted result
leave the encrypted vault unchanged
leave platform secure-storage material unchanged
```

## Updated status projection

`passport_status` should combine:

```text
persistent VaultStore presence
in-memory operational-session state
```

Expected safe state truth:

```text
no vault → NoPassport
vault + locked session → Locked
vault + operational session → OperationalUnlocked
```

It must not expose or claim `RootUnlocked` before a real root session exists.

---

# Later CrabLink work required for Phase 15 completion

After Phase 15T, CrabLink still requires:

```text
native secure PIN entry
native PIN confirmation
native recovery phrase display/import
native root confirmation
full Passport creation UI and command
backup acknowledgement
restore/import
explicit root unlock session
clear/reset
device list/authorize/revoke commands
proof command transport
capability status/refresh/revoke
username status/claim/transfer/release
real Passport label replacement
redacted React adapters
desktop lifecycle UI
restart and end-to-end acceptance
```

The full Phase 15 exit gate remains unmet until those surfaces are implemented and verified.

---

# Final session status

```text
CRABLINK_SESSION_START=PHASE15F
CRABLINK_SESSION_END=PHASE15S
DESKTOP_ATOMIC_VAULT_STORE=GREEN
MACOS_KEYCHAIN_SEALER=GREEN
WINDOWS_DPAPI_SEALER=GREEN
LINUX_SECRET_SERVICE_SEALER=GREEN
PLATFORM_RUNTIME_SELECTION=GREEN
APP_STATE_VAULT_STORE_OWNER=GREEN
APP_STATE_PLATFORM_SEALER_OWNER=GREEN
APP_STATE_OPERATIONAL_SESSION_OWNER=GREEN
REAL_STORED_STATUS=GREEN
PLATFORM_BOUND_VAULT_CREATE_RUNTIME=GREEN
OPERATIONAL_UNLOCK_RUNTIME=GREEN
NATIVE_ONLY_OPERATIONAL_VMK_CUSTODY=GREEN
PUBLIC_OPERATIONAL_UNLOCK_COMMAND=NOT_ADDED
PUBLIC_LOCK_COMMAND=NOT_ADDED
NATIVE_SECURE_PIN_SURFACE=NOT_ADDED
ROOT_UNLOCK=NOT_ADDED
FULL_PASSPORT_IDENTITY_CREATION=NOT_ADDED
REACT_SECRET_CUSTODY=ABSENT
WALLET_OR_LEDGER_MUTATION=ABSENT
NEXT_PATCH=PHASE15T
```


### END NOTE - JULY 24 2026 - 16:35 CST




### BEGIN NOTE - JULY 25 2026 - 23:30 CST


Below are comprehensive carry-over notes you can paste into **CrabLink** and **RustyOnions** notes/changelog. They document the CrabLink-only work, the Phase 15 desktop Passport closeout, the live-app findings, and why the next session must start with `ONBOARDING_BUILDPLAN.md` before moving to Passport Native Phase 16. The current codebundle confirms the active repo/app surface is CrabLink desktop/Tauri plus TV sources, with the new Phase 15 Passport drawer/adapter/boundary files present in `apps/crablink-tauri`. 

````markdown
# CrabLink / RustyOnions Carry-Over + Changelog Notes
## Session: Native Passport Desktop Closeout → Onboarding Buildplan Start
## Scope changed this session: CrabLink only

## High-level session summary

This session closed the CrabLink desktop side of the Native Passport Phase 15 work and exposed the next real product problem: the Passport/native command bridge now compiles and tests green, but CrabLink still boots with development-era identity assumptions and leftover local/dev artifacts. The app can now run as a desktop Tauri app and show the Native Passport drawer, but the next necessary lane is not Android TV yet. We need a clean first-run onboarding flow before attempting Phase 16 of the Passport Native Buildplan.

The new build lane is now named:

`ONBOARDING_BUILDPLAN.md`

This onboarding buildplan must be worked before continuing into Passport Native Phase 16 because Phase 16 is about CrabLink TV Passport integration, and we need to prove the desktop user onboarding lifecycle first. Desktop is where we can validate the new wallet-like Passport flow, remove baked dev identities, prove clean first-run state, prove user-chosen username entry, prove local Passport creation, prove recovery/PIN/profile flow, and make sure the existing Passport work actually behaves like a real user flow rather than a developer test panel.

Only the CrabLink repo/app surface changed this session. RustyOnions crates such as `svc-passport` were compiled as dependencies during verification, but were not edited in this session.

---

## What changed in CrabLink

Primary changed surface:

`apps/crablink-tauri`

This includes the desktop Tauri React app, the Tauri platform boundary, the Native Passport adapter, the Passport drawer, and the Phase 15 source/regression tests.

Files changed or added during the session include:

- `apps/crablink-tauri/src/adapters/passportAdapter.js`
- `apps/crablink-tauri/src/adapters/passportAdapter.test.mjs`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.jsx`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.source.test.mjs`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.statusAcceptance.source.test.mjs`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.commandAcceptance.source.test.mjs`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.manualAcceptance.source.test.mjs`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.phase15FinalAcceptance.source.test.mjs`
- `apps/crablink-tauri/src/platform/tauriPlatform.js`
- `apps/crablink-tauri/src/platform/tauriPlatform.passportBoundary.source.test.mjs`
- `ONBOARDING_BUILDPLAN.md`

The Phase 15 work gave the desktop app a real, test-covered Native Passport drawer path. The drawer now uses a safe adapter rather than raw Tauri invocation. The adapter maps only fixed Native Passport commands. The React drawer has no PIN argument path, no seed phrase path, no root export path, no wallet or ledger mutation path, and no capability/username mutation path.

The new root buildplan file `ONBOARDING_BUILDPLAN.md` was created to define the next product lane.

---

## Native Passport Phase 15 desktop status

Phase 15 desktop final acceptance is green.

The final Phase 15 acceptance output confirmed:

- `NATIVE_PASSPORT_PHASE15_FINAL_ACCEPTANCE=GREEN`
- `PHASE15AG_FINAL_ACCEPTANCE=GREEN`
- `RUST_COMMAND_BRIDGE_FINAL_ACCEPTANCE=GREEN`
- `PASSPORT_ADAPTER_FINAL_ACCEPTANCE=GREEN`
- `PASSPORT_DRAWER_FINAL_ACCEPTANCE=GREEN`
- `PASSPORT_DTO_SAFETY_FINAL_ACCEPTANCE=GREEN`
- `PASSPORT_PHASE15_RUNTIME_COMMANDS=FIXED`
- `PASSPORT_PHASE15_DRAWER_STATUS_TRUTH=GREEN`
- `PASSPORT_PHASE15_MANUAL_ACCEPTANCE=GREEN`
- `PASSPORT_PHASE15_REACT_BUILD=GREEN`
- `PASSPORT_PHASE15_TAURI_CONSUMER_CHECK=GREEN`
- `PASSPORT_PHASE15_PIN_ARGUMENTS=NO`
- `PASSPORT_PHASE15_SECRET_CUSTODY=NO`
- `PASSPORT_PHASE15_ROOT_EXPORT=NO`
- `CAPABILITY_ISSUANCE=NOT_ADDED`
- `USERNAME_MUTATION=NOT_ADDED`
- `WALLET_OR_LEDGER_MUTATION=NO`

This means the desktop Native Passport bridge is now accepted at the source/test/build level.

The Rust command bridge, Tauri handler registration, JS adapter command map, Passport drawer command buttons, status truth rows, manual acceptance checklist, and redacted DTO posture are all covered by tests.

The final acceptance lane also ran relevant regressions:

- Phase 15AB Passport adapter regression
- Phase 15AC drawer native command regression
- Phase 15AD native status acceptance regression
- Phase 15AE native command acceptance regression
- Phase 15AF manual acceptance regression
- Phase 15AA clear command bridge regression
- Phase 15Z root confirmation regression
- Phase 15Y create/status command regression
- Phase 15T Passport command unit regression
- React production build
- Tauri consumer `cargo check`

---

## Phase 15AD completed: Native status truth rows

Phase 15AD added explicit Native Passport status truth rows to the Passport drawer.

What it added:

- visible Native Passport status truth section
- redacted/absent Passport identifier display
- redacted/absent device identifier display
- redacted/absent username handle display
- redacted/absent capability material display
- unsafe status flag row
- native runtime readiness row
- command DTO schema row
- command safety rows

Security posture:

- display-only
- no raw invoke
- no callTauri in the drawer
- no React PIN argument
- no secret custody
- no root material exposure
- no wallet/ledger mutation
- no username mutation
- no capability issuance

A regression issue appeared when later manual acceptance work accidentally removed the “Last native command truth” block. That was repaired and the Phase 15AD regression returned green.

---

## Phase 15AE completed: Native command acceptance

Phase 15AE added a cross-surface command acceptance test proving the current command chain agrees from Rust to adapter to drawer.

It covered:

- Rust command declarations
- Tauri handler registration
- JS `passportAdapter.js` fixed command mapping
- Passport drawer button wiring through adapter functions only
- no duplicated Tauri command strings in the drawer
- no dynamic raw command dispatch
- no PIN/password/secret/string argument in the public command chain
- no unsafe exports such as seed/private key/root/VMK
- no capability issuance
- no username mutation
- no wallet/ledger mutation

The accepted fixed command set is:

- `passport_status`
- `passport_create`
- `passport_lock`
- `passport_unlock_operational`
- `passport_unlock_root`
- `passport_clear`

There were two test expectation repairs during this phase:

1. The test initially looked for the wrong Phase 15AD label.
2. The test initially looked for the wrong Rust operational unlock constant name.

Both were repaired without changing runtime behavior.

---

## Phase 15AF completed: Manual acceptance checklist

Phase 15AF added a visible manual acceptance checklist to the Passport drawer.

The checklist is intended for human app testing and includes:

- runtime boundary
- create path
- operational unlock path
- lock path
- root confirmation path
- clear path
- React secret boundary
- outcome checkpoint

The checklist explicitly reminds that:

- PIN, password, recovery words, and root material are never entered in React
- root-sensitive confirmation stays redacted
- clear should return the drawer to `no_passport`
- create/unlock should use native secure surfaces, not WebView inputs

A source-test whitespace false positive occurred around the `nativeRuntimeAvailable ?` ternary. That was repaired by rewriting the test to allow formatting whitespace.

A second regression occurred because the manual checklist insertion displaced the Phase 15AD “Last native command truth” block. That was repaired by restoring the block while preserving the manual checklist.

Final Phase 15AF verification passed:

- manual acceptance source tests green
- Phase 15AD status acceptance regression green
- Phase 15AE command acceptance regression green
- Phase 15AC drawer native command regression green
- Phase 15AB Passport adapter regression green
- React build green
- Tauri consumer check green

---

## Phase 15AG completed: Desktop Phase 15 final acceptance

Phase 15AG added the final source-level acceptance test for the entire desktop Passport Phase 15 lane.

It proves:

- final acceptance files and phase labels are present
- command chain remains fixed from Rust to adapter to drawer
- React surfaces do not carry PINs
- React surfaces do not call raw Tauri invoke directly
- React surfaces do not duplicate native command authority
- status truth rows are display-only
- manual acceptance rows are display-only
- Rust regression coverage anchors remain present
- unsafe Passport commands are not exposed

This was the formal closeout of Desktop Native Passport Phase 15.

Result:

`NATIVE_PASSPORT_PHASE15_FINAL_ACCEPTANCE=GREEN`

---

## Live app test observation

After building/running CrabLink as a macOS desktop app, the Passport drawer appeared in the UI and showed the Native Passport runtime/status/manual acceptance surfaces. This is good: it proves the app build has the drawer and the user-visible Passport surface.

However, the live app revealed a product/runtime issue: the JS CrabLink Tauri boundary policy was rejecting Native Passport commands before they reached Rust. The toasts showed errors such as:

- `passport_create` not authorized by CrabLink boundary policy
- `passport_status` not authorized by CrabLink boundary policy
- `passport_unlock_operational` not authorized by CrabLink boundary policy

This was not a Rust/native Passport failure. It was the JS `tauriPlatform.js` command boundary refusing the new fixed Passport command names.

A Phase 15AH boundary-admission patch was prepared to admit the accepted fixed command set into the CrabLink boundary allowlist, with a source test:

- `apps/crablink-tauri/src/platform/tauriPlatform.passportBoundary.source.test.mjs`

The current codebundle includes this boundary test file. At the start of the next session, confirm whether Phase 15AH verification has already been run green. If not, run the Phase 15AH boundary admission verification and rebuild/relaunch the app before or alongside Onboarding Phase 0.

The intended Phase 15AH acceptance markers are:

- `NATIVE_PASSPORT_PHASE15AH_BOUNDARY_ADMISSION=GREEN`
- `PASSPORT_NATIVE_COMMAND_BOUNDARY=GREEN`
- `PASSPORT_NATIVE_COMMANDS_ADMITTED_FOR_APP_TEST=YES`
- `CRABLINK_MACOS_APP_REBUILT=YES`
- no raw invoke added
- no PIN arguments added
- no secret custody added
- no capability issuance
- no username mutation
- no wallet/ledger mutation

---

## Why we are not moving to Passport Native Phase 16 yet

The Passport Native Buildplan originally points next toward Phase 16, which is CrabLink TV Passport integration.

We should not start Phase 16 yet.

Reason: desktop has to prove the real first-run Passport/onboarding flow before we port/integrate it into Android TV.

The work we just finished proves the command bridge and drawer surfaces, but it does not yet prove a clean user experience. The app still contains leftover development assumptions and visible dev artifacts. If we move straight to TV now, we risk copying the wrong behavior to Android TV:

- baked dev Passports
- baked visitor identity
- baked/current username such as `@skinnycrabby`
- Passport A / Passport B concepts showing as if they are user choices
- home/dashboard booting before a real first-run identity decision
- local proof/cache/dev data being confused with user account state

The desktop app needs a real onboarding lifecycle first:

1. clean first launch
2. welcome page
3. username entry
4. username availability check or dev-only bypass
5. local Passport creation
6. recovery phrase ceremony
7. PIN setup through native secure input
8. profile setup or skip
9. completion marker
10. home handoff

Once that flow works on desktop, then Phase 16 can safely adapt the same state model and Passport semantics to Android TV.

---

## New buildplan created: ONBOARDING_BUILDPLAN.md

A new buildplan was created:

`ONBOARDING_BUILDPLAN.md`

Purpose:

Build a clean CrabLink first-run onboarding flow, first on desktop, later portable to TV/mobile/tablet.

The buildplan explicitly defines:

- problem statement
- product goal
- identity model
- PIN/recovery phrase security rules
- desired first-run state machine
- desktop first-run routing behavior
- cleanup targets
- expected files to touch
- phases 0 through 12
- manual desktop test checklist
- what is not in scope

Key security correction in the plan:

The user should see a seed phrase / recovery phrase, but the raw phrase must not pass through React/WebView. The secure recovery phrase ceremony should be native/platform-handled. React should only get a redacted acknowledgement DTO such as:

- `recoveryPhraseShown: true`
- `recoveryPhraseAcknowledged: true`
- `redacted: true`
- optional redacted fingerprint/checksum

React must not receive:

- phrase words
- seed bytes
- root material
- VMK
- private key
- PIN
- platform sealer material

---

## Current onboarding problem to solve

CrabLink currently has development-era identity artifacts and assumptions that must be cleaned up or quarantined before beta.

Known problem examples:

- dev Passport sessions
- Passport A / Passport B
- `passport:main:visitor-b`
- `passport:main:dev`
- `acct_dev`
- current/default username like `@skinnycrabby`
- local proof/profile/cache data being presented too much like real account state
- home route opening before first-run onboarding completes
- starter/local grant displays that could look like real account state
- dev tools mixed with normal user flow

These may remain for tests/dev surfaces, but must not appear as normal first-run user state.

---

## Desired new-user onboarding flow

For a clean install or clean local state:

1. User opens CrabLink.
2. Welcome screen appears.
3. User picks a username.
4. App checks username availability.
5. App provides a development-only bypass button for availability checks.
6. User creates a local wallet-like Passport.
7. User is shown a recovery phrase / seed phrase through a native secure recovery surface.
8. User confirms they wrote down the recovery phrase.
9. User is asked to set a PIN through native secure input.
10. User can fill out basic profile info or skip.
11. App marks onboarding complete.
12. User is routed to `crab://home`.

Important: this must be the eventual shared first-use flow for desktop, phone, tablet, TV, and future clients, but the immediate proof target is desktop.

---

## Onboarding buildplan phase order

### Phase 0 — Inventory and baseline proof

Next session should begin here.

Goal: find every baked dev identity/default and add an inventory source test before mutating runtime behavior.

Inventory terms include:

- `skinnycrabby`
- `passport:main:visitor`
- `visitor-b`
- `passport:main:dev`
- `acct_dev`
- Passport A
- Passport B
- starter grant defaults
- dev Passport session labels

Acceptance:

- `ONBOARDING_PHASE0_INVENTORY=GREEN`
- no behavior changed
- no dev artifact removed yet
- clear list of runtime cleanup targets printed

### Phase 1 — Onboarding model foundation

Add pure onboarding state machine and tests.

States include:

- `not_started`
- `welcome`
- `username_entry`
- `username_checking`
- `username_available`
- `username_bypassed_for_dev`
- `passport_create_requested`
- `passport_created_locked`
- `recovery_phrase_required`
- `recovery_phrase_acknowledged`
- `pin_setup_required`
- `pin_setup_complete`
- `profile_setup`
- `profile_skipped`
- `profile_saved`
- `complete`
- `blocked`
- `error`

Acceptance:

- complete state requires username decision, Passport created/locked, recovery acknowledged, PIN setup complete, and profile skipped/saved
- model never stores PIN/seed/root/private material
- `ONBOARDING_PHASE1_MODEL=GREEN`

### Phase 2 — Onboarding storage adapter

Persist only safe redacted onboarding state.

Acceptance:

- clean install reads as not started/welcome
- corrupted state fails safe to onboarding
- reset clears onboarding state
- no secret-shaped field accepted
- `ONBOARDING_PHASE2_STORAGE=GREEN`

### Phase 3 — First-run route gate

Route clean installs to onboarding instead of home.

Acceptance:

- clean app starts on onboarding
- completed app starts on home
- explicit dev bypass visible and marked dev-only
- no silent Passport A/B/visitor fallback
- `ONBOARDING_PHASE3_ROUTE_GATE=GREEN`

### Phase 4 — Welcome and username step

Implement visible welcome and username selection.

Acceptance:

- username is user-entered, not baked in
- `@skinnycrabby` is not defaulted
- Passport A/B not presented as identity choices
- bypass is clearly dev-only
- `ONBOARDING_PHASE4_USERNAME=GREEN`

### Phase 5 — Desktop Passport create handoff

Connect onboarding to accepted Phase 15 native Passport create path.

Acceptance:

- no React PIN input
- no create PIN argument
- native command bridge remains fixed
- created Passport is locked
- redacted failure shown on cancel/unavailable
- `ONBOARDING_PHASE5_DESKTOP_CREATE=GREEN`

### Phase 6 — Recovery phrase ceremony

Add one-time recovery phrase acknowledgement flow without exposing recovery material to React.

Acceptance:

- user can complete “write it down” acknowledgement
- React receives only redacted acknowledgement DTO
- no seed phrase words in React state, props, local storage, or logs
- no root export
- `ONBOARDING_PHASE6_RECOVERY_CEREMONY=GREEN`

### Phase 7 — PIN setup confirmation

Complete PIN setup as native-only step.

Acceptance:

- no WebView PIN input
- native prompt path used
- wrong/cancel/unavailable fails closed
- completion stored only as boolean/redacted status
- `ONBOARDING_PHASE7_PIN_SETUP=GREEN`

### Phase 8 — Profile setup or skip

Collect safe public profile draft fields or allow skip.

Acceptance:

- profile can be skipped
- profile can be saved as local draft
- no baked `@skinnycrabby`
- no backend-confirmed claim without gateway truth
- `ONBOARDING_PHASE8_PROFILE=GREEN`

### Phase 9 — Completion and home handoff

Complete onboarding and land on clean home.

Acceptance:

- clean first-run path reaches home
- status remains honest/local until backend confirms
- no dev identity defaults appear in normal completed flow
- `ONBOARDING_PHASE9_HOME_HANDOFF=GREEN`

### Phase 10 — Dev artifact quarantine

Keep dev helpers but make them impossible to confuse with real onboarding.

Acceptance:

- dev fixtures still available for testing
- new users never see Passport A/B as normal choices
- `@skinnycrabby` not in first-run defaults
- no automatic visitor-b
- `ONBOARDING_PHASE10_DEV_QUARANTINE=GREEN`

### Phase 11 — Desktop final acceptance

Prove desktop onboarding end-to-end.

Acceptance:

- `ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN`
- app opens to onboarding on clean state
- app opens to home after completion
- no React PIN
- no React seed phrase
- no baked username
- no Passport A/B normal flow
- no wallet/ledger mutation
- no capability issuance
- no fake backend-confirmed username/profile

### Phase 12 — Cross-platform onboarding contract

Freeze portable model for TV/phone/tablet.

Acceptance:

- desktop behavior reusable
- TV/mobile can implement same state machine
- local custody invariant preserved
- `ONBOARDING_CROSS_PLATFORM_CONTRACT=GREEN`

---

## Next session starting point

Start next session with:

`ONBOARDING_PHASE0_DEV_ARTIFACT_INVENTORY`

Do not start with Phase 16 yet.

Recommended first patch:

1. Search/inventory baked dev identity artifacts.
2. Add an inventory source test.
3. Print cleanup targets.
4. Do not mutate runtime behavior yet.
5. Run focused tests/build.

Suggested verification shape:

```bash
node --test apps/crablink-tauri/src/onboarding/onboardingDevArtifactInventory.source.test.mjs
npm --prefix apps/crablink-tauri run build
````

Depending on whether Phase 15AH has been verified, also run or confirm:

```bash
node --test apps/crablink-tauri/src/platform/tauriPlatform.passportBoundary.source.test.mjs
npm --prefix apps/crablink-tauri run build
TAURI_CONFIG="$(cat apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json)" cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
```

---

## Sequencing after onboarding

The correct sequence from here is:

1. Finish `ONBOARDING_BUILDPLAN.md` desktop proof.
2. Confirm desktop first-run onboarding works in the built CrabLink app.
3. Then return to Passport Native Buildplan Phase 16 for CrabLink TV Passport integration.
4. After Phase 16 is finished, pause Passport Native if needed because iOS and Android app builds have not started yet.
5. Build out iOS and Android app foundations.
6. Return to remaining Passport Native phases after the mobile foundations exist.

Rationale:

* Phase 16 is TV-specific integration.
* TV should not inherit broken desktop onboarding assumptions.
* iOS/Android phases cannot be meaningfully completed until those app surfaces exist.
* The shared onboarding model should be built once and then reused across desktop, TV, phone, and tablet.

---

## What not to do next

Do not:

* start Android TV Passport integration before desktop onboarding is proven
* keep `@skinnycrabby` as a normal default
* show Passport A/B as normal user identity choices
* silently use visitor-b/dev Passport as a new user
* route clean installs straight to home as if the user already exists
* move PIN entry into React
* show raw recovery phrase in React unless a later audited native/secure-display exception intentionally changes the rule
* add cloud login
* add cloud recovery
* add server custody
* add backend-issued Passport identity
* add wallet/ledger mutation
* add live settlement/mint/burn
* add capability issuance as part of onboarding

---

## Crates/packages changed this session

Changed:

* `apps/crablink-tauri`

  * npm package: `@crablink/crablink-tauri`
  * Rust app crate under it: `crablink-tauri`

Not changed directly:

* `svc-passport`
* `crablink-native-core`
* `ron-*` crates
* `apps/crablink-tv`
* iOS app
* Android phone/tablet app

Important distinction:

`svc-passport` and related RustyOnions crates compiled during Tauri checks because they are dependencies, but they were not edited in this session. These notes can be pasted into RustyOnions as carry-over context, but the actual code changes were CrabLink-side.

---

## Session outcome

The session successfully moved CrabLink from “Native Passport backend/bridge exists” to “desktop app has accepted Native Passport drawer/adapter/status/manual/final acceptance surfaces.” The live app now reveals the correct next product layer: onboarding and dev artifact cleanup.

The project is entering a new phase:

`CrabLink Onboarding`

This must be completed before Passport Native Phase 16 so the TV app receives a real, clean, wallet-like Passport onboarding model rather than inheriting development leftovers.

```
```



### END NOTE - JULY 25 2026 - 23:30 CST


### BEGIN NOTE - JULY 26 2026 - 18:15 CST

Below are comprehensive carry-over notes for the next session. These are written so you can paste them into CrabLink/RustyOnions notes and resume `ONBOARDING_BUILDPLAN.md` without losing context. The attached buildplan defines the desktop-first onboarding goal: clean first-run onboarding, wallet-like local custody Passport, no cloud login/custody, no React/WebView PIN or seed phrase custody, and eventual reuse across phone/tablet/TV after desktop proof is green. 

# CrabLink Onboarding Buildplan — Carry-Over Notes

## Session scope

This session was focused on **CrabLink desktop onboarding**, specifically `ONBOARDING_BUILDPLAN.md`.

We started from **Phase 0** of the onboarding buildplan and advanced through:

* Phase 0 — inventory/baseline proof
* Phase 1 — onboarding model foundation
* Phase 2 — onboarding storage adapter
* Phase 3 — first-run route gate
* Phase 4 — welcome and username step
* Phase 5 — desktop Passport create handoff
* Phase 6 — recovery phrase ceremony
* Phase 6D — manual native desktop recovery ceremony acceptance
* Phase 6E — recovery entropy guard/follow-up after low-entropy manual fixture was observed
* Phase 7A — native PIN setup foundation

We are pausing with:

`ONBOARDING_PHASE6E_RECOVERY_ENTROPY_GUARD=GREEN`
`PHASE15R_EXISTING_REGRESSION=GREEN`
`ONBOARDING_PHASE7A_NATIVE_PIN_SETUP_FOUNDATION=REGRESSION_GREEN`
`NEXT_PATCH=ONBOARDING_PHASE7B_PIN_SETUP_UI_AND_ROUTE`

The next session should resume at:

**Phase 7B — PIN setup UI and route/storage transition**

## Repositories / crates changed

Only **CrabLink** was changed in this session.

Even though commands were often run from:

`/Users/mymac/desktop/rustyonions`

the actual patches targeted:

`/Users/mymac/desktop/crablink/apps/crablink-tauri`

Changed repo:

* `crablink`

Changed app/crate surfaces:

* `apps/crablink-tauri`
* `apps/crablink-tauri/src/onboarding`
* `apps/crablink-tauri/src/adapters`
* `apps/crablink-tauri/src-tauri`
* `apps/crablink-tauri/src-tauri/src`
* `apps/crablink-tauri/src-tauri/tests`
* `apps/crablink-tauri/scripts`

RustyOnions repo status:

* `RUSTYONIONS_CHANGED=NO`
* No `svc-passport` source changes were made in this onboarding session.
* No `ron-proto`, `ron-naming`, `ron-kms`, wallet, ledger, or other RustyOnions crate changes were made in this onboarding session.

## Core product/security posture preserved

The onboarding buildplan remains desktop-first and wallet-like local custody.

Important invariants preserved this session:

* No cloud login.
* No cloud password account.
* No cloud-stored secrets.
* No backend custody of Passport secrets.
* No backend-issued identity pretending to be source of truth.
* No React/WebView custody of PINs.
* No React/WebView custody of recovery phrases / seed phrases.
* No root export.
* No VMK export.
* No platform sealer material export.
* No capability issuance.
* No wallet or ledger mutation.
* Username is a public/draft identity step, not a secret step.
* Development-only bypasses must be visible and explicitly marked as dev-only.
* No fake backend-confirmed username/profile claims.

The recovery phrase entropy issue was explicitly elevated into a hard project invariant: recovery phrases must be real cryptographic entropy in production and must never be patterned, repeated, cosmetic, or “good enough.”

## Phase 0 — Inventory and baseline proof

Goal of Phase 0 was to inventory dev identity leakage without changing runtime behavior.

Accomplished:

* Added/used onboarding dev artifact inventory coverage.
* Inventory searched for development-era identity artifacts such as:

  * `skinnycrabby`
  * `passport:main:visitor`
  * `visitor-b`
  * `passport:main:dev`
  * `acct_dev`
  * Passport A
  * Passport B
  * starter grant defaults
  * dev Passport session labels
* Confirmed the purpose of the phase was not to remove everything immediately, but to document leakage points and prepare later quarantine.
* Preserved runtime behavior during inventory.
* Established cleanup targets for later Phase 10 dev artifact quarantine.

Phase posture:

`ONBOARDING_PHASE0_INVENTORY=GREEN`

## Phase 1 — Onboarding model foundation

Goal of Phase 1 was to create the shared pure onboarding state machine.

Accomplished:

* Added onboarding model under:

`apps/crablink-tauri/src/onboarding/onboardingModel.js`

* Added state constants / transitions for the desktop onboarding flow.
* Added redacted state shape matching the buildplan’s intended local persisted onboarding DTO.
* Added helpers for:

  * first-run/welcome state
  * username entry
  * username availability
  * development availability bypass
  * Passport create requested
  * Passport created/locked
  * recovery phrase required
  * recovery phrase acknowledged
  * PIN setup required
  * PIN setup complete
  * profile setup pending
  * profile skipped/saved
  * completion eligibility
  * complete state
  * blocked/error states
* Added validation posture ensuring the model does not accept or persist secret-shaped fields.
* Added model tests beside onboarding model.

Important behavior proven:

* Clean first-run can start at welcome/not-started.
* Completion cannot happen just because a dev identity exists.
* Completion requires:

  * username decision
  * Passport created/locked state
  * recovery acknowledged
  * PIN setup complete
  * profile skipped or saved
* Model does not persist:

  * PIN
  * password
  * recovery phrase words
  * seed bytes
  * root material
  * private key
  * VMK
  * platform sealer material

Phase posture:

`ONBOARDING_PHASE1_MODEL=GREEN`

## Phase 2 — Onboarding storage adapter

Goal of Phase 2 was to persist only safe redacted onboarding state.

Accomplished:

* Added onboarding storage adapter under:

`apps/crablink-tauri/src/onboarding/onboardingStorage.js`

* Added tests under:

`apps/crablink-tauri/src/onboarding/onboardingStorage.test.mjs`

* Implemented safe local persistence helpers:

  * read onboarding state
  * write onboarding state
  * clear/reset onboarding state
  * migration/normalization from absent state
  * fail-safe handling for corrupted state
* Added redaction checks so secret-shaped fields cannot be accepted/persisted.

Important behavior proven:

* Clean install reads as not-started/welcome.
* Corrupted persisted state fails safe back into onboarding.
* Reset clears onboarding state.
* Storage persists only redacted boolean/status/profile-draft values.
* Storage rejects unsafe secret-like fields.

Phase posture:

`ONBOARDING_PHASE2_STORAGE=GREEN`

## Phase 3 — First-run route gate

Goal of Phase 3 was to route clean installs into onboarding instead of silently booting home with dev identity state.

Accomplished:

* Added route gate logic under onboarding surfaces, including:

`apps/crablink-tauri/src/onboarding/onboardingRouteGate.js`
`apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx`
`apps/crablink-tauri/src/onboarding/onboardingRouteGate.css`
`apps/crablink-tauri/src/onboarding/onboardingRouteGate.test.mjs`

* Connected onboarding routing to app boot/shell behavior.
* Added behavior for:

  * incomplete onboarding routes to onboarding
  * complete onboarding routes to normal shell/home
  * explicit dev bypass support where appropriate
  * no silent dev identity fallback
* Ensured the route gate can direct created/required recovery states into the Recovery Ceremony step.

Important behavior proven:

* Clean state does not silently rely on `Passport A`, `Passport B`, visitor labels, or baked dev identity.
* Home route is gated until onboarding is complete.
* Dev bypass is not silent; it is explicit/marked dev-only.
* Onboarding state drives routing honestly.

Phase posture:

`ONBOARDING_PHASE3_ROUTE_GATE=GREEN`

## Phase 4 — Welcome and username step

Goal of Phase 4 was to add the visible welcome/username UI.

Accomplished:

* Added welcome/username UI components, including:

`apps/crablink-tauri/src/onboarding/WelcomeUsernameStep.jsx`

* Added username availability/draft helpers, including:

`apps/crablink-tauri/src/onboarding/usernameAvailability.js`

* Added tests such as:

`apps/crablink-tauri/src/onboarding/welcomeUsernameStep.test.mjs`

* Implemented:

  * welcome page
  * username input
  * username syntax validation
  * availability state model
  * development-only availability bypass
  * no claim of confirmed username ownership from bypass alone

Important behavior proven:

* Username is user-entered, not baked in.
* `@skinnycrabby` is not defaulted as the new user.
* Passport A/B are not presented as normal identity choices in onboarding.
* Dev availability bypass is explicit and marked dev-only.
* Username bypass does not claim backend/registry confirmation.

Phase posture:

`ONBOARDING_PHASE4_USERNAME=GREEN`

## Phase 5 — Desktop Passport create handoff

Goal of Phase 5 was to connect onboarding to the accepted native Passport create path.

Accomplished:

* Added/create adapter wiring in:

`apps/crablink-tauri/src/onboarding/onboardingPassportCreate.js`
`apps/crablink-tauri/src/onboarding/PassportCreateStep.jsx`
`apps/crablink-tauri/src/onboarding/passportCreateStep.test.mjs`

* Reused existing native Passport create command bridge.
* React calls the create adapter without a PIN argument.
* Native secure surface owns create PIN entry.
* On successful create, onboarding records created/locked redacted state.
* Cancel/unavailable/failure maps to redacted UI state.

Important behavior proven:

* No React PIN input.
* No create PIN argument.
* No WebView secret material.
* Created Passport is locked.
* Native command bridge remains fixed.
* Failures are redacted and fail closed.

Phase posture:

`ONBOARDING_PHASE5_DESKTOP_CREATE=GREEN`

## Phase 6 — Recovery phrase ceremony

Goal of Phase 6 was to add one-time recovery phrase acknowledgement without exposing recovery material to React.

Accomplished:

* Added recovery ceremony frontend adapter/model/UI under:

`apps/crablink-tauri/src/onboarding/onboardingRecoveryCeremony.js`
`apps/crablink-tauri/src/onboarding/RecoveryCeremonyStep.jsx`
`apps/crablink-tauri/src/onboarding/recoveryCeremony.test.mjs`

* Added/used Tauri/native recovery runtime surfaces under:

`apps/crablink-tauri/src-tauri/src/passport_recovery_phrase_runtime.rs`
`apps/crablink-tauri/src-tauri/src/passport_recovery_ceremony_runtime.rs`
`apps/crablink-tauri/src-tauri/src/passport_recovery_acknowledgement_store.rs`

* Added/used public command bridge regression under:

`apps/crablink-tauri/src-tauri/tests/phase6b2b2b2b_public_recovery_command_wiring.rs`

* React triggers the fixed no-argument native ceremony path.
* Native/Rust surface handles the actual phrase display.
* React receives only redacted acknowledgement truth.
* Onboarding persists only the acknowledgement boolean/state, never the phrase.

Important behavior proven:

* React does not receive seed phrase words.
* React does not persist seed phrase words.
* React does not pass seed phrase words through props/state/localStorage/logs.
* Recovery command is fixed/no-argument.
* Unsafe/fake acknowledgement DTOs fail closed.
* Repeat display is rejected after acknowledgement.
* Clear/reset re-enables required recovery ceremony path.
* Root export remains absent.

Phase posture:

`ONBOARDING_PHASE6_RECOVERY_CEREMONY=GREEN`

## Phase 6D — Manual native desktop recovery ceremony acceptance

Goal of Phase 6D was to manually verify the native desktop recovery dialog behavior.

Accomplished:

* Added/used manual acceptance script:

`apps/crablink-tauri/scripts/onboarding_phase6d_desktop_native_ceremony_acceptance.sh`

* Added/used ignored manual Rust test:

`passport_recovery_phrase_runtime::tests::phase6d_manual_desktop_native_ceremony_first_repeat_and_clear_reset`

Manual operator result:

* Native dialog opened on first run.
* Operator clicked OK/acknowledged.
* Second run did not re-display phrase after acknowledgement.
* After marker clear/reset, native dialog could display again as expected.
* No words returned to WebView.
* No root export.
* Manual acceptance printed green.

Important final markers:

`ONBOARDING_PHASE6D_MANUAL_NATIVE_ACCEPTANCE=GREEN`
`FIRST_RUN_NATIVE_DIALOG_ACCEPTANCE=GREEN`
`SECOND_RUN_NO_DIALOG_ACCEPTANCE=GREEN`
`PASSPORT_CLEAR_REENABLES_CEREMONY_ACCEPTANCE=GREEN`
`WORDS_RETURNED_TO_WEBVIEW=NO`
`ROOT_EXPORT=NO`

## Phase 6E — Recovery entropy guard / low-entropy follow-up

Why Phase 6E was added:

During the manual recovery ceremony, the displayed recovery phrase looked visibly patterned/repeated. That was not acceptable, even if it was coming from a deterministic test fixture. We paused Phase 7 work and audited recovery entropy before moving forward.

Important conclusion:

* The concerning phrase came from deterministic test/manual fixture behavior, not from the production create path.
* Production create path is now guarded as using OS CSPRNG through `getrandom::fill`.
* The manual deterministic fixture was hardened so it no longer emits repeated-byte material that maps to visibly repeated recovery words.
* We explicitly added tests so this does not regress.

Files touched during Phase 6E:

`apps/crablink-tauri/src-tauri/src/passport_recovery_phrase_runtime.rs`

`apps/crablink-tauri/src-tauri/src/passport_vault_create_runtime.rs`

`apps/crablink-tauri/src-tauri/tests/phase15r_platform_factor_and_vault_create_orchestration.rs`

`apps/crablink-tauri/scripts/onboarding_phase6d_desktop_native_ceremony_acceptance.sh`

What changed:

* Deterministic test random source was changed from repeated-byte output to diversified deterministic bytes.
* Manual fixture test added:

`passport_recovery_phrase_runtime::tests::phase6e_manual_recovery_fixture_has_diverse_entropy_and_words`

* Phase 15R entropy tests added:

  * `phase6e_deterministic_test_random_source_is_diverse_not_repeated`
  * `phase6e_production_create_uses_os_csprng_boundary`
* Existing Phase 15R regression updated so it no longer expects old repeated VMK bytes.
* Added explicit rejection of repeated-byte VMK fixture material.
* Added guard that production create runtime contains:

  * `pub struct OsNativeVaultRandomSource`
  * `impl NativeVaultRandomSource for OsNativeVaultRandomSource`
  * `getrandom::fill(output)`
  * `create_desktop_native_passport_vault_with_random(&OsNativeVaultRandomSource`
* Added manual script warnings:

  * displayed phrase source is deterministic test fixture
  * displayed phrase is not a real Passport
  * do not use displayed recovery words

Important green markers:

`ONBOARDING_PHASE6E_RECOVERY_ENTROPY_GUARD=GREEN`
`PHASE15R_EXISTING_REGRESSION=GREEN`
`OLD_REPEATED_VMK_EXPECTATION_REMOVED=YES`
`DIVERSE_DETERMINISTIC_VMK_EXPECTATION=GREEN`
`MANUAL_RECOVERY_FIXTURE_REPEATED_BYTE_PATTERN_REMOVED=YES`
`MANUAL_RECOVERY_FIXTURE_DIVERSE=YES`
`PRODUCTION_CREATE_USES_GETRANDOM=GUARDED`
`PRODUCTION_CSPRNG_BOUNDARY_TEST=GREEN`
`REAL_CREATED_PASSPORT_ENTROPY_AUDIT=GREEN_FOR_CREATE_PATH`
`WORDS_RETURNED_TO_WEBVIEW=NO`
`ROOT_EXPORT=NO`
`WALLET_OR_LEDGER_MUTATION=NO`

Important note for next session:

Do **not** undo the Phase 6E guard. Recovery phrase entropy is now a critical security invariant. Do not accept repeated-byte, patterned, deterministic, or low-entropy recovery material in any real Passport path.

## Phase 7A — Native PIN setup foundation

Goal of Phase 7A was to create the native-only PIN setup review/foundation before adding React UI.

Accomplished:

* Added PIN setup model/reviewer under:

`apps/crablink-tauri/src/onboarding/onboardingPinSetup.js`

* Added tests under:

`apps/crablink-tauri/src/onboarding/onboardingPinSetup.test.mjs`

* Reused existing operational unlock native command path:

  * `passport_unlock_operational`
  * fixed/no-argument adapter call
  * native secure PIN prompt
* Added pure review behavior:

  * operational unlocked completes PIN setup
  * already unlocked completes PIN setup
  * cancelled/rejected/unavailable/no-passport fail closed
  * unsafe success claims fail closed
* Confirmed adapter path uses no PIN argument.
* Confirmed React/WebView has no PIN field and no secret material.

Important green markers:

`ONBOARDING_PHASE7A_NATIVE_PIN_SETUP_FOUNDATION=GREEN`
`NATIVE_OPERATIONAL_UNLOCK_REUSED=YES`
`FIXED_NO_ARGUMENT_UNLOCK_ADAPTER=YES`
`PIN_SETUP_REVIEWER=ADDED`
`OPERATIONAL_UNLOCKED_COMPLETES_PIN_SETUP=YES`
`ALREADY_UNLOCKED_COMPLETES_PIN_SETUP=YES`
`CANCEL_REJECT_UNAVAILABLE_FAIL_CLOSED=YES`
`UNSAFE_SUCCESS_CLAIMS_FAIL_CLOSED=YES`
`PIN_THROUGH_WEBVIEW=NO`
`PIN_ARGUMENT=ABSENT`
`SECRET_MATERIAL_RETURNED=NO`
`ROOT_EXPORT=NO`
`WALLET_OR_LEDGER_MUTATION=NO`

Current remaining Phase 7 work:

`ONBOARDING_PHASE7_PIN_SETUP=NOT_YET_GREEN`

Needed next:

* React PIN setup UI
* route gate wiring to PIN setup step
* storage transition from PIN setup complete to profile setup
* acceptance marker:

`ONBOARDING_PHASE7_PIN_SETUP=GREEN`

## Tests and checks that were green at pause

Final green verification from the last terminal output:

### Phase 6E / entropy

* `ONBOARDING_PHASE6E_PHASE15R_SOURCE_BOUNDARY=GREEN`
* `REPAIRED_PHASE15R_CREATE_TEST=GREEN`
* `PHASE15R_EXISTING_REGRESSION=GREEN`
* `ONBOARDING_PHASE6E_PHASE15R_ENTROPY_REGRESSION=GREEN`
* `ONBOARDING_PHASE6E_RUNTIME_FIXTURE_REGRESSION=GREEN`
* `ONBOARDING_PHASE6E_TAURI_CHECK=GREEN`

### Phase 7A

* `ONBOARDING_PHASE7A_PIN_SETUP_REGRESSION=GREEN`
* Node tests: 6 passed

  * native PIN setup accepts only native operational unlock success
  * already unlocked completes without another native prompt
  * cancelled/rejected/unavailable/no-passport fail closed
  * unsafe success claims fail closed
  * begin function calls fixed no-argument native unlock adapter
  * source boundary has no React PIN field/argument/secret material

### Phase 6C

* `ONBOARDING_PHASE6C_ADAPTER_REGRESSION=GREEN`
* Node adapter tests: 6 passed
* `ONBOARDING_PHASE6C_RECOVERY_REGRESSION=GREEN`
* Recovery tests: 9 passed

### Phase 15R

* Existing Phase 15R regression: 6 passed
* Phase 6E Phase15R entropy tests: 2 passed
* Old repeated VMK expectation removed.

### Tauri

* `cargo check --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml` green under the macOS dev-media Tauri config.

## Important failure history from this session

Do not repeat these mistakes:

### Phase 6E v1–v4 failure pattern

Earlier Phase 6E patch attempts assumed wrong source shapes:

* assumed `populated_vault()` had a specific `recovery_factor` binding
* assumed repeated `vec![...; PHASE15Q_PLATFORM_FACTOR_BYTES]` shape inside CrabLink recovery runtime
* assumed `PHASE15Q_PLATFORM_FACTOR_BYTES` was directly present in the recovery runtime file

Those assumptions were wrong for the actual CrabLink source shape, causing patch aborts.

### Correct diagnosis

The real issue was:

* `populated_vault()` used a deterministic random source.
* That deterministic random source emitted repeated-byte material.
* The repeated-byte material mapped into a visibly patterned recovery phrase in manual ceremony testing.
* Production create path uses `OsNativeVaultRandomSource` and `getrandom::fill`, and now has boundary tests proving that.

### Phase 15R repair failure

After fixing deterministic test random output, an existing Phase 15R test still expected the old repeated VMK:

`&[0x14; PHASE15Q_VAULT_MASTER_KEY_BYTES]`

That assertion was updated to expect diversified deterministic bytes for seed `0x14` and to reject repeated-byte material.

## Current exact next work

Resume with:

# Phase 7B — PIN setup UI and route/storage transition

Goal:

Complete Phase 7 by adding the actual React onboarding step and state transition for native-only PIN setup.

Expected files to inspect/touch:

* `apps/crablink-tauri/src/onboarding/onboardingPinSetup.js`
* `apps/crablink-tauri/src/onboarding/onboardingPinSetup.test.mjs`
* `apps/crablink-tauri/src/onboarding/onboardingModel.js`
* `apps/crablink-tauri/src/onboarding/onboardingRouteGate.js`
* `apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx`
* `apps/crablink-tauri/src/onboarding/onboardingStorage.js`
* likely new file:

  * `apps/crablink-tauri/src/onboarding/PinSetupStep.jsx`
* likely new test:

  * `apps/crablink-tauri/src/onboarding/pinSetupStep.test.mjs`

What Phase 7B should implement:

* Add React component for PIN setup step.
* UI should say something like:

  * “Set up your local Passport PIN”
  * “Open native PIN prompt”
  * “Your PIN is handled by the native secure prompt.”
* Component calls `beginNativeOnboardingPinSetup()` or equivalent Phase 7A helper.
* Component must not render:

  * `<input type="password">`
  * PIN text field
  * password field
  * seed phrase field
  * recovery phrase field
* Component must not accept:

  * `pin`
  * `password`
  * VMK
  * root factor
  * private key
  * seed/recovery material
* On native operational unlock success or already-unlocked:

  * record `pinSetupComplete: true`
  * transition to `profile_setup`
  * persist only redacted state
* On cancel/rejected/unavailable/no-passport:

  * fail closed
  * do not mark PIN setup complete
  * show redacted error/status only

Expected Phase 7B acceptance markers:

`REACT_PIN_SETUP_UI=ADDED`
`ROUTE_GATE_PIN_STEP=ADDED`
`STORAGE_TRANSITION_TO_PROFILE_SETUP=ADDED`
`PIN_THROUGH_WEBVIEW=NO`
`PIN_ARGUMENT=ABSENT`
`SECRET_MATERIAL_RETURNED=NO`
`ROOT_EXPORT=NO`
`WALLET_OR_LEDGER_MUTATION=NO`
`ONBOARDING_PHASE7_PIN_SETUP=GREEN`

## Suggested first command next session

Before patching Phase 7B, run a focused source inspection, not a broad workspace check:

```bash
cd /Users/mymac/desktop/crablink/apps/crablink-tauri

grep -RIn \
  -e "requirePinSetup" \
  -e "recordPinSetupComplete" \
  -e "beginNativeOnboardingPinSetup" \
  -e "RecoveryCeremonyStep" \
  -e "PassportCreateStep" \
  -e "profile_setup" \
  src/onboarding
```

Then patch Phase 7B based on the actual anchors.

## Completion status at pause

Desktop onboarding buildplan progress is roughly:

* Phase 0: green
* Phase 1: green
* Phase 2: green
* Phase 3: green
* Phase 4: green
* Phase 5: green
* Phase 6: green
* Phase 6D: green/manual accepted
* Phase 6E: green/security follow-up complete
* Phase 7A: green/foundation complete
* Phase 7B: next
* Phase 8: not started
* Phase 9: not started
* Phase 10: not started
* Phase 11: not started
* Phase 12: not started

## Big-picture path after Phase 7B

After Phase 7B:

1. Finish Phase 7 acceptance:

   * `ONBOARDING_PHASE7_PIN_SETUP=GREEN`

2. Move to Phase 8:

   * profile setup or skip
   * public/draft fields only
   * no backend-confirmed profile claims

3. Move to Phase 9:

   * complete onboarding
   * route to `crab://home`
   * clean home handoff
   * honest Passport chip/drawer state

4. Move to Phase 10:

   * dev artifact quarantine
   * remove Passport A/B from normal drawer path
   * keep dev fixtures only behind explicit dev/test surfaces

5. Move to Phase 11:

   * desktop final acceptance
   * React build
   * Tauri check
   * relevant Phase 15 regressions
   * manual desktop onboarding test from clean state

6. Move to Phase 12:

   * freeze cross-platform onboarding contract for TV/mobile/tablet
   * do not make TV companion-device pairing the default Passport model
   * preserve local custody invariant

## Critical reminders for next session

* Do not move to Android TV Phase 16 until desktop onboarding is proven.
* Do not return to Passport Native Phase 16 until this desktop onboarding flow is complete enough to prove the work on desktop first.
* No React PIN.
* No React seed phrase.
* No cloud login/custody.
* No fake backend-confirmed username/profile.
* No wallet/ledger mutation.
* No capability issuance.
* Recovery phrase entropy is a hard security invariant.
* Use small focused patches.
* Run focused tests first.
* Fix first failure before expanding scope.
* Do not run broad acceptance unless the touched surface justifies it.


### END NOTE - JULY 26 2026 - 18:15 CST


### BEGIN NOTE - JULY 27 2026 - 00:55 CST

The latest codebundle confirms the V2 handoff is present in the repository, so this is no longer a case of the patch failing to apply. 

## Why the Keychain prompt is still appearing

The patch added a **preferred native-memory recovery path**, but it did **not remove the old Keychain fallback**.

The current recovery function does this:

```text
take pending recovery factor from AppState
    |
    ├─ factor exists → display phrase from native memory
    |
    └─ factor absent → call legacy recovery function
                         → read recovery-root from macOS Keychain
                         → macOS password prompt
```

That fallback remains explicitly present in the current source. When `take_pending_recovery_factor()` returns `None`, the code calls `run_desktop_recovery_ceremony_once()`, which unseals the recovery root from Keychain.

Your observed timing—pressing **Retry native recovery ceremony** and immediately receiving the Keychain prompt—strongly indicates that the live recovery command found the pending-memory slot empty and entered that fallback.

The two new tests passed because they directly created one `DesktopPendingRecoverySessionStore`, staged a factor into it, and passed that same object into the recovery helper. They proved the helper works in isolation, but they did **not prove the complete live Tauri sequence**:

```text
real passport_create command
→ real managed AppState
→ React state transition
→ real passport_recovery_ceremony command
→ same populated pending store
```

The live application has now shown that this command-to-command guarantee is not established.

There is also a second unresolved defect: clearing a Passport removes the encrypted vault and native session state, but the command still reports `platform_material_mutated: false`. The old Keychain entries are therefore not deleted.  The macOS adapter continues using one fixed service and fixed `recovery-root` / `device-key` accounts for every development executable.  That leaves stale entries and their old access-control identity behind, which may independently contribute to the authentication prompt.

The exact reason the pending slot became empty is not yet proven. The next session must distinguish between:

1. the Rust/Tauri process restarting between creation and recovery;
2. the real create command failing to retain the factor in the managed `AppState`;
3. another path clearing or replacing the pending slot;
4. the visible prompt actually originating from Keychain update/write behavior rather than the recovery read.

Do not enter your Mac password. Select **Deny** and leave Phase 11B stopped.

---

# RustyOnions / CrabLink Onboarding Buildplan — Exhaustive Carry-Over Notes

## 1. Active project and working directory

Current project priority:

```text
ONBOARDING_BUILDPLAN.md
```

This work must be completed before returning to:

```text
Passport Native Buildplan Phase 16
CrabLink TV
Android app
iOS app
```

Primary repository worked on during this session:

```text
/Users/mymac/Desktop/crablink
```

Primary application directory:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tauri
```

No RustyOnions crate was changed during the onboarding work described here.

Current repository-change posture:

```text
CRABLINK_CHANGED=YES
CRABLINK_TAURI_CHANGED=YES
RUSTYONIONS_CHANGED=NO
CRABLINK_TV_CHANGED=NO
SVC_PASSPORT_CHANGED=NO
```

Latest attached source snapshot:

```text
CODEBUNDLE_TAURI_APP(88).md
Generated: 2026-07-27T05:28:22Z
Git: 4b24497 (dirty)
Text files: 898
```

The latest bundle includes the onboarding UI, development reset work, Phase 11 scripts, Native Passport command bridges, and the pending-recovery V2 implementation. 

---

## 2. Current buildplan status

### Completed or accepted green

```text
Phase 0 — inventory and baseline
Phase 1 — onboarding model
Phase 2 — onboarding persistence
Phase 3 — first-run route gate
Phase 4 — welcome and username entry
Phase 5 — local Passport creation UI/bridge
Phase 6 — native recovery ceremony
Phase 6D — manual deterministic native ceremony
Phase 6E — deterministic fixture repair
Phase 6F — production OS-CSPRNG recovery acceptance
Phase 7 — native PIN setup
Phase 8 — local profile setup
Phase 9 — completion and crab://home handoff
Phase 10 — development artifact quarantine
Phase 11A — automated desktop final acceptance
```

### Current blocked phase

```text
Phase 11B — desktop manual acceptance
STATUS=RED
BLOCKED_AT=NATIVE_RECOVERY_CEREMONY
```

### Not started

```text
Phase 12 — cross-platform onboarding contract
```

The onboarding buildplan is therefore not complete.

---

# 3. Phase 6F production recovery entropy acceptance

Before Phase 9, production recovery entropy was manually checked.

A focused ignored Rust test created two temporary in-memory Passport vaults through the production OS-random wrapper. It opened two native recovery dialogs and proved the redacted fingerprints differed.

Important acceptance results:

```text
TWO_TEMPORARY_OS_CSPRNG_VAULTS_CREATED=YES
TWO_NATIVE_RECOVERY_DIALOGS_SHOWN=YES
RECOVERY_FINGERPRINTS_DISTINCT=GREEN
PRODUCTION_OS_RANDOM_CREATE_WRAPPER_USED=YES
REAL_USER_VAULT_TOUCHED=NO
MACOS_KEYCHAIN_TOUCHED=NO
WORDS_RETURNED_TO_WEBVIEW=NO
ROOT_EXPORT=NO
WALLET_OR_LEDGER_MUTATION=NO
```

The displayed phrases were disposable test material. They must not be reused as real recovery phrases.

Security conclusion:

```text
Production create entropy was proven non-deterministic.
The current Phase 11B failure is not an entropy-generation failure.
```

---

# 4. Phase 9 — onboarding completion and `crab://home`

Phase 9 added the explicit final onboarding transition.

Implemented behavior:

```text
profile_saved/profile_skipped
→ completion screen
→ safe local settings projection
→ completed onboarding state
→ crab://home
→ normal CrabLink shell
```

New or modified surfaces included:

```text
src/onboarding/OnboardingCompletionStep.jsx
src/onboarding/onboardingHomeHandoff.js
src/onboarding/onboardingHomeHandoff.test.mjs
src/onboarding/OnboardingRouteGate.jsx
src/pages/home/HomePage.jsx
src/app/shell/PassportChip.jsx
```

Important behavior:

* The selected username is displayed as a **local draft**.
* It is not labeled backend-confirmed.
* Completion does not register the username.
* Completion does not issue a capability.
* Completion does not mutate a wallet or ledger.
* Known development labels no longer outrank the selected onboarding username.
* The normal completed route becomes `crab://home`.

Initial Phase 9 verification found two test problems:

1. A secret-surface source assertion matched security comments containing words such as PIN and recovery phrase.
2. The Passport chip source ordering did not satisfy the local-draft priority assertion.

Both were repaired.

Final Phase 9 result:

```text
ONBOARDING_PHASE9_COMPLETION_TRANSITION=GREEN
ONBOARDING_PHASE9_CRAB_HOME_ROUTE=GREEN
ONBOARDING_PHASE9_LOCAL_USERNAME_DISPLAY=GREEN
ONBOARDING_PHASE9_KNOWN_DEV_LABEL_HANDOFF=GREEN
ONBOARDING_PHASE9_NO_BACKEND_CONFIRMED_CLAIM=GREEN
ONBOARDING_PHASE9_HOME_HANDOFF=GREEN
```

The React production build passed.

---

# 5. Phase 10 — development artifact quarantine

## Phase 10A clean defaults

Phase 10A removed development identities from normal application defaults while retaining explicit development fixtures.

Confirmed changes included:

* JavaScript settings default to development mode off.
* Native `AppSettings` no longer fabricate a Passport subject or wallet account.
* Profile defaults no longer contain `@skinnycrabby`.
* Profile gateway/public views no longer silently fall back to a development identity.
* Tauri local storage is not presented as an HTTP-preview fallback.
* Dedicated explicit fixtures remain in `devPassportSessions.js`.

Final Phase 10A tests passed:

```text
JavaScript settings default to explicit development mode off
Native AppSettings no longer fabricate Passport/wallet defaults
Profile defaults contain no baked Skinnycrabby identity
Profile views have no implicit development identity fallback
Tauri local storage has no false HTTP-preview claim
Explicit development fixtures remain available
```

The Phase 0 inventory was repaired so that:

* separate test files are excluded;
* embedded Rust `#[cfg(test)]` modules are excluded;
* production source before and after embedded test modules remains scanned;
* source line numbers remain accurate.

There were shell-test-harness problems during Phase 10:

```text
[: ']' expected
zsh: command not found: 0
```

These were summary-script defects rather than application failures. The underlying tests and builds were green.

## Phase 10B drawer development gate

The Passport drawer development surfaces were placed behind an explicit development gate.

Current related files include:

```text
src/app/shell/passportDrawerDevGate.js
src/app/shell/passportDrawerDevGate.test.mjs
src/app/shell/PassportDrawer.jsx
```

The gate tests later passed 5/5.

Normal presentation must not show:

```text
Creator A
Visitor B
passport:main:dev
starter ROC
automatic visitor mode
development-only account switching
```

unless the explicit development gate is active.

---

# 6. Phase 11A — automated desktop final acceptance

A new automated acceptance script was added:

```text
scripts/onboarding_phase11a_desktop_automated_acceptance.sh
```

It runs:

* final onboarding source/model tests;
* onboarding JavaScript regression suite;
* Passport drawer source regressions;
* Tauri Passport boundary tests;
* Phase 15W create bridge;
* Phase 15X restart acceptance;
* Phase 15Y status/command acceptance;
* Phase 15Z root-confirmation acceptance;
* Phase 15AA clear bridge;
* Phase 6 public recovery command;
* production CSPRNG boundary;
* Tauri `cargo check`;
* Vite production build;
* macOS `.app` bundle build;
* `.app` bundle presence verification.

One Phase 11A test initially read the obsolete file:

```text
src/App.jsx
```

The active application is:

```text
src/app/App.jsx
```

The test path was repaired without changing runtime code.

Final Phase 11A state:

```text
ONBOARDING_PHASE11A_MODEL_RESTART_RESET=GREEN
ONBOARDING_PHASE11A_PROFILE_SAVE_SKIP_COMPLETION=GREEN
ONBOARDING_PHASE11A_NO_REACT_PIN_OR_RECOVERY_WORDS=GREEN
ONBOARDING_PHASE11A_NO_BAKED_IDENTITY=GREEN
ONBOARDING_PHASE11A_DEV_QUARANTINE=GREEN
ONBOARDING_PHASE11A_PHASE15_REGRESSIONS=GREEN
ONBOARDING_PHASE11A_TAURI_CONSUMER_CHECK=GREEN
ONBOARDING_PHASE11A_MACOS_APP_BUILD=GREEN
ONBOARDING_PHASE11A_DESKTOP_AUTOMATED_ACCEPTANCE=GREEN
ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=MANUAL_PENDING
```

Phase 11A is accepted green.

---

# 7. Phase 11B manual acceptance recorder

The manual recorder was added at:

```text
scripts/onboarding_phase11b_desktop_manual_acceptance.sh
```

It requires human confirmation of:

1. clean Welcome screen;
2. no baked identity;
3. username validation;
4. truthful username availability failure;
5. explicit development availability bypass;
6. native PIN-based Passport creation;
7. created-locked state;
8. native 24-word recovery display;
9. no recovery words or PIN in React;
10. native operational PIN setup;
11. profile save/skip;
12. completion truth;
13. `crab://home` handoff;
14. clean normal drawer;
15. restart persistence;
16. Native Passport clear;
17. onboarding reset;
18. final clean Welcome state.

It refuses to report final green unless all checkpoints are confirmed.

---

# 8. First Phase 11B manual failure — old Passport already existed

The first manual attempt reached Passport creation and returned:

```text
already_exists
```

This proved an older encrypted Native Passport vault still existed.

The user entered the development shell and observed stale display state:

```text
@crabmaster
passport:main:dev
@skinnycrabby route/tab
```

These came from multiple independent sources:

* Native encrypted Passport vault;
* cached public profile;
* stored development settings;
* stale route/tab state.

The three original browser-storage cleanup keys were insufficient because they did not clear all profile and settings sources.

---

# 9. Phase 11B development reset work

## Manual recorder clean-start repair

The recorder was updated to require:

```text
NATIVE_NO_PASSPORT
BROWSER_STATE_CLEAN
```

It also clears:

```text
crablink.onboarding.v1
crablink.onboarding.profile-draft.v1
crablink.storage.v1
crablink.public_profile.v1
```

from both:

```text
localStorage
sessionStorage
```

It resets the browser route to:

```text
crab://home
```

## Real runtime reset helper

A development-only destructive reset was added:

```text
src/onboarding/onboardingDevelopmentReset.js
src/onboarding/onboardingDevelopmentReset.test.mjs
```

The Passport drawer received a two-step control:

```text
Arm disposable onboarding reset
Confirm clear Passport and reset onboarding
```

The reset performs:

```text
clear Native Passport vault
verify native state = no_passport
reset application settings
clear public-profile cache
clear local catalog cache
clear recent-receipt cache
clear profile draft
reset onboarding state
reset route
reload application
```

The control is restricted to:

```text
import.meta.env.DEV
AND
native Passport runtime available
```

Initial source testing was brittle because it looked for one exact whitespace layout. That was repaired with a structural assertion.

Final reset verification:

```text
Runtime reset tests: 6 passed
Phase 10 development gate: 5 passed
Native Passport drawer regressions: 22 passed
React production build: GREEN
```

The user then successfully used the real development reset to remove the old disposable Passport and stale application display state.

---

# 10. Discovery of the macOS Keychain prompt

After creating a new disposable Passport, macOS displayed:

```text
crablink-tauri wants to use your confidential information stored in
“com.rustyonions.crablink.native-passport.v1”
in your keychain
```

The dialog asks for the Mac login Keychain password, not the CrabLink Passport PIN.

The user does not want to provide the Mac password.

Correct action:

```text
Select Deny.
Do not enter the Passport PIN.
Do not select Always Allow.
```

The fixed service currently used by the macOS sealer is:

```text
com.rustyonions.crablink.native-passport.v1
```

with accounts:

```text
recovery-root
device-key
```

The adapter uses `set_generic_password` for sealing and `generic_password` for unsealing. 

---

# 11. First pending-recovery handoff attempt

The first patch attempted to add a native one-time recovery factor session and a separate integration-test target.

It failed during its Python postwrite check because of invalid Python syntax:

```text
command_source =
```

The rollback removed the new test target and pending module.

The later verification incorrectly printed a green summary because the shell failure counter used command substitution instead of arithmetic expansion.

Important conclusion:

```text
FIRST_PENDING_RECOVERY_PATCH=ROLLED_BACK
FIRST_GREEN_SUMMARY=FALSE
```

No result from that first attempt should be counted.

---

# 12. Pending-recovery handoff V2

The corrected V2 patch successfully applied.

## New file

```text
src-tauri/src/passport_pending_recovery_runtime.rs
```

It owns:

```rust
Mutex<Option<NativeSecretBytes>>
```

and provides:

```text
stage_recovery_factor
take_pending_recovery_factor
restore_recovery_factor
clear_pending_recovery_factor
has_pending_recovery_factor
```

The factor is native memory only and is not serialized or returned to React.

## Modified Rust files

```text
src-tauri/src/lib.rs
src-tauri/src/state.rs
src-tauri/src/passport_vault_create_runtime.rs
src-tauri/src/passport_create_command_runtime.rs
src-tauri/src/passport_recovery_phrase_runtime.rs
src-tauri/src/commands/passport.rs
```

## Intended behavior

During creation:

```text
generate recovery factor
→ clone into pending native-memory store
→ seal persistent recovery factor into platform storage
→ write encrypted vault
→ return created_locked
```

The handoff currently happens before the two platform sealing calls and the atomic vault write. 

During recovery:

```text
pending factor present
→ derive 24 words
→ show native recovery window
→ no Keychain unseal
```

On cancel, unavailable, or runtime error:

```text
restore pending factor for retry
```

On acknowledgement:

```text
drop pending factor
```

On Passport clear:

```text
drop pending factor
```

On process exit:

```text
memory naturally disappears
```

## Public command wiring

The public `passport_create` command now calls:

```text
create_desktop_native_passport_from_native_surface_with_pending_recovery
```

The public recovery command calls:

```text
run_desktop_recovery_ceremony_once_with_pending_recovery
```

Both receive the `passport_pending_recovery_session` field from `AppState`.

## V2 automated verification

The focused tests passed:

```text
phase11b_pending_recovery_avoids_platform_unseal_and_drops_after_acknowledgement
phase11b_cancel_restores_pending_recovery_for_retry_without_platform_unseal
```

Result:

```text
2 passed
0 failed
```

Other green regressions:

```text
Phase 15W create bridge: 4 passed
Phase 15R vault create: 8 passed
Phase 6 recovery command: 2 passed
Phase 15AA clear bridge: 4 passed
Phase 15X restart acceptance: 4 passed
Phase 15Y command source: 4 passed
cargo check: GREEN
```

This proves the lower-level native-memory behavior in a controlled test environment.

---

# 13. Current live failure after V2

The user cleared the prior disposable Passport, restarted the patched application, created another Passport, and reached:

```text
Passport = created_locked
Onboarding state = recovery_phrase_required
Ceremony status = failure
Redacted state = unavailable
```

Pressing:

```text
Retry native recovery ceremony
```

still produced the macOS login Keychain password prompt.

The recovery words were not shown.

The recovery acknowledgement was not completed.

Current manual result:

```text
ONBOARDING_PHASE11B_NATIVE_PASSPORT_CREATE=PARTIAL_GREEN
ONBOARDING_PHASE11B_CREATED_LOCKED=OBSERVED
ONBOARDING_PHASE11B_NATIVE_RECOVERY=RED
ONBOARDING_PHASE11B_REACT_SECRET_BOUNDARY=GREEN_SO_FAR
ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=RED
```

The current Passport must not be treated as accepted or safely recoverable because the user has never received and acknowledged its recovery phrase.

---

# 14. Current root-cause assessment

## Proven

* V2 source is present.
* The pending store exists in `AppState`.
* The public create and recovery commands reference that store.
* The isolated pending-memory tests pass.
* The live application still requests Keychain access.
* The legacy Keychain fallback still exists.
* Clear does not remove Keychain material.
* The React screen fails closed and shows only `unavailable`.
* No words were returned to React.

## Strong inference

The live recovery command is reaching:

```rust
pending_factor == None
```

and therefore calling:

```rust
run_desktop_recovery_ceremony_once(...)
```

which performs the Keychain unseal. The current code explicitly has this fallback.

## Not yet proven

Why the pending slot is empty.

Possible explanations that must be tested rather than assumed:

### Possibility A — process restart

The Tauri Rust process may have restarted between creation and recovery.

Because the pending factor is memory-only, any restart erases it.

Potential restart sources:

* manually quitting/relaunching;
* Tauri development watcher restart;
* rebuilding/recompiling while the app is running;
* crash or runtime replacement;
* running recovery in a different process than creation.

### Possibility B — live command staging failure

The real command may not be retaining the factor even though the lower-level test does.

The current tests do not invoke the real Tauri command pair through one managed `AppState`.

### Possibility C — unexpected clear/replacement

Some production call path may be clearing the pending session before recovery.

Known production clear locations must be inventoried.

### Possibility D — Keychain prompt originates during write/update

Because Passport clear does not delete old Keychain entries, the next creation updates fixed existing entries. macOS could request authorization while updating an entry created by another unsigned development executable.

The screenshot timing favors the recovery-read explanation, but this must be instrumented.

---

# 15. Critical design weakness uncovered

The current design divides one security ceremony across two public commands:

```text
Command 1: create Passport and stage factor
React persistence/state transition
Command 2: request recovery phrase
```

That creates a lifecycle gap.

A recovery phrase that exists only in native memory cannot safely depend on:

* React preserving timing;
* the Tauri process staying alive;
* development watchers not restarting;
* no other command clearing state;
* the next command receiving the exact same managed state.

The unit tests only proved the helper behavior, not that lifecycle.

The stronger design is to make creation and first recovery display one native orchestration operation.

---

# 16. Recommended next-session implementation order

## Step 1 — add redacted runtime observability

Before another architectural patch, add focused redacted facts that distinguish the paths without exposing secrets.

Suggested internal facts:

```text
pending_recovery_staged
pending_recovery_present_at_recovery_start
pending_recovery_used
platform_unseal_attempted
platform_unseal_used
process_instance_match
recovery_source = pending_native | platform_store | none
```

These may be:

* internal outcome booleans;
* development-only redacted terminal markers;
* test-only probes;
* a redacted development DTO field.

Never expose:

```text
factor bytes
phrase words
fingerprint value
PIN
VMK
sealed secret
Keychain data
```

The first focused manual check should conclusively print:

```text
CREATE_PENDING_STAGED=YES/NO
RECOVERY_PENDING_PRESENT=YES/NO
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED=YES/NO
```

## Step 2 — test the real command-to-command path

Add a focused Rust orchestration test that uses:

```text
one AppState
one pending session store
public create command inner logic
public recovery command inner logic
fake platform sealer that fails or panics if unseal is called
```

The test must prove:

```text
create command returns created_locked
same AppState pending slot is populated
recovery command consumes that slot
platform unseal calls = 0
native recovery surface calls = 1
```

The current lower-level tests are insufficient.

## Step 3 — combine creation and first recovery ceremony

Preferred architecture:

```text
native Passport create-and-recovery orchestration
```

One native command should own:

1. native PIN request;
2. factor and VMK generation;
3. encrypted vault preparation;
4. platform sealing;
5. atomic vault persistence;
6. immediate native phrase display;
7. acknowledgement recording;
8. redacted final DTO.

The React side should receive one of:

```text
created_locked_and_recovery_acknowledged
created_locked_recovery_cancelled
created_locked_recovery_unavailable
create_rejected
cancelled
unavailable
```

The first recovery phrase should not depend on a second Tauri command.

The separate recovery command may remain for controlled existing-vault behavior, but it should not be the normal first-run creation path.

## Step 4 — define interruption behavior

The combined command must explicitly handle:

```text
user cancels phrase dialog
native phrase surface unavailable
application crash during ceremony
Keychain write succeeds but vault write fails
vault write succeeds but acknowledgement write fails
```

Do not silently leave onboarding claiming success.

A safe posture may require a state such as:

```text
created_locked_recovery_pending
```

but it must be native truth, not only React state.

## Step 5 — implement platform-material cleanup

The current `NativePlatformSealer` interface only exposes seal/unseal.

A cleanup path is required for disposable Passport deletion.

Possible approaches:

* extend the upstream `svc-passport` platform-storage contract with a purge operation;
* add a CrabLink-owned platform-material lifecycle trait;
* add a macOS-specific deletion owner alongside the sealer.

Required macOS behavior:

```text
delete recovery-root Keychain entry
delete device-key Keychain entry
verify both absent
then report platform_material_mutated = true
```

The clear command must not report a fully clean Passport state while Keychain compartments remain.

This step may require changes in both:

```text
CrabLink
RustyOnions svc-passport
```

That decision must be made from the current trait definitions before patching.

## Step 6 — separate development and release Keychain namespaces

A development executable that is rebuilt repeatedly should not collide indefinitely with production-style fixed Keychain entries.

Review a separate development service identifier, for example conceptually:

```text
release service
development service
test service
```

Do not hardcode a final name until migration and compatibility behavior are designed.

## Step 7 — rerun focused verification

Minimum Rust lane:

```text
cargo fmt --manifest-path src-tauri/Cargo.toml

cargo test \
  --manifest-path src-tauri/Cargo.toml \
  --lib \
  'passport_recovery_phrase_runtime::tests::phase11b_'

cargo test \
  --manifest-path src-tauri/Cargo.toml \
  --test phase15l_macos_keychain_platform_sealer

cargo test \
  --manifest-path src-tauri/Cargo.toml \
  --test phase15w_desktop_passport_create_command_bridge

cargo test \
  --manifest-path src-tauri/Cargo.toml \
  --test phase15aa_desktop_clear_command_bridge

cargo test \
  --manifest-path src-tauri/Cargo.toml \
  --test phase6b2b2b2b_public_recovery_command_wiring

cargo check \
  --manifest-path src-tauri/Cargo.toml
```

Then run the new real orchestration test.

## Step 8 — controlled macOS manual acceptance

Only after the automated lane is green:

```text
clear disposable incomplete Passport
verify vault absent
verify platform compartments absent
restart patched Tauri process
create new disposable Passport
enter native disposable PIN
native 24-word window appears immediately
no macOS login password prompt
acknowledge phrase
continue onboarding
```

Do not regenerate codebundles, modify Rust source, or trigger a Tauri restart between creation and the recovery ceremony during this test.

---

# 17. Files confirmed changed during this onboarding session

## Scripts

```text
apps/crablink-tauri/scripts/onboarding_phase11a_desktop_automated_acceptance.sh
apps/crablink-tauri/scripts/onboarding_phase11b_desktop_manual_acceptance.sh
apps/crablink-tauri/scripts/onboarding_phase6f_os_csprng_recovery_acceptance.sh
```

## Onboarding frontend/model/tests

```text
apps/crablink-tauri/src/onboarding/OnboardingCompletionStep.jsx
apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx
apps/crablink-tauri/src/onboarding/onboardingHomeHandoff.js
apps/crablink-tauri/src/onboarding/onboardingHomeHandoff.test.mjs
apps/crablink-tauri/src/onboarding/onboardingDesktopFinalAcceptance.test.mjs
apps/crablink-tauri/src/onboarding/onboardingDevArtifactInventory.source.test.mjs
apps/crablink-tauri/src/onboarding/onboardingPhase10Defaults.source.test.mjs
apps/crablink-tauri/src/onboarding/onboardingDevelopmentReset.js
apps/crablink-tauri/src/onboarding/onboardingDevelopmentReset.test.mjs
apps/crablink-tauri/src/onboarding/PassportCreateStep.jsx
apps/crablink-tauri/src/onboarding/RecoveryCeremonyStep.jsx
```

## Shell/home/profile/default cleanup

```text
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx
apps/crablink-tauri/src/app/shell/PassportChip.jsx
apps/crablink-tauri/src/app/shell/passportDrawerDevGate.js
apps/crablink-tauri/src/app/shell/passportDrawerDevGate.test.mjs
apps/crablink-tauri/src/pages/home/HomePage.jsx
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/shared/profile/publicProfileCache.js
apps/crablink-tauri/src/shared/utils/devPassportSessions.js
```

Some default/profile cleanup may also have touched related profile and settings sources. Confirm with repository diff at the beginning of the next session rather than relying only on this reconstructed list.

## Native Rust

```text
apps/crablink-tauri/src-tauri/src/passport_pending_recovery_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_vault_create_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_create_command_runtime.rs
apps/crablink-tauri/src-tauri/src/passport_recovery_phrase_runtime.rs
apps/crablink-tauri/src-tauri/src/commands/passport.rs
apps/crablink-tauri/src-tauri/src/state.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

No RustyOnions source was modified.

---

# 18. Security invariants that remain intact

Despite the failed manual recovery ceremony, the implementation still fails closed.

Confirmed posture:

```text
PIN_THROUGH_WEBVIEW=NO
RECOVERY_WORDS_THROUGH_WEBVIEW=NO
RECOVERY_ROOT_EXPORTED=NO
PRIVATE_KEY_EXPORTED=NO
VMK_EXPORTED=NO
SECRET_LOGGING=NO
FAKE_RECOVERY_PHRASE=NO
FAKE_ACKNOWLEDGEMENT=NO
USERNAME_REGISTRY_MUTATION=NO
CAPABILITY_ISSUANCE=NO
WALLET_MUTATION=NO
LEDGER_MUTATION=NO
```

The React page showed only:

```text
created_locked
recovery_phrase_required
failure
unavailable
```

This is the correct failure posture. The problem is usability and lifecycle integration, not a secret leak.

---

# 19. Known state on disk at session end

There is currently a newly created test Passport in an incomplete state.

Observed state:

```text
Native Passport vault = PRESENT
Passport state = created_locked
Onboarding state = recovery_phrase_required
Recovery acknowledgement = NOT COMPLETE
Recovery words = NOT SHOWN
Ceremony = unavailable
Keychain authorization = DENIED / NOT PROVIDED
```

Do not treat this Passport as successfully onboarded.

It is disposable test material.

Do not continue clicking **Retry native recovery ceremony** because the current fallback will continue requesting Keychain access.

Do not enter the Mac login password.

The next session should decide whether to keep this incomplete vault briefly for instrumentation or clear it before the next controlled create test.

---

# 20. First action for the next session

Start with source inspection and runtime-path instrumentation—not another blind rewrite.

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

grep -RIn \
  -e "passport_pending_recovery_session" \
  -e "stage_recovery_factor" \
  -e "take_pending_recovery_factor" \
  -e "restore_recovery_factor" \
  -e "clear_pending_recovery_factor" \
  -e "run_desktop_recovery_ceremony_once_with_pending_recovery" \
  -e "run_desktop_recovery_ceremony_once(" \
  src-tauri/src
```

Then inspect the first live boundary to patch:

```text
passport_create
→ pending slot staged?
→ process instance unchanged?
→ passport_recovery_ceremony
→ pending slot present?
→ fallback invoked?
```

The immediate next patch should add the redacted proof of that path and a command-level integration test. It should not yet claim that the Keychain prompt has been fixed.

---

# 21. Resume summary

```text
ACTIVE_BUILDPLAN=ONBOARDING_BUILDPLAN
CURRENT_PHASE=11B
PHASE11A_AUTOMATED_ACCEPTANCE=GREEN
PHASE11B_MANUAL_ACCEPTANCE=RED
BLOCKER=MACOS_KEYCHAIN_PROMPT_DURING_RECOVERY
PASSPORT_CREATE=CREATED_LOCKED
RECOVERY_PHRASE_DISPLAYED=NO
PENDING_RECOVERY_V2_SOURCE=APPLIED
PENDING_RECOVERY_UNIT_TESTS=GREEN
LIVE_PENDING_RECOVERY_PATH=NOT_PROVEN
LIVE_RUNTIME_USED_KEYCHAIN_FALLBACK=STRONGLY_INDICATED
KEYCHAIN_PLATFORM_MATERIAL_CLEAR=NOT_IMPLEMENTED
CURRENT_TEST_PASSPORT=INCOMPLETE_AND_DISPOSABLE
NEXT_WORK=REDACTED_RUNTIME_INSTRUMENTATION_AND_ATOMIC_CREATE_RECOVERY_ORCHESTRATION
PHASE12=NOT_STARTED
RUSTYONIONS_CHANGED=NO
```


### END NOTE - JULY 27 2026 - 00:55 CST



### BEGIN NOTE - JULY 27 2026 - 23:15 CST


# CrabLink Onboarding Buildplan — Exhaustive Carry-Over Notes

**Session date:** July 27–28, 2026  
**Primary repository changed:** `/Users/mymac/Desktop/crablink/apps/crablink-tauri`  
**Primary plan:** `ONBOARDING_BUILDPLAN.md`  
**Current posture:** Desktop onboarding is functionally green, but Phase 11 still needs formal closeout and platform-secret deletion. Phase 12 is not complete.  
**Do not return to Passport Native Phase 16 yet.**

---

## 1. Executive status

This session converted CrabLink desktop onboarding into a real native-backed local-custody Passport lifecycle:

```text
clean launch
→ username draft
→ native Passport create
→ native PIN
→ native recovery phrase
→ acknowledgement
→ native PIN confirmation
→ optional profile
→ home
→ quit
→ reopen
→ shell stays closed while Passport is locked
→ native PIN prompt
→ operational unlock confirmed
→ shell opens
```

Implemented behavior now includes:

- user-entered local username draft;
- no baked `@skinnycrabby`, Passport A/B, or visitor identity in the normal flow;
- native-only Passport PIN creation;
- real native recovery-phrase display;
- one-time recovery acknowledgement;
- native-only PIN confirmation;
- optional public profile draft or skip;
- handoff to `crab://home`;
- a restart lock gate that prevents the normal CrabLink shell from mounting until the native Passport is operationally unlocked;
- a stable locally signed macOS app for Keychain acceptance testing;
- an isolated signed-acceptance username-availability bypass that does not expose the broad development shell.

The difficult core behavior is in place. Remaining work is formal closure, platform-secret cleanup, and cross-platform contract extraction.

---

## 2. Buildplan status

### Phases 0–10

Treat Phases 0–10 as implemented/green unless a new regression proves otherwise.

These cover:

- dev artifact inventory and quarantine;
- onboarding state model;
- redacted persisted onboarding state;
- clean-start route gate;
- username entry and syntax validation;
- desktop Passport creation handoff;
- recovery ceremony;
- native PIN confirmation;
- profile save/skip;
- completion and home handoff;
- removal/quarantine of baked development identities from normal user flow.

### Phase 11 — Desktop final acceptance

**Current status: functionally green, not formally closed.**

Do not print or document:

```text
ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN
```

until both are complete:

1. Passport clear deletes app-owned platform secret material, not only the encrypted vault and memory sessions.
2. One final signed end-to-end acceptance records the full clean-create-restart-unlock-clear-clean sequence.

### Phase 12 — Cross-platform onboarding contract

**Current status: not completed.**

Phase 12 must freeze the shared onboarding contract for desktop, Android TV, Android, iOS, tablet, and future clients.

Acceptance remains:

```text
ONBOARDING_CROSS_PLATFORM_CONTRACT=GREEN
```

The whole onboarding buildplan is not complete until Phase 12 is green.

---

## 3. Repository and crate scope

### Repository changed

Only the CrabLink repository was intentionally changed, primarily:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tauri
```

### RustyOnions

RustyOnions crates were compiled as dependencies, including `svc-passport`, but were not intentionally modified.

Repeated patch banners reported:

```text
RUSTYONIONS_CHANGED=NO
```

Verify this next session with repository status rather than relying only on the banner.

### Machine-local changes outside Git

The following were changed on the development Mac and are not repository files:

- self-signed code-signing certificate created in the macOS login Keychain;
- certificate Code Signing trust set to Always Trust;
- `/usr/bin/codesign` granted persistent private-key access with **Always Allow**;
- stale CrabLink Keychain Passport items manually deleted during testing.

These machine-local changes do not travel through GitHub.

---

## 4. Important source changes

Inspect the final Git diff next session, but these files were created or changed.

### Native/Rust

#### `src-tauri/src/onboarding_phase11b_command_path_tests.rs`

Added focused command-path proofs using one managed `AppState`.

Tests prove:

- create and recovery use the same process and native state;
- recovery material is staged in native memory;
- recovery display consumes pending recovery material without platform unseal;
- missing pending recovery fails closed;
- missing pending recovery does not enter Keychain fallback;
- first-run operational PIN confirmation uses pending operational material;
- first-run operational PIN confirmation does not read Keychain.

Important markers:

```text
CREATE_PENDING_STAGED=YES
CREATE_OPERATIONAL_PENDING_STAGED=YES
RECOVERY_PENDING_PRESENT=YES
RECOVERY_PENDING_USED=YES
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED=NO
OPERATIONAL_PENDING_PRESENT=YES
OPERATIONAL_PENDING_USED=YES
OPERATIONAL_PLATFORM_UNSEAL_ATTEMPTED=NO
```

#### `src-tauri/src/passport_recovery_phrase_runtime.rs`

Interrupted recovery changed from:

```text
pending recovery absent
→ fallback to platform unseal
→ unsigned debug app asks Keychain for recovery-root
```

to:

```text
pending recovery absent
→ fail closed as unavailable
→ no platform unseal
→ no recovery-root Keychain prompt
```

Added redacted markers:

```text
RECOVERY_PROCESS_ID
RECOVERY_PENDING_PRESENT
RECOVERY_PENDING_USED
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED
RECOVERY_INTERRUPTED_HANDOFF
```

A release-only unused-variable warning was repaired.

#### `src-tauri/src/passport_pending_operational_runtime.rs`

New native-only process-memory store for the operational platform factor created during first-run Passport creation.

Responsibilities:

- stage operational factor;
- take pending operational factor;
- restore factor after failed PIN attempt;
- clear factor;
- report only boolean presence;
- never serialize or return secret material to React.

Security posture:

- process memory only;
- no WebView custody;
- no local storage;
- no secret-byte logs;
- cleared on success, clear, replacement, or process exit.

#### `src-tauri/src/passport_vault_create_runtime.rs`

Added create path that hands off both generated platform factors:

- recovery-root factor;
- operational/device-key factor.

The path still seals both into platform storage for restart persistence while retaining first-run copies in native memory.

#### `src-tauri/src/passport_create_command_runtime.rs`

Added create command path using both pending stores.

Current first-run posture:

```text
native create PIN
→ create real encrypted vault
→ stage recovery factor
→ stage operational factor
→ seal persistent factors
→ return redacted created_locked status
```

Added:

```text
CREATE_OPERATIONAL_PENDING_STAGED
```

#### `src-tauri/src/passport_operational_unlock_runtime.rs`

Added operational unlock using a native-only retained operational factor directly.

This allows same-process first-run PIN confirmation without rereading Keychain.

The normal post-restart platform-sealer unlock remains available.

#### `src-tauri/src/passport_operational_command_runtime.rs`

Added orchestration that:

- requests PIN from native surface;
- checks for pending operational factor;
- uses it when present;
- falls back to platform storage after restart;
- restores pending factor after rejected/wrong PIN;
- returns only redacted DTO state.

Added:

```text
OPERATIONAL_UNLOCK_PROCESS_ID
OPERATIONAL_PENDING_PRESENT
OPERATIONAL_PENDING_USED
OPERATIONAL_PLATFORM_UNSEAL_ATTEMPTED
```

#### `src-tauri/src/commands/passport.rs`

Updated public command wiring so:

- Passport create uses both pending stores;
- operational unlock uses pending operational memory when available;
- Passport clear drops pending recovery and pending operational memory.

Platform-secret deletion is still not integrated into clear.

#### `src-tauri/src/state.rs`

Added pending operational session store to managed `AppState`.

#### `src-tauri/src/lib.rs`

Registered the new native module and focused Phase 11B tests.

### Existing native files that remain central

#### `src-tauri/src/passport_pending_recovery_runtime.rs`

Native-only recovery-factor store.

Do not weaken:

- no serialization;
- no React;
- no raw secret output;
- consume on acknowledgement;
- restore on safe ceremony cancellation;
- clear on Passport clear.

#### `src-tauri/src/passport_platform_sealer.rs`

Current macOS Keychain adapter.

Known service/accounts:

```text
service:
com.rustyonions.crablink.native-passport.v1

accounts:
recovery-root
device-key
```

Current backend supports:

```text
set_secret
get_secret
```

It does not yet support real delete/purge behavior.

This is the largest remaining Phase 11 gap.

### React/onboarding

#### `src/onboarding/startupPassportUnlockGate.js`

New pure model/orchestration layer.

Behavior:

- read native Passport status;
- if already operationally unlocked, admit shell;
- if locked/stored_locked, call fixed no-argument native unlock;
- reread native status;
- admit shell only after confirmed `operational_unlocked`;
- fail closed on cancellation, rejection, malformed DTO, no Passport, or unavailable state.

#### `src/onboarding/StartupPassportUnlockGate.jsx`

New visual/runtime gate.

Completed onboarding no longer automatically mounts the shell.

```text
completed onboarding
→ startup native status check
→ locked triggers native PIN prompt
→ shell remains unmounted
→ post-unlock status reread
→ shell mounts only after operational_unlocked
```

Contains no PIN input.

Uses a shared in-flight attempt guard so React Strict Mode does not create duplicate native prompts.

#### `src/onboarding/startupPassportUnlockGate.test.mjs`

Proves:

- already-unlocked status skips prompt;
- locked status invokes one unlock;
- unlock requires unlocked-status reread;
- cancel fails closed;
- unsafe DTOs fail closed;
- React has no PIN input or dynamic invoke;
- completed onboarding wraps shell with startup gate.

#### `src/onboarding/OnboardingRouteGate.jsx`

Completed onboarding changed from direct `children` return to:

```jsx
<StartupPassportUnlockGate>
  {children}
</StartupPassportUnlockGate>
```

Also gained explicit signed-acceptance username flag.

#### `src/onboarding/WelcomeUsernameStep.jsx`

Separated:

1. username-availability bypass;
2. broad development-shell bypass.

Signed acceptance may expose only username availability bypass.

Broad shell bypass remains development-only.

#### `src/onboarding/signedUsernameAcceptanceFlag.test.mjs`

Proves:

- `VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE` is explicit;
- signed flag may enable username availability bypass;
- signed flag does not enable development shell;
- official builds without flag are unchanged.

---

## 5. Problems encountered and resolutions

### A. Tauri Cargo checks failed before Rust compilation

Observed error:

```text
The tauri dependency features do not match tauri.conf.json.
Run tauri dev/build or remove macos-private-api.
```

Cause:

- `macos-private-api` enabled;
- direct Cargo command used base config;
- macOS overlay enabling `app.macOSPrivateApi` omitted.

Correct pattern:

```bash
TAURI_CONFIG="$(
  cat src-tauri/tauri.macos.dev-media.conf.json
)" cargo check   --manifest-path src-tauri/Cargo.toml
```

Use same environment for direct Cargo tests/checks.

Do not call this a Rust compiler failure; it occurs in Tauri’s build script first.

### B. Old incomplete Passport caused recovery Keychain prompt

Markers:

```text
RECOVERY_PENDING_PRESENT=NO
RECOVERY_PENDING_USED=NO
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED=YES
```

Cause:

- Passport created before pending-memory handoff or app restarted;
- one-time recovery factor absent;
- runtime fell back to Keychain.

Resolution:

- removed Keychain recovery redisplay fallback;
- missing pending recovery fails closed;
- tests prove no platform unseal.

Future UX:

Replace misleading “Retry native recovery ceremony” with interrupted-setup/reset guidance when factor is gone.

### C. First-run PIN confirmation caused device-key Keychain prompt

Cause:

- creation retained only recovery factor;
- PIN confirmation entered normal post-restart unlock path;
- device-key read from Keychain.

Resolution:

- added pending operational memory;
- create stages both factors;
- first-run PIN confirmation consumes retained operational factor;
- wrong PIN restores it;
- no first-run platform unseal.

### D. Post-restart unlock showed authenticity warning

Runtime after restart correctly showed:

```text
OPERATIONAL_PENDING_PRESENT=NO
OPERATIONAL_PENDING_USED=NO
OPERATIONAL_PLATFORM_UNSEAL_ATTEMPTED=YES
```

Persistent platform storage is expected after restart.

The problem was:

```text
The authenticity of "crablink-tauri" cannot be verified.
```

Diagnosis:

```text
0 valid code-signing identities
debug binary unsigned
release app unsigned
no Tauri signing identity
```

Resolution:

- created local self-signed Code Signing identity;
- trusted it;
- signed release `.app`;
- verified stable designated requirement.

### E. Completed onboarding opened shell before PIN unlock

Cause:

- completion state admitted normal shell;
- native operational session reset to locked after restart;
- route gate did not require `operational_unlocked`.

Resolution:

- startup Passport unlock gate;
- completed onboarding no longer directly mounts shell;
- native status/unlock checked first.

### F. Signed release hid username dev bypass

Cause:

- `import.meta.env.DEV` is false in release;
- live username availability not connected;
- normal release correctly hid bypass.

Resolution:

```text
VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1
```

This enables only username availability bypass, not development shell.

### G. Initial signed-acceptance patch failed but build continued

Failure:

```text
WELCOME_DEVELOPMENT_SHELL_ALLOWED_REPLACEMENTS:
EXPECTED=2
FOUND=3
```

Patch aborted transactionally.

Evidence:

```text
signedUsernameAcceptanceFlag.test.mjs missing
```

Subsequent build was old source.

Resolution:

- corrected patch for all three occurrences;
- added post-write checks;
- user confirmed signed acceptance bypass worked.

Lesson:

```text
Never continue to build after patch says RED.
```

Verify expected file/marker before interpreting build success.

---

## 6. Verification results achieved

### Recovery no-fallback

```text
RECOVERY_PENDING_PRESENT=NO
RECOVERY_PENDING_USED=NO
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED=NO
RECOVERY_INTERRUPTED_HANDOFF=YES
```

### Same-process recovery

```text
CREATE_PENDING_STAGED=YES
RECOVERY_PENDING_PRESENT=YES
RECOVERY_PENDING_USED=YES
RECOVERY_PLATFORM_UNSEAL_ATTEMPTED=NO
```

### Same-process operational confirmation

```text
CREATE_OPERATIONAL_PENDING_STAGED=YES
OPERATIONAL_PENDING_PRESENT=YES
OPERATIONAL_PENDING_USED=YES
OPERATIONAL_PLATFORM_UNSEAL_ATTEMPTED=NO
```

### Native regressions passed

- Phase 11B pending recovery tests;
- Phase 11B command-path test;
- missing-pending fail-closed test;
- Phase 15V operational unlock acceptance;
- Phase 15W Passport create bridge;
- Phase 15AA clear bridge;
- public recovery command wiring;
- Tauri Cargo check with correct config;
- release Cargo check with correct config.

### React regressions passed

- startup unlock gate;
- onboarding route gate;
- Passport adapter;
- welcome/username;
- PIN React boundary;
- production Vite build;
- signed-acceptance Vite build.

### Signed app verification

Path:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tauri/
src-tauri/target/release/bundle/macos/CrabLink.app
```

Verified:

```text
Identifier=com.rustyonions.crablink
Authority=CrabLink Local Development Code Signing
valid on disk
satisfies Designated Requirement
```

Designated requirement:

```text
identifier "com.rustyonions.crablink"
and certificate root =
43cd01d5bca527b6943066e44255083f63a5df8e
```

Notarization skipped because this is local development; expected.

---

## 7. Machine-local certificate details

### Identity

```text
CrabLink Local Development Code Signing
```

Fingerprint:

```text
43CD01D5BCA527B6943066E44255083F63A5DF8E
```

### Location

macOS **login** Keychain.

Not stored in repository.

### Trust/access

- Code Signing trust: Always Trust.
- `/usr/bin/codesign` private-key access: Always Allow.

Expected build prompt:

```text
codesign wants to sign using key
"CrabLink Local Development Code Signing"
```

Bad runtime prompt:

```text
crablink-tauri wants to use confidential information...
authenticity cannot be verified
```

### GitHub safety

Certificate/private key will not be uploaded unless manually exported into repo.

Never export into project:

```text
.p12
.pfx
.pem
.key
private key files
```

Identity name and Vite flag are not secrets.

Other contributors can run unsigned builds or use their own local certificate.

### Remove later

Do not remove during remaining Phase 11 acceptance.

When no longer needed:

1. Keychain Access.
2. login Keychain.
3. My Certificates.
4. Delete `CrabLink Local Development Code Signing` and associated private key.
5. Verify `security find-identity -v -p codesigning` no longer lists it.

### Official release later

Before public distribution:

- Apple Developer account;
- Developer ID Application or App Store signing;
- intentional hardened runtime/entitlements;
- notarization;
- staple where appropriate;
- update identity continuity;
- no signed-acceptance Vite flag in official commands;
- never ship self-signed build as official app.

Users must never create certificates or configure Keychain Access.

---

## 8. Commands

### Unsigned development

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

Use for rapid development, not final Keychain identity restart acceptance.

### Direct Cargo check

```bash
TAURI_CONFIG="$(
  cat src-tauri/tauri.macos.dev-media.conf.json
)" cargo check   --manifest-path src-tauri/Cargo.toml
```

Release:

```bash
TAURI_CONFIG="$(
  cat src-tauri/tauri.macos.dev-media.conf.json
)" cargo check   --release   --manifest-path src-tauri/Cargo.toml
```

### Signed acceptance build

```bash
VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1 APPLE_SIGNING_IDENTITY="CrabLink Local Development Code Signing" npm run tauri:build --   --config src-tauri/tauri.macos.dev-media.conf.json   --bundles app
```

### Launch exact signed bundle

```bash
open -na   "/Users/mymac/Desktop/crablink/apps/crablink-tauri/src-tauri/target/release/bundle/macos/CrabLink.app"
```

### Verify identity

```bash
/usr/bin/security find-identity -v -p codesigning
```

### Verify app

```bash
/usr/bin/codesign   --verify   --deep   --strict   --verbose=4   "/Users/mymac/Desktop/crablink/apps/crablink-tauri/src-tauri/target/release/bundle/macos/CrabLink.app"
```

---

## 9. Security invariants

### Local custody

- no cloud login;
- no cloud-stored Passport secret;
- no server custody;
- no backend-issued identity as source of truth.

### PIN

- no React PIN input;
- no PIN WebView command argument;
- native secure surface only;
- React receives redacted state only.

### Recovery

- real entropy is critical;
- no deterministic/patterned/repeated real phrases;
- words remain native-only;
- React does not receive/store/log/render words;
- one-time display;
- interrupted display cannot silently unseal recovery-root;
- missing pending recovery fails closed.

### Operational unlock

- first-run same-process uses pending operational memory;
- post-restart uses platform storage;
- shell unmounted until native `operational_unlocked`;
- cancellation/rejection/malformed DTO remains locked.

### Platform storage

- keep Keychain;
- do not allow arbitrary apps;
- stable signing fixes identity;
- clear must purge app-owned platform items.

### Signed acceptance flag

```text
VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1
```

- local acceptance only;
- username availability bypass only;
- no development shell;
- absent from official production builds;
- does not claim username ownership.

### Authority boundaries

Onboarding must not perform:

- wallet calls;
- ledger mutation;
- ROC mint/burn;
- capability issuance;
- paid access;
- backend-confirmed username/profile claims.

---

## 10. Remaining Phase 11 work

### Priority 1 — Real platform-secret deletion

Current clear removes:

- encrypted local vault;
- operational session;
- pending recovery;
- pending operational;
- onboarding/display state through reset flow.

It does not yet prove removal of:

```text
service:
com.rustyonions.crablink.native-passport.v1

accounts:
recovery-root
device-key
```

Manual deletion was used during acceptance; that is not final product behavior.

#### Implementation posture

Inspect code first. Do not guess whether deletion belongs in:

- `NativePlatformSealer`;
- CrabLink-local cleanup trait;
- dedicated platform-material store;
- extended backend.

Prefer smallest design that:

- keeps authority clean;
- supports macOS now;
- has truthful Windows/Linux posture;
- does not fake success when unsupported;
- lets Passport clear own lifecycle.

#### Tests required

1. Both entries present and deleted.
2. Both already absent; idempotent.
3. Recovery-root deletion succeeds, device-key fails.
4. Device-key succeeds, recovery-root fails.
5. Backend error redacted.
6. No secret/reference bytes in errors/debug.
7. Deliberate clear ordering.
8. Public DTO redacted.
9. Final native status follows chosen safe contract.
10. Signed macOS acceptance verifies both accounts absent.

#### Partial-failure contract must be decided

Questions:

- If vault removed but Keychain delete fails, public state?
- Can clear retry only remaining items?
- Delete before or after vault removal?
- What is safe state under partial deletion?

Do not claim all-or-nothing across independent OS operations without proof.

### Priority 2 — Formal Phase 11 acceptance

After deletion is green:

1. Confirm signed bundle/identity.
2. Confirm stale vault absent.
3. Confirm both Keychain items absent.
4. Launch signed acceptance app.
5. Welcome.
6. No baked username.
7. No Passport A/B.
8. No visitor-b.
9. Enter disposable username.
10. Use explicit signed availability bypass.
11. Broad development shell absent.
12. Create Passport.
13. Native create PIN.
14. Native recovery phrase.
15. Record disposable phrase/fingerprint.
16. Acknowledge.
17. Native PIN confirmation.
18. Save/skip profile.
19. Home.
20. Quit.
21. Reopen exact signed app.
22. Shell hidden.
23. Native PIN automatically.
24. Correct PIN.
25. No authenticity warning.
26. Status operational unlocked.
27. Shell opens.
28. Clear via app.
29. Vault absent.
30. recovery-root Keychain item absent.
31. device-key item absent.
32. Pending sessions dropped.
33. Ack reset.
34. Welcome again.
35. Final tests/build/check.
36. Only then:

```text
ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN
```

### Priority 3 — Interrupted-recovery UX

Safe behavior is correct, label is misleading.

Future message:

```text
Recovery setup was interrupted.
This recovery phrase cannot be redisplayed.
Clear this incomplete Passport and create a new one.
```

Do not reintroduce recovery-root unseal for Retry.

---

## 11. Phase 12 plan

After formal Phase 11 closeout, begin Phase 12.

### Goal

Freeze portable onboarding model for:

- desktop;
- Android TV;
- Android;
- iOS/iPadOS;
- future clients.

### Shared contract candidates

```text
welcome
username_entry
username_review
passport_create_pending
passport_created_locked
recovery_required
recovery_acknowledged
pin_confirmation_required
profile_optional
completion_pending
completed_locked
completed_operational_unlocked
blocked
```

Reuse actual current names where possible. Do not create a duplicate state machine.

### Shared DTOs

Freeze:

- username syntax/review;
- Passport create result;
- recovery result;
- operational unlock result;
- native status;
- profile draft;
- completion;
- clear/reset.

Forbid:

- PIN;
- recovery words;
- raw factors;
- VMKs;
- root material;
- wallet/ledger claims;
- fake backend authority.

### Platform responsibilities

#### Shared

- local custody;
- transitions;
- redacted results;
- fail closed;
- recovery acknowledgement;
- restart lock;
- clear/reset lifecycle.

#### Desktop

- native modal PIN;
- native recovery surface;
- Keychain/DPAPI/Secret Service;
- shell gate.

#### TV

- remote-friendly username;
- remote focus model;
- local create/import/unlock;
- no default companion-device pairing;
- QR/import optional later;
- no cloud login.

#### Mobile/tablet

- OS secure storage;
- native secure input;
- lifecycle/background lock;
- local import/restore;
- mobile-safe recovery display.

### Tests

- shared transition tests;
- DTO schema tests;
- secret-field rejection;
- platform-adapter contract;
- restart lock;
- clear/reset;
- TV remote input;
- no companion-pairing default;
- no cloud/server custody.

Acceptance:

```text
ONBOARDING_CROSS_PLATFORM_CONTRACT=GREEN
```

---

## 12. Deferred work

Not part of current closure unless explicitly added:

- live username availability;
- production username registry mutation;
- backend-confirmed username/profile;
- real avatar upload;
- cloud login/recovery;
- server custody;
- capability issuance;
- wallet/ledger operations;
- ROC mint/burn;
- paid access;
- Android TV UI implementation;
- Android UI;
- iOS UI;
- public Apple signing/notarization.

Avatar is placeholder/future-gated, not completed upload.

---

## 13. Sequence after onboarding

1. Complete Phase 11.
2. Complete Phase 12.
3. Declare onboarding buildplan complete.
4. Update CrabLink notes/changelog.
5. Update cross-project notes.
6. Regenerate latest CrabLink codebundle.
7. Return to Passport Native Phase 16.
8. Integrate shared Passport model into CrabLink TV.
9. Pause Passport Native if mobile surfaces do not exist.
10. Build Android/iOS foundations.
11. Return to remaining Passport Native phases.
12. Later return to remaining CrabLink TV work.

Do not skip to TV before shared contract freeze.

---

## 14. Pitfalls

- Always use `TAURI_CONFIG` for direct Cargo.
- Do not use unsigned `tauri dev` for final Keychain restart acceptance.
- Distinguish expected codesign prompt from bad runtime authenticity prompt.
- Do not enter Mac password in bad runtime prompt.
- Do not continue after patch RED.
- Verify new file/marker before build.
- Vite env flags are compile-time; rebuild required.
- Quit stale app before opening rebuilt bundle.
- Do not clear non-disposable Passport.
- Do not remove Keychain to hide prompts.

---

## 15. Recommended next-session opening

Confirm pushed repo and current source:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri || return 1

git status --short

for path in   src/onboarding/startupPassportUnlockGate.js   src/onboarding/StartupPassportUnlockGate.jsx   src/onboarding/startupPassportUnlockGate.test.mjs   src/onboarding/signedUsernameAcceptanceFlag.test.mjs   src-tauri/src/passport_pending_operational_runtime.rs   src-tauri/src/onboarding_phase11b_command_path_tests.rs
do
  if [ -f "$path" ]; then
    printf 'PRESENT=%s
' "$path"
  else
    printf 'MISSING=%s
' "$path"
  fi
done

grep -R -n   -E 'RECOVERY_INTERRUPTED_HANDOFF|CREATE_OPERATIONAL_PENDING_STAGED|OPERATIONAL_PENDING_USED|StartupPassportUnlockGate|VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE'   src   src-tauri/src || true
```

Focused baseline:

```bash
node --test   src/onboarding/startupPassportUnlockGate.test.mjs   src/onboarding/signedUsernameAcceptanceFlag.test.mjs   src/onboarding/onboardingRouteGate.test.mjs   src/onboarding/welcomeUsernameStep.test.mjs

npm run build

TAURI_CONFIG="$(
  cat src-tauri/tauri.macos.dev-media.conf.json
)" cargo check   --release   --manifest-path src-tauri/Cargo.toml
```

If green, inspect platform sealer and clear command before patching deletion.

---

## 16. Default next patch

```text
ONBOARDING_PHASE11_PLATFORM_SECRET_CLEAR
```

Strategy:

1. Inventory platform-sealer trait and OS implementations.
2. Inventory clear command ordering.
3. Decide partial-failure contract.
4. Add macOS Keychain delete.
5. Add focused in-memory backend tests.
6. Wire deletion into public clear.
7. Keep DTO redacted.
8. Preserve authority boundaries.
9. Run focused tests.
10. Build signed app.
11. Perform final signed clear/absence acceptance.

Do not start Phase 12 until Phase 11 is closed.

---

## 17. Final checkpoint

```text
ONBOARDING_PHASES_0_TO_10=GREEN
ONBOARDING_PHASE11_CORE_DESKTOP_FLOW=FUNCTIONALLY_GREEN
ONBOARDING_PHASE11_STARTUP_PIN_GATE=GREEN
ONBOARDING_PHASE11_SIGNED_LOCAL_APP=GREEN
ONBOARDING_PHASE11_SIGNED_USERNAME_BYPASS=USER_CONFIRMED_GREEN
ONBOARDING_PHASE11_PLATFORM_SECRET_CLEAR=REMAINING
ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=NOT_YET_FORMALLY_GREEN
ONBOARDING_PHASE12_CROSS_PLATFORM_CONTRACT=REMAINING
ENTIRE_ONBOARDING_BUILDPLAN=NOT_COMPLETE
RUSTYONIONS_CHANGED_IN_THIS_SESSION=NO
NEXT_ACTION=IMPLEMENT_PLATFORM_SECRET_CLEAR_AND_RUN_FINAL_SIGNED_PHASE11_ACCEPTANCE
```

---

## 18. Handoff statement

Continue `ONBOARDING_BUILDPLAN.md`, not Passport Native Phase 16.

Verify the pushed CrabLink checkout and source markers. Then implement real platform-secret deletion for Passport clear, including macOS Keychain `recovery-root` and `device-key` removal, idempotent absence handling, partial-failure behavior, redaction tests, and public clear wiring. Rebuild the locally signed acceptance app and run the full clean onboarding → home → restart automatic native PIN gate → unlock → clear → Keychain absence → clean Welcome walkthrough. Only then declare Phase 11 green. Next complete Phase 12 by freezing the shared cross-platform onboarding state/DTO contract. After the onboarding buildplan is fully green, regenerate notes/codebundle and return to Passport Native Phase 16 for CrabLink TV integration.


# SECONDARY NOTE:
Yes—your instinct about the broad order is right, with one important correction:

**We will not be starting CrabNodes from scratch.** The User Node and Service Node architecture, local reward loop, operator mode, hardening, and private-beta readiness work in `BUILD_PLAN_Z` are already complete and parked. The next node chapter is bringing those parked components into a real, multi-device, end-to-end system and seeing whether they behave outside focused tests. 

## The likely road from here

### 1. Finish desktop onboarding

The immediate path remains:

```text
platform-secret deletion
→ final signed desktop acceptance
→ Phase 12 shared onboarding contract
→ ONBOARDING_BUILDPLAN complete
```

That gives us one authoritative Passport/onboarding model before copying it into other apps.

### 2. Resume Passport Native and CrabLink TV

After onboarding:

```text
Passport Native Phase 16
→ CrabLink TV Passport integration
→ finish remaining CrabLink TV phases
→ install and exercise the Android TV build on hardware
```

The TV app should inherit the same wallet-like model:

```text
local Passport
native/local secret custody
no cloud login
no server-owned identity
no required companion-device pairing
```

The existing project notes already establish that desktop onboarding had to be proven before Phase 16 so TV would not inherit the old development identity assumptions. 

### 3. Build Android and iOS properly

Then we need real application foundations for:

```text
Android phone/tablet
iPhone/iPad
```

This is more than recompiling the desktop app. Each platform needs:

* secure platform storage;
* native PIN or biometric surface;
* process/background locking;
* recovery display;
* Passport create/import/restore;
* deep-link handling;
* app lifecycle handling;
* signed release packaging;
* platform-specific tests.

Once those app shells exist, we return to the remaining Passport Native phases and complete the mobile adapters against real application code.

### 4. Cross-platform product convergence

Before moving deeply into network economics, we should prove one Passport behaves consistently across all four product classes:

```text
desktop
Android TV
Android
iOS
```

That acceptance should cover:

```text
create
restore/import
lock/unlock
restart
profile
crab:// routing
content viewing
receipts
local node status
safe reset
```

This becomes the first genuinely recognizable **CrabLink beta client family**.

---

# Then: CrabNodes

This is where the project stops being “a polished app with an enormous backend” and starts behaving like the actual network.

The node architecture is already defined as two public products:

```text
CrabLink User Node
CrabLink Service Node
```

The User Node is private, passive, outbound-first, amnesia-first, and CrabLink-managed. The Service Node is headless-first, CLI-manageable, content-serving, moderation-aware, persistence-aware, evidence-producing, reward-recipient-bound, and incapable of minting alone. 

So the next node work is not another giant architecture rewrite. It is a **real bring-up and integration campaign**.

## CrabNode bring-up stage

### User Node integration

Prove that an ordinary CrabLink installation can:

```text
start its private User Node safely
verify fetched b3 content
verify receipts/economic replay
remain non-serving
remain loopback-only
hide residential IP information
stop cleanly
respect resource limits
```

This should be nearly invisible to ordinary users. They should not feel like they are administering a server.

### Service Node integration

Prove that a headless Service Node can:

```text
install on a second machine or VPS
initialize a node identity
bind rewards to a Passport/@ account
serve real test content
publish availability evidence
repair content
moderate/block/prune content
restart without losing approved persistent state
operate completely through crabnode CLI
optionally attach to CrabLink Operator Mode
```

The service-node posture is already explicitly CLI-first and UI-optional; the daemon must not depend on CrabLink, a browser, or a desktop environment. 

### First real private network

I would aim for at least:

```text
2–3 Service Nodes
2–5 CrabLink User Nodes
multiple physical machines
at least two different networks
one intentionally unreliable node
one intentionally malicious/faulty test posture
```

Then exercise:

```text
content publish
discovery
fetch
b3 verification
cache
provider failure
repair
moderation
pruning
receipt generation
reward binding
quorum evidence
restart recovery
network partition
```

That is where we will discover whether the system is merely green in isolation or genuinely coherent.

---

# Then: prove QuickChain for real

QuickChain is also **not starting from zero**. A large amount of DTO, boundary, replay, validator, bond, external-posture, and client integration work is already green and parked.

However, much of the currently parked CrabLink QuickChain surface is intentionally display-only and explicitly does not claim live DA truth, archive authority, validator finality, pruning authority, external settlement, or ROX/Solana behavior. 

So after CrabNodes are running, the correct QuickChain progression is:

## 1. Deterministic roots from real data

Start with actual internal data produced by the running private network:

```text
ledger state
wallet receipts
usage events
reward manifests
registry state
service-node evidence
```

Then construct deterministic:

```text
receipt roots
account-state roots
registry roots
accounting roots
reward-manifest roots
epoch roots
```

The project doctrine is already correct:

```text
determinism before distribution
DTOs before roots
roots before validators
proofs before pruning
internal ROC before external anchors
```



## 2. Local checkpoint and offline quorum

Do not jump immediately into a complicated network consensus implementation.

First:

```text
one deterministic checkpoint
→ static validator set
→ offline signatures
→ quorum verification
→ replay rejection
→ fork detection
```

This proves that multiple independent Service Nodes calculate and attest to the same state.

## 3. Private replicated committee

Once roots are stable:

```text
proposal broadcast
signature collection
quorum certificate
conflicting proposal evidence
validator exclusion
challenge handling
epoch transition
```

Then test:

* one node offline;
* one node lagging;
* one node producing mismatched roots;
* duplicate/replayed votes;
* invalid validator-set membership;
* registry rotation;
* reward-recipient rotation;
* partial network partitions.

## 4. Real private ROC loop

Only after that should we perform the full private value-plane demonstration:

```text
Service Node serves content
→ User Nodes verify
→ evidence is collected
→ accounting seals a window
→ reward plan is produced
→ quorum approves the epoch
→ svc-wallet commits the reward intent
→ ron-ledger records durable truth
→ receipt is returned
→ CrabLink displays confirmed ROC only from the receipt
```

No Service Node should be able to issue rewards alone, and no QuickChain UI should fabricate balances or finality.

This will be the moment when we learn how well QuickChain actually works as a system rather than as a set of carefully bounded crates.

---

# Then: finish ROX Anchor on private Solana testnet

Your proposed order is good here: **prove the internal network first, then finish the external anchor path.**

ROX Anchor is already through BUILD_PLAN4 Phase 9. Phases 0–9 are green, leaving Phases 10–15. The remaining lane is primarily actual private-testnet failure testing, authority drills, RustyOnions handoff, CrabLink display, and final private-testnet closeout—not building the project from nothing. 

The likely remaining progression is:

```text
Phase 10:
actual negative drills against deployed testnet state

Phase 11:
halt, recovery, authority separation,
key-rotation and upgrade-authority drills

Phase 12:
RustyOnions dry-run handoff

Phase 13:
CrabLink display-only private-testnet status

later phases:
full reconciliation, final acceptance,
parking of private/testnet posture
```

Then run the complete controlled demonstration:

## ROC → ROX test-only path

```text
internal ROC-side intent/evidence
→ deterministic proof package
→ ROX Anchor proof validation
→ coordinator decision
→ relayer simulation
→ explicitly approved capped testnet send
→ Solana test-only mint/account change
→ RPC readback
→ redacted receipt reconciliation
```

## ROX → ROC test-only path

```text
test-only ROX burn/finalization evidence
→ RPC proof
→ deterministic review
→ coordinator decision
→ dry-run ROC release intent
→ no direct internal ROC mutation
```

The key separation remains:

```text
RustyOnions:
internal ROC economy and ledger truth

ROX Anchor:
controlled ROC ↔ ROX proof and Solana state path
```

The existing plans explicitly keep the private beta free of a public bridge, staking, liquidity, exchange behavior, or public mint/burn. A later production-launch plan is still required for mainnet, public bridge settlement, official ROX mint/burn, audits, monitoring, and authority controls. 

---

# What “beta” should mean

There are really three increasingly strong beta milestones.

## Beta A — Product beta

```text
desktop works
TV works
Android works
iOS works
Passport works
onboarding works
content routes work
local profile works
receipts display truthfully
```

We are genuinely close to this.

## Beta B — Decentralized private beta

```text
real User Nodes
real Service Nodes
multi-machine content serving
verification and repair
privacy controls
moderation
reward binding
internal ROC receipt loop
small controlled operator group
```

A lot of the code exists, but this still needs field integration and soak testing.

## Beta C — Full private economic/testnet demonstration

```text
CrabNodes running
QuickChain checkpoint/quorum working
internal ROC loop working
ROX Anchor on private Solana testnet
test-only ROC ↔ ROX evidence flows
negative and recovery drills green
```

That would be the first demonstration of almost the entire vision operating together.

---

# My recommended master sequence

```text
1. Finish Onboarding Phase 11
2. Finish Onboarding Phase 12
3. Passport Native Phase 16
4. Finish CrabLink TV
5. Build Android app
6. Build iOS app
7. Finish remaining Passport Native mobile phases
8. Cross-platform CrabLink acceptance
9. Activate User Node integration
10. Activate Service Node/crabnode integration
11. Run multi-machine CrabNode private network
12. Feed real node/receipt data into QuickChain roots
13. Bring up static quorum and checkpoints
14. Run private ROC reward loop end to end
15. Run QuickChain chaos/partition/replay drills
16. Finish ROX Anchor Phases 10–15
17. Deploy/run test-only private Solana testnet flows
18. Connect CrabLink display-only status
19. Run full-system private beta acceptance
20. Invite a small controlled beta cohort
```

## Are we close?

**Yes, but in a specific sense.**

You are very close to a convincing **CrabLink product beta**. The onboarding video is evidence of that: people can now see an actual product lifecycle instead of only architecture documents and terminal tests.

The remaining work before the broader decentralized beta is not “invent everything.” Much of the node stack, QuickChain scaffolding, internal ROC path, and ROX Anchor path already exists and is parked. The next stage is integration, real deployment, adversarial testing, and discovering where independently green pieces disagree.

That is exciting because the project is approaching the point where progress becomes much more visible:

```text
not another crate becoming green
but multiple machines actually behaving like CrabLink
```

That is when the whole thing will start to feel real.



### END NOTE - JULY 27 2026 - 23:15 CST