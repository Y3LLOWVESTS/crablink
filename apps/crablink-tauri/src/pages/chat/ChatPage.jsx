/**
 * RO:WHAT — Route owner for the React crab://chat workspace.
 * RO:WHY — Connects the polished chat shell to backend in-memory chat routes while keeping paid sends fail-closed.
 * RO:INTERACTS — routeRegistry, ChatRoomView, ChatBuilder, ChatPublishFlow, ChatModerationPanel, GatewayClient, chatClient.
 * RO:INVARIANTS — no fake backend messages; no fake receipt; no fake ROC spend; no moderator authority; no HTML chat rendering.
 * RO:METRICS — displays route/status/reason/correlation IDs from backend chat client calls.
 * RO:CONFIG — gateway settings from app shell; local draft defaults.
 * RO:SECURITY — text-only message preview; no arbitrary code; no hidden spend; no wallet/capability secrets.
 * RO:TEST — npm run build; manual crab://chat create free room → send → refresh latest.
 */

import { useMemo, useState } from 'react';
import './chat.css';
import ChatBuilder from './ChatBuilder.jsx';
import ChatModerationPanel from './ChatModerationPanel.jsx';
import ChatPublishFlow from './ChatPublishFlow.jsx';
import ChatRoomView from './ChatRoomView.jsx';
import { createGatewayClient } from '../../shared/api/gatewayClient.js';
import { createChatClient, normalizeRoomId, stableIdempotencyKey } from '../../shared/api/chatClient.js';
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
  const [localMessages, setLocalMessages] = useState([]);
  const [backendMessages, setBackendMessages] = useState([]);
  const [backendRoomPage, setBackendRoomPage] = useState(null);
  const [pendingQuote, setPendingQuote] = useState(null);
  const [backendBusy, setBackendBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const descriptor = useMemo(() => buildChatRoomDescriptor(draft), [draft]);
  const stats = useMemo(() => statsForChatDraft(draft), [draft]);
  const gateway = useMemo(() => createGatewayClient(settingsFromApp(app)), [app]);
  const chatClient = useMemo(() => createChatClient(gateway), [gateway]);

  const currentRoute = route?.normalizedInput || route?.rawInput || 'crab://chat';
  const balanceLabel = app?.balance?.balanceMinor ?? app?.balance?.balance ?? null;
  const walletLabel = app?.settings?.walletAccount || app?.walletAccount || draft.ownerAccount;
  const displayRoom = backendRoomPage?.room || descriptor;
  const backendRoomId = displayRoom?.roomId || roomIdFromRoom(displayRoom);

  function updateDraft(nextDraft) {
    setDraft(normalizeChatDraft(nextDraft));
  }

  function handleRoomHydrated(result, source = 'backend') {
    const page = normalizeBackendRoomPage(result);

    if (!page?.room) {
      setNotice('Backend responded, but no room object was returned.');
      return;
    }

    setBackendRoomPage(page);
    setBackendMessages(Array.isArray(page.latest) ? page.latest : []);
    setPendingQuote(null);
    setActiveView('room');
    setNotice(
      source === 'created'
        ? `Backend room created: ${page.room.roomUrl || page.room.roomId}. This is in-memory dev proof, not durable b3 chat yet.`
        : `Backend room loaded: ${page.room.roomUrl || page.room.roomId}.`,
    );
  }

  async function sendOrPreviewMessage(body) {
    const room = backendRoomPage?.room;
    const sendMode = room?.access?.sendMode || descriptor?.access?.sendMode || draft.sendMode;

    if (!room?.roomId) {
      const message = buildLocalPreviewMessage({
        body,
        draft,
        kind: 'own',
      });

      setLocalMessages((current) => [...current, message].slice(-24));
      setComposerValue('');
      setNotice('Local preview bubble created. It was not sent, paid, stored, indexed, or broadcast.');
      return;
    }

    if (sendMode === 'disabled') {
      setNotice('This backend room has sending disabled.');
      return;
    }

    if (sendMode === 'paid_per_message') {
      await quotePaidMessage(body, room);
      return;
    }

    await sendFreeMessage(body, room);
  }

  async function quotePaidMessage(body, room = backendRoomPage?.room) {
    if (!room?.roomId) {
      setNotice('Create or load a backend room before quoting a paid chat message.');
      return;
    }

    setBackendBusy(true);

    try {
      const result = await chatClient.quoteMessage({
        roomId: room.roomId,
        body,
        senderPassport: draft.ownerPassport,
        walletAccount: walletLabel,
        clientNonce: stableIdempotencyKey('chat-quote', room.roomId, body, walletLabel),
      });
      const data = unwrapGatewayData(result);

      setPendingQuote({
        body,
        quote: data,
        roomId: room.roomId,
        createdAt: new Date().toISOString(),
      });
      setNotice(
        `Paid-message quote ready: ${data?.amountRoc ?? room?.access?.messagePriceRoc ?? 0} ROC. Paid send is still locked until svc-wallet receipt integration lands.`,
      );
    } catch (error) {
      setNotice(`Paid quote failed: ${safeErrorMessage(error)}`);
    } finally {
      setBackendBusy(false);
    }
  }

  async function sendFreeMessage(body, room = backendRoomPage?.room) {
    if (!room?.roomId) {
      setNotice('Create or load a backend room before sending.');
      return;
    }

    setBackendBusy(true);

    try {
      const result = await chatClient.sendMessage(
        {
          roomId: room.roomId,
          senderPassport: draft.ownerPassport,
          senderDisplay: draft.localPreviewName || draft.ownerDisplay || '@you',
          walletAccount: walletLabel,
          body,
          idempotencyKey: stableIdempotencyKey('chat-free-send', room.roomId, body, walletLabel),
        },
        {
          confirmed: true,
        },
      );
      const data = unwrapGatewayData(result);
      const message = data?.message;

      if (message) {
        setBackendMessages((current) => [...current, message].slice(-100));
      }

      setComposerValue('');
      setPendingQuote(null);
      setNotice('Free backend message accepted. No ROC was spent and no receipt was created.');
    } catch (error) {
      setNotice(`Free backend send failed: ${safeErrorMessage(error)}`);
    } finally {
      setBackendBusy(false);
    }
  }

  async function refreshBackendMessages() {
    const room = backendRoomPage?.room;

    if (!room?.roomId) {
      setNotice('No backend room is loaded yet.');
      return;
    }

    setBackendBusy(true);

    try {
      const result = await chatClient.listMessages({
        roomId: room.roomId,
        limit: 100,
      });
      const data = unwrapGatewayData(result);
      const messages = Array.isArray(data?.messages) ? data.messages : [];

      setBackendMessages(messages);
      setNotice(`Loaded ${messages.length} backend-confirmed message${messages.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setNotice(`Refresh failed: ${safeErrorMessage(error)}`);
    } finally {
      setBackendBusy(false);
    }
  }

  function clearPreview() {
    setLocalMessages([]);
    setNotice('Local preview bubbles cleared.');
  }

  function clearBackendRoom() {
    setBackendRoomPage(null);
    setBackendMessages([]);
    setPendingQuote(null);
    setNotice('Backend room view cleared. The in-memory backend room may still exist until omnigate restarts.');
  }

  function explainPaidIntent() {
    const price = displayRoom?.access?.messagePriceRoc ?? descriptor?.access?.messagePriceRoc ?? 0;

    setNotice(
      displayRoom?.access?.sendMode === 'paid_per_message'
        ? `Paid chat send is quote-only for now. The next backend batch must route the confirmed spend through svc-wallet and return a real receipt before the message appears. Current quote price: ${price} ROC.`
        : 'Backend send is available only for free in-memory dev rooms in this batch.',
    );
  }

  return (
    <section className="cl-chat-page" aria-label="CrabLink Chat">
      <header className="cl-chat-hero">
        <div>
          <p className="cl-eyebrow">crab://chat</p>
          <h1>Chat rooms for everything</h1>
          <p>
            Portable chat for streams, podcasts, sites, profiles, and standalone rooms. Backend
            create/resolve/free-send is now wired for in-memory dev proof; paid send stays locked.
          </p>
        </div>

        <aside className={backendRoomPage ? 'cl-chat-hero-card is-live' : 'cl-chat-hero-card'}>
          <span>{backendRoomPage ? 'Backend room' : 'Truth boundary'}</span>
          <strong>{backendRoomPage ? 'In-memory live' : 'No fake live chat'}</strong>
          <small>
            {backendRoomPage
              ? `${backendRoomPage.room?.roomUrl || backendRoomPage.room?.roomId} · not durable`
              : 'No wallet mutation · no receipt · no backend message'}
          </small>
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
          <strong>Status</strong>
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="cl-chat-layout">
        <main className="cl-chat-main">
          {activeView === 'room' ? (
            <ChatRoomView
              draft={draft}
              descriptor={descriptor}
              backendRoomPage={backendRoomPage}
              localMessages={localMessages}
              backendMessages={backendMessages}
              pendingQuote={pendingQuote}
              composerValue={composerValue}
              backendBusy={backendBusy}
              onComposerChange={setComposerValue}
              onPreviewMessage={sendOrPreviewMessage}
              onPaidIntent={explainPaidIntent}
              onClearPreview={clearPreview}
              onClearBackendRoom={clearBackendRoom}
              onRefreshBackend={refreshBackendMessages}
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
              backendRoomPage={backendRoomPage}
              onRoomHydrated={handleRoomHydrated}
            />
          ) : null}

          {activeView === 'moderation' ? <ChatModerationPanel draft={draft} messages={[...backendMessages, ...localMessages]} /> : null}

          {activeView === 'developer' ? (
            <DeveloperPanel
              descriptor={descriptor}
              stats={stats}
              route={currentRoute}
              walletLabel={walletLabel}
              balanceLabel={balanceLabel}
              backendRoomPage={backendRoomPage}
              backendMessages={backendMessages}
              pendingQuote={pendingQuote}
            />
          ) : null}
        </main>

        <aside className="cl-chat-side">
          <section className="cl-chat-panel">
            <p className="cl-eyebrow">Room summary</p>
            <h2>{displayRoom?.title || descriptor.title}</h2>
            <div className="cl-chat-summary-grid">
              <Summary label="Backend" value={backendRoomPage ? 'In memory' : 'Local draft'} />
              <Summary label="Room ID" value={backendRoomId || 'not created'} />
              <Summary label="Send" value={labelFromSnake(displayRoom?.access?.sendMode || descriptor.access.sendMode)} />
              <Summary label="Price" value={`${displayRoom?.access?.messagePriceRoc ?? descriptor.access.messagePriceRoc} ROC`} />
              <Summary label="Messages" value={String(backendMessages.length)} />
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
              <li>{backendRoomPage ? 'Backend room is in-memory only' : 'No backend room created yet'}</li>
              <li>No durable b3 chat descriptor</li>
              <li>No index pointer</li>
              <li>No svc-mailbox fanout</li>
              <li>No paid ROC send yet</li>
              <li>No receipt generated</li>
              <li>No moderator authority granted</li>
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
      <strong title={String(value || '')}>{value}</strong>
    </div>
  );
}

function DeveloperPanel({ descriptor, stats, route, walletLabel, balanceLabel, backendRoomPage, backendMessages, pendingQuote }) {
  const payload = {
    route,
    schema: 'crablink.chat-developer-preview.v2',
    walletLabel,
    balanceDisplay: balanceLabel === null || balanceLabel === undefined ? 'not loaded' : balanceLabel,
    descriptor,
    stats,
    backendRoomPage,
    backendMessages,
    pendingQuote,
    backend: {
      chat_routes_connected: Boolean(backendRoomPage),
      room_create_connected: Boolean(backendRoomPage?.room),
      message_send_connected: backendMessages.length > 0,
      paid_quote_connected: Boolean(pendingQuote),
      paid_send_connected: false,
      moderation_connected: false,
      fanout_connected: false,
      durable: false,
    },
  };

  return (
    <section className="cl-chat-developer" aria-label="Chat developer preview">
      <div>
        <p className="cl-eyebrow">Developer</p>
        <h2>Backend room JSON</h2>
        <p>
          This view shows local descriptor state plus in-memory backend chat state. It is not durable
          storage, not a b3 object, and not a wallet receipt.
        </p>
      </div>

      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </section>
  );
}

function normalizeBackendRoomPage(result) {
  const data = unwrapGatewayData(result);

  if (!data || typeof data !== 'object') {
    return null;
  }

  if (data.room) {
    return {
      ...data,
      latest: Array.isArray(data.latest) ? data.latest : [],
    };
  }

  if (data.roomId || data.roomUrl) {
    return {
      schema: 'omnigate.chat-room-page.v1',
      room: {
        roomId: data.roomId || roomIdFromUrl(data.roomUrl),
        roomUrl: data.roomUrl || '',
      },
      latest: [],
      source: data,
    };
  }

  return null;
}

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
}

function roomIdFromRoom(room) {
  return room?.roomId || roomIdFromUrl(room?.roomUrl || '');
}

function roomIdFromUrl(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  return normalizeRoomId(clean);
}

function settingsFromApp(app) {
  const settings = app?.settings || {};

  return {
    ...settings,
    gatewayUrl: settings.gatewayUrl || settings.gateway_url || app?.gatewayUrl || '',
    baseUrl: settings.baseUrl || settings.base_url || 'http://127.0.0.1:8090',
    authToken: settings.authToken || settings.auth_token || settings.bearerToken || 'dev',
    passportSubject:
      settings.passportSubject ||
      settings.passport_subject ||
      app?.passportSubject ||
      'passport:main:dev',
    walletAccount:
      settings.walletAccount ||
      settings.wallet_account ||
      app?.walletAccount ||
      'acct_dev',
  };
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 280);
}
