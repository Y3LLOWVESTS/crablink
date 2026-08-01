package com.rustyonions.crablink.tv

import android.content.Context
import android.os.SystemClock
import android.util.AtomicFile
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Device-local PIN verifier for delegated Passport operational unlock.
 *
 * The verifier persists only an Android-Keystore-sealed random challenge.
 * The PIN contributes only to domain-separated AES-GCM associated data during
 * enrollment and verification. No PIN, PIN hash, PIN digest, derived PIN key,
 * plaintext verifier, capability, authorization, or device key is persisted.
 *
 * This class does not invoke the prompt or operational unlock. Phase 16E3B2
 * will connect the native prompt, this verifier, bounded Keystore unseal, and
 * the Rust operational-unlock runtime.
 */
internal class TvPassportNativePinVerifierStore(
  context:
    Context,

  private val keystoreBridge:
    TvPassportKeystoreBridge,

  private val secureRandom:
    SecureRandom =
    SecureRandom(),

  private val elapsedRealtimeMs:
    () -> Long =
    {
      SystemClock.elapsedRealtime()
    },
) {
  private val directory =
    File(
      context.noBackupFilesDir,
      STORE_DIRECTORY,
    )

  private val baseFile =
    File(
      directory,
      STORE_FILE_NAME,
    )

  private val atomicFile =
    AtomicFile(
      baseFile,
    )

  private var failedAttempts =
    0

  private var lockedUntilElapsedMs =
    0L

  private var pendingVerifiedTicket:
    ByteArray? =
    null

  private var pendingVerifiedTicketExpiresAtElapsedMs =
    0L

  @Synchronized
  fun enroll(
    pin:
      CharArray,
  ):
    TvPassportNativePinVerification {
    if (baseFile.exists()) {
      return TvPassportNativePinVerification
        .PromptUnavailable
    }

    val associatedData =
      try {
        pinAssociatedData(
          pin,
        )
      } catch (
        _:
          IllegalArgumentException,
      ) {
        return TvPassportNativePinVerification
          .WrongPin
      }

    val verifierPlaintext =
      ByteArray(
        VERIFIER_PLAINTEXT_BYTES,
      )

    return try {
      VERIFIER_PLAINTEXT_MAGIC.copyInto(
        verifierPlaintext,
      )

      val randomOffset =
        VERIFIER_PLAINTEXT_MAGIC.size

      val randomMaterial =
        ByteArray(
          VERIFIER_PLAINTEXT_BYTES -
            randomOffset,
        )

      try {
        secureRandom.nextBytes(
          randomMaterial,
        )

        randomMaterial.copyInto(
          verifierPlaintext,
          destinationOffset =
            randomOffset,
        )
      } finally {
        randomMaterial.fill(
          0,
        )
      }

      val sealed =
        keystoreBridge.seal(
          plaintext =
            verifierPlaintext,

          associatedData =
            associatedData,
        )

      val envelope =
        encodeSealedBlob(
          sealed,
        )

      try {
        writeEnvelope(
          envelope,
        )
      } finally {
        envelope.fill(
          0,
        )
      }

      resetAttemptState()
      clearPendingVerifiedTicket()

      TvPassportNativePinVerification
        .Accepted
    } catch (
      _:
        RuntimeException,
    ) {
      TvPassportNativePinVerification
        .PromptUnavailable
    } finally {
      associatedData.fill(
        0,
      )

      verifierPlaintext.fill(
        0,
      )
    }
  }

  @Synchronized
  fun verify(
    pin:
      CharArray,
  ):
    TvPassportNativePinVerification {
    clearPendingVerifiedTicket()

    val now =
      elapsedRealtimeMs()

    if (
      now <
      lockedUntilElapsedMs
    ) {
      return TvPassportNativePinVerification
        .PromptUnavailable
    }

    if (!baseFile.exists()) {
      return TvPassportNativePinVerification
        .PromptUnavailable
    }

    val associatedData =
      try {
        pinAssociatedData(
          pin,
        )
      } catch (
        _:
          IllegalArgumentException,
      ) {
        return recordWrongPin(
          now,
        )
      }

    var envelope:
      ByteArray? =
      null

    var plaintext:
      ByteArray? =
      null

    return try {
      envelope =
        readEnvelope()

      val sealed =
        decodeSealedBlob(
          envelope,
        )

      plaintext =
        keystoreBridge.unseal(
          blob =
            sealed,

          associatedData =
            associatedData,
        )

      if (
        !validVerifierPlaintext(
          plaintext,
        )
      ) {
        return recordWrongPin(
          now,
        )
      }

      resetAttemptState()
      issueVerifiedTicket(
        now,
      )

      TvPassportNativePinVerification
        .Accepted
    } catch (
      error:
        TvPassportKeystoreException,
    ) {
      if (
        error.code ==
        "unseal_failed"
      ) {
        recordWrongPin(
          now,
        )
      } else {
        TvPassportNativePinVerification
          .PromptUnavailable
      }
    } catch (
      _:
        RuntimeException,
    ) {
      TvPassportNativePinVerification
        .PromptUnavailable
    } finally {
      associatedData.fill(
        0,
      )

      envelope?.fill(
        0,
      )

      plaintext?.fill(
        0,
      )
    }
  }

  @Synchronized
  fun consumeVerifiedPinTicketForNative():
    ByteArray {
    val now =
      elapsedRealtimeMs()

    val ticket =
      pendingVerifiedTicket

    pendingVerifiedTicket =
      null

    val expiresAt =
      pendingVerifiedTicketExpiresAtElapsedMs

    pendingVerifiedTicketExpiresAtElapsedMs =
      0L

    if (
      ticket == null ||
      ticket.size !=
        VERIFIED_TICKET_BYTES ||
      expiresAt <=
        now
    ) {
      ticket?.fill(
        0,
      )

      return ByteArray(
        0,
      )
    }

    return ticket
  }

  @Synchronized
  fun inspect():
    TvPassportNativePinVerifierInspection {
    if (!baseFile.exists()) {
      return inspection(
        present =
          false,

        validEnvelope =
          false,
      )
    }

    var envelope:
      ByteArray? =
      null

    return try {
      envelope =
        readEnvelope()

      decodeSealedBlob(
        envelope,
      )

      inspection(
        present =
          true,

        validEnvelope =
          true,
      )
    } catch (
      _:
        RuntimeException,
    ) {
      inspection(
        present =
          true,

        validEnvelope =
          false,
      )
    } finally {
      envelope?.fill(
        0,
      )
    }
  }

  @Synchronized
  fun delete():
    Boolean {
    val existed =
      baseFile.exists()

    atomicFile.delete()

    resetAttemptState()
    clearPendingVerifiedTicket()

    return existed
  }

  private fun issueVerifiedTicket(
    now:
      Long,
  ) {
    clearPendingVerifiedTicket()

    val ticket =
      ByteArray(
        VERIFIED_TICKET_BYTES,
      )

    secureRandom.nextBytes(
      ticket,
    )

    pendingVerifiedTicket =
      ticket

    pendingVerifiedTicketExpiresAtElapsedMs =
      now +
      VERIFIED_TICKET_LIFETIME_MS
  }

  private fun clearPendingVerifiedTicket() {
    pendingVerifiedTicket
      ?.fill(
        0,
      )

    pendingVerifiedTicket =
      null

    pendingVerifiedTicketExpiresAtElapsedMs =
      0L
  }

  private fun recordWrongPin(
    now:
      Long,
  ):
    TvPassportNativePinVerification {
    clearPendingVerifiedTicket()

    failedAttempts +=
      1

    if (
      failedAttempts >=
      MAX_FAILED_ATTEMPTS
    ) {
      failedAttempts =
        0

      lockedUntilElapsedMs =
        now +
        FAILED_ATTEMPT_COOLDOWN_MS

      return TvPassportNativePinVerification
        .PromptUnavailable
    }

    return TvPassportNativePinVerification
      .WrongPin
  }

  private fun resetAttemptState() {
    failedAttempts =
      0

    lockedUntilElapsedMs =
      0L
  }

  private fun pinAssociatedData(
    pin:
      CharArray,
  ):
    ByteArray {
    require(
      pin.size in
        MIN_PIN_CHARACTERS..
          MAX_PIN_CHARACTERS,
    ) {
      "PIN length is outside the bounded policy"
    }

    val pinBytes =
      ByteArray(
        pin.size,
      )

    val digest =
      ByteArray(
        PIN_DIGEST_BYTES,
      )

    try {
      for (
        index in
        pin.indices
      ) {
        val character =
          pin[
            index
          ]

        require(
          character in
            '0'..
              '9',
        ) {
          "PIN must contain decimal digits only"
        }

        pinBytes[
          index
        ] =
          character.code
            .toByte()
      }

      val computed =
        MessageDigest
          .getInstance(
            PIN_DIGEST_ALGORITHM,
          )
          .digest(
            pinBytes,
          )

      require(
        computed.size ==
        PIN_DIGEST_BYTES,
      ) {
        "PIN digest length mismatch"
      }

      computed.copyInto(
        digest,
      )

      computed.fill(
        0,
      )

      val associatedData =
        ByteArray(
          PIN_VERIFIER_ASSOCIATED_DATA_PREFIX.size +
            digest.size,
        )

      PIN_VERIFIER_ASSOCIATED_DATA_PREFIX.copyInto(
        associatedData,
      )

      digest.copyInto(
        associatedData,
        destinationOffset =
          PIN_VERIFIER_ASSOCIATED_DATA_PREFIX.size,
      )

      return associatedData
    } finally {
      pinBytes.fill(
        0,
      )

      digest.fill(
        0,
      )
    }
  }

  private fun validVerifierPlaintext(
    plaintext:
      ByteArray,
  ):
    Boolean =
    plaintext.size ==
      VERIFIER_PLAINTEXT_BYTES &&
      plaintext.copyOfRange(
        fromIndex =
          0,

        toIndex =
          VERIFIER_PLAINTEXT_MAGIC.size,
      )
        .contentEquals(
          VERIFIER_PLAINTEXT_MAGIC,
        )

  private fun ensureDirectory() {
    if (directory.exists()) {
      require(
        directory.isDirectory,
      ) {
        "PIN verifier directory is invalid"
      }

      return
    }

    require(
      directory.mkdirs() ||
        directory.isDirectory,
    ) {
      "PIN verifier directory creation failed"
    }
  }

  private fun writeEnvelope(
    envelope:
      ByteArray,
  ) {
    validateEnvelopeBytes(
      envelope,
    )

    ensureDirectory()

    val output =
      atomicFile.startWrite()

    try {
      output.write(
        envelope,
      )

      output.flush()

      atomicFile.finishWrite(
        output,
      )
    } catch (
      error:
        Exception,
    ) {
      try {
        atomicFile.failWrite(
          output,
        )
      } catch (
        _:
          Exception,
      ) {
        // Preserve the original fail-closed write error.
      }

      throw IllegalStateException(
        "PIN verifier atomic write failed",
        error,
      )
    }
  }

  private fun readEnvelope():
    ByteArray {
    val envelope =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception,
      ) {
        throw IllegalStateException(
          "PIN verifier atomic read failed",
          error,
        )
      }

    validateEnvelopeBytes(
      envelope,
    )

    return envelope
  }

  private fun validateEnvelopeBytes(
    envelope:
      ByteArray,
  ) {
    require(
      envelope.size in
        MIN_SEALED_ENVELOPE_BYTES..
          MAX_SEALED_ENVELOPE_BYTES,
    ) {
      "PIN verifier envelope length is invalid"
    }
  }

  private fun encodeSealedBlob(
    sealed:
      TvPassportSealedBlob,
  ):
    ByteArray {
    val output =
      ByteArrayOutputStream()

    DataOutputStream(
      output,
    )
      .use { data ->
        data.write(
          SEALED_MAGIC,
        )

        data.writeByte(
          sealed.version,
        )

        data.writeByte(
          sealed.iv.size,
        )

        data.writeInt(
          sealed.ciphertext.size,
        )

        data.write(
          sealed.iv,
        )

        data.write(
          sealed.ciphertext,
        )
      }

    return output.toByteArray()
  }

  private fun decodeSealedBlob(
    envelope:
      ByteArray,
  ):
    TvPassportSealedBlob {
    validateEnvelopeBytes(
      envelope,
    )

    DataInputStream(
      ByteArrayInputStream(
        envelope,
      ),
    )
      .use { input ->
        val magic =
          ByteArray(
            SEALED_MAGIC.size,
          )

        input.readFully(
          magic,
        )

        require(
          magic.contentEquals(
            SEALED_MAGIC,
          ),
        ) {
          "PIN verifier envelope magic mismatch"
        }

        val version =
          input.readUnsignedByte()

        val ivLength =
          input.readUnsignedByte()

        val ciphertextLength =
          input.readInt()

        require(
          version ==
          SEALED_BLOB_VERSION,
        ) {
          "PIN verifier envelope version mismatch"
        }

        require(
          ivLength ==
          GCM_IV_BYTES,
        ) {
          "PIN verifier IV length mismatch"
        }

        require(
          ciphertextLength >=
          GCM_TAG_BYTES,
        ) {
          "PIN verifier ciphertext is truncated"
        }

        require(
          input.available() ==
          ivLength +
            ciphertextLength,
        ) {
          "PIN verifier envelope size mismatch"
        }

        val iv =
          ByteArray(
            ivLength,
          )

        val ciphertext =
          ByteArray(
            ciphertextLength,
          )

        input.readFully(
          iv,
        )

        input.readFully(
          ciphertext,
        )

        require(
          input.available() ==
          0,
        ) {
          "PIN verifier envelope has trailing bytes"
        }

        return TvPassportSealedBlob(
          version =
            version,

          iv =
            iv,

          ciphertext =
            ciphertext,
        )
      }
  }

  private fun inspection(
    present:
      Boolean,

    validEnvelope:
      Boolean,
  ):
    TvPassportNativePinVerifierInspection =
    TvPassportNativePinVerifierInspection(
      schema =
        PIN_VERIFIER_INSPECTION_SCHEMA,

      present =
        present,

      validEnvelope =
        validEnvelope,

      atomicFile =
        true,

      noBackupDirectory =
        true,

      androidKeystoreBound =
        true,

      maximumFailedAttempts =
        MAX_FAILED_ATTEMPTS,

      cooldownMilliseconds =
        FAILED_ATTEMPT_COOLDOWN_MS,

      pinStored =
        false,

      pinHashStored =
        false,

      pinDigestStored =
        false,

      privateMaterialExported =
        false,

      webviewSecretReturned =
        false,

      rawAuthorizationReturned =
        false,

      rawCapabilityReturned =
        false,

      recoveryRootPresent =
        false,

      rootAdminKeyPresent =
        false,

      operationallyUnlocked =
        false,

      proofSigningActivated =
        false,
    )
}

internal data class TvPassportNativePinVerifierInspection(
  val schema:
    String,

  val present:
    Boolean,

  val validEnvelope:
    Boolean,

  val atomicFile:
    Boolean,

  val noBackupDirectory:
    Boolean,

  val androidKeystoreBound:
    Boolean,

  val maximumFailedAttempts:
    Int,

  val cooldownMilliseconds:
    Long,

  val pinStored:
    Boolean,

  val pinHashStored:
    Boolean,

  val pinDigestStored:
    Boolean,

  val privateMaterialExported:
    Boolean,

  val webviewSecretReturned:
    Boolean,

  val rawAuthorizationReturned:
    Boolean,

  val rawCapabilityReturned:
    Boolean,

  val recoveryRootPresent:
    Boolean,

  val rootAdminKeyPresent:
    Boolean,

  val operationallyUnlocked:
    Boolean,

  val proofSigningActivated:
    Boolean,
)

private const val STORE_DIRECTORY =
  "native-passport"

private const val STORE_FILE_NAME =
  "tv-pin-verifier.bin"

private const val PIN_VERIFIER_INSPECTION_SCHEMA =
  "crablink.tv.native-pin-verifier-inspection.v1"

private const val PIN_DIGEST_ALGORITHM =
  "SHA-256"

private const val PIN_DIGEST_BYTES =
  32

private const val MIN_PIN_CHARACTERS =
  4

private const val MAX_PIN_CHARACTERS =
  64

private const val MAX_FAILED_ATTEMPTS =
  5

private const val FAILED_ATTEMPT_COOLDOWN_MS =
  30_000L

private const val VERIFIED_TICKET_BYTES =
  32

private const val VERIFIED_TICKET_LIFETIME_MS =
  10_000L

private const val VERIFIER_PLAINTEXT_BYTES =
  32

private const val SEALED_BLOB_VERSION =
  1

private const val GCM_IV_BYTES =
  12

private const val GCM_TAG_BYTES =
  16

private const val SEALED_ENVELOPE_HEADER_BYTES =
  10

private const val MIN_SEALED_ENVELOPE_BYTES =
  SEALED_ENVELOPE_HEADER_BYTES +
    GCM_IV_BYTES +
    GCM_TAG_BYTES

private const val MAX_SEALED_ENVELOPE_BYTES =
  4 * 1024

private val PIN_VERIFIER_ASSOCIATED_DATA_PREFIX =
  "crablink.tv.passport.pin-verifier.v1:"
    .toByteArray(
      Charsets.UTF_8,
    )

private val VERIFIER_PLAINTEXT_MAGIC =
  byteArrayOf(
    0x52,
    0x4f,
    0x50,
    0x56,
    0x45,
    0x52,
    0x31,
    0x00,
  )

private val SEALED_MAGIC =
  byteArrayOf(
    0x43,
    0x54,
    0x56,
    0x31,
  )
