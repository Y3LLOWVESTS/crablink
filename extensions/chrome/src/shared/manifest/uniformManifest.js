/**
 * RO:WHAT — Uniform manifest builder for CrabLink asset drafts.
 * RO:WHY — Prevents every built-in page from inventing a different manifest shape.
 * RO:INTERACTS — manifestDrafts, manifestForm, pages/*, shared schemas.
 * RO:INVARIANTS — draft state is not backend truth; no fake CIDs/receipts/policy enforcement.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no private keys, spend authority, or private alt mappings.
 * RO:TEST — manifest schema tests once implemented.
 */

export function createUniformManifestDraft(kind, overrides = {}) {
  return {
    schema: 'crablink.uniform-manifest.draft.v1',
    kind,
    identity: {},
    ownership: {},
    metadata: {},
    linked_assets: {},
    renditions: {},
    versions: [],
    rights_policy: {},
    access_policy: {},
    ad_policy: {},
    economics: {},
    feature_gates: {},
    required_capabilities: [],
    provenance: {},
    storage: {},
    receipts: [],
    truth_boundary: 'local draft only; not backend truth until published and confirmed',
    ...overrides,
  };
}

