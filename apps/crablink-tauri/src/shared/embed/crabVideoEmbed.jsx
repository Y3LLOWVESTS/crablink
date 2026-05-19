/**
 * RO:WHAT — React placeholder component for future crab://<hash>.video embeds.
 * RO:WHY — Reserves the video primitive UX without claiming streaming/range/backend support exists.
 * RO:INTERACTS — CrabFutureEmbedPlaceholder, embedRegistry.js, future video asset pages.
 * RO:INVARIANTS — no fake backend truth; no media playback until backend media-lite/streaming contracts exist.
 * RO:METRICS — none.
 * RO:CONFIG — crabUrl/title/detail props.
 * RO:SECURITY — trusted React text only; untrusted site HTML stays in sandboxed surfaces.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

import CrabFutureEmbedPlaceholder from './CrabFutureEmbedPlaceholder.jsx';

export default function CrabVideoEmbed(props) {
  return <CrabFutureEmbedPlaceholder tag="crab-video" {...props} />;
}