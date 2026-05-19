/**
 * RO:WHAT — Shared expandable JSON preview for CrabLink developer surfaces.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps raw JSON available without dominating Builder View.
 * RO:INTERACTS — route pages, problem views, future manifest previews.
 * RO:INVARIANTS — developer display only; JSON shown here is not proof of backend truth by itself.
 * RO:METRICS — none.
 * RO:CONFIG — initiallyOpen and label props.
 * RO:SECURITY — no HTML injection; token-like fields are lightly redacted.
 * RO:TEST — visual/manual developer panel smoke.
 */

import { useMemo, useState } from 'react';
import Button from './Button.jsx';

const REDACT_KEYS = new Set([
  'authorization',
  'authToken',
  'auth_token',
  'token',
  'secret',
  'privateKey',
  'private_key',
  'seed',
  'seedPhrase',
  'seed_phrase',
]);

export default function JsonPreview({ data, label = 'JSON', initiallyOpen = false }) {
  const [open, setOpen] = useState(Boolean(initiallyOpen));

  const text = useMemo(() => {
    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(redact(data), null, 2);
    } catch (_error) {
      return String(data ?? '');
    }
  }, [data]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      // Clipboard can fail in extension/dev contexts. The preview still remains visible.
    }
  }

  return (
    <section className="cl-json-preview">
      <header className="cl-json-head">
        <strong>{label}</strong>
        <div className="cl-json-actions">
          <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'}
          </Button>
          <Button variant="secondary" size="sm" onClick={copy}>
            Copy
          </Button>
        </div>
      </header>

      {open && <pre className="cl-json">{text}</pre>}
    </section>
  );
}

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (REDACT_KEYS.has(key)) {
        return [key, '[redacted]'];
      }

      return [key, redact(child)];
    }),
  );
}