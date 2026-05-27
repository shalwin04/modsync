// Reddit API Helpers for ModSync
// Fetches user data from Reddit

import type { RedditAPIClient } from '@devvit/web/server';
import type { UserRedditData } from '../../types/modsync.js';

// Simple in-memory cache for helper results to reduce API calls in high-traffic paths.
const CACHE_TTL = Number(process.env.REDDIT_HELPER_CACHE_TTL || '60'); // seconds
type CacheEntry = { value: any; expiresAt: number };
const cache = new Map<string, CacheEntry>();

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // small backoff
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }
  throw lastErr;
}

async function getCached<T>(key: string, loader: () => Promise<T>, ttlSeconds = CACHE_TTL): Promise<T> {
  const now = Date.now();
  const ent = cache.get(key);
  if (ent && ent.expiresAt > now) return ent.value as T;
  const value = await loader();
  cache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

/**
 * Fetch basic user info using Devvit Reddit client.
 */
export async function getUserInfo(
  reddit: RedditAPIClient,
  username: string
): Promise<UserRedditData | null> {
  if (!username) return null;
  const key = `user:${username.toLowerCase()}`;
  try {
    return await getCached(key, async () =>
      withRetry(async () => {
        const user = await reddit.getUserByUsername(username);
        if (!user) return null;
        return {
          username: user.username,
          accountCreatedAt: Math.floor(user.createdAt.getTime() / 1000),
          globalKarma: (user.linkKarma ?? 0) + (user.commentKarma ?? 0),
        } as UserRedditData;
      })
    );
  } catch (error) {
    console.error(`Error fetching user info for ${username}:`, error);
    return null;
  }
}

export async function getUserIdFromName(
  reddit: RedditAPIClient,
  username: string
): Promise<string | null> {
  if (!username) return null;
  const key = `userid:${username.toLowerCase()}`;
  try {
    return await getCached(key, async () =>
      withRetry(async () => {
        const user = await reddit.getUserByUsername(username);
        return user?.id ?? null;
      })
    );
  } catch (error) {
    console.error(`Error fetching user ID for ${username}:`, error);
    return null;
  }
}

export async function getCurrentUser(
  reddit: RedditAPIClient
): Promise<{ id: string; name: string } | null> {
  try {
    const me = await reddit.getCurrentUser();
    if (!me) return null;
    return { id: me.id, name: me.username };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function getSubredditInfo(
  reddit: RedditAPIClient,
  subredditName: string
): Promise<{ id: string; name: string; displayName: string } | null> {
  try {
    // Accept either id-like t5_ or plain name
    if (!subredditName) return null;
    const key = `sub:${subredditName.toLowerCase()}`;
    return await getCached(key, async () => {
      const sub = subredditName.startsWith('t5_')
        ? await reddit.getSubredditInfoById(subredditName)
        : await reddit.getSubredditInfoByName(subredditName);
      if (!sub) return null;
      return {
        id: sub.id,
        name: sub.name || sub.displayName || subredditName,
        displayName: sub.displayName || sub.name || subredditName,
      };
    });
  } catch (error) {
    console.error(`Error fetching subreddit info for ${subredditName}:`, error);
    return null;
  }
}

export async function isUserModerator(
  reddit: RedditAPIClient,
  subredditName: string
): Promise<boolean> {
  try {
    const me = await reddit.getCurrentUser();
    if (!me) return false;

    // If metadata contains moderator hint, respect it
    if ((me as any).isModerator) return true;

    // If subredditName is empty, we cannot validate; return false to be safe
    if (!subredditName) return false;

    // Try to fetch the user and check mod permissions (may throw if not available)
    try {
      const user = await reddit.getUserByUsername(me.username);
      if (!user) return false;
      const perms = await user.getModPermissionsForSubreddit(subredditName);
      return Array.isArray(perms) && perms.length > 0;
    } catch (e) {
      console.warn('Unable to check moderator permissions via user object, denying by default', e);
      return false;
    }
  } catch (error) {
    console.error('Error checking moderator status:', error);
    return false;
  }
}
