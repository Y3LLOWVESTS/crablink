/**
 * RO:WHAT — Contract/publish panel for the React crab://chat workspace.
 * RO:WHY — Adds the next chat implementation layer: descriptor contract preview and backend route probes without fake backend truth.
 * RO:INTERACTS — chatClient, gatewayClient, ChatPage, ChatBuilder, future svc-gateway /chat routes.
 * RO:INVARIANTS — no room creation; no b3 CID; no message send; no ROC quote/spend; no fake receipt; no moderator authority.
 * RO:METRICS — displays route/status/reason/correlation IDs from gateway probes.
 * RO:CONFIG — uses app settings to build a GatewayClient.
 * RO:SECURITY — all mutating contract calls remain disabled until backend routes exist and explicit confirmation is added.
 * RO:TEST — npm run build; crab://chat → Publish → Probe /chat/resolve.
 */

import { useMemo, useState } from 'react';
import { createGatewayClient } from '../../shared/api/gatewayClient.js';
import {
  buildChatContractPreview,
  createChatClient,
  normalizeChatRouteProbeResult,
  stableIdempotencyKey,
} from '../../shared/api/chatClient.js';

export default function ChatPublishFlow({ draft, descriptor, stats, app, route }) {
  const [probe, setProbe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [contractMode, setContractMode] = useState('prepare');
  const [notice, setNotice] = useState('');

  const gateway = useMemo(() => createGatewayClient(settingsFromApp(app)), [app]);
  const chatClient = useMemo(() => createChatClient(gateway), [gateway]);
  const roomUrl = route?.normalizedInput || route?.rawInput || 'crab://chat';

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

    return contract.sample_prepare_body;
  }, [contract, contractMode]);

  async function probeResolveRoute() {
    setBusy(true);
    setNotice('');

    try {
      const result = await chatClient.resolveRoom({ roomUrl });
      setProbe(normalizeChatRouteProbeResult(result));
      setNotice('Gateway answered the chat resolve probe.');
    } catch (error) {
      const normalized = normalizeChatRouteProbeResult(error);
      setProbe(normalized);
      setNotice(normalized.message);
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
          <h2>Backend path staged, not live</h2>
          <p>
            This panel prepares the future gateway contract for chat room creation, paid messages,
            polling, and moderation. It does not create a room, spend ROC, mint b3, or send messages.
          </p>
        </div>

        <div className="cl-chat-contract-card">
          <span>Route probe</span>
          <strong>{probe ? probe.status || '0' : 'not run'}</strong>
          <small>{probe ? probe.reason : 'safe to run'}</small>
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
          <h3>Descriptor preview</h3>
          <p>
            Builder state is normalized into a chat-room descriptor. The descriptor is local preview
            only until a backend create route stores and returns a real crab:// room.
          </p>
          <button type="button" onClick={copyDescriptor}>
            Copy descriptor JSON
          </button>
        </article>

        <article className="cl-chat-contract-step">
          <span>Step 2</span>
          <h3>Probe gateway route</h3>
          <p>
            Calls <code>GET /chat/resolve</code> through the gateway client. A 404/405/501 is treated
            as expected “not implemented yet,” not a frontend crash.
          </p>
          <button type="button" onClick={probeResolveRoute} disabled={busy}>
            {busy ? 'Probing…' : 'Probe /chat/resolve'}
          </button>
        </article>

        <article className="cl-chat-contract-step is-locked">
          <span>Step 3</span>
          <h3>Mutating routes locked</h3>
          <p>
            Prepare, create, paid send, delete, block, and pin are intentionally disabled until
            Rust backend routes exist and explicit confirmation is wired.
          </p>
          <button type="button" disabled>
            Backend create locked
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

      {probe ? (
        <div className={probe.notImplemented ? 'cl-chat-probe-result is-expected' : probe.ok ? 'cl-chat-probe-result is-ok' : 'cl-chat-probe-result is-error'}>
          <div>
            <strong>{probe.title}</strong>
            <span>{probe.message}</span>
          </div>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{probe.status || '0'}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{probe.route || '/chat/resolve'}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{probe.reason || 'n/a'}</dd>
            </div>
            <div>
              <dt>Correlation</dt>
              <dd>{probe.correlationId || 'not returned'}</dd>
            </div>
          </dl>
        </div>
      ) : null}

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
      </div>

      <pre className="cl-chat-contract-json">{JSON.stringify(selectedPayload, null, 2)}</pre>

      <div className="cl-chat-contract-boundary">
        <strong>Batch 2 boundary</strong>
        <span>
          Client contract only. No backend room, no message fanout, no paid quote, no ROC spend, no
          receipt, no moderation authority, no b3 CID, and no index pointer are created here.
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
