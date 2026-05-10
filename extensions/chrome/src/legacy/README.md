# Legacy bridge

RO:WHAT — Temporary holding area for old page-layer compatibility code.
RO:WHY — Lets us migrate CrabLink one route at a time without breaking proven flows.
RO:INTERACTS — old page.js/page-* files and new app/pages modules.
RO:INVARIANTS — temporary only; do not add new product behavior here.
RO:SECURITY — no backend mutation or direct service calls.
RO:TEST — remove after new route owners are smoke-green.

## Migration rule

Move behavior from old patch-style files into route-owned pages or shared components, then delete the legacy bridge.

