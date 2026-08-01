package com.rustyonions.crablink.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.DialogInterface
import android.text.InputFilter
import android.text.InputType
import android.view.WindowManager
import android.widget.EditText

/**
 * Android-owned PIN prompt for delegated Passport enrollment and unlock.
 *
 * PIN characters remain inside this native Android surface. They are supplied
 * only to a native verifier callback, are cleared immediately afterward, and
 * are never returned to Rust, React, the WebView, logs, or persistent storage.
 */
internal class TvPassportNativePinPrompt(
  private val activity:
    Activity,
) {
  private var activeDialog:
    AlertDialog? =
    null

  fun requestEnrollmentPin(
    verifier:
      TvPassportNativePinVerifier,

    onResult:
      (
        TvPassportNativePinPromptReceipt,
      ) -> Unit,
  ) {
    requestPin(
      title =
        "Create Passport PIN",

      message =
        "Enter a new device PIN.",

      positiveLabel =
        "Continue",

      verifier =
        verifier,

      onResult =
        onResult,
    )
  }

  fun requestEnrollmentConfirmation(
    verifier:
      TvPassportNativePinVerifier,

    onResult:
      (
        TvPassportNativePinPromptReceipt,
      ) -> Unit,
  ) {
    requestPin(
      title =
        "Confirm Passport PIN",

      message =
        "Enter the same device PIN again.",

      positiveLabel =
        "Confirm",

      verifier =
        verifier,

      onResult =
        onResult,
    )
  }

  fun requestUnlock(
    verifier:
      TvPassportNativePinVerifier,

    onResult:
      (
        TvPassportNativePinPromptReceipt,
      ) -> Unit,
  ) {
    requestPin(
      title =
        "Unlock Passport",

      message =
        "Enter your device PIN.",

      positiveLabel =
        "Unlock",

      verifier =
        verifier,

      onResult =
        onResult,
    )
  }

  private fun requestPin(
    title:
      String,

    message:
      String,

    positiveLabel:
      String,

    verifier:
      TvPassportNativePinVerifier,

    onResult:
      (
        TvPassportNativePinPromptReceipt,
      ) -> Unit,
  ) {
    try {
      activity.runOnUiThread {
        showPromptOnUiThread(
          title =
            title,

          message =
            message,

          positiveLabel =
            positiveLabel,

          verifier =
            verifier,

          onResult =
            onResult,
        )
      }
    } catch (
      _:
        RuntimeException,
    ) {
      onResult(
        receipt(
          TvPassportNativePinOutcome
            .PromptUnavailable,
        ),
      )
    }
  }

  private fun showPromptOnUiThread(
    title:
      String,

    message:
      String,

    positiveLabel:
      String,

    verifier:
      TvPassportNativePinVerifier,

    onResult:
      (
        TvPassportNativePinPromptReceipt,
      ) -> Unit,
  ) {
    if (
      activity.isFinishing ||
      activity.isDestroyed ||
      activeDialog != null
    ) {
      onResult(
        receipt(
          TvPassportNativePinOutcome
            .PromptUnavailable,
        ),
      )

      return
    }

    val input =
      EditText(
        activity,
      )
        .apply {
          inputType =
            InputType.TYPE_CLASS_NUMBER or
            InputType.TYPE_NUMBER_VARIATION_PASSWORD

          isSingleLine =
            true

          filters =
            arrayOf(
              InputFilter.LengthFilter(
                MAX_NATIVE_PIN_CHARACTERS,
              ),
            )

          isLongClickable =
            false

          setTextIsSelectable(
            false,
          )
        }

    var completed =
      false

    fun finish(
      outcome:
        TvPassportNativePinOutcome,
    ) {
      if (completed) {
        return
      }

      completed =
        true

      input.text.clear()

      activeDialog =
        null

      onResult(
        receipt(
          outcome,
        ),
      )
    }

    val dialog =
      AlertDialog
        .Builder(
          activity,
        )
        .setTitle(
          title,
        )
        .setMessage(
          message,
        )
        .setView(
          input,
        )
        .setPositiveButton(
          positiveLabel,
          null,
        )
        .setNegativeButton(
          "Cancel",
        ) {
          _,
          _ ->
          finish(
            TvPassportNativePinOutcome
              .Cancelled,
          )
        }
        .setOnCancelListener {
          finish(
            TvPassportNativePinOutcome
              .Cancelled,
          )
        }
        .create()

    dialog.setOnShowListener {
      dialog
        .getButton(
          DialogInterface.BUTTON_POSITIVE,
        )
        .setOnClickListener {
          val editable =
            input.text

          val pin =
            CharArray(
              editable.length,
            ) { index ->
              editable[
                index
              ]
            }

          editable.clear()

          val verification =
            try {
              if (
                pin.size <
                MIN_NATIVE_PIN_CHARACTERS ||
                pin.size >
                MAX_NATIVE_PIN_CHARACTERS
              ) {
                TvPassportNativePinVerification
                  .WrongPin
              } else {
                verifier.verify(
                  pin,
                )
              }
            } catch (
              _:
                RuntimeException,
            ) {
              TvPassportNativePinVerification
                .PromptUnavailable
            } finally {
              pin.fill(
                '\u0000',
              )
            }

          val outcome =
            when (
              verification
            ) {
              TvPassportNativePinVerification
                .Accepted ->
                TvPassportNativePinOutcome
                  .Accepted

              TvPassportNativePinVerification
                .WrongPin ->
                TvPassportNativePinOutcome
                  .WrongPin

              TvPassportNativePinVerification
                .PromptUnavailable ->
                TvPassportNativePinOutcome
                  .PromptUnavailable
            }

          finish(
            outcome,
          )

          dialog.dismiss()
        }
    }

    dialog.setOnDismissListener {
      if (!completed) {
        finish(
          TvPassportNativePinOutcome
            .Cancelled,
        )
      }
    }

    activeDialog =
      dialog

    try {
      dialog.show()

      dialog.window
        ?.addFlags(
          WindowManager
            .LayoutParams
            .FLAG_SECURE,
        )

      dialog.window
        ?.setSoftInputMode(
          WindowManager
            .LayoutParams
            .SOFT_INPUT_STATE_ALWAYS_VISIBLE,
        )

      input.requestFocus()
    } catch (
      _:
        RuntimeException,
    ) {
      activeDialog =
        null

      input.text.clear()

      onResult(
        receipt(
          TvPassportNativePinOutcome
            .PromptUnavailable,
        ),
      )
    }
  }

  private fun receipt(
    outcome:
      TvPassportNativePinOutcome,
  ):
    TvPassportNativePinPromptReceipt =
    TvPassportNativePinPromptReceipt(
      schema =
        NATIVE_PIN_PROMPT_RECEIPT_SCHEMA,

      outcome =
        outcome.label,

      accepted =
        outcome ==
        TvPassportNativePinOutcome.Accepted,

      cancelled =
        outcome ==
        TvPassportNativePinOutcome.Cancelled,

      wrongPin =
        outcome ==
        TvPassportNativePinOutcome.WrongPin,

      promptUnavailable =
        outcome ==
        TvPassportNativePinOutcome.PromptUnavailable,

      pinStored =
        false,

      pinReturnedToWebview =
        false,

      privateMaterialExported =
        false,

      recoveryRootPresent =
        false,

      rootAdminKeyPresent =
        false,

      rawAuthorizationReturned =
        false,

      rawCapabilityReturned =
        false,

      operationallyUnlocked =
        false,

      proofSigningActivated =
        false,
    )
}

internal fun interface TvPassportNativePinVerifier {
  fun verify(
    pin:
      CharArray,
  ):
    TvPassportNativePinVerification
}

internal enum class TvPassportNativePinVerification {
  Accepted,
  WrongPin,
  PromptUnavailable,
}

internal enum class TvPassportNativePinOutcome(
  val label:
    String,
) {
  Accepted(
    "accepted",
  ),

  Cancelled(
    "cancelled",
  ),

  WrongPin(
    "wrong_pin",
  ),

  PromptUnavailable(
    "prompt_unavailable",
  ),
}

internal data class TvPassportNativePinPromptReceipt(
  val schema:
    String,

  val outcome:
    String,

  val accepted:
    Boolean,

  val cancelled:
    Boolean,

  val wrongPin:
    Boolean,

  val promptUnavailable:
    Boolean,

  val pinStored:
    Boolean,

  val pinReturnedToWebview:
    Boolean,

  val privateMaterialExported:
    Boolean,

  val recoveryRootPresent:
    Boolean,

  val rootAdminKeyPresent:
    Boolean,

  val rawAuthorizationReturned:
    Boolean,

  val rawCapabilityReturned:
    Boolean,

  val operationallyUnlocked:
    Boolean,

  val proofSigningActivated:
    Boolean,
)

private const val NATIVE_PIN_PROMPT_RECEIPT_SCHEMA =
  "crablink.tv.native-pin-prompt.v1"

private const val MIN_NATIVE_PIN_CHARACTERS =
  4

private const val MAX_NATIVE_PIN_CHARACTERS =
  64
