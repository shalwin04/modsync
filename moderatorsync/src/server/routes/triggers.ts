import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { RedisStore } from '../core/redis.js';
import { watchlistKey } from '../../utils/keys.js';
import { getCurrentTimestamp } from '../../utils/formatters.js';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    // Store the ModSync post ID for this subreddit
    const subredditId = context.subredditId || '';
    if (subredditId && post.id) {
      await redis.set(`modsync:post:${subredditId}`, post.id);
      console.log(`Stored ModSync post ID: ${post.id} for subreddit: ${subredditId}`);
    }

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `ModSync installed! Post created: ${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

/**
 * Check if user is on watchlist and send alert if so
 */
async function checkWatchlistAndAlert(
  authorId: string,
  authorName: string,
  contentType: 'post' | 'comment',
  contentUrl: string
): Promise<{ alerted: boolean; message?: string }> {
  const subredditId = context.subredditId || '';
  const subredditName = context.subredditName || '';

  if (!subredditId) {
    return { alerted: false };
  }

  const store = new RedisStore(redis);
  const now = getCurrentTimestamp();
  const key = watchlistKey(subredditId);

  // Check if user is on watchlist and not expired
  const expiration = await redis.zScore(key, authorId);
  if (!expiration || expiration <= now) {
    return { alerted: false };
  }

  // User is on watchlist! Record the activity
  await store.recordRemoval(subredditId, authorId);

  // Send modmail alert
  try {
    const alertMessage = `
**WATCHLIST ALERT**

u/${authorName} (on watchlist) just created a ${contentType}:
${contentUrl}

**Quick Actions:**
- Review the ${contentType} immediately
- Open their ModSync Dossier for full context

---
*Alert from ModSync Watchlist Monitor*
    `.trim();

    // Send as modmail to the subreddit
    await reddit.sendPrivateMessage({
      to: `/r/${subredditName}`,
      subject: `Watchlist Alert: u/${authorName}`,
      text: alertMessage,
    });

    console.log(`Watchlist alert sent for u/${authorName}'s ${contentType}`);
    return { alerted: true, message: `Alert sent for u/${authorName}` };
  } catch (err) {
    console.warn('Failed to send modmail alert:', err);
    // Activity still recorded even if modmail fails
    return { alerted: true, message: 'Alert recorded but modmail failed' };
  }
}

/**
 * POST /internal/triggers/on-post-submit
 * Triggered when a post is created in the subreddit
 * Check watchlist and alert if needed
 */
triggers.post('/on-post-submit', async (c) => {
  try {
    const payload = await c.req.json<any>();
    const postId = payload?.post?.id;
    const authorId = payload?.post?.authorId;
    const authorName = payload?.post?.authorName || payload?.author?.name;

    if (!postId || !authorId || !authorName) {
      console.warn('Incomplete post submission data:', payload);
      return c.json({ status: 'skipped', reason: 'incomplete data' }, 200);
    }

    const subredditName = context.subredditName || '';
    const postUrl = `https://reddit.com/r/${subredditName}/comments/${postId}`;

    const result = await checkWatchlistAndAlert(authorId, authorName, 'post', postUrl);

    return c.json({ status: 'success', ...result }, 200);
  } catch (error) {
    console.error('Error in on-post-submit trigger:', error);
    return c.json({ status: 'error', message: 'Trigger failed' }, 500);
  }
});

/**
 * POST /internal/triggers/on-comment-submit
 * Triggered when a comment is created in the subreddit
 * Check watchlist and alert if needed
 */
triggers.post('/on-comment-submit', async (c) => {
  try {
    const payload = await c.req.json<any>();
    const commentId = payload?.comment?.id;
    const authorId = payload?.comment?.authorId;
    const authorName = payload?.comment?.authorName || payload?.author?.name;
    const postId = payload?.comment?.postId;

    if (!commentId || !authorId || !authorName) {
      console.warn('Incomplete comment submission data:', payload);
      return c.json({ status: 'skipped', reason: 'incomplete data' }, 200);
    }

    const subredditName = context.subredditName || '';
    const commentUrl = `https://reddit.com/r/${subredditName}/comments/${postId}/_/${commentId}`;

    const result = await checkWatchlistAndAlert(authorId, authorName, 'comment', commentUrl);

    return c.json({ status: 'success', ...result }, 200);
  } catch (error) {
    console.error('Error in on-comment-submit trigger:', error);
    return c.json({ status: 'error', message: 'Trigger failed' }, 500);
  }
});
