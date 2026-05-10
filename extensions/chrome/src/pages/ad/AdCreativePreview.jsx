/**
 * RO:WHAT — Safe native preview for a local crab://ad campaign draft.
 * RO:WHY — CrabLink refactor; shows how ads could appear without allowing trackers, scripts, iframes, or autoplay.
 * RO:INTERACTS — AdCampaignDraft.jsx, adDraftModel.js, shared Badge/Card styling.
 * RO:INVARIANTS — preview only; no external network fetch; no destination open; no impression/click tracking.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — renders inert text only; creative image URL is displayed as a reference, not fetched.
 * RO:TEST — npm run build; manual crab://ad builder/developer smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import { labelFromSnake } from './adDraftModel.js';
import { AdSummaryList } from './AdCampaignDraft.jsx';

export default function AdCreativePreview({ draft, manifest }) {
  const headline = cleanText(draft.headline) || 'Your campaign headline';
  const body = cleanText(draft.body) || 'Your privacy-preserving ad copy preview will appear here.';
  const cta = cleanText(draft.callToAction) || 'Learn more';
  const disclaimer = cleanText(draft.disclaimer) || 'Sponsored';
  const sponsor = cleanText(draft.sponsorDisplay) || 'Unverified sponsor';
  const destination = cleanText(draft.destinationCrabUrl);
  const creativeImage = cleanText(draft.creativeImageCrabUrl);
  const tags = manifest?.metadata?.tags || [];

  return (
    <article className="ad-preview" aria-label="Safe ad campaign preview">
      <section className="ad-native-slot">
        <div className="ad-native-slot-label">
          <Badge tone="warning" uppercase={false}>
            {disclaimer}
          </Badge>
          <span>Protocol-native header slot preview</span>
        </div>

        <div className="ad-native-card">
          <div className="ad-native-creative" aria-label="Ad creative image placeholder">
            <span>{creativeImage ? 'Creative image reference set' : 'No creative image yet'}</span>
          </div>

          <div className="ad-native-copy">
            <p className="ad-native-sponsor">{sponsor}</p>
            <h3>{headline}</h3>
            <p>{body}</p>

            <div className="ad-native-actions">
              <button type="button" disabled>
                {cta}
              </button>
              <span>{destination || 'No destination URL yet'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ad-preview-tags">
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.campaignKind)}
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.creativeKind)}
        </Badge>
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

      <AdSummaryList manifest={manifest} />

      <section className="ad-safety-list" aria-label="Ad safety contract">
        <h3>Safety contract</h3>
        <ul>
          <li>Creative image references are displayed as text only in this local draft.</li>
          <li>No external network fetch happens from this preview component.</li>
          <li>No sponsor JavaScript, tracking pixel, iframe, autoplay, popup, or page takeover.</li>
          <li>Future clicks and impressions must be backend-accounted with privacy-preserving policy gates.</li>
        </ul>
      </section>
    </article>
  );
}

function cleanText(value) {
  return String(value || '').trim();
}