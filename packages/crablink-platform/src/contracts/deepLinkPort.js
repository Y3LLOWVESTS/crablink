/**
 * RO:WHAT — Deep-link adapter contract.
 * RO:WHY — crab:// OS/browser input must be validated before route navigation.
 * RO:INTERACTS — Tauri deep link handler, Chrome route input.
 * RO:INVARIANTS — crab:// is navigation, not authority.
 */

export function createDeepLinkPort(methods) {
  const required = ["subscribe"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`deep-link port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
