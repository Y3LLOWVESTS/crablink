export function makeCrabLinkId(prefix = 'crablink') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
