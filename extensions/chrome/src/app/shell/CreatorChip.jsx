/**
 * RO:WHAT — Creator identity chip scaffold.
 * RO:WHY — Shows site/asset creator identity when gateway responses provide it.
 * RO:INTERACTS — hydrated asset/site DTOs and Shell.
 * RO:INVARIANTS — placeholder identity must be clearly local/stub unless backend confirmed.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no private identity data rendered.
 * RO:TEST — site/asset creator display smoke.
 */

export default function CreatorChip() {
  return <span className="cl-chip">Creator</span>;
}

