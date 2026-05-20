
# CRABLINK_STREAMING_CREATOR_STUDIO_BLUEPRINT.MD

RO:WHAT — Defines the Creator Studio UX for CrabLink Tauri streaming: camera, screen share, camera-over-screen, green screen, background switching, saved local presets, live preview, stream-lite output, and future real audio/video transport.

RO:WHY — Streaming is a core CrabLink creator product. The first paid stream proof already works when Creator A and Visitor B run in separate app instances. The next step is to make the creator side feel beautiful, simple, and powerful without adding feature bloat or weakening RustyOnions boundaries.

RO:INTERACTS — CrabLink Tauri React streaming pages, StreamPage, StreamLocalPreview, StreamSessionPanel, StreamPricingPanel, StreamPublishFlow, streamSessionClient, media permissions, browser Web APIs, Tauri media status commands, gateway stream routes, omnigate stream-lite session routes, paid content view, svc-wallet, ron-ledger, future MediaRecorder/WebRTC/OAP media transport.

RO:INVARIANTS — Creator Studio is presentation and capture UX only. It does not create wallet truth, receipt truth, entitlement truth, stream ownership truth, viewer count truth, or ledger truth. Paid unlock remains backend-derived. Stream publishing remains explicit. Cache cannot unlock paid stream content. React never receives secrets, stream keys, spend authority, or backend capabilities.

RO:STATUS — v1.1 updated blueprint after successful two-app paid stream proof and review refinements.

---

## 1. Product Goal

CrabLink Creator Studio should make starting a paid stream feel simple:

```text
Pick source.
Pick look.
Set ROC access.
Go live.
```

The app should feel closer to a sleek creator tool than a backend test panel.

Creator Studio should support the 90% use cases streamers actually use:

```text
Camera only
Screen only
Screen with webcam thumbnail
Camera with green screen
Camera with custom background
Quick background switching mid-stream
Saved scene settings
Simple paid access setup
Clear live/publish status
```

It should avoid early feature bloat:

```text
No OBS clone
No twenty-layer scene editor
No plugin marketplace
No arbitrary creator-supplied code
No fake virtual camera promises
No fake DRM promises
No complex timeline editor
No full production WebRTC/HLS before stream-lite is stable
```

The product goal is not only “streaming works.” The goal is:

```text
A creator opens CrabLink,
sees a beautiful studio,
chooses a simple mode,
goes live,
and gets paid without thinking about gateway routes or backend internals.
```

---

## 2. Design Principle

The core pipeline:

```text
Input source
→ Preview/compositor
→ Optional effects
→ Bounded output frame/chunk
→ Backend stream route
→ Paid viewer access
```

The UI should hide most technical details, but developer panels may remain collapsible.

Important mental model:

```text
Camera/screen/effects are local creator UX.
Gateway stream segments are backend-visible stream-lite proof.
Paid access is backend truth.
Wallet/ledger is backend truth.
Settings are local preferences only.
```

Creator Studio should be designed so the media transport can evolve without redesigning the user experience:

```text
Today:
  composited canvas → bounded JPEG data URL → stream-lite latest segment

Next:
  composited canvas.captureStream() → MediaRecorder chunks

Future:
  WebRTC / HLS / OAP media transport
```

The UX should not be tightly coupled to the current JPEG snapshot proof.

---

## 3. UX North Star

### 3.1 First impression

The streaming page should open to a clean studio layout:

```text
Left: large live preview canvas
Right: simple control stack
Bottom: compact scene/source bar
Top: stream status and Go Live button
```

Suggested visual feel:

```text
dark polished studio
rounded glass panels
green live accents
large preview
minimal labels
big obvious buttons
modern creator-app feel
```

The UI should feel like a native creator product, not a test harness.

### 3.2 Main controls

Only show the controls people need most:

```text
Source
Look
Access
Go Live
```

Expanded:

```text
Source:
  Camera
  Screen
  Screen + Camera
  Camera + Background

Look:
  None
  Green screen
  Background image
  Blur background later

Access:
  Free preview
  Paid stream
  ROC amount
  Optional paid interval later

Go Live:
  Start preview
  Publish stream
  Start live frame loop
  Stop stream
```

Do not expose raw route names, tx details, receipt hashes, or debug JSON in the main studio. Keep those under a developer drawer.

### 3.3 Main action language

Use simple human wording:

```text
Start preview
Choose source
Go live
Copy stream link
Stop stream
```

Avoid main-screen wording like:

```text
POST segment
latest seq
data URL
receipt hash
gateway payload
```

Put developer details in a drawer.

---

## 4. Implementation Philosophy

### 4.1 Do not replace StreamPage wholesale

The first implementation pass must not replace the existing stream page with a brand-new shell.

Reason:

```text
The current page already owns working pieces:
- stream draft state
- local preview
- stream publish flow
- pricing panel
- backend session panel
- live frame loop proof
- paid stream-lite integration
```

The Creator Studio should wrap and reorganize these pieces, not discard them.

Preferred approach:

```text
StreamPage
→ StreamStudioShell
  → existing StreamLocalPreview or upgraded preview
  → existing StreamDraft simplified into title/access controls
  → existing StreamPricingPanel simplified
  → existing StreamPublishFlow / StreamSessionPanel hidden behind Go Live flow
  → developer drawer for JSON/debug/status
```

Do not introduce placeholder components unless they are provided in the same patch.

### 4.2 Additive first patch

First UX patch should be additive.

It may:

```text
add StreamStudioShell
add studio CSS
rearrange existing panels
add simple source/look/access cards
add developer drawer
add status bar
```

It must not:

```text
delete existing StreamLocalPreview
delete existing StreamSessionPanel
delete existing StreamPublishFlow
replace paid flow logic
replace wallet logic
break current two-app paid stream proof
```

### 4.3 Existing proof remains sacred

The current two-app proof is the baseline:

```text
Instance A: Creator A / acct_dev
Instance B: Visitor B / acct_visitor_b

Creator starts stream.
Creator publishes frames.
Visitor pays once.
Visitor polls latest frames.
No second payment occurs during refresh.
```

Every Creator Studio patch must preserve that behavior.

---

## 5. Scene Model

Creator Studio should treat a stream setup as a local scene preset.

### 5.1 Scene preset shape

```js
{
  schema: 'crablink.creator-scene-preset.v1',
  id: 'default',
  name: 'Default',
  sourceMode: 'camera_only',
  camera: {
    deviceId: '',
    labelHint: '',
    width: 1280,
    height: 720,
    facingMode: 'user'
  },
  screen: {
    enabled: false,
    includeSystemAudio: false,
    displaySurfaceHint: ''
  },
  overlay: {
    cameraEnabled: false,
    position: 'bottom_right',
    size: 'medium',
    shape: 'rounded_rect'
  },
  effects: {
    greenScreenEnabled: false,
    keyColor: '#00ff00',
    tolerance: 30,
    feather: 0,
    spillReduction: 0
  },
  background: {
    mode: 'none',
    imageId: '',
    imageUrl: '',
    solidColor: '#111111',
    fit: 'cover'
  },
  output: {
    preset: 'proof',
    width: 640,
    height: 360,
    quality: 0.72,
    frameIntervalMs: 2000
  },
  updatedAt: 'iso-date',
  truthBoundary: 'Local creator UX preset only. Not stream, wallet, receipt, or entitlement truth.'
}
```

### 5.2 What can be saved

Allowed to save locally:

```text
selected source mode
camera preference label/device hint
green screen settings
background selection
webcam overlay position
stream-lite output quality
preferred frame interval
draft title/description/tags
```

Forbidden to save as normal settings:

```text
wallet secrets
raw capabilities
stream keys
paid receipt truth
viewer entitlement truth
private keys
backend ownership truth
ledger state
live backend session
```

### 5.3 Source labels

Every saved setting should be labeled:

```text
local preference
display-only
not backend truth
```

---

## 6. Source Modes

### 6.1 Camera Only

Simple webcam stream.

UX:

```text
Mode card: Camera
Preview: camera fills canvas
Optional: green screen/background
Best for: talking head, creator chat, simple live updates
```

### 6.2 Screen Only

Screen recording stream.

UX:

```text
Mode card: Screen
Preview: selected screen/window fills canvas
Optional: no webcam thumbnail
Best for: tutorials, coding, slides, demos
```

### 6.3 Screen + Camera

Screen recording with webcam thumbnail overlay.

UX:

```text
Mode card: Screen + Cam
Preview: screen fills canvas
Webcam appears as thumbnail
Quick positions: bottom right, bottom left, top right, top left
Best for: teaching, gaming, product demos
```

Keep this simple. Do not build a full layer editor yet.

### 6.4 Camera + Background

Camera with optional green screen or background replacement.

UX:

```text
Mode card: Camera + Background
Preview: composited output
Controls:
  Enable green screen
  Tolerance slider
  Pick key color
  Choose background
  Switch background live
Best for: creator polish without OBS
```

---

## 7. Green Screen MVP

### 7.1 MVP capability

Green screen v1 should run in React/WebView using browser APIs:

```text
getUserMedia camera input
hidden source video
canvas compositor
simple chroma key pixel loop
background image layer
processed foreground layer
canvas output
```

This is good enough for initial demo and UX work.

### 7.2 Correct draw order

Recommended draw order:

```text
1. Draw selected background onto output canvas.
2. Draw camera frame into work canvas.
3. Apply chroma key alpha to work canvas pixels.
4. Draw processed foreground over background.
5. Draw overlays/status if needed.
```

Do not draw the background after the foreground, because it may cover the subject.

### 7.3 Controls

Simple controls:

```text
Green Screen toggle
Tolerance slider
Pick color from preview
Reset to green
```

Later controls:

```text
Edge softness / feather slider
Spill reduction slider
Shadow preservation
WebGL shader quality mode
```

Initial defaults:

```text
keyColor: #00ff00
tolerance: 30
feather: 0
spillReduction: 0
```

### 7.4 Backgrounds

Background options:

```text
None
Solid color
Bundled image
User-selected local image
b3-verified image later
```

Avoid remote arbitrary background URLs in production UX.

Reason:

```text
Remote URLs can leak IP/user behavior,
fail due to network/CORS,
and are not b3-verified.
```

### 7.5 Background switching mid-stream

This should be allowed.

Rules:

```text
Switching background updates local compositor only.
It does not restart the backend stream.
It does not require new payment.
It does not mutate stream descriptor truth unless creator explicitly republishes metadata later.
It should be visible in the next output frame/chunk.
```

---

## 8. Webcam Thumbnail Overlay

### 8.1 MVP overlay

The user should be able to place webcam over screen share.

Simple positions:

```text
bottom right
bottom left
top right
top left
center small
hidden
```

Simple sizes:

```text
small
medium
large
```

Simple shapes:

```text
rounded rectangle
circle later
```

### 8.2 UX

Do not expose a complicated scene graph.

Use one clean card:

```text
Webcam overlay
[ Off | Small | Medium | Large ]
Position grid
```

Optional later:

```text
drag overlay in preview
resize by corner handle
save overlay position
```

### 8.3 Invariants

The overlay is local compositor state only.

It does not affect:

```text
wallet state
receipt state
paid access state
backend entitlement
stream ownership
```

---

## 9. Switching Recording Types Mid-Stream

### 9.1 Supported switches for UX phase

Allowed mid-stream:

```text
camera only → camera + background
camera + background → camera only
screen only → screen + camera
screen + camera → screen only
background image A → background image B
webcam overlay position/size changes
green screen on/off
green screen tolerance changes
```

Potentially allowed with caution:

```text
camera only → screen only
screen only → camera only
camera device change
screen/window re-selection
```

These may require stopping/restarting local media tracks, but should not require ending backend stream session if the compositor output remains available.

### 9.2 User-facing rule

When switching sources mid-stream:

```text
Show “Switching source…”
Keep backend session live if possible.
Publish a fallback slate if compositor has no frame.
Resume frame/chunk publishing after new source is ready.
```

Fallback slate:

```text
Creator is switching scenes.
Stream will resume shortly.
```

This avoids viewer seeing a frozen old frame without explanation.

### 9.3 Backend truth rule

Changing recording type is not a wallet operation.

It should not:

```text
create a receipt
charge viewers again
unlock paid content from cache
change creator account
change stream ownership
```

---

## 10. Compositor Output Contract

The compositor must expose a small, typed local API.

```js
{
  getCanvas(): HTMLCanvasElement | null,

  captureFrameDataUrl(options): Promise<{
    schema: 'crablink.stream-studio-frame.v1',
    mediaType: 'image/jpeg',
    dataUrl: string,
    width: number,
    height: number,
    sourceMode: string,
    effects: {
      greenScreenEnabled: boolean,
      backgroundMode: string,
      webcamOverlayEnabled: boolean
    },
    createdAt: string
  }>,

  captureStream(fps): MediaStream | null
}
```

For current stream-lite:

```text
StreamSessionPanel should publish from captureFrameDataUrl().
```

For future real streaming:

```text
MediaRecorder/WebRTC/OAP can use captureStream().
```

This makes the UX work now without trapping us in the JPEG-snapshot transport forever.

The compositor may:

```text
compose camera and screen into canvas
apply chroma key
draw background
draw webcam overlay
export bounded frame data URL
return canvas.captureStream later
```

The compositor must not:

```text
call wallet
call backend directly
store secrets
invent paid state
invent stream truth
```

---

## 11. Stream-Lite Integration

### 11.1 Current integration

For the current proof, the compositor output feeds stream-lite:

```text
composited canvas
→ JPEG data URL
→ POST /streams/{stream_id}/segments
→ viewer polls latest segment
```

This should continue until we implement real media chunks.

### 11.2 Output presets

Offer simple quality options:

```text
Proof mode:
  640x360
  1 frame every 2s
  quality 0.72

Better preview:
  640x360
  1 frame every 1s
  quality 0.70

High demo:
  854x480
  1 frame every 1s
  quality 0.65
```

Do not offer 30fps gateway JSON streaming. That belongs to future MediaRecorder/WebRTC/OAP work.

### 11.3 Hard guards

Keep hard guards:

```text
max data URL bytes
one publish in flight
drop frame under backpressure
visible publish status
visible dropped frame count
visible latest publish time
manual stop loop
bounded preview resolution
bounded publish resolution
```

Initial caps:

```text
preview canvas: 854x480 max for stream-lite
published frame: 640x360 default
frame interval: 2s default
fast option: 1s
quality: 0.65–0.72
one publish in flight
drop frames under backpressure
```

### 11.4 Why not smooth video yet

Stream-lite is not final streaming.

It proves:

```text
paid access
creator-to-backend publishing
viewer receipt verification
gateway route behavior
bounded media movement
```

Smooth audio/video comes next through:

```text
MediaRecorder chunks
WebRTC
HLS / LL-HLS
OAP-backed media transport
gateway-mediated media sessions
```

---

## 12. Future Real Media Transport

### 12.1 Next stage after UX

Once Creator Studio UX is stable, graduate from JPEG snapshots to chunks:

```text
composited canvas.captureStream(fps)
+ optional microphone track
→ MediaRecorder
→ short WebM chunks
→ bounded upload/relay route
→ paid viewer segment playback
```

### 12.2 Audio

Audio should not be bolted onto stream-lite JPEG frames.

Audio belongs in chunked or realtime media transport:

```text
microphone track
screen audio if platform allows
mixing policy
mute/unmute state
audio level meter
bounded segment/chunk output
```

### 12.3 Production path

Production streaming likely needs one of:

```text
WebRTC session service
HLS / LL-HLS segment service
OAP media transport
gateway-mediated paid stream session
```

CrabLink UX should be designed now so the transport can be swapped later without redesigning the creator experience.

---

## 13. Main UI Layout

### 13.1 Page structure

Recommended route:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
```

Recommended component family:

```text
StreamStudioShell.jsx
StreamStudioPreview.jsx
StreamStudioSourcePanel.jsx
StreamStudioLookPanel.jsx
StreamStudioAccessPanel.jsx
StreamStudioGoLivePanel.jsx
StreamStudioDeveloperDrawer.jsx
StreamStudioStatusBar.jsx
StreamGreenScreenPanel.jsx
StreamBackgroundPicker.jsx
StreamWebcamOverlayControls.jsx
streamStudioModel.js
streamCompositor.js
streamStudioSettings.js
```

Use names that fit the current stream family and make ownership clear.

Avoid adding components in a patch unless their full implementation is included.

### 13.2 Layout

```text
┌───────────────────────────────────────────────────────────┐
│ Stream title/status                         Go Live/Stop  │
├───────────────────────────────────────┬───────────────────┤
│                                       │ Source            │
│                                       │ Look              │
│          Large live preview           │ Access            │
│                                       │ Publish status    │
│                                       │                   │
├───────────────────────────────────────┴───────────────────┤
│ Scene chips: Camera | Screen | Screen+Cam | Green Screen   │
└───────────────────────────────────────────────────────────┘
```

### 13.3 Developer drawer

Main creator UI should not show raw internals by default.

Move these behind “Developer details”:

```text
stream_id
latest_seq
receipt hash
wallet txid
raw gateway JSON
segment payload preview
data URL size
backend route names
correlation IDs
```

Main UI should show simple status:

```text
Preview ready
Live
Publishing frames
Paid access enabled
Viewer link copied
Backpressure warning
```

---

## 14. Suggested User Flow

### 14.1 New creator

```text
1. Open Stream.
2. Pick “Camera” or “Screen + Cam”.
3. Preview appears.
4. Optional: enable green screen.
5. Optional: choose background.
6. Set title and ROC access.
7. Click Go Live.
8. App publishes descriptor.
9. App starts backend session.
10. App starts frame/chunk publishing.
11. App shows stream link.
```

### 14.2 Mid-stream change

```text
1. Creator clicks Background.
2. Picks a new image.
3. Preview updates immediately.
4. Next published frame/chunk shows new background.
5. No payment state changes.
```

### 14.3 Screen + webcam

```text
1. Creator picks Screen + Cam.
2. Chooses screen/window.
3. Webcam thumbnail appears bottom right.
4. Creator picks size/position.
5. Go Live publishes composited output.
```

### 14.4 Green screen

```text
1. Creator picks Camera + Background.
2. Enables Green Screen.
3. Uses tolerance slider until the background disappears.
4. Picks bundled or local background.
5. Goes live.
6. Visitor sees composited output after payment.
```

---

## 15. Local Settings and Presets

### 15.1 Save settings

Add buttons:

```text
Save as default
Reset studio
Duplicate scene later
```

### 15.2 What “Save” means

Save only local creator preferences:

```text
scene layout
selected effect settings
background choice metadata
source mode
quality preset
preferred pricing draft
```

Do not save:

```text
live backend session
paid viewer entitlement
receipt proof
wallet authority
stream secret
private media path
ledger state
```

### 15.3 Tauri settings discipline

Settings persistence should go through existing Tauri settings adapters.

Settings must be:

```text
typed
bounded
display-only
non-secret
safe to reset
```

Settings must not include:

```text
private keys
raw capabilities
uncapped spend authority
backend bearer tokens
receipt truth
paid entitlement truth
```

---

## 16. Paid Access UX

Keep access simple:

```text
Free
Paid once
Paid per interval later
```

For now:

```text
Paid once to view latest stream proof
```

Later:

```text
Creator sets ROC amount per X minutes
Viewer explicitly confirms renewal
Backend receipt extends paid_until
No silent renewal
No hidden spend
```

The UI should show:

```text
Viewer pays before stream unlock.
Receipt is backend-derived.
Refresh does not spend again.
```

Paid action invariants:

```text
prepare/quote
explicit confirmation
backend wallet path
backend receipt
unlock/render
receipt display cache
balance refresh
```

No fake ROC, fake balances, fake receipts, silent spend, or cache-only unlock.

---

## 17. Safety and Privacy

### 17.1 Camera/screen indicators

Always show:

```text
Camera on/off
Screen on/off
Mic on/off later
Publishing on/off
Backend live/offline
```

### 17.2 Tauri media permission discipline

The browser APIs can still do actual media capture, but the UX should route readiness/status through the existing Tauri media patterns.

Main UI should show:

```text
Camera permission
Screen permission
Mic permission later
Tauri media mode active/inactive
Current capture source
Publishing status
```

Do not bury permission failures in console logs.

### 17.3 Before going live

Show final confirmation:

```text
You are about to publish:
Source: Screen + Cam
Effect: Green screen background
Access: Paid
Creator wallet: acct_dev
```

### 17.4 Failure states

Friendly states:

```text
Camera permission denied
Screen permission denied
Preview unavailable
Frame too large
Gateway unavailable
Wallet unavailable
Stream session offline
Backpressure: dropping frames
Source switching in progress
```

No raw stack traces in normal UI.

---

## 18. Implementation Order

### Phase 1 — Studio Shell UX

Goal: make the page look amazing without changing backend behavior.

Patch likely files:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
```

Add:

```text
modern studio layout
large preview
simple source cards
right-side controls
developer drawer
status bar
```

No new backend routes.

Phase 1 must preserve:

```text
existing camera preview
existing stream mint/publish path
existing StreamSessionPanel backend controls
existing two-app paid stream proof
```

### Phase 2 — Compositor Model

Add:

```text
streamStudioModel.js
streamCompositor.js
StreamStudioPreview.jsx
```

Support:

```text
camera only
screen only
screen + webcam thumbnail
background image behind canvas
bounded frame capture
```

Still no backend changes.

### Phase 3 — Green Screen MVP

Add:

```text
StreamGreenScreenPanel.jsx
StreamBackgroundPicker.jsx
canvas chroma key
tolerance slider
key color picker
background switching
```

Output:

```text
processed canvas
```

Stream-lite frame publisher should capture from processed canvas, not raw camera.

### Phase 4 — Presets

Add:

```text
streamStudioSettings.js
local preset persistence
save/reset default
```

Save only local preferences.

### Phase 5 — Better Stream-Lite Publishing

Improve:

```text
1s refresh option
smaller image encoding
visible publish heartbeat
fallback switching slate
diagnostics drawer
dropped-frame counter
segment size display
```

No audio yet.

### Phase 6 — Real Media Transport Blueprint

After UX is stable, write backend/media blueprint for:

```text
MediaRecorder chunks
audio track
chunk route
viewer playback
paid_until intervals
stream session auth
range/segment delivery
```

---

## 19. Component Responsibilities

### 19.1 StreamStudioShell

Owns layout only.

May:

```text
arrange preview
arrange source/look/access panels
show status bar
show developer drawer
```

Does not:

```text
publish
pay
mutate wallet
own backend truth
```

### 19.2 StreamStudioPreview

Owns preview rendering.

May:

```text
show camera/screen/composited preview
expose a safe capture handle
show local source errors
```

Must not:

```text
own paid access
invent stream status
call wallet
call backend directly
```

### 19.3 streamCompositor.js

Owns local compositing.

May:

```text
compose camera and screen into canvas
apply chroma key
draw background
draw webcam overlay
export bounded frame data URL
return canvas.captureStream later
```

Must not:

```text
call wallet
call backend directly
store secrets
invent stream truth
invent paid truth
```

### 19.4 StreamSessionPanel

Owns backend stream-lite status/publishing controls.

May:

```text
start backend stream session
publish bounded segment
show backend latest seq
stop backend session
```

Must not:

```text
create fake live status
create receipt
mutate ledger
claim viewer truth
```

### 19.5 StreamPaidSegmentViewer

Owns paid viewer latest segment rendering.

May:

```text
use backend receipt metadata
poll latest segment
render newest segment
show status
```

Must not:

```text
pay again without explicit confirmation
unlock from cache
invent receipt
```

### 19.6 StreamStudioDeveloperDrawer

Owns developer visibility only.

May show:

```text
backend status
latest seq
data URL byte size
gateway responses
receipt display metadata
debug warnings
```

Must not:

```text
make hidden payments
unlock content
mutate ledger
expose secrets
```

---

## 20. Testing Matrix

### 20.1 UX tests

```text
Camera preview starts.
Screen preview starts.
Screen + camera overlay renders.
Green screen toggles on/off.
Tolerance slider changes output.
Background switches mid-preview.
Settings save and reload.
Reset clears local studio preferences.
Developer drawer stays collapsed by default.
```

### 20.2 Stream-lite tests

```text
Creator can go live.
Frame loop publishes composited frames.
Viewer B pays once.
Viewer B auto-refreshes latest frames.
No second payment during refresh.
Background switch appears in viewer stream.
Screen + camera overlay appears in viewer stream.
Stopping stream stops publishing.
```

### 20.3 Boundary tests

```text
No fake receipts.
No fake balances.
No silent spend.
No paid unlock from cache.
No direct svc-wallet calls from UI.
No raw local file paths exposed.
No full large media blobs through Tauri command outputs.
No arbitrary code execution.
No saved stream secrets.
```

### 20.4 Two-instance smoke

Because the paid stream proof worked best with separate app instances, this is the canonical stream-lite smoke until true per-tab/per-session identity isolation exists.

```text
Instance 1: Creator A
Instance 2: Visitor B

Creator starts preview.
Creator goes live.
Creator frame loop advances latest_seq.
Visitor pays once.
Visitor auto-refreshes.
Creator changes background.
Visitor sees changed background.
Creator toggles webcam overlay.
Visitor sees overlay.
No second payment occurs during refresh.
```

### 20.5 Terminal watch smoke

During development, keep a stream status watch running:

```text
GET /streams/{stream_id}/status

Expected:
status: live
latest_seq: advancing
media_type: image/jpeg
source: crablink_tauri_creator_frame_loop or compositor equivalent
producer_account: creator account
```

If latest_seq does not advance, the creator publisher is blocked or stopped.

If latest_seq advances but viewer does not update, the viewer poll/render path is broken.

---

## 21. Non-Goals

Do not build yet:

```text
full OBS replacement
virtual camera driver
creator plugin system
creator-supplied executable filters
smooth production WebRTC/HLS
audio mixer
multi-camera switching
moderation dashboard
real-time chat economy
auto-renew paid intervals
DRM/anti-rip claims
QuickChain settlement
external token bridge
```

Also do not build:

```text
30fps JSON gateway streaming
unbounded frame upload
remote arbitrary background URL gallery
paid unlock from cache
background execution after creator stops stream
```

---

## 22. Success Definition

The UX phase is successful when:

```text
A creator can open CrabLink Tauri,
choose Camera or Screen + Cam,
turn on green screen,
switch backgrounds live,
set paid access,
go live,
and a separate Visitor B app can pay and see the composited stream updating.
```

The experience should feel simple enough that a non-technical creator can use it without understanding gateway routes, b3, receipts, or stream segments.

The architecture should remain strict enough that RustyOnions truth boundaries are not weakened.

The first implementation should target:

```text
Phase 1 + Phase 2 first:
  beautiful studio shell
  additive layout around existing stream proof
  basic compositor contract
  no backend route changes
  no paid flow rewrites
```

Only after this should we wire green screen, background switching, and webcam overlay into the stream-lite publisher.

---

## 23. Implementation Warning

Do not paste generic placeholder component files that reference missing components.

Unsafe example:

```text
StreamStudioShell imports:
  StreamSourcePicker
  StreamSceneControls
  StreamGoLivePanel
  StreamStudioStatusBar

but those files are not created in the same patch.
```

Every patch must be complete and buildable.

Each phase must end with:

```text
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

And for stream proof:

```text
two-app Creator A / Visitor B smoke
```

No patch is accepted if it breaks the existing paid stream proof.
````
