/**
 * RO:WHAT — Public assets/sites placeholder surface for crab://profile.
 * RO:WHY — Shows where profile catalogues belong without inventing backend asset or site lists.
 * RO:INTERACTS — ProfilePage, local profile manifest draft.
 * RO:INVARIANTS — placeholder/backed split is explicit; no fake public catalogues; no fake profile publication.
 * RO:METRICS — none.
 * RO:CONFIG — profile draft catalogue references.
 * RO:SECURITY — no fetches, no direct storage/index calls, no alt linkage.
 * RO:TEST — manual crab://profile route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';

export default function ProfileAssets({ draftState }) {
  const { draft } = draftState;

  const entries = [
    {
      title: 'Avatar image',
      kind: '.image',
      value: draft.avatarCrabUrl,
      copy: 'Profile avatar reference. Ownership and profile publication are not claimed here.',
    },
    {
      title: 'Banner image',
      kind: '.image',
      value: draft.bannerCrabUrl,
      copy: 'Optional future profile banner reference.',
    },
    {
      title: 'Public asset catalogue',
      kind: 'future profile catalogue',
      value: draft.assetCatalogCrabUrl,
      copy: 'Future backend-backed list of this profile’s public assets.',
    },
    {
      title: 'Public site catalogue',
      kind: 'future profile catalogue',
      value: draft.siteCatalogCrabUrl,
      copy: 'Future backend-backed list of this profile’s public sites.',
    },
  ];

  return (
    <Card eyebrow="Catalogues" title="Profile assets and sites" className="profile-assets-card">
      <p className="profile-panel-note">
        These cards preserve the shape of the future public profile page without inventing
        backend-backed asset lists, site lists, reputation, or ownership proofs.
      </p>

      <div className="profile-asset-grid">
        {entries.map((entry) => (
          <article key={entry.title} className={entry.value ? 'has-value' : ''}>
            <div className="profile-asset-head">
              <div>
                <span>{entry.kind}</span>
                <strong>{entry.title}</strong>
              </div>
              <Badge tone={entry.value ? 'success' : 'neutral'}>
                {entry.value ? 'local ref' : 'empty'}
              </Badge>
            </div>

            <p>{entry.copy}</p>

            {entry.value ? (
              <div className="profile-asset-url">
                <code>{entry.value}</code>
                <CopyButton text={entry.value} label="Copy" />
              </div>
            ) : (
              <small>No local reference entered.</small>
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}