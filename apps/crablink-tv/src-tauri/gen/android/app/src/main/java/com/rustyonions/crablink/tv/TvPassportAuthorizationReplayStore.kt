package com.rustyonions.crablink.tv

import android.content.Context
import android.util.AtomicFile
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.nio.charset.StandardCharsets

/**
 * Durable consume-once store for reviewed TV authorization IDs.
 *
 * This file stores only lowercase BLAKE3 authorization IDs and expirations.
 * It never stores the signed authorization, Passport keys, device keys,
 * capabilities, sessions, recovery material, or wallet authority.
 */
class TvPassportAuthorizationReplayStore(
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
  fun consumeOnce(
    authorizationId:
      String,

    expiresAtMs:
      Long,

    nowMs:
      Long,
  ):
    TvPassportAuthorizationReplayReceipt {
    validateRequest(
      authorizationId =
        authorizationId,

      expiresAtMs =
        expiresAtMs,

      nowMs =
        nowMs,
    )

    val entries =
      readEntries()

    var pruned =
      false

    val iterator =
      entries
        .entries
        .iterator()

    while (
      iterator.hasNext()
    ) {
      val entry =
        iterator.next()

      if (
        entry.value <=
        nowMs
      ) {
        iterator.remove()
        pruned = true
      }
    }

    if (
      entries.containsKey(
        authorizationId,
      )
    ) {
      if (pruned) {
        writeEntries(
          entries,
        )
      }

      return receipt(
        authorizationId =
          authorizationId,

        expiresAtMs =
          expiresAtMs,

        consumed =
          false,

        replayed =
          true,
      )
    }

    if (
      entries.size >=
      MAX_REPLAY_ENTRIES
    ) {
      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_store_full",
      )
    }

    entries[
      authorizationId
    ] =
      expiresAtMs

    writeEntries(
      entries,
    )

    return receipt(
      authorizationId =
        authorizationId,

      expiresAtMs =
        expiresAtMs,

      consumed =
        true,

      replayed =
        false,
    )
  }

  private fun validateRequest(
    authorizationId:
      String,

    expiresAtMs:
      Long,

    nowMs:
      Long,
  ) {
    require(
      authorizationId.length ==
        AUTHORIZATION_ID_CHARS,
    ) {
      "authorization ID length mismatch"
    }

    require(
      authorizationId.all { character ->
        character in '0'..'9' ||
          character in 'a'..'f'
      },
    ) {
      "authorization ID must be lowercase hexadecimal"
    }

    require(
      nowMs > 0,
    ) {
      "authorization replay clock is invalid"
    }

    require(
      expiresAtMs >
        nowMs,
    ) {
      "expired authorization cannot be consumed"
    }
  }

  private fun readEntries():
    LinkedHashMap<String, Long> {
    if (
      !baseFile.exists()
    ) {
      return linkedMapOf()
    }

    val payload =
      try {
        atomicFile.readFully()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportAuthorizationReplayStoreException(
          code =
            "authorization_replay_read_failed",

          cause =
            error,
        )
      }

    if (
      payload.isEmpty() ||
      payload.size >
        MAX_STORE_BYTES
    ) {
      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_payload_invalid",
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
            throw TvPassportAuthorizationReplayStoreException(
              code =
                "authorization_replay_magic_invalid",
            )
          }

          val version =
            input.readInt()

          if (
            version !=
            STORE_VERSION
          ) {
            throw TvPassportAuthorizationReplayStoreException(
              code =
                "authorization_replay_version_invalid",
            )
          }

          val count =
            input.readInt()

          if (
            count < 0 ||
            count >
              MAX_REPLAY_ENTRIES
          ) {
            throw TvPassportAuthorizationReplayStoreException(
              code =
                "authorization_replay_count_invalid",
            )
          }

          val entries =
            linkedMapOf<String, Long>()

          repeat(
            count,
          ) {
            val idBytes =
              ByteArray(
                AUTHORIZATION_ID_CHARS,
              )

            input.readFully(
              idBytes,
            )

            val authorizationId =
              String(
                idBytes,
                StandardCharsets.US_ASCII,
              )

            val expiresAtMs =
              input.readLong()

            validateDecodedEntry(
              authorizationId =
                authorizationId,

              expiresAtMs =
                expiresAtMs,
            )

            if (
              entries.put(
                authorizationId,
                expiresAtMs,
              ) != null
            ) {
              throw TvPassportAuthorizationReplayStoreException(
                code =
                  "authorization_replay_duplicate_entry",
              )
            }
          }

          if (
            input.available() !=
            0
          ) {
            throw TvPassportAuthorizationReplayStoreException(
              code =
                "authorization_replay_trailing_bytes",
            )
          }

          return entries
        }
    } catch (
      error:
        TvPassportAuthorizationReplayStoreException
    ) {
      throw error
    } catch (
      error:
        Exception
    ) {
      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_decode_failed",

        cause =
          error,
      )
    }
  }

  private fun validateDecodedEntry(
    authorizationId:
      String,

    expiresAtMs:
      Long,
  ) {
    require(
      authorizationId.length ==
        AUTHORIZATION_ID_CHARS &&
      authorizationId.all { character ->
        character in '0'..'9' ||
          character in 'a'..'f'
      },
    ) {
      "stored authorization ID is invalid"
    }

    require(
      expiresAtMs > 0,
    ) {
      "stored authorization expiry is invalid"
    }
  }

  private fun writeEntries(
    entries:
      LinkedHashMap<String, Long>,
  ) {
    ensureDirectory()

    val payload =
      encodeEntries(
        entries,
      )

    val output =
      try {
        atomicFile.startWrite()
      } catch (
        error:
          Exception
      ) {
        throw TvPassportAuthorizationReplayStoreException(
          code =
            "authorization_replay_start_write_failed",

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
        // Preserve the original redacted store error.
      }

      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_write_failed",

        cause =
          error,
      )
    }
  }

  private fun encodeEntries(
    entries:
      LinkedHashMap<String, Long>,
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
          entries.size,
        )

        for (
          (
            authorizationId,
            expiresAtMs,
          )
          in entries
        ) {
          val idBytes =
            authorizationId
              .toByteArray(
                StandardCharsets.US_ASCII,
              )

          if (
            idBytes.size !=
            AUTHORIZATION_ID_CHARS
          ) {
            throw TvPassportAuthorizationReplayStoreException(
              code =
                "authorization_replay_encode_id_invalid",
            )
          }

          data.write(
            idBytes,
          )

          data.writeLong(
            expiresAtMs,
          )
        }
      }

    val payload =
      output.toByteArray()

    if (
      payload.size >
      MAX_STORE_BYTES
    ) {
      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_payload_too_large",
      )
    }

    return payload
  }

  private fun ensureDirectory() {
    if (
      directory.exists()
    ) {
      if (
        !directory.isDirectory
      ) {
        throw TvPassportAuthorizationReplayStoreException(
          code =
            "authorization_replay_directory_invalid",
        )
      }

      return
    }

    if (
      !directory.mkdirs() &&
      !directory.isDirectory
    ) {
      throw TvPassportAuthorizationReplayStoreException(
        code =
          "authorization_replay_directory_create_failed",
      )
    }
  }

  private fun receipt(
    authorizationId:
      String,

    expiresAtMs:
      Long,

    consumed:
      Boolean,

    replayed:
      Boolean,
  ):
    TvPassportAuthorizationReplayReceipt =
    TvPassportAuthorizationReplayReceipt(
      schema =
        REPLAY_RECEIPT_SCHEMA,

      authorizationId =
        authorizationId,

      expiresAtMs =
        expiresAtMs,

      consumed =
        consumed,

      replayed =
        replayed,

      durable =
        true,

      atomicFile =
        true,

      noBackupDirectory =
        true,

      authorizationMaterialStored =
        false,

      capabilityPresent =
        false,

      sessionPresent =
        false,

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

data class TvPassportAuthorizationReplayReceipt(
  val schema:
    String,

  val authorizationId:
    String,

  val expiresAtMs:
    Long,

  val consumed:
    Boolean,

  val replayed:
    Boolean,

  val durable:
    Boolean,

  val atomicFile:
    Boolean,

  val noBackupDirectory:
    Boolean,

  val authorizationMaterialStored:
    Boolean,

  val capabilityPresent:
    Boolean,

  val sessionPresent:
    Boolean,

  val privateMaterialExported:
    Boolean,

  val webviewSecretReturned:
    Boolean,

  val recoveryRootPresent:
    Boolean,

  val rootAdminKeyPresent:
    Boolean,
)

class TvPassportAuthorizationReplayStoreException(
  val code:
    String,

  cause:
    Throwable? = null,
) :
  IllegalStateException(
    code,
    cause,
  )

private const val STORE_DIRECTORY =
  "native-passport"

private const val STORE_FILE_NAME =
  "tv-authorization-replay.v1.bin"

private const val REPLAY_RECEIPT_SCHEMA =
  "crablink.tv.passport-authorization-replay.v1"

private const val STORE_VERSION =
  1

private const val AUTHORIZATION_ID_CHARS =
  64

private const val MAX_REPLAY_ENTRIES =
  256

private const val MAX_STORE_BYTES =
  32 * 1_024

private val STORE_MAGIC =
  byteArrayOf(
    0x43,
    0x54,
    0x52,
    0x31,
  )
