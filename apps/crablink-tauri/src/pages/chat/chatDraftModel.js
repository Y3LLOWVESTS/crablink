/**
 * RO:WHAT — Local draft model for the React crab://chat workspace.
 * RO:WHY — Starts the portable chat primitive with honest local-only builder state before backend chat routes exist.
 * RO:INTERACTS — ChatPage, ChatBuilder, ChatRoomView, ChatComposer, ChatModerationPanel.
 * RO:INVARIANTS — no fake backend messages; no fake receipts; no wallet mutation; no moderator authority claim.
 * RO:METRICS — none; future backend chat routes own message/moderation/fanout metrics.
 * RO:CONFIG — local defaults for room price, expiry, emoji, reactions, moderation, and payout display.
 * RO:SECURITY — message bodies remain text; no HTML/script rendering; local lists are display-only drafts.
 * RO:TEST — npm run build; manual crab://chat route smoke.
 */

export const CHAT_VIEW_OPTIONS = Object.freeze([
  { value: 'room', label: 'Room' },
  { value: 'builder', label: 'Builder' },
  { value: 'publish', label: 'Publish' },
  { value: 'moderation', label: 'Moderation' },
  { value: 'developer', label: 'Developer' },
]);

export const CHAT_SEND_MODE_OPTIONS = Object.freeze([
  { value: 'free', label: 'Free' },
  { value: 'paid_per_message', label: 'Paid per message' },
  { value: 'disabled', label: 'Disabled' },
]);

export const CHAT_EXPIRY_MODE_OPTIONS = Object.freeze([
  { value: 'never_expires', label: 'Never expires' },
  { value: 'expires_at', label: 'Expires at' },
  { value: 'manual_close', label: 'Manual close' },
]);

export const CHAT_ARCHIVE_MODE_OPTIONS = Object.freeze([
  { value: 'read_only_after_expiry', label: 'Read-only after expiry' },
  { value: 'hide_after_expiry', label: 'Hide after expiry' },
]);

export const CHAT_EMOJI_QUICK_REACTIONS = Object.freeze(['🦀', '🔥', '😂', '❤️', '👍', '👀', '🎙️', '💬']);

export const DEFAULT_CHAT_DRAFT = Object.freeze({
  roomTitle: 'CrabLink Creator Chat',
  description: 'Portable chat room for streams, podcasts, creator pages, sites, and standalone community drops.',
  ownerPassport: 'passport:main:dev',
  ownerDisplay: '@creator',
  ownerAccount: 'acct_dev',
  attachedTo: '',
  sendMode: 'paid_per_message',
  messagePriceRoc: '1',
  readMode: 'public',
  creatorShareBps: '9000',
  platformShareBps: '1000',
  moderatorPoolBps: '0',
  expiryMode: 'never_expires',
  expiresAt: '',
  archiveMode: 'read_only_after_expiry',
  moderationMode: 'moderated',
  mods: '@modname',
  blockedUsernames: '',
  blockedTerms: '',
  allowEmoji: true,
  allowReactions: true,
  maxMessageChars: '500',
  slowModeSeconds: '0',
  pinnedNote: 'Welcome to the room. Keep it fun, honest, and crabby. 🦀',
  localPreviewName: '@you',
  localPreviewAvatar: '🦀',
});

export function normalizeChatDraft(draft) {
  const merged = {
    ...DEFAULT_CHAT_DRAFT,
    ...(draft || {}),
  };

  return {
    ...merged,
    roomTitle: String(merged.roomTitle || '').slice(0, 96),
    description: String(merged.description || '').slice(0, 420),
    ownerPassport: String(merged.ownerPassport || '').slice(0, 96),
    ownerDisplay: normalizeHandleLike(merged.ownerDisplay, '@creator'),
    ownerAccount: String(merged.ownerAccount || '').slice(0, 96),
    attachedTo: String(merged.attachedTo || '').slice(0, 1200),
    sendMode: optionValue(merged.sendMode, CHAT_SEND_MODE_OPTIONS, DEFAULT_CHAT_DRAFT.sendMode),
    messagePriceRoc: normalizeIntegerString(merged.messagePriceRoc, DEFAULT_CHAT_DRAFT.messagePriceRoc, {
      min: 0,
      max: 1000000,
    }),
    readMode: 'public',
    creatorShareBps: normalizeIntegerString(merged.creatorShareBps, DEFAULT_CHAT_DRAFT.creatorShareBps, {
      min: 0,
      max: 10000,
    }),
    platformShareBps: normalizeIntegerString(merged.platformShareBps, DEFAULT_CHAT_DRAFT.platformShareBps, {
      min: 0,
      max: 10000,
    }),
    moderatorPoolBps: normalizeIntegerString(merged.moderatorPoolBps, DEFAULT_CHAT_DRAFT.moderatorPoolBps, {
      min: 0,
      max: 10000,
    }),
    expiryMode: optionValue(merged.expiryMode, CHAT_EXPIRY_MODE_OPTIONS, DEFAULT_CHAT_DRAFT.expiryMode),
    expiresAt: String(merged.expiresAt || '').slice(0, 64),
    archiveMode: optionValue(merged.archiveMode, CHAT_ARCHIVE_MODE_OPTIONS, DEFAULT_CHAT_DRAFT.archiveMode),
    moderationMode: 'moderated',
    mods: String(merged.mods || '').slice(0, 1200),
    blockedUsernames: String(merged.blockedUsernames || '').slice(0, 1200),
    blockedTerms: String(merged.blockedTerms || '').slice(0, 1200),
    allowEmoji: Boolean(merged.allowEmoji),
    allowReactions: Boolean(merged.allowReactions),
    maxMessageChars: normalizeIntegerString(merged.maxMessageChars, DEFAULT_CHAT_DRAFT.maxMessageChars, {
      min: 1,
      max: 2000,
    }),
    slowModeSeconds: normalizeIntegerString(merged.slowModeSeconds, DEFAULT_CHAT_DRAFT.slowModeSeconds, {
      min: 0,
      max: 86400,
    }),
    pinnedNote: String(merged.pinnedNote || '').slice(0, 280),
    localPreviewName: normalizeHandleLike(merged.localPreviewName, '@you'),
    localPreviewAvatar: String(merged.localPreviewAvatar || '🦀').slice(0, 8),
  };
}

export function buildChatRoomDescriptor(draft) {
  const safeDraft = normalizeChatDraft(draft);
  const attachedTo = parseList(safeDraft.attachedTo);
  const mods = parseList(safeDraft.mods).map((item) => normalizeHandleLike(item, item));
  const blockedUsernames = parseList(safeDraft.blockedUsernames).map((item) => normalizeHandleLike(item, item));
  const blockedTerms = parseList(safeDraft.blockedTerms);
  const creatorShareBps = parseIntSafe(safeDraft.creatorShareBps);
  const platformShareBps = parseIntSafe(safeDraft.platformShareBps);
  const moderatorPoolBps = parseIntSafe(safeDraft.moderatorPoolBps);
  const payoutTotalBps = creatorShareBps + platformShareBps + moderatorPoolBps;

  return {
    schema: 'crablink.chat-room.v1',
    kind: 'chat',
    title: safeDraft.roomTitle.trim() || DEFAULT_CHAT_DRAFT.roomTitle,
    description: safeDraft.description.trim(),
    ownerPassport: safeDraft.ownerPassport.trim(),
    ownerDisplay: safeDraft.ownerDisplay.trim(),
    ownerAccount: safeDraft.ownerAccount.trim(),
    attachedTo,
    access: {
      readMode: safeDraft.readMode,
      sendMode: safeDraft.sendMode,
      messagePriceRoc: parseIntSafe(safeDraft.messagePriceRoc),
      currency: 'ROC',
      explicitConfirmRequired: safeDraft.sendMode === 'paid_per_message',
      backendConfirmed: false,
    },
    payout: {
      creatorShareBps,
      platformShareBps,
      moderatorPoolBps,
      totalBps: payoutTotalBps,
      validTotal: payoutTotalBps === 10000,
      backendConfirmed: false,
    },
    expiry: {
      mode: safeDraft.expiryMode,
      expiresAt: safeDraft.expiryMode === 'expires_at' ? safeDraft.expiresAt.trim() || null : null,
      archiveMode: safeDraft.archiveMode,
      backendConfirmed: false,
    },
    moderation: {
      mode: safeDraft.moderationMode,
      mods,
      blockedUsernames,
      blockedTerms,
      allowEmoji: safeDraft.allowEmoji,
      allowReactions: safeDraft.allowReactions,
      maxMessageChars: parseIntSafe(safeDraft.maxMessageChars),
      slowModeSeconds: parseIntSafe(safeDraft.slowModeSeconds),
      backendConfirmed: false,
    },
    pinnedNote: safeDraft.pinnedNote.trim(),
    createdAt: new Date().toISOString(),
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_chat_url: false,
      creates_backend_room: false,
      creates_message_truth: false,
      sends_messages: false,
      quotes_paid_message: false,
      performs_paid_action: false,
      mutates_wallet: false,
      writes_index_pointer: false,
      grants_moderator_authority: false,
      enforces_expiry: false,
      backend_route_claimed: false,
    },
  };
}

export function statsForChatDraft(draft) {
  const descriptor = buildChatRoomDescriptor(draft);
  const messagePrice = descriptor.access.messagePriceRoc;
  const maxChars = descriptor.moderation.maxMessageChars;
  const attached = descriptor.attachedTo;
  const mods = descriptor.moderation.mods;
  const blocked = descriptor.moderation.blockedUsernames;
  const payout = descriptor.payout;

  return {
    message_price_roc: messagePrice,
    send_mode: descriptor.access.sendMode,
    attached_count: attached.length,
    mod_count: mods.length,
    blocked_user_count: blocked.length,
    blocked_term_count: descriptor.moderation.blockedTerms.length,
    max_message_chars: maxChars,
    slow_mode_seconds: descriptor.moderation.slowModeSeconds,
    payout_total_bps: payout.totalBps,
    payout_valid: payout.validTotal,
    emoji_enabled: descriptor.moderation.allowEmoji,
    reactions_enabled: descriptor.moderation.allowReactions,
    expiry_mode: descriptor.expiry.mode,
    archive_mode: descriptor.expiry.archiveMode,
  };
}

export function buildLocalPreviewMessage({ body, draft, kind = 'own' }) {
  const safeDraft = normalizeChatDraft(draft);
  const clean = sanitizeMessageBody(body, safeDraft);

  return {
    schema: 'crablink.chat-message.local-preview.v1',
    messageId: `local-preview-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    room: 'crab://chat',
    senderDisplay: kind === 'own' ? safeDraft.localPreviewName : '@preview',
    avatar: kind === 'own' ? safeDraft.localPreviewAvatar : '💬',
    body: clean.body,
    emojiOnly: clean.emojiOnly,
    createdAt: new Date().toISOString(),
    localPreviewOnly: true,
    backendConfirmed: false,
    paid: {
      required: safeDraft.sendMode === 'paid_per_message',
      amountRoc: safeDraft.sendMode === 'paid_per_message' ? parseIntSafe(safeDraft.messagePriceRoc) : 0,
      receiptHash: null,
      walletTxid: null,
      backendConfirmed: false,
    },
    moderation: {
      state: 'local_preview_only',
      backendConfirmed: false,
    },
  };
}

export function sanitizeMessageBody(body, draft) {
  const safeDraft = normalizeChatDraft(draft);
  const max = parseIntSafe(safeDraft.maxMessageChars) || 500;
  const plain = String(body || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim();

  const graphemes = splitGraphemes(plain);
  const clamped = graphemes.slice(0, max).join('');
  const emojiOnly = clamped.length > 0 && isEmojiOnly(clamped);

  return {
    body: clamped,
    length: splitGraphemes(clamped).length,
    max,
    remaining: Math.max(0, max - splitGraphemes(clamped).length),
    overLimit: graphemes.length > max,
    emojiOnly,
  };
}

export function labelFromSnake(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  return clean
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseList(input) {
  return String(input || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatTimestamp(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'not confirmed';
  }

  const parsed = Date.parse(raw);

  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return new Date(parsed).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function shortCrabUrl(value) {
  const clean = String(value || '').trim();

  if (clean.length <= 34) {
    return clean || 'not linked';
  }

  if (clean.startsWith('crab://') && clean.includes('.')) {
    return `${clean.slice(0, 18)}…${clean.slice(-12)}`;
  }

  return `${clean.slice(0, 26)}…`;
}

function normalizeHandleLike(value, fallback) {
  const clean = String(value || '').trim();

  if (!clean) {
    return fallback;
  }

  if (clean.startsWith('crab://@')) {
    return clean;
  }

  if (clean.startsWith('@')) {
    return clean;
  }

  if (/^[a-z0-9][a-z0-9_.-]{2,31}$/i.test(clean)) {
    return `@${clean}`;
  }

  return clean.slice(0, 64);
}

function optionValue(value, options, fallback) {
  const clean = String(value || '').trim();

  return options.some((option) => option.value === clean) ? clean : fallback;
}

function normalizeIntegerString(value, fallback, { min, max }) {
  const clean = String(value ?? '').trim();

  if (!/^\d+$/.test(clean)) {
    return String(fallback);
  }

  const parsed = Number.parseInt(clean, 10);

  if (!Number.isFinite(parsed)) {
    return String(fallback);
  }

  return String(Math.max(min, Math.min(max, parsed)));
}

function parseIntSafe(value) {
  const parsed = Number.parseInt(String(value || '0'), 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function splitGraphemes(value) {
  const text = String(value || '');

  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (segment) => segment.segment);
    }
  } catch (_error) {
    // Fall through to Array.from.
  }

  return Array.from(text);
}

function isEmojiOnly(value) {
  const stripped = String(value || '').replace(/\s+/g, '');

  if (!stripped) {
    return false;
  }

  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+$/u.test(stripped);
}