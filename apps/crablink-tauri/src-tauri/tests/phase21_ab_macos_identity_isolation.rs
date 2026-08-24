#![cfg(target_os = "macos")]

use crablink_tauri_lib::passport_platform_sealer::{
    active_macos_keychain_service, PHASE15L_KEYCHAIN_SERVICE, PHASE21_AB_B_KEYCHAIN_SERVICE,
};

#[test]
fn phase21_ab_default_keychain_namespace_remains_crablink_a() {
    match option_env!("CRABLINK_DESKTOP_AB_VARIANT") {
        None | Some("a") => {
            assert_eq!(active_macos_keychain_service(), PHASE15L_KEYCHAIN_SERVICE);
        }
        Some("b") => {
            assert_eq!(
                active_macos_keychain_service(),
                PHASE21_AB_B_KEYCHAIN_SERVICE
            );
        }
        Some(other) => {
            panic!("unexpected A/B variant: {other}");
        }
    }
}

#[test]
fn phase21_ab_a_and_b_keychain_services_are_distinct() {
    assert_ne!(PHASE15L_KEYCHAIN_SERVICE, PHASE21_AB_B_KEYCHAIN_SERVICE);

    assert_eq!(
        PHASE15L_KEYCHAIN_SERVICE,
        "com.rustyonions.crablink.native-passport.v1"
    );

    assert_eq!(
        PHASE21_AB_B_KEYCHAIN_SERVICE,
        "com.rustyonions.crablink.ab-b.native-passport.v1"
    );
}
