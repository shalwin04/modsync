// Demo Data Seeding Routes
// Creates realistic sample data for demo/testing purposes

import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { RedisStore } from '../core/redis.js';
import { getCurrentTimestamp } from '../../utils/formatters.js';

export const demo = new Hono();

// Demo users with realistic profiles for demo video
const DEMO_USERS = [
  {
    id: 't2_demo_spammer',
    username: 'SpammyMcSpamface',
    profile: 'High Risk - Serial Spammer',
    removals: 15,
    approvals: 2,
    automod: 8,
    status: 'RISK' as const,
    firstInteractionDaysAgo: 14,
    notes: [
      { mod: 'ModSarah', content: 'First warning for self-promotion - posting affiliate links', type: 'warning' as const, daysAgo: 7 },
      { mod: 'ModJames', content: 'Second warning - still posting affiliate links disguised as recommendations', type: 'warning' as const, daysAgo: 3 },
      { mod: 'ModAlex', content: 'Temp banned for 3 days. Watch closely on return.', type: 'warning' as const, daysAgo: 1 },
    ],
  },
  {
    id: 't2_demo_trusted',
    username: 'HelpfulContributor',
    profile: 'Trusted - Community Hero',
    removals: 0,
    approvals: 47,
    automod: 1,
    status: 'TRUSTED' as const,
    firstInteractionDaysAgo: 180,
    notes: [
      { mod: 'ModSarah', content: 'Excellent community member! Always helpful in comments, answers newbie questions patiently.', type: 'positive' as const, daysAgo: 30 },
      { mod: 'ModJames', content: 'Nominated for community helper flair - approved!', type: 'positive' as const, daysAgo: 14 },
    ],
  },
  {
    id: 't2_demo_watchlist',
    username: 'SuspiciousNewbie',
    profile: 'Watchlist - Possible Ban Evader',
    removals: 5,
    approvals: 3,
    automod: 4,
    status: 'WATCHLIST' as const,
    watchlistHours: 24,
    firstInteractionDaysAgo: 3,
    notes: [
      { mod: 'ModAlex', content: 'New account posting similar content to banned user u/OldSpammer99 - same writing style and topics', type: 'warning' as const, daysAgo: 2 },
      { mod: 'ModSarah', content: 'Added to 24h watchlist - monitoring for ban evasion pattern', type: 'info' as const, daysAgo: 0 },
    ],
  },
  {
    id: 't2_demo_neutral',
    username: 'RegularUser123',
    profile: 'Neutral - Typical User',
    removals: 2,
    approvals: 18,
    automod: 0,
    status: 'NEUTRAL' as const,
    firstInteractionDaysAgo: 90,
    notes: [
      { mod: 'ModJames', content: 'Accidental rule 3 violation - wrong flair. User was polite, corrected immediately.', type: 'info' as const, daysAgo: 45 },
    ],
  },
  {
    id: 't2_demo_emerging',
    username: 'AggressivePoster',
    profile: 'Emerging Risk - Getting Worse',
    removals: 8,
    approvals: 1,
    automod: 12,
    status: 'NEUTRAL' as const,
    firstInteractionDaysAgo: 21,
    notes: [
      { mod: 'ModSarah', content: 'Multiple hostile comments removed. Warned about civility rules.', type: 'warning' as const, daysAgo: 5 },
      { mod: 'ModAlex', content: 'Arguing with other users again. Borderline harassment in DMs reported.', type: 'warning' as const, daysAgo: 2 },
      { mod: 'ModJames', content: 'Consider adding to watchlist if behavior continues', type: 'info' as const, daysAgo: 1 },
    ],
  },
];

/**
 * GET /api/demo/seed
 * Seeds demo data for testing and demo purposes
 */
demo.get('/seed', async (c) => {
  try {
    const subredditId = context.subredditId || '';
    const subredditName = context.subredditName || '';

    if (!subredditId) {
      return c.json({ error: 'No subreddit context' }, 400);
    }

    const store = new RedisStore(redis);
    const now = getCurrentTimestamp();
    const seededUsers: string[] = [];

    for (const user of DEMO_USERS) {
      // Calculate first interaction timestamp
      const firstInteraction = now - user.firstInteractionDaysAgo * 24 * 3600;

      // Set user meta
      await store.updateUserMeta(subredditId, user.id, {
        status_badge: user.status,
        total_removals: user.removals,
        total_approvals: user.approvals,
        automod_catches: user.automod,
        first_local_interaction: Math.floor(firstInteraction),
        internal_note_count: user.notes.length,
        watchlist_expiration: user.watchlistHours
          ? now + user.watchlistHours * 3600
          : 0,
      });

      // Add to watchlist if applicable
      if (user.watchlistHours) {
        await store.addToWatchlist(subredditId, user.id, user.watchlistHours);
      }

      // Add notes (in reverse order so newest appears first)
      for (const note of [...user.notes].reverse()) {
        await store.addNote(
          subredditId,
          user.id,
          note.mod,
          `t2_mod_${note.mod.toLowerCase().replace('mod', '')}`,
          note.content,
          note.type
        );
      }

      seededUsers.push(user.username);
      console.log(`Seeded demo user: ${user.username}`);
    }

    // Store demo user mapping for easy lookup
    const mapping: Record<string, string> = {};
    for (const u of DEMO_USERS) {
      mapping[u.username.toLowerCase()] = u.id;
    }
    await redis.hSet(`modsync:demo:${subredditId}`, mapping);

    // Mark as seeded
    await redis.set(`modsync:demo:seeded:${subredditId}`, '1');

    return c.json({
      success: true,
      message: `Seeded ${seededUsers.length} demo users`,
      subredditId,
      subredditName,
      users: DEMO_USERS.map(u => ({
        username: u.username,
        id: u.id,
        profile: u.profile,
        status: u.status,
        removals: u.removals,
        approvals: u.approvals,
      })),
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return c.json({ error: 'Failed to seed demo data', details: String(error) }, 500);
  }
});

/**
 * GET /api/demo/users
 * Lists available demo users and their current state
 */
demo.get('/users', async (c) => {
  try {
    const subredditId = context.subredditId || '';
    const store = new RedisStore(redis);

    const users = await Promise.all(
      DEMO_USERS.map(async (u) => {
        const meta = await store.getUserMeta(subredditId, u.id);
        const notes = await store.getRecentNotes(subredditId, u.id, 5);
        return {
          id: u.id,
          username: u.username,
          profile: u.profile,
          expectedStatus: u.status,
          currentStatus: meta.status_badge,
          removals: meta.total_removals,
          approvals: meta.total_approvals,
          automod: meta.automod_catches,
          noteCount: notes.length,
          isSeeded: meta.total_removals > 0 || meta.total_approvals > 0,
        };
      })
    );

    return c.json({
      subredditId,
      users,
    });
  } catch (error) {
    console.error('Error listing demo users:', error);
    return c.json({ error: 'Failed to list demo users' }, 500);
  }
});

/**
 * GET /api/demo/dossier/:username
 * Quick access to a demo user's dossier
 */
demo.get('/dossier/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const subredditId = context.subredditId || '';

    const demoUser = DEMO_USERS.find(u =>
      u.username.toLowerCase() === username.toLowerCase()
    );

    if (!demoUser) {
      return c.json({
        error: 'Demo user not found',
        availableUsers: DEMO_USERS.map(u => u.username),
      }, 404);
    }

    const store = new RedisStore(redis);
    const meta = await store.getUserMeta(subredditId, demoUser.id);
    const notes = await store.getRecentNotes(subredditId, demoUser.id, 10);

    return c.json({
      userId: demoUser.id,
      username: demoUser.username,
      profile: demoUser.profile,
      subredditId,
      subredditName: context.subredditName || '',
      meta,
      notes,
      accountCreatedAt: getCurrentTimestamp() - 365 * 24 * 3600, // 1 year ago
    });
  } catch (error) {
    console.error('Error fetching demo dossier:', error);
    return c.json({ error: 'Failed to fetch demo dossier' }, 500);
  }
});

/**
 * DELETE /api/demo/clear
 * Clears all demo data
 */
demo.delete('/clear', async (c) => {
  try {
    const subredditId = context.subredditId || '';

    if (!subredditId) {
      return c.json({ error: 'No subreddit context' }, 400);
    }

    // Delete demo user data
    for (const user of DEMO_USERS) {
      const metaKey = `modsync:sub:${subredditId}:user:${user.id}:meta`;
      const notesKey = `modsync:sub:${subredditId}:user:${user.id}:notes`;
      const notesOrderKey = `${notesKey}:order`;

      await redis.del(metaKey);
      await redis.del(notesKey);
      await redis.del(notesOrderKey);
    }

    // Delete demo markers
    await redis.del(`modsync:demo:${subredditId}`);
    await redis.del(`modsync:demo:seeded:${subredditId}`);

    return c.json({
      success: true,
      message: 'Demo data cleared',
    });
  } catch (error) {
    console.error('Error clearing demo data:', error);
    return c.json({ error: 'Failed to clear demo data' }, 500);
  }
});

/**
 * POST /api/demo/set-pending/:username
 * Sets a demo user as the pending dossier (for testing the dossier view)
 */
demo.post('/set-pending/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const subredditId = context.subredditId || '';
    const subredditName = context.subredditName || '';

    const demoUser = DEMO_USERS.find(u =>
      u.username.toLowerCase() === username.toLowerCase()
    );

    if (!demoUser) {
      return c.json({
        error: 'Demo user not found',
        availableUsers: DEMO_USERS.map(u => u.username),
      }, 404);
    }

    // Set as pending dossier
    const dossierKey = `modsync:dossier:pending:${subredditId}`;
    await redis.hSet(dossierKey, {
      userId: demoUser.id,
      username: demoUser.username,
      subredditId: subredditId,
      subredditName: subredditName,
      timestamp: Date.now().toString(),
    });
    await redis.expire(dossierKey, 300);

    return c.json({
      success: true,
      message: `Set ${demoUser.username} as pending dossier`,
      user: {
        id: demoUser.id,
        username: demoUser.username,
        profile: demoUser.profile,
      },
      instructions: 'Now navigate to the ModSync post to see this dossier',
    });
  } catch (error) {
    console.error('Error setting pending dossier:', error);
    return c.json({ error: 'Failed to set pending dossier' }, 500);
  }
});

// Legacy bootstrap endpoint for compatibility
demo.get('/bootstrap', async (c) => {
  // Redirect to seed
  return c.redirect('/api/demo/seed');
});
