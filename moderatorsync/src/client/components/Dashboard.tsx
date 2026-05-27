import React, { useEffect, useState, useMemo } from 'react';
import { formatWatchlistRemaining } from '../../utils/formatters.js';
import { navigateTo } from '@devvit/web/client';

interface DashboardProps {
  subredditId: string;
  demoMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ subredditId, demoMode = false }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [highRisk, setHighRisk] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'risk' | 'removals' | 'recent'>('risk');

  useEffect(() => {
    if (!subredditId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (demoMode) {
          await fetch('/api/demo/bootstrap').catch(() => null);
        }

        const [watchlistRes, highRiskRes] = await Promise.all([
          fetch(`/api/dashboard/${subredditId}/watchlist`),
          fetch(`/api/dashboard/${subredditId}/highrisk`),
        ]);

        const watchlistData = await watchlistRes.json();
        const highRiskData = await highRiskRes.json();

        if (cancelled) return;

        if (watchlistData.error) {
          setError(watchlistData.error);
        } else {
          setUsers(watchlistData.users || []);
        }

        if (!highRiskData.error) {
          setHighRisk(highRiskData.users || []);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [subredditId, demoMode]);

  const filtered = useMemo(() => {
    let list = users.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) => u.userId.toLowerCase().includes(q));
    }

    if (sort === 'risk') {
      list.sort((a, b) => (b.metrics?.riskScore || 0) - (a.metrics?.riskScore || 0));
    } else if (sort === 'removals') {
      list.sort((a, b) => (b.meta?.total_removals || 0) - (a.meta?.total_removals || 0));
    }

    return list;
  }, [users, query, sort]);

  async function setStatus(subId: string, userId: string, status: string) {
    try {
      await fetch(`/api/dossier/${subId}/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Refresh
      const refreshed = await (await fetch(`/api/dashboard/${subredditId}/watchlist`)).json();
      setUsers(refreshed.users || []);
    } catch (e) {
      console.error('Set status error', e);
    }
  }

  async function removeFromWatchlist(subId: string, userId: string) {
    try {
      await fetch(`/api/dossier/${subId}/${userId}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' }),
      });
      const refreshed = await (await fetch(`/api/dashboard/${subredditId}/watchlist`)).json();
      setUsers(refreshed.users || []);
    } catch (e) {
      console.error('Remove watchlist error', e);
    }
  }

  if (loading) return <div className="p-4">Loading dashboard...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4 space-y-3">
      {demoMode && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Demo mode is active. Seeded data is loaded automatically.
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Watchlist — {users.length} users</h2>
        <div className="flex items-center gap-2">
          <input
            className="border px-2 py-1 rounded"
            placeholder="Search user id..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="border px-2 py-1 rounded">
            <option value="risk">Sort: Risk</option>
            <option value="removals">Sort: Removals</option>
          </select>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr>
              <th className="pb-2">User</th>
              <th className="pb-2">Badge</th>
              <th className="pb-2">Removals</th>
              <th className="pb-2">Approvals</th>
              <th className="pb-2">AutoMod</th>
              <th className="pb-2">Risk Score</th>
              <th className="pb-2">Watchlist</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.userId} className="border-t">
                <td className="py-2">u/{u.userId}</td>
                <td className="py-2">{u.meta.status_badge}</td>
                <td className="py-2">{u.meta.total_removals}</td>
                <td className="py-2">{u.meta.total_approvals}</td>
                <td className="py-2">{u.meta.automod_catches}</td>
                <td className="py-2">{u.metrics?.riskScore ?? 0}</td>
                <td className="py-2">{formatWatchlistRemaining(u.meta.watchlist_expiration)}</td>
                <td className="py-2 space-x-2">
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                    onClick={() =>
                      navigateTo(
                        `/dossier-game.html?userId=${encodeURIComponent(u.userId)}${demoMode ? '&demo=1' : ''}`
                      )
                    }
                  >
                    View
                  </button>
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded"
                    onClick={() => setStatus(subredditId, u.userId, 'TRUSTED')}
                  >
                    Trust
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => setStatus(subredditId, u.userId, 'RISK')}
                  >
                    Risk
                  </button>
                  <button
                    className="bg-gray-600 text-white px-2 py-1 rounded"
                    onClick={() => removeFromWatchlist(subredditId, u.userId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {demoMode && (
        <div className="rounded border bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">High-risk users</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {highRisk.map((u) => (
              <div key={u.userId} className="rounded border bg-red-50 p-3 text-sm">
                <div className="font-semibold">u/{u.userId}</div>
                <div className="text-xs text-gray-600">Risk score: {u.metrics?.riskScore ?? 0}</div>
                <div className="text-xs text-gray-600">Badge: {u.meta?.status_badge}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
