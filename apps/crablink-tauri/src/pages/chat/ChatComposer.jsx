/**
 * RO:WHAT — Chat composer for local preview, backend free send, and paid-message quote.
 * RO:WHY — Lets users type and submit while canonical room resolve is pending, without allowing silent spend or fake backend send.
 * RO:INTERACTS — ChatPage, ChatRoomView, chatDraftModel.
 * RO:INVARIANTS — paid send starts as quote-only; confirmation happens through explicit UI; no silent spend.
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
  resolving = false,
}) {
  const inspected = sanitizeMessageBody(value, draft);
  const sendMode = roomSendMode || draft?.sendMode || 'paid_per_message';
  const price = draft?.messagePriceRoc || '1';

  const inputDisabled = disabled || (backendReady && sendMode === 'disabled');

  // Resolving is not a spend/send operation. It must not lock typing or local preview.
  // If backendReady is false, ChatPage will create a clearly labeled local preview only.
  const submitDisabled = inputDisabled || backendBusy;
  const canSubmit = inspected.body.length > 0 && !submitDisabled;

  const primaryLabel = backendReady
    ? sendMode === 'free'
      ? 'Send free message'
      : sendMode === 'paid_per_message'
        ? `Quote paid message · ${price} ROC`
        : 'Sending disabled'
    : resolving
      ? 'Preview while resolving'
      : 'Preview bubble';

  const helperText = backendReady
    ? sendMode === 'free'
      ? 'Press Enter to send to the backend room. Shift+Enter adds a new line. No ROC is spent and no receipt is created.'
      : sendMode === 'paid_per_message'
        ? 'Press Enter to quote the paid message. You must still click Confirm paid send before any backend wallet path is requested. Shift+Enter adds a new line.'
        : 'This room is not accepting messages.'
    : resolving
      ? 'Resolving the canonical chat descriptor. Press Enter to create a local preview bubble only. It will not spend ROC or become backend truth.'
      : 'Backend room not loaded. Press Enter to create a local preview bubble only. Shift+Enter adds a new line.';

  function appendEmoji(emoji) {
    if (inputDisabled || draft?.allowEmoji === false) {
      return;
    }

    onChange(`${value || ''}${emoji}`);
  }

  function submitMessage() {
    if (!canSubmit) {
      return;
    }

    onPreview(inspected.body);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event) {
    const isEnter = event.key === 'Enter';
    const wantsNewline = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
    const isComposing = Boolean(event.nativeEvent?.isComposing || event.isComposing);

    if (!isEnter || wantsNewline || isComposing) {
      return;
    }

    event.preventDefault();
    submitMessage();
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
            disabled={inputDisabled || draft?.allowEmoji === false}
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
          onKeyDown={handleKeyDown}
          placeholder={backendReady ? 'Write a backend chat message… 🦀' : 'Write a local preview message… 🦀'}
          rows={2}
          maxLength={Number(draft?.maxMessageChars || 500) + 32}
          disabled={inputDisabled}
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

        <button type="button" className="cl-chat-paid-send" onClick={onPaidIntent} disabled={inputDisabled}>
          Explain paid path
        </button>
      </div>

      <p className="cl-chat-composer-note">{helperText}</p>
    </form>
  );
}