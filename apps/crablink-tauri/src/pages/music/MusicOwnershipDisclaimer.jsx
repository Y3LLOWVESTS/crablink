/**
 * RO:WHAT — Legal/rights attestation panel for the crab://music workspace.
 * RO:WHY — Prevents future music mint/publish flows from proceeding without creator rights confirmation.
 * RO:INTERACTS — MusicPage.jsx, musicOwnershipDisclaimer.css, local music manifest draft.
 * RO:INVARIANTS — local attestation only; no backend proof; no fake ownership truth; required before future minting.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — does not collect legal identity, private keys, wallet authority, or secrets.
 * RO:TEST — npm run build; manual crab://music checkbox/signature gate smoke.
 */

import './musicOwnershipDisclaimer.css';

export const DEFAULT_MUSIC_OWNERSHIP_ATTESTATION = Object.freeze({
  ownsOrControls: false,
  samplesCleared: false,
  noInfringement: false,
  understandsTakedown: false,
  accurateMetadata: false,
  signature: '',
  acceptedAt: '',
});

export function isMusicOwnershipAttestationReady(attestation) {
  const safe = {
    ...DEFAULT_MUSIC_OWNERSHIP_ATTESTATION,
    ...(attestation || {}),
  };

  return Boolean(
    safe.ownsOrControls &&
      safe.samplesCleared &&
      safe.noInfringement &&
      safe.understandsTakedown &&
      safe.accurateMetadata &&
      safe.signature.trim().length >= 2,
  );
}

export function buildMusicOwnershipAttestationManifest(attestation) {
  const safe = {
    ...DEFAULT_MUSIC_OWNERSHIP_ATTESTATION,
    ...(attestation || {}),
  };

  return {
    required_before_publish: true,
    accepted: isMusicOwnershipAttestationReady(safe),
    accepted_at: safe.acceptedAt || null,
    signer_display: safe.signature.trim() || null,
    confirmations: {
      owns_or_controls_music_rights: Boolean(safe.ownsOrControls),
      samples_loops_beats_vocals_and_stems_are_cleared: Boolean(safe.samplesCleared),
      will_not_upload_music_without_permission: Boolean(safe.noInfringement),
      understands_takedown_and_policy_review: Boolean(safe.understandsTakedown),
      metadata_and_creator_claims_are_accurate: Boolean(safe.accurateMetadata),
    },
    truth_boundary: {
      local_ui_attestation_only: true,
      proves_legal_ownership: false,
      backend_verified: false,
      creates_copyright_registration: false,
      creates_wallet_authority: false,
      creates_asset_publication: false,
      creates_receipt: false,
    },
  };
}

export default function MusicOwnershipDisclaimer({
  attestation,
  onChange,
  draft,
  localAudioMeta,
}) {
  const safe = {
    ...DEFAULT_MUSIC_OWNERSHIP_ATTESTATION,
    ...(attestation || {}),
  };

  const ready = isMusicOwnershipAttestationReady(safe);
  const signaturePlaceholder =
    draft?.artistDisplay?.trim() || draft?.title?.trim() || 'creator display / artist name';

  function updateField(field, value) {
    const next = {
      ...safe,
      [field]: value,
    };

    const nextReady = isMusicOwnershipAttestationReady(next);

    if (nextReady && !next.acceptedAt) {
      next.acceptedAt = new Date().toISOString();
    }

    if (!nextReady) {
      next.acceptedAt = '';
    }

    onChange(next);
  }

  return (
    <section className="cl-music-ownership" aria-label="Music ownership and rights attestation">
      <div className="cl-music-ownership-head">
        <div>
          <p className="cl-eyebrow">Pre-mint legal gate</p>
          <h3>Confirm you have rights to this music</h3>
          <p>
            Before any future music mint or upload path is enabled, the creator must confirm that
            they own or control the rights to the track and every included sample, loop, beat, vocal,
            stem, cover, and linked asset. This local checkbox gate does not prove ownership by
            itself; it is a required creator confirmation before backend publication can be allowed.
          </p>
        </div>

        <span className={ready ? 'cl-music-ownership-pill is-ready' : 'cl-music-ownership-pill'}>
          {ready ? 'attested' : 'required'}
        </span>
      </div>

      <div className="cl-music-ownership-warning" role="note">
        <strong>Important</strong>
        <span>
          Do not mint, upload, sell, or publish music you do not own or have permission to use.
          CrabLink can still require backend review, remove content, block payouts, or reject a
          publish request if rights are disputed or policy requires it.
        </span>
      </div>

      <div className="cl-music-ownership-facts" aria-label="Current local draft facts">
        <Fact label="Track" value={draft?.title?.trim() || 'untitled local draft'} />
        <Fact label="Artist" value={draft?.artistDisplay?.trim() || 'not set'} />
        <Fact label="Local audio" value={localAudioMeta?.name || 'not selected'} />
        <Fact label="Backend proof" value="not created yet" />
      </div>

      <fieldset className="cl-music-ownership-checks">
        <legend>Required confirmations</legend>

        <CheckRow
          checked={safe.ownsOrControls}
          onChange={(checked) => updateField('ownsOrControls', checked)}
          title="I own or control the rights to this music."
          body="This includes the composition, sound recording, performance, and any rights needed to distribute it through CrabLink."
        />

        <CheckRow
          checked={safe.samplesCleared}
          onChange={(checked) => updateField('samplesCleared', checked)}
          title="All samples, loops, beats, vocals, stems, and third-party material are cleared."
          body="Do not include copyrighted material from another artist, producer, label, beat marketplace, or sample pack unless your license allows this use."
        />

        <CheckRow
          checked={safe.noInfringement}
          onChange={(checked) => updateField('noInfringement', checked)}
          title="I will not upload music that belongs to someone else."
          body="This includes ripped songs, remixes without permission, unlicensed covers, AI clones, leaked tracks, and music copied from another platform."
        />

        <CheckRow
          checked={safe.understandsTakedown}
          onChange={(checked) => updateField('understandsTakedown', checked)}
          title="I understand CrabLink may remove, block, or review disputed content."
          body="Future backend policy may reject publication, freeze payout routing, or require additional proof if ownership is challenged."
        />

        <CheckRow
          checked={safe.accurateMetadata}
          onChange={(checked) => updateField('accurateMetadata', checked)}
          title="The title, artist, collaborators, rights, and payout claims in this draft are accurate."
          body="Do not misrepresent another creator, label, publisher, or collaborator."
        />
      </fieldset>

      <label className="cl-music-ownership-signature">
        <span>Creator confirmation signature</span>
        <input
          value={safe.signature}
          onChange={(event) => updateField('signature', event.target.value)}
          placeholder={signaturePlaceholder}
          maxLength={120}
        />
        <small>
          Use a creator display name or artist label. Do not enter private legal identity unless you
          intentionally want it in your local draft.
        </small>
      </label>

      <div className="cl-music-ownership-status">
        <div>
          <strong>{ready ? 'Ready for a future mint step' : 'Blocked before future minting'}</strong>
          <span>
            {ready
              ? 'The local pre-mint attestation is complete. Backend music mint routes still need to be wired before publication.'
              : 'All confirmations and a creator signature are required before a future music mint button can be enabled.'}
          </span>
        </div>

        <button type="button" disabled>
          {ready ? 'Mint music asset — backend not wired yet' : 'Accept rights disclaimer first'}
        </button>
      </div>
    </section>
  );
}

function CheckRow({ checked, onChange, title, body }) {
  return (
    <label className={checked ? 'cl-music-ownership-check is-checked' : 'cl-music-ownership-check'}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
    </label>
  );
}

function Fact({ label, value }) {
  return (
    <div className="cl-music-ownership-fact">
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}