/**
 * RO:WHAT — Hero/profile card for crab://profile.
 * RO:WHY — Makes the profile route look like a real profile page while keeping truth boundaries visible.
 * RO:INTERACTS — ProfilePage, ProfileAvatar, ProfileGateway, shared Card/Badge/Button/CopyButton components.
 * RO:INVARIANTS — display local/backend-returned hints only; no fake username claim; no fake reputation/mod score.
 * RO:METRICS — none.
 * RO:CONFIG — local draft state, app settings, wallet display state.
 * RO:SECURITY — no alt linkage, no private keys, no backend mutation.
 * RO:TEST — manual crab://profile route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import ProfileAvatar from './ProfileAvatar.jsx';
import {
  getRocTruth,
  getUsernameTruth,
  labelFromSnake,
  parseTags,
} from './profileDraftModel.js';

export default function ProfileHome({ app, route, draftState, onEdit }) {
  const { draft, completeness, stats } = draftState;
  const tags = parseTags(draft.tags);
  const usernameTruth = getUsernameTruth(draft, app);
  const rocTruth = getRocTruth(app);
  const routeLabel = route?.normalizedInput || 'crab://profile';
  const passportLabel = draft.ownerPassport || app?.settings?.passportSubject || 'passport label unavailable';
  const walletLabel = draft.walletAccount || app?.settings?.walletAccount || 'wallet label unavailable';

  return (
    <section className="profile-hero" aria-label="Profile hero">
      <div className="profile-hero-card">
        <div className="profile-hero-banner" aria-hidden="true">
          <div className="profile-hero-banner-inner">
            <span>crab://profile</span>
            <strong>{draft.tagline || 'CrabLink creator profile draft'}</strong>
          </div>
        </div>

        <div className="profile-hero-content">
          <ProfileAvatar app={app} draft={draft} size="hero" />

          <div className="profile-hero-identity">
            <div className="profile-hero-title-row">
              <div>
                <p className="cl-eyebrow">RON Passport profile</p>
                <h1>{draft.displayName || 'Unnamed profile'}</h1>
                <p className="profile-handle">{usernameTruth.display || '@username-local-draft'}</p>
              </div>

              <div className="profile-editor-buttons">
                <Button variant="primary" onClick={onEdit}>
                  Edit Profile
                </Button>
                <CopyButton text={usernameTruth.display || routeLabel} label="Copy handle" />
              </div>
            </div>

            <p className="profile-bio">
              {draft.bio ||
                'Write a public-facing bio in the editor. This page stays local until backend profile manifests and username claims are wired.'}
            </p>

            <div className="profile-badges" aria-label="Profile status badges">
              <Badge tone="warning">local profile draft</Badge>
              <Badge tone={usernameTruth.tone}>{usernameTruth.source}</Badge>
              <Badge tone={usernameTruth.backendConfirmed ? 'success' : 'neutral'}>
                username {usernameTruth.backendConfirmed ? 'confirmed' : 'not confirmed'}
              </Badge>
              <Badge tone="neutral">{labelFromSnake(draft.profileStatus)}</Badge>
              <Badge tone="neutral">REP not confirmed</Badge>
              <Badge tone="neutral">MOD not confirmed</Badge>
            </div>

            {tags.length > 0 && (
              <div className="profile-tags" aria-label="Profile tags">
                {tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="profile-hero-stats" aria-label="Profile truth stats">
          <HeroStat label="Complete" value={`${completeness}%`} />
          <HeroStat label="ROC" value={rocTruth.ledgerBacked ? rocTruth.display : 'display only'} />
          <HeroStat label="REP" value="not confirmed" />
          <HeroStat label="MOD" value="not confirmed" />
          <HeroStat label="Discovery" value={labelFromSnake(draft.discoveryMode)} />
        </div>

        <div className="profile-route-strip" aria-label="Profile route facts">
          <span>{routeLabel}</span>
          <span>{passportLabel}</span>
          <span>{walletLabel}</span>
          <span>{stats?.hasAvatar ? 'avatar image ref' : 'avatar placeholder'}</span>
          <span>{usernameTruth.validation?.ok ? 'username syntax ok' : 'username syntax issue'}</span>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}