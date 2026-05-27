// Dossier Menu Handler
// Handles the "ModSync Dossier" context menu action

import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { MenuRequest, MenuResponse } from '@devvit/web/shared';
import { RedisStore } from '../core/redis.js';
import { getUserInfo } from '../core/reddit.js';
import { calculateMetrics } from '../core/metrics.js';

export const dossierMenu = new Hono();

/**
 * POST /internal/menu/dossier-open
 * Handler for "ModSync Dossier" context menu on posts/comments
 */
dossierMenu.post('/dossier-open', async (c) => {
  try {
    const { targetId, location } = (await c.req.json()) as MenuRequest & {
      location?: 'post' | 'comment';
    };

    // Get target user info from post/comment
    let targetUserId: string | undefined;
    let targetUsername: string | undefined;

    if (location === 'post') {
      const post = await reddit.getPostById(targetId);
      targetUserId = post?.authorId;
      targetUsername = post?.authorName;
    } else if (location === 'comment') {
      const comment = await reddit.getCommentById(targetId);
      targetUserId = comment?.authorId;
      targetUsername = comment?.authorName;
    }

    if (!targetUserId || !targetUsername) {
      return c.json<MenuResponse>({
        showToast: {
          text: 'Could not identify user',
          appearance: 'neutral',
        },
      });
    }

    // Get current subreddit
    const subreddit = context.subredditId || '';
    const subredditName = context.subredditName || '';

    // Fetch quick summary for toast
    const store = new RedisStore(redis);
    const [meta, redditData] = await Promise.all([
      store.getUserMeta(subreddit, targetUserId),
      getUserInfo(reddit, targetUsername).catch(() => null),
    ]);

    const accountCreatedAt = redditData?.accountCreatedAt || 0;
    const metrics = calculateMetrics(meta, accountCreatedAt);

    // Show toast with summary (just the toast, no navigation for now)
    const summary = `u/${targetUsername} [${meta.status_badge}]: ${meta.total_removals} removals, ${meta.total_approvals} approvals`;

    return c.json<MenuResponse>({
      showToast: {
        text: summary,
        appearance: meta.status_badge === 'RISK' ? 'success' : 'neutral',
      },
    });
  } catch (error) {
    console.error('Error in dossier menu handler:', error);
    return c.json<MenuResponse>({
      showToast: {
        text: 'Error loading dossier',
        appearance: 'neutral',
      },
    });
  }
});
