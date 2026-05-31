/**
 * RO:WHAT — Bubble-based room view for local and backend-confirmed CrabLink chat messages.
 * RO:WHY — Shows real backend messages and explicit paid-message confirmation without inventing receipts.
 * RO:INTERACTS — ChatPage, ChatComposer, chatDraftModel, chat.css.
 * RO:INVARIANTS — local preview bubbles are labeled; paid bubbles are backend-derived; no fake receipts.
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
  resolving = false,
  onComposerChange,
  onPreviewMessage,
  onPaidIntent,
  onConfirmPaidMessage,
  onCancelPaidQuote,
  onClearPreview,
  onClearBackendRoom,
  onRefreshBackend,
}) {
  const room = backendRoomPage?.room || descriptor;
  const backendReady = Boolean(backendRoomPage?.room?.roomId);
  const sendMode = room?.access?.sendMode || descriptor?.access?.sendMode || 'paid_per_message';
  const price = room?.access?.messagePriceRoc ?? descriptor?.access?.messagePriceRoc ?? 0;
  const pinnedNote = room?.pinnedNote || descriptor?.pinnedNote || '';
  const receiptCount = backendMessages.filter((message) => hasReceipt(message)).length;
  const allMessages = [
    ...backendMessages.map((message) => ({ ...message, backendConfirmed: true })),
    ...localMessages.map((message) => ({ ...message, backendConfirmed: false })),
  ];

  return (
    <section className={backendReady ? 'cl-chat-room is-backend-ready' : 'cl-chat-room'} aria-label="Chat room">
      <div className="cl-chat-room-head">
        <div>
          <p className="cl-eyebrow">{backendReady ? 'Backend room' : resolving ? 'Resolving room' : 'Portable room'}</p>
          <h2>{room?.title || 'CrabLink Chat'}</h2>
          <p>{room?.description || 'A portable chat room for streams, podcasts, sites, and profiles.'}</p>
        </div>

        <div className="cl-chat-room-price">
          <span>{sendMode === 'paid_per_message' ? 'Paid messages' : 'Send mode'}</span>
          <strong>{sendMode === 'paid_per_message' ? `${price} ROC` : labelForSendMode(sendMode)}</strong>
        </div>
      </div>

      <div className="cl-chat-status-rail" aria-label="Chat route status">
        <StatusPill
          label="Backend"
          value={backendReady ? 'Connected' : resolving ? 'Resolving' : 'Local only'}
          tone={backendReady ? 'ok' : resolving ? 'info' : 'warn'}
        />
        <StatusPill label="Messages" value={backendReady ? 'Backend-confirmed' : 'Local preview'} tone="info" />
        <StatusPill label="Receipts" value={receiptCount ? `${receiptCount} paid` : 'None'} tone={receiptCount ? 'ok' : 'warn'} />
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
            {room.roomUrl || room.roomId} · descriptor may be b3-addressed · paid messages require quote and
            explicit confirmation before backend wallet spend
          </span>
        </div>
      ) : resolving ? (
        <div className="cl-chat-backend-proof">
          <strong>Resolving canonical chat descriptor</strong>
          <span>
            You can type and preview locally while resolve is pending. ROC cannot move until the backend room loads.
          </span>
        </div>
      ) : null}

      {pendingQuote ? (
        <div className="cl-chat-quote-card">
          <div>
            <strong>Paid-message quote ready</strong>
            <span>
              {pendingQuote.amountRoc ?? pendingQuote.quote?.amountRoc ?? price} ROC · payer{' '}
              {pendingQuote.walletAccount || 'wallet not set'} → recipient{' '}
              {quoteRecipient(pendingQuote.quote) || room?.ownerAccount || 'room owner'}
            </span>
          </div>

          <div className="cl-chat-quote-preview">
            <span>Message</span>
            <p>{pendingQuote.body}</p>
          </div>

          <div className="cl-chat-quote-facts">
            <QuoteFact label="Room" value={pendingQuote.roomId || room?.roomId || 'n/a'} />
            <QuoteFact label="Idempotency" value={pendingQuote.idempotencyKey || 'n/a'} monospace />
            <QuoteFact label="Quote created" value={formatTimestamp(pendingQuote.createdAt)} />
          </div>

          <div className="cl-chat-quote-actions">
            <button type="button" onClick={onConfirmPaidMessage} disabled={backendBusy || resolving}>
              {backendBusy ? 'Confirming…' : 'Confirm paid send'}
            </button>
            <button type="button" className="is-secondary" onClick={onCancelPaidQuote} disabled={backendBusy}>
              Cancel quote
            </button>
          </div>

          <small>
            No message is added by the UI during confirmation. It appears only if the backend accepts
            the wallet path and returns a backend-confirmed message.
          </small>
        </div>
      ) : null}

      <div className="cl-chat-thread" aria-label="Chat thread">
        <SystemNotice>
          {backendReady
            ? 'Backend messages shown here are returned by gateway/omnigate. The room descriptor can be b3-addressed, but live messages are not durable yet.'
            : resolving
              ? 'Resolving the canonical room. Local previews are allowed, but backend paid send waits for room hydration.'
              : 'Create or resolve a backend room from the Publish tab. Local bubbles are preview only.'}
        </SystemNotice>

        {allMessages.length ? (
          allMessages.map((message) => (
            <MessageBubble key={message.messageId || message.message_id || `${message.createdAt}-${message.body}`} message={message} />
          ))
        ) : (
          <div className="cl-chat-empty-thread">
            <div className="cl-chat-empty-orb">💬</div>
            <strong>
              {backendReady ? 'No backend messages yet' : resolving ? 'Resolving backend room' : 'No local preview bubbles yet'}
            </strong>
            <p>
              {backendReady
                ? 'Send a message in a free backend room, or quote and confirm a paid message in a paid room.'
                : resolving
                  ? 'You can type and preview locally below while the canonical descriptor resolves.'
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
        resolving={resolving}
        onChange={onComposerChange}
        onPreview={onPreviewMessage}
        onPaidIntent={onPaidIntent}
      />

      <div className="cl-chat-room-actions">
        <button type="button" onClick={onRefreshBackend} disabled={!backendReady || backendBusy || resolving}>
          Refresh backend messages
        </button>
        <button type="button" onClick={onClearPreview} disabled={!localMessages.length}>
          Clear local previews
        </button>
        <button type="button" onClick={onClearBackendRoom} disabled={!backendReady && !resolving}>
          Clear backend room view
        </button>
        <span>
          {backendReady
            ? 'Backend room loaded · paid send requires confirmation · receipt cache is display-only'
            : resolving
              ? 'Resolving canonical descriptor · local preview only'
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
  const moderationState = String(message?.moderation?.state || '').trim();
  const deleted = isDeletedModerationState(moderationState);
  const localPreviewOnly =
    Boolean(message?.localPreviewOnly) ||
    moderationState === 'local_preview_only' ||
    message?.schema === 'crablink.chat-message.local-preview.v1';
  const paid = message?.paid || {};
  const receiptHash = paid.receiptHash || paid.receipt_hash || '';
  const walletTxid = paid.walletTxid || paid.wallet_txid || '';
  const ledgerRoot = paid.ledgerRoot || paid.ledger_root || '';

  return (
    <article
      className={[
        own ? 'cl-chat-message is-own' : 'cl-chat-message',
        backendConfirmed ? 'is-backend' : 'is-local',
        deleted ? 'is-deleted' : '',
        localPreviewOnly ? 'is-local-preview' : '',
        hasReceipt(message) ? 'is-paid-receipted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={backendConfirmed ? 'Backend-confirmed message' : 'Local preview message'}
    >
      <div className="cl-chat-message-avatar" aria-hidden="true">
        {message?.avatar || (hasReceipt(message) ? '🧾' : backendConfirmed ? '✅' : own ? '🦀' : '💬')}
      </div>

      <div className="cl-chat-message-main">
        <div className="cl-chat-message-meta">
          <strong>{message?.senderDisplay || message?.sender_display || '@preview'}</strong>
          <span>{formatTimestamp(message?.createdAt || message?.created_at)}</span>
        </div>

        <div className={message?.emojiOnly ? 'cl-chat-bubble is-emoji-only' : 'cl-chat-bubble'}>
          {deleted ? 'Message removed by moderator.' : message?.body || ''}
        </div>

        <div className="cl-chat-message-proof">
          <span>{backendConfirmed ? 'backend-confirmed' : 'local preview only'}</span>
          {paid?.required ? (
            <span>{localPreviewOnly ? `would cost ${paid.amountRoc ?? paid.amount_roc ?? 0} ROC` : `${paid.amountRoc ?? paid.amount_roc ?? 0} ROC`}</span>
          ) : (
            <span>free</span>
          )}
          {receiptHash ? <span title={receiptHash}>receipt {shortProof(receiptHash)}</span> : null}
          {walletTxid ? <span title={walletTxid}>tx {shortProof(walletTxid)}</span> : null}
          {ledgerRoot ? <span title={ledgerRoot}>ledger {shortProof(ledgerRoot)}</span> : null}
          {!receiptHash && !walletTxid && !ledgerRoot ? <span>no receipt</span> : null}
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

function QuoteFact({ label, value, monospace = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={String(value || '')}>
        {value || 'n/a'}
      </strong>
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

function quoteRecipient(quote) {
  return quote?.recipientAccount || quote?.recipient_account || quote?.recipient || '';
}

function hasReceipt(message) {
  const paid = message?.paid || {};
  return Boolean(
    paid.receiptHash ||
      paid.receipt_hash ||
      paid.walletTxid ||
      paid.wallet_txid ||
      paid.ledgerRoot ||
      paid.ledger_root,
  );
}

function isDeletedModerationState(state) {
  return [
    'deleted',
    'removed',
    'moderator_deleted',
    'mod_deleted',
    'blocked',
    'hidden',
  ].includes(String(state || '').trim().toLowerCase());
}

function shortProof(value) {
  const clean = String(value || '').trim();

  if (clean.length <= 14) {
    return clean;
  }

  return `${clean.slice(0, 6)}…${clean.slice(-6)}`;
}