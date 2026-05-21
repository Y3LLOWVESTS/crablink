/**
 * RO:WHAT — Local podcast rights and guest-permission attestation before paid podcast minting.
 * RO:WHY — Podcasts include voices, guests, clips, intro/outro music, transcripts, and claims that need explicit creator confirmation.
 * RO:INTERACTS — PodcastPage.jsx, PodcastPublishFlow.jsx, podcast.css.
 * RO:INVARIANTS — local attestation only; no backend legal proof; no fake receipt; no spend authority; no publication.
 * RO:METRICS — none.
 * RO:CONFIG — creator-entered confirmation fields only.
 * RO:SECURITY — prevents accidental mint UI activation without explicit rights/guest confirmation.
 * RO:TEST — npm run build; manual checkbox/signature readiness smoke on crab://podcast.
 */

export const DEFAULT_PODCAST_OWNERSHIP_ATTESTATION = Object.freeze({
  ownsEpisodeAudio: false,
  guestPermissions: false,
  thirdPartyMaterialCleared: false,
  noPrivateConversations: false,
  noImpersonationOrVoiceClone: false,
  metadataAccurate: false,
  understandsReview: false,
  creatorSignature: '',
});

export function isPodcastOwnershipAttestationReady(attestation = {}) {
  return Boolean(
    attestation.ownsEpisodeAudio &&
      attestation.guestPermissions &&
      attestation.thirdPartyMaterialCleared &&
      attestation.noPrivateConversations &&
      attestation.noImpersonationOrVoiceClone &&
      attestation.metadataAccurate &&
      attestation.understandsReview &&
      String(attestation.creatorSignature || '').trim().length >= 3,
  );
}

export function buildPodcastOwnershipAttestationManifest(attestation = {}) {
  return {
    schema: 'crablink.local.podcast-rights-attestation.v1',
    accepted: isPodcastOwnershipAttestationReady(attestation),
    local_ui_attestation_only: true,
    proves_legal_ownership: false,
    proves_guest_release: false,
    creates_publication: false,
    creates_receipt: false,
    creates_wallet_authority: false,
    backend_verified: false,
    confirmations: {
      owns_episode_audio: Boolean(attestation.ownsEpisodeAudio),
      guest_permissions: Boolean(attestation.guestPermissions),
      third_party_material_cleared: Boolean(attestation.thirdPartyMaterialCleared),
      no_private_conversations: Boolean(attestation.noPrivateConversations),
      no_impersonation_or_voice_clone: Boolean(attestation.noImpersonationOrVoiceClone),
      metadata_accurate: Boolean(attestation.metadataAccurate),
      understands_review: Boolean(attestation.understandsReview),
    },
    creator_signature_display: String(attestation.creatorSignature || '').trim(),
    captured_at: new Date().toISOString(),
  };
}

export default function PodcastOwnershipDisclaimer({
  draft,
  audioMeta,
  attestation,
  onChange,
}) {
  const value = {
    ...DEFAULT_PODCAST_OWNERSHIP_ATTESTATION,
    ...(attestation || {}),
  };
  const ready = isPodcastOwnershipAttestationReady(value);

  function updateField(field, nextValue) {
    onChange?.({
      ...value,
      [field]: nextValue,
    });
  }

  return (
    <section className="cl-podcast-ownership" aria-label="Podcast rights confirmation">
      <div className="cl-podcast-ownership-head">
        <div>
          <p className="cl-eyebrow">Rights and guest permissions</p>
          <h3>Confirm this episode can be minted</h3>
          <p>
            Podcast minting needs a local creator confirmation because voices, guests, clips,
            intro/outro music, transcripts, cover references, and payout claims can create disputes.
            This gate is not backend legal proof; it is a required pre-mint confirmation.
          </p>
        </div>

        <span className={ready ? 'is-ready' : ''}>{ready ? 'Ready' : 'Required'}</span>
      </div>

      <div className="cl-podcast-ownership-facts" aria-label="Podcast attestation facts">
        <Fact label="Episode" value={draft?.title || 'untitled'} />
        <Fact label="Show" value={draft?.showTitle || 'not set'} />
        <Fact label="Host" value={draft?.hostDisplay || 'not set'} />
        <Fact label="Audio" value={audioMeta?.name || 'not loaded'} />
      </div>

      <div className="cl-podcast-ownership-checks">
        <CheckRow
          checked={value.ownsEpisodeAudio}
          onChange={(checked) => updateField('ownsEpisodeAudio', checked)}
          title="I own or control this episode audio"
          body="The recording, editing, voice performance, and episode file are cleared for publication."
        />
        <CheckRow
          checked={value.guestPermissions}
          onChange={(checked) => updateField('guestPermissions', checked)}
          title="I have permission from all speakers and guests"
          body="I am not uploading someone’s voice, interview, or private conversation without consent."
        />
        <CheckRow
          checked={value.thirdPartyMaterialCleared}
          onChange={(checked) => updateField('thirdPartyMaterialCleared', checked)}
          title="Music, clips, effects, and third-party media are cleared"
          body="Intro/outro music, samples, sound effects, excerpts, clips, or referenced media are authorized."
        />
        <CheckRow
          checked={value.noPrivateConversations}
          onChange={(checked) => updateField('noPrivateConversations', checked)}
          title="No private conversations are being published without consent"
          body="This includes calls, recordings, leaked audio, and unpublished interviews."
        />
        <CheckRow
          checked={value.noImpersonationOrVoiceClone}
          onChange={(checked) => updateField('noImpersonationOrVoiceClone', checked)}
          title="No impersonation or deceptive AI voice clone"
          body="The episode does not present a synthetic or imitated voice as a real person without clear permission/disclosure."
        />
        <CheckRow
          checked={value.metadataAccurate}
          onChange={(checked) => updateField('metadataAccurate', checked)}
          title="Metadata, collaborators, rights, and payout claims are accurate"
          body="Title, show name, hosts, guests, description, links, tags, and payout routing are truthful."
        />
        <CheckRow
          checked={value.understandsReview}
          onChange={(checked) => updateField('understandsReview', checked)}
          title="I understand disputed content can be reviewed or blocked"
          body="CrabLink/RustyOnions policy may reject, review, block, remove, or freeze payout routing for disputed content."
        />
      </div>

      <label className="cl-podcast-signature">
        <span>Creator confirmation signature</span>
        <input
          value={value.creatorSignature}
          onChange={(event) => updateField('creatorSignature', event.target.value)}
          placeholder="Type your creator name or @username"
          maxLength={96}
        />
      </label>

      <div className="cl-podcast-ownership-status">
        <div>
          <strong>{ready ? 'Ready for paid podcast minting' : 'Blocked before minting'}</strong>
          <span>
            {ready
              ? 'The local pre-mint podcast attestation is complete. The backend still decides whether prepare/upload succeeds.'
              : 'All confirmations and a creator signature are required before the paid podcast mint flow can proceed.'}
          </span>
        </div>
      </div>
    </section>
  );
}

function CheckRow({ checked, onChange, title, body }) {
  return (
    <label className={checked ? 'cl-podcast-ownership-check is-checked' : 'cl-podcast-ownership-check'}>
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
    <div className="cl-podcast-ownership-fact">
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}