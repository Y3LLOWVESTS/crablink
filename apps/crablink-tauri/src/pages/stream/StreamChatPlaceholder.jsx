/**
 * RO:WHAT — Non-networked chat placeholder for the stream control room.
 * RO:WHY — Reserves the product surface for live chat without inventing chat backend truth.
 * RO:INTERACTS — StreamPage, StreamDraft, future mailbox/moderation/chat service contracts.
 * RO:INVARIANTS — no real chat transport; no fake users/viewers/messages; no arbitrary code execution; no wallet action.
 * RO:METRICS — none; future chat routes need moderation/fanout metrics.
 * RO:CONFIG — draft.chatMode and draft.chatWelcome only.
 * RO:SECURITY — disabled input; never renders untrusted HTML or executes chat content.
 * RO:TEST — manual crab://stream layout smoke.
 */

import { labelFromSnake } from './streamDraftModel.js';

export default function StreamChatPlaceholder({ draft, onChange }) {
  function updateWelcome(value) {
    onChange({
      ...draft,
      chatWelcome: value,
    });
  }

  return (
    <aside className="cl-stream-chat" aria-label="Stream chat placeholder">
      <div className="cl-stream-chat-head">
        <div>
          <p className="cl-eyebrow">Chat placeholder</p>
          <h2>Live chat later</h2>
        </div>
        <span>{labelFromSnake(draft.chatMode)}</span>
      </div>

      <div className="cl-stream-chat-body">
        <div className="cl-stream-chat-empty">
          <strong>No backend chat connected</strong>
          <p>
            This keeps the creator layout honest while reserving the future chat, moderation, and
            paid-window UX. No fake viewer count or fake messages are generated.
          </p>
        </div>
      </div>

      <label className="cl-stream-chat-note">
        <span>Optional pinned note draft</span>
        <textarea
          value={draft.chatWelcome}
          onChange={(event) => updateWelcome(event.target.value)}
          placeholder="Welcome message, stream rules, or pinned note for later chat support..."
          rows={3}
          maxLength={280}
        />
      </label>

      <div className="cl-stream-chat-input-row" aria-label="Disabled chat composer">
        <input value="Chat transport not wired yet" readOnly disabled />
        <button type="button" disabled>
          Send
        </button>
      </div>
    </aside>
  );
}