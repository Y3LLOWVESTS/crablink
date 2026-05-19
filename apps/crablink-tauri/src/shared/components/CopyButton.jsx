/**
 * RO:WHAT — Shared clipboard button with local success/failure feedback.
 * RO:WHY — App Integration; Concerns: DX/SEC; avoids repeated clipboard handlers across route pages.
 * RO:INTERACTS — Button.jsx, manifest previews, route debug panels, home dashboard.
 * RO:INVARIANTS — copies caller-provided text only; no backend mutation; no wallet action.
 * RO:METRICS — none.
 * RO:CONFIG — text/getText/label/successLabel/errorLabel props.
 * RO:SECURITY — clipboard can fail; never treats copied local JSON as backend truth.
 * RO:TEST — manual copy smoke in HTTP preview and extension contexts.
 */

import { useState } from 'react';
import Button from './Button.jsx';

export default function CopyButton({
  text = '',
  getText = null,
  label = 'Copy',
  successLabel = 'Copied',
  errorLabel = 'Copy failed',
  variant = 'secondary',
  size = 'sm',
  className = '',
  onCopied = null,
}) {
  const [state, setState] = useState('idle');

  async function handleCopy() {
    const value = typeof getText === 'function' ? getText() : text;

    try {
      await navigator.clipboard.writeText(String(value ?? ''));
      setState('success');

      if (typeof onCopied === 'function') {
        onCopied(value);
      }
    } catch (_error) {
      setState('error');
    }

    window.setTimeout(() => setState('idle'), 1800);
  }

  const stateLabel =
    state === 'success' ? successLabel : state === 'error' ? errorLabel : label;

  return (
    <Button
      className={['cl-copy-button', `is-${state}`, className].filter(Boolean).join(' ')}
      variant={variant}
      size={size}
      onClick={handleCopy}
    >
      {stateLabel}
    </Button>
  );
}