/**
 * RO:WHAT — Honest React placeholder for future CrabLink embed primitives.
 * RO:WHY — Keeps future video/audio/post/comment/article embeds visible without pretending backend support exists.
 * RO:INTERACTS — crabVideoEmbed.jsx, crabAudioEmbed.jsx, crabArticleEmbed.jsx, crabPostEmbed.jsx, crabCommentEmbed.jsx, embedRegistry.js.
 * RO:INVARIANTS — no fake backend truth; no asset hydration; no wallet action; no direct internal-service calls.
 * RO:METRICS — none.
 * RO:CONFIG — tag, crabUrl, title, and detail props.
 * RO:SECURITY — trusted React text rendering only; no untrusted HTML execution.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; visual route smoke when components are wired.
 */

import { getEmbedSpec, parseCrabTypedUrl } from './embedRegistry.js';

export default function CrabFutureEmbedPlaceholder({
  tag = 'crab-embed',
  crabUrl = '',
  title = '',
  detail = '',
  children = null,
}) {
  const spec = getEmbedSpec(tag);
  const typed = parseCrabTypedUrl(crabUrl);
  const acceptedKinds = Array.isArray(spec?.acceptedKinds) ? spec.acceptedKinds : [];
  const kindOk = typed && acceptedKinds.includes(typed.kind);
  const safeTitle = title || spec?.placeholderTitle || `${tag} not backend-wired yet`;
  const routeContract = spec?.routeContract || 'No backend route contract is active for this embed yet.';

  return (
    <section className="cl-card cl-scaffold-card cl-future-embed-card" role="note" data-crablink-embed={tag}>
      <p className="cl-eyebrow">Future CrabLink embed</p>
      <h1>{safeTitle}</h1>
      <p>
        {spec?.summary || 'This embed tag is reserved for a future CrabLink primitive.'} CrabLink is preserving the
        reference shape, but it will not fake hydration until the backend route and asset DTO exist.
      </p>

      <dl className="cl-proof-list">
        <div>
          <dt>Tag</dt>
          <dd>{tag}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{spec?.status || 'unregistered'}</dd>
        </div>
        <div>
          <dt>Feature gate</dt>
          <dd>{spec?.featureGate || 'none'}</dd>
        </div>
        <div>
          <dt>Route contract</dt>
          <dd>{routeContract}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{crabUrl || 'not supplied'}</dd>
        </div>
        <div>
          <dt>Reference check</dt>
          <dd>{crabUrl ? (kindOk ? 'typed crab URL shape looks valid' : 'not a supported typed URL for this tag yet') : 'missing src'}</dd>
        </div>
      </dl>

      {detail && <p className="cl-muted-copy">{detail}</p>}
      {children}
    </section>
  );
}