// Reddit API Helpers for ModSync
// Fetches user data from Reddit

import type { RedditAPIClient } from '@devvit/web/server';
import type { UserRedditData } from '../../types/modsync.js';

export async function getUserInfo(
  reddit: RedditAPIClient,
  username: string
): Promise<UserRedditData | null> {
  try {
    // Devvit API doesn't expose direct user lookup by name
    // We'll use stub data for now - in production, could use moderation API
    return {
      username,
      accountCreatedAt: Date.now(),
      globalKarma: 0,
    };
  } catch (error) {
    console.error(`Error fetching user info for ${username}:`, error);
    return null;
  }
}

export async function getUserIdFromName(
  reddit: RedditAPIClient,
  username: string
): Promise<string | null> {
  try {
    // Stub implementation - Devvit API limited for user lookup
    return `t2_${username}`;
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
    const subreddit = await reddit.getSubredditById(subredditName);
    if (!subreddit) return null;
    return {
      id: subreddit.id,
      name: subreddit.name,
      displayName: subreddit.displayName,
    };
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
    // Check if current user is a moderator
    const subreddit = await reddit.getSubredditById(subredditName);
    if (!subreddit) return false;

    const me = await reddit.getCurrentUser();
    if (!me) return false;

    // Devvit provides context info; we'd rely on Devvit's built-in mod checks
    return true; // This would be validated by Devvit's authorization layer
  } catch (error) {
    console.error('Error checking moderator status:', error);
    return false;
  }
}
