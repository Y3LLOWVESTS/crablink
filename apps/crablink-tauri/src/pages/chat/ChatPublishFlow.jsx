/**
 * RO:WHAT — Backend contract/publish panel for the React crab://chat workspace.
 * RO:WHY — Uses the green gateway/omnigate chat route surface for prepare, create, and resolve without durable/fake truth.
 * RO:INTERACTS — chatClient, gatewayClient, ChatPage, ChatBuilder, svc-gateway /chat routes.
 * RO:INVARIANTS — create is in-memory dev proof only; no b3 CID; no index pointer; no paid send; no fake receipt.
 * RO:METRICS — displays route/status/reason/correlation IDs from gateway calls.
 * RO:CONFIG — uses app settings to build a GatewayClient.
 * RO:SECURITY — all mutating calls require explicit button clicks; paid send remains disabled.
 * RO:TEST — npm run build; crab://chat → Publish → Prepare → Create → Resolve.
 */

import { useMemo, useState } from 'react';
import { createGatewayClient } from '../../shared/api/gatewayClient.js';
import {
  buildChatContractPreview,
  createChatClient,
  normalizeChatRouteProbeResult,
  stableIdempotencyKey,
} from '../../shared/api/chatClient.js';

export default function ChatPublishFlow({
  draft,
  descriptor,
  stats,
  app,
  route,
  backendRoomPage,
  onRoomHydrated,
}) {
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [contractMode, setContractMode] = useState('prepare');
  const [notice, setNotice] = useState('');

  const gateway = useMemo(() => createGatewayClient(settingsFromApp(app)), [app]);
  const chatClient = useMemo(() => createChatClient(gateway), [gateway]);
  const roomUrl = backendRoomPage?.room?.roomUrl || route?.normalizedInput || route?.rawInput || 'crab://chat';

  const contract = useMemo(
    () =>
      buildChatContractPreview({
        descriptor,
        draft,
        roomUrl,
        messageBody: 'Hello 🦀 this is a paid-message contract preview.',
      }),
    [descriptor, draft, roomUrl],
  );

  const selectedPayload = useMemo(() => {
    if (contractMode === 'create') {
      return contract.sample_create_body;
    }

    if (contractMode === 'quote') {
      return contract.sample_quote_body;
    }

    if (contractMode === 'routes') {
      return contract.routes;
    }

    if (contractMode === 'last') {
      return lastResult || {
        status: 'no backend call yet',
      };
    }

    return contract.sample_prepare_body;
  }, [contract, contractMode, lastResult]);

  async function prepareRoom() {
    setBusy(true);
    setNotice('');

    try {
      const result = await chatClient.prepareRoom(
        {
          descriptor,
          ownerPassport: draft.ownerPassport,
          walletAccount: draft.ownerAccount,
        },
        {
          confirmed: true,
          idempotencyKey: stableIdempotencyKey('chat-prepare', descriptor.title, descriptor.ownerPassport),
        },
      );
      const data = unwrapGatewayData(result);

      setLastResult(data);
      setContractMode('last');
      setNotice('Prepare succeeded. This did not create a room, b3 CID, wallet event, or receipt.');
    } catch (error) {
      setLastResult(errorToObject(error));
      setContractMode('last');
      setNotice(`Prepare failed: ${safeErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function createRoom() {
    setBusy(true);
    setNotice('');

    try {
      const result = await chatClient.createRoom(
        {
          descriptor,
          ownerPassport: draft.ownerPassport,
          walletAccount: draft.ownerAccount,
        },
        {
          confirmed: true,
          idempotencyKey: stableIdempotencyKey('chat-create', descriptor.title, descriptor.ownerPassport),
        },
      );
      const data = unwrapGatewayData(result);

      setLastResult(data);
      setContractMode('last');
      setNotice('Backend room created as an in-memory dev proof. It is not durable b3 chat yet.');

      if (typeof onRoomHydrated === 'function') {
        onRoomHydrated(data, 'created');
      }
    } catch (error) {
      setLastResult(errorToObject(error));
      setContractMode('last');
      setNotice(`Create failed: ${safeErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function resolveRoom() {
    setBusy(true);
    setNotice('');

    try {
      const result = await chatClient.resolveRoom({ roomUrl });
      const data = unwrapGatewayData(result);
      const normalized = normalizeChatRouteProbeResult(result);

      setLastResult(data || normalized);
      setContractMode('last');
      setNotice('Gateway answered the chat resolve route.');

      if (typeof onRoomHydrated === 'function' && data?.room) {
        onRoomHydrated(data, 'resolved');
      }
    } catch (error) {
      const normalized = normalizeChatRouteProbeResult(error);

      setLastResult(normalized);
      setContractMode('last');
      setNotice(normalized.message || `Resolve failed: ${safeErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyDescriptor() {
    const text = JSON.stringify(descriptor, null, 2);

    try {
      await navigator.clipboard?.writeText(text);
      setNotice('Copied local descriptor JSON. This is not a backend room or b3 asset.');
    } catch (_error) {
      setNotice('Clipboard unavailable in this WebView. Use the Developer tab to copy JSON manually.');
    }
  }

  return (
    <section className="cl-chat-publish" aria-label="Chat publish contract">
      <div className="cl-chat-publish-head">
        <div>
          <p className="cl-eyebrow">Publish contract</p>
          <h2>Backend route proof</h2>
          <p>
            Prepare and create now call the gateway/omnigate chat routes. Created rooms are
            in-memory dev proof only: no b3 descriptor, no index pointer, no receipt, and no paid send.
          </p>
        </div>

        <div className={backendRoomPage ? 'cl-chat-contract-card is-live' : 'cl-chat-contract-card'}>
          <span>Loaded room</span>
          <strong>{backendRoomPage?.room?.roomId ? 'yes' : 'no'}</strong>
          <small>{backendRoomPage?.room?.roomUrl || 'not created'}</small>
        </div>
      </div>

      {notice ? (
        <div className="cl-chat-contract-notice" role="status">
          <strong>Status</strong>
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="cl-chat-publish-grid">
        <article className="cl-chat-contract-step">
          <span>Step 1</span>
          <h3>Prepare room</h3>
          <p>
            Calls <code>POST /chat/prepare</code>. This is side-effect-safe in the current backend:
            no room, b3, wallet event, or receipt is created.
          </p>
          <button type="button" onClick={prepareRoom} disabled={busy}>
            {busy ? 'Working…' : 'Prepare chat room'}
          </button>
        </article>

        <article className="cl-chat-contract-step">
          <span>Step 2</span>
          <h3>Create in-memory room</h3>
          <p>
            Calls <code>POST /chat</code>. The backend returns a room URL and stores room state only
            in omnigate memory for this dev process.
          </p>
          <button type="button" onClick={createRoom} disabled={busy}>
            {busy ? 'Working…' : 'Create backend room'}
          </button>
        </article>

        <article className="cl-chat-contract-step">
          <span>Step 3</span>
          <h3>Resolve loaded room</h3>
          <p>
            Calls <code>GET /chat/resolve</code>. Use this after creating a room to hydrate the Room
            tab with backend-confirmed policy and latest messages.
          </p>
          <button type="button" onClick={resolveRoom} disabled={busy}>
            {busy ? 'Working…' : 'Resolve room'}
          </button>
        </article>
      </div>

      <div className="cl-chat-contract-summary">
        <ContractFact label="Send mode" value={labelValue(descriptor?.access?.sendMode)} />
        <ContractFact label="Price" value={`${descriptor?.access?.messagePriceRoc ?? 0} ROC`} />
        <ContractFact label="Mods" value={String(descriptor?.moderation?.mods?.length || 0)} />
        <ContractFact label="Blocked" value={String(descriptor?.moderation?.blockedUsernames?.length || 0)} />
        <ContractFact label="Expiry" value={labelValue(descriptor?.expiry?.mode)} />
        <ContractFact label="Payout" value={stats?.payout_valid ? 'valid split' : 'check split'} />
      </div>

      <div className="cl-chat-contract-tabs" aria-label="Contract preview selector">
        <button
          type="button"
          className={contractMode === 'prepare' ? 'is-active' : ''}
          onClick={() => setContractMode('prepare')}
        >
          Prepare
        </button>
        <button
          type="button"
          className={contractMode === 'create' ? 'is-active' : ''}
          onClick={() => setContractMode('create')}
        >
          Create
        </button>
        <button
          type="button"
          className={contractMode === 'quote' ? 'is-active' : ''}
          onClick={() => setContractMode('quote')}
        >
          Quote
        </button>
        <button
          type="button"
          className={contractMode === 'routes' ? 'is-active' : ''}
          onClick={() => setContractMode('routes')}
        >
          Routes
        </button>
        <button
          type="button"
          className={contractMode === 'last' ? 'is-active' : ''}
          onClick={() => setContractMode('last')}
        >
          Last result
        </button>
      </div>

      <pre className="cl-chat-contract-json">{JSON.stringify(selectedPayload, null, 2)}</pre>

      <div className="cl-chat-contract-actions">
        <button type="button" onClick={copyDescriptor}>
          Copy descriptor JSON
        </button>
      </div>

      <div className="cl-chat-contract-boundary">
        <strong>Batch boundary</strong>
        <span>
          Backend create/resolve is live but in-memory only. Free messages can be accepted in free
          rooms. Paid message send remains locked until svc-wallet receipt verification is wired.
        </span>
      </div>

      <div className="cl-chat-future-idem">
        <span>Future idempotency seed</span>
        <strong>{stableIdempotencyKey('chat-room', descriptor?.title, descriptor?.ownerPassport)}</strong>
      </div>
    </section>
  );
}

function ContractFact({ label, value }) {
  return (
    <div className="cl-chat-contract-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function labelValue(value) {
  return String(value || 'n/a')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
}

function errorToObject(error) {
  return {
    name: error?.name || 'Error',
    message: safeErrorMessage(error),
    reason: error?.reason || '',
    status: error?.status || 0,
    route: error?.route || '',
    correlationId: error?.correlationId || '',
    data: error?.data || null,
  };
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 300);
}
