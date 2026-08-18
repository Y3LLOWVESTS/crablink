import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const scriptUrl =
  new URL(
    '../../scripts/final_beta_phase21b_private_network_bringup.sh',
    import.meta.url,
  );

async function source() {
  return readFile(
    scriptUrl,
    'utf8',
  );
}

test(
  'Phase21B uses the existing real three-Service one-User topology',
  async () => {
    const script =
      await source();

    assert.match(
      script,
      /phase22_local_two_node_topology/,
    );

    assert.match(
      script,
      /phase19_live_three_service_one_user_topology_survives_member_loss_and_restart/,
    );

    assert.match(
      script,
      /PHASE21_STEP2_MULTIPLE_SERVICE_NODES=3_GREEN/,
    );

    assert.match(
      script,
      /PHASE21_STEP3_USER_NODE_VERIFIER=1_GREEN/,
    );
  },
);

test(
  'Phase21B builds and executes real node binaries rather than a mock topology',
  async () => {
    const script =
      await source();

    assert.match(
      script,
      /cargo build[\s\S]*-p macronode/,
    );

    assert.match(
      script,
      /cargo build[\s\S]*-p micronode/,
    );

    assert.match(
      script,
      /--ignored/,
    );

    assert.match(
      script,
      /--nocapture/,
    );

    assert.match(
      script,
      /--test-threads=1/,
    );
  },
);

test(
  'Phase21B preserves non-authority and private-network boundaries',
  async () => {
    const script =
      await source();

    for (
      const required
      of [
        'WALLET_MUTATION=NO',
        'LEDGER_MUTATION=NO',
        'CRABLINK_FINALITY_AUTHORITY=NO',
        'ROX_TRANSACTION_SUBMISSION=NO',
        'PUBLIC_NETWORK_BIND=NO',
        'MAINNET=NO',
      ]
    ) {
      assert.equal(
        script.includes(
          required,
        ),
        true,
        `missing Phase21B boundary: ${required}`,
      );
    }
  },
);

test(
  'Phase21B cannot falsely close the complete Phase21 demonstration',
  async () => {
    const script =
      await source();

    assert.match(
      script,
      /FINAL_BETA_PHASE21B_PRIVATE_NETWORK_BRINGUP=GREEN/,
    );

    assert.match(
      script,
      /FINAL_BETA_PHASE21_FULL_SYSTEM_DEMO=NOT_YET_GREEN/,
    );

    assert.match(
      script,
      /NEXT_ACTION=BEGIN_FINAL_BETA_PHASE21C_CLEAN_DESKTOP_NETWORK_SESSION/,
    );
  },
);

test(
  'Phase21B contains no ROX send or production deployment authority',
  async () => {
    const script =
      await source();

    for (
      const forbidden
      of [
        'I_APPROVE_PRIVATE_TESTNET_CAPPED_SEND',
        'I_APPROVE_PRIVATE_TESTNET_CAPPED_ROX_TO_ROC_BURN',
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
        `forbidden live authority token present: ${forbidden}`,
      );
    }
  },
);
