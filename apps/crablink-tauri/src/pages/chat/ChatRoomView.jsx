/**
 * RO:WHAT — Bubble-based local room preview for the React crab://chat route.
 * RO:WHY — Provides the polished iMessage-like chat feel while staying honest about missing backend chat truth.
 * RO:INTERACTS — ChatPage, ChatComposer, chatDraftModel, chat.css.
 * RO:INVARIANTS — local preview bubbles are labeled; no fake backend messages; no fake receipts; no live fanout claim.
 * RO:SECURITY — renders text only; message body is never injected as HTML.
 */

import { formatTimestamp } from './chatDraftModel.js';
import ChatComposer from './ChatComposer.jsx';

export default function ChatRoomView({
  draft,
  descriptor,
  messages,
  composerValue,
  onComposerChange,
  onPreviewMessage,
  onPaidIntent,
  onClearPreview,
}) {
  const sendMode = descriptor?.access?.sendMode || 'paid_per_message';
  const price = descriptor?.access?.messagePriceRoc || 0;
  const pinnedNote = descriptor?.pinnedNote || '';

  return (
    <section className="cl-chat-room" aria-label="Chat room preview">
      <div className="cl-chat-room-head">
        <div>
          <p className="cl-eyebrow">Portable room</p>
          <h2>{descriptor?.title || 'CrabLink Chat'}</h2>
          <p>{descriptor?.description || 'A portable chat room for streams, podcasts, sites, and profiles.'}</p>
        </div>

        <div className="cl-chat-room-price">
          <span>{sendMode === 'paid_per_message' ? 'Paid messages' : 'Send mode'}</span>
          <strong>{sendMode === 'paid_per_message' ? `${price} ROC` : labelForSendMode(sendMode)}</strong>
        </div>
      </div>

      <div className="cl-chat-status-rail" aria-label="Chat route status">
        <StatusPill label="Backend" value="Not connected" tone="warn" />
        <StatusPill label="Messages" value="Local preview" tone="info" />
        <StatusPill label="Receipts" value="None" tone="warn" />
        <StatusPill label="Expiry" value={labelForExpiry(descriptor)} tone="neutral" />
      </div>

      {pinnedNote ? (
        <div className="cl-chat-pinned-note">
          <span>PINNED</span>
          <p>{pinnedNote}</p>
        </div>
      ) : null}

      <div className="cl-chat-thread" aria-label="Local chat preview thread">
        <SystemNotice>
          Chat backend routes are not wired in this batch. These bubbles are local UI previews only.
        </SystemNotice>

        {messages.length ? (
          messages.map((message) => <MessageBubble key={message.messageId} message={message} />)
        ) : (
          <div className="cl-chat-empty-thread">
            <div className="cl-chat-empty-orb">💬</div>
            <strong>No local preview bubbles yet</strong>
            <p>
              Type a message below and click Preview bubble. It will not send, spend ROC, create a
              receipt, or become backend chat truth.
            </p>
          </div>
        )}
      </div>

      <ChatComposer
        draft={draft}
        value={composerValue}
        onChange={onComposerChange}
        onPreview={onPreviewMessage}
        onPaidIntent={onPaidIntent}
      />

      <div className="cl-chat-room-actions">
        <button type="button" onClick={onClearPreview} disabled={!messages.length}>
          Clear local previews
        </button>
        <span>Display cache only · no backend messages · no paid send yet</span>
      </div>
    </section>
  );
}


export function MessageBubble({ message }) {
  const own = String(message?.senderDisplay || '').includes('@you') || message?.senderDisplay === '@me';

  return (
    <article className={own ? 'cl-chat-message is-own' : 'cl-chat-message'} aria-label="Local preview message">
      <div className="cl-chat-message-avatar" aria-hidden="true">
        {message?.avatar || (own ? '🦀' : '💬')}
      </div>

      <div className="cl-chat-message-main">
        <div className="cl-chat-message-meta">
          <strong>{message?.senderDisplay || '@preview'}</strong>
          <span>{formatTimestamp(message?.createdAt)}</span>
        </div>

        <div className={message?.emojiOnly ? 'cl-chat-bubble is-emoji-only' : 'cl-chat-bubble'}>
          {message?.body || ''}
        </div>

        <div className="cl-chat-message-proof">
          <span>local preview only</span>
          {message?.paid?.required ? <span>{message.paid.amountRoc} ROC future send</span> : <span>free future send</span>}
          <span>no receipt</span>
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

function labelForExpiry(descriptor) {
  const expiry = descriptor?.expiry || {};

  if (expiry.mode === 'expires_at' && expiry.expiresAt) {
    return 'Scheduled';
  }

  if (expiry.mode === 'manual_close') {
    return 'Manual';
  }

  return 'Never';
}