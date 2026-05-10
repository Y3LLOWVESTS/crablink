/**
 * RO:WHAT — Privacy boundary panel for future anonymous alternate passports.
 * RO:WHY — Profile route must make alt privacy explicit and avoid public main↔alt linkage leaks.
 * RO:INTERACTS — ProfilePage, local profile draft, future passport/alt UX.
 * RO:INVARIANTS — no public alt linkage; no fake withdrawal/privacy protocol; no identity mutation.
 * RO:METRICS — none.
 * RO:CONFIG — local alt policy mode display.
 * RO:SECURITY — privacy-honest messaging; no generated alt IDs; no keys or secrets.
 * RO:TEST — manual crab://profile route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import { labelFromSnake } from './profileDraftModel.js';

export default function AltVault({ draftState }) {
  const { draft } = draftState;

  return (
    <Card eyebrow="Alt Vault" title="Anonymous passport boundary" className="profile-alt-card">
      <div className="profile-alt-status">
        <Badge tone="warning">private by default</Badge>
        <Badge tone="neutral">no public linkage</Badge>
        <Badge tone="neutral">future protocol</Badge>
      </div>

      <div className="profile-alt-mode">
        <span>Current local policy</span>
        <strong>{labelFromSnake(draft.altPolicyMode)}</strong>
      </div>

      <ul className="profile-alt-list">
        <li>Main passports can create sites and public identity surfaces later.</li>
        <li>Anonymous alts can browse, comment, and interact without exposing the main identity by default.</li>
        <li>This page does not generate alt IDs or reveal main↔alt mappings.</li>
        <li>Do not promise private alt withdrawal or unlinkability until a real backend protocol exists.</li>
      </ul>

      <p className="profile-panel-note">
        Alt public IDs should be independent public roots, not obvious hashes of main passport material.
      </p>
    </Card>
  );
}