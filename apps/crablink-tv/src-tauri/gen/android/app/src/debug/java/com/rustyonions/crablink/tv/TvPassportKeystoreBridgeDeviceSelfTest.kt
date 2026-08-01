package com.rustyonions.crablink.tv

import java.util.UUID

/**
 * Debug-only checks for delegated-device Keystore sealing.
 *
 * Execution remains deferred to the Android TV device-acceptance lane.
 */
internal object TvPassportKeystoreBridgeDeviceSelfTest {
  internal fun runAll(): List<String> {
    phase16b2_android_keystore_seal_unseal_roundtrip()
    phase16b2_android_keystore_uses_randomized_gcm_iv()
    phase16b2_android_keystore_rejects_wrong_associated_data()
    phase16b2_android_keystore_rejects_ciphertext_tampering()
    phase16b2_android_keystore_delete_is_idempotent_and_redacted()

    return listOf(
      "seal_unseal_roundtrip",
      "randomized_gcm_iv",
      "wrong_associated_data_rejected",
      "ciphertext_tampering_rejected",
      "delete_idempotent_and_redacted",
    )
  }

  internal fun phase16b2_android_keystore_seal_unseal_roundtrip() {
    withTemporaryBridge { bridge ->
      val plaintext = bytes("delegated-device-material")
      val aad = bytes("native-passport/tv-device/v1")
      val sealed = bridge.seal(plaintext, aad)

      check(bridge.hasKey()) {
        "Keystore key was not created."
      }

      check(
        plaintext.contentEquals(
          bridge.unseal(sealed, aad),
        ),
      ) {
        "Unsealed device material differs."
      }
    }
  }

  internal fun phase16b2_android_keystore_uses_randomized_gcm_iv() {
    withTemporaryBridge { bridge ->
      val plaintext = bytes("same-device-material")
      val aad = bytes("native-passport/tv-device/v1")

      val first = bridge.seal(plaintext, aad)
      val second = bridge.seal(plaintext, aad)

      check(!first.iv.contentEquals(second.iv)) {
        "GCM IV was unexpectedly reused."
      }

      check(
        !first.ciphertext.contentEquals(
          second.ciphertext,
        ),
      ) {
        "Randomized sealing produced identical ciphertext."
      }
    }
  }

  internal fun phase16b2_android_keystore_rejects_wrong_associated_data() {
    withTemporaryBridge { bridge ->
      val sealed =
        bridge.seal(
          bytes("delegated-device-material"),
          bytes("native-passport/tv-device/v1"),
        )

      expectUnsealFailure {
        bridge.unseal(
          sealed,
          bytes("native-passport/wrong-domain/v1"),
        )
      }
    }
  }

  internal fun phase16b2_android_keystore_rejects_ciphertext_tampering() {
    withTemporaryBridge { bridge ->
      val aad = bytes("native-passport/tv-device/v1")

      val sealed =
        bridge.seal(
          bytes("delegated-device-material"),
          aad,
        )

      val tampered = sealed.ciphertext.copyOf()

      tampered[tampered.lastIndex] =
        (
          tampered.last().toInt() xor 0x01
        ).toByte()

      expectUnsealFailure {
        bridge.unseal(
          sealed.copy(ciphertext = tampered),
          aad,
        )
      }
    }
  }

  internal fun phase16b2_android_keystore_delete_is_idempotent_and_redacted() {
    withTemporaryBridge { bridge ->
      val before = bridge.inspect()

      check(!before.keyPresent)
      check(before.deviceCompartmentOnly)
      check(!before.recoveryRootStorageAllowed)
      check(!before.rootAdminKeyStorageAllowed)
      check(!before.secretExportAllowed)
      check(!before.webviewSecretReturnAllowed)
      check(before.alias.isNotBlank())

      bridge.seal(
        bytes("delegated-device-material"),
        bytes("native-passport/tv-device/v1"),
      )

      check(bridge.deleteKey()) {
        "Existing Keystore key was not deleted."
      }

      check(!bridge.deleteKey()) {
        "Second deletion was not idempotent."
      }
    }
  }

  private fun withTemporaryBridge(
    operation: (TvPassportKeystoreBridge) -> Unit,
  ) {
    val bridge =
      TvPassportKeystoreBridge(
        alias =
          "com.rustyonions.crablink.tv.debug-test." +
            UUID.randomUUID(),
      )

    try {
      bridge.deleteKey()
      operation(bridge)
    } finally {
      bridge.deleteKey()
    }
  }

  private fun expectUnsealFailure(
    operation: () -> Unit,
  ) {
    try {
      operation()

      throw AssertionError(
        "Unseal unexpectedly succeeded.",
      )
    } catch (error: TvPassportKeystoreException) {
      check(
        error.code == "unseal_failed" ||
          error.code == "device_sealer_key_missing",
      ) {
        "Unexpected unseal error code."
      }
    }
  }

  private fun bytes(value: String): ByteArray =
    value.toByteArray(Charsets.UTF_8)
}
