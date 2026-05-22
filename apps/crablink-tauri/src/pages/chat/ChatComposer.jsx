/**
 * RO:WHAT — Local-only chat composer for crab://chat.
 * RO:WHY — Lets creators preview message UX without claiming backend send/ROC/payment truth.
 * RO:INTERACTS — ChatPage, ChatRoomView, chatDraftModel.
 * RO:INVARIANTS — preview only; backend send disabled until chat routes exist; no silent spend.
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
}) {
  const inspected = sanitizeMessageBody(value, draft);
  const sendMode = draft?.sendMode || 'paid_per_message';
  const price = draft?.messagePriceRoc || '1';
  const canPreview = inspected.body.length > 0 && !disabled;
  const lockedReason =
    sendMode === 'disabled'
      ? 'Room send mode is disabled.'
      : 'Backend chat send routes are not wired yet. Preview is local-only.';

  function appendEmoji(emoji) {
    onChange(`${value || ''}${emoji}`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canPreview) {
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
            disabled={disabled || draft?.allowEmoji === false}
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
          placeholder="Write a chat message… emoji are welcome 🦀"
          rows={2}
          maxLength={Number(draft?.maxMessageChars || 500) + 32}
          disabled={disabled}
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
        <button type="submit" disabled={!canPreview}>
          Preview bubble
        </button>

        <button type="button" className="cl-chat-paid-send" onClick={onPaidIntent} disabled={disabled}>
          {sendMode === 'paid_per_message' ? `Future paid send · ${price} ROC` : 'Future backend send'}
        </button>
      </div>

      <p className="cl-chat-composer-note">{lockedReason}</p>
    </form>
  );
}