package com.rustyonions.crablink.tv

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.json.JSONObject

/**
 * Native-only bridge for sealing and storing reviewed delegated TV authority.
 *
 * The caller must complete root-authorization, binding, scope, expiry, and
 * replay review before invoking the store method. This bridge does not issue
 * capabilities or claim backend acceptance.
 */
class TvPassportDelegatedAuthorityBridge(
  private val keystoreBridge:
    TvPassportKeystoreBridge,

  private val store:
    TvPassportDelegatedAuthorityStore,
) {
  external fun hydrateStoredAuthorityForNative(
    nowMs: Long,
  ): String

  fun hydrateStoredDelegatedAuthorityOnStartupForNative(): String =
    hydrateStoredAuthorityForNative(
      System.currentTimeMillis(),
    )

  fun storeReviewedDelegatedAuthorityForNative(
    publicRecordJson:
      String,

    rootSignedAuthorization:
      ByteArray,

    narrowCapability:
      ByteArray,
  ):
    String {
    require(
      rootSignedAuthorization.isNotEmpty() &&
      rootSignedAuthorization.size <=
        MAX_AUTHORIZATION_PLAINTEXT_BYTES,
    ) {
      "authorization material size invalid"
    }

    require(
      narrowCapability.isNotEmpty() &&
      narrowCapability.size <=
        MAX_CAPABILITY_PLAINTEXT_BYTES,
    ) {
      "capability material size invalid"
    }

    val publicRecordBytes =
      publicRecordJson.toByteArray(
        StandardCharsets.UTF_8,
      )

    val publicRecordBinding =
      MessageDigest
        .getInstance(
          "SHA-256",
        )
        .digest(
          publicRecordBytes,
        )

    val authorizationAssociatedData =
      associatedData(
        prefix =
          AUTHORIZATION_ASSOCIATED_DATA_PREFIX,

        publicRecordBinding =
          publicRecordBinding,
      )

    val capabilityAssociatedData =
      associatedData(
        prefix =
          CAPABILITY_ASSOCIATED_DATA_PREFIX,

        publicRecordBinding =
          publicRecordBinding,
      )

    try {
      val sealedAuthorization =
        keystoreBridge.seal(
          plaintext =
            rootSignedAuthorization,

          associatedData =
            authorizationAssociatedData,
        )

      val sealedCapability =
        keystoreBridge.seal(
          plaintext =
            narrowCapability,

          associatedData =
            capabilityAssociatedData,
        )

      return inspectionJson(
        store.write(
          publicRecordJson =
            publicRecordJson,

          sealedAuthorizationEnvelope =
            encodeSealedBlob(
              sealedAuthorization,
            ),

          sealedCapabilityEnvelope =
            encodeSealedBlob(
              sealedCapability,
            ),
        ),
      )
    } finally {
      rootSignedAuthorization.fill(
        0,
      )

      narrowCapability.fill(
        0,
      )

      publicRecordBytes.fill(
        0,
      )

      publicRecordBinding.fill(
        0,
      )

      authorizationAssociatedData.fill(
        0,
      )

      capabilityAssociatedData.fill(
        0,
      )
    }
  }

  fun readStoredDelegatedAuthorityPublicRecordForNative():
    String =
    store.readPublicRecordForNative()

  fun unsealStoredNarrowCapabilityForNative():
    ByteArray {
    var publicRecordBytes:
      ByteArray? =
      null

    var publicRecordBinding:
      ByteArray? =
      null

    var capabilityAssociatedData:
      ByteArray? =
      null

    var envelope:
      ByteArray? =
      null

    var sealed:
      TvPassportSealedBlob? =
      null

    return try {
      val publicRecord =
        store.readPublicRecordForNative()

      publicRecordBytes =
        publicRecord.toByteArray(
          StandardCharsets.UTF_8,
        )

      publicRecordBinding =
        MessageDigest
          .getInstance(
            "SHA-256",
          )
          .digest(
            publicRecordBytes,
          )

      capabilityAssociatedData =
        associatedData(
          prefix =
            CAPABILITY_ASSOCIATED_DATA_PREFIX,

          publicRecordBinding =
            publicRecordBinding,
        )

      envelope =
        store.readSealedCapabilityEnvelopeForNative()
          ?: return ByteArray(
            0,
          )

      sealed =
        decodeSealedBlob(
          envelope,
        )

      val plaintext =
        keystoreBridge.unseal(
          blob =
            sealed,

          associatedData =
            capabilityAssociatedData,
        )

      if (
        plaintext.isEmpty() ||
        plaintext.size >
          MAX_CAPABILITY_PLAINTEXT_BYTES
      ) {
        plaintext.fill(
          0,
        )

        throw IllegalStateException(
          "unsealed narrow capability length invalid",
        )
      }

      plaintext
    } finally {
      publicRecordBytes
        ?.fill(
          0,
        )

      publicRecordBinding
        ?.fill(
          0,
        )

      capabilityAssociatedData
        ?.fill(
          0,
        )

      envelope
        ?.fill(
          0,
        )

      sealed
        ?.iv
        ?.fill(
          0,
        )

      sealed
        ?.ciphertext
        ?.fill(
          0,
        )
    }
  }

  fun inspectStoredDelegatedAuthorityForNative():
    String =
    inspectionJson(
      store.inspect(),
    )

  fun deleteStoredDelegatedAuthorityForNative():
    String {
    val existed =
      store.delete()

    return JSONObject()
      .put(
        "schema",
        DELETE_RECEIPT_SCHEMA,
      )
      .put(
        "deleted",
        existed,
      )
      .put(
        "rawAuthorizationReturned",
        false,
      )
      .put(
        "rawCapabilityReturned",
        false,
      )
      .put(
        "privateMaterialExported",
        false,
      )
      .put(
        "webviewSecretReturned",
        false,
      )
      .put(
        "recoveryRootPresent",
        false,
      )
      .put(
        "rootAdminKeyPresent",
        false,
      )
      .put(
        "sessionPresent",
        false,
      )
      .put(
        "operationallyUnlocked",
        false,
      )
      .toString()
  }

  private fun associatedData(
    prefix:
      ByteArray,

    publicRecordBinding:
      ByteArray,
  ):
    ByteArray {
    val output =
      ByteArrayOutputStream()

    output.write(
      prefix,
    )

    output.write(
      publicRecordBinding,
    )

    return output.toByteArray()
  }

  private fun decodeSealedBlob(
    envelope:
      ByteArray,
  ):
    TvPassportSealedBlob {
    require(
      envelope.size in
        MIN_RUNTIME_SEALED_ENVELOPE_BYTES..
          MAX_RUNTIME_SEALED_ENVELOPE_BYTES,
    ) {
      "capability sealed envelope length invalid"
    }

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
          "capability sealed envelope magic mismatch"
        }

        val version =
          input.readUnsignedByte()

        val ivLength =
          input.readUnsignedByte()

        val ciphertextLength =
          input.readInt()

        require(
          version ==
          RUNTIME_SEALED_BLOB_VERSION,
        ) {
          "capability sealed envelope version mismatch"
        }

        require(
          ivLength ==
          RUNTIME_GCM_IV_BYTES,
        ) {
          "capability sealed envelope IV length mismatch"
        }

        require(
          ciphertextLength >=
          RUNTIME_GCM_TAG_BYTES,
        ) {
          "capability sealed envelope ciphertext truncated"
        }

        require(
          input.available() ==
          ivLength +
            ciphertextLength,
        ) {
          "capability sealed envelope size mismatch"
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
          "capability sealed envelope trailing bytes"
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

  private fun inspectionJson(
    inspection:
      TvPassportDelegatedAuthorityStoreInspection,
  ):
    String =
    JSONObject()
      .put(
        "schema",
        inspection.schema,
      )
      .put(
        "present",
        inspection.present,
      )
      .put(
        "atomicFile",
        inspection.atomicFile,
      )
      .put(
        "noBackupDirectory",
        inspection.noBackupDirectory,
      )
      .put(
        "publicRecordBytes",
        inspection.publicRecordBytes,
      )
      .put(
        "sealedAuthorizationEnvelopeBytes",
        inspection.sealedAuthorizationEnvelopeBytes,
      )
      .put(
        "sealedCapabilityEnvelopeBytes",
        inspection.sealedCapabilityEnvelopeBytes,
      )
      .put(
        "authorizationPresent",
        inspection.authorizationPresent,
      )
      .put(
        "capabilityPresent",
        inspection.capabilityPresent,
      )
      .put(
        "authorizationMaterialSealed",
        inspection.authorizationMaterialSealed,
      )
      .put(
        "capabilityMaterialSealed",
        inspection.capabilityMaterialSealed,
      )
      .put(
        "rawAuthorizationReturned",
        inspection.rawAuthorizationReturned,
      )
      .put(
        "rawCapabilityReturned",
        inspection.rawCapabilityReturned,
      )
      .put(
        "privateMaterialExported",
        inspection.privateMaterialExported,
      )
      .put(
        "webviewSecretReturned",
        inspection.webviewSecretReturned,
      )
      .put(
        "recoveryRootPresent",
        inspection.recoveryRootPresent,
      )
      .put(
        "rootAdminKeyPresent",
        inspection.rootAdminKeyPresent,
      )
      .put(
        "sessionPresent",
        inspection.sessionPresent,
      )
      .put(
        "operationallyUnlocked",
        inspection.operationallyUnlocked,
      )
      .toString()
}

private const val MAX_AUTHORIZATION_PLAINTEXT_BYTES =
  64 * 1024

private const val MAX_CAPABILITY_PLAINTEXT_BYTES =
  64 * 1024

private const val RUNTIME_SEALED_BLOB_VERSION =
  1

private const val RUNTIME_GCM_IV_BYTES =
  12

private const val RUNTIME_GCM_TAG_BYTES =
  16

private const val RUNTIME_SEALED_ENVELOPE_HEADER_BYTES =
  10

private const val MIN_RUNTIME_SEALED_ENVELOPE_BYTES =
  RUNTIME_SEALED_ENVELOPE_HEADER_BYTES +
    RUNTIME_GCM_IV_BYTES +
    RUNTIME_GCM_TAG_BYTES

private const val MAX_RUNTIME_SEALED_ENVELOPE_BYTES =
  128 * 1024

private const val DELETE_RECEIPT_SCHEMA =
  "crablink.tv.delegated-authority-store-delete.v1"

private val AUTHORIZATION_ASSOCIATED_DATA_PREFIX =
  "crablink.tv.passport.authorization.v1:"
    .toByteArray(
      StandardCharsets.UTF_8,
    )

private val CAPABILITY_ASSOCIATED_DATA_PREFIX =
  "crablink.tv.passport.capability.v1:"
    .toByteArray(
      StandardCharsets.UTF_8,
    )

private val SEALED_MAGIC =
  byteArrayOf(
    0x43,
    0x54,
    0x56,
    0x31,
  )
