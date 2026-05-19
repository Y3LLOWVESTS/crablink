/**
 * RO:WHAT — Global modal host for trusted CrabLink shell dialogs.
 * RO:WHY — App Integration; Concerns: DX/SEC; centralizes settings, proof views, and future confirmation prompts.
 * RO:INTERACTS — appContext openModal/closeModal, TopBar, future manifest and paid-action confirmations.
 * RO:INVARIANTS — modal display is not proof of backend truth; paid actions still require explicit backend-backed flows.
 * RO:METRICS — none.
 * RO:CONFIG — modal content supplied by trusted route-owned UI.
 * RO:SECURITY — no untrusted HTML; no token rendering.
 * RO:TEST — manual settings modal smoke.
 */

import { useEffect } from 'react';
import { useAppContext } from '../appContext.js';

export default function ModalHost() {
  const { modal, closeModal } = useAppContext();

  useEffect(() => {
    if (!modal) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal, closeModal]);

  if (!modal) {
    return null;
  }

  return (
    <div className="cl-modal-layer" role="presentation" onMouseDown={closeModal}>
      <section
        className={`cl-modal cl-modal-${modal.tone || 'info'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cl-modal-head">
          <div>
            {modal.eyebrow && <p className="cl-eyebrow">{modal.eyebrow}</p>}
            <h2 id="cl-modal-title">{modal.title || 'CrabLink'}</h2>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close dialog">
            ×
          </button>
        </header>
        <div className="cl-modal-body">{modal.content}</div>
        {modal.actions && <footer className="cl-modal-actions">{modal.actions}</footer>}
      </section>
    </div>
  );
}