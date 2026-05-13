/**
 * RO:WHAT — React placeholder component for future crab://<hash>.post embeds.
 * RO:WHY — Reserves the post primitive UX before text asset DTOs and routes are wired.
 * RO:INTERACTS — CrabFutureEmbedPlaceholder, embedRegistry.js, future post/thread pages.
 * RO:INVARIANTS — no fake backend truth; no publish/read claim until .post contracts exist.
 * RO:METRICS — none.
 * RO:CONFIG — crabUrl/title/detail props.
 * RO:SECURITY — trusted React text only; untrusted site HTML stays in sandboxed surfaces.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

import CrabFutureEmbedPlaceholder from './CrabFutureEmbedPlaceholder.jsx';

export default function CrabPostEmbed(props) {
  return <CrabFutureEmbedPlaceholder tag="crab-post" {...props} />;
}