/**
 * RO:WHAT — Route owner for the React crab://comment local creator workspace.
 * RO:WHY — CrabLink refactor; migrates a low-risk comment primitive onto shared creator workspace architecture.
 * RO:INTERACTS — CommentDraft.jsx, commentDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://comment route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import CommentDraft, { CommentSidePanel } from './CommentDraft.jsx';
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
    title: 'Context pointer',
    copy:
      'A comment can later point to a parent post, another comment, a site context, or a thread context while keeping the comment bytes independently content-addressed.',
  },
  {
    title: 'Moderation ready',
    copy:
      'Comments need moderation state, visibility policy, provenance, and creator identity without pretending local drafts are backend-confirmed truth.',
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
      copy="Draft standalone comment assets that can later be referenced by posts, threads, sites, moderation views, profiles, and creator pages. This React route is local-only and does not publish anything yet."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Thread primitive', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<CommentSidePanel draftState={draftState} />}
      className="comment-page"
    >
      <RouteTruthPanel
        routeKind="comment"
        tone="info"
        title="Comment route truth boundary"
        allowed={['local writing', 'comment manifest preview', 'copy JSON', 'builder/developer view']}
      />

      <CommentDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}