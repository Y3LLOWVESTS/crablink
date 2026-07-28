//! RO:WHAT — Canonical B3 content-identifier validation shared by CrabLink native clients.
//! RO:WHY — Desktop validators must not carry separate copies of the same lowercase B3 rule.
//! RO:INTERACTS — confirmed ROC, OAP object fetch, User Node evidence, and operator review DTOs.
//! RO:INVARIANTS — canonical form is exactly b3:<64 lowercase hexadecimal characters>.
//! RO:SECURITY — validation only; no hashing, storage, transport, wallet, ledger, or finality authority.
//! RO:TEST — focused unit tests below and native-core boundary checks.

#![forbid(unsafe_code)]

pub const B3_PREFIX: &str = "b3:";
pub const B3_DIGEST_HEX_LENGTH: usize = 64;

const CANONICAL_B3_ERROR: &str = "value must use canonical b3:<64 lowercase hex> form";

#[must_use]
pub fn is_canonical_b3(value: &str) -> bool {
    let Some(digest) = value.strip_prefix(B3_PREFIX) else {
        return false;
    };

    digest.len() == B3_DIGEST_HEX_LENGTH
        && digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
}

pub fn validate_canonical_b3(value: &str) -> Result<(), String> {
    if is_canonical_b3(value) {
        Ok(())
    } else {
        Err(CANONICAL_B3_ERROR.to_string())
    }
}

pub fn normalize_canonical_b3(value: &str) -> Result<String, String> {
    let clean = value.trim();

    validate_canonical_b3(clean)?;

    Ok(clean.to_string())
}

#[cfg(test)]
mod tests {
    use super::{is_canonical_b3, normalize_canonical_b3, validate_canonical_b3};

    const DIGEST: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    #[test]
    fn canonical_lowercase_b3_is_accepted() {
        let value = format!("b3:{DIGEST}");

        assert!(is_canonical_b3(&value));

        validate_canonical_b3(&value).expect("canonical B3");
    }

    #[test]
    fn raw_uppercase_short_and_spaced_values_reject() {
        assert!(validate_canonical_b3(DIGEST).is_err());

        assert!(validate_canonical_b3(&format!("b3:{}", DIGEST.to_ascii_uppercase(),),).is_err());

        assert!(validate_canonical_b3("b3:abc",).is_err());

        assert!(validate_canonical_b3(&format!(" b3:{DIGEST} "),).is_err());
    }

    #[test]
    fn normalization_trims_only_outer_whitespace() {
        let normalized =
            normalize_canonical_b3(&format!("  b3:{DIGEST}\n")).expect("trimmed canonical B3");

        assert_eq!(normalized, format!("b3:{DIGEST}"),);

        assert!(normalize_canonical_b3(&format!("b3:{}", DIGEST.to_ascii_uppercase(),),).is_err());
    }
}
