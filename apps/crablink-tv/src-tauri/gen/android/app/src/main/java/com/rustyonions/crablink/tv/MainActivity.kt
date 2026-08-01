package com.rustyonions.crablink.tv

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import java.util.ArrayDeque
import org.json.JSONObject

private const val CRAB_INTENT_EVENT =
  "crablink-tv-android-intent"

private const val CRAB_INTENT_QUEUE =
  "__CRABLINK_TV_PENDING_INTENTS__"

private const val CRAB_INTENT_READY =
  "__CRABLINK_TV_ANDROID_INTENT_READY__"

private const val CRAB_INTENT_SOURCE =
  "android-intent"

private const val MAX_CRAB_INTENT_CHARS =
  2048

private const val MAX_PENDING_CRAB_INTENTS =
  16

private const val MAX_HANDOFF_ATTEMPTS =
  80

private const val HANDOFF_RETRY_MS =
  250L

private val PASSPORT_NATIVE_PIN_REQUEST_KEY_CODES =
  setOf(
    KeyEvent.KEYCODE_MENU,
    KeyEvent.KEYCODE_F1,
  )

private val PASSPORT_NATIVE_EXPLICIT_LOCK_KEY_CODES =
  setOf(
    KeyEvent.KEYCODE_INFO,
    KeyEvent.KEYCODE_F2,
  )

class MainActivity : TauriActivity() {
  private val tvPassportKeystoreBridge by
    lazy {
      TvPassportKeystoreBridge()
    }

  internal fun passportKeystoreBridgeForNativeRuntime():
    TvPassportKeystoreBridge =
    tvPassportKeystoreBridge

  private val tvPassportDeviceMaterialStore by
    lazy {
      TvPassportDeviceMaterialStore(
        applicationContext,
      )
    }

  private val tvPassportAuthorizationReplayStore by
    lazy {
      TvPassportAuthorizationReplayStore(
        applicationContext,
      )
    }

  private val tvPassportDeviceMaterialBridge by
    lazy {
      TvPassportDeviceMaterialBridge(
        keystoreBridge =
          tvPassportKeystoreBridge,

        store =
          tvPassportDeviceMaterialStore,

        replayStore =
          tvPassportAuthorizationReplayStore,
      )
    }

  internal fun passportDeviceMaterialBridgeForNativeRuntime():
    TvPassportDeviceMaterialBridge =
    tvPassportDeviceMaterialBridge

  private val tvPassportDelegatedAuthorityStore by
    lazy {
      TvPassportDelegatedAuthorityStore(
        applicationContext,
      )
    }

  private val tvPassportDelegatedAuthorityBridge by
    lazy {
      TvPassportDelegatedAuthorityBridge(
        keystoreBridge =
          tvPassportKeystoreBridge,

        store =
          tvPassportDelegatedAuthorityStore,
      )
    }

  internal fun passportDelegatedAuthorityBridgeForNativeRuntime():
    TvPassportDelegatedAuthorityBridge =
    tvPassportDelegatedAuthorityBridge

  private val tvPassportNativePinPrompt by
    lazy {
      TvPassportNativePinPrompt(
        activity =
          this,
      )
    }

  internal fun passportNativePinPromptForNativeRuntime():
    TvPassportNativePinPrompt =
    tvPassportNativePinPrompt

  private val tvPassportNativePinVerifierStore by
    lazy {
      TvPassportNativePinVerifierStore(
        context =
          applicationContext,

        keystoreBridge =
          tvPassportKeystoreBridge,
      )
    }

  internal fun passportNativePinVerifierStoreForNativeRuntime():
    TvPassportNativePinVerifierStore =
    tvPassportNativePinVerifierStore

  private val tvPassportOperationalUnlockBridge by
    lazy {
      TvPassportOperationalUnlockBridge(
        verifierStore =
          tvPassportNativePinVerifierStore,

        deviceMaterialBridge =
          tvPassportDeviceMaterialBridge,

        delegatedAuthorityBridge =
          tvPassportDelegatedAuthorityBridge,
      )
    }

  internal fun passportOperationalUnlockBridgeForNativeRuntime():
    TvPassportOperationalUnlockBridge =
    tvPassportOperationalUnlockBridge

  private val tvPassportNativePinCoordinator by
    lazy {
      TvPassportNativePinCoordinator(
        prompt =
          tvPassportNativePinPrompt,

        verifierStore =
          tvPassportNativePinVerifierStore,

        operationalUnlockBridge =
          tvPassportOperationalUnlockBridge,
      )
    }

  internal fun passportNativePinCoordinatorForNativeRuntime():
    TvPassportNativePinCoordinator =
    tvPassportNativePinCoordinator

  private var tvWebView: WebView? = null

  private val pendingCrabIntents =
    ArrayDeque<String>()

  private var handoffScheduled =
    false

  override fun onCreate(
    savedInstanceState: Bundle?,
  ) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    tvPassportDeviceMaterialBridge
      .hydrateStoredPublicRecord()

    tvPassportDelegatedAuthorityBridge
      .hydrateStoredDelegatedAuthorityOnStartupForNative()

    enqueueCrabIntent(intent)
  }

  override fun onWebViewCreate(
    webView: WebView,
  ) {
    super.onWebViewCreate(webView)
    tvWebView = webView
    flushPendingCrabIntent()
  }

  override fun onNewIntent(
    intent: Intent,
  ) {
    super.onNewIntent(intent)
    setIntent(intent)
    enqueueCrabIntent(intent)
  }

  override fun dispatchKeyEvent(
    event:
      KeyEvent,
  ):
    Boolean {
    val keyCode =
      event.keyCode

    if (
      keyCode in
      PASSPORT_NATIVE_PIN_REQUEST_KEY_CODES
    ) {
      if (
        event.action ==
        KeyEvent.ACTION_UP &&
        event.repeatCount ==
        0
      ) {
        tvPassportNativePinCoordinator
          .requestExplicitEnrollmentOrUnlock()
      }

      return true
    }

    if (
      keyCode in
      PASSPORT_NATIVE_EXPLICIT_LOCK_KEY_CODES
    ) {
      if (
        event.action ==
        KeyEvent.ACTION_UP &&
        event.repeatCount ==
        0
      ) {
        tvPassportNativePinCoordinator
          .requestExplicitLock()
      }

      return true
    }

    return super.dispatchKeyEvent(
      event,
    )
  }

  override fun onPause() {
    tvPassportNativePinCoordinator
      .failClosedOnLifecycleBoundary()

    super.onPause()
  }

  override fun onStop() {
    tvPassportNativePinCoordinator
      .failClosedOnLifecycleBoundary()

    super.onStop()
  }

  override fun onDestroy() {
    tvPassportNativePinCoordinator
      .failClosedOnLifecycleBoundary()

    tvWebView =
      null

    super.onDestroy()
  }

  override fun onResume() {
    super.onResume()
    flushPendingCrabIntent()
  }

  override fun onWindowFocusChanged(
    hasFocus: Boolean,
  ) {
    super.onWindowFocusChanged(hasFocus)

    if (hasFocus) {
      flushPendingCrabIntent()
    }
  }

  private fun enqueueCrabIntent(
    intent: Intent?,
  ) {
    val reviewed =
      reviewedCrabIntentUrl(intent)
        ?: return

    while (
      pendingCrabIntents.size >=
      MAX_PENDING_CRAB_INTENTS
    ) {
      pendingCrabIntents.removeFirst()
    }

    pendingCrabIntents.addLast(reviewed)
    flushPendingCrabIntent()
  }

  private fun reviewedCrabIntentUrl(
    intent: Intent?,
  ): String? {
    if (
      intent?.action !=
      Intent.ACTION_VIEW
    ) {
      return null
    }

    val uri =
      intent.data
        ?: return null

    if (
      !uri.scheme.equals(
        "crab",
        ignoreCase = true,
      )
    ) {
      return null
    }

    val candidate =
      uri
        .toString()
        .trim()

    if (
      candidate.isEmpty() ||
      candidate.length >
        MAX_CRAB_INTENT_CHARS ||
      candidate.any { character ->
        character.code < 0x20 ||
          character.code == 0x7f
      }
    ) {
      return null
    }

    return candidate
  }

  private fun flushPendingCrabIntent(
    attempt: Int = 0,
  ) {
    if (
      handoffScheduled ||
      pendingCrabIntents.isEmpty()
    ) {
      return
    }

    val webView =
      tvWebView
        ?: return

    val url =
      pendingCrabIntents.peekFirst()
        ?: return

    if (
      attempt >=
      MAX_HANDOFF_ATTEMPTS
    ) {
      return
    }

    val quotedUrl =
      JSONObject.quote(url)

    val quotedSource =
      JSONObject.quote(
        CRAB_INTENT_SOURCE,
      )

    val quotedEvent =
      JSONObject.quote(
        CRAB_INTENT_EVENT,
      )

    val quotedQueue =
      JSONObject.quote(
        CRAB_INTENT_QUEUE,
      )

    val quotedReady =
      JSONObject.quote(
        CRAB_INTENT_READY,
      )

    val script = """
      (() => {
        const readyKey = $quotedReady;

        if (window[readyKey] !== true) {
          return false;
        }

        const payload = Object.freeze({
          url: $quotedUrl,
          source: $quotedSource,
        });

        const queueKey = $quotedQueue;

        const queue =
          Array.isArray(window[queueKey])
            ? window[queueKey]
            : [];

        if (
          queue.length >=
          $MAX_PENDING_CRAB_INTENTS
        ) {
          queue.shift();
        }

        queue.push(payload);
        window[queueKey] = queue;

        window.dispatchEvent(
          new CustomEvent(
            $quotedEvent,
            {
              detail: payload,
            },
          ),
        );

        return true;
      })();
    """.trimIndent()

    handoffScheduled = true

    webView.post {
      webView.evaluateJavascript(
        script,
      ) { result ->
        handoffScheduled = false

        if (result == "true") {
          if (
            pendingCrabIntents
              .peekFirst() == url
          ) {
            pendingCrabIntents
              .removeFirst()
          }

          flushPendingCrabIntent()
        } else {
          webView.postDelayed(
            {
              flushPendingCrabIntent(
                attempt + 1,
              )
            },
            HANDOFF_RETRY_MS,
          )
        }
      }
    }
  }
}
