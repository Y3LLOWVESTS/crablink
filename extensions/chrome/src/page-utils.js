/**
 * RO:WHAT — Utility helpers for CrabLink full-tab browser rendering and paid-flow safety checks.
 * RO:WHY — App Integration; Concerns: DX/SEC/ECON; keep UI controllers small and deterministic.
 * RO:INTERACTS — page.js, page-workflow.js, page-product-preview.js.
 * RO:INVARIANTS — no backend HTML execution; integer money strings only; dev-price guard fails closed.
 * RO:METRICS — none.
 * RO:CONFIG — reads devMode semantics passed from storage.js settings.
 * RO:SECURITY — detects unsafe paid estimates and nonce-conflict hints before wallet mutation.
 * RO:TEST — scripts/check-chrome.sh; manual crab://image prepare/hold/upload checks.
 */

export function boolText(value) {
  if (value === true) {
    return 'true';
  }

  if (value === false) {
    return 'false';
  }

  return '';
}

export function formatError(error) {
  const parts = [];

  if (error?.message) {
    parts.push(error.message);
  }

  if (error?.status) {
    parts.push(`HTTP ${error.status}`);
  }

  if (error?.route) {
    parts.push(error.route);
  }

  if (error?.correlationId) {
    parts.push(`correlation ${error.correlationId}`);
  }

  return parts.join(' — ') || 'Request failed.';
}

export function deepPick(object, paths) {
  for (const path of paths) {
    let current = object;

    for (const part of path) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        current = undefined;
        break;
      }

      current = current[part];
    }

    if (current !== undefined && current !== null && current !== '') {
      return current;
    }
  }

  return '';
}

export function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

export function stablePreviewIdempotencyKey(pageKind, value) {
  const left = String(pageKind || 'page')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const right = String(value || 'draft')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `crablink-preview:${left || 'page'}:${right || 'draft'}`;
}

export function prepareAmountMinor(data) {
  return deepPick(data, [
    ['wallet_hold', 'amount_minor'],
    ['paid_storage', 'estimate', 'amount_minor'],
    ['paid_storage', 'estimate', 'amount_minor_units'],
    ['paid_storage', 'estimate', 'amount']
  ]);
}

export function prepareMinimumHoldMinor(data) {
  return deepPick(data, [
    ['wallet_hold', 'minimum_hold_minor'],
    ['wallet_hold', 'amount_minor'],
    ['paid_storage', 'estimate', 'minimum_hold_minor'],
    ['paid_storage', 'estimate', 'minimum_hold_minor_units'],
    ['paid_storage', 'estimate', 'amount_minor'],
    ['paid_storage', 'estimate', 'amount_minor_units'],
    ['paid_storage', 'estimate', 'amount']
  ]);
}

export function setBadgeForStatus(el, status) {
  if (status === 'active') {
    el.className = 'badge badge-ok';
    el.textContent = 'active';
    return;
  }

  if (status === 'coming_soon') {
    el.className = 'badge badge-warn';
    el.textContent = 'coming soon';
    return;
  }

  el.className = 'badge badge-muted';
  el.textContent = status || 'page';
}

export function isPositiveIntegerString(value) {
  return /^[1-9][0-9]*$/.test(String(value ?? '').trim());
}

export function integerMinorUnits(value) {
  const raw = String(value ?? '').trim();

  if (!isPositiveIntegerString(raw)) {
    return null;
  }

  const n = Number(raw);

  if (!Number.isSafeInteger(n) || n < 1) {
    return null;
  }

  return n;
}

export function formatMinorUnits(value) {
  const raw = String(value ?? '').trim();

  if (!/^[0-9]+$/.test(raw)) {
    return raw;
  }

  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function paidActionName(data) {
  return String(data?.action || data?.wallet_hold?.action || data?.paid_storage?.action || '').trim();
}

export function devPricingGuard(data, settings) {
  const devMode = settings?.devMode !== false;

  if (!devMode) {
    return {
      blocked: false,
      reason: '',
      amountMinor: '',
      thresholdMinor: ''
    };
  }

  const action = paidActionName(data);
  const amountMinor = String(prepareAmountMinor(data) || prepareMinimumHoldMinor(data) || '').trim();
  const n = integerMinorUnits(amountMinor);

  if (action !== 'paid_storage_put' || n === null) {
    return {
      blocked: false,
      reason: '',
      amountMinor,
      thresholdMinor: ''
    };
  }

  const threshold = 2000;

  if (n <= threshold) {
    return {
      blocked: false,
      reason: '',
      amountMinor,
      thresholdMinor: String(threshold)
    };
  }

  return {
    blocked: true,
    reason:
      'Economics config may not be loaded. Dev paid_storage_put image/site pricing should be small, usually 25 ROC in the local dev config.',
    amountMinor,
    thresholdMinor: String(threshold)
  };
}

export function expectedNonceFromProblem(data) {
  const candidates = [
    data?.expected_nonce,
    data?.expectedNonce,
    data?.next_nonce,
    data?.nextNonce,
    data?.details?.expected_nonce,
    data?.details?.expectedNonce,
    data?.details?.next_nonce,
    data?.details?.nextNonce
  ];

  for (const candidate of candidates) {
    const n = integerMinorUnits(candidate);

    if (n !== null) {
      return n;
    }
  }

  const text = JSON.stringify(data || {});
  const patterns = [
    /expected[^0-9]{0,24}([1-9][0-9]{0,15})/i,
    /next[^0-9]{0,24}([1-9][0-9]{0,15})/i,
    /got[^0-9]{0,24}[1-9][0-9]{0,15}[^0-9]{0,24}expected[^0-9]{0,24}([1-9][0-9]{0,15})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const n = integerMinorUnits(match[1]);

    if (n !== null) {
      return n;
    }
  }

  return 0;
}

export function canonicalB3Cid(value) {
  const raw = String(value ?? '').trim().toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(raw)) {
    return raw;
  }

  if (/^[0-9a-f]{64}$/.test(raw)) {
    return `b3:${raw}`;
  }

  return '';
}

export function canonicalCrabAssetUrl(value) {
  const raw = String(value ?? '').trim().toLowerCase();

  if (/^crab:\/\/[0-9a-f]{64}\.[a-z0-9_-]+$/.test(raw)) {
    return raw;
  }

  return '';
}