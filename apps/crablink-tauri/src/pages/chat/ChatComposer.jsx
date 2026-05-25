/**
 * RO:WHAT — Chat composer for local preview, backend free send, and paid-message quote.
 * RO:WHY — Lets users exercise backend chat routes without pretending paid send/receipt exists.
 * RO:INTERACTS — ChatPage, ChatRoomView, chatDraftModel.
 * RO:INVARIANTS — paid send is quote-only until svc-wallet receipt path exists; no silent spend.
 * RO:SECURITY — text input only; no HTML rendering; no capability/wallet authority.
 */

import { CHAT_EMOJI_QUICK_REACTIONS, sanitizeMessageBody } from './chatDraftModel.js';

export default function ChatComposer({
  draft,
  value,
  onChange,
  onPreview,
  onPaidIntent,
  disabled = false,
  backendReady = false,
  roomSendMode = '',
  backendBusy = false,
}) {
  const inspected = sanitizeMessageBody(value, draft);
  const sendMode = roomSendMode || draft?.sendMode || 'paid_per_message';
  const price = draft?.messagePriceRoc || '1';
  const composerDisabled = disabled || backendBusy || (backendReady && sendMode === 'disabled');
  const canSubmit = inspected.body.length > 0 && !composerDisabled;

  const primaryLabel = backendReady
    ? sendMode === 'free'
      ? 'Send free message'
      : sendMode === 'paid_per_message'
        ? `Quote paid message · ${price} ROC`
        : 'Sending disabled'
    : 'Preview bubble';

  const helperText = backendReady
    ? sendMode === 'free'
      ? 'This sends to the backend in-memory dev room. No ROC is spent and no receipt is created.'
      : sendMode === 'paid_per_message'
        ? 'This quotes the paid message only. Actual paid send remains locked until svc-wallet receipt integration.'
        : 'This room is not accepting messages.'
    : 'Backend room not loaded. Preview bubbles are local-only and do not spend ROC.';

  function appendEmoji(emoji) {
    onChange(`${value || ''}${emoji}`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onPreview(inspected.body);
  }

  return (
    <form className="cl-chat-composer" onSubmit={handleSubmit} aria-label="Chat composer">
      <div className="cl-chat-emoji-row" aria-label="Emoji shortcuts">
        {CHAT_EMOJI_QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="cl-chat-emoji"
            onClick={() => appendEmoji(emoji)}
            disabled={composerDisabled || draft?.allowEmoji === false}
            aria-label={`Add emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="cl-chat-input-shell">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={backendReady ? 'Write a backend chat message… 🦀' : 'Write a local preview message… 🦀'}
          rows={2}
          maxLength={Number(draft?.maxMessageChars || 500) + 32}
          disabled={composerDisabled}
        />

        <div className="cl-chat-input-meta">
          <span>
            {inspected.length}/{inspected.max}
            {inspected.emojiOnly ? ' · emoji-only' : ''}
          </span>
          {inspected.overLimit ? <strong>Trimmed to room limit</strong> : null}
        </div>
      </div>

      <div className="cl-chat-composer-actions">
        <button type="submit" disabled={!canSubmit}>
          {backendBusy ? 'Working…' : primaryLabel}
        </button>

        <button type="button" className="cl-chat-paid-send" onClick={onPaidIntent} disabled={composerDisabled}>
          Explain paid path
        </button>
      </div>

      <p className="cl-chat-composer-note">{helperText}</p>
    </form>
  );
}
