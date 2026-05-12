/**
 * RO:WHAT — Route owner for the React crab://profile page.
 * RO:WHY — CrabLink refactor; profile is a protected identity route and must look real without faking backend truth.
 * RO:INTERACTS — ProfileHome, ProfileEditor, ProfileAvatar, ProfileAssets, ProfileGateway, AltVault, useCreatorDraft.
 * RO:INVARIANTS — no fake backend publication; no fake username/reputation/mod truth; no public main↔alt linkage leak.
 * RO:METRICS — none; future profile publish must use gateway correlation IDs.
 * RO:CONFIG — app settings can supply display-only passport/wallet hints.
 * RO:SECURITY — no keys, no seed phrases, no direct internal services, no wallet mutation.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://profile route smoke.
 */

import { useCallback } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import AltVault from './AltVault.jsx';
import ProfileAssets from './ProfileAssets.jsx';
import ProfileEditor from './ProfileEditor.jsx';
import ProfileGateway from './ProfileGateway.jsx';
import ProfileHome from './ProfileHome.jsx';
import {
  DEFAULT_PROFILE_DRAFT,
  buildProfileManifestDraft,
  getProfileCompleteness,
  statsForProfileDraft,
} from './profileDraftModel.js';
import './profile.css';

export default function ProfilePage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildProfileManifestDraft(draft, { app, route }),
    [app, route],
  );

  const buildStats = useCallback((draft) => statsForProfileDraft(draft, app), [app]);

  const getCompleteness = useCallback((draft) => getProfileCompleteness(draft, app), [app]);

  const draftState = useCreatorDraft({
    initialDraft: {
      ...DEFAULT_PROFILE_DRAFT,
      ownerPassport: app?.settings?.passportSubject || DEFAULT_PROFILE_DRAFT.ownerPassport,
      walletAccount: app?.settings?.walletAccount || DEFAULT_PROFILE_DRAFT.walletAccount,
    },
    buildManifest,
    buildStats,
    getCompleteness,
  });

  function scrollToEditor() {
    document.getElementById('profile-editor')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <section className="cl-page profile-page">
      <ProfileHome app={app} route={route} draftState={draftState} onEdit={scrollToEditor} />

      <TruthBoundary
        tone="warning"
        title="Profile truth boundary"
        copy="This React profile route is a local identity/profile draft. It does not claim backend profile publication, a reserved username, real reputation, real moderator score, public discovery, or public main↔alt linkage."
      />

      <section className="profile-dashboard-grid" aria-label="Profile workspace">
        <main className="profile-main-column">
          <ProfileEditor app={app} draftState={draftState} />
          <ProfileAssets draftState={draftState} />

          <Card
            eyebrow="Developer"
            title="Local profile manifest draft"
            className="profile-manifest-card"
            actions={<CopyButton text={draftState.manifestJson} label="Copy manifest JSON" />}
          >
            <div className="profile-dev-intro">
              <Badge tone="warning">local only</Badge>
              <Badge tone="neutral">not a profile CID</Badge>
              <Badge tone="neutral">not backend published</Badge>
            </div>

            <JsonPreview
              label="Profile manifest JSON"
              data={draftState.manifest}
              initiallyOpen={draftState.viewMode === 'developer'}
            />
          </Card>
        </main>

        <aside className="profile-side-column" aria-label="Profile identity and privacy panels">
          <ProfileGateway app={app} route={route} draftState={draftState} />
          <AltVault draftState={draftState} />

          <Card eyebrow="Rules" title="Identity permissions" className="profile-rules-card">
            <ul className="profile-rule-list">
              <li>Main RON Passport identity is the future site-creation authority.</li>
              <li>Anonymous alts are for browsing/commenting unless policy later grants more.</li>
              <li>Profile, REP, MOD, and @username truth must come from gateway-backed services.</li>
            </ul>
          </Card>
        </aside>
      </section>
    </section>
  );
}