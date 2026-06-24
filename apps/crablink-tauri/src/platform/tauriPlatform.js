/**
 * RO:WHAT — Central typed Tauri invoke adapter for CrabLink.
 * RO:WHY — React and product clients must not call raw native privilege directly.
 * RO:INTERACTS — @tauri-apps/api/core, shared/api/*, Tauri Rust command allowlist.
 * RO:INVARIANTS — allowlisted commands only; no shell/eval/raw/native/QuickChain/verifier/committee/attestation/quorum/finality authority commands.
 * RO:SECURITY — command names are validated before invoke; thrown errors are redacted before display.
 * RO:TEST — npm run check:quickchain-boundary.
 */

import { invoke } from '@tauri-apps/api/core';

export const ALLOWED_TAURI_COMMANDS = Object.freeze([
  'app_diagnostics',
  'read_settings',
  'write_settings',
  'health_check_gateway',
  'ready_check_gateway',
  'resolve_crab_url_gateway',
  'identity_me_gateway',
  'wallet_balance_gateway',
  'gateway_request',
  'upload_image_asset_gateway',
  'upload_staged_image_asset_gateway',
  'hash_image_asset_bytes',
  'hash_staged_asset_bytes',
  'upload_video_asset_gateway',
  'upload_staged_video_asset_gateway',
  'upload_music_asset_gateway',
  'fetch_asset_bytes_gateway',
  'upload_podcast_asset_gateway',
  'media_status',
  'media_choose_video_source',
  'media_register_video_source',
  'media_get_video_source',
  'media_get_video_source_preview',
  'media_clear_video_source',
  'media_probe_video',
  'media_plan_video_renditions',
  'media_prepare_video_bundle',
  'media_get_video_job_status',
  'media_cancel_video_job',
  'media_make_export_begin',
  'media_make_export_append_chunk',
  'media_make_export_append_audio_chunk',
  'media_make_export_finish',
  'media_make_export_status',
  'media_make_export_clear',
  'start_local_stream_session',
  'get_local_stream_session',
  'stop_local_stream_session',
]);

const ALLOWED_TAURI_COMMAND_SET = new Set(ALLOWED_TAURI_COMMANDS);

const FORBIDDEN_COMMAND_PATTERNS = Object.freeze([
  /^raw[_-]/i,
  /(^|[_-])(run|execute|eval|shell|native)([_-]|$)/i,
  /quickchain[_-]?(root|state|receipt|checkpoint|proof|replay|verifier|validator|committee|attestation|attestations|quorum|fork[_-]?choice|finality|settle|settlement|anchor|bridge)/i,
  /(^|[_-])(checkpoint|proof|replay|verifier|validator|committee|attestation|attestations|quorum|fork[_-]?choice|finality|settle|settlement|anchor|bridge|staking|slashing|liquidity)([_-]|$)/i,
  /(^|[_-])(rox|solana)([_-]|$)/i,
  /(^|[_-])(mint|issue|transfer|burn|hold|capture|release)([_-]|$)/i,
  /unlock[_-]?paid[_-]?from[_-]?cache/i,
]);

const SECRET_ERROR_PATTERNS = Object.freeze([
  /bearer\s+[a-z0-9._~+\/-]+=*/gi,
  /(authorization\s*[:=]\s*)[^\s,;}]+/gi,
  /(token\s*[:=]\s*)[^\s,;}]+/gi,
  /(secret\s*[:=]\s*)[^\s,;}]+/gi,
  /(seed\s*[:=]\s*)[^\s,;}]+/gi,
  /(private[_-]?key\s*[:=]\s*)[^\s,;}]+/gi,
]);

export function isAllowedTauriCommand(command) {
  const normalized = normalizeCommandName(command);

  if (!normalized) {
    return false;
  }

  if (FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return ALLOWED_TAURI_COMMAND_SET.has(normalized);
}

export async function callTauri(command, args = {}) {
  const normalized = normalizeCommandName(command);

  if (!isAllowedTauriCommand(normalized)) {
    throw new Error(`Tauri command is not authorized by CrabLink boundary policy: ${redactForDisplay(normalized || 'unknown')}`);
  }

  try {
    return await invoke(normalized, args && typeof args === 'object' ? args : {});
  } catch (error) {
    throw new Error(redactForDisplay(error?.message || String(error || 'Tauri command failed')));
  }
}

export function normalizeCommandName(command) {
  return String(command || '').trim();
}

export function redactForDisplay(value) {
  let clean = String(value || 'Tauri command failed.');

  for (const pattern of SECRET_ERROR_PATTERNS) {
    clean = clean.replace(pattern, (_match, prefix = '') => `${prefix}[redacted]`);
  }

  clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (clean.length > 240) {
    return `${clean.slice(0, 237)}...`;
  }

  return clean || 'Tauri command failed.';
}
