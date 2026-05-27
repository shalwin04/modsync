// Watchlist Alert Handler
// Monitors for posts/comments from watchlist users and alerts mods

import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { RedisStore } from '../core/redis.js';
import { watchlistKey } from '../../utils/keys.js';
import { getCurrentTimestamp } from '../../utils/formatters.js';

export const alerts = new Hono();

/**
 * POST /internal/alerts/check-watchlist
 * Check if a user/post/comment author is on the watchlist
 * and send alert if they are
 */
alerts.post('/check-watchlist', async (c) => {
  try {
    const { authorId, authorName, contentType, contentUrl } = await c.req.json<{
      authorId: string;
      authorName: string;
      contentType: 'post' | 'comment';
      contentUrl: string;
    }>();

    const subredditId = context.subredditId || '';
    if (!subredditId) {
      return c.json({ error: 'No subreddit context' }, 400);
    }

    if (!authorId || !authorName) {
      return c.json({ error: 'Missing author info' }, 400);
    }

    const store = new RedisStore(redis);
    const now = getCurrentTimestamp();
    const key = watchlistKey(subredditId);

    // Check if user is on watchlist and not expired
    const expiration = await redis.zScore(key, authorId);
    if (!expiration || expiration <= now) {
      return c.json({ alerted: false });
    }

    // User is on watchlist! Record activity
    if (contentType === 'post') {
      await store.recordRemoval(subredditId, authorId);
    } else {
      await store.recordRemoval(subredditId, authorId);
    }

    // Send modmail alert
    try {
      const currentMod = await reddit.getCurrentUser();
      const modName = currentMod?.username || 'ModSync';

      const alertMessage = `
🚨 **WATCHLIST ALERT**

u/${authorName} (on watchlist) just posted ${contentType}:
${contentUrl}

**User Metrics:**
• Removals: (check dossier)
• Approvals: (check dossier)
• AutoMod Catches: (check dossier)

[View Full Dossier](reddit.com/r/${context.subredditName}/comments/modsync?user=${authorId})

---
*Alert from ModSync Watchlist Monitor*
      `.trim();

      // Send modmail (if available)
      const modMailUser = await reddit.getUserByUsername(`/r/${context.subredditName}`);
      if (modMailUser) {
        await modMailUser.sendPrivateMessage({
          subject: `⚠️ Watchlist Alert: u/${authorName}`,
          text: alertMessage,
        });
      }
    } catch (err) {
      console.warn('Failed to send modmail alert:', err);
      // Alert still recorded in Redis even if modmail fails
    }

    return c.json({
      alerted: true,
      message: `Alert sent for watchlist user u/${authorName}`,
    });
  } catch (error) {
    console.error('Error checking watchlist:', error);
    return c.json(
      {
        error: 'Failed to check watchlist',
      },
      500
    );
  }
});

/**
 * POST /internal/alerts/watchlist/expire
 * Clean up expired watchlist entries
 */
alerts.post('/watchlist/expire', async (c) => {
  try {
    const subredditId = context.subredditId || '';
    if (!subredditId) {
      return c.json({ error: 'No subreddit context' }, 400);
    }

    const store = new RedisStore(redis);
    const expiredUsers = await store.getWatchlistExpiring(subredditId);

    let cleanedCount = 0;
    for (const userId of expiredUsers) {
      await store.removeFromWatchlist(subredditId, userId);
      cleanedCount++;
    }

    return c.json({
      cleaned: cleanedCount,
      message: `Cleaned up ${cleanedCount} expired watchlist entries`,
    });
  } catch (error) {
    console.error('Error expiring watchlist:', error);
    return c.json(
      {
        error: 'Failed to expire watchlist',
      },
      500
    );
  }
});
