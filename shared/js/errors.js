export function redactSecret(value) {
  if (!value) return '';
  return `${String(value).slice(0, 4)}…redacted`;
}
