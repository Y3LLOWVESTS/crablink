/**
 * RO:WHAT — Backend contract/publish panel for the React crab://chat workspace.
 * RO:WHY — Creates canonical b3-addressed chat descriptors while keeping live messages honest as backend event state.
 * RO:INTERACTS — chatClient, gatewayClient, ChatPage, ChatBuilder, svc-gateway /chat routes.
 * RO:INVARIANTS — descriptor b3 comes from backend/storage; no fake receipt; no fake paid message; live messages are not descriptor truth.
 * RO:METRICS — displays route/status/reason/correlation IDs from gateway calls.
 * RO:CONFIG — uses app settings to build a GatewayClient.
 * RO:SECURITY — all mutating calls require explicit button clicks; no wallet authority is stored in React.
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
  const canonicalRoomUrl =
    backendRoomPage?.room?.canonicalRoomUrl ||
    backendRoomPage?.room?.roomUrl ||
    lastResult?.canonicalRoomUrl ||
    lastResult?.roomUrl ||
    '';

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
      setNotice('Prepare succeeded. No room, wallet event, receipt, or b3 object was created yet.');
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

      const createdUrl = data?.canonicalRoomUrl || data?.roomUrl || data?.room?.roomUrl || '';
      const b3Cid = data?.b3Cid || data?.descriptor?.cid || data?.room?.descriptorCid || '';

      setNotice(
        createdUrl
          ? `Canonical chat descriptor created: ${createdUrl}${b3Cid ? ` · ${b3Cid}` : ''}. Live messages are still backend event state.`
          : 'Backend room created. Check Last result for descriptor/storage details.',
      );

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
      const result = await chatClient.resolveRoom({ roomUrl: canonicalRoomUrl || roomUrl });
      const data = unwrapGatewayData(result);
      const normalized = normalizeChatRouteProbeResult(result);

      setLastResult(data || normalized);
      setContractMode('last');
      setNotice(
        data?.room?.roomUrl
          ? `Gateway resolved chat room: ${data.room.roomUrl}.`
          : 'Gateway answered the chat resolve route.',
      );

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
      setNotice('Copied local descriptor JSON. This is not the backend b3 descriptor unless it has been created.');
    } catch (_error) {
      setNotice('Clipboard unavailable in this WebView. Use the Developer tab to copy JSON manually.');
    }
  }

  async function copyCanonicalUrl() {
    const text = canonicalRoomUrl;

    if (!text) {
      setNotice('No canonical chat URL yet. Create the backend room first.');
      return;
    }

    try {
      await navigator.clipboard?.writeText(text);
      setNotice(`Copied canonical chat URL: ${text}`);
    } catch (_error) {
      setNotice('Clipboard unavailable in this WebView.');
    }
  }

  return (
    <section className="cl-chat-publish" aria-label="Chat publish contract">
      <div className="cl-chat-publish-head">
        <div>
          <p className="cl-eyebrow">Publish contract</p>
          <h2>b3 chat descriptor</h2>
          <p>
            Prepare is read-only. Create stores the normalized room descriptor in backend storage and
            returns a canonical <code>crab://&lt;b3hash&gt;.chat</code> URL. Live messages remain backend
            event state until mailbox/fanout is wired.
          </p>
        </div>

        <div className={backendRoomPage ? 'cl-chat-contract-card is-live' : 'cl-chat-contract-card'}>
          <span>Canonical room</span>
          <strong>{canonicalRoomUrl ? 'yes' : 'no'}</strong>
          <small>{canonicalRoomUrl || 'not created'}</small>
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
            Calls <code>POST /chat/prepare</code>. This normalizes the descriptor and estimates
            descriptor size without storing, spending ROC, or creating a receipt.
          </p>
          <button type="button" onClick={prepareRoom} disabled={busy}>
            {busy ? 'Working…' : 'Prepare chat room'}
          </button>
        </article>

        <article className="cl-chat-contract-step">
          <span>Step 2</span>
          <h3>Create b3 room</h3>
          <p>
            Calls <code>POST /chat</code>. The backend stores the immutable descriptor and returns
            <code> crab://&lt;b3hash&gt;.chat</code>. Messages are still separate live backend state.
          </p>
          <button type="button" onClick={createRoom} disabled={busy}>
            {busy ? 'Working…' : 'Create b3 chat room'}
          </button>
        </article>

        <article className="cl-chat-contract-step">
          <span>Step 3</span>
          <h3>Resolve loaded room</h3>
          <p>
            Calls <code>GET /chat/resolve</code>. Canonical b3 chat URLs can be rehydrated from the
            stored descriptor; current messages are returned only if still in backend memory.
          </p>
          <button type="button" onClick={resolveRoom} disabled={busy}>
            {busy ? 'Working…' : 'Resolve room'}
          </button>
        </article>
      </div>

      {canonicalRoomUrl ? (
        <div className="cl-chat-contract-notice is-success" role="status">
          <strong>Canonical URL</strong>
          <span>{canonicalRoomUrl}</span>
        </div>
      ) : null}

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
          Copy local descriptor JSON
        </button>
        <button type="button" onClick={copyCanonicalUrl} disabled={!canonicalRoomUrl}>
          Copy crab:// chat URL
        </button>
      </div>

      <div className="cl-chat-contract-boundary">
        <strong>Batch boundary</strong>
        <span>
          Room descriptor is b3-addressed after create. Message fanout, durable message logs, real
          moderation authority, and index/name pointers remain future batches. Paid message receipts
          still come only from the backend wallet path.
        </span>
      </div>
    </section>
  );
}

function ContractFact({ label, value }) {
  return (
    <div className="cl-chat-summary">
      <span>{label}</span>
      <strong title={String(value || '')}>{value}</strong>
    </div>
  );
}

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
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

function errorToObject(error) {
  return {
    name: error?.name || 'ChatClientError',
    message: safeErrorMessage(error),
    reason: error?.reason || 'chat_request_failed',
    status: Number(error?.status || 0),
    route: error?.route || '',
    correlationId: error?.correlationId || '',
    data: error?.data || null,
  };
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 320);
}

function labelValue(value) {
  return String(value || 'n/a')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}