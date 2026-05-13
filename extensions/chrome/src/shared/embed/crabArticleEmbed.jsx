/**
 * RO:WHAT — React placeholder component for future crab://<hash>.article embeds.
 * RO:WHY — Reserves the article primitive UX before text asset DTOs and routes are wired.
 * RO:INTERACTS — CrabFutureEmbedPlaceholder, embedRegistry.js, future article asset pages.
 * RO:INVARIANTS — no fake backend truth; no publish/read claim until .article contracts exist.
 * RO:METRICS — none.
 * RO:CONFIG — crabUrl/title/detail props.
 * RO:SECURITY — trusted React text only; untrusted site HTML stays in sandboxed surfaces.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

import CrabFutureEmbedPlaceholder from './CrabFutureEmbedPlaceholder.jsx';

export default function CrabArticleEmbed(props) {
  return <CrabFutureEmbedPlaceholder tag="crab-article" {...props} />;
}