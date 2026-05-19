/**
 * RO:WHAT — Route owner for the React crab://comment creator and publish workspace.
 * RO:WHY — NEXT_LEVEL text primitives continue post → comment → article, with comment becoming the second gateway-wired page contract.
 * RO:INTERACTS — CommentDraft.jsx, CommentPublishFlow.jsx, commentDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — no fake b3 CID; no fake manifest CID; no silent ROC spend; backend publication only when gateway returns real proof.
 * RO:METRICS — gateway correlation IDs are displayed in the publish flow diagnostics.
 * RO:CONFIG — app settings supply gateway URL, passport subject, wallet account, and dev bearer token.
 * RO:SECURITY — trusted local UI only; all backend calls go through svc-gateway; no arbitrary crab code execution; no wallet spend authority stored here.
 * RO:TEST — npm run build; check-react-lane; manual crab://comment route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import CommentDraft, { CommentSidePanel } from './CommentDraft.jsx';
import CommentPublishFlow from './CommentPublishFlow.jsx';
import {
  DEFAULT_COMMENT_DRAFT,
  buildCommentManifestDraft,
  getCommentCompleteness,
  statsForCommentDraft,
} from './commentDraftModel.js';
import './comment.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Thread primitive',
    copy:
      'Comments should become their own typed assets so threads, posts, sites, profiles, and moderation views can reference them without owning all comment data directly.',
  },
  {
    title: 'Required context',
    copy:
      'A publishable comment needs a site context plus a parent post/comment target, while the comment bytes stay independently content-addressed.',
  },
  {
    title: 'Publish boundary',
    copy:
      'The builder can prepare and submit gateway requests, but only real backend responses may create CIDs, receipts, manifests, and index pointers.',
  },
]);

export default function CommentPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildCommentManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_COMMENT_DRAFT,
    buildManifest,
    buildStats: statsForCommentDraft,
    getCompleteness: getCommentCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://comment"
      title="Comment Workspace"
      copy="Draft and publish the second site-attached text primitive. Comments should point at a parent post/comment plus site context, then become their own b3-backed assets when the backend route exists."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Comment primitive', tone: 'warning' },
        { label: 'Gateway publish path', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<CommentSidePanel draftState={draftState} />}
      className="comment-page"
    >
      <RouteTruthPanel
        routeKind="comment"
        tone="info"
        title="Comment route truth boundary"
        copy="crab://comment now has a gateway-wired publish lane. It still does not claim any b3 CID, manifest CID, receipt, index pointer, or wallet mutation unless the backend returns it."
        allowed={[
          'local writing',
          'required site context',
          'required parent target',
          'comment manifest preview',
          'gateway prepare attempt',
          'explicit ROC hold',
          'comment publish request',
        ]}
      />

      <CommentDraft app={app} draftState={draftState} />
      <CommentPublishFlow app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}