/**
 * RO:WHAT — Route owner for the React crab://article creator and publish workspace.
 * RO:WHY — Completes the frontend NEXT_LEVEL text primitive set after post and comment.
 * RO:INTERACTS — ArticleDraft.jsx, ArticlePublishFlow.jsx, articleDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — no fake b3 CID; no fake manifest CID; no silent ROC spend; backend publication only when gateway returns real proof.
 * RO:METRICS — gateway correlation IDs are displayed in the publish flow diagnostics.
 * RO:CONFIG — app settings supply gateway URL, passport subject, wallet account, and dev bearer token.
 * RO:SECURITY — trusted local UI only; all backend calls go through svc-gateway; no arbitrary crab code execution; no wallet spend authority stored here.
 * RO:TEST — npm run build; check-react-lane; manual crab://article route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import ArticleDraft, { ArticleSidePanel } from './ArticleDraft.jsx';
import ArticlePublishFlow from './ArticlePublishFlow.jsx';
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
    title: 'Site-attached publishing',
    copy:
      'A publishable article needs a site context because articles should normally belong to a site, blog, publication, or creator page rather than float disconnected.',
  },
  {
    title: 'Publish boundary',
    copy:
      'The builder can prepare and submit gateway requests, but only real backend responses may create CIDs, receipts, manifests, and index pointers.',
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
      copy="Draft and publish the third site-attached text primitive. Articles should carry title, summary, body, site context, optional hero image, and provenance references before becoming b3-backed assets."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Article primitive', tone: 'warning' },
        { label: 'Gateway publish path', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<ArticleSidePanel draftState={draftState} />}
      className="article-page"
    >
      <RouteTruthPanel
        routeKind="article"
        tone="info"
        title="Article route truth boundary"
        copy="crab://article now has a gateway-wired publish lane. It still does not claim any b3 CID, manifest CID, receipt, index pointer, or wallet mutation unless the backend returns it."
        allowed={[
          'local writing',
          'required site context',
          'article manifest preview',
          'optional hero image reference',
          'gateway prepare attempt',
          'explicit ROC hold',
          'article publish request',
        ]}
      />

      <ArticleDraft app={app} draftState={draftState} />
      <ArticlePublishFlow app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}