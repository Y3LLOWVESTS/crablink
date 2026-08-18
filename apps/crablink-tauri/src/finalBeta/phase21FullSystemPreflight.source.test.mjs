import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const scriptUrl =
  new URL(
    '../../scripts/final_beta_phase21a_full_system_preflight.sh',
    import.meta.url,
  );

async function source() {
  return readFile(
    scriptUrl,
    'utf8',
  );
}

test(
  'FINAL_BETA Phase21A preflight covers the selected cross-repo product spine',
  async () => {
    const script =
      await source();

    for (
      const required
      of [
        'phase7ProfileTimelineCloseout.test.mjs',
        'phase8LocalFollowingCloseout.test.mjs',
        'phase9LocalFirstHomeFeedCloseout.test.mjs',
        'phase10HomeFeedCloseout.test.mjs',
        'siteTemplateEngineCloseout.test.mjs',
        'blogProductFlow.test.mjs',
        'imageboardProductFlow.test.mjs',
        'forumProductFlow.test.mjs',
        'internal_roc_beta_paid_content_receipt_path',
        'final_beta_phase19_checkpoint_candidate',
        'final_beta_phase19_checkpoint_candidate_reproduction',
        'final_beta_phase19_checkpoint_validator_signature_contract',
        'final_beta_phase19_finalized_checkpoint_contract',
        'final_beta_phase19_operation_replay_duplicate',
        'final_beta_phase19_da_archive_fallback',
        'internal_roc_beta_phase17_epoch_replay',
        'phase19FinalityDisplay.test.mjs',
      ]
    ) {
      assert.equal(
        script.includes(
          required,
        ),
        true,
        `Phase21A preflight is missing required surface: ${required}`,
      );
    }
  },
);

test(
  'FINAL_BETA Phase21A pins completed ROX evidence instead of rerunning historical live sends',
  async () => {
    const script =
      await source();

    assert.match(
      script,
      /ROX_PHASE14_EVIDENCE_PACKAGE/,
    );

    assert.match(
      script,
      /ROX_PHASE15_BUILD_PLAN4_CLOSEOUT/,
    );

    assert.match(
      script,
      /ROX_PHASE7_HISTORICAL_LIVE_RERUN=NO/,
    );

    assert.match(
      script,
      /ROX_PHASE8_HISTORICAL_LIVE_RERUN=NO/,
    );

    assert.match(
      script,
      /PHASE21_NEW_ROX_TRANSACTION_SUBMISSION=NO/,
    );
  },
);

test(
  'FINAL_BETA Phase21A cannot falsely close the full live demonstration',
  async () => {
    const script =
      await source();

    assert.match(
      script,
      /FINAL_BETA_PHASE21A_CROSS_REPO_PREFLIGHT=GREEN/,
    );

    assert.match(
      script,
      /PHASE21_LIVE_NETWORK_STARTED=NO/,
    );

    assert.match(
      script,
      /PHASE21_CLEAN_DESKTOP_MANUAL_DEMO=NO/,
    );

    assert.match(
      script,
      /FINAL_BETA_PHASE21_FULL_SYSTEM_DEMO=NOT_YET_GREEN/,
    );

    assert.match(
      script,
      /NEXT_ACTION=BEGIN_FINAL_BETA_PHASE21B_PRIVATE_NETWORK_BRINGUP/,
    );
  },
);

test(
  'FINAL_BETA Phase21A contains no live ROX approval or production deployment path',
  async () => {
    const script =
      await source();

    for (
      const forbidden
      of [
        'I_APPROVE_PRIVATE_TESTNET_CAPPED_SEND',
        'I_APPROVE_PRIVATE_TESTNET_CAPPED_ROX_TO_ROC_BURN',
        '--execute-live',
        'anchor deploy',
        'mainnet-beta',
        'BUILD_PLAN5_AUTHORIZED=YES',
      ]
    ) {
      assert.equal(
        script.includes(
          forbidden,
        ),
        false,
        `Phase21A preflight contains forbidden live or production token: ${forbidden}`,
      );
    }
  },
);
