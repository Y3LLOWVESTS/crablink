package com.rustyonions.crablink.tv

import android.content.Intent
import android.os.Bundle
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

class MainActivity : TauriActivity() {
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
