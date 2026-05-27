// Custom hook for Dossier state management
// Similar pattern to useCounter from boilerplate

import { useCallback, useEffect, useState } from 'react';
import type { UserMeta, NoteEntry } from '../../types/modsync.js';

interface DossierState {
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
  meta: UserMeta | null;
  notes: NoteEntry[];
  accountCreatedAt: number;
  loading: boolean;
  error: string | null;
}

const defaultState: DossierState = {
  targetUserId: '',
  targetUsername: '',
  subredditId: '',
  subredditName: '',
  meta: null,
  notes: [],
  accountCreatedAt: 0,
  loading: false,
  error: null,
};

export function useDossier(initialData?: {
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
}) {
  const [state, setState] = useState<DossierState>({
    ...defaultState,
    ...(initialData || {}),
  });

  // Fetch dossier data on mount
  useEffect(() => {
    if (!initialData) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const fetchDossier = async () => {
      try {
        const url = `/api/dossier/${initialData.subredditId}/${initialData.targetUserId}?username=${encodeURIComponent(initialData.targetUsername)}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to load dossier');
        }

        const data = await response.json();

        if (data.type === 'error') {
          setState((prev) => ({ ...prev, error: data.message, loading: false }));
          return;
        }

        setState({
          targetUserId: initialData.targetUserId,
          targetUsername: initialData.targetUsername,
          subredditId: initialData.subredditId,
          subredditName: initialData.subredditName,
          meta: data.meta,
          notes: data.notes,
          accountCreatedAt: data.accountCreatedAt,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Unknown error',
          loading: false,
        }));
      }
    };

    fetchDossier();
  }, [initialData?.targetUserId, initialData?.subredditId]);

  const addNote = useCallback(
    async (content: string, noteType: 'info' | 'warning' | 'positive' = 'info') => {
      if (!state.targetUserId || !state.subredditId) {
        setState((prev) => ({ ...prev, error: 'Missing context' }));
        return false;
      }

      try {
        const response = await fetch(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/note`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              noteType,
              modUsername: 'unknown', // Would come from context in real app
              modId: 'unknown',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to add note');
        }

        const data = await response.json();
        setState((prev) => ({ ...prev, notes: data.notes || [] }));
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to add note',
        }));
        return false;
      }
    },
    [state.targetUserId, state.subredditId]
  );

  const setStatus = useCallback(
    async (status: 'TRUSTED' | 'RISK' | 'NEUTRAL') => {
      if (!state.targetUserId || !state.subredditId) {
        setState((prev) => ({ ...prev, error: 'Missing context' }));
        return false;
      }

      try {
        const response = await fetch(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/status`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to set status');
        }

        const data = await response.json();
        setState((prev) => ({ ...prev, meta: data.meta }));
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to set status',
        }));
        return false;
      }
    },
    [state.targetUserId, state.subredditId]
  );

  const updateWatchlist = useCallback(
    async (action: 'add' | 'remove', hours?: number) => {
      if (!state.targetUserId || !state.subredditId) {
        setState((prev) => ({ ...prev, error: 'Missing context' }));
        return false;
      }

      try {
        const response = await fetch(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/watchlist`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, hours: hours || 12 }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update watchlist');
        }

        const data = await response.json();
        setState((prev) => ({ ...prev, meta: data.meta }));
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to update watchlist',
        }));
        return false;
      }
    },
    [state.targetUserId, state.subredditId]
  );

  return {
    ...state,
    addNote,
    setStatus,
    updateWatchlist,
  };
}
