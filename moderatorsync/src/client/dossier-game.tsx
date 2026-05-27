import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DossierGame } from './components/DossierGame.js';

interface DossierContext {
  userId: string;
  username: string;
  subredditId: string;
  subredditName: string;
}

const DossierLoader: React.FC = () => {
  const [dossierContext, setDossierContext] = useState<DossierContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      try {
        // First try URL params (for direct links)
        const params = new URLSearchParams(window.location.search);
        const urlUserId = params.get('userId');
        const urlUsername = params.get('username');

        if (urlUserId && urlUsername) {
          setDossierContext({
            userId: urlUserId,
            username: urlUsername,
            subredditId: params.get('subredditId') || context.subredditId || '',
            subredditName: params.get('subredditName') || context.subredditName || '',
          });
          setLoading(false);
          return;
        }

        // Fetch pending dossier context from server
        const subredditId = context.subredditId || '';
        const response = await fetch(`/api/dossier/pending/${subredditId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.userId && data.username) {
            setDossierContext({
              userId: data.userId,
              username: data.username,
              subredditId: data.subredditId || subredditId,
              subredditName: data.subredditName || context.subredditName || '',
            });
            setLoading(false);
            return;
          }
        }

        // No context found
        setError('No user selected. Please open the dossier from a post or comment menu.');
        setLoading(false);
      } catch (err) {
        console.error('Error loading dossier context:', err);
        setError('Failed to load dossier context');
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dossier...</p>
        </div>
      </div>
    );
  }

  if (error || !dossierContext) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-white">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">No User Selected</h2>
          <p className="text-gray-600">{error || 'Please open the dossier from a post or comment menu.'}</p>
          <p className="text-sm text-gray-400 mt-4">
            Click the ⋯ menu on any post or comment and select "ModSync Dossier"
          </p>
        </div>
      </div>
    );
  }

  return (
    <DossierGame
      targetUserId={dossierContext.userId}
      targetUsername={dossierContext.username}
      subredditId={dossierContext.subredditId}
      subredditName={dossierContext.subredditName}
    />
  );
};

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <DossierLoader />
  </StrictMode>
);
