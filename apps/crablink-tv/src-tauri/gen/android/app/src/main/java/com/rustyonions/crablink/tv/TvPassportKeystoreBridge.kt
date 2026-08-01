package com.rustyonions.crablink.tv

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * App-local Android Keystore bridge for sealing delegated TV device material.
 *
 * The AES sealing key is generated inside Android Keystore and cannot be
 * exported. This bridge does not generate the Passport device identity key,
 * expose a JavaScript interface, issue capabilities, or perform pairing.
 */
class TvPassportKeystoreBridge(
  private val alias:
    String =
    TV_PASSPORT_DEVICE_SEALER_ALIAS,
) {
  init {
    require(
      alias.isNotBlank(),
    ) {
      "alias must not be blank"
    }

    require(
      alias.length <=
        MAX_ALIAS_CHARS,
    ) {
      "alias exceeds the bounded length"
    }
  }

  fun inspect():
    TvPassportKeystoreInspection {
    val present =
      try {
        openKeyStore()
          .containsAlias(
            alias,
          )
      } catch (
        error:
          TvPassportKeystoreException
      ) {
        throw error
      } catch (
        error:
          GeneralSecurityException
      ) {
        throw TvPassportKeystoreException(
          code =
            "inspection_failed",

          cause =
            error,
        )
      }

    return TvPassportKeystoreInspection(
      provider =
        ANDROID_KEYSTORE,

      alias =
        alias,

      keyPresent =
        present,

      deviceCompartmentOnly =
        true,

      recoveryRootStorageAllowed =
        false,

      rootAdminKeyStorageAllowed =
        false,

      secretExportAllowed =
        false,

      webviewSecretReturnAllowed =
        false,
    )
  }

  fun hasKey():
    Boolean =
    inspect()
      .keyPresent

  fun seal(
    plaintext:
      ByteArray,

    associatedData:
      ByteArray,
  ):
    TvPassportSealedBlob {
    require(
      plaintext.isNotEmpty(),
    ) {
      "plaintext must not be empty"
    }

    require(
      plaintext.size <=
        MAX_PLAINTEXT_BYTES,
    ) {
      "plaintext exceeds the bounded limit"
    }

    validateAssociatedData(
      associatedData,
    )

    return try {
      val cipher =
        Cipher.getInstance(
          AES_GCM_TRANSFORMATION,
        )

      cipher.init(
        Cipher.ENCRYPT_MODE,
        getOrCreateKey(),
      )

      cipher.updateAAD(
        associatedData,
      )

      TvPassportSealedBlob(
        version =
          SEALED_BLOB_VERSION,

        iv =
          cipher.iv.copyOf(),

        ciphertext =
          cipher.doFinal(
            plaintext,
          ),
      )
    } catch (
      error:
        TvPassportKeystoreException
    ) {
      throw error
    } catch (
      error:
        GeneralSecurityException
    ) {
      throw TvPassportKeystoreException(
        code =
          "seal_failed",

        cause =
          error,
      )
    }
  }

  fun unseal(
    blob:
      TvPassportSealedBlob,

    associatedData:
      ByteArray,
  ):
    ByteArray {
    require(
      blob.version ==
        SEALED_BLOB_VERSION,
    ) {
      "unsupported sealed-blob version"
    }

    validateAssociatedData(
      associatedData,
    )

    return try {
      val cipher =
        Cipher.getInstance(
          AES_GCM_TRANSFORMATION,
        )

      cipher.init(
        Cipher.DECRYPT_MODE,

        requireExistingKey(),

        GCMParameterSpec(
          GCM_TAG_BITS,
          blob.iv,
        ),
      )

      cipher.updateAAD(
        associatedData,
      )

      cipher.doFinal(
        blob.ciphertext,
      )
    } catch (
      error:
        TvPassportKeystoreException
    ) {
      throw error
    } catch (
      error:
        GeneralSecurityException
    ) {
      throw TvPassportKeystoreException(
        code =
          "unseal_failed",

        cause =
          error,
      )
    }
  }

  fun deleteKey():
    Boolean =
    try {
      val store =
        openKeyStore()

      val existed =
        store.containsAlias(
          alias,
        )

      if (existed) {
        store.deleteEntry(
          alias,
        )
      }

      existed
    } catch (
      error:
        TvPassportKeystoreException
    ) {
      throw error
    } catch (
      error:
        GeneralSecurityException
    ) {
      throw TvPassportKeystoreException(
        code =
          "delete_failed",

        cause =
          error,
      )
    }

  @Synchronized
  private fun getOrCreateKey():
    SecretKey {
    val existing =
      existingKey()

    if (existing != null) {
      return existing
    }

    return try {
      val generator =
        KeyGenerator.getInstance(
          KeyProperties.KEY_ALGORITHM_AES,
          ANDROID_KEYSTORE,
        )

      val specification =
        KeyGenParameterSpec.Builder(
          alias,

          KeyProperties.PURPOSE_ENCRYPT or
            KeyProperties.PURPOSE_DECRYPT,
        )
          .setBlockModes(
            KeyProperties.BLOCK_MODE_GCM,
          )
          .setEncryptionPaddings(
            KeyProperties.ENCRYPTION_PADDING_NONE,
          )
          .setKeySize(
            AES_KEY_BITS,
          )
          .setRandomizedEncryptionRequired(
            true,
          )
          .build()

      generator.init(
        specification,
      )

      generator.generateKey()
    } catch (
      error:
        GeneralSecurityException
    ) {
      throw TvPassportKeystoreException(
        code =
          "key_generation_failed",

        cause =
          error,
      )
    }
  }

  private fun existingKey():
    SecretKey? {
    val entry =
      try {
        openKeyStore()
          .getEntry(
            alias,
            null,
          )
      } catch (
        error:
          TvPassportKeystoreException
      ) {
        throw error
      } catch (
        error:
          GeneralSecurityException
      ) {
        throw TvPassportKeystoreException(
          code =
            "key_read_failed",

          cause =
            error,
        )
      }

    return (
      entry as?
        KeyStore.SecretKeyEntry
      )
      ?.secretKey
  }

  private fun requireExistingKey():
    SecretKey =
    existingKey()
      ?: throw TvPassportKeystoreException(
        code =
          "device_sealer_key_missing",
      )

  private fun openKeyStore():
    KeyStore =
    try {
      KeyStore.getInstance(
        ANDROID_KEYSTORE,
      )
        .apply {
          load(
            null,
          )
        }
    } catch (
      error:
        Exception
    ) {
      throw TvPassportKeystoreException(
        code =
          "keystore_open_failed",

        cause =
          error,
      )
    }

  private fun validateAssociatedData(
    associatedData:
      ByteArray,
  ) {
    require(
      associatedData.isNotEmpty(),
    ) {
      "associated data must not be empty"
    }

    require(
      associatedData.size <=
        MAX_ASSOCIATED_DATA_BYTES,
    ) {
      "associated data exceeds the bounded limit"
    }
  }
}

class TvPassportSealedBlob(
  val version:
    Int,

  val iv:
    ByteArray,

  val ciphertext:
    ByteArray,
) {
  init {
    require(
      iv.size ==
        GCM_IV_BYTES,
    ) {
      "invalid sealed-blob IV"
    }

    require(
      ciphertext.size >=
        GCM_TAG_BYTES,
    ) {
      "invalid sealed-blob ciphertext"
    }
  }

  fun copy(
    version:
      Int =
      this.version,

    iv:
      ByteArray =
      this.iv,

    ciphertext:
      ByteArray =
      this.ciphertext,
  ):
    TvPassportSealedBlob =
    TvPassportSealedBlob(
      version =
        version,

      iv =
        iv,

      ciphertext =
        ciphertext,
    )

  override fun equals(
    other:
      Any?,
  ):
    Boolean =
    other is
      TvPassportSealedBlob &&
      version ==
        other.version &&
      iv.contentEquals(
        other.iv,
      ) &&
      ciphertext.contentEquals(
        other.ciphertext,
      )

  override fun hashCode():
    Int {
    var result =
      version

    result =
      31 * result +
        iv.contentHashCode()

    result =
      31 * result +
        ciphertext.contentHashCode()

    return result
  }
}

data class TvPassportKeystoreInspection(
  val provider:
    String,

  val alias:
    String,

  val keyPresent:
    Boolean,

  val deviceCompartmentOnly:
    Boolean,

  val recoveryRootStorageAllowed:
    Boolean,

  val rootAdminKeyStorageAllowed:
    Boolean,

  val secretExportAllowed:
    Boolean,

  val webviewSecretReturnAllowed:
    Boolean,
)

class TvPassportKeystoreException(
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

const val TV_PASSPORT_DEVICE_SEALER_ALIAS =
  "com.rustyonions.crablink.tv.passport.device-sealer.v1"

private const val ANDROID_KEYSTORE =
  "AndroidKeyStore"

private const val AES_GCM_TRANSFORMATION =
  "AES/GCM/NoPadding"

private const val AES_KEY_BITS =
  256

private const val GCM_TAG_BITS =
  128

private const val GCM_TAG_BYTES =
  GCM_TAG_BITS / 8

private const val GCM_IV_BYTES =
  12

private const val SEALED_BLOB_VERSION =
  1

private const val MAX_ALIAS_CHARS =
  240

private const val MAX_PLAINTEXT_BYTES =
  64 * 1024

private const val MAX_ASSOCIATED_DATA_BYTES =
  4 * 1024
