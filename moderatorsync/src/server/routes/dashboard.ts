// Dashboard routes: watchlist and high-risk users

import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import { RedisStore } from '../core/redis.js';
import { watchlistKey, subredditStatsKey } from '../../utils/keys.js';
import { calculateMetrics } from '../core/metrics.js';
import { getCurrentTimestamp, formatWatchlistRemaining } from '../../utils/formatters.js';

export const dashboard = new Hono();

dashboard.get('/:subId/watchlist', async (c) => {
  try {
    const subId = c.req.param('subId');
    if (!subId) return c.json({ error: 'Missing subId' }, 400);

    const now = getCurrentTimestamp();
    const key = watchlistKey(subId);

    // Active watchlist: score > now
    const users: string[] = await redis.zRangeByScore(key, {
      min: (now + 1).toString(),
      max: '+inf',
    });

    const store = new RedisStore(redis);

    const payload = await Promise.all(
      users.map(async (userId) => {
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
    const users: string[] = await redis.zRangeByScore(key, {
      min: (now + 1).toString(),
      max: '+inf',
    });

    const store = new RedisStore(redis);

    const resultsMap = new Map<string, any>();

    // Check watchlist members first
    for (const userId of users) {
      const meta = await store.getUserMeta(subId, userId);
      const metrics = calculateMetrics(meta, 0);
      if (metrics.isHighRisk || meta.status_badge === 'RISK') {
        resultsMap.set(userId, { userId, meta, metrics });
      }
    }

    // Also check subreddit stats zset for top offenders if present
    const statsKey = subredditStatsKey(subId);
    try {
      const exists = await redis.exists(statsKey as any);
      if (exists) {
        // Attempt to get top 50 offenders from stats zset (descending by score)
        const top = await (redis as any).zRevRange(statsKey, 0, 49);
        for (const userId of top || []) {
          if (resultsMap.has(userId)) continue;
          const meta = await store.getUserMeta(subId, userId);
          const metrics = calculateMetrics(meta, 0);
          if (metrics.isHighRisk || meta.status_badge === 'RISK') {
            resultsMap.set(userId, { userId, meta, metrics });
          }
        }
      }
    } catch (e) {
      // If redis client doesn't support exists/zRevRange in environment, ignore gracefully
      console.debug('Subreddit stats scan skipped:', e?.message || e);
    }

    const results = Array.from(resultsMap.values());
    return c.json({ type: 'highrisk', subredditId: subId, users: results });
  } catch (error) {
    console.error('Dashboard highrisk error:', error);
    return c.json({ error: 'Failed to load high-risk users' }, 500);
  }
});
