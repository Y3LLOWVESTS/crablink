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

  const buildStats = useCallback(
    (draft) => statsForProfileDraft(draft, app),
    [app],
  );

  const getCompleteness = useCallback(
    (draft) => getProfileCompleteness(draft, app),
    [app],
  );

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
      <ProfileHome
        app={app}
        route={route}
        draftState={draftState}
        onEdit={scrollToEditor}
      />

      <TruthBoundary
        tone="warning"
        title="Profile truth boundary"
        copy="This React profile route is a local identity/profile draft. It does not claim backend profile publication, a reserved username, real reputation, real moderator score, public discovery, or public main↔alt linkage."
      />

      <section className="profile-workspace-grid" aria-label="Profile workspace">
        <main className="profile-workspace-main">
          <ProfileEditor app={app} draftState={draftState} />

          <ProfileAssets draftState={draftState} />

          <Card
            eyebrow="Developer"
            title="Local profile manifest draft"
            className="profile-manifest-card"
            actions={<CopyButton text={draftState.manifestJson} label="Copy manifest JSON" />}
          >
            <JsonPreview label="Profile manifest JSON" data={draftState.manifest} initiallyOpen />
          </Card>
        </main>

        <aside className="profile-workspace-side" aria-label="Profile identity and privacy panels">
          <ProfileGateway app={app} route={route} draftState={draftState} />
          <AltVault draftState={draftState} />
        </aside>
      </section>
    </section>
  );
}