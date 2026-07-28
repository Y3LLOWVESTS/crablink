//! RO:WHAT — Exposes a narrow TV command for local B3 asset-manifest integrity review.
//! RO:WHY — Phase 9D lets TV ask native Rust to review manifest facts and bytes before UI rendering.
//! RO:INTERACTS — crablink-native-core asset_manifest, future TV adapter, and Library detail surfaces.
//! RO:INVARIANTS — caller supplies no provider URL/path/command; result returns reviewed facts only, never raw bytes.
//! RO:SECURITY — no network, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
//! RO:TEST — command tests plus check-crablink-tv-asset-manifest-command-boundary.mjs.

use crablink_native_core::{
    review_tv_asset_manifest, verify_tv_asset_bytes, ReviewedTvAssetManifest,
    TvAssetIntegrityError, TvAssetKind, TvAssetManifestV1, MAX_TV_ASSET_BYTES,
};
use serde::{Deserialize, Serialize};

const CHECK_REQUEST_SCHEMA: &str = "crablink.tv.asset-manifest-check-request.v1";
const CHECK_RESULT_SCHEMA: &str = "crablink.tv.asset-manifest-check-result.v1";
const CHECK_ERROR_SCHEMA: &str = "crablink.tv.asset-manifest-check-error.v1";

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct TvAssetManifestCheckRequest {
    pub schema: String,
    pub expected_crab_url: String,
    pub expected_content_cid: String,
    pub expected_asset_kind: TvAssetKind,
    pub manifest: TvAssetManifestV1,
    pub asset_bytes: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvAssetManifestCheckResult {
    pub schema: &'static str,
    pub verified: bool,
    pub render_kind: &'static str,
    pub asset_kind: TvAssetKind,
    pub crab_url: String,
    pub content_cid: String,
    pub content_type: String,
    pub content_length: usize,
    pub max_verified_asset_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvAssetManifestCheckError {
    pub schema: &'static str,
    pub code: &'static str,
    pub retryable: bool,
}

fn check_error(code: &'static str) -> TvAssetManifestCheckError {
    TvAssetManifestCheckError {
        schema: CHECK_ERROR_SCHEMA,
        code,
        retryable: false,
    }
}

fn integrity_error(error: TvAssetIntegrityError) -> TvAssetManifestCheckError {
    let code = match error {
        TvAssetIntegrityError::InvalidSchema => "asset_manifest_schema_invalid",
        TvAssetIntegrityError::InvalidVersion => "asset_manifest_version_invalid",
        TvAssetIntegrityError::InvalidCrabUrl => "asset_crab_url_invalid",
        TvAssetIntegrityError::CrabUrlMismatch => "asset_crab_url_mismatch",
        TvAssetIntegrityError::InvalidContentCid => "asset_content_cid_invalid",
        TvAssetIntegrityError::ContentCidMismatch => "asset_content_cid_mismatch",
        TvAssetIntegrityError::AssetKindMismatch => "asset_kind_mismatch",
        TvAssetIntegrityError::InvalidContentType => "asset_content_type_invalid",
        TvAssetIntegrityError::EmptyContent => "asset_content_empty",
        TvAssetIntegrityError::OversizedContent => "asset_content_oversized",
        TvAssetIntegrityError::ByteLengthMismatch => "asset_byte_length_mismatch",
        TvAssetIntegrityError::DigestMismatch => "asset_digest_mismatch",
    };

    check_error(code)
}

fn render_kind(kind: TvAssetKind) -> &'static str {
    match kind {
        TvAssetKind::Image => "image",
        TvAssetKind::Article => "article",
    }
}

fn result_for_manifest(manifest: ReviewedTvAssetManifest) -> TvAssetManifestCheckResult {
    TvAssetManifestCheckResult {
        schema: CHECK_RESULT_SCHEMA,
        verified: true,
        render_kind: render_kind(manifest.asset_kind),
        asset_kind: manifest.asset_kind,
        crab_url: manifest.crab_url,
        content_cid: manifest.content_cid,
        content_type: manifest.content_type,
        content_length: manifest.content_length,
        max_verified_asset_bytes: MAX_TV_ASSET_BYTES,
    }
}

pub(crate) fn perform_asset_manifest_check(
    request: TvAssetManifestCheckRequest,
) -> Result<TvAssetManifestCheckResult, TvAssetManifestCheckError> {
    let TvAssetManifestCheckRequest {
        schema,
        expected_crab_url,
        expected_content_cid,
        expected_asset_kind,
        manifest,
        asset_bytes,
    } = request;

    if schema != CHECK_REQUEST_SCHEMA {
        return Err(check_error("asset_manifest_check_schema_invalid"));
    }

    if asset_bytes.is_empty() {
        return Err(check_error("asset_bytes_empty"));
    }

    if asset_bytes.len() > MAX_TV_ASSET_BYTES {
        return Err(check_error("asset_bytes_oversized"));
    }

    let reviewed = review_tv_asset_manifest(
        manifest,
        &expected_crab_url,
        &expected_content_cid,
        expected_asset_kind,
    )
    .map_err(integrity_error)?;

    let verified = verify_tv_asset_bytes(reviewed, &asset_bytes).map_err(integrity_error)?;

    Ok(result_for_manifest(verified.manifest))
}

#[tauri::command]
pub fn tv_asset_manifest_check(
    request: TvAssetManifestCheckRequest,
) -> Result<TvAssetManifestCheckResult, TvAssetManifestCheckError> {
    perform_asset_manifest_check(request)
}

#[cfg(test)]
mod tests {
    use crablink_native_core::{
        compute_tv_asset_content_cid, TvAssetKind, TvAssetManifestV1, TV_ASSET_MANIFEST_SCHEMA,
        TV_ASSET_MANIFEST_VERSION,
    };
    use serde_json::json;

    use super::{perform_asset_manifest_check, TvAssetManifestCheckRequest, CHECK_REQUEST_SCHEMA};

    const IMAGE_URL: &str =
        "crab://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.image";

    const ARTICLE_URL: &str =
        "crab://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.article";

    fn request(
        kind: TvAssetKind,
        crab_url: &str,
        bytes: &[u8],
        content_type: &str,
    ) -> TvAssetManifestCheckRequest {
        let content_cid = compute_tv_asset_content_cid(bytes);

        TvAssetManifestCheckRequest {
            schema: CHECK_REQUEST_SCHEMA.to_string(),
            expected_crab_url: crab_url.to_string(),
            expected_content_cid: content_cid.clone(),
            expected_asset_kind: kind,
            manifest: TvAssetManifestV1 {
                schema: TV_ASSET_MANIFEST_SCHEMA.to_string(),
                version: TV_ASSET_MANIFEST_VERSION,
                asset_kind: kind,
                crab_url: crab_url.to_string(),
                content_cid,
                content_type: content_type.to_string(),
                content_length: bytes.len() as u64,
            },
            asset_bytes: bytes.to_vec(),
        }
    }

    #[test]
    fn accepts_verified_image_and_article_manifest_checks() {
        for (kind, crab_url, bytes, content_type, render_kind) in [
            (
                TvAssetKind::Image,
                IMAGE_URL,
                b"small-image".as_slice(),
                "image/png",
                "image",
            ),
            (
                TvAssetKind::Article,
                ARTICLE_URL,
                b"# Small article".as_slice(),
                "text/markdown; charset=utf-8",
                "article",
            ),
        ] {
            let result = perform_asset_manifest_check(request(kind, crab_url, bytes, content_type))
                .expect("verified asset manifest check");

            assert!(result.verified);
            assert_eq!(result.render_kind, render_kind);
            assert_eq!(result.asset_kind, kind);
            assert_eq!(result.crab_url, crab_url);
            assert_eq!(result.content_length, bytes.len());
            assert_eq!(result.content_type, content_type);
        }
    }

    #[test]
    fn rejects_corrupt_bytes_without_returning_payload() {
        let mut request = request(TvAssetKind::Image, IMAGE_URL, b"small-image", "image/png");

        request.asset_bytes = b"small-imagf".to_vec();

        let error = perform_asset_manifest_check(request).expect_err("corrupt bytes fail");

        assert_eq!(error.code, "asset_digest_mismatch");
        assert!(!error.retryable);
    }

    #[test]
    fn rejects_route_kind_and_content_type_mismatches() {
        let mut route_mismatch =
            request(TvAssetKind::Image, IMAGE_URL, b"small-image", "image/png");

        route_mismatch.expected_crab_url = ARTICLE_URL.to_string();

        assert_eq!(
            perform_asset_manifest_check(route_mismatch)
                .expect_err("route mismatch")
                .code,
            "asset_crab_url_mismatch",
        );

        let mut kind_mismatch = request(TvAssetKind::Image, IMAGE_URL, b"small-image", "image/png");

        kind_mismatch.expected_asset_kind = TvAssetKind::Article;

        assert_eq!(
            perform_asset_manifest_check(kind_mismatch)
                .expect_err("kind mismatch")
                .code,
            "asset_kind_mismatch",
        );

        let content_type_mismatch = request(
            TvAssetKind::Image,
            IMAGE_URL,
            b"small-image",
            "text/plain; charset=utf-8",
        );

        assert_eq!(
            perform_asset_manifest_check(content_type_mismatch)
                .expect_err("content type mismatch")
                .code,
            "asset_content_type_invalid",
        );
    }

    #[test]
    fn rejects_empty_or_bad_request_schema() {
        let mut empty = request(
            TvAssetKind::Article,
            ARTICLE_URL,
            b"# Small article",
            "text/markdown; charset=utf-8",
        );

        empty.asset_bytes.clear();

        assert_eq!(
            perform_asset_manifest_check(empty)
                .expect_err("empty bytes")
                .code,
            "asset_bytes_empty",
        );

        let mut bad_schema = request(
            TvAssetKind::Article,
            ARTICLE_URL,
            b"# Small article",
            "text/markdown; charset=utf-8",
        );

        bad_schema.schema = "wrong.schema".to_string();

        assert_eq!(
            perform_asset_manifest_check(bad_schema)
                .expect_err("bad schema")
                .code,
            "asset_manifest_check_schema_invalid",
        );
    }

    #[test]
    fn request_contract_denies_unknown_authority_fields() {
        let request = request(TvAssetKind::Image, IMAGE_URL, b"small-image", "image/png");

        let mut value = serde_json::to_value(request).expect("request JSON");

        value["wallet"] = json!("forbidden");
        value["ledger"] = json!("forbidden");
        value["fetchUrl"] = json!("forbidden");

        assert!(serde_json::from_value::<TvAssetManifestCheckRequest>(value).is_err());
    }
}
