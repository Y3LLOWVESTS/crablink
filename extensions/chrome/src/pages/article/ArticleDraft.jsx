/**
 * RO:WHAT — Pure props-driven article draft workspace for the React-owned crab://article route.
 * RO:WHY — CrabLink refactor; reuses shared creator panels and keeps route state owned by ArticlePage.
 * RO:INTERACTS — ArticlePage.jsx, articleDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication claim; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport/wallet display labels from app settings.
 * RO:SECURITY — trusted UI only; no private keys; no seed phrases; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://article route smoke.
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
  ARTICLE_KIND_OPTIONS,
  ARTICLE_MODERATION_OPTIONS,
  ARTICLE_RIGHTS_OPTIONS,
  ARTICLE_VIEW_OPTIONS,
  ARTICLE_VISIBILITY_OPTIONS,
} from './articleDraftModel.js';

export default function ArticleDraft({ app, draftState }) {
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
      title="Article draft"
      className="article-draft-card"
      actions={
        <SegmentedControl
          options={ARTICLE_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Article workspace mode"
          size="sm"
        />
      }
    >
      <div className="article-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://article</Badge>
        <Badge tone="neutral">No wallet action</Badge>
      </div>

      <div className="article-form-grid">
        <Field label="Title" help="Creator-facing article title. This is local draft text only.">
          <TextInput
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Example: The first crab-native article"
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

        <Field label="Subtitle" help="Optional short subtitle for the article page preview.">
          <TextInput
            value={draft.subtitle}
            onChange={(event) => updateDraft('subtitle', event.target.value)}
            placeholder="A short supporting line"
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

        <Field label="Article kind" help="Planning field only; no backend schema is claimed here.">
          <select
            className="cl-select"
            value={draft.articleKind}
            onChange={(event) => updateDraft('articleKind', event.target.value)}
          >
            {ARTICLE_KIND_OPTIONS.map((option) => (
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
            {ARTICLE_VISIBILITY_OPTIONS.map((option) => (
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
            {ARTICLE_RIGHTS_OPTIONS.map((option) => (
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
            {ARTICLE_MODERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Summary"
        help="Short plain-text summary for manifest preview and future cards."
      >
        <TextArea
          value={draft.summary}
          onChange={(event) => updateDraft('summary', event.target.value)}
          rows={3}
          placeholder="Summarize the article in a sentence or two..."
        />
      </Field>

      <div className="article-form-grid">
        <Field
          label="Site context crab URL"
          help="Optional future reference to the site where this article belongs."
        >
          <TextInput
            value={draft.siteContextCrabUrl}
            onChange={(event) => updateDraft('siteContextCrabUrl', event.target.value)}
            placeholder="crab://example-site"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Hero image crab URL"
          help="Optional future reference to an image asset used as the article hero."
        >
          <TextInput
            value={draft.heroImageCrabUrl}
            onChange={(event) => updateDraft('heroImageCrabUrl', event.target.value)}
            placeholder="crab://<64 lowercase hex>.image"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Linked source crab URL"
          help="Optional source/reference pointer for provenance."
        >
          <TextInput
            value={draft.linkedSourceCrabUrl}
            onChange={(event) => updateDraft('linkedSourceCrabUrl', event.target.value)}
            placeholder="crab://<64 lowercase hex>.post"
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

      <Field
        label="Tags"
        help="Comma-separated draft tags. These are not indexed until a real backend publish route exists."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="article, essay, rustyonions"
        />
      </Field>

      <Field
        label="Article body"
        help="Plain text/Markdown-like draft text only. This page does not render articles as HTML."
        required
      >
        <TextArea
          value={draft.body}
          onChange={(event) => updateDraft('body', event.target.value)}
          rows={16}
          placeholder="Write an article that can later become a b3-backed asset..."
        />
      </Field>

      {viewMode === 'developer' && (
        <div className="article-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.article-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="article-actions">
        <div className="article-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local draft state</span>
        </div>

        <div className="article-action-buttons">
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

export function ArticleSidePanel({ draftState }) {
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
          { label: 'Read min', value: stats.reading_minutes || 0 },
        ]}
        notes={['local draft', 'plain text', 'no receipt']}
      />

      <RouteTruthPanel
        routeKind="article"
        tone="warning"
        title="Not backend truth"
        copy="This is local UI state only. It does not create a content ID, manifest ID, receipt, index pointer, publication, hold, capture, release, or paid access event."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.article-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.title || 'Untitled article'}>
          <article className="article-preview">
            {draft.subtitle ? <p className="article-preview-subtitle">{draft.subtitle}</p> : null}

            <p className="article-preview-meta">
              {manifest?.ownership?.creator_display || 'Unknown creator'} ·{' '}
              {manifest?.metadata?.language || 'en'} · {labelFromSnake(draft.articleKind)}
            </p>

            <div className="article-preview-tags">
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

            {draft.summary ? <p className="article-preview-summary">{draft.summary}</p> : null}

            <pre className="article-preview-body">
              {draft.body || 'Your article preview will appear here.'}
            </pre>
          </article>
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