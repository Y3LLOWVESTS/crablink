/**
 * RO:WHAT — Media readiness diagnostics adapter for CrabLink Tauri.
 * RO:WHY — Camera/screen behavior must be probed honestly before native capture is wired.
 * RO:INTERACTS — Tauri media_status command, StreamMediaReadiness, StreamLocalPreview.
 * RO:INVARIANTS — diagnostics only; no capture start unless user clicks preview button; no backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — reads browser/WebView runtime facts only.
 * RO:SECURITY — no local paths, media bytes, stream keys, capabilities, wallet authority, or shell execution.
 * RO:TEST — manual crab://stream media readiness smoke.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

export async function readNativeMediaStatus() {
  try {
    return await callTauri('media_status');
  } catch (error) {
    return {
      schema: 'crablink.media-status-unavailable.v1',
      platform: 'unknown',
      osFamily: 'unknown',
      nativeCaptureWired: false,
      webviewCaptureExpected: 'unknown',
      cameraPermissionModel: 'native media_status command unavailable',
      microphonePermissionModel: 'native media_status command unavailable',
      screenPermissionModel: 'native media_status command unavailable',
      recommendedNextStep: 'Rebuild Tauri after adding commands::media::media_status.',
      safeFallback: 'local_video_file_rehearsal_preview',
      macosBundleIdentifier: 'com.rustyonions.crablink',
      macosInfoPlistExpected: false,
      macosDevMediaProfile: 'npm run tauri:dev:mac-media',
      macosPrivacyResetCommands: [],
      macosSystemSettingsPaths: [],
      truthBoundary: {
        startsCapture: false,
        requestsPermission: false,
        opensSystemSettings: false,
        executesShell: false,
        createsStreamSession: false,
        createsBackendStream: false,
        createsIngestToken: false,
        sendsMediaBytes: false,
        mintsB3: false,
        mutatesWallet: false,
      },
      warnings: [error instanceof Error ? error.message : String(error || 'media_status unavailable')],
    };
  }
}

export function probeWebViewMediaCapabilities() {
  const mediaDevices = navigator.mediaDevices || null;
  const protocol = window.location?.protocol || '';
  const host = window.location?.host || '';
  const isSecureContext = Boolean(window.isSecureContext);

  const cameraApi = typeof mediaDevices?.getUserMedia === 'function';
  const screenApi = typeof mediaDevices?.getDisplayMedia === 'function';
  const enumerateApi = typeof mediaDevices?.enumerateDevices === 'function';

  return {
    schema: 'crablink.webview-media-probe.v2',
    source: 'react_webview_runtime_probe',
    location: {
      protocol,
      host,
      secureContext: isSecureContext,
    },
    apis: {
      mediaDevices: Boolean(mediaDevices),
      getUserMedia: cameraApi,
      getDisplayMedia: screenApi,
      enumerateDevices: enumerateApi,
    },
    userAgent: navigator.userAgent || '',
    recommendation: classifyMediaReadiness({ cameraApi, screenApi, enumerateApi, isSecureContext }),
    truthBoundary: {
      startsCapture: false,
      requestsPermission: false,
      sendsMediaBytes: false,
      createsBackendStream: false,
      mutatesWallet: false,
    },
  };
}

export async function probeBrowserPermissionState() {
  const query = navigator.permissions?.query;

  if (typeof query !== 'function') {
    return {
      schema: 'crablink.browser-permission-probe.v1',
      source: 'navigator.permissions',
      supported: false,
      camera: 'unknown',
      microphone: 'unknown',
      note: 'navigator.permissions.query is unavailable in this WebView.',
    };
  }

  const camera = await safePermissionQuery('camera');
  const microphone = await safePermissionQuery('microphone');

  return {
    schema: 'crablink.browser-permission-probe.v1',
    source: 'navigator.permissions',
    supported: true,
    camera,
    microphone,
    note: 'Permission state is advisory; macOS System Settings can still override or block access.',
  };
}

export async function buildMediaReadinessReport() {
  const nativeStatus = await readNativeMediaStatus();
  const webviewProbe = probeWebViewMediaCapabilities();
  const permissionProbe = await probeBrowserPermissionState();

  return {
    schema: 'crablink.stream-media-readiness-report.v2',
    generatedAt: new Date().toISOString(),
    nativeStatus,
    webviewProbe,
    permissionProbe,
    canAttemptCamera: Boolean(webviewProbe.apis.getUserMedia),
    canAttemptScreen: Boolean(webviewProbe.apis.getDisplayMedia),
    safeFallback: 'local_video_file_rehearsal_preview',
    macosFixPlan: buildMacosFixPlan(nativeStatus, webviewProbe, permissionProbe),
    nextNativeWork: [
      'Keep src-tauri/Info.plist camera and microphone purpose strings.',
      'Use npm run tauri:dev:mac-media for macOS WebView media proof work.',
      'Add a production native media module for camera/mic/screen permission/status and capture handles.',
      'Keep React display-only and move persistent capture/session supervision behind Tauri Rust.',
    ],
  };
}

export function classifyGetUserMediaError(error) {
  const name = error?.name || '';
  const message = error?.message || String(error || '');

  if (name === 'NotAllowedError' || /permission|denied|not allowed/i.test(message)) {
    return {
      kind: 'permission_denied',
      title: 'Camera permission denied or blocked',
      message:
        'macOS or the WebView denied camera access. Check System Settings privacy permissions, reset TCC if needed, then relaunch CrabLink.',
    };
  }

  if (name === 'NotFoundError' || /not found|no camera|device/i.test(message)) {
    return {
      kind: 'device_not_found',
      title: 'No camera device found',
      message: 'No usable camera was found. Try another camera, close other camera apps, or use local video rehearsal.',
    };
  }

  if (name === 'NotReadableError' || /in use|busy|readable/i.test(message)) {
    return {
      kind: 'device_busy',
      title: 'Camera is busy',
      message: 'Another app may be using the camera. Quit other camera apps and try again.',
    };
  }

  if (/Media capture is not available|not supported/i.test(message)) {
    return {
      kind: 'webview_api_unavailable',
      title: 'Camera API hidden in WebView',
      message:
        'The WebView is not exposing getUserMedia. On macOS, run the dev media profile and relaunch after adding Info.plist.',
    };
  }

  return {
    kind: 'unknown_media_error',
    title: 'Camera preview failed',
    message: message || 'Unable to start camera preview.',
  };
}

function buildMacosFixPlan(nativeStatus, webviewProbe, permissionProbe) {
  if (nativeStatus?.platform !== 'macos') {
    return null;
  }

  return {
    schema: 'crablink.macos-media-fix-plan.v1',
    bundleIdentifier: nativeStatus.macosBundleIdentifier || 'com.rustyonions.crablink',
    devCommand: nativeStatus.macosDevMediaProfile || 'npm run tauri:dev:mac-media',
    infoPlistExpected: Boolean(nativeStatus.macosInfoPlistExpected),
    cameraApiVisible: Boolean(webviewProbe?.apis?.getUserMedia),
    cameraPermissionState: permissionProbe?.camera || 'unknown',
    microphonePermissionState: permissionProbe?.microphone || 'unknown',
    privacyResetCommands: nativeStatus.macosPrivacyResetCommands || [],
    systemSettingsPaths: nativeStatus.macosSystemSettingsPaths || [],
    steps: [
      'Quit CrabLink completely.',
      'Run tccutil reset commands if the app was denied before.',
      'Start the app with npm run tauri:dev:mac-media.',
      'Open crab://stream and click Start camera preview.',
      'Approve the macOS camera prompt.',
      'If audio preview is enabled, approve the microphone prompt.',
    ],
  };
}

async function safePermissionQuery(name) {
  try {
    const result = await navigator.permissions.query({ name });
    return result?.state || 'unknown';
  } catch (_error) {
    return 'unsupported';
  }
}

function classifyMediaReadiness({ cameraApi, screenApi, enumerateApi, isSecureContext }) {
  if (!isSecureContext) {
    return 'not_secure_context_local_file_fallback';
  }

  if (cameraApi && screenApi) {
    return 'webview_camera_and_screen_api_available';
  }

  if (cameraApi) {
    return 'webview_camera_api_available_screen_unavailable';
  }

  if (screenApi) {
    return 'webview_screen_api_available_camera_unavailable';
  }

  if (enumerateApi) {
    return 'enumerate_only_capture_api_unavailable';
  }

  return 'webview_media_api_unavailable_use_local_file_fallback';
}