/**
 * RO:WHAT — Route owner for the React crab://post creator and publish workspace.
 * RO:WHY — NEXT_LEVEL starts text primitives one at a time; post is the first site-attached text asset lane.
 * RO:INTERACTS — PostDraft.jsx, PostPublishFlow.jsx, postDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — no fake b3 CID; no fake manifest CID; no silent ROC spend; backend publication only when gateway returns real proof.
 * RO:METRICS — gateway correlation IDs are displayed in the publish flow diagnostics.
 * RO:CONFIG — app settings supply gateway URL, passport subject, wallet account, and dev bearer token.
 * RO:SECURITY — trusted local UI only; all backend calls go through svc-gateway; no arbitrary crab code execution; no wallet spend authority stored here.
 * RO:TEST — npm run build; check-react-lane; manual crab://post route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import PostDraft, { PostSidePanel } from './PostDraft.jsx';
import PostPublishFlow from './PostPublishFlow.jsx';
import {
  DEFAULT_POST_DRAFT,
  buildPostManifestDraft,
  getPostCompleteness,
  statsForPostDraft,
} from './postDraftModel.js';
import './post.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Site-attached primitive',
    copy:
      'Posts are expected to belong to a site context. The post remains its own b3-backed asset, while the site stores references instead of owning all bytes.',
  },
  {
    title: 'Reference graph ready',
    copy:
      'A post can point to a parent post/comment, site context, embedded image, article, comment thread, or profile without collapsing into one giant site database.',
  },
  {
    title: 'Publish boundary',
    copy:
      'The builder can prepare and submit gateway requests, but only real backend responses may create CIDs, receipts, manifests, and index pointers.',
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
      copy="Draft and publish the first site-attached text/social primitive. The builder prepares the post and the publish panel can call the expected gateway routes, but it only shows backend truth after real gateway responses."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Post primitive', tone: 'warning' },
        { label: 'Gateway publish path', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<PostSidePanel draftState={draftState} />}
      className="post-page"
    >
      <RouteTruthPanel
        routeKind="post"
        tone="info"
        title="Post route truth boundary"
        copy="crab://post now has a gateway-wired publish lane. It still does not claim any b3 CID, manifest CID, receipt, index pointer, or wallet mutation unless the backend returns it."
        allowed={[
          'local writing',
          'required site connection',
          'post manifest preview',
          'gateway prepare attempt',
          'explicit ROC hold',
          'post publish request',
        ]}
      />

      <PostDraft app={app} draftState={draftState} />
      <PostPublishFlow app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}