import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/spectral/latin-200.css';
import '@fontsource/spectral/latin-300.css';
import '@fontsource/spectral/latin-300-italic.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';

import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
