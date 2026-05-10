/**
 * RO:WHAT — Route owner for the React crab://post local creator workspace.
 * RO:WHY — CrabLink refactor; migrates a low-risk text/social primitive onto shared creator workspace architecture.
 * RO:INTERACTS — PostDraft.jsx, postDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://post route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import PostDraft, { PostSidePanel } from './PostDraft.jsx';
import {
  DEFAULT_POST_DRAFT,
  buildPostManifestDraft,
  getPostCompleteness,
  statsForPostDraft,
} from './postDraftModel.js';
import './post.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Standalone primitive',
    copy:
      'Posts should become their own typed assets so sites, profiles, feeds, and threads can reference them instead of owning all content directly.',
  },
  {
    title: 'Reference graph ready',
    copy:
      'A post can later point to a parent post, site context, embedded image, article, comment thread, or profile without collapsing into one giant site database.',
  },
  {
    title: 'Moderation boundary',
    copy:
      'Posts need creator/site moderation state, visibility policy, and provenance without pretending local drafts are backend-confirmed truth.',
  },
]);

export default function PostPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildPostManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_POST_DRAFT,
    buildManifest,
    buildStats: statsForPostDraft,
    getCompleteness: getPostCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://post"
      title="Post Workspace"
      copy="Draft standalone social/text post assets that can later be referenced by sites, profiles, feeds, threads, comments, and creator pages. This React route is local-only and does not publish anything yet."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Text/social primitive', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<PostSidePanel draftState={draftState} />}
      className="post-page"
    >
      <RouteTruthPanel
        routeKind="post"
        tone="info"
        title="Post route truth boundary"
        allowed={['local writing', 'post manifest preview', 'copy JSON', 'builder/developer view']}
      />

      <PostDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}