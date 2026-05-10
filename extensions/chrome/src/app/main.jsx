/**
 * RO:WHAT — React entrypoint for the CrabLink full-tab browser shell.
 * RO:WHY — CrabLink refactor; replaces patch-heavy DOM ownership with a single app root.
 * RO:INTERACTS — App.jsx, page.html, shared theme/styles, route registry.
 * RO:INVARIANTS — gateway-only client boundary; no fake backend truth; no silent ROC spend.
 * RO:METRICS — none yet.
 * RO:CONFIG — extension settings are loaded by App/settings.
 * RO:SECURITY — untrusted crab content must render through sandboxed surfaces.
 * RO:TEST — npm run build and Chrome manual route smoke.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import '../shared/theme/themeTokens.css';
import '../shared/theme/light.css';
import '../shared/theme/dark.css';
import '../shared/styles/base.css';
import '../shared/styles/layout.css';
import '../shared/styles/forms.css';
import '../shared/styles/cards.css';
import '../shared/styles/modals.css';
import '../shared/styles/developer.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('CrabLink root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

