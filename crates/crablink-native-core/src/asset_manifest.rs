//! RO:WHAT — Reviews typed TV asset manifests and verifies bounded asset bytes by full BLAKE3 digest.
//! RO:WHY — CrabLink TV Phase 9 must reject malformed, mismatched, oversized, or corrupt content before rendering.
//! RO:INTERACTS — canonical B3 validation, crab:// ingress validation, future TV asset transport and Library views.
//! RO:INVARIANTS — image/article only; strict DTO; exact route/CID/kind binding; full digest before success.
//! RO:SECURITY — deterministic validation only; no network, storage, cache, wallet, ledger, entitlement, or finality authority.
//! RO:TEST — focused unit tests below plus the Phase 9C boundary checker.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};

use crate::{normalize_crab_url_for_gateway, validate_canonical_b3};

pub const TV_ASSET_MANIFEST_SCHEMA: &str = "crablink.tv.asset-manifest.v1";

pub const TV_ASSET_MANIFEST_VERSION: u16 = 1;

pub const MAX_TV_ASSET_BYTES: usize = 4 * 1024 * 1024;

pub const MAX_TV_ASSET_CONTENT_TYPE_BYTES: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TvAssetKind {
    Image,
    Article,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct TvAssetManifestV1 {
    pub schema: String,
    pub version: u16,
    pub asset_kind: TvAssetKind,
    pub crab_url: String,
    pub content_cid: String,
    pub content_type: String,
    pub content_length: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewedTvAssetManifest {
    pub schema: &'static str,
    pub version: u16,
    pub asset_kind: TvAssetKind,
    pub crab_url: String,
    pub content_cid: String,
    pub content_type: String,
    pub content_length: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TvAssetIntegrityError {
    InvalidSchema,
    InvalidVersion,
    InvalidCrabUrl,
    CrabUrlMismatch,
    InvalidContentCid,
    ContentCidMismatch,
    AssetKindMismatch,
    InvalidContentType,
    EmptyContent,
    OversizedContent,
    ByteLengthMismatch,
    DigestMismatch,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifiedTvAssetBytes {
    pub manifest: ReviewedTvAssetManifest,
    pub bytes: Vec<u8>,
}

fn content_type_matches(kind: TvAssetKind, content_type: &str) -> bool {
    match kind {
        TvAssetKind::Image => {
            matches!(content_type, "image/png" | "image/jpeg" | "image/webp")
        }
        TvAssetKind::Article => {
            matches!(
                content_type,
                "text/plain; charset=utf-8" | "text/markdown; charset=utf-8"
            )
        }
    }
}

pub fn review_tv_asset_manifest(
    manifest: TvAssetManifestV1,
    expected_crab_url: &str,
    expected_content_cid: &str,
    expected_asset_kind: TvAssetKind,
) -> Result<ReviewedTvAssetManifest, TvAssetIntegrityError> {
    if manifest.schema != TV_ASSET_MANIFEST_SCHEMA {
        return Err(TvAssetIntegrityError::InvalidSchema);
    }

    if manifest.version != TV_ASSET_MANIFEST_VERSION {
        return Err(TvAssetIntegrityError::InvalidVersion);
    }

    let expected_crab_url = normalize_crab_url_for_gateway(expected_crab_url)
        .map_err(|_| TvAssetIntegrityError::InvalidCrabUrl)?;

    let manifest_crab_url = normalize_crab_url_for_gateway(&manifest.crab_url)
        .map_err(|_| TvAssetIntegrityError::InvalidCrabUrl)?;

    if manifest_crab_url != manifest.crab_url {
        return Err(TvAssetIntegrityError::InvalidCrabUrl);
    }

    if manifest_crab_url != expected_crab_url {
        return Err(TvAssetIntegrityError::CrabUrlMismatch);
    }

    validate_canonical_b3(expected_content_cid)
        .map_err(|_| TvAssetIntegrityError::InvalidContentCid)?;

    validate_canonical_b3(&manifest.content_cid)
        .map_err(|_| TvAssetIntegrityError::InvalidContentCid)?;

    if manifest.content_cid != expected_content_cid {
        return Err(TvAssetIntegrityError::ContentCidMismatch);
    }

    if manifest.asset_kind != expected_asset_kind {
        return Err(TvAssetIntegrityError::AssetKindMismatch);
    }

    let content_type = manifest.content_type.trim();

    if content_type.is_empty()
        || content_type.len() > MAX_TV_ASSET_CONTENT_TYPE_BYTES
        || content_type != manifest.content_type
        || !content_type_matches(manifest.asset_kind, content_type)
    {
        return Err(TvAssetIntegrityError::InvalidContentType);
    }

    let content_length = usize::try_from(manifest.content_length)
        .map_err(|_| TvAssetIntegrityError::OversizedContent)?;

    if content_length == 0 {
        return Err(TvAssetIntegrityError::EmptyContent);
    }

    if content_length > MAX_TV_ASSET_BYTES {
        return Err(TvAssetIntegrityError::OversizedContent);
    }

    Ok(ReviewedTvAssetManifest {
        schema: TV_ASSET_MANIFEST_SCHEMA,
        version: TV_ASSET_MANIFEST_VERSION,
        asset_kind: manifest.asset_kind,
        crab_url: manifest_crab_url,
        content_cid: manifest.content_cid,
        content_type: content_type.to_string(),
        content_length,
    })
}

pub fn compute_tv_asset_content_cid(bytes: &[u8]) -> String {
    format!("b3:{}", blake3::hash(bytes).to_hex())
}

pub fn verify_tv_asset_bytes(
    manifest: ReviewedTvAssetManifest,
    bytes: &[u8],
) -> Result<VerifiedTvAssetBytes, TvAssetIntegrityError> {
    if bytes.len() != manifest.content_length {
        return Err(TvAssetIntegrityError::ByteLengthMismatch);
    }

    if bytes.len() > MAX_TV_ASSET_BYTES {
        return Err(TvAssetIntegrityError::OversizedContent);
    }

    let computed_cid = format!("b3:{}", blake3::hash(bytes).to_hex(),);

    if computed_cid != manifest.content_cid {
        return Err(TvAssetIntegrityError::DigestMismatch);
    }

    Ok(VerifiedTvAssetBytes {
        manifest,
        bytes: bytes.to_vec(),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        review_tv_asset_manifest, verify_tv_asset_bytes, TvAssetIntegrityError, TvAssetKind,
        TvAssetManifestV1, MAX_TV_ASSET_BYTES, TV_ASSET_MANIFEST_SCHEMA, TV_ASSET_MANIFEST_VERSION,
    };

    const IMAGE_URL: &str =
        "crab://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.image";

    const ARTICLE_URL: &str =
        "crab://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.article";

    fn cid(bytes: &[u8]) -> String {
        format!("b3:{}", blake3::hash(bytes).to_hex(),)
    }

    fn manifest(
        kind: TvAssetKind,
        crab_url: &str,
        bytes: &[u8],
        content_type: &str,
    ) -> TvAssetManifestV1 {
        TvAssetManifestV1 {
            schema: TV_ASSET_MANIFEST_SCHEMA.to_string(),
            version: TV_ASSET_MANIFEST_VERSION,
            asset_kind: kind,
            crab_url: crab_url.to_string(),
            content_cid: cid(bytes),
            content_type: content_type.to_string(),
            content_length: bytes.len() as u64,
        }
    }

    #[test]
    fn image_and_article_manifests_bind_to_reviewed_route_truth() {
        for (kind, crab_url, bytes, content_type) in [
            (
                TvAssetKind::Image,
                IMAGE_URL,
                b"small-image".as_slice(),
                "image/png",
            ),
            (
                TvAssetKind::Article,
                ARTICLE_URL,
                b"# Small article".as_slice(),
                "text/markdown; charset=utf-8",
            ),
        ] {
            let input = manifest(kind, crab_url, bytes, content_type);

            let expected_cid = input.content_cid.clone();

            let reviewed = review_tv_asset_manifest(input, crab_url, &expected_cid, kind)
                .expect("reviewed manifest");

            assert_eq!(reviewed.asset_kind, kind);
            assert_eq!(reviewed.crab_url, crab_url);
            assert_eq!(reviewed.content_cid, expected_cid);
            assert_eq!(reviewed.content_length, bytes.len());
        }
    }

    #[test]
    fn strict_manifest_rejects_unknown_schema_version_and_fields() {
        let bytes = b"small-image";

        let valid = manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png");

        let mut value = serde_json::to_value(valid).expect("manifest JSON");

        value["unexpectedAuthority"] = serde_json::json!("forbidden");

        assert!(serde_json::from_value::<TvAssetManifestV1>(value).is_err());

        let mut wrong_schema = manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png");

        wrong_schema.schema = "other.asset-manifest.v1".to_string();

        assert_eq!(
            review_tv_asset_manifest(wrong_schema, IMAGE_URL, &cid(bytes), TvAssetKind::Image,),
            Err(TvAssetIntegrityError::InvalidSchema),
        );

        let mut wrong_version = manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png");

        wrong_version.version = 2;

        assert_eq!(
            review_tv_asset_manifest(wrong_version, IMAGE_URL, &cid(bytes), TvAssetKind::Image,),
            Err(TvAssetIntegrityError::InvalidVersion),
        );
    }

    #[test]
    fn route_cid_kind_and_content_type_mismatches_fail_closed() {
        let bytes = b"small-image";
        let expected_cid = cid(bytes);

        assert_eq!(
            review_tv_asset_manifest(
                manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png",),
                ARTICLE_URL,
                &expected_cid,
                TvAssetKind::Image,
            ),
            Err(TvAssetIntegrityError::CrabUrlMismatch),
        );

        assert_eq!(
            review_tv_asset_manifest(
                manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png",),
                IMAGE_URL,
                &cid(b"other"),
                TvAssetKind::Image,
            ),
            Err(TvAssetIntegrityError::ContentCidMismatch),
        );

        assert_eq!(
            review_tv_asset_manifest(
                manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png",),
                IMAGE_URL,
                &expected_cid,
                TvAssetKind::Article,
            ),
            Err(TvAssetIntegrityError::AssetKindMismatch),
        );

        assert_eq!(
            review_tv_asset_manifest(
                manifest(
                    TvAssetKind::Image,
                    IMAGE_URL,
                    bytes,
                    "text/plain; charset=utf-8",
                ),
                IMAGE_URL,
                &expected_cid,
                TvAssetKind::Image,
            ),
            Err(TvAssetIntegrityError::InvalidContentType),
        );
    }

    #[test]
    fn complete_bytes_return_only_after_full_blake3_verification() {
        let bytes = b"# Small article";

        let input = manifest(
            TvAssetKind::Article,
            ARTICLE_URL,
            bytes,
            "text/markdown; charset=utf-8",
        );

        let expected_cid = input.content_cid.clone();

        let reviewed =
            review_tv_asset_manifest(input, ARTICLE_URL, &expected_cid, TvAssetKind::Article)
                .expect("reviewed manifest");

        let verified = verify_tv_asset_bytes(reviewed, bytes).expect("verified bytes");

        assert_eq!(verified.bytes, bytes);
        assert_eq!(verified.manifest.content_cid, expected_cid);
    }

    #[test]
    fn corrupt_mismatched_and_oversized_bytes_are_rejected() {
        let bytes = b"small-image";

        let input = manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png");

        let expected_cid = input.content_cid.clone();

        let reviewed =
            review_tv_asset_manifest(input, IMAGE_URL, &expected_cid, TvAssetKind::Image)
                .expect("reviewed manifest");

        assert_eq!(
            verify_tv_asset_bytes(reviewed.clone(), b"small-imagf",),
            Err(TvAssetIntegrityError::DigestMismatch),
        );

        assert_eq!(
            verify_tv_asset_bytes(reviewed, b"short"),
            Err(TvAssetIntegrityError::ByteLengthMismatch),
        );

        let mut oversized = manifest(TvAssetKind::Image, IMAGE_URL, bytes, "image/png");

        oversized.content_length = (MAX_TV_ASSET_BYTES as u64) + 1;

        assert_eq!(
            review_tv_asset_manifest(oversized, IMAGE_URL, &expected_cid, TvAssetKind::Image,),
            Err(TvAssetIntegrityError::OversizedContent),
        );
    }
}
