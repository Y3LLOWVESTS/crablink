//! RO:WHAT — Strict CrabLink validation of receipt-derived confirmed ROC projections.
//! RO:WHY — Phase 22H permits confirmed ROC display only after wallet receipt,
//! ledger replay, and independent User Node replay all agree.
//! RO:INTERACTS — Phase 22G exported projection and CrabLink wallet display normalization.
//! RO:INVARIANTS — pending evidence never becomes confirmed ROC; client remains display-only.
//! RO:SECURITY — no wallet/ledger mutation, receipt creation, quorum signing, or finality authority.
//! RO:TEST — tests/phase22_confirmed_roc_projection.rs.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};

pub const CONFIRMED_ROC_PROJECTION_SCHEMA: &str = "crablink.phase22.confirmed-roc-projection.v1";

pub const CONFIRMED_ROC_PROJECTION_VERSION: u16 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConfirmedRocProjectionV1 {
    pub schema: String,
    pub version: u16,

    pub epoch_id: String,
    pub account_id: String,

    pub confirmed_roc_minor_units: String,
    pub source: String,

    pub receipt_count: usize,
    pub last_ledger_seq: u64,
    pub last_ledger_root: String,

    pub transition_hash: String,
    pub economics_config_hash: String,

    pub wallet_receipt_confirmed: bool,
    pub ledger_replay_confirmed: bool,
    pub user_node_replay_accepted: bool,

    pub pending_evidence_only: bool,
    pub display_only: bool,

    pub client_wallet_mutation: bool,
    pub client_ledger_mutation: bool,
    pub client_finality_authority: bool,

    pub operation_ids: Vec<String>,
}

impl ConfirmedRocProjectionV1 {
    pub fn validate(&self) -> Result<(), String> {
        if self.schema != CONFIRMED_ROC_PROJECTION_SCHEMA {
            return Err("confirmed ROC projection schema mismatch".to_string());
        }

        if self.version != CONFIRMED_ROC_PROJECTION_VERSION {
            return Err("confirmed ROC projection version mismatch".to_string());
        }

        validate_token("epochId", &self.epoch_id)?;

        validate_token("accountId", &self.account_id)?;

        if self.source != "wallet_ledger_receipt_only" {
            return Err("confirmed ROC source must be wallet_ledger_receipt_only".to_string());
        }

        let amount = self
            .confirmed_roc_minor_units
            .parse::<u128>()
            .map_err(|_| "confirmedRocMinorUnits must be a decimal u128 string".to_string())?;

        if amount == 0 {
            return Err("confirmed ROC amount must be greater than zero".to_string());
        }

        if self.confirmed_roc_minor_units != amount.to_string() {
            return Err("confirmed ROC amount must use canonical decimal form".to_string());
        }

        if self.receipt_count == 0 {
            return Err("confirmed ROC requires at least one wallet/ledger receipt".to_string());
        }

        if self.receipt_count != self.operation_ids.len() {
            return Err("receiptCount must match operationIds".to_string());
        }

        if self.last_ledger_seq == 0 {
            return Err("lastLedgerSeq must be greater than zero".to_string());
        }

        validate_b3("lastLedgerRoot", &self.last_ledger_root)?;

        validate_b3("transitionHash", &self.transition_hash)?;

        validate_b3("economicsConfigHash", &self.economics_config_hash)?;

        let mut previous: Option<&str> = None;

        for operation_id in &self.operation_ids {
            validate_token("operationId", operation_id)?;

            if previous.is_some_and(|value| value >= operation_id.as_str()) {
                return Err("operationIds must be sorted and unique".to_string());
            }

            previous = Some(operation_id);
        }

        if !self.wallet_receipt_confirmed
            || !self.ledger_replay_confirmed
            || !self.user_node_replay_accepted
        {
            return Err(
                "confirmed ROC requires wallet receipt, ledger replay, and User Node replay acceptance"
                    .to_string(),
            );
        }

        if self.pending_evidence_only {
            return Err("pending evidence cannot become confirmed ROC".to_string());
        }

        if !self.display_only {
            return Err("CrabLink confirmed ROC projection must remain display-only".to_string());
        }

        if self.client_wallet_mutation
            || self.client_ledger_mutation
            || self.client_finality_authority
        {
            return Err(
                "CrabLink confirmed ROC projection crossed its client authority boundary"
                    .to_string(),
            );
        }

        Ok(())
    }
}

pub fn parse_confirmed_roc_projection(bytes: &[u8]) -> Result<ConfirmedRocProjectionV1, String> {
    let projection = serde_json::from_slice::<ConfirmedRocProjectionV1>(bytes)
        .map_err(|error| format!("confirmed ROC projection JSON is invalid: {error}"))?;

    projection.validate()?;

    Ok(projection)
}

fn validate_b3(field: &str, value: &str) -> Result<(), String> {
    let digest = value
        .strip_prefix("b3:")
        .ok_or_else(|| format!("{field} must use canonical b3 form"))?;

    if digest.len() != 64
        || !digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err(format!("{field} must be b3:<64 lowercase hex>",));
    }

    Ok(())
}

fn validate_token(field: &str, value: &str) -> Result<(), String> {
    let valid = !value.is_empty()
        && value.len() <= 512
        && value.trim() == value
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b':' | b'.' | b'/')
        });

    if !valid {
        return Err(format!("{field} must be a canonical bounded token",));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> ConfirmedRocProjectionV1 {
        ConfirmedRocProjectionV1 {
            schema: CONFIRMED_ROC_PROJECTION_SCHEMA.to_string(),

            version: CONFIRMED_ROC_PROJECTION_VERSION,

            epoch_id: "epoch:22".to_string(),

            account_id: "acct_phase22_alpha".to_string(),

            confirmed_roc_minor_units: "10000".to_string(),

            source: "wallet_ledger_receipt_only".to_string(),

            receipt_count: 1,
            last_ledger_seq: 1,

            last_ledger_root: format!("b3:{}", "a".repeat(64),),

            transition_hash: format!("b3:{}", "b".repeat(64),),

            economics_config_hash: format!("b3:{}", "c".repeat(64),),

            wallet_receipt_confirmed: true,
            ledger_replay_confirmed: true,
            user_node_replay_accepted: true,

            pending_evidence_only: false,
            display_only: true,

            client_wallet_mutation: false,
            client_ledger_mutation: false,
            client_finality_authority: false,

            operation_ids: vec!["operation:phase22:0001".to_string()],
        }
    }

    #[test]
    fn receipt_backed_projection_validates() {
        fixture().validate().expect("receipt-backed projection");
    }

    #[test]
    fn pending_or_client_authority_projection_rejects() {
        let mut pending = fixture();
        pending.pending_evidence_only = true;

        assert!(pending.validate().is_err());

        let mut mutating = fixture();
        mutating.client_wallet_mutation = true;

        assert!(mutating.validate().is_err());
    }
}
