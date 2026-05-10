/**
 * RO:WHAT — Route owner for the React crab://article local creator workspace.
 * RO:WHY — CrabLink refactor; migrates a low-risk long-form content primitive onto shared creator workspace architecture.
 * RO:INTERACTS — ArticleDraft.jsx, articleDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://article route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import ArticleDraft, { ArticleSidePanel } from './ArticleDraft.jsx';
import {
  DEFAULT_ARTICLE_DRAFT,
  buildArticleManifestDraft,
  getArticleCompleteness,
  statsForArticleDraft,
} from './articleDraftModel.js';
import './article.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Long-form primitive',
    copy:
      'Articles should become standalone typed assets so sites, profiles, feeds, and references can point to them without copying the article into every page.',
  },
  {
    title: 'Reference graph ready',
    copy:
      'An article can later link to a hero image, source material, comments, posts, authors, versions, and site context through manifest-backed references.',
  },
  {
    title: 'Publishing boundary',
    copy:
      'Local drafts can preview structure and metadata, but only backend routes can create canonical b3 content, manifests, receipts, and index pointers.',
  },
]);

export default function ArticlePage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildArticleManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_ARTICLE_DRAFT,
    buildManifest,
    buildStats: statsForArticleDraft,
    getCompleteness: getArticleCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://article"
      title="Article Workspace"
      copy="Draft long-form article assets that can later be referenced by sites, profiles, posts, comments, feeds, and creator pages. This React route is local-only and does not publish anything yet."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Long-form primitive', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<ArticleSidePanel draftState={draftState} />}
      className="article-page"
    >
      <RouteTruthPanel
        routeKind="article"
        tone="info"
        title="Article route truth boundary"
        allowed={['local writing', 'article manifest preview', 'copy JSON', 'builder/developer view']}
      />

      <ArticleDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}