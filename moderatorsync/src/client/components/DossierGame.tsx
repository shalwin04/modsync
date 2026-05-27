// Dossier Game Component
// Full interactive dossier view (expanded mode)

import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { useDossier } from '../hooks/useDossier.js';
import { MetricsPanel } from './MetricsPanel';
import { formatRelativeTime, formatPercentage, formatMaturityDelta, formatWatchlistRemaining } from '../../utils/formatters.js';
import type { NoteType } from '../../types/modsync.js';

interface DossierGameProps {
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
}

export const DossierGame: React.FC<DossierGameProps> = ({
  targetUserId,
  targetUsername,
  subredditId,
  subredditName,
}) => {
  const dossier = useDossier({
    targetUserId,
    targetUsername,
    subredditId,
    subredditName,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'actions'>('overview');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('info');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // default open on large screens, closed on small
    if (typeof window === 'undefined') return;
    const check = () => setPanelOpen(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAddNote = useCallback(async () => {
    if (!noteContent.trim()) return;

    setIsAddingNote(true);
    const success = await dossier.addNote(noteContent, noteType);
    if (success) {
      setNoteContent('');
      setNoteType('info');
    }
    setIsAddingNote(false);
  }, [noteContent, noteType, dossier]);

  const handleSetStatus = useCallback(
    async (status: 'TRUSTED' | 'RISK' | 'NEUTRAL') => {
      await dossier.setStatus(status);
    },
    [dossier]
  );

  const handleWatchlist = useCallback(
    async (action: 'add' | 'remove', hours?: number) => {
      await dossier.updateWatchlist(action, hours);
    },
    [dossier]
  );

  const handleRecordRemoval = useCallback(async () => {
    setActionStates((prev) => ({ ...prev, removal: true }));
    await dossier.recordRemoval();
    setActionStates((prev) => ({ ...prev, removal: false }));
  }, [dossier]);

  const handleRecordApproval = useCallback(async () => {
    setActionStates((prev) => ({ ...prev, approval: true }));
    await dossier.recordApproval();
    setActionStates((prev) => ({ ...prev, approval: false }));
  }, [dossier]);

  const handleRecordAutomod = useCallback(async () => {
    setActionStates((prev) => ({ ...prev, automod: true }));
    await dossier.recordAutomodCatch();
    setActionStates((prev) => ({ ...prev, automod: false }));
  }, [dossier]);

  if (dossier.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading dossier...</p>
      </div>
    );
  }

  if (dossier.error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-semibold">Error Loading Dossier</p>
        <p className="text-sm mt-2">{dossier.error}</p>
      </div>
    );
  }

  if (!dossier.meta) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  const badgeColors: Record<string, string> = {
    TRUSTED: 'bg-green-100 text-green-800 border-green-300',
    RISK: 'bg-red-100 text-red-800 border-red-300',
    WATCHLIST: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    NEUTRAL: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const isOnWatchlist = dossier.meta.status_badge === 'WATCHLIST' && dossier.meta.watchlist_expiration > Math.floor(Date.now() / 1000);
  const totalActions = dossier.meta.total_removals + dossier.meta.total_approvals;
  const removalRate = formatPercentage(dossier.meta.total_removals, totalActions);
  const maturityDelta = formatMaturityDelta(dossier.accountCreatedAt, dossier.meta.first_local_interaction);

  return (
    <div className="h-full flex bg-white">
      <div className="flex-1 flex flex-col">
        {/* Error Alert */}
        {dossier.error && (
          <div className="bg-red-50 border-b border-red-200 p-3 text-sm text-red-700 flex items-center justify-between">
            <span>⚠️ {dossier.error}</span>
            <button
              onClick={() => window.location.reload()}
              className="text-red-600 hover:text-red-800 underline text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header */}
        <div className="border-b bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">u/{targetUsername}</h1>
              <p className="text-sm text-gray-600">in r/{subredditName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 text-sm font-semibold rounded border ${badgeColors[dossier.meta.status_badge]}`}>
                {dossier.meta.status_badge}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm bg-white border px-3 py-1 rounded hover:bg-gray-100"
                  onClick={() => setActiveTab('actions')}
                >
                  + Add Note
                </button>
                <button
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  onClick={() => handleSetStatus('TRUSTED')}
                >
                  Trust
                </button>
                <button
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  onClick={() => handleSetStatus('RISK')}
                >
                  Risk
                </button>
                {isOnWatchlist ? (
                  <button
                    className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                    onClick={() => handleWatchlist('remove')}
                  >
                    Remove Watchlist
                  </button>
                ) : (
                  <button
                    className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    onClick={() => handleWatchlist('add', 24)}
                  >
                    Add 24h
                  </button>
                )}
                {/* Toggle metrics panel on small screens */}
                <button
                  aria-controls="metrics-panel"
                  aria-expanded={panelOpen}
                  className="ml-2 lg:hidden text-sm bg-blue-50 px-2 py-1 rounded border"
                  onClick={() => setPanelOpen((v) => !v)}
                >
                  Metrics
                </button>
              </div>
            </div>
          </div>

          {isOnWatchlist && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-800">
              On Watchlist - {formatWatchlistRemaining(dossier.meta.watchlist_expiration)}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {(['overview', 'notes', 'actions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 font-semibold text-sm transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Removals</p>
                  <p className="text-2xl font-bold text-red-600">{dossier.meta.total_removals}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Approvals</p>
                  <p className="text-2xl font-bold text-green-600">{dossier.meta.total_approvals}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-gray-600 font-semibold">AutoMod Catches</p>
                  <p className="text-2xl font-bold text-purple-600">{dossier.meta.automod_catches}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Removal Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{removalRate}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-600 font-semibold mb-1">Maturity Delta</p>
                <p className="text-sm">{maturityDelta}</p>
                <p className="text-xs text-gray-500 mt-2">Time between account creation and first activity in this subreddit</p>
              </div>
            </div>
          )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {dossier.notes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No notes yet. Be the first to add context!</p>
            ) : (
              <div className="space-y-2">
                {dossier.notes.map((note, idx) => (
                  <div key={`${note.note_id}-${idx}`} className="bg-white p-3 rounded border shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">@{note.author_username}</p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(note.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={async () => {
                            const confirmDelete = window.confirm(
                              `Delete this note from @${note.author_username}?\n\n"${note.content.substring(0, 50)}..."`
                            );
                            if (!confirmDelete) return;
                            await fetch(`/api/dossier/${subredditId}/${targetUserId}/note/${note.note_id}`, { method: 'DELETE' });
                            await dossier.reloadNotes();
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                    {note.note_type !== 'info' && (
                      <p className="text-xs mt-2 text-gray-500">
                        Type: <span className="font-semibold">{note.note_type}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {/* Add Note */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="font-semibold mb-2">Add Note</h3>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add context about this user..."
                className="w-full p-2 border rounded text-sm mb-2"
                rows={3}
              />
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className="w-full p-2 border rounded text-sm mb-2"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="positive">Positive</option>
              </select>
              <button
                onClick={handleAddNote}
                disabled={isAddingNote || !noteContent.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-3 rounded font-semibold text-sm transition"
              >
                {isAddingNote ? 'Adding...' : 'Save Note'}
              </button>
            </div>

            {/* Status */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-semibold mb-2">Set Status</h3>
              <div className="grid grid-cols-3 gap-2">
                {['NEUTRAL', 'TRUSTED', 'RISK'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleSetStatus(status as 'NEUTRAL' | 'TRUSTED' | 'RISK')}
                    className={`py-2 px-3 rounded font-semibold text-sm transition ${
                      dossier.meta?.status_badge === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Watchlist */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-semibold mb-2">Watchlist</h3>
              {isOnWatchlist ? (
                <button
                  onClick={() => handleWatchlist('remove')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-semibold text-sm transition"
                >
                  Remove from Watchlist
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => handleWatchlist('add', hours)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded font-semibold text-sm transition"
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Record Actions */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-semibold mb-2">Record Action</h3>
              <p className="text-xs text-gray-600 mb-3">Track mod actions to populate metrics:</p>
              <div className="space-y-2">
                <button
                  onClick={handleRecordRemoval}
                  disabled={actionStates.removal}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2 px-3 rounded font-semibold text-sm transition"
                >
                  {actionStates.removal ? '⏳ Recording...' : '+ Record Removal'}
                </button>
                <button
                  onClick={handleRecordApproval}
                  disabled={actionStates.approval}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-2 px-3 rounded font-semibold text-sm transition"
                >
                  {actionStates.approval ? '⏳ Recording...' : '+ Record Approval'}
                </button>
                <button
                  onClick={handleRecordAutomod}
                  disabled={actionStates.automod}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white py-2 px-3 rounded font-semibold text-sm transition"
                >
                  {actionStates.automod ? '⏳ Recording...' : '+ Record AutoMod Catch'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Right-side compact metrics panel (hidden on small screens) */}
      <aside
        id="metrics-panel"
        className={`w-72 border-l bg-gray-50 ${panelOpen ? 'block' : 'hidden'} lg:block`}
      >
        <div className="p-4">
          <MetricsPanel
            riskScore={dossier.metrics?.riskScore ?? dossier.meta.riskScore}
            isHighRisk={dossier.metrics?.isHighRisk ?? dossier.meta.isHighRisk}
            totalRemovals={dossier.meta.total_removals}
            automodCatches={dossier.meta.automod_catches}
            removalRate={removalRate}
            maturityDelta={maturityDelta}
          />
        </div>
      </aside>
    </div>
  );
};
