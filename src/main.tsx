import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppBootstrap from './AppBootstrap';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
);
