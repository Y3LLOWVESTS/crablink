/**
 * RO:WHAT — Pure props-driven article draft workspace for the React-owned crab://article route.
 * RO:WHY — NEXT_LEVEL needs articles to be site-attached before real backend publish routes are used.
 * RO:INTERACTS — ArticlePage.jsx, ArticlePublishFlow.jsx, articleDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local manifest draft only; no fake b3 CID; no fake manifest CID; no publication claim; no silent ROC spend.
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

  const siteAttached = Boolean(manifest?.site_connection?.attached);
  const heroImageAttached = Boolean(manifest?.reference_graph?.hero_image?.attached);
  const sourceAttached = Boolean(manifest?.reference_graph?.source?.attached);

  return (
    <Card
      eyebrow="Builder"
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
        <Badge tone="warning">Draft</Badge>
        <Badge tone="neutral">crab://article</Badge>
        <Badge tone={siteAttached ? 'success' : 'warning'}>
          {siteAttached ? 'site attached' : 'site required'}
        </Badge>
        <Badge tone={heroImageAttached ? 'success' : 'neutral'}>
          {heroImageAttached ? 'hero image linked' : 'hero optional'}
        </Badge>
      </div>

      <div className="article-form-grid">
        <Field label="Title" help="Creator-facing article title. Backend will verify final publish data." required>
          <TextInput
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Example: The first crab-native article"
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

        <Field label="Article kind" help="Planning field for the future backend article DTO.">
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

        <Field label="Visibility" help="Planning field only; backend policy must enforce access later.">
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

        <Field label="Rights mode" help="Planning field only; backend policy must verify/enforce later.">
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
          help="Required for article publishing. Articles should belong to a site, blog, publication, or creator page."
          required
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
          help="Optional reference to an image asset used as the article hero."
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
        help="Comma-separated draft tags. Backend indexing only happens after real publish succeeds."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="article, essay, rustyonions"
        />
      </Field>

      <Field
        label="Article body"
        help="Plain text/Markdown-like draft text. CrabLink sends JSON to the gateway publish route; it does not render article body as HTML."
        required
      >
        <TextArea
          value={draft.body}
          onChange={(event) => updateDraft('body', event.target.value)}
          rows={16}
          placeholder="Write an article that can become a b3-backed article asset..."
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
          <span>{siteAttached ? 'Ready for gateway prepare' : 'Needs site connection'}</span>
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
  const siteAttached = Boolean(stats.site_attached);
  const heroImageAttached = Boolean(stats.hero_image_attached);
  const sourceAttached = Boolean(stats.source_attached);

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
          { label: 'Site', value: siteAttached ? 'attached' : 'missing' },
          { label: 'Hero', value: heroImageAttached ? 'linked' : 'optional' },
          { label: 'Source', value: sourceAttached ? 'linked' : 'optional' },
        ]}
        notes={[
          'article draft',
          siteAttached ? 'site attached' : 'site required',
          'backend proof required',
        ]}
      />

      <RouteTruthPanel
        routeKind="article"
        tone="warning"
        title="Backend truth boundary"
        copy="The builder can form an article publish request, but only gateway responses from /assets/article can create real content IDs, manifest IDs, receipts, index pointers, and crab://<hash>.article URLs."
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
              <Badge tone={siteAttached ? 'success' : 'warning'} uppercase={false}>
                {siteAttached ? manifest?.site_connection?.normalized_crab_url : 'site connection required'}
              </Badge>

              {heroImageAttached ? (
                <Badge tone="success" uppercase={false}>
                  hero image linked
                </Badge>
              ) : null}

              {sourceAttached ? (
                <Badge tone="success" uppercase={false}>
                  source linked
                </Badge>
              ) : null}

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