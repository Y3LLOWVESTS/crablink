/**
 * RO:WHAT — Sandbox frame policy helpers for untrusted crab:// site previews.
 * RO:WHY — Keeps the trusted CrabLink React shell separate from user/site HTML.
 * RO:INTERACTS — SiteRender.jsx, safeHtml.js, embedRegistry.js.
 * RO:INVARIANTS — default sandbox is scriptless, formless, popupless, and capability-free.
 * RO:METRICS — exposes policy summary for diagnostics.
 * RO:CONFIG — optional named policies, but defaults fail closed.
 * RO:SECURITY — do not add allow-scripts, allow-forms, allow-popups, or allow-same-origin without reviewed policy.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual named-site iframe smoke.
 */

export const SANDBOX_POLICY_VERSION = 'crablink.sandbox-frame.v1';

export const SANDBOX_POLICIES = Object.freeze({
  sitePreviewStrict: Object.freeze({
    name: 'sitePreviewStrict',
    sandbox: '',
    referrerPolicy: 'no-referrer',
    loading: 'lazy',
    allow: '',
    title: 'CrabLink scriptless site preview',
    description:
      'No scripts, no forms, no popups, no top navigation, no same-origin privileges, and no extension API access.',
    allows: Object.freeze([]),
    blocks: Object.freeze([
      'scripts',
      'forms',
      'popups',
      'downloads',
      'top-navigation',
      'same-origin privileges',
      'extension APIs',
      'wallet authority',
    ]),
  }),
});

export function getDefaultSandboxAttributes() {
  return SANDBOX_POLICIES.sitePreviewStrict.sandbox;
}

export function getSiteIframeSandboxProps(policyName = 'sitePreviewStrict') {
  const policy = getSandboxPolicy(policyName);

  return {
    sandbox: policy.sandbox,
    referrerPolicy: policy.referrerPolicy,
    loading: policy.loading,
    allow: policy.allow,
  };
}

export function getSandboxPolicy(policyName = 'sitePreviewStrict') {
  const safeName = String(policyName || 'sitePreviewStrict').trim();
  return SANDBOX_POLICIES[safeName] || SANDBOX_POLICIES.sitePreviewStrict;
}

export function describeSandboxPolicy(policyName = 'sitePreviewStrict') {
  const policy = getSandboxPolicy(policyName);

  return Object.freeze({
    version: SANDBOX_POLICY_VERSION,
    name: policy.name,
    description: policy.description,
    sandbox: policy.sandbox,
    referrer_policy: policy.referrerPolicy,
    loading: policy.loading,
    allow: policy.allow,
    allows: [...policy.allows],
    blocks: [...policy.blocks],
    security_note:
      'This iframe policy intentionally avoids allow-scripts and allow-same-origin so crab content cannot run as trusted CrabLink UI.',
  });
}

export function assertNoDangerousSandboxTokens(value) {
  const raw = String(value || '').trim().toLowerCase();
  const dangerous = [
    'allow-scripts',
    'allow-forms',
    'allow-popups',
    'allow-popups-to-escape-sandbox',
    'allow-top-navigation',
    'allow-top-navigation-by-user-activation',
    'allow-same-origin',
    'allow-downloads',
  ];

  return Object.freeze({
    ok: !dangerous.some((token) => raw.includes(token)),
    dangerous_tokens: dangerous.filter((token) => raw.includes(token)),
  });
}