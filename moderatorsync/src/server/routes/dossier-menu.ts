// Dossier Menu Handler
// Handles the "ModSync Dossier" context menu action

import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { RedisStore } from '../core/redis.js';
import { calculateMetrics } from '../core/metrics.js';
import { getUserInfo } from '../core/reddit.js';
import { createPost } from '../core/post.js';

export const dossierMenu = new Hono();

/**
 * Get or create the ModSync post for this subreddit
 */
async function getOrCreateModSyncPost(subredditId: string, subredditName: string): Promise<string> {
  // Check for existing post
  const existingPostId = await redis.get(`modsync:post:${subredditId}`);
  if (existingPostId) {
    return existingPostId;
  }

  // Create new post if none exists
  const post = await createPost();
  if (post.id) {
    await redis.set(`modsync:post:${subredditId}`, post.id);
    console.log(`Created new ModSync post: ${post.id}`);
  }
  return post.id;
}

/**
 * POST /internal/menu/dossier-open
 * Handler for "ModSync Dossier" context menu on posts/comments
 * Stores context and navigates to the ModSync post
 */
dossierMenu.post('/dossier-open', async (c) => {
  try {
    const body = await c.req.json() as {
      targetId?: string;
      location?: 'post' | 'comment';
    };

    const { targetId, location } = body;

    console.log('Dossier menu triggered:', { targetId, location });

    if (!targetId) {
      return c.json<UiResponse>({
        showToast: 'No target selected',
      }, 400);
    }

    // Get target user info from post/comment
    let targetUserId: string | undefined;
    let targetUsername: string | undefined;

    if (location === 'post' || !location) {
      try {
        const post = await reddit.getPostById(targetId);
        targetUserId = post?.authorId;
        targetUsername = post?.authorName;
        console.log('Got post author:', { targetUserId, targetUsername });
      } catch (err) {
        console.error('Failed to get post:', err);
      }
    }

    if (location === 'comment') {
      try {
        const comment = await reddit.getCommentById(targetId);
        targetUserId = comment?.authorId;
        targetUsername = comment?.authorName;
        console.log('Got comment author:', { targetUserId, targetUsername });
      } catch (err) {
        console.error('Failed to get comment:', err);
      }
    }

    if (!targetUserId || !targetUsername) {
      console.error('Could not identify user from target:', targetId);
      return c.json<UiResponse>({
        showToast: 'Could not identify user. Please try again.',
      }, 400);
    }

    // Get current subreddit
    const subredditId = context.subredditId || '';
    const subredditName = context.subredditName || '';

    console.log('Opening dossier for:', { targetUserId, targetUsername, subredditId, subredditName });

    // Fetch user metrics for the toast summary
    const store = new RedisStore(redis);
    const meta = await store.getUserMeta(subredditId, targetUserId);

    // Store dossier context for the splash screen to read
    const dossierKey = `modsync:dossier:pending:${subredditId}`;
    await redis.hSet(dossierKey, {
      userId: targetUserId,
      username: targetUsername,
      subredditId: subredditId,
      subredditName: subredditName,
      timestamp: Date.now().toString(),
    });
    // Expire after 5 minutes
    await redis.expire(dossierKey, 300);

    // Get or create the ModSync post
    const postId = await getOrCreateModSyncPost(subredditId, subredditName);

    console.log('Navigating to ModSync post:', postId);

    // Build summary for toast
    const statusEmoji = {
      'TRUSTED': '✅',
      'RISK': '🚨',
      'WATCHLIST': '👁️',
      'NEUTRAL': '⚪',
    }[meta.status_badge] || '⚪';

    const summary = `${statusEmoji} u/${targetUsername}: ${meta.total_removals} removals, ${meta.total_approvals} approvals`;

    // Navigate to the ModSync post
    return c.json<UiResponse>({
      navigateTo: `https://www.reddit.com/r/${subredditName}/comments/${postId.replace('t3_', '')}`,
      showToast: summary,
    });
  } catch (error) {
    console.error('Error in dossier menu handler:', error);
    return c.json<UiResponse>({
      showToast: 'Error opening dossier. Check logs for details.',
    }, 500);
  }
});
