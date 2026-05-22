/**
 * RO:WHAT — Local-only moderation planning panel for crab://chat.
 * RO:WHY — Gives creators a place to design mods/blocklists without claiming backend authority.
 * RO:INTERACTS — ChatPage, ChatBuilder, chatDraftModel.
 * RO:INVARIANTS — no real delete/block/pin actions; no moderator grant; no backend audit event.
 * RO:SECURITY — display-only lists; no privileged capability in React.
 */

import { parseList } from './chatDraftModel.js';

export default function ChatModerationPanel({ draft, messages }) {
  const mods = parseList(draft.mods);
  const blockedUsers = parseList(draft.blockedUsernames);
  const blockedTerms = parseList(draft.blockedTerms);

  return (
    <section className="cl-chat-moderation" aria-label="Chat moderation plan">
      <div className="cl-chat-moderation-head">
        <div>
          <p className="cl-eyebrow">Moderation</p>
          <h2>Mod powers planned</h2>
          <p>
            This panel is local-only in Batch 1. Delete, block, and pin controls become real only
            after backend authorization routes exist.
          </p>
        </div>
        <span>backend locked</span>
      </div>

      <div className="cl-chat-mod-grid">
        <ModCard title="Mods" count={mods.length} items={mods} empty="No mods listed yet." />
        <ModCard title="Blocked users" count={blockedUsers.length} items={blockedUsers} empty="No blocked usernames yet." />
        <ModCard title="Blocked terms" count={blockedTerms.length} items={blockedTerms} empty="No blocked terms yet." />
      </div>

      <div className="cl-chat-mod-actions">
        <button type="button" disabled>
          Delete selected message
        </button>
        <button type="button" disabled>
          Block @username
        </button>
        <button type="button" disabled>
          Pin message
        </button>
      </div>

      <div className="cl-chat-mod-log">
        <strong>Local moderation log</strong>
        {messages.length ? (
          <p>
            {messages.length} local preview bubble{messages.length === 1 ? '' : 's'} visible. No backend moderation
            state exists yet.
          </p>
        ) : (
          <p>No messages to moderate. Future backend messages will carry moderation state and audit IDs.</p>
        )}
      </div>
    </section>
  );
}

function ModCard({ title, count, items, empty }) {
  return (
    <article className="cl-chat-mod-card">
      <div>
        <span>{title}</span>
        <strong>{count}</strong>
      </div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}