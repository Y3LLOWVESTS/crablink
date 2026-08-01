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
 * Private no-backup atomic store for delegated TV authorization material.
 *
 * The store contains:
 * - one bounded public authority record
 * - one Android-Keystore-sealed root-signed device authorization
 * - one Android-Keystore-sealed narrow device-bound capability
 *
 * It never stores plaintext authorization or capability material.
 */
class TvPassportDelegatedAuthorityStore(
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

    sealedAuthorizationEnvelope:
      ByteArray,

    sealedCapabilityEnvelope:
      ByteArray,
  ):
    TvPassportDelegatedAuthorityStoreInspection {
    val publicRecordBytes =
      validatePublicRecord(
        publicRecordJson,
      )

    validateSealedEnvelope(
      sealedAuthorizationEnvelope,
    )

    validateSealedEnvelope(
      sealedCapabilityEnvelope,
    )

    ensureDirectory()

    val payload =
      encodeStorePayload(
        publicRecordBytes =
          publicRecordBytes,

        sealedAuthorizationEnvelope =
          sealedAuthorizationEnvelope,

        sealedCapabilityEnvelope =
          sealedCapabilityEnvelope,
      )

    val output =
      try {
        atomicFile.startWrite()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDelegatedAuthorityStoreException(
          code =
            "delegated_authority_start_write_failed",

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
        // Preserve the original redacted storage error.
      }

      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_write_failed",

        cause =
          error,
      )
    }

    return inspection(
      stored =
        StoredDelegatedAuthorityPayload(
          publicRecordBytes =
            publicRecordBytes,

          sealedAuthorizationEnvelope =
            sealedAuthorizationEnvelope,

          sealedCapabilityEnvelope =
            sealedCapabilityEnvelope,
        ),
    )
  }

  @Synchronized
  fun readPublicRecordForNative():
    String {
    val stored =
      readStoredPayload()

    return String(
      stored.publicRecordBytes,
      StandardCharsets.UTF_8,
    )
  }

  @Synchronized
  fun readSealedCapabilityEnvelopeForNative():
    ByteArray? {
    if (
      !baseFile.exists()
    ) {
      return null
    }

    val stored =
      readStoredPayload()

    return try {
      validateSealedEnvelope(
        stored.sealedCapabilityEnvelope,
      )

      stored.sealedCapabilityEnvelope
        .copyOf()
    } finally {
      stored.publicRecordBytes.fill(
        0,
      )

      stored.sealedAuthorizationEnvelope.fill(
        0,
      )

      stored.sealedCapabilityEnvelope.fill(
        0,
      )
    }
  }

  @Synchronized
  fun inspect():
    TvPassportDelegatedAuthorityStoreInspection {
    if (
      !baseFile.exists()
    ) {
      return inspection(
        stored =
          null,
      )
    }

    return inspection(
      stored =
        readStoredPayload(),
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

  private fun readStoredPayload():
    StoredDelegatedAuthorityPayload {
    val payload =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDelegatedAuthorityStoreException(
          code =
            "delegated_authority_read_failed",

          cause =
            error,
        )
      }

    if (
      payload.isEmpty() ||
      payload.size >
        MAX_STORE_BYTES
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_payload_invalid",
      )
    }

    try {
      DataInputStream(
        ByteArrayInputStream(
          payload,
        ),
      )
        .use { input ->
          val magic =
            ByteArray(
              STORE_MAGIC.size,
            )

          input.readFully(
            magic,
          )

          if (
            !magic.contentEquals(
              STORE_MAGIC,
            )
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_magic_invalid",
            )
          }

          val version =
            input.readInt()

          if (
            version !=
            STORE_VERSION
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_version_invalid",
            )
          }

          val publicRecordLength =
            input.readInt()

          val authorizationLength =
            input.readInt()

          val capabilityLength =
            input.readInt()

          validateStoredLengths(
            publicRecordLength =
              publicRecordLength,

            authorizationLength =
              authorizationLength,

            capabilityLength =
              capabilityLength,
          )

          val publicRecordBytes =
            ByteArray(
              publicRecordLength,
            )

          val sealedAuthorizationEnvelope =
            ByteArray(
              authorizationLength,
            )

          val sealedCapabilityEnvelope =
            ByteArray(
              capabilityLength,
            )

          input.readFully(
            publicRecordBytes,
          )

          input.readFully(
            sealedAuthorizationEnvelope,
          )

          input.readFully(
            sealedCapabilityEnvelope,
          )

          if (
            input.available() !=
            0
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_trailing_bytes",
            )
          }

          val publicRecordJson =
            String(
              publicRecordBytes,
              StandardCharsets.UTF_8,
            )

          validatePublicRecord(
            publicRecordJson,
          )

          validateSealedEnvelope(
            sealedAuthorizationEnvelope,
          )

          validateSealedEnvelope(
            sealedCapabilityEnvelope,
          )

          return StoredDelegatedAuthorityPayload(
            publicRecordBytes =
              publicRecordBytes,

            sealedAuthorizationEnvelope =
              sealedAuthorizationEnvelope,

            sealedCapabilityEnvelope =
              sealedCapabilityEnvelope,
          )
        }
    } catch (
      error:
        TvPassportDelegatedAuthorityStoreException
    ) {
      throw error
    } catch (
      error:
        Exception
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_decode_failed",

        cause =
          error,
      )
    }
  }

  private fun encodeStorePayload(
    publicRecordBytes:
      ByteArray,

    sealedAuthorizationEnvelope:
      ByteArray,

    sealedCapabilityEnvelope:
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
          sealedAuthorizationEnvelope.size,
        )

        data.writeInt(
          sealedCapabilityEnvelope.size,
        )

        data.write(
          publicRecordBytes,
        )

        data.write(
          sealedAuthorizationEnvelope,
        )

        data.write(
          sealedCapabilityEnvelope,
        )
      }

    val payload =
      output.toByteArray()

    if (
      payload.size >
      MAX_STORE_BYTES
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_payload_too_large",
      )
    }

    return payload
  }

  private fun validateStoredLengths(
    publicRecordLength:
      Int,

    authorizationLength:
      Int,

    capabilityLength:
      Int,
  ) {
    if (
      publicRecordLength <=
        0 ||
      publicRecordLength >
        MAX_PUBLIC_RECORD_BYTES ||
      authorizationLength <=
        0 ||
      authorizationLength >
        MAX_SEALED_ENVELOPE_BYTES ||
      capabilityLength <=
        0 ||
      capabilityLength >
        MAX_SEALED_ENVELOPE_BYTES
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_length_invalid",
      )
    }

    val calculated =
      STORE_HEADER_BYTES.toLong() +
        publicRecordLength.toLong() +
        authorizationLength.toLong() +
        capabilityLength.toLong()

    if (
      calculated >
      MAX_STORE_BYTES.toLong()
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_length_overflow",
      )
    }
  }

  private fun validatePublicRecord(
    publicRecordJson:
      String,
  ):
    ByteArray {
    if (
      publicRecordJson.isEmpty() ||
      publicRecordJson.length >
        MAX_PUBLIC_RECORD_CHARS
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_public_record_invalid",
      )
    }

    val bytes =
      publicRecordJson.toByteArray(
        StandardCharsets.UTF_8,
      )

    if (
      bytes.isEmpty() ||
      bytes.size >
        MAX_PUBLIC_RECORD_BYTES
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_public_record_size_invalid",
      )
    }

    val json =
      try {
        JSONObject(
          publicRecordJson,
        )
      } catch (
        error:
          Exception
      ) {
        throw TvPassportDelegatedAuthorityStoreException(
          code =
            "delegated_authority_public_record_json_invalid",

          cause =
            error,
        )
      }

    if (
      json.optString(
        "schema",
      ) !=
      AUTHORITY_RECORD_SCHEMA
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_schema_invalid",
      )
    }

    for (
      field
      in FORBIDDEN_PUBLIC_RECORD_FIELDS
    ) {
      if (
        json.has(
          field,
        )
      ) {
        throw TvPassportDelegatedAuthorityStoreException(
          code =
            "delegated_authority_public_record_secret_field",
        )
      }
    }

    if (
      !json.optBoolean(
        "authorizationMaterialSealed",
        false,
      ) ||
      !json.optBoolean(
        "capabilityMaterialSealed",
        false,
      ) ||
      json.optBoolean(
        "rawAuthorizationReturned",
        true,
      ) ||
      json.optBoolean(
        "rawCapabilityReturned",
        true,
      ) ||
      json.optBoolean(
        "webviewSecretReturned",
        true,
      ) ||
      json.optBoolean(
        "recoveryRootPresent",
        true,
      ) ||
      json.optBoolean(
        "rootAdminKeyPresent",
        true,
      ) ||
      json.optBoolean(
        "sessionPresent",
        true,
      ) ||
      json.optBoolean(
        "operationallyUnlocked",
        true,
      )
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_public_posture_invalid",
      )
    }

    return bytes
  }

  private fun validateSealedEnvelope(
    envelope:
      ByteArray,
  ) {
    if (
      envelope.size <
        MIN_SEALED_ENVELOPE_BYTES ||
      envelope.size >
        MAX_SEALED_ENVELOPE_BYTES
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_sealed_envelope_size_invalid",
      )
    }

    try {
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

          if (
            !magic.contentEquals(
              SEALED_MAGIC,
            )
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_sealed_magic_invalid",
            )
          }

          val version =
            input.readUnsignedByte()

          val ivLength =
            input.readUnsignedByte()

          val ciphertextLength =
            input.readInt()

          if (
            version !=
              SEALED_BLOB_VERSION ||
            ivLength !=
              GCM_IV_BYTES ||
            ciphertextLength <
              GCM_TAG_BYTES ||
            ciphertextLength >
              MAX_SEALED_CIPHERTEXT_BYTES
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_sealed_header_invalid",
            )
          }

          val expectedLength =
            SEALED_ENVELOPE_HEADER_BYTES.toLong() +
              ivLength.toLong() +
              ciphertextLength.toLong()

          if (
            expectedLength !=
            envelope.size.toLong()
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_sealed_length_invalid",
            )
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

          if (
            input.available() !=
            0
          ) {
            throw TvPassportDelegatedAuthorityStoreException(
              code =
                "delegated_authority_sealed_trailing_bytes",
            )
          }
        }
    } catch (
      error:
        TvPassportDelegatedAuthorityStoreException
    ) {
      throw error
    } catch (
      error:
        Exception
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_sealed_decode_failed",

        cause =
          error,
      )
    }
  }

  private fun ensureDirectory() {
    if (
      directory.exists()
    ) {
      if (
        !directory.isDirectory
      ) {
        throw TvPassportDelegatedAuthorityStoreException(
          code =
            "delegated_authority_directory_invalid",
        )
      }

      return
    }

    if (
      !directory.mkdirs() &&
      !directory.isDirectory
    ) {
      throw TvPassportDelegatedAuthorityStoreException(
        code =
          "delegated_authority_directory_create_failed",
      )
    }
  }

  private fun inspection(
    stored:
      StoredDelegatedAuthorityPayload?,
  ):
    TvPassportDelegatedAuthorityStoreInspection =
    TvPassportDelegatedAuthorityStoreInspection(
      schema =
        STORE_INSPECTION_SCHEMA,

      present =
        stored != null,

      atomicFile =
        true,

      noBackupDirectory =
        true,

      publicRecordBytes =
        stored
          ?.publicRecordBytes
          ?.size
          ?: 0,

      sealedAuthorizationEnvelopeBytes =
        stored
          ?.sealedAuthorizationEnvelope
          ?.size
          ?: 0,

      sealedCapabilityEnvelopeBytes =
        stored
          ?.sealedCapabilityEnvelope
          ?.size
          ?: 0,

      authorizationPresent =
        stored != null,

      capabilityPresent =
        stored != null,

      authorizationMaterialSealed =
        stored != null,

      capabilityMaterialSealed =
        stored != null,

      rawAuthorizationReturned =
        false,

      rawCapabilityReturned =
        false,

      privateMaterialExported =
        false,

      webviewSecretReturned =
        false,

      recoveryRootPresent =
        false,

      rootAdminKeyPresent =
        false,

      sessionPresent =
        false,

      operationallyUnlocked =
        false,
    )
}

data class TvPassportDelegatedAuthorityStoreInspection(
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

  val sealedAuthorizationEnvelopeBytes:
    Int,

  val sealedCapabilityEnvelopeBytes:
    Int,

  val authorizationPresent:
    Boolean,

  val capabilityPresent:
    Boolean,

  val authorizationMaterialSealed:
    Boolean,

  val capabilityMaterialSealed:
    Boolean,

  val rawAuthorizationReturned:
    Boolean,

  val rawCapabilityReturned:
    Boolean,

  val privateMaterialExported:
    Boolean,

  val webviewSecretReturned:
    Boolean,

  val recoveryRootPresent:
    Boolean,

  val rootAdminKeyPresent:
    Boolean,

  val sessionPresent:
    Boolean,

  val operationallyUnlocked:
    Boolean,
)

class TvPassportDelegatedAuthorityStoreException(
  val code:
    String,

  cause:
    Throwable? = null,
) :
  IllegalStateException(
    code,
    cause,
  )

private data class StoredDelegatedAuthorityPayload(
  val publicRecordBytes:
    ByteArray,

  val sealedAuthorizationEnvelope:
    ByteArray,

  val sealedCapabilityEnvelope:
    ByteArray,
)

private const val STORE_DIRECTORY =
  "native-passport"

private const val STORE_FILE_NAME =
  "tv-delegated-authority.v1.bin"

private const val STORE_INSPECTION_SCHEMA =
  "crablink.tv.delegated-authority-store-inspection.v1"

private const val AUTHORITY_RECORD_SCHEMA =
  "crablink.tv.delegated-authority-record.v1"

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

private const val MIN_SEALED_ENVELOPE_BYTES =
  SEALED_ENVELOPE_HEADER_BYTES +
    GCM_IV_BYTES +
    GCM_TAG_BYTES

private const val STORE_HEADER_BYTES =
  21

private const val MAX_PUBLIC_RECORD_CHARS =
  16 * 1024

private const val MAX_PUBLIC_RECORD_BYTES =
  16 * 1024

private const val MAX_SEALED_CIPHERTEXT_BYTES =
  128 * 1024

private const val MAX_SEALED_ENVELOPE_BYTES =
  SEALED_ENVELOPE_HEADER_BYTES +
    GCM_IV_BYTES +
    MAX_SEALED_CIPHERTEXT_BYTES

private const val MAX_STORE_BYTES =
  STORE_HEADER_BYTES +
    MAX_PUBLIC_RECORD_BYTES +
    MAX_SEALED_ENVELOPE_BYTES +
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
    0x44,
    0x41,
    0x31,
  )

private val FORBIDDEN_PUBLIC_RECORD_FIELDS =
  arrayOf(
    "rootSignedAuthorization",
    "authorizationSignature",
    "authorizationPayload",
    "rawAuthorization",
    "capabilityToken",
    "capabilitySecret",
    "rawCapability",
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
    "sessionToken",
  )
