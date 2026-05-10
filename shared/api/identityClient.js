/**
 * RO:WHAT — Identity API helper for the React CrabLink shell.
 * RO:WHY — Keeps passport/profile calls gateway-only and makes backend truth boundaries explicit.
 * RO:INTERACTS — gatewayClient.js, profile pages, PassportChip, future public profile route.
 * RO:INVARIANTS — backend confirms identity truth; no fake usernames/passports; no private alt mappings.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client settings.
 * RO:SECURITY — no private keys, seed phrases, or spend authority handled here.
 * RO:TEST — identity route smoke once backend profile truth is wired.
 */

export function createIdentityClient(gateway) {
  return {
    gateway,
    getMe() {
      return gateway.getIdentityMe();
    },
    resolveCurrentProfile() {
      return gateway.request('/identity/me', { label: 'Current profile' });
    },
  };
}