/**
 * RO:WHAT — Linked-video preview byte fetching helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; isolates bounded preview fetch/normalization from the route component.
 * RO:INTERACTS — MakePage.jsx, makeLinkedVideoPreviewRoutes.js, Tauri fetch_asset_bytes_gateway command, gateway blob routes.
 * RO:INVARIANTS — bounded preview bytes only; no final export authority; no cache-paid unlock; no wallet mutation.
 * RO:METRICS — preview transport/status facts are display-only.
 * RO:CONFIG — MAX_LINKED_VIDEO_PREVIEW_BYTES from preview routes model.
 * RO:SECURITY — Tauri bridge is allowlisted; headers come from backend payment proof; no raw secrets.
 * RO:TEST — npm run build; manual linked-video paid preview smoke.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

import { formatBytes } from './makeDraftModel.js';
import {
  MAX_LINKED_VIDEO_PREVIEW_BYTES,
  buildLinkedVideoPreviewRoutes,
  buildLinkedVideoPreviewSources,
  linkedVideoPreviewAcceptHeader,
  linkedVideoPreviewProofHeaders,
} from './makeLinkedVideoPreviewRoutes.js';

export function canUseLinkedVideoTauriBytesBridge() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__) && typeof invoke === 'function';
}


export function linkedVideoPreviewBytesToUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView?.(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  return new Uint8Array();
}


export function linkedVideoPreviewDecodeText(bytes) {
  try {
    return new TextDecoder().decode(bytes).trim();
  } catch (_error) {
    return '';
  }
}


export async function normalizeLinkedVideoPreviewCommandBlob(response, routeCandidate) {
  const status = Number(response?.status || 0);
  const ok = response?.ok === true || (status >= 200 && status < 300);
  const contentType = linkedVideoPreviewFirstString(response?.contentType, response?.content_type, 'video/mp4');
  const bytes = linkedVideoPreviewBytesToUint8Array(response?.bodyBytes || response?.body_bytes);

  if (!ok) {
    const text = linkedVideoPreviewDecodeText(bytes);
    throw new Error(
      `Gateway preview bridge failed for ${routeCandidate.route} with HTTP ${status || 'unknown'}${text ? `: ${text.slice(0, 220)}` : ''}`,
    );
  }

  if (!bytes.length) {
    throw new Error(`Gateway preview bridge returned empty bytes for ${routeCandidate.route}.`);
  }

  if (bytes.length > MAX_LINKED_VIDEO_PREVIEW_BYTES) {
    throw new Error(
      `Linked-video preview exceeded ${formatBytes(MAX_LINKED_VIDEO_PREVIEW_BYTES)}. Future range/segment preview is required.`,
    );
  }

  const cleanContentType = String(contentType || '').toLowerCase();

  if (cleanContentType.includes('json') || cleanContentType.startsWith('text/')) {
    const text = linkedVideoPreviewDecodeText(bytes);
    throw new Error(`Gateway returned non-video preview data: ${text.slice(0, 220)}`);
  }

  return new Blob([bytes], {
    type: cleanContentType.startsWith('video/') ? cleanContentType : 'video/mp4',
  });
}


export async function fetchLinkedVideoPreviewBlobViaTauri({
  item,
  payment,
  payerAccount,
  passportSubject,
  target,
}) {
  const routes = buildLinkedVideoPreviewRoutes(item).filter((routeCandidate) => (
    /^\/o\/(b3:)?[0-9a-f]{64}$/i.test(routeCandidate.route)
  ));

  if (!routes.length) {
    throw new Error('No Tauri-safe /o/b3:<hash> preview route could be built.');
  }

  const attempts = [];
  const headers = linkedVideoPreviewProofHeaders(payment, {
    payerAccount,
    passportSubject,
    target,
  });

  for (const routeCandidate of routes) {
    try {
      const response = await callTauri('fetch_asset_bytes_gateway', {
        request: {
          route: routeCandidate.route,
          accept: linkedVideoPreviewAcceptHeader(),
          contentTypeHint: 'video/mp4',
          maxBytes: MAX_LINKED_VIDEO_PREVIEW_BYTES,
          headers,
        },
      });

      const blob = await normalizeLinkedVideoPreviewCommandBlob(response, routeCandidate);

      attempts.push({
        route: routeCandidate.route,
        label: `${routeCandidate.label} · Tauri bridge`,
        status: response?.status || 0,
        ok: true,
        bytes: blob.size,
        contentType: blob.type || response?.contentType || response?.content_type || '',
      });

      return {
        blob,
        route: routeCandidate.route,
        label: `${routeCandidate.label} · Tauri bridge`,
        status: response?.status || 0,
        correlationId: response?.correlationId || response?.correlation_id || '',
        attempts,
        transport: 'tauri_fetch_asset_bytes_gateway',
      };
    } catch (error) {
      attempts.push({
        route: routeCandidate.route,
        label: `${routeCandidate.label} · Tauri bridge`,
        ok: false,
        error: linkedVideoPreviewErrorMessage(error),
      });
    }
  }

  const error = new Error(attempts[attempts.length - 1]?.error || 'Tauri linked-video preview byte fetch failed.');
  error.attempts = attempts;
  throw error;
}


export async function normalizeLinkedVideoPreviewBlob(blob, contentType = '') {
  if (!(blob instanceof Blob)) {
    throw new Error('Gateway did not return preview video bytes.');
  }

  if (blob.size <= 0) {
    throw new Error('Gateway returned an empty linked-video preview.');
  }

  if (blob.size > MAX_LINKED_VIDEO_PREVIEW_BYTES) {
    throw new Error(
      `Linked-video preview exceeded ${formatBytes(MAX_LINKED_VIDEO_PREVIEW_BYTES)}. Future range/segment preview is required.`,
    );
  }

  const returnedType = String(blob.type || '').toLowerCase();

  if (returnedType.includes('json') || returnedType.startsWith('text/')) {
    const text = await blob.text();
    throw new Error(`Gateway returned non-video preview data: ${text.slice(0, 180)}`);
  }

  if (returnedType.startsWith('video/')) {
    return blob;
  }

  const cleanContentType = String(contentType || '').trim().toLowerCase();

  return new Blob([blob], {
    type: cleanContentType.startsWith('video/') ? cleanContentType : 'video/mp4',
  });
}


export async function fetchLinkedVideoPreviewBlob({
  item,
  app,
  gateway,
  payment,
  payerAccount = '',
  passportSubject = '',
  target = {},
}) {
  const routes = buildLinkedVideoPreviewRoutes(item);

  if (!routes.length) {
    throw new Error('No linked-video gateway preview route could be built.');
  }

  const attempts = [];

  if (canUseLinkedVideoTauriBytesBridge()) {
    try {
      return await fetchLinkedVideoPreviewBlobViaTauri({
        item,
        payment,
        payerAccount,
        passportSubject,
        target,
      });
    } catch (error) {
      attempts.push(...(Array.isArray(error?.attempts) ? error.attempts : [{
        route: '/o/b3:<hash>',
        label: 'Tauri bridge',
        ok: false,
        error: linkedVideoPreviewErrorMessage(error),
      }]));
    }
  }

  const browserHeaders = {
    Accept: linkedVideoPreviewAcceptHeader(),
    ...linkedVideoPreviewProofHeaders(payment, {
      payerAccount,
      passportSubject,
      target,
    }),
  };

  for (const routeCandidate of routes) {
    try {
      if (typeof gateway?.request === 'function') {
        const response = await gateway.request(routeCandidate.route, {
          label: 'Linked video paid preview bytes',
          parseAs: 'blob',
          headers: browserHeaders,
        });

        const blob = await normalizeLinkedVideoPreviewBlob(response?.data, response?.contentType);

        return {
          blob,
          route: routeCandidate.route,
          label: `${routeCandidate.label} · browser fetch`,
          status: response?.status || 0,
          correlationId: response?.correlationId || '',
          attempts,
          transport: 'browser_gateway_request_blob',
        };
      }

      const url = buildLinkedVideoPreviewSources(item, app)[routes.indexOf(routeCandidate)] || '';
      if (!url) {
        throw new Error('No gateway URL is available for this preview route.');
      }

      const response = await fetch(url, {
        headers: browserHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Gateway preview request failed with HTTP ${response.status}${errorText ? `: ${errorText.slice(0, 220)}` : ''}.`,
        );
      }

      const blob = await normalizeLinkedVideoPreviewBlob(
        await response.blob(),
        response.headers.get('content-type') || '',
      );

      return {
        blob,
        route: routeCandidate.route,
        label: `${routeCandidate.label} · browser fetch`,
        status: response.status,
        correlationId: '',
        attempts,
        transport: 'browser_fetch_blob',
      };
    } catch (error) {
      attempts.push({
        route: routeCandidate.route,
        label: routeCandidate.label,
        ok: false,
        error: linkedVideoPreviewErrorMessage(error),
      });
    }
  }

  const error = new Error(attempts[attempts.length - 1]?.error || 'Linked-video preview byte fetch failed.');
  error.attempts = attempts;
  throw error;
}


export function linkedVideoPreviewDisplayAmount(quoteOrPayment) {
  const summary = quoteOrPayment?.summary || quoteOrPayment || {};
  const display = String(summary.displayAmount || summary.display_amount || '').trim();
  const minor = String(summary.amountMinor || summary.amount_minor || '').trim();
  const asset = String(summary.asset || 'ROC').trim().toUpperCase();

  if (display) {
    return display;
  }

  if (minor) {
    return `${minor} ${asset}`;
  }

  return 'quoted ROC';
}


export function linkedVideoPreviewErrorMessage(error) {
  return error?.message || error?.data?.message || error?.reason || String(error || 'Preview failed.');
}


export function linkedVideoPreviewReceiptFacts(payment) {
  const summary = payment?.summary || {};

  return {
    txid: summary.txid || '',
    receiptHash: summary.receiptHash || '',
    ledgerRoot: summary.ledgerRoot || '',
    amount: linkedVideoPreviewDisplayAmount(summary),
  };
}


export function linkedVideoPreviewCanFetch(status) {
  return status === 'paid' || status === 'fetching' || status === 'ready';
}
