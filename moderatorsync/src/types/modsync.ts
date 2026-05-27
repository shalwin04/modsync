// ModSync Type Definitions

export type StatusBadge = 'TRUSTED' | 'WATCHLIST' | 'RISK' | 'NEUTRAL';

export type NoteType = 'info' | 'warning' | 'positive';

export interface UserMeta {
  status_badge: StatusBadge;
  watchlist_expiration: number; // Unix timestamp, 0 if not on watchlist
  record_last_updated: number; // Unix timestamp
  internal_note_count: number; // Total notes attached
  first_local_interaction: number; // Unix timestamp
  total_removals: number;
  total_approvals: number;
  automod_catches: number;
}

export interface NoteEntry {
  note_id: string; // UUID
  author_username: string; // Mod name
  author_id: string; // Reddit user ID
  timestamp: number; // Unix timestamp
  content: string;
  note_type: NoteType;
}

export interface UserRedditData {
  accountCreatedAt: number; // Unix timestamp
  globalKarma: number;
  username: string;
}

export interface UserDossier {
  userId: string;
  username: string;
  subredditId: string;
  subredditName: string;
  meta: UserMeta;
  notes: NoteEntry[];
  redditData: UserRedditData;
}

export interface DossierContext {
  subredditId: string;
  subredditName: string;
  targetUserId: string;
  targetUsername: string;
  currentModId: string;
  currentModUsername: string;
}

// Default values
export const DEFAULT_USER_META: UserMeta = {
  status_badge: 'NEUTRAL',
  watchlist_expiration: 0,
  record_last_updated: 0,
  internal_note_count: 0,
  first_local_interaction: 0,
  total_removals: 0,
  total_approvals: 0,
  automod_catches: 0,
};
