package com.rustyonions.crablink.tv

/**
 * Coordinates explicit Android-native PIN enrollment, verification, and JNI
 * operational unlock without returning PINs or operational material.
 *
 * This class owns no automatic startup behavior. A later reviewed native
 * request surface must explicitly invoke its enrollment/unlock entry point.
 */
internal class TvPassportNativePinCoordinator(
  private val prompt:
    TvPassportNativePinPrompt,

  private val verifierStore:
    TvPassportNativePinVerifierStore,

  private val operationalUnlockBridge:
    TvPassportOperationalUnlockBridge,

  private val wallClockMs:
    () -> Long =
    {
      System.currentTimeMillis()
    },
) {
  private var requestActive =
    false

  fun requestExplicitEnrollmentOrUnlock() {
    if (!beginRequest()) {
      return
    }

    val inspection =
      try {
        verifierStore.inspect()
      } catch (
        _:
          RuntimeException,
      ) {
        failClosedAndFinish()
        return
      }

    when {
      !inspection.present ->
        requestExplicitEnrollment()

      inspection.validEnvelope ->
        requestExplicitUnlock()

      else ->
        failClosedAndFinish()
    }
  }

  fun requestExplicitLock() {
    finishRequest()
    failClosedOperationalRuntime()
  }

  fun failClosedOnLifecycleBoundary() {
    finishRequest()
    failClosedOperationalRuntime()
  }

  private fun requestExplicitEnrollment() {
    var enrollmentPin:
      CharArray? =
      null

    try {
      prompt.requestEnrollmentPin(
        verifier =
          TvPassportNativePinVerifier {
            pin ->
            enrollmentPin
              ?.fill(
                '\u0000',
              )

            enrollmentPin =
              pin.copyOf()

            TvPassportNativePinVerification
              .Accepted
          },

        onResult =
          {
            firstReceipt ->
            if (!firstReceipt.accepted) {
              enrollmentPin
                ?.fill(
                  '\u0000',
                )

              enrollmentPin =
                null

              finishRequest()
              return@requestEnrollmentPin
            }

            try {
              prompt.requestEnrollmentConfirmation(
                verifier =
                  TvPassportNativePinVerifier {
                    confirmation ->
                    val firstPin =
                      enrollmentPin

                    when {
                      firstPin == null ->
                        TvPassportNativePinVerification
                          .PromptUnavailable

                      !constantTimePinEquals(
                        firstPin,
                        confirmation,
                      ) ->
                        TvPassportNativePinVerification
                          .WrongPin

                      else ->
                        verifierStore.enroll(
                          confirmation,
                        )
                    }
                  },

                onResult =
                  {
                    enrollmentPin
                      ?.fill(
                        '\u0000',
                      )

                    enrollmentPin =
                      null

                    /*
                     * Enrollment success does not automatically unlock.
                     * The user must make another explicit unlock request.
                     */
                    finishRequest()
                  },
              )
            } catch (
              _:
                RuntimeException,
            ) {
              enrollmentPin
                ?.fill(
                  '\u0000',
                )

              enrollmentPin =
                null

              failClosedAndFinish()
            }
          },
      )
    } catch (
      _:
        RuntimeException,
    ) {
      enrollmentPin
        ?.fill(
          '\u0000',
        )

      enrollmentPin =
        null

      failClosedAndFinish()
    }
  }

  private fun requestExplicitUnlock() {
    try {
      prompt.requestUnlock(
        verifier =
          TvPassportNativePinVerifier {
            pin ->
            verifierStore.verify(
              pin,
            )
          },

        onResult =
          {
            receipt ->
            try {
              if (receipt.accepted) {
                val nowMs =
                  wallClockMs()

                if (nowMs > 0L) {
                  operationalUnlockBridge
                    .unlockAfterVerifiedNativePin(
                      nowMs,
                    )
                } else {
                  failClosedOperationalRuntime()
                }
              }
            } catch (
              _:
                RuntimeException,
            ) {
              failClosedOperationalRuntime()
            } finally {
              finishRequest()
            }
          },
      )
    } catch (
      _:
        RuntimeException,
    ) {
      failClosedAndFinish()
    }
  }

  @Synchronized
  private fun beginRequest():
    Boolean {
    if (requestActive) {
      return false
    }

    requestActive =
      true

    return true
  }

  @Synchronized
  private fun finishRequest() {
    requestActive =
      false
  }

  private fun failClosedAndFinish() {
    failClosedOperationalRuntime()
    finishRequest()
  }

  private fun failClosedOperationalRuntime() {
    try {
      operationalUnlockBridge
        .failClosedOperationalRuntime()
    } catch (
      _:
        RuntimeException,
    ) {
      /*
       * The JNI export itself contains panic and pending-exception handling.
       * No secret or unredacted exception detail is surfaced here.
       */
    }
  }

  private fun constantTimePinEquals(
    first:
      CharArray,

    second:
      CharArray,
  ):
    Boolean {
    val maximumLength =
      maxOf(
        first.size,
        second.size,
      )

    var difference =
      first.size xor
        second.size

    for (
      index in
      0 until maximumLength
    ) {
      val firstValue =
        if (
          index <
          first.size
        ) {
          first[
            index
          ].code
        } else {
          0
        }

      val secondValue =
        if (
          index <
          second.size
        ) {
          second[
            index
          ].code
        } else {
          0
        }

      difference =
        difference or
          (
            firstValue xor
              secondValue
          )
    }

    return difference ==
      0
  }
}
