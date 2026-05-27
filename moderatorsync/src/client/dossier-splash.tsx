// Dossier Splash Component
// Quick preview of user summary (narrow view)

import { useEffect, useState } from 'react';
import type React from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import { useDossier } from './hooks/useDossier.js';
import { formatRelativeTime } from '../utils/formatters.js';

interface DossierSplashProps {
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
}

export const DossierSplash: React.FC<DossierSplashProps> = ({
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

  const handleExpand = (e: React.MouseEvent<HTMLButtonElement>) => {
    requestExpandedMode(e.nativeEvent, 'dossier-game');
  };

  if (dossier.loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading dossier...
      </div>
    );
  }

  if (dossier.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {dossier.error}
      </div>
    );
  }

  if (!dossier.meta) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data loaded
      </div>
    );
  }

  const badgeColors: Record<string, string> = {
    TRUSTED: 'bg-green-100 text-green-800',
    RISK: 'bg-red-100 text-red-800',
    WATCHLIST: 'bg-yellow-100 text-yellow-800',
    NEUTRAL: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">u/{targetUsername}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${badgeColors[dossier.meta.status_badge]}`}>
          {dossier.meta.status_badge}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Removals:</span>
          <span className="ml-2 font-semibold">{dossier.meta.total_removals}</span>
        </div>
        <div>
          <span className="text-gray-600">Approvals:</span>
          <span className="ml-2 font-semibold">{dossier.meta.total_approvals}</span>
        </div>
        <div>
          <span className="text-gray-600">AutoMod Catches:</span>
          <span className="ml-2 font-semibold">{dossier.meta.automod_catches}</span>
        </div>
        <div>
          <span className="text-gray-600">Notes:</span>
          <span className="ml-2 font-semibold">{dossier.notes.length}</span>
        </div>
      </div>

      {/* Recent Notes Preview */}
      {dossier.notes.length > 0 && (
        <div className="bg-blue-50 p-2 rounded text-sm">
          <p className="font-semibold text-blue-900 mb-1">Latest Note</p>
          <p className="text-blue-800 line-clamp-2">{dossier.notes[0].content}</p>
          <p className="text-blue-600 text-xs mt-1">
            by @{dossier.notes[0].author_username} {formatRelativeTime(dossier.notes[0].timestamp)}
          </p>
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={handleExpand}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
      >
        View Full Dossier →
      </button>
    </div>
  );
};
