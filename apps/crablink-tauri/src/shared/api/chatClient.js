/**
 * RO:WHAT — Gateway-only client contract for future CrabLink chat rooms.
 * RO:WHY — Prepares crab://chat for real backend room create/resolve/message/moderation routes without inventing truth.
 * RO:INTERACTS — ChatPublishFlow, ChatPage, GatewayClient, future svc-gateway /chat routes, future omnigate chat routes.
 * RO:INVARIANTS — no fake messages; no fake receipts; no silent spend; paid send and moderation require explicit confirmation.
 * RO:METRICS — carries route/status/reason/correlation IDs for future chat diagnostics.
 * RO:CONFIG — uses configured GatewayClient; defaults remain gateway-first.
 * RO:SECURITY — no direct svc-wallet/svc-ledger/storage/index calls; no secrets; no raw capabilities; no unbounded spend authority.
 * RO:TEST — npm run build; manual crab://chat Publish tab route probe.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;
const DEFAULT_ROOM_URL = 'crab://chat';

export function createChatClient(gateway) {
  return new ChatClient(gateway);
}

export class ChatClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Chat request failed.'));
    this.name = 'ChatClientError';
    this.reason = details.reason || 'chat_request_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
    this.notImplemented = Boolean(details.notImplemented);
  }
}

export class ChatClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async resolveRoom({ roomUrl = DEFAULT_ROOM_URL } = {}) {
    this.assertGateway();

    const safeRoomUrl = normalizeRoomUrl(roomUrl);

    try {
      return await this.gateway.request(`/chat/resolve?url=${encodeURIComponent(safeRoomUrl)}`, {
        method: 'GET',
        label: 'Chat room resolve',
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: '/chat/resolve',
        fallbackReason: 'chat_resolve_failed',
      });
    }
  }

  async prepareRoom(payload = {}, options = {}) {
    this.assertGateway();
    assertExplicitConfirmation(options, 'Chat room prepare');

    const request = normalizeChatPrepareRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'chat-prepare',
    );

    try {
      return await this.gateway.request('/chat/prepare', {
        method: 'POST',
        body: {
          ...request,
          client_idempotency_key: idempotencyKey,
          clientIdempotencyKey: idempotencyKey,
          clientIdempotencyKey: idempotencyKey,
        },
        label: 'Chat room prepare',
        mutation: true,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        idempotencyKey,
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: '/chat/prepare',
        fallbackReason: 'chat_prepare_failed',
      });
    }
  }

  async createRoom(payload = {}, options = {}) {
    this.assertGateway();
    assertExplicitConfirmation(options, 'Chat room create');

    const request = normalizeChatCreateRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'chat-create',
    );

    try {
      return await this.gateway.request('/chat', {
        method: 'POST',
        body: {
          ...request,
          client_idempotency_key: idempotencyKey,
          clientIdempotencyKey: idempotencyKey,
          clientIdempotencyKey: idempotencyKey,
        },
        label: 'Chat room create',
        mutation: true,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        idempotencyKey,
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: '/chat',
        fallbackReason: 'chat_create_failed',
      });
    }
  }

  async quoteMessage({ roomId, body, senderPassport, walletAccount, clientNonce = '' } = {}) {
    this.assertGateway();

    const safeRoomId = normalizeRoomId(roomId);
    const request = {
      senderPassport: stringValue(senderPassport),
      walletAccount: stringValue(walletAccount),
      body: normalizeMessageBody(body),
      clientNonce: stringValue(clientNonce) || stableIdempotencyKey('chat-message-nonce', safeRoomId, body),
    };

    try {
      return await this.gateway.request(`/chat/${encodeURIComponent(safeRoomId)}/messages/quote`, {
        method: 'POST',
        body: request,
        label: 'Chat message quote',
        mutation: true,
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: `/chat/${safeRoomId}/messages/quote`,
        fallbackReason: 'chat_message_quote_failed',
      });
    }
  }

  async sendMessage(payload = {}, options = {}) {
    this.assertGateway();
    assertExplicitConfirmation(options, 'Chat message send');

    const safeRoomId = normalizeRoomId(payload.roomId);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        payload.idempotencyKey ||
        stableIdempotencyKey('chat-send', safeRoomId, payload.body, payload.walletTxid),
      'chat-send',
    );

    const request = {
      roomId: safeRoomId,
      senderPassport: stringValue(payload.senderPassport),
      senderDisplay: stringValue(payload.senderDisplay, payload.sender, '@anonymous'),
      walletAccount: stringValue(payload.walletAccount),
      body: normalizeMessageBody(payload.body),
      quote: payload.quote || null,
      paidProof: payload.paidProof || null,
      client_idempotency_key: idempotencyKey,
      clientIdempotencyKey: idempotencyKey,
    };

    try {
      return await this.gateway.request(`/chat/${encodeURIComponent(safeRoomId)}/messages/send`, {
        method: 'POST',
        body: request,
        label: 'Chat message send',
        mutation: true,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        idempotencyKey,
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: `/chat/${safeRoomId}/messages/send`,
        fallbackReason: 'chat_message_send_failed',
      });
    }
  }

  async listMessages({ roomId, after = '', limit = 50 } = {}) {
    this.assertGateway();

    const safeRoomId = normalizeRoomId(roomId);
    const safeLimit = clampInteger(limit, 1, 200, 50);
    const query = new URLSearchParams();

    if (after) {
      query.set('after', String(after));
    }

    query.set('limit', String(safeLimit));

    try {
      return await this.gateway.request(
        `/chat/${encodeURIComponent(safeRoomId)}/messages?${query.toString()}`,
        {
          method: 'GET',
          label: 'Chat messages list',
        },
      );
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: `/chat/${safeRoomId}/messages`,
        fallbackReason: 'chat_messages_list_failed',
      });
    }
  }

  async latestMessages({ roomId, since = '' } = {}) {
    this.assertGateway();

    const safeRoomId = normalizeRoomId(roomId);
    const query = new URLSearchParams();

    if (since) {
      query.set('since', String(since));
    }

    try {
      return await this.gateway.request(
        `/chat/${encodeURIComponent(safeRoomId)}/messages/latest?${query.toString()}`,
        {
          method: 'GET',
          label: 'Chat messages latest',
        },
      );
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: `/chat/${safeRoomId}/messages/latest`,
        fallbackReason: 'chat_messages_latest_failed',
      });
    }
  }

  async deleteMessage(payload = {}, options = {}) {
    return this.moderate('/delete', payload, options, 'Chat message delete');
  }

  async blockUsername(payload = {}, options = {}) {
    return this.moderate('/block', payload, options, 'Chat block username');
  }

  async pinMessage(payload = {}, options = {}) {
    return this.moderate('/pin', payload, options, 'Chat pin message');
  }

  async moderate(pathSuffix, payload = {}, options = {}, label = 'Chat moderation') {
    this.assertGateway();
    assertExplicitConfirmation(options, label);

    const safeRoomId = normalizeRoomId(payload.roomId);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        payload.idempotencyKey ||
        stableIdempotencyKey('chat-mod', safeRoomId, pathSuffix, payload.messageId, payload.username),
      'chat-mod',
    );

    try {
      return await this.gateway.request(`/chat/${encodeURIComponent(safeRoomId)}/mod${pathSuffix}`, {
        method: 'POST',
        body: {
          ...payload,
          roomId: safeRoomId,
          client_idempotency_key: idempotencyKey,
        },
        label,
        mutation: true,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        idempotencyKey,
      });
    } catch (error) {
      throw normalizeChatClientError(error, {
        route: `/chat/${safeRoomId}/mod${pathSuffix}`,
        fallbackReason: 'chat_moderation_failed',
      });
    }
  }

  assertGateway() {
    if (!this.ready) {
      throw new ChatClientError('Chat client requires a configured GatewayClient.', {
        reason: 'gateway_client_missing',
        retryable: true,
      });
    }
  }
}

export function buildChatContractPreview({
  descriptor,
  draft,
  messageBody = 'Hello 🦀',
  roomUrl = DEFAULT_ROOM_URL,
} = {}) {
  const safeDescriptor = descriptor || {};
  const roomId = normalizeRoomId(roomUrl);
  const walletAccount = stringValue(draft?.ownerAccount, safeDescriptor?.ownerAccount, 'acct_dev');
  const senderPassport = stringValue(
    draft?.ownerPassport,
    safeDescriptor?.ownerPassport,
    'passport:main:dev',
  );
  const clientNonce = stableIdempotencyKey('chat-preview-message', roomId, messageBody);

  return {
    schema: 'crablink.chat-contract-preview.v1',
    backend_connected: false,
    local_contract_only: true,
    routes: {
      resolve_room: {
        method: 'GET',
        path: `/chat/resolve?url=${encodeURIComponent(roomUrl)}`,
        mutates_backend: false,
      },
      prepare_room: {
        method: 'POST',
        path: '/chat/prepare',
        mutates_backend: true,
        explicit_user_action_required: true,
      },
      create_room: {
        method: 'POST',
        path: '/chat',
        mutates_backend: true,
        explicit_user_action_required: true,
      },
      quote_message: {
        method: 'POST',
        path: `/chat/${encodeURIComponent(roomId)}/messages/quote`,
        mutates_wallet: false,
        prepares_paid_action: true,
      },
      send_message: {
        method: 'POST',
        path: `/chat/${encodeURIComponent(roomId)}/messages/send`,
        mutates_wallet: true,
        explicit_confirmation_required: true,
      },
      latest_messages: {
        method: 'GET',
        path: `/chat/${encodeURIComponent(roomId)}/messages/latest?since=<cursor>`,
        mutates_backend: false,
      },
      moderation: {
        delete_message: `/chat/${encodeURIComponent(roomId)}/mod/delete`,
        block_username: `/chat/${encodeURIComponent(roomId)}/mod/block`,
        pin_message: `/chat/${encodeURIComponent(roomId)}/mod/pin`,
        explicit_moderator_authorization_required: true,
      },
    },
    sample_prepare_body: normalizeChatPrepareRequest({
      descriptor: safeDescriptor,
      ownerPassport: senderPassport,
      walletAccount,
    }),
    sample_create_body: normalizeChatCreateRequest({
      descriptor: safeDescriptor,
      ownerPassport: senderPassport,
      walletAccount,
    }),
    sample_quote_body: {
      senderPassport,
      walletAccount,
      body: normalizeMessageBody(messageBody),
      clientNonce,
    },
    truth_boundary: {
      this_preview_creates_room: false,
      this_preview_creates_b3: false,
      this_preview_sends_message: false,
      this_preview_quotes_roc: false,
      this_preview_spends_roc: false,
      this_preview_creates_receipt: false,
      this_preview_grants_mod_authority: false,
    },
  };
}

export function normalizeChatRouteProbeResult(resultOrError) {
  if (!resultOrError) {
    return {
      ok: false,
      status: 0,
      route: '',
      reason: 'no_result',
      title: 'No probe result',
      message: 'No backend probe result was returned.',
      notImplemented: false,
      data: null,
      correlationId: '',
    };
  }

  if (resultOrError.ok) {
    return {
      ok: true,
      status: Number(resultOrError.status || 200),
      route: resultOrError.route || '/chat/resolve',
      reason: 'route_available',
      title: 'Route answered',
      message: 'Gateway returned a successful chat route response.',
      notImplemented: false,
      data: resultOrError.data || null,
      correlationId: resultOrError.correlationId || '',
    };
  }

  const error = normalizeChatClientError(resultOrError, {
    route: resultOrError.route || '/chat/resolve',
    fallbackReason: resultOrError.reason || 'chat_probe_failed',
  });

  const notImplemented = isLikelyNotImplemented(error.status, error.reason, error.data);

  return {
    ok: false,
    status: error.status,
    route: error.route,
    reason: error.reason,
    title: notImplemented ? 'Chat backend route not implemented yet' : 'Chat route probe failed',
    message: notImplemented
      ? 'The frontend contract is ready, but the gateway/omnigate chat route is not implemented yet.'
      : error.message,
    notImplemented,
    data: error.data || null,
    correlationId: error.correlationId || '',
  };
}

export function normalizeChatClientError(error, { route = '', fallbackReason = 'chat_failed' } = {}) {
  if (error instanceof ChatClientError) {
    return error;
  }

  const status = Number(error?.status || 0);
  const reason = String(error?.reason || '').trim() || fallbackReason;
  const data = error?.data || null;
  const notImplemented = isLikelyNotImplemented(status, reason, data);

  return new ChatClientError(cleanErrorMessage(error), {
    route: error?.route || route,
    status,
    reason: notImplemented ? 'chat_route_not_implemented_yet' : reason,
    retryable: Boolean(error?.retryable),
    data,
    correlationId: error?.correlationId || '',
    notImplemented,
  });
}

export function normalizeRoomUrl(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return DEFAULT_ROOM_URL;
  }

  return clean.startsWith('crab://') ? clean : `crab://${clean}`;
}

export function normalizeRoomId(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return 'local-chat-preview';
  }

  return clean
    .replace(/^crab:\/\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/[^a-zA-Z0-9_.:@-]/g, '-')
    .slice(0, 140);
}

export function compactIdempotencyKey(value, prefix = 'chat') {
  const raw = String(value || '').trim();
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const safePrefix = String(prefix || 'chat').replace(/[^a-z0-9_.:-]+/gi, '-').slice(0, 24);
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - safePrefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${safePrefix}:${hash}:${suffix}` : `${safePrefix}:${hash}`;
}

export function stableIdempotencyKey(prefix, ...parts) {
  return compactIdempotencyKey(
    `${prefix}:${fnv1aHex(parts.map((part) => JSON.stringify(part ?? '')).join('|'))}`,
    prefix,
  );
}

function normalizeChatPrepareRequest(payload = {}) {
  const descriptor = payload.descriptor || payload.room || payload;

  return {
    schema: 'crablink.chat-room-prepare.v1',
    descriptor,
    owner_passport: stringValue(payload.ownerPassport, descriptor.ownerPassport),
    ownerPassport: stringValue(payload.ownerPassport, descriptor.ownerPassport),
    wallet_account: stringValue(payload.walletAccount, descriptor.ownerAccount),
    walletAccount: stringValue(payload.walletAccount, descriptor.ownerAccount),
    requested_action: 'prepare_chat_room',
    requestedAction: 'prepare_chat_room',
    client_idempotency_key: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-prepare', descriptor.title, descriptor.ownerPassport),
      'chat-prepare',
    ),
    clientIdempotencyKey: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-prepare', descriptor.title, descriptor.ownerPassport),
      'chat-prepare',
    ),
    clientIdempotencyKey: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-prepare', descriptor.title, descriptor.ownerPassport),
      'chat-prepare',
    ),
  };
}

function normalizeChatCreateRequest(payload = {}) {
  const descriptor = payload.descriptor || payload.room || payload;

  return {
    schema: 'crablink.chat-room-create.v1',
    descriptor,
    owner_passport: stringValue(payload.ownerPassport, descriptor.ownerPassport),
    ownerPassport: stringValue(payload.ownerPassport, descriptor.ownerPassport),
    wallet_account: stringValue(payload.walletAccount, descriptor.ownerAccount),
    walletAccount: stringValue(payload.walletAccount, descriptor.ownerAccount),
    paid_proof: payload.paidProof || null,
    paidProof: payload.paidProof || null,
    client_idempotency_key: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-create', descriptor.title, descriptor.ownerPassport),
      'chat-create',
    ),
    clientIdempotencyKey: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-create', descriptor.title, descriptor.ownerPassport),
      'chat-create',
    ),
    clientIdempotencyKey: compactIdempotencyKey(
      payload.client_idempotency_key ||
        payload.clientIdempotencyKey ||
        stableIdempotencyKey('chat-create', descriptor.title, descriptor.ownerPassport),
      'chat-create',
    ),
  };
}

function normalizeMessageBody(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 2000);
}

function assertExplicitConfirmation(options, label) {
  if (options?.confirmed !== true) {
    throw new ChatClientError(`${label} requires explicit caller confirmation.`, {
      reason: 'confirmation_required',
      retryable: false,
    });
  }
}

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function cleanErrorMessage(error) {
  return String(error?.message || error || 'Chat request failed.')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 320);
}

function isLikelyNotImplemented(status, reason, data) {
  if ([404, 405, 501].includes(Number(status || 0))) {
    return true;
  }

  const haystack = JSON.stringify({
    reason,
    data,
  }).toLowerCase();

  return (
    haystack.includes('not_found') ||
    haystack.includes('not found') ||
    haystack.includes('not_implemented') ||
    haystack.includes('unsupported_route') ||
    haystack.includes('no route') ||
    haystack.includes('unknown route')
  );
}

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
