// Demo bootstrap routes for seeded showcase data

import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { RedisStore } from '../core/redis.js';

type DemoUserSeed = {
  userId: string;
  username: string;
  status: 'TRUSTED' | 'WATCHLIST' | 'RISK' | 'NEUTRAL';
  watchlistHours?: number;
  removals: number;
  approvals: number;
  automod: number;
  notes: Array<{ content: string; noteType: 'info' | 'warning' | 'positive' }>;
};

const DEMO_MARKER_PREFIX = 'modsync:demo:seeded';

const DEMO_USERS: DemoUserSeed[] = [
  {
    userId: 'demo_user_alpha',
    username: 'alpha_trader',
    status: 'WATCHLIST',
    watchlistHours: 24,
    removals: 4,
    approvals: 1,
    automod: 2,
    notes: [
      { content: 'Repeated low-effort promotional replies.', noteType: 'warning' },
      { content: 'Watch for identical phrasing across threads.', noteType: 'info' },
    ],
  },
  {
    userId: 'demo_user_bravo',
    username: 'bravo_helper',
    status: 'TRUSTED',
    removals: 0,
    approvals: 6,
    automod: 0,
    notes: [{ content: 'Consistently helpful and responsive.', noteType: 'positive' }],
  },
  {
    userId: 'demo_user_charlie',
    username: 'charlie_spam',
    status: 'RISK',
    removals: 11,
    approvals: 0,
    automod: 5,
    notes: [
      { content: 'Likely coordinated spam pattern.', noteType: 'warning' },
      { content: 'Escalate if activity resumes after cooldown.', noteType: 'warning' },
    ],
  },
];

export const demo = new Hono();

demo.get('/bootstrap', async (c) => {
  try {
    const subId = context.subredditId || c.req.query('subId') || '';
    if (!subId) {
      return c.json({ type: 'error', message: 'Missing subreddit context', error: true }, 400);
    }

    const markerKey = `${DEMO_MARKER_PREFIX}:${subId}`;
    const existing = await redis.get(markerKey);
    if (existing === '1') {
      return c.json({ type: 'demo_bootstrap', subredditId: subId, seeded: false, users: DEMO_USERS.length });
    }

    const store = new RedisStore(redis);
    const now = Math.floor(Date.now() / 1000);

    for (const seed of DEMO_USERS) {
      await store.updateUserMeta(subId, seed.userId, {
        status_badge: seed.status,
        watchlist_expiration: seed.status === 'WATCHLIST' ? now + (seed.watchlistHours || 24) * 3600 : 0,
        total_removals: seed.removals,
        total_approvals: seed.approvals,
        automod_catches: seed.automod,
        first_local_interaction: now - 86400,
      });

      if (seed.status === 'WATCHLIST') {
        await store.addToWatchlist(subId, seed.userId, seed.watchlistHours || 24);
      } else if (seed.status === 'TRUSTED') {
        await store.setUserStatus(subId, seed.userId, 'TRUSTED');
      } else if (seed.status === 'RISK') {
        await store.setUserStatus(subId, seed.userId, 'RISK');
      }

      for (const note of seed.notes) {
        await store.addNote(subId, seed.userId, 'ModSync Demo', 't2_demo_mod', note.content, note.noteType);
      }
    }

    await redis.set(markerKey, '1');

    return c.json({ type: 'demo_bootstrap', subredditId: subId, seeded: true, users: DEMO_USERS.length });
  } catch (error) {
    console.error('Demo bootstrap error:', error);
    return c.json({ type: 'error', message: 'Failed to bootstrap demo data', error: true }, 500);
  }
});
