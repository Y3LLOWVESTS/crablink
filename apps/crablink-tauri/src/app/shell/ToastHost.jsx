/**
 * RO:WHAT — Global toast host for the CrabLink React shell.
 * RO:WHY — App Integration; Concerns: DX/RES; gives route-owned pages consistent status/error feedback.
 * RO:INTERACTS — appContext notify/dismissToast, TopBar gateway checks, future page actions.
 * RO:INVARIANTS — UI feedback only; no backend truth, receipt, balance, or publication claim by itself.
 * RO:METRICS — none.
 * RO:CONFIG — toast TTL supplied by callers.
 * RO:SECURITY — no untrusted HTML; messages render as React text.
 * RO:TEST — manual toast smoke from gateway status button.
 */

import { useAppContext } from '../appContext.js';

export default function ToastHost() {
  const { toasts, dismissToast } = useAppContext();

  if (!toasts.length) {
    return null;
  }

  return (
    <section className="cl-toast-host" aria-live="polite" aria-label="CrabLink notifications">
      {toasts.map((toast) => (
        <article key={toast.id} className={`cl-toast cl-toast-${toast.tone || 'info'}`}>
          <div>
            {toast.title && <strong>{toast.title}</strong>}
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            ×
          </button>
        </article>
      ))}
    </section>
  );
}