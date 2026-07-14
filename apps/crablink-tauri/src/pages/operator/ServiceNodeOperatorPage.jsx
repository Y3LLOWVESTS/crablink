/**
 * RO:WHAT — Optional bounded CrabLink Service Node Operator Mode route.
 * RO:WHY — BUILD_PLAN_Z Phase 21; provides a friendly controller without making CrabLink a daemon container.
 * RO:INTERACTS — tauriPlatform.js, serviceNodeOperatorModel.js, operator_node.rs, canonical macronode status.
 * RO:INVARIANTS — disabled by default; route-owned memory only; backend-derived status; explicit signed binding, moderation review, and persistence eligibility actions; no fake durability or direct policy/economic authority.
 * RO:SECURITY — credential uses a password input and is cleared when disabled or the route is destroyed.
 * RO:TEST — operator UI boundary checker, focused Tauri operator tests, and npm run build.
 */

import { useState } from 'react';
import { callTauri } from '../../platform/tauriPlatform.js';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import PersistenceReviewCard from './PersistenceReviewCard.jsx';
import {
  DEFAULT_OPERATOR_CONFIG,
  INITIAL_OPERATOR_STATUS,
  hasConfirmedIssuance,
  normalizeOperatorConfig,
  normalizeOperatorStatus,
  summaryValue,
} from '../../shared/operator/serviceNodeOperatorModel.js';
import './operator.css';

export default function ServiceNodeOperatorPage({ app }) {
  const [config, setConfig] = useState(DEFAULT_OPERATOR_CONFIG);
  const [status, setStatus] = useState(INITIAL_OPERATOR_STATUS);
  const [rewardAddress, setRewardAddress] = useState('');
  const [bindingAcknowledged, setBindingAcknowledged] = useState(false);
  const [binding, setBinding] = useState({
    state: 'idle',
    message: 'No reward-recipient binding request has been submitted.',
    result: null,
  });
  const [moderation, setModeration] = useState({
    state: 'idle',
    items: [],
    selectedSequence: null,
    selectedAction: '',
    acknowledged: false,
    message: 'Moderation-review queue has not been loaded.',
  });

  const checking = status.state === 'checking';
  const summary = status.summary;

  const updateConfig = (patch = {}) => {
    setConfig((current) =>
      normalizeOperatorConfig({
        ...current,
        ...patch,
        adminToken:
          patch.enabled === false
            ? ''
            : patch.adminToken === undefined
              ? current.adminToken
              : patch.adminToken,
      }),
    );

    if (patch.enabled === false) {
      setStatus(INITIAL_OPERATOR_STATUS);
    } else if (
      patch.enabled === true ||
      patch.connectionMode !== undefined ||
      patch.baseUrl !== undefined
    ) {
      setStatus({
        ...INITIAL_OPERATOR_STATUS,
        state: 'configured',
        label:
          'Service Node connection configured; status not checked',
      });
    }
  };

  const changeMode = (event) => {
    const connectionMode =
      event.target.value === 'remote' ? 'remote' : 'local';

    updateConfig({
      connectionMode,
      baseUrl:
        connectionMode === 'remote'
          ? 'https://service-node.example'
          : 'http://127.0.0.1:8080',
    });
  };

  const checkStatus = async () => {
    setStatus((current) => ({
      ...current,
      state: 'checking',
      label: 'Checking canonical Service Node status…',
      error: null,
    }));

    try {
      const data = await callTauri(
        'service_node_operator_status',
        { request: config },
      );

      const next = normalizeOperatorStatus(data);
      setStatus(next);

      app?.notify?.({
        title:
          next.state === 'online'
            ? 'Service Node connected'
            : 'Service Node status unavailable',
        message: next.label,
        tone:
          next.state === 'online'
            ? 'success'
            : 'warning',
      });
    } catch (error) {
      const next = {
        ...INITIAL_OPERATOR_STATUS,
        state: 'offline',
        label:
          error?.message ||
          'Service Node status check failed without affecting normal CrabLink use.',
        checkedAt: new Date().toISOString(),
        error,
      };

      setStatus(next);

      app?.notify?.({
        title: 'Service Node unavailable',
        message: next.label,
        tone: 'warning',
      });
    }
  };

  const bindRewardRecipient = async () => {
    setBinding({
      state: 'submitting',
      message: 'Signing and submitting the explicit binding request…',
      result: null,
    });

    try {
      const result = await callTauri(
        'service_node_operator_bind_reward_recipient',
        {
          request: {
            ...config,
            rewardRecipientDisplayAddress: rewardAddress,
          },
        },
      );

      if (result?.signedIntentVerified !== true) {
        throw new Error(
          'Service Node did not prove signed-intent verification.',
        );
      }

      if (
        result?.registryFinality === true ||
        result?.walletMutation === true ||
        result?.ledgerMutation === true ||
        result?.confirmedRoc != null
      ) {
        throw new Error(
          'Service Node response crossed the CrabLink non-authority boundary.',
        );
      }

      setBinding({
        state: 'accepted',
        message:
          result?.note ||
          'Signed binding request was recorded by the Service Node.',
        result,
      });

      await checkStatus();

      updateConfig({ adminToken: '' });
      setBindingAcknowledged(false);

      app?.notify?.({
        title: 'Reward binding request recorded',
        message:
          'Signed intent verified. Registry finality, payout, receipt, and confirmed ROC remain separate.',
        tone: 'success',
      });
    } catch (error) {
      setBinding({
        state: 'rejected',
        message:
          error?.message ||
          'Signed reward-recipient binding was rejected.',
        result: null,
      });

      app?.notify?.({
        title: 'Reward binding rejected',
        message:
          error?.message ||
          'The Service Node rejected the signed binding request.',
        tone: 'warning',
      });
    }
  };

  const loadModerationReviews = async () => {
    setModeration((current) => ({
      ...current,
      state: 'loading',
      message: 'Loading the bounded moderation-review queue…',
    }));

    try {
      const result = await callTauri(
        'service_node_operator_moderation_pending',
        {
          request: {
            ...config,
            limit: 100,
          },
        },
      );

      if (
        result?.policyMutation === true ||
        result?.runtimeActivation === true ||
        result?.storageDelete === true ||
        result?.providerWithdrawal === true ||
        result?.rewardFinality === true ||
        result?.walletMutation === true ||
        result?.ledgerMutation === true
      ) {
        throw new Error(
          'Service Node moderation response crossed the CrabLink non-authority boundary.',
        );
      }

      const items = Array.isArray(result?.items)
        ? result.items
        : [];

      setModeration({
        state: 'loaded',
        items,
        selectedSequence: null,
        selectedAction: '',
        acknowledged: false,
        message:
          items.length === 0
            ? 'No moderation-review items are pending.'
            : `${items.length} moderation-review item${items.length === 1 ? '' : 's'} pending.`,
      });

      app?.notify?.({
        title: 'Moderation queue loaded',
        message:
          items.length === 0
            ? 'No review items are pending.'
            : `${items.length} bounded review item${items.length === 1 ? '' : 's'} loaded.`,
        tone: 'success',
      });
    } catch (error) {
      setModeration((current) => ({
        ...current,
        state: 'error',
        message:
          error?.message ||
          'The Service Node moderation-review queue could not be loaded.',
      }));

      app?.notify?.({
        title: 'Moderation queue unavailable',
        message:
          error?.message ||
          'The Service Node moderation-review queue could not be loaded.',
        tone: 'warning',
      });
    }
  };

  const selectModerationDecision = (
    sequence,
    action,
  ) => {
    setModeration((current) => ({
      ...current,
      selectedSequence: sequence,
      selectedAction: action,
      acknowledged: false,
      message:
        action === 'approve'
          ? `Review item ${sequence} selected for escalation approval.`
          : `Review item ${sequence} selected for rejection.`,
    }));
  };

  const decideModerationReview = async () => {
    const sequence = moderation.selectedSequence;
    const action = moderation.selectedAction;

    if (!sequence || !action) {
      return;
    }

    setModeration((current) => ({
      ...current,
      state: 'submitting',
      message:
        action === 'approve'
          ? `Approving review item ${sequence} for escalation…`
          : `Rejecting review item ${sequence}…`,
    }));

    try {
      const result = await callTauri(
        'service_node_operator_moderation_decide',
        {
          request: {
            ...config,
            sequence,
            action,
          },
        },
      );

      if (
        result?.policyMutation === true ||
        result?.runtimeActivation === true ||
        result?.storageDelete === true ||
        result?.providerWithdrawal === true ||
        result?.rewardFinality === true ||
        result?.walletMutation === true ||
        result?.ledgerMutation === true
      ) {
        throw new Error(
          'Service Node moderation decision crossed the CrabLink non-authority boundary.',
        );
      }

      await loadModerationReviews();
      await checkStatus();

      setModeration((current) => ({
        ...current,
        selectedSequence: null,
        selectedAction: '',
        acknowledged: false,
        message:
          action === 'approve'
            ? `Review item ${sequence} was approved for escalation only.`
            : `Review item ${sequence} was rejected.`,
      }));

      app?.notify?.({
        title:
          action === 'approve'
            ? 'Review approved for escalation'
            : 'Review item rejected',
        message:
          'Review metadata changed. Policy, runtime, storage, providers, rewards, wallet, and ledger were not mutated.',
        tone: 'success',
      });
    } catch (error) {
      setModeration((current) => ({
        ...current,
        state: 'error',
        message:
          error?.message ||
          'The moderation-review decision was rejected.',
      }));

      app?.notify?.({
        title: 'Moderation decision rejected',
        message:
          error?.message ||
          'The Service Node rejected the moderation-review decision.',
        tone: 'warning',
      });
    }
  };

  return (
    <section className="cl-page cl-operator-page">
      <PageHeader
        eyebrow="Phase 21 · Optional controller"
        title="Service Node Operator Mode"
        copy="Attach CrabLink to a local or remote Service Node for canonical status, signed reward binding, bounded moderation review, and explicit persistence eligibility review. The daemon remains headless and independent."
        meta={(
          <div className="cl-operator-badges">
            <Badge
              tone={config.enabled ? 'warning' : 'neutral'}
            >
              {config.enabled
                ? 'explicitly enabled'
                : 'disabled by default'}
            </Badge>

            <Badge
              tone={
                status.state === 'online'
                  ? 'success'
                  : 'neutral'
              }
            >
              {status.state}
            </Badge>

            <Badge tone="neutral">bounded controls</Badge>
          </div>
        )}
      />

      <TruthBoundary
        tone="info"
        title="Controller, not authority"
        copy="This route cannot start or stop the daemon, mutate or activate policy, write or guarantee durable bytes, delete storage, withdraw providers, create wallet or ledger truth, create receipts, or claim external finality. Reward binding, moderation review, and persistence review are bounded explicit metadata requests only."
      />

      <div className="cl-operator-layout">
        <Card
          eyebrow="Connection profile"
          title="Attach explicitly"
        >
          <div className="cl-operator-form">
            <label className="cl-operator-enable">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) =>
                  updateConfig({
                    enabled: event.target.checked,
                  })
                }
              />

              <span>
                <strong>
                  Enable Service Node Operator Mode
                </strong>
                <small>
                  Turning this off clears the
                  administrator credential from memory.
                </small>
              </span>
            </label>

            <Field
              label="Connection mode"
              help="Local is loopback-only. Remote is validated by Rust as non-loopback HTTPS."
            >
              <select
                className="cl-input cl-input-md"
                value={config.connectionMode}
                onChange={changeMode}
                disabled={!config.enabled}
              >
                <option value="local">
                  Local Service Node
                </option>
                <option value="remote">
                  Remote Service Node
                </option>
              </select>
            </Field>

            <Field
              label="Service Node admin URL"
              required
            >
              <TextInput
                value={config.baseUrl}
                onChange={(event) =>
                  updateConfig({
                    baseUrl: event.target.value,
                  })
                }
                disabled={!config.enabled}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Administrator credential"
              help="Held only in this route's React memory; never written to settings or browser storage."
            >
              <TextInput
                type="password"
                value={config.adminToken}
                onChange={(event) =>
                  updateConfig({
                    adminToken: event.target.value,
                  })
                }
                disabled={!config.enabled}
                autoComplete="new-password"
              />
            </Field>

            <div className="cl-operator-actions">
              <Button
                onClick={checkStatus}
                disabled={!config.enabled || checking}
              >
                {checking
                  ? 'Checking canonical status…'
                  : 'Check read-only status'}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  updateConfig({ adminToken: '' })
                }
                disabled={!config.adminToken}
              >
                Clear credential
              </Button>
            </div>
          </div>
        </Card>

        <Card
          eyebrow="Connection truth"
          title="Canonical attachment state"
        >
          <dl className="cl-operator-facts">
            <Fact
              label="State"
              value={status.state}
            />
            <Fact
              label="Mode"
              value={config.connectionMode}
            />
            <Fact
              label="Endpoint"
              value={config.baseUrl}
            />
            <Fact
              label="Credential"
              value={
                config.adminToken
                  ? 'present in memory'
                  : 'not supplied'
              }
            />
            <Fact
              label="Last checked"
              value={formatDate(status.checkedAt)}
            />
          </dl>

          <p className="cl-muted">
            {status.label}
          </p>
        </Card>
      </div>

      <Card
        eyebrow="Backend projection"
        title="Service Node status"
      >
        {summary ? (
          <div className="cl-operator-status-grid">
            <Status
              label="Node role"
              value={value(
                summary,
                'nodeRole',
                'node_role',
              )}
            />
            <Status
              label="Profile"
              value={value(summary, 'profile')}
            />
            <Status
              label="Lifecycle"
              value={value(
                summary,
                'lifecycleState',
                'lifecycle_state',
              )}
            />
            <Status
              label="Readiness"
              value={value(
                summary,
                'readinessState',
                'readiness_state',
                'ready',
              )}
            />
            <Status
              label="Headless mode"
              value={value(
                summary,
                'headlessMode',
                'headless_mode',
              )}
            />
            <Status
              label="Admin UI required"
              value={value(
                summary,
                'adminUiRuntimeRequired',
                'admin_ui_runtime_required',
              )}
            />
            <Status
              label="Moderation pending"
              value={value(
                summary,
                'moderationPendingReview',
                'moderation_pending_review',
              )}
            />
            <Status
              label="Persistence pending"
              value={value(
                summary,
                'persistencePendingReview',
                'persistence_pending_review',
              )}
            />
            <Status
              label="Reward binding"
              value={value(
                summary,
                'rewardBindingState',
                'reward_binding_state',
              )}
            />
            <Status
              label="Reward recipient"
              value={value(
                summary,
                'rewardRecipientDisplayAddress',
                'reward_recipient_display_address',
              )}
            />
            <Status
              label="Accepted receipts"
              value={value(
                summary,
                'acceptedWalletLedgerReceipts',
                'accepted_wallet_ledger_receipts',
              )}
            />
          </div>
        ) : (
          <p className="cl-muted">
            No canonical Service Node summary is
            attached. Connection failure affects
            this route only.
          </p>
        )}
      </Card>

      <Card
        eyebrow="Economic truth"
        title="Confirmed ROC issuance evidence"
      >
        {hasConfirmedIssuance(status) ? (
          <div className="cl-operator-receipt">
            <Badge tone="success">
              canonical ledger receipt evidence attached
            </Badge>
            <p>
              Internal ROC evidence only—not ROX
              settlement, Solana finality, or external
              finality.
            </p>
          </div>
        ) : (
          <div className="cl-operator-receipt">
            <Badge tone="neutral">
              no confirmed receipt evidence
            </Badge>
            <p>
              Pending reward plans, evidence counts,
              quorum eligibility, binding state, and
              client cache are not confirmed ROC.
            </p>
          </div>
        )}
      </Card>

      <Card
        eyebrow="Signed operator intent"
        title="Bind the Service Node reward recipient"
      >
        <TruthBoundary
          tone="warning"
          title="Binding is not payment"
          copy="This submits an authenticated runtime-local binding request. It does not prove registry finality, create a wallet payout, append a ledger receipt, or confirm ROC."
        />

        <div className="cl-operator-binding-grid">
          <Field
            label="CrabLink reward recipient"
            help="Canonical lowercase CrabLink/RON display address, for example @operator."
            required
          >
            <TextInput
              value={rewardAddress}
              onChange={(event) => {
                setRewardAddress(event.target.value);
                setBinding({
                  state: 'idle',
                  message:
                    'Address changed; no request has been submitted.',
                  result: null,
                });
              }}
              placeholder="@operator"
              disabled={!config.enabled || binding.state === 'submitting'}
              autoComplete="off"
            />
          </Field>

          <div className="cl-operator-binding-review">
            <Fact
              label="Service Node"
              value={config.baseUrl}
            />
            <Fact
              label="Connection"
              value={status.state}
            />
            <Fact
              label="Credential"
              value={
                config.adminToken
                  ? 'present in memory'
                  : 'required'
              }
            />
            <Fact
              label="Submission truth"
              value="signed request only"
            />
          </div>
        </div>

        <label className="cl-operator-enable">
          <input
            type="checkbox"
            checked={bindingAcknowledged}
            onChange={(event) =>
              setBindingAcknowledged(event.target.checked)
            }
            disabled={!config.enabled || binding.state === 'submitting'}
          />

          <span>
            <strong>
              I understand this records a binding request only
            </strong>
            <small>
              Registry acceptance, wallet mutation, ledger receipt,
              confirmed ROC, ROX settlement, and external finality are
              not created by this action.
            </small>
          </span>
        </label>

        <div className="cl-operator-actions">
          <Button
            onClick={bindRewardRecipient}
            disabled={
              !config.enabled ||
              status.state !== 'online' ||
              !config.adminToken ||
              !rewardAddress.trim() ||
              !bindingAcknowledged ||
              binding.state === 'submitting'
            }
          >
            {binding.state === 'submitting'
              ? 'Submitting signed intent…'
              : 'Sign and submit binding request'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setRewardAddress('');
              setBindingAcknowledged(false);
              setBinding({
                state: 'idle',
                message:
                  'Binding form cleared; no request has been submitted.',
                result: null,
              });
            }}
            disabled={binding.state === 'submitting'}
          >
            Clear binding form
          </Button>
        </div>

        <div className="cl-operator-binding-result">
          <Badge
            tone={
              binding.state === 'accepted'
                ? 'success'
                : binding.state === 'rejected'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {binding.state}
          </Badge>

          <p>{binding.message}</p>

          {binding.result ? (
            <dl className="cl-operator-facts">
              <Fact
                label="Backend state"
                value={binding.result.state || 'not reported'}
              />
              <Fact
                label="Recipient"
                value={
                  binding.result.rewardRecipientDisplayAddress ||
                  'not reported'
                }
              />
              <Fact
                label="Signed intent"
                value={
                  binding.result.signedIntentVerified
                    ? 'verified'
                    : 'not verified'
                }
              />
              <Fact
                label="Registry finality"
                value={
                  binding.result.registryFinality
                    ? 'reported true — rejected'
                    : 'not claimed'
                }
              />
              <Fact
                label="Wallet mutation"
                value={
                  binding.result.walletMutation
                    ? 'reported true — rejected'
                    : 'none'
                }
              />
              <Fact
                label="Ledger mutation"
                value={
                  binding.result.ledgerMutation
                    ? 'reported true — rejected'
                    : 'none'
                }
              />
              <Fact
                label="Confirmed ROC"
                value={
                  binding.result.confirmedRoc == null
                    ? 'not created'
                    : 'unexpected — rejected'
                }
              />
            </dl>
          ) : null}
        </div>
      </Card>

      <Card
        eyebrow="Bounded operator review"
        title="Moderation-review queue"
      >
        <TruthBoundary
          tone="warning"
          title="Review is not policy mutation"
          copy="Approve marks a finding for escalation. Reject dismisses the review item. Neither action edits or activates policy, deletes storage, withdraws providers, or creates economic truth."
        />

        <div className="cl-operator-actions">
          <Button
            onClick={loadModerationReviews}
            disabled={
              !config.enabled ||
              status.state !== 'online' ||
              !config.adminToken ||
              moderation.state === 'loading' ||
              moderation.state === 'submitting'
            }
          >
            {moderation.state === 'loading'
              ? 'Loading moderation queue…'
              : 'Load pending moderation reviews'}
          </Button>
        </div>

        <div className="cl-operator-moderation-summary">
          <Badge
            tone={
              moderation.state === 'error'
                ? 'warning'
                : moderation.items.length > 0
                  ? 'warning'
                  : 'neutral'
            }
          >
            {moderation.state}
          </Badge>
          <p>{moderation.message}</p>
        </div>

        <div className="cl-operator-review-list">
          {moderation.items.map((item) => (
            <article
              key={item.sequence}
              className={
                moderation.selectedSequence === item.sequence
                  ? 'is-selected'
                  : ''
              }
            >
              <div className="cl-operator-review-heading">
                <div>
                  <span>Review #{item.sequence}</span>
                  <strong>{item.object}</strong>
                </div>
                <Badge tone="warning">
                  {item.state || 'pending_review'}
                </Badge>
              </div>

              <dl className="cl-operator-facts">
                <Fact
                  label="Source"
                  value={item.source || 'not reported'}
                />
                <Fact
                  label="Reason"
                  value={item.reason || 'not reported'}
                />
                <Fact
                  label="Effective policy"
                  value={
                    item.effectivePolicyReason ||
                    'not reported'
                  }
                />
                <Fact
                  label="Currently permits serve"
                  value={
                    item.currentlyPermitsServe
                      ? 'yes'
                      : 'no'
                  }
                />
              </dl>

              <div className="cl-operator-actions">
                <Button
                  onClick={() =>
                    selectModerationDecision(
                      item.sequence,
                      'approve',
                    )
                  }
                  disabled={
                    moderation.state === 'submitting'
                  }
                >
                  Approve for escalation
                </Button>

                <Button
                  variant="secondary"
                  onClick={() =>
                    selectModerationDecision(
                      item.sequence,
                      'reject',
                    )
                  }
                  disabled={
                    moderation.state === 'submitting'
                  }
                >
                  Reject review item
                </Button>
              </div>
            </article>
          ))}
        </div>

        {moderation.selectedSequence ? (
          <div className="cl-operator-review-confirm">
            <Fact
              label="Selected review"
              value={`#${moderation.selectedSequence}`}
            />
            <Fact
              label="Selected action"
              value={
                moderation.selectedAction === 'approve'
                  ? 'approve for escalation'
                  : 'reject review item'
              }
            />

            <label className="cl-operator-enable">
              <input
                type="checkbox"
                checked={moderation.acknowledged}
                onChange={(event) =>
                  setModeration((current) => ({
                    ...current,
                    acknowledged:
                      event.target.checked,
                  }))
                }
                disabled={
                  moderation.state === 'submitting'
                }
              />

              <span>
                <strong>
                  I understand this changes review metadata only
                </strong>
                <small>
                  This does not mutate or activate policy,
                  delete bytes, withdraw providers, finalize
                  rewards, mutate a wallet or ledger, or create
                  a receipt.
                </small>
              </span>
            </label>

            <div className="cl-operator-actions">
              <Button
                onClick={decideModerationReview}
                disabled={
                  !moderation.acknowledged ||
                  moderation.state === 'submitting'
                }
              >
                {moderation.state === 'submitting'
                  ? 'Submitting explicit decision…'
                  : moderation.selectedAction === 'approve'
                    ? 'Confirm escalation approval'
                    : 'Confirm review rejection'}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setModeration((current) => ({
                    ...current,
                    selectedSequence: null,
                    selectedAction: '',
                    acknowledged: false,
                    message:
                      'Moderation-review selection cleared.',
                  }))
                }
                disabled={
                  moderation.state === 'submitting'
                }
              >
                Clear review selection
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <PersistenceReviewCard
        app={app}
        config={config}
        status={status}
        refreshStatus={checkStatus}
      />
    </section>
  );
}

function value(summary, ...keys) {
  const raw = summaryValue(summary, keys);

  if (raw === true) {
    return 'yes';
  }

  if (raw === false) {
    return 'no';
  }

  if (raw == null || raw === '') {
    return 'not reported';
  }

  if (Array.isArray(raw)) {
    return String(raw.length);
  }

  if (typeof raw === 'object') {
    return 'reported by backend';
  }

  return String(raw);
}

function formatDate(value) {
  const parsed = Date.parse(String(value || ''));

  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleString()
    : 'not checked';
}

function Fact({ label, value: factValue }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{factValue}</dd>
    </div>
  );
}

function Status({ label, value: statusValue }) {
  return (
    <div className="cl-operator-status-item">
      <span>{label}</span>
      <strong>{statusValue}</strong>
    </div>
  );
}

function Parked({ title, copy }) {
  return (
    <article>
      <Badge tone="neutral">parked</Badge>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
