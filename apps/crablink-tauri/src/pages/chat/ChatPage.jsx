/**
 * RO:WHAT — Route owner for the React crab://chat workspace and canonical crab://<b3hash>.chat rooms.
 * RO:WHY — Connects the polished chat shell to backend b3 chat descriptors, in-memory live messages, and paid message confirmation.
 * RO:INTERACTS — routeRegistry, router, ChatRoomView, ChatBuilder, ChatPublishFlow, ChatModerationPanel, GatewayClient, chatClient, recentReceipts.
 * RO:INVARIANTS — no fake backend messages; no fake receipt; no fake ROC spend; no moderator authority; no HTML chat rendering.
 * RO:METRICS — displays route/status/reason/correlation IDs from backend chat client calls.
 * RO:CONFIG — gateway settings from app shell; local draft defaults.
 * RO:SECURITY — text-only message preview; explicit paid confirmation; no wallet/capability secrets.
 * RO:TEST — npm run build; manual crab://<64hex>.chat auto-resolve and paid message confirmation.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './chat.css';
import ChatBuilder from './ChatBuilder.jsx';
import ChatModerationPanel from './ChatModerationPanel.jsx';
import ChatPublishFlow from './ChatPublishFlow.jsx';
import ChatRoomView from './ChatRoomView.jsx';
import { createGatewayClient } from '../../shared/api/gatewayClient.js';
import { createChatClient, normalizeRoomId, stableIdempotencyKey } from '../../shared/api/chatClient.js';
import { writeRecentReceipt } from '../../shared/receipts/recentReceipts.js';
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
  const [resolveBusy, setResolveBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const autoResolvedRouteRef = useRef('');

  const descriptor = useMemo(() => buildChatRoomDescriptor(draft), [draft]);
  const stats = useMemo(() => statsForChatDraft(draft), [draft]);
  const effectiveSettings = useMemo(() => settingsFromApp(app), [app]);
  const gateway = useMemo(() => createGatewayClient(effectiveSettings), [effectiveSettings]);
  const chatClient = useMemo(() => createChatClient(gateway), [gateway]);

  const currentRoute =
    route?.params?.roomUrl ||
    route?.normalizedInput ||
    route?.rawInput ||
    'crab://chat';

  const balanceLabel = app?.balance?.balanceMinor ?? app?.balance?.balance ?? null;
  const walletLabel = effectiveSettings.walletAccount || draft.ownerAccount || 'acct_dev';
  const passportLabel = effectiveSettings.passportSubject || draft.ownerPassport || 'passport:main:dev';
  const senderDisplayLabel = displayNameFromApp(app, draft);
  const displayRoom = backendRoomPage?.room || descriptor;
  const backendRoomId = displayRoom?.roomId || roomIdFromRoom(displayRoom);
  const paidReceiptCount = backendMessages.filter((message) => hasBackendReceipt(message)).length;

  useEffect(() => {
    const roomUrl = normalizeCanonicalChatUrl(currentRoute);

    if (!roomUrl) {
      return undefined;
    }

    if (autoResolvedRouteRef.current === roomUrl) {
      return undefined;
    }

    autoResolvedRouteRef.current = roomUrl;

    let cancelled = false;

    async function resolveCanonicalChatRoom() {
      setResolveBusy(true);
      setNotice(`Resolving canonical chat room: ${roomUrl}`);

      try {
        const result = await chatClient.resolveRoom({ roomUrl });

        if (cancelled) {
          return;
        }

        const page = normalizeBackendRoomPage(result);

        if (!page?.room) {
          setNotice('Gateway answered the chat resolve route, but no room object was returned. You can still type local preview messages.');
          return;
        }

        setBackendRoomPage(page);
        setBackendMessages(Array.isArray(page.latest) ? page.latest : []);
        setPendingQuote(null);
        setActiveView('room');
        setNotice(
          `Canonical chat room loaded: ${page.room.roomUrl || roomUrl}. Live messages are backend state, not descriptor hash truth.`,
        );
      } catch (error) {
        if (!cancelled) {
          setNotice(`Canonical chat resolve failed: ${safeErrorMessage(error)}. You can still type local preview messages.`);
        }
      } finally {
        if (!cancelled) {
          setResolveBusy(false);
        }
      }
    }

    resolveCanonicalChatRoom();

    return () => {
      cancelled = true;
    };
  }, [chatClient, currentRoute]);

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
    setResolveBusy(false);

    if (page.room?.roomUrl) {
      autoResolvedRouteRef.current = page.room.roomUrl;
    }

    setNotice(
      source === 'created'
        ? `Backend room created: ${page.room.roomUrl || page.room.roomId}. Descriptor is b3-addressed when backend returned a canonical crab:// hash URL.`
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
      const quoteNonce = stableIdempotencyKey('chat-quote', room.roomId, body, walletLabel);
      const sendIdempotencyKey = stableIdempotencyKey(
        'chat-paid-send',
        room.roomId,
        body,
        walletLabel,
        quoteNonce,
      );

      const result = await chatClient.quoteMessage({
        roomId: room.roomId,
        body,
        senderPassport: passportLabel,
        walletAccount: walletLabel,
        clientNonce: quoteNonce,
      });
      const data = unwrapGatewayData(result);
      const amount = quoteAmountRoc(data, room);

      setPendingQuote({
        body,
        quote: data,
        roomId: room.roomId,
        roomUrl: room.roomUrl || '',
        walletAccount: walletLabel,
        senderPassport: passportLabel,
        senderDisplay: senderDisplayLabel,
        amountRoc: amount,
        idempotencyKey: sendIdempotencyKey,
        createdAt: new Date().toISOString(),
      });
      setNotice(
        `Paid-message quote ready: ${amount} ROC. Review it, then click Confirm paid send. The message will only appear after backend wallet success.`,
      );
    } catch (error) {
      setNotice(`Paid quote failed: ${safeErrorMessage(error)}`);
    } finally {
      setBackendBusy(false);
    }
  }

  async function confirmPaidMessage() {
    const room = backendRoomPage?.room;

    if (!room?.roomId) {
      setNotice('Create or load a backend room before confirming paid send.');
      return;
    }

    if (!pendingQuote?.quote || !pendingQuote?.body) {
      setNotice('Quote a paid chat message before confirming spend.');
      return;
    }

    const idempotencyKey =
      pendingQuote.idempotencyKey ||
      stableIdempotencyKey('chat-paid-send', room.roomId, pendingQuote.body, walletLabel);

    setBackendBusy(true);

    try {
      const result = await chatClient.sendMessage(
        {
          roomId: room.roomId,
          senderPassport: pendingQuote.senderPassport || passportLabel,
          senderDisplay: pendingQuote.senderDisplay || senderDisplayLabel,
          walletAccount: pendingQuote.walletAccount || walletLabel,
          body: pendingQuote.body,
          quote: pendingQuote.quote,
          paidProof: {
            schema: 'crablink.chat-paid-confirmation.v1',
            quote: pendingQuote.quote,
            explicitConfirmation: true,
            confirmedAt: new Date().toISOString(),
            source: 'crablink-tauri-chat-ui',
          },
          idempotencyKey,
        },
        {
          confirmed: true,
          idempotencyKey,
        },
      );

      const data = unwrapGatewayData(result);
      const message = data?.message || null;
      const receipt = buildChatReceiptForCache({
        data,
        message,
        quote: pendingQuote.quote,
        pendingQuote,
        room,
        idempotencyKey,
      });

      if (message) {
        setBackendMessages((current) => mergeBackendMessage(current, message).slice(-100));
      }

      if (receipt) {
        writeRecentReceipt(receipt, {
          source: 'chat_paid_message',
          writeIndividualKey: true,
        });
      }

      notifyBalanceRefresh(app, data, receipt);
      setComposerValue('');
      setPendingQuote(null);
      setNotice(
        receipt
          ? 'Paid backend message accepted. Receipt display cache updated; refresh ROC balance to see ledger-backed changes.'
          : 'Paid backend message accepted. Backend returned the message; refresh ROC balance to verify ledger-backed changes.',
      );
    } catch (error) {
      setNotice(`Paid backend send failed: ${safeErrorMessage(error)}. No paid message was added by the UI.`);
    } finally {
      setBackendBusy(false);
    }
  }

  function cancelPaidQuote() {
    setPendingQuote(null);
    setNotice('Paid message quote cancelled. No ROC was spent and no message was sent.');
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
          senderPassport: passportLabel,
          senderDisplay: senderDisplayLabel,
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
        setBackendMessages((current) => mergeBackendMessage(current, message).slice(-100));
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
    setResolveBusy(false);
    setNotice('Backend room view cleared. The backend descriptor may still exist, but live messages are process-local until durable fanout is wired.');
  }

  function explainPaidIntent() {
    const price = displayRoom?.access?.messagePriceRoc ?? descriptor?.access?.messagePriceRoc ?? 0;

    setNotice(
      displayRoom?.access?.sendMode === 'paid_per_message'
        ? `Paid chat uses quote → explicit confirm → backend wallet path. Current quote price: ${price} ROC.`
        : 'This room is not in paid-per-message mode.',
    );
  }

  return (
    <section className="cl-chat-page" aria-label="CrabLink Chat">
      <header className="cl-chat-hero">
        <div>
          <p className="cl-eyebrow">{isCanonicalChatRoute(currentRoute) ? currentRoute : 'crab://chat'}</p>
          <h1>Chat rooms for everything</h1>
          <p>
            Portable chat for streams, podcasts, sites, profiles, and standalone rooms. Canonical
            chat descriptors use <code>crab://&lt;b3hash&gt;.chat</code>; live messages remain backend state.
          </p>
        </div>

        <aside className={backendRoomPage ? 'cl-chat-hero-card is-live' : 'cl-chat-hero-card'}>
          <span>{backendRoomPage ? 'Backend room' : resolveBusy ? 'Resolving' : 'Truth boundary'}</span>
          <strong>{backendRoomPage ? 'Loaded' : resolveBusy ? 'Loading descriptor' : 'No fake live chat'}</strong>
          <small>
            {backendRoomPage
              ? `${backendRoomPage.room?.roomUrl || backendRoomPage.room?.roomId} · paid confirm explicit`
              : resolveBusy
                ? 'Typing remains available while resolve runs'
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
              resolving={resolveBusy}
              onComposerChange={setComposerValue}
              onPreviewMessage={sendOrPreviewMessage}
              onPaidIntent={explainPaidIntent}
              onConfirmPaidMessage={confirmPaidMessage}
              onCancelPaidQuote={cancelPaidQuote}
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

          {activeView === 'moderation' ? (
            <ChatModerationPanel draft={draft} messages={[...backendMessages, ...localMessages]} />
          ) : null}

          {activeView === 'developer' ? (
            <DeveloperPanel
              descriptor={descriptor}
              stats={stats}
              route={currentRoute}
              walletLabel={walletLabel}
              passportLabel={passportLabel}
              balanceLabel={balanceLabel}
              backendRoomPage={backendRoomPage}
              backendMessages={backendMessages}
              pendingQuote={pendingQuote}
              paidReceiptCount={paidReceiptCount}
              resolving={resolveBusy}
            />
          ) : null}
        </main>

        <aside className="cl-chat-side">
          <section className="cl-chat-panel">
            <p className="cl-eyebrow">Room summary</p>
            <h2>{displayRoom?.title || descriptor.title}</h2>
            <div className="cl-chat-summary-grid">
              <Summary label="Backend" value={backendRoomPage ? 'Loaded' : resolveBusy ? 'Resolving' : 'Local draft'} />
              <Summary label="Room ID" value={backendRoomId || 'not created'} />
              <Summary label="Send" value={labelFromSnake(displayRoom?.access?.sendMode || descriptor.access.sendMode)} />
              <Summary label="Price" value={`${displayRoom?.access?.messagePriceRoc ?? descriptor.access.messagePriceRoc} ROC`} />
              <Summary label="Messages" value={String(backendMessages.length)} />
              <Summary label="Receipts" value={paidReceiptCount ? String(paidReceiptCount) : 'None'} />
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
              <li>{backendRoomPage ? 'Chat descriptor can be b3-addressed' : resolveBusy ? 'Resolving backend room descriptor' : 'No backend room loaded yet'}</li>
              <li>Live messages are not descriptor hash truth</li>
              <li>No durable message log yet</li>
              <li>No svc-mailbox fanout yet</li>
              <li>Paid message send requires explicit confirmation</li>
              <li>Receipt display cache is display-only</li>
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

function DeveloperPanel({
  descriptor,
  stats,
  route,
  walletLabel,
  passportLabel,
  balanceLabel,
  backendRoomPage,
  backendMessages,
  pendingQuote,
  paidReceiptCount,
  resolving,
}) {
  const payload = {
    route,
    schema: 'crablink.chat-developer-preview.v5',
    walletLabel,
    passportLabel,
    balanceDisplay: balanceLabel === null || balanceLabel === undefined ? 'not loaded' : balanceLabel,
    descriptor,
    stats,
    backendRoomPage,
    backendMessages,
    pendingQuote,
    paidReceiptCount,
    resolving,
    backend: {
      chat_routes_connected: Boolean(backendRoomPage),
      room_resolve_connected: Boolean(backendRoomPage?.room),
      message_send_connected: backendMessages.length > 0,
      paid_quote_connected: Boolean(pendingQuote),
      paid_send_connected: paidReceiptCount > 0,
      moderation_connected: false,
      fanout_connected: false,
      live_messages_durable: false,
      descriptor_route: route,
    },
  };

  return (
    <section className="cl-chat-developer" aria-label="Chat developer preview">
      <div>
        <p className="cl-eyebrow">Developer</p>
        <h2>Backend room JSON</h2>
        <p>
          This view shows local descriptor state plus backend chat state. Descriptor identity can be
          b3-addressed; live messages are still backend event state.
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

  if (data.roomId || data.roomUrl || data.canonicalRoomUrl) {
    return {
      schema: 'omnigate.chat-room-page.v1',
      room: {
        roomId: data.roomId || roomIdFromUrl(data.roomUrl || data.canonicalRoomUrl),
        roomUrl: data.roomUrl || data.canonicalRoomUrl || '',
        canonicalRoomUrl: data.canonicalRoomUrl || data.roomUrl || '',
        descriptorCid: data.b3Cid || data?.descriptor?.cid || '',
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
  return room?.roomId || roomIdFromUrl(room?.roomUrl || room?.canonicalRoomUrl || '');
}

function roomIdFromUrl(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  return normalizeRoomId(clean);
}

function normalizeCanonicalChatUrl(value) {
  const clean = String(value || '').trim();
  const match = clean.match(/^crab:\/\/([0-9a-f]{64})\.chat$/i);

  if (!match) {
    return '';
  }

  return `crab://${match[1].toLowerCase()}.chat`;
}

function isCanonicalChatRoute(value) {
  return Boolean(normalizeCanonicalChatUrl(value));
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

function displayNameFromApp(app, draft) {
  const raw =
    app?.identity?.username ||
    app?.identity?.displayName ||
    app?.profile?.username ||
    app?.passport?.username ||
    draft.localPreviewName ||
    draft.ownerDisplay ||
    '@you';

  const clean = String(raw || '').trim();

  if (!clean) {
    return '@you';
  }

  if (clean.startsWith('@')) {
    return clean;
  }

  return `@${clean}`;
}

function quoteAmountRoc(quote, room) {
  const raw =
    quote?.amountRoc ??
    quote?.amount_roc ??
    quote?.amountMinor ??
    quote?.amount_minor ??
    room?.access?.messagePriceRoc ??
    0;

  const parsed = Number.parseInt(String(raw || '0'), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function mergeBackendMessage(messages, message) {
  const key = message?.messageId || message?.message_id || message?.id || message?.clientIdempotencyKey;

  if (!key) {
    return [...messages, message];
  }

  const next = messages.filter((item) => {
    const itemKey = item?.messageId || item?.message_id || item?.id || item?.clientIdempotencyKey;
    return itemKey !== key;
  });

  return [...next, message];
}

function hasBackendReceipt(message) {
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

function buildChatReceiptForCache({ data, message, quote, pendingQuote, room, idempotencyKey }) {
  const receipt = data?.receipt || {};
  const paid = message?.paid || {};
  const walletReceipt = paid.walletReceipt || paid.wallet_receipt || {};
  const txid =
    receipt.walletTxid ||
    receipt.wallet_txid ||
    receipt.txid ||
    receipt.tx_id ||
    paid.walletTxid ||
    paid.wallet_txid ||
    walletReceipt.txid ||
    walletReceipt.tx_id ||
    '';
  const receiptHash =
    receipt.walletReceiptHash ||
    receipt.wallet_receipt_hash ||
    receipt.receiptHash ||
    receipt.receipt_hash ||
    paid.receiptHash ||
    paid.receipt_hash ||
    walletReceipt.receiptHash ||
    walletReceipt.receipt_hash ||
    '';
  const ledgerRoot =
    receipt.ledgerRoot ||
    receipt.ledger_root ||
    paid.ledgerRoot ||
    paid.ledger_root ||
    walletReceipt.ledgerRoot ||
    walletReceipt.ledger_root ||
    '';
  const amountMinor =
    receipt.amountMinor ||
    receipt.amount_minor ||
    quote?.amountMinor ||
    quote?.amount_minor ||
    String(quoteAmountRoc(quote, room));
  const payer =
    receipt.payerAccount ||
    receipt.payer_account ||
    pendingQuote?.walletAccount ||
    quote?.walletAccount ||
    quote?.wallet_account ||
    '';
  const recipient =
    receipt.recipientAccount ||
    receipt.recipient_account ||
    quote?.recipientAccount ||
    quote?.recipient_account ||
    quote?.recipient ||
    room?.ownerAccount ||
    room?.owner_account ||
    '';

  if (!txid && !receiptHash && !ledgerRoot) {
    return null;
  }

  return {
    schema: 'crablink.chat-message-receipt-display.v1',
    action: 'chat_message',
    kind: 'chat_message',
    title: `Paid chat message · ${quoteAmountRoc(quote, room)} ROC`,
    crabUrl: room?.roomUrl || pendingQuote?.roomUrl || '',
    route: room?.roomUrl || pendingQuote?.roomUrl || '',
    amountMinor,
    amount: amountMinor,
    asset: 'roc',
    payer,
    recipient,
    from: payer,
    to: recipient,
    txid,
    receiptHash,
    ledgerRoot,
    nonce: receipt.nonce || '',
    idempotencyKey,
    messageId: message?.messageId || message?.message_id || '',
    roomId: room?.roomId || pendingQuote?.roomId || '',
    createdAt: new Date().toISOString(),
    raw: {
      data,
      message,
      quote,
      pendingQuote: {
        ...pendingQuote,
        quote: '[stored-above]',
      },
    },
    truthBoundary:
      'Display-only copy of backend-returned chat receipt fields. svc-wallet and ron-ledger remain authoritative.',
  };
}

function notifyBalanceRefresh(app, data, receipt = null) {
  try {
    app?.events?.emit?.('wallet:refresh', {
      reason: 'chat_message_paid',
      result: data || null,
      receipt,
    });
    app?.refreshIdentity?.();
    app?.refreshWallet?.();
  } catch (_error) {
    // Balance refresh is best-effort; backend receipt display remains visible.
  }

  try {
    window.dispatchEvent(
      new CustomEvent('crablink:wallet-refresh-requested', {
        detail: {
          reason: 'chat_message_paid',
          result: data || null,
          receipt,
        },
      }),
    );
  } catch (_error) {
    // Optional cross-component notification only.
  }
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 280);
}