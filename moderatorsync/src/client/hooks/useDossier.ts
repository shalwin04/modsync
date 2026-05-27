// Custom hook for Dossier state management

import { useCallback, useEffect, useState } from 'react';
import type { UserMeta, NoteEntry } from '../../types/modsync.js';

interface UserMetrics {
  removalRate?: string;
  maturityDelta?: string;
  totalActions?: number;
  isHighRisk?: boolean;
  riskScore?: number;
}

interface DossierState {
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
  meta: UserMeta | null;
  notes: NoteEntry[];
  accountCreatedAt: number;
  metrics?: UserMetrics | null;
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
  metrics: null,
  loading: false,
  error: null,
};

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

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

  const fetchDossier = useCallback(async (subId: string, userId: string, username: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const url = `/api/dossier/${subId}/${userId}?username=${encodeURIComponent(username)}`;
      const data = await fetchWithRetry<any>(url);

      if (data.type === 'error') {
        setState((prev) => ({ ...prev, error: data.message || 'Failed to load dossier', loading: false }));
        return;
      }

      setState((prev) => ({
        ...prev,
        targetUserId: userId,
        targetUsername: username,
        subredditId: subId,
        subredditName: prev.subredditName || '',
        meta: data.meta,
        notes: data.notes || [],
        accountCreatedAt: data.accountCreatedAt || 0,
        metrics: data.metrics || null,
        loading: false,
        error: null,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load dossier. Please try again.';
      setState((prev) => ({ ...prev, error: errorMsg, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!initialData) return;
    fetchDossier(initialData.subredditId, initialData.targetUserId, initialData.targetUsername);
  }, [initialData?.subredditId, initialData?.targetUserId, initialData?.targetUsername, fetchDossier]);

  const reloadNotes = useCallback(async () => {
    if (!state.subredditId || !state.targetUserId) return;
    await fetchDossier(state.subredditId, state.targetUserId, state.targetUsername);
  }, [state.subredditId, state.targetUserId, state.targetUsername, fetchDossier]);

  const addNote = useCallback(
    async (content: string, noteType: 'info' | 'warning' | 'positive' = 'info') => {
      if (!state.targetUserId || !state.subredditId) {
        setState((prev) => ({ ...prev, error: 'Missing context' }));
        return false;
      }

      try {
        const data = await fetchWithRetry<any>(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/note`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, noteType, modUsername: 'unknown', modId: 'unknown' }),
          }
        );

        setState((prev) => ({ ...prev, notes: data.notes || [], error: null }));
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add note';
        setState((prev) => ({ ...prev, error: errorMsg }));
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
        const data = await fetchWithRetry<any>(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/status`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        );

        setState((prev) => ({ ...prev, meta: data.meta, error: null }));
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to set status';
        setState((prev) => ({ ...prev, error: errorMsg }));
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
        const data = await fetchWithRetry<any>(
          `/api/dossier/${state.subredditId}/${state.targetUserId}/watchlist`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, hours: hours || 12 }),
          }
        );

        setState((prev) => ({ ...prev, meta: data.meta, error: null }));
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update watchlist';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return false;
      }
    },
    [state.targetUserId, state.subredditId]
  );

  const recordRemoval = useCallback(async () => {
    if (!state.targetUserId || !state.subredditId) {
      setState((prev) => ({ ...prev, error: 'Missing context' }));
      return false;
    }

    try {
      const data = await fetchWithRetry<any>(
        `/api/dossier/${state.subredditId}/${state.targetUserId}/action/removal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      setState((prev) => ({ ...prev, meta: data.meta, error: null }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record removal';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }
  }, [state.targetUserId, state.subredditId]);

  const recordApproval = useCallback(async () => {
    if (!state.targetUserId || !state.subredditId) {
      setState((prev) => ({ ...prev, error: 'Missing context' }));
      return false;
    }

    try {
      const data = await fetchWithRetry<any>(
        `/api/dossier/${state.subredditId}/${state.targetUserId}/action/approval`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      setState((prev) => ({ ...prev, meta: data.meta, error: null }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record approval';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }
  }, [state.targetUserId, state.subredditId]);

  const recordAutomodCatch = useCallback(async () => {
    if (!state.targetUserId || !state.subredditId) {
      setState((prev) => ({ ...prev, error: 'Missing context' }));
      return false;
    }

    try {
      const data = await fetchWithRetry<any>(
        `/api/dossier/${state.subredditId}/${state.targetUserId}/action/automod`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      setState((prev) => ({ ...prev, meta: data.meta, error: null }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record automod catch';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }
  }, [state.targetUserId, state.subredditId]);

  return {
    ...state,
    addNote,
    setStatus,
    updateWatchlist,
    recordRemoval,
    recordApproval,
    recordAutomodCatch,
    reloadNotes,
  } as const;
}
