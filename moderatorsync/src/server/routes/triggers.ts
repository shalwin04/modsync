import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
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
 * POST /internal/triggers/on-post-submit
 * Triggered when a post is created in the subreddit
 * Check watchlist and alert if needed
 */
triggers.post('/on-post-submit', async (c) => {
  try {
    const payload = await c.req.json<any>();
    const postId = payload?.post?.id;
    const authorId = payload?.post?.authorId;
    const authorName = payload?.post?.authorName;

    if (!postId || !authorId || !authorName) {
      console.warn('Incomplete post submission data:', payload);
      return c.json({ status: 'skipped', reason: 'incomplete data' }, 200);
    }

    // Check watchlist
    const subredditId = context.subredditId || '';
    const subredditName = context.subredditName || '';
    const postUrl = `https://reddit.com/r/${subredditName}/comments/${postId}`;

    // Call the alert handler internally
    try {
      const alertResponse = await fetch(`${process.env.REDDIT_HELPER_CACHE_TTL ? 'https://localhost' : 'http://localhost'}/internal/alerts/check-watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId,
          authorName,
          contentType: 'post',
          contentUrl: postUrl,
        }),
      });

      if (alertResponse.ok) {
        const result = await alertResponse.json();
        if (result.alerted) {
          console.log(`Watchlist alert sent for u/${authorName}'s post`);
        }
      }
    } catch (err) {
      console.warn('Failed to check watchlist for post:', err);
    }

    return c.json({ status: 'success' }, 200);
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
    const authorName = payload?.comment?.authorName;
    const postId = payload?.comment?.postId;

    if (!commentId || !authorId || !authorName) {
      console.warn('Incomplete comment submission data:', payload);
      return c.json({ status: 'skipped', reason: 'incomplete data' }, 200);
    }

    // Check watchlist
    const subredditId = context.subredditId || '';
    const subredditName = context.subredditName || '';
    const commentUrl = `https://reddit.com/r/${subredditName}/comments/${postId}/_/${commentId}`;

    // Call the alert handler internally
    try {
      const alertResponse = await fetch(`${process.env.REDDIT_HELPER_CACHE_TTL ? 'https://localhost' : 'http://localhost'}/internal/alerts/check-watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId,
          authorName,
          contentType: 'comment',
          contentUrl: commentUrl,
        }),
      });

      if (alertResponse.ok) {
        const result = await alertResponse.json();
        if (result.alerted) {
          console.log(`Watchlist alert sent for u/${authorName}'s comment`);
        }
      }
    } catch (err) {
      console.warn('Failed to check watchlist for comment:', err);
    }

    return c.json({ status: 'success' }, 200);
  } catch (error) {
    console.error('Error in on-comment-submit trigger:', error);
    return c.json({ status: 'error', message: 'Trigger failed' }, 500);
  }
});
