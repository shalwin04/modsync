// Dashboard routes: watchlist and high-risk users

import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import { RedisStore } from '../core/redis.js';
import { watchlistKey } from '../../utils/keys.js';
import { calculateMetrics } from '../core/metrics.js';
import { getCurrentTimestamp, formatWatchlistRemaining } from '../../utils/formatters.js';

export const dashboard = new Hono();

dashboard.get('/:subId/watchlist', async (c) => {
  try {
    const subId = c.req.param('subId');
    if (!subId) return c.json({ error: 'Missing subId' }, 400);

    const now = getCurrentTimestamp();
    const key = watchlistKey(subId);

    // Active watchlist: score > now (users whose expiration is in the future)
    // Use zRange with by: 'score' option
    const users: string[] = await redis.zRange(key, (now + 1).toString(), '+inf', {
      by: 'score',
    });

    const store = new RedisStore(redis);

    const payload = await Promise.all(
      (users || []).map(async (userId) => {
        const meta = await store.getUserMeta(subId, userId);
        const metrics = calculateMetrics(meta, 0);
        return {
          userId,
          meta,
          metrics,
          watchlist_remaining: formatWatchlistRemaining(meta.watchlist_expiration),
        };
      })
    );

    return c.json({ type: 'watchlist', subredditId: subId, users: payload });
  } catch (error) {
    console.error('Dashboard watchlist error:', error);
    return c.json({ error: 'Failed to load watchlist' }, 500);
  }
});

// For MVP, high-risk users are derived from watchlist members flagged as high risk
dashboard.get('/:subId/highrisk', async (c) => {
  try {
    const subId = c.req.param('subId');
    if (!subId) return c.json({ error: 'Missing subId' }, 400);

    const now = getCurrentTimestamp();
    const key = watchlistKey(subId);

    // Get active watchlist users
    const users: string[] = await redis.zRange(key, (now + 1).toString(), '+inf', {
      by: 'score',
    });

    const store = new RedisStore(redis);

    const results: any[] = [];

    // Check watchlist members for high-risk
    for (const userId of users || []) {
      const meta = await store.getUserMeta(subId, userId);
      const metrics = calculateMetrics(meta, 0);
      if (metrics.isHighRisk || meta.status_badge === 'RISK') {
        results.push({ userId, meta, metrics });
      }
    }

    return c.json({ type: 'highrisk', subredditId: subId, users: results });
  } catch (error) {
    console.error('Dashboard highrisk error:', error);
    return c.json({ error: 'Failed to load high-risk users' }, 500);
  }
});
