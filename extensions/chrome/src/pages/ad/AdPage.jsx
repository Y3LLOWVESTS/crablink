/**
 * RO:WHAT — Route owner for the React crab://ad local campaign workspace.
 * RO:WHY — CrabLink refactor; models protocol-native ad campaign manifests without enabling spend or tracking.
 * RO:INTERACTS — AdCampaignDraft, AdCreativePreview, useCreatorDraft, CreatorWorkspaceLayout, shared shell header ad slot.
 * RO:INVARIANTS — local draft only; one native header ad concept; no third-party tracking; no fake b3 CID; no ROC spend.
 * RO:METRICS — none; future ad impressions/clicks must be backend-accounted and privacy-preserving.
 * RO:CONFIG — route props only; future ad policy/economics config comes from backend/policy.
 * RO:SECURITY — no arbitrary scripts, popups, page takeover, external trackers, or wallet authority.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://ad route smoke in light and dark mode.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import AdCampaignDraft, { AdSidePanel } from './AdCampaignDraft.jsx';
import {
  DEFAULT_AD_DRAFT,
  buildAdManifestDraft,
  getAdCompleteness,
  statsForAdDraft,
} from './adDraftModel.js';
import './ad.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Protocol-native, not invasive',
    copy:
      'CrabLink ads should feel like a native, clearly labeled value-sharing surface, not a tracker-heavy third-party ad network.',
  },
  {
    title: 'One labeled header slot',
    copy:
      'The product rule is one standardized, visible header ad slot. No popups, autoplay, hidden pixels, or page takeovers.',
  },
  {
    title: 'No spend or tracking here',
    copy:
      'This workspace drafts a campaign manifest only. It does not spend ROC, record impressions, record clicks, or publish campaigns.',
  },
]);

export default function AdPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildAdManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_AD_DRAFT,
    buildManifest,
    buildStats: statsForAdDraft,
    getCompleteness: getAdCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://ad"
      title="Ad Campaign Studio"
      copy="Draft protocol-native ad campaign manifests for a future privacy-preserving CrabLink ad plane. This React route is local-only and does not publish, track, spend ROC, or claim review approval."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Privacy-first ads', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<AdSidePanel draftState={draftState} />}
      className="ad-page"
    >
      <RouteTruthPanel
        routeKind="ad"
        tone="info"
        title="Ad route truth boundary"
        allowed={[
          'local campaign drafting',
          'native header creative preview',
          'privacy policy planning',
          'manifest JSON preview',
        ]}
        blocked={[
          'no campaign publication',
          'no ad serving',
          'no impressions recorded',
          'no clicks recorded',
          'no third-party tracking',
          'no ROC budget hold/capture/release',
          'no policy approval claim',
        ]}
      />

      <AdCampaignDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}