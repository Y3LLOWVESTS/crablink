import React from 'react';
import ReactDOM from 'react-dom/client';

import { TvApp } from './app/TvApp.jsx';
import './styles/tv.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TvApp />
  </React.StrictMode>,
);
