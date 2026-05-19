/**
 * RO:WHAT — Pure props-driven comment draft workspace for the React-owned crab://comment route.
 * RO:WHY — NEXT_LEVEL needs comments to be parent-targeted and site-attached before real backend publish routes are used.
 * RO:INTERACTS — CommentPage.jsx, CommentPublishFlow.jsx, commentDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local manifest draft only; no fake b3 CID; no fake manifest CID; no publication claim; no silent ROC spend.
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

  const siteAttached = Boolean(manifest?.site_connection?.attached);
  const parentAttached = Boolean(manifest?.reference_graph?.parent?.attached);

  return (
    <Card
      eyebrow="Builder"
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
        <Badge tone="warning">Draft</Badge>
        <Badge tone="neutral">crab://comment</Badge>
        <Badge tone={siteAttached ? 'success' : 'warning'}>
          {siteAttached ? 'site attached' : 'site required'}
        </Badge>
        <Badge tone={parentAttached ? 'success' : 'warning'}>
          {parentAttached ? 'parent attached' : 'parent required'}
        </Badge>
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
          help="Display label only. Backend identity truth must come from svc-gateway."
        >
          <TextInput
            value={draft.creatorDisplay}
            onChange={(event) => updateDraft('creatorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
          />
        </Field>

        <Field label="Comment kind" help="Planning field for the future backend comment DTO.">
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

        <Field label="Visibility" help="Planning field only; backend policy must enforce access later.">
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

        <Field label="Rights mode" help="Planning field only; backend policy must verify/enforce later.">
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
          help="Required for comment publishing. Use a crab://<64 lowercase hex>.post or crab://<64 lowercase hex>.comment target."
          required
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
          help="Required for publish. Comments should belong to a site context even though comment bytes stay independently content-addressed."
          required
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
        help="Comma-separated draft tags. Backend indexing only happens after real publish succeeds."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="comment, reply"
        />
      </Field>

      <Field
        label="Comment body"
        help="Plain text only. CrabLink will send JSON to the gateway publish route; it does not render comment body as HTML."
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
          <span>{siteAttached && parentAttached ? 'Ready for gateway prepare' : 'Needs site and parent target'}</span>
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
  const siteAttached = Boolean(stats.site_attached);
  const parentAttached = Boolean(stats.parent_attached);
  const threadAttached = Boolean(stats.thread_attached);

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
          { label: 'Site', value: siteAttached ? 'attached' : 'missing' },
          { label: 'Parent', value: parentAttached ? 'attached' : 'missing' },
          { label: 'Thread', value: threadAttached ? 'attached' : 'optional' },
        ]}
        notes={['comment draft', siteAttached ? 'site attached' : 'site required', parentAttached ? 'parent attached' : 'parent required']}
      />

      <RouteTruthPanel
        routeKind="comment"
        tone="warning"
        title="Backend truth boundary"
        copy="The builder can form a comment publish request, but only gateway responses from /assets/comment can create real content IDs, manifest IDs, receipts, index pointers, and crab://<hash>.comment URLs."
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
              <Badge tone={parentAttached ? 'success' : 'warning'} uppercase={false}>
                {parentAttached ? manifest?.reference_graph?.parent?.normalized_crab_url || draft.parentCrabUrl : 'parent target required'}
              </Badge>

              <Badge tone={siteAttached ? 'success' : 'warning'} uppercase={false}>
                {siteAttached ? manifest?.site_connection?.normalized_crab_url || draft.siteContextCrabUrl : 'site context required'}
              </Badge>

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