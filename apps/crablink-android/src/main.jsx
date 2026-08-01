import React from 'react';
import ReactDOM from 'react-dom/client';

import { AndroidApp } from './app/AndroidApp.jsx';
import './styles/base.css';
import './layout/android-shell.css';

ReactDOM.createRoot(
  document.getElementById('root'),
).render(
  <React.StrictMode>
    <AndroidApp />
  </React.StrictMode>,
);
