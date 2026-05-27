// Redis Key Generators for ModSync
// All keys use tenant isolation with subreddit prefix

const PREFIX = 'modsync';

export function userMetaKey(subId: string, userId: string): string {
  return `${PREFIX}:sub:${subId}:user:${userId}:meta`;
}

export function userNotesKey(subId: string, userId: string): string {
  return `${PREFIX}:sub:${subId}:user:${userId}:notes`;
}

export function watchlistKey(subId: string): string {
  return `${PREFIX}:sub:${subId}:watchlist`;
}

export function subredditStatsKey(subId: string): string {
  return `${PREFIX}:sub:${subId}:stats`;
}
