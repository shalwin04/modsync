export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// ModSync Dossier API Types

export type DossierDataResponse = {
  type: 'dossier_data';
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
  meta: {
    status_badge: string;
    watchlist_expiration: number;
    record_last_updated: number;
    internal_note_count: number;
    first_local_interaction: number;
    total_removals: number;
    total_approvals: number;
    automod_catches: number;
  };
  notes: Array<{
    note_id: string;
    author_username: string;
    author_id: string;
    timestamp: number;
    content: string;
    note_type: string;
  }>;
  accountCreatedAt: number;
  metrics: {
    removalRate: string;
    maturityDelta: string;
    totalActions: number;
    isHighRisk: boolean;
  };
};

export type DossierErrorResponse = {
  type: 'error';
  message: string;
  error: true;
};

export type DossierResponse = DossierDataResponse | DossierErrorResponse;

