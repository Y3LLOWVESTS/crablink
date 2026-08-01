package com.rustyonions.crablink.tv

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.nio.charset.StandardCharsets
import org.json.JSONObject

/**
 * Direct JNI boundary between Rust device-key generation and Android storage.
 *
 * No method is exposed as a JavaScript interface or public Tauri command.
 */
class TvPassportDeviceMaterialBridge(
  private val keystoreBridge:
    TvPassportKeystoreBridge,

  private val store:
    TvPassportDeviceMaterialStore,

  private val replayStore:
    TvPassportAuthorizationReplayStore,
) {
  external fun provisionAndStore():
    String

  external fun hydrateStoredPublicRecord():
    String

  fun sealDeviceKeyForNative(
    secretSeed:
      ByteArray,

    associatedData:
      ByteArray,
  ):
    ByteArray {
    require(
      secretSeed.size ==
        DEVICE_KEY_BYTES,
    ) {
      "device seed length mismatch"
    }

    require(
      associatedData.contentEquals(
        LOCKED_ASSOCIATED_DATA,
      ),
    ) {
      "device-key associated data mismatch"
    }

    return try {
      val sealed =
        keystoreBridge.seal(
          plaintext =
            secretSeed,

          associatedData =
            associatedData,
        )

      encodeSealedBlob(
        sealed,
      )
    } finally {
      secretSeed.fill(
        0,
      )
    }
  }

  fun storeDeviceMaterialForNative(
    publicRecordJson:
      String,

    sealedEnvelope:
      ByteArray,
  ):
    String =
    inspectionJson(
      store.write(
        publicRecordJson =
          publicRecordJson,

        sealedEnvelope =
          sealedEnvelope,
      ),
    )

  fun readStoredPublicRecordForNative():
    String =
    store.readPublicRecordJson()
      ?: ""

  fun unsealStoredDeviceKeyForNative():
    ByteArray {
    var envelope:
      ByteArray? =
      null

    var sealed:
      TvPassportSealedBlob? =
      null

    val associatedData =
      LOCKED_ASSOCIATED_DATA
        .copyOf()

    return try {
      envelope =
        store.readSealedEnvelopeForNative()
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
            associatedData,
        )

      if (
        plaintext.size !=
        DEVICE_KEY_BYTES
      ) {
        plaintext.fill(
          0,
        )

        throw IllegalStateException(
          "unsealed device-key length mismatch",
        )
      }

      plaintext
    } finally {
      associatedData.fill(
        0,
      )

      envelope?.fill(
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

  fun consumeAuthorizationReplayForNative(
    authorizationId:
      String,

    expiresAtMs:
      Long,

    nowMs:
      Long,
  ):
    String {
    val receipt =
      replayStore.consumeOnce(
        authorizationId =
          authorizationId,

        expiresAtMs =
          expiresAtMs,

        nowMs =
          nowMs,
      )

    return JSONObject()
      .put(
        "schema",
        receipt.schema,
      )
      .put(
        "authorizationId",
        receipt.authorizationId,
      )
      .put(
        "expiresAtMs",
        receipt.expiresAtMs,
      )
      .put(
        "consumed",
        receipt.consumed,
      )
      .put(
        "replayed",
        receipt.replayed,
      )
      .put(
        "durable",
        receipt.durable,
      )
      .put(
        "atomicFile",
        receipt.atomicFile,
      )
      .put(
        "noBackupDirectory",
        receipt.noBackupDirectory,
      )
      .put(
        "authorizationMaterialStored",
        receipt.authorizationMaterialStored,
      )
      .put(
        "capabilityPresent",
        receipt.capabilityPresent,
      )
      .put(
        "sessionPresent",
        receipt.sessionPresent,
      )
      .put(
        "privateMaterialExported",
        receipt.privateMaterialExported,
      )
      .put(
        "webviewSecretReturned",
        receipt.webviewSecretReturned,
      )
      .put(
        "recoveryRootPresent",
        receipt.recoveryRootPresent,
      )
      .put(
        "rootAdminKeyPresent",
        receipt.rootAdminKeyPresent,
      )
      .toString()
  }

  fun inspectStoredDeviceMaterialForNative():
    String =
    inspectionJson(
      store.inspect(),
    )

  fun deleteStoredDeviceMaterialForNative():
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
        "privateMaterialExported",
        false,
      )
      .put(
        "webviewSecretReturned",
        false,
      )
      .toString()
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
      "device-key sealed envelope length invalid"
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
          "device-key sealed envelope magic mismatch"
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
          "device-key sealed envelope version mismatch"
        }

        require(
          ivLength ==
          RUNTIME_GCM_IV_BYTES,
        ) {
          "device-key sealed envelope IV length mismatch"
        }

        require(
          ciphertextLength >=
          RUNTIME_GCM_TAG_BYTES,
        ) {
          "device-key sealed envelope ciphertext truncated"
        }

        require(
          input.available() ==
          ivLength +
            ciphertextLength,
        ) {
          "device-key sealed envelope size mismatch"
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
          "device-key sealed envelope trailing bytes"
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
      TvPassportDeviceMaterialStoreInspection,
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
        "sealedEnvelopeBytes",
        inspection.sealedEnvelopeBytes,
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
      .toString()
}

private const val DEVICE_KEY_BYTES =
  32

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
  4 * 1024

private const val DELETE_RECEIPT_SCHEMA =
  "crablink.tv.passport-device-store-delete.v1"

private val LOCKED_ASSOCIATED_DATA =
  "crablink.tv.passport.device-key.v1"
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
