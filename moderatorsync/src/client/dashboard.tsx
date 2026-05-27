import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard.js';
import { context } from '@devvit/web/client';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const params = new URLSearchParams(window.location.search);
const demoMode = params.get('demo') === '1';
const subredditId = context.subredditId || '';

createRoot(root).render(
  <StrictMode>
    <Dashboard subredditId={subredditId} demoMode={demoMode} />
  </StrictMode>
);
