/**
 * RO:WHAT — Hero/profile card for crab://profile.
 * RO:WHY — Makes the profile route look like a real profile page while keeping truth boundaries visible.
 * RO:INTERACTS — ProfilePage, ProfileAvatar, ProfileGateway, shared Card/Badge/Button components.
 * RO:INVARIANTS — display local hints only; no fake username claim; no fake reputation/mod score.
 * RO:METRICS — none.
 * RO:CONFIG — local draft state and app settings.
 * RO:SECURITY — no alt linkage, no private keys, no backend mutation.
 * RO:TEST — manual crab://profile route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import ProfileAvatar from './ProfileAvatar.jsx';
import { cleanHandle, labelFromSnake, parseTags } from './profileDraftModel.js';

export default function ProfileHome({ app, route, draftState, onEdit }) {
  const { draft, completeness } = draftState;
  const tags = parseTags(draft.tags);
  const handle = cleanHandle(draft.handle);

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
                <p className="cl-eyebrow">Profile</p>
                <h1>{draft.displayName || 'Unnamed profile'}</h1>
                <p className="profile-handle">{handle || '@username-local-draft'}</p>
              </div>

              <Button variant="primary" onClick={onEdit}>
                Edit Profile
              </Button>
            </div>

            <p className="profile-bio">
              {draft.bio ||
                'Write a public-facing bio in the editor. This page stays local until backend profile manifests and username claims are wired.'}
            </p>

            <div className="profile-badges" aria-label="Profile status badges">
              <Badge tone="warning">local draft</Badge>
              <Badge tone="neutral">{labelFromSnake(draft.profileStatus)}</Badge>
              <Badge tone="neutral">username not confirmed</Badge>
              <Badge tone="neutral">reputation not confirmed</Badge>
              <Badge tone="neutral">mod score not confirmed</Badge>
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
          <HeroStat label="ROC" value="display only" />
          <HeroStat label="REP" value="not confirmed" />
          <HeroStat label="MOD" value="not confirmed" />
          <HeroStat label="Discovery" value={labelFromSnake(draft.discoveryMode)} />
        </div>

        <div className="profile-route-strip" aria-label="Profile route facts">
          <span>{route?.normalizedInput || 'crab://profile'}</span>
          <span>{draft.ownerPassport || app?.settings?.passportSubject || 'passport label unavailable'}</span>
          <span>{draft.walletAccount || app?.settings?.walletAccount || 'wallet label unavailable'}</span>
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