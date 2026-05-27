import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DossierGame } from './components/DossierGame.js';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Get dossier context from URL params or session storage
const params = new URLSearchParams(window.location.search);
const targetUserId = params.get('userId') || sessionStorage.getItem('dossier.targetUserId') || '';
const targetUsername = params.get('username') || sessionStorage.getItem('dossier.targetUsername') || 'Unknown';
const subredditId = context.subredditId || sessionStorage.getItem('dossier.subredditId') || '';
const subredditName = context.subredditName || sessionStorage.getItem('dossier.subredditName') || '';

createRoot(root).render(
  <StrictMode>
    <DossierGame
      targetUserId={targetUserId}
      targetUsername={targetUsername}
      subredditId={subredditId}
      subredditName={subredditName}
    />
  </StrictMode>
);
