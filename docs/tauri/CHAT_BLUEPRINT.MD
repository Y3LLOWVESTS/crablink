

```text
docs/tauri/CHAT_BLUEPRINT.MD
```

It fits the current direction: Tauri-first, gateway-first, no fake chat truth, no fake ROC, no silent spend, and no new backend authority in CrabLink. The current app already has an honest stream chat placeholder that explicitly does **not** invent fake users/messages or wallet actions, so this blueprint upgrades that placeholder into a real product plan.  The paid-message model must obey the paid-action IDB rules: no fake ROC, no fake receipts, explicit paid actions, and wallet mutation only through the backend wallet path. 

````markdown
# CHAT_BLUEPRINT.MD — CrabLink Chat, Paid Messages, Moderation, and Portable Conversation Rooms

RO:WHAT — Defines CrabLink Chat as a portable RON-native chat room/page for streams, podcasts, sites, profiles, creator pages, and standalone chat links.

RO:WHY — Streams and podcasts need live chat, but chat should also become a reusable CrabLink primitive: portable, paid-capable, moderated, emoji-friendly, expiration-aware, and attachable anywhere without becoming fake backend truth.

RO:INTERACTS — CrabLink Tauri React routes, future ChatPage, ChatBuilder, ChatRoomView, ChatMessageComposer, ChatModerationPanel, ChatSettingsPanel, StreamPage, PodcastPage, ProfilePage, SitePage, svc-gateway, omnigate, svc-wallet, ron-ledger, ron-accounting, svc-rewarder, svc-passport, svc-index, svc-storage, svc-mailbox, ron-policy, ron-proto, ron-auth, ron-audit.

RO:INVARIANTS — Chat UI never invents messages, users, receipts, balances, moderation authority, expiry truth, or payout truth. Paid chat messages require explicit confirmation unless a future bounded allowance is explicitly approved. Wallet mutation goes through svc-wallet. ron-ledger remains economic truth. Chat room descriptors may be b3 assets; live message state is backend/session truth. Cache cannot unlock paid chat or resurrect expired chat.

RO:METRICS — Future metrics: chat room create/resolve/send/read/delete/moderate outcomes, paid-message quote/pay/send outcomes, receipt confirmation latency, fanout lag, moderation actions, blocked-user hits, expiry purges, emoji/reaction events, redacted error classes, and stale-cache refusal counts.

RO:CONFIG — Chat feature flag, gateway base URL, request timeout, default message ROC price, max message size, emoji/reaction policy, media attachment policy, room expiry options, slow mode, moderation mode, blocklist policy, pinned-message limit, receipt cache display limit, and developer diagnostics flag.

RO:SECURITY — No untrusted HTML execution. Messages render as text/rich-safe spans only. No arbitrary scripts, plugins, or creator-supplied UI execution. Moderator actions are backend-authorized. Blocklists and deletes are policy-backed. Private capabilities, wallet authority, and raw auth tokens never enter React state or URLs.

RO:TEST — React route smoke, builder form tests, message composer tests, emoji/reaction tests, paid-message explicit-confirmation tests, backend route-contract tests, moderation tests, expiry tests, stale-cache negative tests, wallet receipt tests, stream/podcast attach tests, and two-user local-stack smoke.

---

## 0. Status

This blueprint is a product and route-contract plan.

It is not a request to implement full real-time backend chat immediately.

Correct order:

```text
1. Build a beautiful local Chat page shell and builder.
2. Keep all live-message areas honest: placeholder/demo-only until backend routes exist.
3. Define chat room descriptor shape.
4. Define backend route contracts.
5. Wire free chat read/send proof.
6. Wire paid per-message quote/confirm/send proof.
7. Wire moderation/block/delete proof.
8. Wire stream/podcast chat attachment.
9. Add expiry and archival behavior.
10. Only later optimize fanout/realtime transport.
````

The MVP must feel polished without lying.

---

## 1. Product thesis

CrabLink Chat should be a first-class primitive, not just a livestream side panel.

A chat can be attached to:

```text
crab://<hash>.stream
crab://<hash>.podcast
crab://<hash>.video
crab://<hash>.music
crab://<hash>.article
crab://<site_name>
crab://@username
creator pages
events
private groups later
standalone rooms
```

A standalone room can be addressed as:

```text
crab://<64hex>.chat
```

A named room can later be addressed as:

```text
crab://<site_name>/chat
crab://@username/chat
```

Core user story:

```text
Creator mints or creates a chat room.
Creator sets message price, expiry, mods, and rules.
Viewers open the chat in CrabLink.
Free rooms allow normal message send.
Paid rooms quote ROC before send.
User confirms spend.
Backend wallet path returns receipt.
Message appears only after backend acceptance.
Creator/chat owner receives configured share.
Mods can remove messages or block @usernames.
Expired rooms stop accepting new messages.
```

---

## 2. Non-negotiable boundaries

### 2.1 CrabLink Tauri is client only

CrabLink may:

```text
render rooms
render messages
compose message drafts
show explicit paid-send confirmation
display backend receipts
display backend moderation state
cache display-only local drafts
cache recently viewed message display data
```

CrabLink must not:

```text
invent messages
invent sender identity
invent paid receipts
invent moderator authority
invent creator payout
invent expiry truth
unlock paid chat from cache
store spend authority in local storage
send hidden paid messages
execute HTML/scripts from chat
```

### 2.2 Backend truth owners

Suggested ownership:

```text
ron-proto:
  DTOs for chat room descriptor, message, reaction, moderation action, quote, receipt.

svc-gateway:
  Public HTTP route boundary.

omnigate:
  Product hydration and policy coordination.

svc-wallet:
  Paid message mutation front-door.

ron-ledger:
  Durable ROC truth.

svc-passport:
  Sender/mod/owner identity verification.

svc-index:
  Chat room lookup and attachment pointers.

svc-storage:
  Durable room descriptors, optional archived message snapshots, pinned transcripts.

svc-mailbox:
  Fanout/event delivery for live messages and moderator actions.

ron-policy:
  Declarative rules: price floor, expiry, mod powers, max size, blocklist behavior.

ron-accounting:
  Usage/message counters and snapshots, not wallet balance truth.

svc-rewarder:
  Future payout planning, not direct mutation.
```

No new backend crate is required for the first plan.

---

## 3. Chat room model

### 3.1 Chat descriptor asset

A chat room descriptor can be a b3-addressed JSON manifest.

Public URL:

```text
crab://<64hex>.chat
```

Internal ID:

```text
b3:<64 lowercase hex>
```

Descriptor fields:

```json
{
  "schema": "crablink.chat-room.v1",
  "kind": "chat",
  "title": "Creator chat",
  "description": "Live room for today's stream",
  "ownerPassport": "passport:main:dev",
  "ownerAccount": "acct_dev",
  "attachedTo": [
    "crab://<stream_hash>.stream",
    "crab://<podcast_hash>.podcast"
  ],
  "access": {
    "readMode": "public",
    "sendMode": "paid_per_message",
    "messagePriceRoc": 1,
    "currency": "ROC"
  },
  "payout": {
    "creatorShareBps": 8500,
    "platformShareBps": 1000,
    "moderatorPoolBps": 500
  },
  "expiry": {
    "mode": "expires_at",
    "expiresAt": "2026-05-30T00:00:00Z",
    "archiveMode": "read_only_after_expiry"
  },
  "moderation": {
    "mode": "moderated",
    "mods": ["crab://@modname"],
    "blockedUsernames": [],
    "blockedTerms": [],
    "allowEmoji": true,
    "allowReactions": true,
    "maxMessageChars": 500,
    "slowModeSeconds": 0
  },
  "createdAt": "2026-05-21T00:00:00Z"
}
```

### 3.2 Descriptor truth

Descriptor truth is content-addressed.

The descriptor can define:

```text
title
description
owner
attached assets
message price
expiry rules
moderator list
blocklist policy
emoji/reaction policy
archive policy
payout split policy
```

The descriptor does not itself prove:

```text
live messages
latest message list
paid receipts
moderation action history
wallet balances
creator payout completion
```

Those are backend/session/event truth.

---

## 4. Message model

### 4.1 Message DTO

```json
{
  "schema": "crablink.chat-message.v1",
  "messageId": "msg_01h...",
  "room": "crab://<64hex>.chat",
  "senderPassport": "crab://@sender",
  "senderDisplay": "@sender",
  "body": "Hello 🦀🔥",
  "emojiOnly": false,
  "createdAt": "2026-05-21T00:00:00Z",
  "paid": {
    "required": true,
    "amountRoc": 1,
    "receiptHash": "b3:<receipt_hash>",
    "walletTxid": "..."
  },
  "moderation": {
    "state": "visible",
    "deletedBy": null,
    "deletedAt": null,
    "reason": null
  }
}
```

### 4.2 Rendering rules

Messages render like polished modern text bubbles.

UI model:

```text
Own messages:
  right side bubble
  accent gradient
  receipt chip when paid

Other messages:
  left side bubble
  glass card
  username/emoji/avatar

Moderator/system messages:
  centered compact notice

Deleted messages:
  collapsed "Message removed by moderator" pill

Blocked users:
  hidden by default with optional local "show blocked placeholder" setting
```

No message body is rendered as HTML.

Allowed:

```text
plain text
Unicode emoji
safe link detection later
safe @username display
safe crab:// link cards later
reactions
```

Forbidden for MVP:

```text
raw HTML
script tags
iframes
markdown HTML passthrough
creator-supplied CSS
auto-playing media in chat
wallet/action links that spend without confirmation
```

---

## 5. Paid message model

### 5.1 Modes

Chat room send modes:

```text
free
paid_per_message
followers_only_future
members_only_future
mod_approval_future
creator_only
disabled
```

For this project stage, focus on:

```text
free
paid_per_message
disabled
```

### 5.2 Paid send flow

Paid chat send must follow the normal explicit paid action pattern:

```text
1. User writes message.
2. App validates local draft size only.
3. App asks backend for quote.
4. App shows explicit confirmation:
   "Send this chat message for X ROC?"
5. User confirms.
6. Backend wallet path performs paid operation.
7. Backend accepts and records/fans out message.
8. Backend returns message DTO + receipt.
9. App renders the message and receipt chip.
10. Balance refreshes from backend.
```

No silent spend.

No optimistic paid message that looks confirmed before backend acceptance.

A local pending bubble is allowed only if clearly marked:

```text
Sending…
Awaiting backend confirmation…
Not paid yet…
Failed — no ROC spent
```

### 5.3 Future allowance mode

A future optional mode may reduce friction:

```text
Approve up to 10 ROC for this room for 15 minutes.
```

But this is not MVP unless vault/security gates are ready.

If added later, rules:

```text
explicit allowance confirmation
hard cap
short expiry
room-scoped
wallet-account-scoped
passport-scoped
display remaining allowance
backend-enforced
revocable
no uncapped spend authority in React
```

Default MVP remains explicit confirm per paid message.

---

## 6. Payout model

The person who minted or owns the chat room should be able to receive a portion of paid messages.

Suggested initial split:

```text
creator/chat owner: configurable, default 90%
platform/protocol/accounting bucket: configurable, default 10%
moderator pool: future optional
attached asset creator split: future optional
```

Important distinction:

```text
Chat room owner = receives chat message value by default.
Attached stream/podcast owner = may be same person, but must be explicit.
```

When chat is attached to a podcast or stream, descriptor can define:

```text
pay chat owner only
pay attached asset creator
split between room owner and attached asset creator
```

Backend must calculate and return the actual receipt.

CrabLink only displays it.

---

## 7. Expiry model

Chat rooms need expiration options.

Supported descriptor settings:

```text
never_expires
expires_at
expires_after_duration
expires_after_stream_ends_future
manual_close
message_ttl
```

MVP options:

```text
never_expires
expires_at
manual_close
```

Expiry behavior:

```text
Before expiry:
  read/send allowed according to room rules.

After expiry:
  send disabled.
  read behavior follows archiveMode.

archiveMode:
  hide_after_expiry
  read_only_after_expiry
  owner_only_after_expiry_future
  archive_to_b3_snapshot_future
```

CrabLink must not resurrect expired rooms from cache.

If cached chat exists and backend says expired, UI must show:

```text
Chat expired.
Cached display may be stale.
Sending disabled.
```

---

## 8. Moderation model

### 8.1 Moderator powers

Creator can designate mods by:

```text
crab://@username
passport subject
site role later
```

Moderator powers can be scoped:

```text
delete_message
timeout_user
block_username
pin_message
clear_reactions
approve_message_future
edit_room_rules_future
```

MVP moderator powers:

```text
delete_message
block_username
pin_message
```

### 8.2 Blocking @usernames

Room-level blocklist:

```text
blockedUsernames: ["@baduser"]
```

Policy:

```text
blocked user cannot send
existing messages may remain or be hidden according to room setting
mod action is backend recorded
UI updates from backend
```

CrabLink may keep a local personal mute list later, but local mute is display-only and not room truth.

### 8.3 Delete behavior

Delete should not erase audit truth.

Message state becomes:

```text
visible
deleted_by_mod
deleted_by_owner
hidden_by_policy
blocked_sender
expired
```

UI displays deleted state without body:

```text
Message removed by moderator.
```

Audit and backend history remain server-side.

---

## 9. Emoji and reactions

### 9.1 Emoji support

MVP must support:

```text
Unicode emoji in messages
emoji-only messages
emoji quick bar
emoji search later
skin tone support where platform provides it
safe length counting
```

Important: character limits should count grapheme clusters, not raw bytes, where possible.

### 9.2 Reactions

Optional after message send works:

```text
👍 😂 ❤️ 🦀 🔥 👀
```

Reaction modes:

```text
free_reactions
paid_reactions_future
disabled
```

MVP can keep reactions local UI-disabled until backend route exists.

Do not fake reaction counts.

---

## 10. UX blueprint

### 10.1 New route

Add:

```text
crab://chat
```

Later:

```text
crab://<64hex>.chat
crab://<site_name>/chat
crab://@username/chat
```

### 10.2 Page layout

Modern sleek layout:

```text
Top:
  compact Chat Studio / Room header
  room status
  price chip
  expiry chip
  moderation chip

Left/main:
  message timeline
  iMessage-like bubbles
  pinned message rail
  system notices
  smooth empty state

Bottom:
  composer
  emoji button
  send/free or send paid button
  ROC price preview
  character count

Right:
  builder/settings panel in creator mode
  mods list
  blocklist
  expiry controls
  payout settings
  developer drawer collapsed
```

### 10.3 Visual style

Style direction:

```text
dark polished glass
rounded bubbles
soft shadows
accent gradient for own messages
subtle timestamps
small receipt chips
animated but not distracting
emoji-friendly typography
clear paid confirmation modal
```

Message bubbles should feel like a polished native messaging app, not a backend log.

### 10.4 Chat page modes

```text
Room
Builder
Moderation
Developer
```

Room:

```text
read/send messages
paid confirmation
emoji
reactions later
```

Builder:

```text
title
description
attach to stream/podcast/site/profile
message price
expiry
mods
blocklist
rules
payout split
mint/create chat descriptor
```

Moderation:

```text
delete messages
block usernames
pin/unpin messages
view recent mod actions
```

Developer:

```text
route DTOs
receipt display metadata
message IDs
backend status
fanout lag
expiry state
```

Developer mode stays collapsed by default.

---

## 11. Backend route contract sketch

Gateway public routes should proxy to omnigate/chat handlers.

### 11.1 Resolve room

```text
GET /chat/resolve?url=crab://<hash>.chat
```

Returns:

```json
{
  "schema": "omnigate.chat-room-page.v1",
  "room": {},
  "policy": {},
  "viewer": {},
  "latest": []
}
```

### 11.2 Create/prepare chat room

```text
POST /chat/prepare
POST /chat
```

If creating a chat descriptor costs ROC, use paid upload pattern:

```text
prepare → explicit ROC hold → create/upload → backend receipt → crab://<hash>.chat
```

If free in dev, still return backend-created descriptor truth.

### 11.3 Quote message

```text
POST /chat/:room_id/messages/quote
```

Body:

```json
{
  "senderPassport": "passport:main:visitor-b",
  "walletAccount": "acct_visitor_b",
  "body": "Hello 🦀",
  "clientNonce": "..."
}
```

Returns:

```json
{
  "schema": "crablink.chat-message-quote.v1",
  "room": "crab://<hash>.chat",
  "amountRoc": 1,
  "recipient": "acct_creator",
  "expiresAt": "2026-05-21T00:01:00Z",
  "idempotencyKey": "..."
}
```

### 11.4 Send paid message

```text
POST /chat/:room_id/messages/send
```

Uses backend wallet path.

Returns:

```json
{
  "schema": "crablink.chat-message-send-result.v1",
  "message": {},
  "receipt": {},
  "balanceRefreshRecommended": true
}
```

### 11.5 List messages

```text
GET /chat/:room_id/messages?after=<cursor>&limit=50
```

Returns backend-confirmed messages only.

### 11.6 Poll latest

```text
GET /chat/:room_id/messages/latest?since=<cursor>
```

MVP can poll.

Realtime/WebSocket/OAP/mailbox fanout later.

### 11.7 Moderate

```text
POST /chat/:room_id/mod/delete
POST /chat/:room_id/mod/block
POST /chat/:room_id/mod/pin
```

All require backend moderator authorization.

---

## 12. Storage and cache rules

Local storage may keep:

```text
draft message text
recent room URLs
display-only recent messages
display-only receipt chips
local personal mute list
builder drafts
```

Local storage must not keep:

```text
wallet authority
moderator capability secrets
uncapped spend approval
backend message truth
expiry override
receipt truth
ownership truth
```

Cache labels:

```text
backend-confirmed
pending
failed
display-cache
expired
stale
```

If offline:

```text
show cached messages as display-only
disable paid send
disable moderation
disable room creation
show "offline/stale" banner
```

---

## 13. Stream and podcast integration

### 13.1 Stream integration

Current stream page has a chat placeholder. Replace it later with the real ChatRoomView once backend chat routes exist.

The stream descriptor can include:

```json
{
  "chat": {
    "enabled": true,
    "room": "crab://<hash>.chat",
    "mode": "paid_per_message"
  }
}
```

The stream page should display:

```text
live preview/video area
paid stream unlock
chat side panel
send paid/free message
moderation controls for creator/mod
```

### 13.2 Podcast integration

Podcast pages can attach chat for:

```text
episode discussion
live podcast recording chat later
Q&A
paid listener questions
creator community room
```

Podcast descriptor can include:

```json
{
  "chat": {
    "enabled": true,
    "room": "crab://<hash>.chat",
    "prompt": "Ask a question for the host"
  }
}
```

### 13.3 Future live podcast streaming note

Podcast audio files are proven as stored/minted assets.

Live podcast streaming is not proven yet.

When full backend media transport is revisited, podcast live chat should integrate with:

```text
live audio room
paid listener access
paid questions
moderator queue
post-show archive
```

---

## 14. Current stream-lite note

The stream page has proven bounded stream-lite latest-frame/latest-segment paid viewing, but not production streaming.

Current stream-lite model:

```text
creator publishes bounded latest segment/frame
viewer pays once through backend
viewer polls latest segment
frames render after payment
```

This is not:

```text
WebRTC
HLS
audio/video production transport
durable VOD
full chat/mod/tips system
```

Chat work should not block on full streaming transport.

Build Chat as its own portable primitive first.

---

## 15. Implementation phases

### Phase 1 — Chat route shell

Frontend only.

Add:

```text
src/pages/chat/ChatPage.jsx
src/pages/chat/ChatRoomView.jsx
src/pages/chat/ChatBuilder.jsx
src/pages/chat/ChatComposer.jsx
src/pages/chat/ChatModerationPanel.jsx
src/pages/chat/chatDraftModel.js
src/pages/chat/chat.css
```

Route:

```text
crab://chat
```

Must show:

```text
beautiful message UI
empty state
builder settings
mock local draft messages only if clearly labeled as local preview
no fake backend messages
no fake ROC
```

### Phase 2 — Descriptor builder

Add builder fields:

```text
room title
description
attach to crab URL
message price ROC
free/paid/disabled send mode
expiry
mods
blocked @usernames
emoji/reaction toggles
payout split display
```

Output local descriptor preview only.

No backend truth yet.

### Phase 3 — Backend room create/resolve

Add route contracts and clients.

Files:

```text
src/shared/api/chatClient.js
src/pages/chat/ChatPublishFlow.jsx
```

Prove:

```text
prepare chat descriptor
explicit paid/free create
backend returns crab://<hash>.chat
resolve room
render backend room page
```

### Phase 4 — Free message send

Prove:

```text
send message
backend returns message ID
list messages
poll latest
no fake messages
```

### Phase 5 — Paid per-message send

Prove:

```text
quote paid message
explicit confirmation
backend wallet path
receipt returned
message appears after backend acceptance
balance refresh
receipt chip display
```

### Phase 6 — Moderation

Prove:

```text
designate mods
delete message
block @username
pin message
moderation action appears
blocked user cannot send
```

### Phase 7 — Expiry

Prove:

```text
room expires at configured time
send disabled after expiry
read-only archive behavior
cache cannot bypass expiry
```

### Phase 8 — Attach to stream/podcast

Prove:

```text
attach chat room to stream descriptor
attach chat room to podcast descriptor
stream page renders room panel
podcast page renders room panel
```

### Phase 9 — Realtime/fanout improvement

After polling works:

```text
svc-mailbox fanout
SSE/WebSocket/OAP later
mobile-friendly reconnect
backpressure
cursor recovery
```

Do not start here.

---

## 16. UI acceptance gates

Chat page is ready when:

```text
It looks like a polished CrabLink-native messaging product.
Messages are bubble-based and emoji-friendly.
Paid send is obvious and explicit.
Free rooms feel fast.
Paid rooms show ROC amount before send.
Creator/mod controls are present but not cluttered.
Developer data is hidden by default.
No fake backend truth appears.
No raw JSON dominates the normal UX.
Light and dark themes work.
```

---

## 17. Backend acceptance gates

Backend proof is ready when:

```text
Gateway routes exist.
Room create/resolve works.
Message send/list works.
Paid message quote/send works.
Wallet B can pay to send.
Creator account receives configured share.
Receipt is backend-derived.
Moderator delete/block/pin works.
Expired room blocks send.
Tests cover no silent spend and no fake receipt.
```

---

## 18. Test matrix

### Frontend

```text
npm run build
crab://chat route renders
builder mode renders
room mode renders
moderation mode renders
emoji input works
long message limit works
paid send button disabled until quote
explicit confirmation modal appears
```

### Backend route smoke

```text
GET /chat/resolve
POST /chat/prepare
POST /chat
GET /chat/:room/messages
POST /chat/:room/messages/quote
POST /chat/:room/messages/send
POST /chat/:room/mod/delete
POST /chat/:room/mod/block
```

### Two-wallet smoke

```text
Creator A creates paid chat.
Visitor B opens room.
Visitor B writes emoji message.
Visitor B sees quote.
Visitor B confirms ROC send.
Backend returns receipt.
Message appears.
Creator balance increases.
Visitor balance decreases.
No second spend on refresh.
```

### Moderation smoke

```text
Creator designates mod.
Blocked @username cannot send.
Mod deletes message.
Deleted message shows removed state.
Non-mod cannot delete.
```

### Expiry smoke

```text
Room active before expiry.
Room send disabled after expiry.
Cached page cannot send after expiry.
Backend rejects expired send.
```

---

## 19. Non-goals

Do not build in the first pass:

```text
end-to-end encrypted private DMs
voice chat
video chat
WebRTC chat transport
large file attachments
arbitrary bot plugins
creator-supplied scripts
public blockchain settlement
ROX/Solana bridge
uncapped chat spend allowance
fake realtime message generators
```

---

## 20. Plain-English summary

Chat should become a reusable CrabLink primitive.

It should work for:

```text
streams
podcasts
sites
profiles
creator communities
standalone rooms
```

It should feel like:

```text
a beautiful modern messaging app
with CrabLink identity
with optional ROC-per-message economics
with real moderation
with honest expiry
with emoji support
```

But the truth boundary stays strict:

```text
React renders.
Gateway routes.
Backend authorizes.
Wallet mutates.
Ledger proves.
Cache displays only.
No fake messages.
No fake receipts.
No silent spend.
```

```
```
