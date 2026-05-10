/**
 * RO:WHAT — Pure props-driven comment draft workspace for the React-owned crab://comment route.
 * RO:WHY — CrabLink refactor; reuses shared creator panels and keeps route state owned by CommentPage.
 * RO:INTERACTS — CommentPage.jsx, commentDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication claim; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport/wallet display labels from app settings.
 * RO:SECURITY — trusted UI only; no private keys; no seed phrases; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://comment route smoke.
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
  COMMENT_KIND_OPTIONS,
  COMMENT_MODERATION_OPTIONS,
  COMMENT_RIGHTS_OPTIONS,
  COMMENT_VIEW_OPTIONS,
  COMMENT_VISIBILITY_OPTIONS,
} from './commentDraftModel.js';

export default function CommentDraft({ app, draftState }) {
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
      title="Comment draft"
      className="comment-draft-card"
      actions={
        <SegmentedControl
          options={COMMENT_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Comment workspace mode"
          size="sm"
        />
      }
    >
      <div className="comment-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://comment</Badge>
        <Badge tone="neutral">No wallet action</Badge>
      </div>

      <div className="comment-form-grid">
        <Field label="Title" help="Optional local display title for this comment draft.">
          <TextInput
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Example: Reply to the first crab-native post"
          />
        </Field>

        <Field
          label="Creator display"
          help="Display label only. Backend identity truth must come from svc-gateway later."
        >
          <TextInput
            value={draft.creatorDisplay}
            onChange={(event) => updateDraft('creatorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
          />
        </Field>

        <Field label="Comment kind" help="Planning field only; no backend schema is claimed here.">
          <select
            className="cl-select"
            value={draft.commentKind}
            onChange={(event) => updateDraft('commentKind', event.target.value)}
          >
            {COMMENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Visibility" help="Planning field only; this page does not enforce access.">
          <select
            className="cl-select"
            value={draft.visibility}
            onChange={(event) => updateDraft('visibility', event.target.value)}
          >
            {COMMENT_VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rights mode" help="Planning field only; no policy enforcement yet.">
          <select
            className="cl-select"
            value={draft.rightsMode}
            onChange={(event) => updateDraft('rightsMode', event.target.value)}
          >
            {COMMENT_RIGHTS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Moderation mode" help="Planning field only; backend moderation is not active here.">
          <select
            className="cl-select"
            value={draft.moderationMode}
            onChange={(event) => updateDraft('moderationMode', event.target.value)}
          >
            {COMMENT_MODERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Language" help="Short language tag for future manifest metadata.">
          <TextInput
            value={draft.language}
            onChange={(event) => updateDraft('language', event.target.value)}
            placeholder="en"
            spellCheck={false}
          />
        </Field>

        <Field label="Content warning" help="Optional local label for future moderation/review surfaces.">
          <TextInput
            value={draft.contentWarning}
            onChange={(event) => updateDraft('contentWarning', event.target.value)}
            placeholder="optional"
            maxLength={120}
          />
        </Field>
      </div>

      <div className="comment-form-grid">
        <Field
          label="Parent post/comment crab URL"
          help="Optional future reference to the post or comment being replied to."
        >
          <TextInput
            value={draft.parentCrabUrl}
            onChange={(event) => updateDraft('parentCrabUrl', event.target.value)}
            placeholder="crab://<64 lowercase hex>.post"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Site context crab URL"
          help="Optional future reference to the site where this comment belongs."
        >
          <TextInput
            value={draft.siteContextCrabUrl}
            onChange={(event) => updateDraft('siteContextCrabUrl', event.target.value)}
            placeholder="crab://example-site"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field
        label="Thread context crab URL"
        help="Optional future thread/reference graph pointer."
      >
        <TextInput
          value={draft.threadContextCrabUrl}
          onChange={(event) => updateDraft('threadContextCrabUrl', event.target.value)}
          placeholder="crab://<64 lowercase hex>.thread"
          spellCheck={false}
        />
      </Field>

      <Field
        label="Tags"
        help="Comma-separated draft tags. These are not indexed until a real backend publish route exists."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="comment, reply, moderation"
        />
      </Field>

      <Field
        label="Comment body"
        help="Plain text only. This page does not render comments as HTML."
        required
      >
        <TextArea
          value={draft.body}
          onChange={(event) => updateDraft('body', event.target.value)}
          rows={10}
          placeholder="Write a comment that can later become a b3-backed asset..."
        />
      </Field>

      {viewMode === 'developer' && (
        <div className="comment-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.comment-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="comment-actions">
        <div className="comment-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local draft state</span>
        </div>

        <div className="comment-action-buttons">
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

export function CommentSidePanel({ draftState }) {
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
          { label: 'Crab links', value: stats.crab_links || 0 },
        ]}
        notes={['local draft', 'plain text', 'no receipt']}
      />

      <RouteTruthPanel
        routeKind="comment"
        tone="warning"
        title="Not backend truth"
        copy="This is local UI state only. It does not create a content ID, manifest ID, receipt, index pointer, publication, hold, capture, release, or paid access event."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.comment-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.title || 'Untitled comment'}>
          <div className="comment-preview">
            <p className="comment-preview-meta">
              {manifest?.ownership?.creator_display || 'Unknown creator'} ·{' '}
              {manifest?.metadata?.language || 'en'} · {labelFromSnake(draft.commentKind)}
            </p>

            <div className="comment-preview-tags">
              {draft.contentWarning ? (
                <Badge tone="warning" uppercase={false}>
                  CW: {draft.contentWarning}
                </Badge>
              ) : null}

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

            <pre className="comment-preview-body">
              {draft.body || 'Your comment preview will appear here.'}
            </pre>
          </div>
        </Card>
      )}
    </>
  );
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}