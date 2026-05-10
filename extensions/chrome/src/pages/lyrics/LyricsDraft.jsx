/**
 * RO:WHAT — Pure props-driven lyrics draft workspace for the React-owned crab://lyrics route.
 * RO:WHY — CrabLink refactor; removes module-level side-panel state and keeps route state owned by LyricsPage.
 * RO:INTERACTS — LyricsPage.jsx, lyricsDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication claim; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport/wallet display labels from app settings.
 * RO:SECURITY — trusted UI only; no private keys; no seed phrases; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://lyrics route smoke.
 */

import ActionBar from '../../shared/components/ActionBar.jsx';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import DraftStatsPanel from '../../shared/components/DraftStatsPanel.jsx';
import Field from '../../shared/components/Field.jsx';
import ManifestPreviewPanel from '../../shared/components/ManifestPreviewPanel.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  LYRICS_ACCESS_OPTIONS,
  LYRICS_RIGHTS_OPTIONS,
  LYRICS_VIEW_OPTIONS,
} from './lyricsDraftModel.js';

export default function LyricsDraft({ app, draftState }) {
  const {
    draft,
    updateDraft,
    clearDraft,
    viewMode,
    setViewMode,
    manifest,
    manifestJson,
    completeness,
  } = draftState;

  return (
    <Card
      eyebrow="Local builder"
      title="Lyrics draft"
      className="lyrics-draft-card"
      actions={
        <SegmentedControl
          options={LYRICS_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Lyrics workspace mode"
          size="sm"
        />
      }
    >
      <div className="lyrics-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://lyrics</Badge>
        <Badge tone="neutral">No wallet action</Badge>
      </div>

      <div className="lyrics-form-grid">
        <Field label="Title" help="Creator-facing lyrics title. This is local draft text only.">
          <TextInput
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Example: The Dusty Onion Ballad"
          />
        </Field>

        <Field
          label="Linked music/song crab URL"
          help="Optional future reference. Use crab://<hash>.music or crab://<hash>.song when backend support exists."
        >
          <TextInput
            value={draft.linkedMusicCrabUrl}
            onChange={(event) => updateDraft('linkedMusicCrabUrl', event.target.value)}
            placeholder="crab://<64 lowercase hex>.music"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Creator display"
          help="Display label only. Backend identity truth must come from svc-gateway later."
        >
          <TextInput
            value={draft.authorDisplay}
            onChange={(event) => updateDraft('authorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
          />
        </Field>

        <Field label="Language" help="Short language tag for future manifest metadata.">
          <TextInput
            value={draft.language}
            onChange={(event) => updateDraft('language', event.target.value)}
            placeholder="en"
            spellCheck={false}
          />
        </Field>

        <Field label="Rights mode" help="Planning field only; no policy enforcement yet.">
          <select
            className="cl-select"
            value={draft.rightsMode}
            onChange={(event) => updateDraft('rightsMode', event.target.value)}
          >
            {LYRICS_RIGHTS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Access mode" help="Planning field only; no paid access is active here.">
          <select
            className="cl-select"
            value={draft.accessMode}
            onChange={(event) => updateDraft('accessMode', event.target.value)}
          >
            {LYRICS_ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Tags"
        help="Comma-separated draft tags. These are not indexed until a real backend publish route exists."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="songwriting, folk, crabcore"
        />
      </Field>

      <Field
        label="Lyrics body"
        help="Plain text only. This page does not render lyrics as HTML."
        required
      >
        <TextArea
          value={draft.body}
          onChange={(event) => updateDraft('body', event.target.value)}
          rows={14}
          placeholder={'Verse 1\n...\n\nChorus\n...'}
        />
      </Field>

      {viewMode === 'developer' && (
        <div className="lyrics-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.lyrics-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="lyrics-actions">
        <div className="lyrics-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local draft state</span>
        </div>

        <div className="lyrics-action-buttons">
          <CopyButton
            text={manifestJson}
            label="Copy manifest JSON"
            successLabel="Manifest copied"
            errorLabel="Copy unavailable"
            variant="secondary"
          />
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
        </div>
      </ActionBar>
    </Card>
  );
}

export function LyricsSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const tags = manifest?.metadata?.tags || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Characters', value: stats.characters || 0 },
          { label: 'Words', value: stats.words || 0 },
          { label: 'Lines', value: stats.lines || 0 },
          { label: 'Tags', value: tags.length },
        ]}
        notes={['local draft', 'plain text', 'no receipt']}
      />

      <RouteTruthPanel
        routeKind="lyrics"
        tone="warning"
        title="Not backend truth"
        copy="This is local UI state only. It does not create a content ID, manifest ID, receipt, index pointer, publication, hold, capture, release, or paid access event."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.lyrics-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.title || 'Untitled lyrics'}>
          <div className="lyrics-preview">
            <p className="lyrics-preview-meta">
              {manifest?.ownership?.creator_display || 'Unknown creator'} ·{' '}
              {manifest?.metadata?.language || 'en'}
            </p>
            <div className="lyrics-preview-tags">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag} tone="neutral" uppercase={false}>
                    {tag}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral">No tags yet</Badge>
              )}
            </div>
            <pre className="lyrics-preview-body">
              {draft.body || 'Your lyrics preview will appear here.'}
            </pre>
          </div>
        </Card>
      )}
    </>
  );
}