/**
 * RO:WHAT — Route owner for the React crab://chat local workspace.
 * RO:WHY — Begins the portable chat primitive with polished UX while staying honest before backend chat routes exist.
 * RO:INTERACTS — routeRegistry, router, ChatRoomView, ChatBuilder, ChatComposer, ChatModerationPanel, chatDraftModel.
 * RO:INVARIANTS — no fake backend messages; no fake receipt; no fake ROC spend; no moderator authority; no HTML chat rendering.
 * RO:METRICS — none; future backend chat routes own fanout/message/moderation metrics.
 * RO:CONFIG — local draft defaults only.
 * RO:SECURITY — text-only message preview; no arbitrary code; no hidden spend; no wallet/capability secrets.
 * RO:TEST — npm run build; manual crab://chat smoke.
 */

import { useMemo, useState } from 'react';
import './chat.css';
import ChatBuilder from './ChatBuilder.jsx';
import ChatModerationPanel from './ChatModerationPanel.jsx';
import ChatPublishFlow from './ChatPublishFlow.jsx';
import ChatRoomView from './ChatRoomView.jsx';
import {
  CHAT_VIEW_OPTIONS,
  buildChatRoomDescriptor,
  buildLocalPreviewMessage,
  DEFAULT_CHAT_DRAFT,
  labelFromSnake,
  normalizeChatDraft,
  statsForChatDraft,
} from './chatDraftModel.js';


export default function ChatPage({ route, app }) {
  const [activeView, setActiveView] = useState('room');
  const [draft, setDraft] = useState(() => normalizeChatDraft(DEFAULT_CHAT_DRAFT));
  const [composerValue, setComposerValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState('');

  const descriptor = useMemo(() => buildChatRoomDescriptor(draft), [draft]);
  const stats = useMemo(() => statsForChatDraft(draft), [draft]);

  const currentRoute = route?.normalizedInput || route?.rawInput || 'crab://chat';
  const balanceLabel = app?.balance?.balanceMinor ?? app?.balance?.balance ?? null;
  const walletLabel = app?.settings?.walletAccount || app?.walletAccount || draft.ownerAccount;

  function updateDraft(nextDraft) {
    setDraft(normalizeChatDraft(nextDraft));
  }

  function previewMessage(body) {
    const message = buildLocalPreviewMessage({
      body,
      draft,
      kind: 'own',
    });

    setMessages((current) => [...current, message].slice(-24));
    setComposerValue('');
    setNotice('Local preview bubble created. It was not sent, paid, stored, indexed, or broadcast.');
  }

  function clearPreview() {
    setMessages([]);
    setNotice('Local preview bubbles cleared.');
  }

  function explainPaidIntent() {
    const price = descriptor.access.messagePriceRoc;

    setNotice(
      draft.sendMode === 'paid_per_message'
        ? `Future route: quote this message, ask for explicit confirmation, then backend wallet path sends ${price} ROC before the message appears. No ROC was spent now.`
        : 'Future backend send is locked until chat routes exist. No message was sent now.',
    );
  }

  return (
    <section className="cl-chat-page" aria-label="CrabLink Chat">
      <header className="cl-chat-hero">
        <div>
          <p className="cl-eyebrow">crab://chat</p>
          <h1>Chat rooms for everything</h1>
          <p>
            Portable chat for streams, podcasts, sites, profiles, and standalone rooms. Batch 1 is
            a polished local shell and builder only — no backend chat truth yet.
          </p>
        </div>

        <aside className="cl-chat-hero-card">
          <span>Truth boundary</span>
          <strong>No fake live chat</strong>
          <small>No wallet mutation · no receipt · no backend message</small>
        </aside>
      </header>

      <nav className="cl-chat-tabs" aria-label="Chat views">
        {CHAT_VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={activeView === option.value ? 'is-active' : ''}
            onClick={() => setActiveView(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {notice ? (
        <div className="cl-chat-notice" role="status">
          <strong>Local status</strong>
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="cl-chat-layout">
        <main className="cl-chat-main">
          {activeView === 'room' ? (
            <ChatRoomView
              draft={draft}
              descriptor={descriptor}
              messages={messages}
              composerValue={composerValue}
              onComposerChange={setComposerValue}
              onPreviewMessage={previewMessage}
              onPaidIntent={explainPaidIntent}
              onClearPreview={clearPreview}
            />
          ) : null}

          {activeView === 'builder' ? (
            <ChatBuilder draft={draft} descriptor={descriptor} stats={stats} onChange={updateDraft} />
          ) : null}

          {activeView === 'publish' ? (
            <ChatPublishFlow
              draft={draft}
              descriptor={descriptor}
              stats={stats}
              app={app}
              route={route}
            />
          ) : null}

          {activeView === 'moderation' ? <ChatModerationPanel draft={draft} messages={messages} /> : null}

          {activeView === 'developer' ? (
            <DeveloperPanel
              descriptor={descriptor}
              stats={stats}
              route={currentRoute}
              walletLabel={walletLabel}
              balanceLabel={balanceLabel}
            />
          ) : null}
        </main>

        <aside className="cl-chat-side">
          <section className="cl-chat-panel">
            <p className="cl-eyebrow">Room summary</p>
            <h2>{descriptor.title}</h2>
            <div className="cl-chat-summary-grid">
              <Summary label="Send" value={labelFromSnake(descriptor.access.sendMode)} />
              <Summary label="Price" value={`${descriptor.access.messagePriceRoc} ROC`} />
              <Summary label="Mods" value={String(descriptor.moderation.mods.length)} />
              <Summary label="Blocked" value={String(descriptor.moderation.blockedUsernames.length)} />
              <Summary label="Expiry" value={labelFromSnake(descriptor.expiry.mode)} />
              <Summary label="Payout" value={stats.payout_valid ? 'Valid' : 'Check split'} />
            </div>
          </section>

          <section className="cl-chat-panel">
            <p className="cl-eyebrow">Attached to</p>
            {descriptor.attachedTo.length ? (
              <div className="cl-chat-link-stack">
                {descriptor.attachedTo.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : (
              <p className="cl-chat-muted">
                Not attached yet. Add a stream, podcast, site, profile, or asset URL in Builder.
              </p>
            )}
          </section>

          <section className="cl-chat-panel is-boundary">
            <p className="cl-eyebrow">Boundary</p>
            <ul>
              <li>No backend room created</li>
              <li>No message fanout connected</li>
              <li>No ROC quote or spend</li>
              <li>No receipt generated</li>
              <li>No moderator authority granted</li>
              <li>No expiry enforcement bypass</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div className="cl-chat-summary">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DeveloperPanel({ descriptor, stats, route, walletLabel, balanceLabel }) {
  const payload = {
    route,
    schema: 'crablink.chat-local-developer-preview.v1',
    walletLabel,
    balanceDisplay: balanceLabel === null || balanceLabel === undefined ? 'not loaded' : balanceLabel,
    descriptor,
    stats,
    backend: {
      chat_routes_connected: false,
      room_create_connected: false,
      message_send_connected: false,
      paid_quote_connected: false,
      moderation_connected: false,
      fanout_connected: false,
    },
  };

  return (
    <section className="cl-chat-developer" aria-label="Chat developer preview">
      <div>
        <p className="cl-eyebrow">Developer</p>
        <h2>Local descriptor JSON</h2>
        <p>
          This is the descriptor shape we will later hand to gateway/omnigate. It is not a b3 object,
          not a room, and not backend truth yet.
        </p>
      </div>

      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </section>
  );
}