/**
 * RO:WHAT — React placeholder component for future crab://<hash>.comment embeds.
 * RO:WHY — Reserves the comment primitive UX before text asset DTOs and routes are wired.
 * RO:INTERACTS — CrabFutureEmbedPlaceholder, embedRegistry.js, future comment/thread pages.
 * RO:INVARIANTS — no fake backend truth; no publish/read claim until .comment contracts exist.
 * RO:METRICS — none.
 * RO:CONFIG — crabUrl/title/detail props.
 * RO:SECURITY — trusted React text only; untrusted site HTML stays in sandboxed surfaces.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

import CrabFutureEmbedPlaceholder from './CrabFutureEmbedPlaceholder.jsx';

export default function CrabCommentEmbed(props) {
  return <CrabFutureEmbedPlaceholder tag="crab-comment" {...props} />;
}