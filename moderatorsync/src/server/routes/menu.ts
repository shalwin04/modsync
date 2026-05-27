import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { RedisStore } from '../core/redis.js';
import { getCurrentTimestamp } from '../../utils/formatters.js';
import { userNotesKey, userMetaKey } from '../../utils/keys.js';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    const subredditId = context.subredditId || '';
    if (subredditId && post.id) {
      await redis.set(`modsync:post:${subredditId}`, post.id);
    }

    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id.replace('t3_', '')}`,
      showToast: 'ModSync post created!',
    }, 200);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

// Demo users with rich data
const DEMO_USERS = [
  {
    id: 't2_demo_spammer',
    username: 'SpammyMcSpamface',
    removals: 15,
    approvals: 2,
    automod: 8,
    status: 'RISK' as const,
    notes: [
      { mod: 'ModSarah', content: 'First warning for self-promotion - caught posting affiliate links in 3 threads', type: 'warning' as const, daysAgo: 7 },
      { mod: 'ModJames', content: 'Second warning - still posting affiliate links disguised as "helpful recommendations"', type: 'warning' as const, daysAgo: 4 },
      { mod: 'ModAlex', content: 'Temp banned for 3 days after ignoring warnings. Watch closely on return.', type: 'warning' as const, daysAgo: 1 },
    ],
  },
  {
    id: 't2_demo_trusted',
    username: 'HelpfulContributor',
    removals: 0,
    approvals: 47,
    automod: 1,
    status: 'TRUSTED' as const,
    notes: [
      { mod: 'ModSarah', content: 'Excellent community member! Always answers newbie questions with patience and accuracy.', type: 'positive' as const, daysAgo: 30 },
      { mod: 'ModJames', content: 'Nominated and approved for Community Helper flair. Well deserved!', type: 'positive' as const, daysAgo: 14 },
    ],
  },
  {
    id: 't2_demo_watchlist',
    username: 'SuspiciousNewbie',
    removals: 5,
    approvals: 3,
    automod: 4,
    status: 'WATCHLIST' as const,
    watchlistHours: 24,
    notes: [
      { mod: 'ModAlex', content: 'New account but posting style identical to banned user u/OldSpammer99. Same topics, same phrasing.', type: 'warning' as const, daysAgo: 2 },
      { mod: 'ModSarah', content: 'Added to 24h watchlist for monitoring. Likely ban evasion - will escalate if pattern continues.', type: 'info' as const, daysAgo: 0 },
    ],
  },
  {
    id: 't2_demo_neutral',
    username: 'RegularUser123',
    removals: 2,
    approvals: 18,
    automod: 0,
    status: 'NEUTRAL' as const,
    notes: [
      { mod: 'ModJames', content: 'Accidental Rule 3 violation - used wrong flair. User was polite when corrected, fixed immediately.', type: 'info' as const, daysAgo: 45 },
    ],
  },
  {
    id: 't2_demo_emerging',
    username: 'AggressivePoster',
    removals: 8,
    approvals: 1,
    automod: 12,
    status: 'NEUTRAL' as const,
    notes: [
      { mod: 'ModSarah', content: 'Multiple hostile comments removed today. Warned about civility rules via modmail.', type: 'warning' as const, daysAgo: 5 },
      { mod: 'ModAlex', content: 'Continuing to argue with other users. Borderline harassment reported by 2 community members.', type: 'warning' as const, daysAgo: 2 },
    ],
  },
];

// Helper to set pending dossier for demo user
async function setDemoPending(userId: string, username: string) {
  const subredditId = context.subredditId || '';
  const subredditName = context.subredditName || '';

  const dossierKey = `modsync:dossier:pending:${subredditId}`;
  await redis.hSet(dossierKey, {
    userId,
    username,
    subredditId,
    subredditName,
    timestamp: Date.now().toString(),
  });
  await redis.expire(dossierKey, 300);

  const postId = await redis.get(`modsync:post:${subredditId}`);
  return postId;
}

// View demo user: Spammer
menu.post('/demo-view-spammer', async (c) => {
  try {
    const postId = await setDemoPending('t2_demo_spammer', 'SpammyMcSpamface');
    const subredditName = context.subredditName || '';

    if (!postId) {
      return c.json<UiResponse>({ showToast: 'Create ModSync post first!' }, 400);
    }

    return c.json<UiResponse>({
      navigateTo: `https://www.reddit.com/r/${subredditName}/comments/${postId.replace('t3_', '')}`,
      showToast: '🚨 Loading SpammyMcSpamface (High Risk)',
    });
  } catch (error) {
    console.error('Error:', error);
    return c.json<UiResponse>({ showToast: 'Error loading demo' }, 500);
  }
});

// View demo user: Trusted
menu.post('/demo-view-trusted', async (c) => {
  try {
    const postId = await setDemoPending('t2_demo_trusted', 'HelpfulContributor');
    const subredditName = context.subredditName || '';

    if (!postId) {
      return c.json<UiResponse>({ showToast: 'Create ModSync post first!' }, 400);
    }

    return c.json<UiResponse>({
      navigateTo: `https://www.reddit.com/r/${subredditName}/comments/${postId.replace('t3_', '')}`,
      showToast: '✅ Loading HelpfulContributor (Trusted)',
    });
  } catch (error) {
    console.error('Error:', error);
    return c.json<UiResponse>({ showToast: 'Error loading demo' }, 500);
  }
});

// View demo user: Watchlist
menu.post('/demo-view-watchlist', async (c) => {
  try {
    const postId = await setDemoPending('t2_demo_watchlist', 'SuspiciousNewbie');
    const subredditName = context.subredditName || '';

    if (!postId) {
      return c.json<UiResponse>({ showToast: 'Create ModSync post first!' }, 400);
    }

    return c.json<UiResponse>({
      navigateTo: `https://www.reddit.com/r/${subredditName}/comments/${postId.replace('t3_', '')}`,
      showToast: '👁️ Loading SuspiciousNewbie (Watchlist)',
    });
  } catch (error) {
    console.error('Error:', error);
    return c.json<UiResponse>({ showToast: 'Error loading demo' }, 500);
  }
});

// Demo seed - creates all demo data
menu.post('/demo-seed', async (c) => {
  try {
    const subredditId = context.subredditId || '';
    if (!subredditId) {
      return c.json<UiResponse>({ showToast: 'No subreddit context' }, 400);
    }

    console.log('=== STARTING DEMO SEED ===');
    console.log('Subreddit ID:', subredditId);

    const now = getCurrentTimestamp();
    let totalNotes = 0;

    for (const user of DEMO_USERS) {
      console.log(`\n--- Seeding user: ${user.username} ---`);

      // Calculate first interaction time
      const firstInteraction = now - Math.floor(Math.random() * 60 + 14) * 24 * 3600;

      // Set user meta directly
      const metaKey = userMetaKey(subredditId, user.id);
      await redis.hSet(metaKey, {
        status_badge: user.status,
        total_removals: String(user.removals),
        total_approvals: String(user.approvals),
        automod_catches: String(user.automod),
        first_local_interaction: String(firstInteraction),
        internal_note_count: String(user.notes.length),
        watchlist_expiration: (user as any).watchlistHours
          ? String(now + (user as any).watchlistHours * 3600)
          : '0',
        record_last_updated: String(now),
      });

      console.log(`  Meta set: ${user.removals} removals, ${user.approvals} approvals, status=${user.status}`);

      // Add to watchlist sorted set if applicable
      if ((user as any).watchlistHours) {
        const watchlistKey = `modsync:sub:${subredditId}:watchlist`;
        const expiration = now + (user as any).watchlistHours * 3600;
        await redis.zAdd(watchlistKey, { member: user.id, score: expiration });
        console.log(`  Added to watchlist for ${(user as any).watchlistHours}h`);
      }

      // Add notes directly to hash
      const notesKey = userNotesKey(subredditId, user.id);
      console.log(`  Notes key: ${notesKey}`);

      for (let i = 0; i < user.notes.length; i++) {
        const note = user.notes[i];
        const noteId = `demo_note_${user.id}_${i}_${Date.now()}`;
        const noteTimestamp = now - (note.daysAgo || 0) * 24 * 3600;

        const noteEntry = {
          note_id: noteId,
          author_username: note.mod,
          author_id: `t2_${note.mod.toLowerCase().replace('mod', '')}`,
          timestamp: noteTimestamp,
          content: note.content,
          note_type: note.type,
        };

        await redis.hSet(notesKey, { [noteId]: JSON.stringify(noteEntry) });
        totalNotes++;
        console.log(`  Added note ${i + 1}: "${note.content.substring(0, 40)}..." by ${note.mod}`);
      }

      // Verify notes were saved
      const savedNotes = await redis.hGetAll(notesKey);
      console.log(`  Verified: ${savedNotes ? Object.keys(savedNotes).length : 0} notes in storage`);

      console.log(`  ✓ User ${user.username} seeded successfully`);
    }

    console.log(`\n=== DEMO SEED COMPLETE ===`);
    console.log(`Total users: ${DEMO_USERS.length}`);
    console.log(`Total notes: ${totalNotes}`);

    return c.json<UiResponse>({
      showToast: `✅ Seeded ${DEMO_USERS.length} users with ${totalNotes} notes!`,
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return c.json<UiResponse>({ showToast: `Failed to seed: ${error}` }, 500);
  }
});
