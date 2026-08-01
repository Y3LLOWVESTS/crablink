# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# CrabLink TV Native Passport Phase 16B3B JNI names.
-keep class com.rustyonions.crablink.tv.TvPassportDeviceMaterialBridge {
    public native java.lang.String provisionAndStore();
    public native java.lang.String hydrateStoredPublicRecord();
    public byte[] sealDeviceKeyForNative(byte[], byte[]);
    public java.lang.String storeDeviceMaterialForNative(java.lang.String, byte[]);
    public java.lang.String readStoredPublicRecordForNative();
    public java.lang.String consumeAuthorizationReplayForNative(java.lang.String, long, long);
    public java.lang.String inspectStoredDeviceMaterialForNative();
    public java.lang.String deleteStoredDeviceMaterialForNative();
}


# Phase 16D2 delegated authority native bridge
-keep class com.rustyonions.crablink.tv.TvPassportDelegatedAuthorityBridge {
    public native java.lang.String hydrateStoredAuthorityForNative(long);
    public java.lang.String hydrateStoredDelegatedAuthorityOnStartupForNative();
    public java.lang.String storeReviewedDelegatedAuthorityForNative(java.lang.String, byte[], byte[]);
    public java.lang.String readStoredDelegatedAuthorityPublicRecordForNative();
    public java.lang.String inspectStoredDelegatedAuthorityForNative();
    public java.lang.String deleteStoredDelegatedAuthorityForNative();
}

# Phase 16E2 native Android PIN prompt
-keep class com.rustyonions.crablink.tv.TvPassportNativePinPrompt { *; }
-keep class com.rustyonions.crablink.tv.TvPassportNativePinVerifier { *; }
-keep class com.rustyonions.crablink.tv.TvPassportNativePinVerification { *; }
-keep class com.rustyonions.crablink.tv.TvPassportNativePinOutcome { *; }
-keep class com.rustyonions.crablink.tv.TvPassportNativePinPromptReceipt { *; }

# Phase 16E3B1 native Android PIN verifier
-keep class com.rustyonions.crablink.tv.TvPassportNativePinVerifierStore { *; }
-keep class com.rustyonions.crablink.tv.TvPassportNativePinVerifierInspection { *; }

# Phase 16E3B2B1 native Keystore unseal ports
-keepclassmembers class com.rustyonions.crablink.tv.TvPassportDeviceMaterialStore {
    *** readSealedEnvelopeForNative(...);
}
-keepclassmembers class com.rustyonions.crablink.tv.TvPassportDeviceMaterialBridge {
    *** unsealStoredDeviceKeyForNative(...);
}
-keepclassmembers class com.rustyonions.crablink.tv.TvPassportDelegatedAuthorityStore {
    *** readSealedCapabilityEnvelopeForNative(...);
}
-keepclassmembers class com.rustyonions.crablink.tv.TvPassportDelegatedAuthorityBridge {
    *** unsealStoredNarrowCapabilityForNative(...);
}

# Phase 16E3B2B2C redacted operational-unlock JNI export
-keep class com.rustyonions.crablink.tv.TvPassportOperationalUnlockBridge {
    public native java.lang.String unlockAfterVerifiedNativePin(long);
    public byte[] consumeVerifiedPinTicketForNative();
    public byte[] unsealStoredDeviceKeyForNative();
    public byte[] unsealStoredNarrowCapabilityForNative();
}

-keep class com.rustyonions.crablink.tv.TvPassportNativePinCoordinator { *; }
