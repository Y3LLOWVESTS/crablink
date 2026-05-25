/**
 * RO:WHAT — Bubble-based room view for local and backend-confirmed CrabLink chat messages.
 * RO:WHY — Shows real backend messages when available while preserving honest local preview boundaries.
 * RO:INTERACTS — ChatPage, ChatComposer, chatDraftModel, chat.css.
 * RO:INVARIANTS — local preview bubbles are labeled; backend-confirmed bubbles are backend-derived; no fake receipts.
 * RO:SECURITY — renders text only; message body is never injected as HTML.
 */

import { formatTimestamp } from './chatDraftModel.js';
import ChatComposer from './ChatComposer.jsx';

export default function ChatRoomView({
  draft,
  descriptor,
  backendRoomPage,
  localMessages = [],
  backendMessages = [],
  pendingQuote,
  composerValue,
  backendBusy = false,
  onComposerChange,
  onPreviewMessage,
  onPaidIntent,
  onClearPreview,
  onClearBackendRoom,
  onRefreshBackend,
}) {
  const room = backendRoomPage?.room || descriptor;
  const backendReady = Boolean(backendRoomPage?.room?.roomId);
  const sendMode = room?.access?.sendMode || descriptor?.access?.sendMode || 'paid_per_message';
  const price = room?.access?.messagePriceRoc ?? descriptor?.access?.messagePriceRoc ?? 0;
  const pinnedNote = room?.pinnedNote || descriptor?.pinnedNote || '';
  const allMessages = [
    ...backendMessages.map((message) => ({ ...message, backendConfirmed: true })),
    ...localMessages.map((message) => ({ ...message, backendConfirmed: false })),
  ];

  return (
    <section className={backendReady ? 'cl-chat-room is-backend-ready' : 'cl-chat-room'} aria-label="Chat room">
      <div className="cl-chat-room-head">
        <div>
          <p className="cl-eyebrow">{backendReady ? 'Backend room' : 'Portable room'}</p>
          <h2>{room?.title || 'CrabLink Chat'}</h2>
          <p>{room?.description || 'A portable chat room for streams, podcasts, sites, and profiles.'}</p>
        </div>

        <div className="cl-chat-room-price">
          <span>{sendMode === 'paid_per_message' ? 'Paid messages' : 'Send mode'}</span>
          <strong>{sendMode === 'paid_per_message' ? `${price} ROC` : labelForSendMode(sendMode)}</strong>
        </div>
      </div>

      <div className="cl-chat-status-rail" aria-label="Chat route status">
        <StatusPill label="Backend" value={backendReady ? 'Connected' : 'Local only'} tone={backendReady ? 'ok' : 'warn'} />
        <StatusPill label="Messages" value={backendReady ? 'Backend-confirmed' : 'Local preview'} tone="info" />
        <StatusPill label="Receipts" value="None" tone="warn" />
        <StatusPill label="Expiry" value={labelForExpiry(room)} tone="neutral" />
      </div>

      {pinnedNote ? (
        <div className="cl-chat-pinned-note">
          <span>PINNED</span>
          <p>{pinnedNote}</p>
        </div>
      ) : null}

      {backendReady ? (
        <div className="cl-chat-backend-proof">
          <strong>Backend room loaded</strong>
          <span>
            {room.roomUrl || room.roomId} · in-memory dev proof · free messages can be sent only
            when room send mode is Free
          </span>
        </div>
      ) : null}

      {pendingQuote ? (
        <div className="cl-chat-quote-card">
          <strong>Paid-message quote ready</strong>
          <span>
            {pendingQuote.quote?.amountRoc ?? price} ROC · paid send intentionally locked until
            svc-wallet receipt verification is wired
          </span>
        </div>
      ) : null}

      <div className="cl-chat-thread" aria-label="Chat thread">
        <SystemNotice>
          {backendReady
            ? 'Backend messages shown here are returned by gateway/omnigate. This room is still in-memory dev proof, not durable b3 chat.'
            : 'Create or resolve a backend room from the Publish tab. Local bubbles are preview only.'}
        </SystemNotice>

        {allMessages.length ? (
          allMessages.map((message) => (
            <MessageBubble key={message.messageId || `${message.createdAt}-${message.body}`} message={message} />
          ))
        ) : (
          <div className="cl-chat-empty-thread">
            <div className="cl-chat-empty-orb">💬</div>
            <strong>{backendReady ? 'No backend messages yet' : 'No local preview bubbles yet'}</strong>
            <p>
              {backendReady
                ? 'Send a message in a free backend room, or quote a paid message in a paid room.'
                : 'Type a message below and click Preview bubble. It will not spend ROC or become backend truth.'}
            </p>
          </div>
        )}
      </div>

      <ChatComposer
        draft={draft}
        value={composerValue}
        backendReady={backendReady}
        roomSendMode={sendMode}
        backendBusy={backendBusy}
        onChange={onComposerChange}
        onPreview={onPreviewMessage}
        onPaidIntent={onPaidIntent}
      />

      <div className="cl-chat-room-actions">
        <button type="button" onClick={onRefreshBackend} disabled={!backendReady || backendBusy}>
          Refresh backend messages
        </button>
        <button type="button" onClick={onClearPreview} disabled={!localMessages.length}>
          Clear local previews
        </button>
        <button type="button" onClick={onClearBackendRoom} disabled={!backendReady}>
          Clear backend room view
        </button>
        <span>
          {backendReady
            ? 'Backend room is in-memory only · paid send locked · no receipt yet'
            : 'Display cache only · no backend messages · no paid send yet'}
        </span>
      </div>
    </section>
  );
}

export function MessageBubble({ message }) {
  const own =
    String(message?.senderDisplay || '').includes('@you') ||
    String(message?.senderDisplay || '').includes('@me') ||
    message?.senderDisplay === '@anonymous';
  const backendConfirmed = Boolean(message?.backendConfirmed);
  const deleted = message?.moderation?.state && message.moderation.state !== 'visible';

  return (
    <article
      className={[
        own ? 'cl-chat-message is-own' : 'cl-chat-message',
        backendConfirmed ? 'is-backend' : 'is-local',
        deleted ? 'is-deleted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={backendConfirmed ? 'Backend-confirmed message' : 'Local preview message'}
    >
      <div className="cl-chat-message-avatar" aria-hidden="true">
        {message?.avatar || (backendConfirmed ? '✅' : own ? '🦀' : '💬')}
      </div>

      <div className="cl-chat-message-main">
        <div className="cl-chat-message-meta">
          <strong>{message?.senderDisplay || '@preview'}</strong>
          <span>{formatTimestamp(message?.createdAt)}</span>
        </div>

        <div className={message?.emojiOnly ? 'cl-chat-bubble is-emoji-only' : 'cl-chat-bubble'}>
          {deleted ? 'Message removed by moderator.' : message?.body || ''}
        </div>

        <div className="cl-chat-message-proof">
          <span>{backendConfirmed ? 'backend-confirmed' : 'local preview only'}</span>
          {message?.paid?.required ? <span>{message.paid.amountRoc} ROC</span> : <span>free</span>}
          {message?.paid?.receiptHash ? <span>receipt shown</span> : <span>no receipt</span>}
        </div>
      </div>
    </article>
  );
}

function StatusPill({ label, value, tone = 'neutral' }) {
  return (
    <div className={`cl-chat-status-pill is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SystemNotice({ children }) {
  return (
    <div className="cl-chat-system-notice">
      <span>{children}</span>
    </div>
  );
}

function labelForSendMode(value) {
  if (value === 'free') return 'Free';
  if (value === 'disabled') return 'Disabled';
  return 'Paid';
}

function labelForExpiry(room) {
  const expiry = room?.expiry || {};

  if (expiry.mode === 'expires_at' && expiry.expiresAt) {
    return 'Scheduled';
  }

  if (expiry.mode === 'manual_close') {
    return 'Manual';
  }

  return 'Never';
}
