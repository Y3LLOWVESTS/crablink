package com.rustyonions.crablink.tv

import android.content.Context
import android.util.AtomicFile
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.nio.charset.StandardCharsets
import org.json.JSONObject

/**
 * Private no-backup atomic store for delegated TV device material.
 *
 * The file contains only an Android-Keystore-sealed device seed and a redacted
 * public record. It never stores recovery-root or root-admin material.
 */
class TvPassportDeviceMaterialStore(
  context:
    Context,
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

  @Synchronized
  fun write(
    publicRecordJson:
      String,

    sealedEnvelope:
      ByteArray,
  ):
    TvPassportDeviceMaterialStoreInspection {
    val publicRecordBytes =
      validatePublicRecord(
        publicRecordJson,
      )

    validateSealedEnvelope(
      sealedEnvelope,
    )

    ensureDirectory()

    val payload =
      encodeStorePayload(
        publicRecordBytes =
          publicRecordBytes,

        sealedEnvelope =
          sealedEnvelope,
      )

    val output =
      try {
        atomicFile.startWrite()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "atomic_store_start_failed",

          cause =
            error,
        )
      }

    try {
      output.write(
        payload,
      )

      output.flush()

      atomicFile.finishWrite(
        output,
      )
    } catch (
      error:
        Exception
    ) {
      try {
        atomicFile.failWrite(
          output,
        )
      } catch (
        ignored:
          Exception
      ) {
        // Preserve the original redacted store failure.
      }

      throw TvPassportDeviceMaterialStoreException(
        code =
          "atomic_store_write_failed",

        cause =
          error,
      )
    }

    return inspect()
  }

  @Synchronized
  fun readPublicRecordJson():
    String? {
    if (!baseFile.exists()) {
      return null
    }

    val payload =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "atomic_store_read_failed",

          cause =
            error,
        )
      }

    val reviewed =
      decodeStorePayload(
        payload,
      )

    validatePublicRecordBytes(
      reviewed.publicRecordBytes,
    )

    validateSealedEnvelope(
      reviewed.sealedEnvelope,
    )

    return String(
      reviewed.publicRecordBytes,
      StandardCharsets.UTF_8,
    )
  }

  @Synchronized
  fun readSealedEnvelopeForNative():
    ByteArray? {
    if (
      !baseFile.exists()
    ) {
      return null
    }

    val payload =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception,
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "atomic_store_read_failed",

          cause =
            error,
        )
      }

    return try {
      val reviewed =
        decodeStorePayload(
          payload,
        )

      validatePublicRecordBytes(
        reviewed.publicRecordBytes,
      )

      validateSealedEnvelope(
        reviewed.sealedEnvelope,
      )

      reviewed.sealedEnvelope
        .copyOf()
    } finally {
      payload.fill(
        0,
      )
    }
  }

  @Synchronized
  fun inspect():
    TvPassportDeviceMaterialStoreInspection {
    if (!baseFile.exists()) {
      return TvPassportDeviceMaterialStoreInspection(
        schema =
          STORE_INSPECTION_SCHEMA,

        present =
          false,

        atomicFile =
          true,

        noBackupDirectory =
          true,

        publicRecordBytes =
          0,

        sealedEnvelopeBytes =
          0,

        privateMaterialExported =
          false,

        webviewSecretReturned =
          false,

        recoveryRootPresent =
          false,

        rootAdminKeyPresent =
          false,
      )
    }

    val payload =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "atomic_store_read_failed",

          cause =
            error,
        )
      }

    val reviewed =
      decodeStorePayload(
        payload,
      )

    validatePublicRecordBytes(
      reviewed.publicRecordBytes,
    )

    validateSealedEnvelope(
      reviewed.sealedEnvelope,
    )

    return TvPassportDeviceMaterialStoreInspection(
      schema =
        STORE_INSPECTION_SCHEMA,

      present =
        true,

      atomicFile =
        true,

      noBackupDirectory =
        true,

      publicRecordBytes =
        reviewed.publicRecordBytes.size,

      sealedEnvelopeBytes =
        reviewed.sealedEnvelope.size,

      privateMaterialExported =
        false,

      webviewSecretReturned =
        false,

      recoveryRootPresent =
        false,

      rootAdminKeyPresent =
        false,
    )
  }

  @Synchronized
  fun delete():
    Boolean {
    val existed =
      baseFile.exists()

    atomicFile.delete()

    return existed
  }

  private fun ensureDirectory() {
    if (
      directory.exists()
    ) {
      if (
        !directory.isDirectory
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "atomic_store_directory_invalid",
        )
      }

      return
    }

    if (
      !directory.mkdirs() &&
      !directory.isDirectory
    ) {
      throw TvPassportDeviceMaterialStoreException(
        code =
          "atomic_store_directory_create_failed",
      )
    }
  }

  private fun validatePublicRecord(
    publicRecordJson:
      String,
  ):
    ByteArray {
    require(
      publicRecordJson.isNotBlank(),
    ) {
      "public record must not be blank"
    }

    require(
      publicRecordJson.length <=
        MAX_PUBLIC_RECORD_CHARS,
    ) {
      "public record exceeds the bounded limit"
    }

    val reviewed =
      try {
        JSONObject(
          publicRecordJson,
        )
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDeviceMaterialStoreException(
          code =
            "public_record_invalid",

          cause =
            error,
        )
      }

    require(
      reviewed.optString(
        "schema",
      ) ==
        DEVICE_MATERIAL_SCHEMA,
    ) {
      "public record schema mismatch"
    }

    require(
      reviewed.optString(
        "deviceClass",
      ) ==
        DEVICE_CLASS,
    ) {
      "public record device class mismatch"
    }

    require(
      reviewed.optString(
        "keyAlgorithm",
      ) ==
        DEVICE_KEY_ALGORITHM,
    ) {
      "public record key algorithm mismatch"
    }

    require(
      reviewed.optBoolean(
        "androidJniAdapterAdded",
        false,
      ),
    ) {
      "public record JNI posture mismatch"
    }

    require(
      reviewed.optString(
        "persistenceState",
      ) ==
        PERSISTENCE_STATE,
    ) {
      "public record persistence posture mismatch"
    }

    require(
      !reviewed.optBoolean(
        "privateMaterialExported",
        true,
      ),
    ) {
      "private material export must remain false"
    }

    require(
      !reviewed.optBoolean(
        "webviewSecretReturned",
        true,
      ),
    ) {
      "WebView secret return must remain false"
    }

    require(
      !reviewed.optBoolean(
        "recoveryRootPresent",
        true,
      ),
    ) {
      "recovery root must remain absent"
    }

    require(
      !reviewed.optBoolean(
        "rootAdminKeyPresent",
        true,
      ),
    ) {
      "root-admin key must remain absent"
    }

    for (
      forbidden in
      FORBIDDEN_PUBLIC_RECORD_FIELDS
    ) {
      require(
        !reviewed.has(
          forbidden,
        ),
      ) {
        "public record contains forbidden field"
      }
    }

    return reviewed
      .toString()
      .toByteArray(
        StandardCharsets.UTF_8,
      )
  }

  private fun validatePublicRecordBytes(
    publicRecordBytes:
      ByteArray,
  ) {
    require(
      publicRecordBytes.isNotEmpty(),
    ) {
      "stored public record is empty"
    }

    require(
      publicRecordBytes.size <=
        MAX_PUBLIC_RECORD_BYTES,
    ) {
      "stored public record exceeds the bounded limit"
    }

    validatePublicRecord(
      publicRecordBytes.toString(
        StandardCharsets.UTF_8,
      ),
    )
  }

  private fun validateSealedEnvelope(
    sealedEnvelope:
      ByteArray,
  ) {
    require(
      sealedEnvelope.size >=
        SEALED_ENVELOPE_HEADER_BYTES +
        GCM_TAG_BYTES,
    ) {
      "sealed envelope is truncated"
    }

    require(
      sealedEnvelope.size <=
        MAX_SEALED_ENVELOPE_BYTES,
    ) {
      "sealed envelope exceeds the bounded limit"
    }

    val input =
      DataInputStream(
        ByteArrayInputStream(
          sealedEnvelope,
        ),
      )

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
      "sealed envelope magic mismatch"
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
      "sealed envelope version mismatch"
    }

    require(
      ivLength ==
        GCM_IV_BYTES,
    ) {
      "sealed envelope IV length mismatch"
    }

    require(
      ciphertextLength >=
        GCM_TAG_BYTES,
    ) {
      "sealed envelope ciphertext is truncated"
    }

    require(
      input.available() ==
        ivLength +
        ciphertextLength,
    ) {
      "sealed envelope length mismatch"
    }
  }

  private fun encodeStorePayload(
    publicRecordBytes:
      ByteArray,

    sealedEnvelope:
      ByteArray,
  ):
    ByteArray {
    val output =
      ByteArrayOutputStream()

    DataOutputStream(
      output,
    )
      .use { data ->
        data.write(
          STORE_MAGIC,
        )

        data.writeInt(
          STORE_VERSION,
        )

        data.writeInt(
          publicRecordBytes.size,
        )

        data.writeInt(
          sealedEnvelope.size,
        )

        data.write(
          publicRecordBytes,
        )

        data.write(
          sealedEnvelope,
        )
      }

    return output.toByteArray()
  }

  private fun decodeStorePayload(
    payload:
      ByteArray,
  ):
    StoredPayload {
    require(
      payload.size >=
        STORE_HEADER_BYTES,
    ) {
      "atomic store payload is truncated"
    }

    require(
      payload.size <=
        MAX_STORE_BYTES,
    ) {
      "atomic store payload exceeds the bounded limit"
    }

    val input =
      DataInputStream(
        ByteArrayInputStream(
          payload,
        ),
      )

    val magic =
      ByteArray(
        STORE_MAGIC.size,
      )

    input.readFully(
      magic,
    )

    require(
      magic.contentEquals(
        STORE_MAGIC,
      ),
    ) {
      "atomic store magic mismatch"
    }

    require(
      input.readInt() ==
        STORE_VERSION,
    ) {
      "atomic store version mismatch"
    }

    val publicRecordLength =
      input.readInt()

    val sealedEnvelopeLength =
      input.readInt()

    require(
      publicRecordLength in
        1..MAX_PUBLIC_RECORD_BYTES,
    ) {
      "stored public record length is invalid"
    }

    require(
      sealedEnvelopeLength in
        (
          SEALED_ENVELOPE_HEADER_BYTES +
            GCM_TAG_BYTES
          )..
          MAX_SEALED_ENVELOPE_BYTES,
    ) {
      "stored sealed envelope length is invalid"
    }

    require(
      input.available() ==
        publicRecordLength +
        sealedEnvelopeLength,
    ) {
      "atomic store payload length mismatch"
    }

    val publicRecord =
      ByteArray(
        publicRecordLength,
      )

    input.readFully(
      publicRecord,
    )

    val sealedEnvelope =
      ByteArray(
        sealedEnvelopeLength,
      )

    input.readFully(
      sealedEnvelope,
    )

    require(
      input.available() ==
        0,
    ) {
      "atomic store payload has trailing bytes"
    }

    return StoredPayload(
      publicRecordBytes =
        publicRecord,

      sealedEnvelope =
        sealedEnvelope,
    )
  }
}

data class TvPassportDeviceMaterialStoreInspection(
  val schema:
    String,

  val present:
    Boolean,

  val atomicFile:
    Boolean,

  val noBackupDirectory:
    Boolean,

  val publicRecordBytes:
    Int,

  val sealedEnvelopeBytes:
    Int,

  val privateMaterialExported:
    Boolean,

  val webviewSecretReturned:
    Boolean,

  val recoveryRootPresent:
    Boolean,

  val rootAdminKeyPresent:
    Boolean,
)

class TvPassportDeviceMaterialStoreException(
  val code:
    String,

  cause:
    Throwable? =
    null,
) :
  IllegalStateException(
    code,
    cause,
  )

private data class StoredPayload(
  val publicRecordBytes:
    ByteArray,

  val sealedEnvelope:
    ByteArray,
)

private const val STORE_DIRECTORY =
  "native-passport"

private const val STORE_FILE_NAME =
  "tv-device-material.v1.bin"

private const val STORE_INSPECTION_SCHEMA =
  "crablink.tv.passport-device-store-inspection.v1"

private const val DEVICE_MATERIAL_SCHEMA =
  "crablink.tv.passport-device-material.v1"

private const val DEVICE_CLASS =
  "tv_read_only"

private const val DEVICE_KEY_ALGORITHM =
  "ed25519"

private const val PERSISTENCE_STATE =
  "stored_by_android_atomic_file"

private const val STORE_VERSION =
  1

private const val SEALED_BLOB_VERSION =
  1

private const val GCM_IV_BYTES =
  12

private const val GCM_TAG_BYTES =
  16

private const val SEALED_ENVELOPE_HEADER_BYTES =
  10

private const val STORE_HEADER_BYTES =
  17

private const val MAX_PUBLIC_RECORD_CHARS =
  16 * 1024

private const val MAX_PUBLIC_RECORD_BYTES =
  16 * 1024

private const val MAX_SEALED_ENVELOPE_BYTES =
  128 * 1024

private const val MAX_STORE_BYTES =
  STORE_HEADER_BYTES +
    MAX_PUBLIC_RECORD_BYTES +
    MAX_SEALED_ENVELOPE_BYTES

private val SEALED_MAGIC =
  byteArrayOf(
    0x43,
    0x54,
    0x56,
    0x31,
  )

private val STORE_MAGIC =
  byteArrayOf(
    0x43,
    0x4c,
    0x54,
    0x56,
    0x31,
  )

private val FORBIDDEN_PUBLIC_RECORD_FIELDS =
  arrayOf(
    "signingSeed",
    "privateKey",
    "secretSeed",
    "sealedBlob",
    "ciphertext",
    "iv",
    "recoveryPhrase",
    "recoveryRoot",
    "rootPrivateKey",
    "rootAdminKey",
    "rawCapability",
  )
