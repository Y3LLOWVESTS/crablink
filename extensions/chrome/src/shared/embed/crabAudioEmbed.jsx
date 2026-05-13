/**
 * RO:WHAT — React placeholder component for future crab://<hash>.music/.song audio embeds.
 * RO:WHY — Reserves the audio primitive UX without claiming streaming/range/backend support exists.
 * RO:INTERACTS — CrabFutureEmbedPlaceholder, embedRegistry.js, future music/song asset pages.
 * RO:INVARIANTS — no fake backend truth; lyrics/audio rights remain separate future assets.
 * RO:METRICS — none.
 * RO:CONFIG — crabUrl/title/detail props.
 * RO:SECURITY — trusted React text only; untrusted site HTML stays in sandboxed surfaces.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

import CrabFutureEmbedPlaceholder from './CrabFutureEmbedPlaceholder.jsx';

export default function CrabAudioEmbed(props) {
  return <CrabFutureEmbedPlaceholder tag="crab-audio" {...props} />;
}