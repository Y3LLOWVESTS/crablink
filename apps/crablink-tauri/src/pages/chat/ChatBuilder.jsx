/**
 * RO:WHAT — Local chat room builder for crab://chat.
 * RO:WHY — Lets creators design room settings, paid-message pricing, expiry, mods, and blocklists before backend routes exist.
 * RO:INTERACTS — ChatPage, chatDraftModel, chat.css.
 * RO:INVARIANTS — descriptor preview only; no b3 CID; no chat URL mint; no wallet mutation; no moderator authority.
 * RO:SECURITY — form text only; no executable content; no capability secrets.
 */

import {
  CHAT_ARCHIVE_MODE_OPTIONS,
  CHAT_EXPIRY_MODE_OPTIONS,
  CHAT_SEND_MODE_OPTIONS,
} from './chatDraftModel.js';

export default function ChatBuilder({ draft, descriptor, stats, onChange }) {
  function patch(patchValue) {
    onChange({
      ...draft,
      ...patchValue,
    });
  }

  return (
    <section className="cl-chat-builder" aria-label="Chat builder">
      <div className="cl-chat-builder-head">
        <div>
          <p className="cl-eyebrow">Room builder</p>
          <h2>Settings before backend truth</h2>
          <p>
            Shape the chat descriptor locally. Backend room creation, paid messages, receipts, expiry
            enforcement, and moderation authority come in later batches.
          </p>
        </div>
        <div className={stats.payout_valid ? 'cl-chat-builder-score is-good' : 'cl-chat-builder-score is-warn'}>
          <span>Payout split</span>
          <strong>{stats.payout_total_bps} bps</strong>
        </div>
      </div>

      <div className="cl-chat-builder-grid">
        <Field label="Room title">
          <input value={draft.roomTitle} onChange={(event) => patch({ roomTitle: event.target.value })} />
        </Field>

        <Field label="Owner display">
          <input value={draft.ownerDisplay} onChange={(event) => patch({ ownerDisplay: event.target.value })} />
        </Field>

        <Field label="Owner passport">
          <input value={draft.ownerPassport} onChange={(event) => patch({ ownerPassport: event.target.value })} />
        </Field>

        <Field label="Owner wallet account">
          <input value={draft.ownerAccount} onChange={(event) => patch({ ownerAccount: event.target.value })} />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={draft.description}
          rows={3}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>

      <Field label="Attach to crab URLs">
        <textarea
          value={draft.attachedTo}
          rows={3}
          placeholder="crab://<hash>.stream, crab://<hash>.podcast, crab://@creator"
          onChange={(event) => patch({ attachedTo: event.target.value })}
        />
      </Field>

      <div className="cl-chat-builder-grid is-three">
        <Field label="Send mode">
          <select value={draft.sendMode} onChange={(event) => patch({ sendMode: event.target.value })}>
            {CHAT_SEND_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ROC per message">
          <input
            inputMode="numeric"
            value={draft.messagePriceRoc}
            onChange={(event) => patch({ messagePriceRoc: event.target.value })}
          />
        </Field>

        <Field label="Max chars">
          <input
            inputMode="numeric"
            value={draft.maxMessageChars}
            onChange={(event) => patch({ maxMessageChars: event.target.value })}
          />
        </Field>
      </div>

      <div className="cl-chat-builder-grid is-three">
        <Field label="Creator share bps">
          <input
            inputMode="numeric"
            value={draft.creatorShareBps}
            onChange={(event) => patch({ creatorShareBps: event.target.value })}
          />
        </Field>

        <Field label="Platform share bps">
          <input
            inputMode="numeric"
            value={draft.platformShareBps}
            onChange={(event) => patch({ platformShareBps: event.target.value })}
          />
        </Field>

        <Field label="Moderator pool bps">
          <input
            inputMode="numeric"
            value={draft.moderatorPoolBps}
            onChange={(event) => patch({ moderatorPoolBps: event.target.value })}
          />
        </Field>
      </div>

      <div className="cl-chat-builder-grid is-three">
        <Field label="Expiry mode">
          <select value={draft.expiryMode} onChange={(event) => patch({ expiryMode: event.target.value })}>
            {CHAT_EXPIRY_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Expires at">
          <input
            type="datetime-local"
            value={draft.expiresAt}
            onChange={(event) => patch({ expiresAt: event.target.value })}
            disabled={draft.expiryMode !== 'expires_at'}
          />
        </Field>

        <Field label="Archive mode">
          <select value={draft.archiveMode} onChange={(event) => patch({ archiveMode: event.target.value })}>
            {CHAT_ARCHIVE_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="cl-chat-builder-grid">
        <Field label="Mods">
          <textarea
            value={draft.mods}
            rows={3}
            placeholder="@modname, crab://@othermod"
            onChange={(event) => patch({ mods: event.target.value })}
          />
        </Field>

        <Field label="Blocked @usernames">
          <textarea
            value={draft.blockedUsernames}
            rows={3}
            placeholder="@baduser"
            onChange={(event) => patch({ blockedUsernames: event.target.value })}
          />
        </Field>
      </div>

      <div className="cl-chat-builder-grid">
        <Field label="Blocked terms">
          <textarea
            value={draft.blockedTerms}
            rows={3}
            placeholder="term one, term two"
            onChange={(event) => patch({ blockedTerms: event.target.value })}
          />
        </Field>

        <Field label="Pinned note">
          <textarea
            value={draft.pinnedNote}
            rows={3}
            placeholder="Welcome message or room rules"
            onChange={(event) => patch({ pinnedNote: event.target.value })}
          />
        </Field>
      </div>

      <div className="cl-chat-toggle-row">
        <label>
          <input
            type="checkbox"
            checked={draft.allowEmoji}
            onChange={(event) => patch({ allowEmoji: event.target.checked })}
          />
          <span>Allow emoji</span>
        </label>

        <label>
          <input
            type="checkbox"
            checked={draft.allowReactions}
            onChange={(event) => patch({ allowReactions: event.target.checked })}
          />
          <span>Allow reactions later</span>
        </label>
      </div>

      <div className="cl-chat-builder-truth">
        <strong>Local descriptor preview</strong>
        <span>
          {descriptor.attachedTo.length} attachments · {descriptor.moderation.mods.length} mods ·{' '}
          {descriptor.moderation.blockedUsernames.length} blocked users · backend not created
        </span>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="cl-chat-field">
      <span>{label}</span>
      {children}
    </label>
  );
}