/**
 * RO:WHAT — Desktop compatibility path for the platform-neutral onboarding contract.
 * RO:WHY — Desktop, TV, mobile, and tablet consumers must resolve one shared contract owner.
 * RO:INTERACTS — @crablink/core onboardingContract.js and desktop onboarding parity tests.
 * RO:INVARIANTS — re-export only; no duplicated states, DTO fields, custody rules, or platform APIs.
 */

export * from '../../../../packages/crablink-core/src/onboardingContract.js';
