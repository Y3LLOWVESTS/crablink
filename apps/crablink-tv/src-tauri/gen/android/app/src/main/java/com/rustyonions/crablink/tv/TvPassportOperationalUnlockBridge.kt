package com.rustyonions.crablink.tv

/**
 * RO:WHAT — Native-only bridge from a verified Android PIN ticket to operational unlock.
 * RO:WHY — Keeps PIN entry and secret material outside Rust arguments and the WebView.
 * RO:INTERACTS — PIN verifier store, device material bridge, delegated authority bridge, JNI.
 * RO:INVARIANTS — No PIN argument; consume-once ticket; raw key/capability bytes never return.
 * RO:SECURITY — Only a redacted JSON receipt crosses the JNI return boundary.
 * RO:TEST — Phase 16E3B2B2C boundary plus Android compile/APK acceptance.
 */
internal class TvPassportOperationalUnlockBridge(
  private val verifierStore:
    TvPassportNativePinVerifierStore,

  private val deviceMaterialBridge:
    TvPassportDeviceMaterialBridge,

  private val delegatedAuthorityBridge:
    TvPassportDelegatedAuthorityBridge,
) {
  fun failClosedOperationalRuntime() {
    /*
     * Zero is never a valid reviewed unlock timestamp. The Rust export
     * rejects it before ticket/material access and applies its global
     * fail-closed lock path while preserving the single JNI export.
     */
    unlockAfterVerifiedNativePin(
      0L,
    )
  }

  external fun unlockAfterVerifiedNativePin(
    nowMs: Long,
  ): String

  fun consumeVerifiedPinTicketForNative():
    ByteArray? =
    verifierStore
      .consumeVerifiedPinTicketForNative()

  fun unsealStoredDeviceKeyForNative():
    ByteArray =
    deviceMaterialBridge
      .unsealStoredDeviceKeyForNative()

  fun unsealStoredNarrowCapabilityForNative():
    ByteArray =
    delegatedAuthorityBridge
      .unsealStoredNarrowCapabilityForNative()
}