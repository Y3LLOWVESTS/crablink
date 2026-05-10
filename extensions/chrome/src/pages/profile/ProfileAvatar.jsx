/**
 * RO:WHAT — Canonical .image avatar/banner preview helper for crab://profile.
 * RO:WHY — Profile avatars should reference image assets without editing or publishing those assets.
 * RO:INTERACTS — ProfileHome, ProfileEditor, gateway client URL helper.
 * RO:INVARIANTS — preview only; avatar remains crab://<hash>.image; no ownership or profile publication claim.
 * RO:METRICS — none.
 * RO:CONFIG — configured gateway base URL when available.
 * RO:SECURITY — no script execution; no alt linkage; no direct storage/index calls.
 * RO:TEST — avatar URL field with crab://<64hex>.image.
 */

import { useMemo, useState } from 'react';
import { imageHashFromCrabUrl, isCrabImageUrl } from './profileDraftModel.js';

export default function ProfileAvatar({ app, draft, size = 'normal' }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = draft?.avatarCrabUrl || '';

  const previewUrl = useMemo(() => {
    const hash = imageHashFromCrabUrl(avatarUrl);
    if (!hash) {
      return '';
    }

    if (typeof app?.clients?.gateway?.url === 'function') {
      return app.clients.gateway.url(`/b3/${hash}.image`);
    }

    const gatewayUrl = String(app?.settings?.gatewayUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '');
    return `${gatewayUrl}/b3/${hash}.image`;
  }, [app, avatarUrl]);

  const initials = initialsFor(draft?.displayName || draft?.handle || 'CL');
  const canPreview = previewUrl && isCrabImageUrl(avatarUrl) && !failed;

  return (
    <div className={`profile-avatar profile-avatar-${size}`}>
      {canPreview ? (
        <img
          src={previewUrl}
          alt={`${draft?.displayName || 'Profile'} avatar`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="profile-avatar-placeholder" aria-label="Profile avatar placeholder">
          {initials}
        </div>
      )}

      <span className="profile-avatar-status">
        {isCrabImageUrl(avatarUrl)
          ? failed
            ? 'image unavailable'
            : 'crab image'
          : 'local placeholder'}
      </span>
    </div>
  );
}

function initialsFor(value) {
  const clean = String(value || 'CL').replace(/^@/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase() || 'CL';
}