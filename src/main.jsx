import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/atkinson-hyperlegible-next/latin-300.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';

import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
