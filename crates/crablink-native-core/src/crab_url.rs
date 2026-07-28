//! RO:WHAT — Native CrabLink gateway-resolver ingress validation.
//! RO:WHY — Desktop and future native clients must apply one bounded crab:// input contract.
//! RO:INTERACTS — desktop gateway resolver and future deep-link wrappers.
//! RO:INVARIANTS — trims outer whitespace, caps bytes, rejects interior CR/LF, and requires exact crab://.
//! RO:SECURITY — ingress normalization only; no route classification, network, storage, wallet, or ledger authority.
//! RO:TEST — focused tests below and the shared native-core boundary.

#![forbid(unsafe_code)]

pub const CRAB_URL_SCHEME: &str = "crab://";

pub const MAX_CRAB_URL_BYTES: usize = 2_048;

pub fn normalize_crab_url_for_gateway(value: &str) -> Result<String, String> {
    let trimmed = value.trim();

    if trimmed.len() > MAX_CRAB_URL_BYTES {
        return Err("crab URL is too long".to_string());
    }

    if trimmed.contains('\n') || trimmed.contains('\r') {
        return Err("crab URL must not contain newlines".to_string());
    }

    if !trimmed.starts_with(CRAB_URL_SCHEME) {
        return Err("only crab:// URLs are accepted here".to_string());
    }

    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::{normalize_crab_url_for_gateway, CRAB_URL_SCHEME, MAX_CRAB_URL_BYTES};

    #[test]
    fn valid_crab_inputs_are_trimmed_without_route_reclassification() {
        for (input, expected) in [
            ("  crab://home  ", "crab://home"),
            ("\tcrab://@creator\n", "crab://@creator"),
            (
                "crab://site-name?view=public#top",
                "crab://site-name?view=public#top",
            ),
        ] {
            assert_eq!(
                normalize_crab_url_for_gateway(input,).expect("valid crab ingress"),
                expected,
            );
        }
    }

    #[test]
    fn wrong_scheme_newlines_and_oversize_values_reject() {
        assert_eq!(
            normalize_crab_url_for_gateway("https://example.invalid",).expect_err("wrong scheme"),
            "only crab:// URLs are accepted here",
        );

        assert_eq!(
            normalize_crab_url_for_gateway("Crab://home",).expect_err("scheme is exact"),
            "only crab:// URLs are accepted here",
        );

        assert_eq!(
            normalize_crab_url_for_gateway("crab://home\nother",).expect_err("interior newline"),
            "crab URL must not contain newlines",
        );

        let oversized = format!("{CRAB_URL_SCHEME}{}", "a".repeat(MAX_CRAB_URL_BYTES,),);

        assert_eq!(
            normalize_crab_url_for_gateway(&oversized,).expect_err("oversize"),
            "crab URL is too long",
        );
    }

    #[test]
    fn byte_limit_and_ingress_only_posture_are_preserved() {
        let payload_length = MAX_CRAB_URL_BYTES - CRAB_URL_SCHEME.len();

        let at_limit = format!("{CRAB_URL_SCHEME}{}", "a".repeat(payload_length),);

        assert_eq!(at_limit.len(), MAX_CRAB_URL_BYTES,);

        assert_eq!(
            normalize_crab_url_for_gateway(&at_limit,).expect("value at byte limit"),
            at_limit,
        );

        assert_eq!(
            normalize_crab_url_for_gateway(CRAB_URL_SCHEME,)
                .expect("route classification remains outside ingress validation",),
            CRAB_URL_SCHEME,
        );
    }
}
