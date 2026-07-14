/**
 * RO:WHAT — Explicit bounded persistence-review controls for CrabLink Operator Mode.
 * RO:WHY — Phase 21 requires useful approve/reject UX without treating eligibility as durable bytes.
 * RO:INTERACTS — operator_persistence_review.rs and canonical Service Node status refresh.
 * RO:INVARIANTS — route-owned memory; explicit acknowledgment; backend-confirmed transitions only.
 * RO:SECURITY — no credential storage; no policy, storage, provider, reward, wallet, ledger, or finality claims.
 * RO:TEST — persistence-review boundary checker and production Vite build.
 */

import { useState } from 'react';
import { callTauri } from '../../platform/tauriPlatform.js';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';

const INITIAL_PERSISTENCE_STATE = {
  state: 'idle',
  items: [],
  selectedObject: null,
  selectedAction: '',
  acknowledged: false,
  message: 'Persistence-review queue has not been loaded.',
};

export default function PersistenceReviewCard({
  app,
  config,
  status,
  refreshStatus,
}) {
  const [persistence, setPersistence] = useState(
    INITIAL_PERSISTENCE_STATE,
  );

  const selectedItem = persistence.items.find(
    (item) => item.object === persistence.selectedObject,
  );

  const loading =
    persistence.state === 'loading' ||
    persistence.state === 'submitting';

  const loadPersistenceCandidates = async () => {
    setPersistence((current) => ({
      ...current,
      state: 'loading',
      message: 'Loading bounded persistence candidates…',
    }));

    try {
      const result = await callTauri(
        'service_node_operator_persistence_pending',
        {
          request: {
            ...config,
            limit: 100,
          },
        },
      );

      assertNonAuthority(result);

      const items = Array.isArray(result?.items)
        ? result.items
        : [];

      setPersistence({
        state: 'loaded',
        items,
        selectedObject: null,
        selectedAction: '',
        acknowledged: false,
        message:
          items.length === 0
            ? 'No persistence candidates are awaiting review.'
            : `${items.length} persistence candidate${items.length === 1 ? '' : 's'} awaiting review.`,
      });

      app?.notify?.({
        title: 'Persistence queue loaded',
        message:
          items.length === 0
            ? 'No persistence candidates are awaiting review.'
            : `${items.length} bounded persistence candidate${items.length === 1 ? '' : 's'} loaded.`,
        tone: 'success',
      });
    } catch (error) {
      setPersistence((current) => ({
        ...current,
        state: 'error',
        message:
          error?.message ||
          'The Service Node persistence queue could not be loaded.',
      }));

      app?.notify?.({
        title: 'Persistence queue unavailable',
        message:
          error?.message ||
          'The Service Node persistence queue could not be loaded.',
        tone: 'warning',
      });
    }
  };

  const selectDecision = (
    object,
    action,
  ) => {
    setPersistence((current) => ({
      ...current,
      selectedObject: object,
      selectedAction: action,
      acknowledged: false,
      message: decisionSelectionMessage(
        object,
        action,
      ),
    }));
  };

  const submitDecision = async () => {
    if (
      !persistence.selectedObject ||
      !persistence.selectedAction
    ) {
      return;
    }

    const object = persistence.selectedObject;
    const action = persistence.selectedAction;

    setPersistence((current) => ({
      ...current,
      state: 'submitting',
      message: decisionProgressMessage(
        object,
        action,
      ),
    }));

    try {
      const result = await callTauri(
        'service_node_operator_persistence_decide',
        {
          request: {
            ...config,
            object,
            action,
          },
        },
      );

      assertNonAuthority(result);
      assertDecisionResult(
        result,
        object,
        action,
      );

      await loadPersistenceCandidates();
      await refreshStatus?.();

      setPersistence((current) => ({
        ...current,
        selectedObject: null,
        selectedAction: '',
        acknowledged: false,
        message: decisionCompleteMessage(
          object,
          action,
        ),
      }));

      app?.notify?.({
        title: decisionNotificationTitle(action),
        message:
          action === 'approve'
            ? 'Eligibility metadata changed. No durable bytes were written.'
            : 'Persistence-review metadata changed without creating storage or economic authority.',
        tone: 'success',
      });
    } catch (error) {
      setPersistence((current) => ({
        ...current,
        state: 'error',
        message:
          error?.message ||
          'The persistence-review decision was rejected.',
      }));

      app?.notify?.({
        title: 'Persistence decision rejected',
        message:
          error?.message ||
          'The Service Node rejected the persistence-review decision.',
        tone: 'warning',
      });
    }
  };

  return (
    <Card
      eyebrow="Bounded storage review"
      title="Persistence-review queue"
    >
      <TruthBoundary
        tone="warning"
        title="Eligibility is not durable storage"
        copy="Approval may mark an exact object as verified_persistent and durable-storage eligible. It does not write durable bytes, pin the object, guarantee residency, override moderation, mutate a wallet or ledger, or create external finality."
      />

      <div className="cl-operator-actions">
        <Button
          onClick={loadPersistenceCandidates}
          disabled={
            !config.enabled ||
            status.state !== 'online' ||
            !config.adminToken ||
            loading
          }
        >
          {persistence.state === 'loading'
            ? 'Loading persistence queue…'
            : 'Load persistence candidates'}
        </Button>
      </div>

      <div className="cl-operator-moderation-summary">
        <Badge
          tone={
            persistence.state === 'error'
              ? 'warning'
              : persistence.items.length > 0
                ? 'warning'
                : 'neutral'
          }
        >
          {persistence.state}
        </Badge>

        <p>{persistence.message}</p>
      </div>

      <div className="cl-operator-review-list">
        {persistence.items.map((item) => (
          <article
            key={item.object}
            className={
              persistence.selectedObject === item.object
                ? 'is-selected'
                : ''
            }
          >
            <div className="cl-operator-review-heading">
              <div>
                <span>
                  {item.assetKind || 'unknown asset kind'}
                </span>
                <strong>{item.object}</strong>
              </div>

              <Badge tone="warning">
                {item.state || 'unknown'}
              </Badge>
            </div>

            <dl className="cl-operator-facts">
              <Fact
                label="Asset kind"
                value={item.assetKind || 'not reported'}
              />

              <Fact
                label="Lifecycle state"
                value={item.state || 'not reported'}
              />

              <Fact
                label="Durable eligibility"
                value={
                  item.durableStorageEligible
                    ? 'reported true — rejected by queue validation'
                    : 'not yet eligible'
                }
              />

              <Fact
                label="Durable bytes"
                value="not written"
              />
            </dl>

            <div className="cl-operator-actions">
              {item.state === 'ephemeral_unvetted' ? (
                <Button
                  onClick={() =>
                    selectDecision(
                      item.object,
                      'submit',
                    )
                  }
                  disabled={loading}
                >
                  Submit for review
                </Button>
              ) : null}

              {item.state === 'pending_review' ? (
                <Button
                  onClick={() =>
                    selectDecision(
                      item.object,
                      'approve',
                    )
                  }
                  disabled={loading}
                >
                  Approve persistence eligibility
                </Button>
              ) : null}

              <Button
                variant="secondary"
                onClick={() =>
                  selectDecision(
                    item.object,
                    'reject',
                  )
                }
                disabled={loading}
              >
                Reject persistence
              </Button>
            </div>
          </article>
        ))}
      </div>

      {selectedItem ? (
        <div className="cl-operator-review-confirm">
          <Fact
            label="Selected object"
            value={selectedItem.object}
          />

          <Fact
            label="Selected action"
            value={selectedActionLabel(
              persistence.selectedAction,
            )}
          />

          <Fact
            label="Current state"
            value={selectedItem.state}
          />

          <Fact
            label="Durable-byte result"
            value="none"
          />

          <label className="cl-operator-enable">
            <input
              type="checkbox"
              checked={persistence.acknowledged}
              onChange={(event) =>
                setPersistence((current) => ({
                  ...current,
                  acknowledged:
                    event.target.checked,
                }))
              }
              disabled={loading}
            />

            <span>
              <strong>
                I understand approval changes eligibility metadata only
              </strong>

              <small>
                This does not write or guarantee durable bytes,
                pin content, override moderation, withdraw providers,
                finalize rewards, mutate a wallet or ledger, or
                create a receipt or external finality.
              </small>
            </span>
          </label>

          <div className="cl-operator-actions">
            <Button
              onClick={submitDecision}
              disabled={
                !persistence.acknowledged ||
                loading
              }
            >
              {persistence.state === 'submitting'
                ? 'Submitting explicit decision…'
                : confirmationLabel(
                    persistence.selectedAction,
                  )}
            </Button>

            <Button
              variant="secondary"
              onClick={() =>
                setPersistence((current) => ({
                  ...current,
                  selectedObject: null,
                  selectedAction: '',
                  acknowledged: false,
                  message:
                    'Persistence-review selection cleared.',
                }))
              }
              disabled={loading}
            >
              Clear persistence selection
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function assertNonAuthority(result) {
  if (
    result?.durableBytesWritten === true ||
    result?.walletMutation === true ||
    result?.ledgerMutation === true ||
    result?.policyMutation === true ||
    result?.runtimeActivation === true ||
    result?.storageDelete === true ||
    result?.providerWithdrawal === true ||
    result?.rewardFinality === true ||
    result?.externalFinality === true
  ) {
    throw new Error(
      'Service Node persistence response crossed the CrabLink non-authority boundary.',
    );
  }
}

function assertDecisionResult(
  result,
  object,
  action,
) {
  const expected = {
    submit: {
      action: 'submit_for_review',
      state: 'pending_review',
      eligible: false,
    },
    approve: {
      action: 'approve',
      state: 'verified_persistent',
      eligible: true,
    },
    reject: {
      action: 'reject',
      state: 'operator_blocked',
      eligible: false,
    },
  }[action];

  if (
    !expected ||
    result?.action !== expected.action ||
    result?.candidate?.object !== object ||
    result?.candidate?.state !== expected.state ||
    result?.candidate?.durableStorageEligible !==
      expected.eligible
  ) {
    throw new Error(
      'Service Node persistence result did not match the explicit requested transition.',
    );
  }
}

function decisionSelectionMessage(
  object,
  action,
) {
  switch (action) {
    case 'submit':
      return `${object} selected for persistence review submission.`;

    case 'approve':
      return `${object} selected for persistence-eligibility approval.`;

    case 'reject':
      return `${object} selected for persistence rejection.`;

    default:
      return 'Persistence-review selection changed.';
  }
}

function decisionProgressMessage(
  object,
  action,
) {
  switch (action) {
    case 'submit':
      return `Submitting ${object} for persistence review…`;

    case 'approve':
      return `Approving persistence eligibility for ${object}…`;

    case 'reject':
      return `Rejecting persistence for ${object}…`;

    default:
      return 'Submitting persistence-review decision…';
  }
}

function decisionCompleteMessage(
  object,
  action,
) {
  switch (action) {
    case 'submit':
      return `${object} entered pending_review. No durable bytes were written.`;

    case 'approve':
      return `${object} became durable-storage eligible. No durable bytes were written.`;

    case 'reject':
      return `${object} entered operator_blocked.`;

    default:
      return 'Persistence-review metadata changed.';
  }
}

function decisionNotificationTitle(action) {
  switch (action) {
    case 'submit':
      return 'Persistence review submitted';

    case 'approve':
      return 'Persistence eligibility approved';

    case 'reject':
      return 'Persistence candidate rejected';

    default:
      return 'Persistence review updated';
  }
}

function selectedActionLabel(action) {
  switch (action) {
    case 'submit':
      return 'submit for review';

    case 'approve':
      return 'approve persistence eligibility';

    case 'reject':
      return 'reject persistence';

    default:
      return 'none';
  }
}

function confirmationLabel(action) {
  switch (action) {
    case 'submit':
      return 'Confirm review submission';

    case 'approve':
      return 'Confirm eligibility approval';

    case 'reject':
      return 'Confirm persistence rejection';

    default:
      return 'Confirm persistence decision';
  }
}

function Fact({
  label,
  value,
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
