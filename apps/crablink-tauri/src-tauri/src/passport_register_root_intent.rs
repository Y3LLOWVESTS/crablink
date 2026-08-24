//! RO:WHAT — Canonicalizes CrabLink's Physical M1 client-owned RegisterRoot operation commitment.
//! RO:WHY — Challenge issuance and proof signing must bind the same precise client intent without duplicating operation-hash construction across physical acceptance paths.
//! RO:INTERACTS — ron-proto PassportIdV1/B3DigestHex, live RegisterRoot challenge acceptance, and live RecoveryRoot proof acceptance.
//! RO:INVARIANTS — commits only to the local operation domain, exact Passport ID, exact public root key, and root epoch; it does not issue challenges, verify service trust, unlock vaults, sign, submit proofs, or mutate backend state.
//! RO:METRICS — none.
//! RO:CONFIG — Physical M1 root epoch remains zero until a reviewed root-rotation design changes it.
//! RO:SECURITY — public inputs only; no PIN, recovery factor, VMK, private key, signature, capability, username, wallet, or ledger authority.
//! RO:TEST — physical_m1_live_register_root_challenge.rs and physical_m1_live_register_root_proof.rs.

#![forbid(unsafe_code)]

use ron_proto::{B3DigestHex, PassportIdV1};

pub const PHYSICAL_M1_REGISTER_ROOT_OPERATION_DOMAIN: &str =
    "crablink.physical-m1.register-root-operation.v1";

pub const PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH: u64 = 0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PhysicalM1RegisterRootIntentError {
    FieldTooLong,
    DigestConstructionFailed,
}

pub fn physical_m1_register_root_operation_hash(
    passport_id: &PassportIdV1,
    root_public_key: &str,
) -> Result<B3DigestHex, PhysicalM1RegisterRootIntentError> {
    let mut transcript = Vec::with_capacity(256);

    append_lp(&mut transcript, PHYSICAL_M1_REGISTER_ROOT_OPERATION_DOMAIN)?;

    append_lp(&mut transcript, passport_id.as_str())?;

    append_lp(&mut transcript, root_public_key)?;

    transcript.extend_from_slice(&PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH.to_be_bytes());

    let digest = blake3::hash(&transcript).to_hex().to_string();

    B3DigestHex::parse("operation_body_hash", digest)
        .map_err(|_| PhysicalM1RegisterRootIntentError::DigestConstructionFailed)
}

fn append_lp(output: &mut Vec<u8>, value: &str) -> Result<(), PhysicalM1RegisterRootIntentError> {
    let length =
        u16::try_from(value.len()).map_err(|_| PhysicalM1RegisterRootIntentError::FieldTooLong)?;

    output.extend_from_slice(&length.to_be_bytes());
    output.extend_from_slice(value.as_bytes());

    Ok(())
}
