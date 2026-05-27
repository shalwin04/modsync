// Dossier API Routes
// Handles data fetching and updates for user dossiers

import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { NoteType } from '../../types/modsync.js';
import { RedisStore } from '../core/redis.js';
import { getUserInfo } from '../core/reddit.js';
import { calculateMetrics } from '../core/metrics.js';
import { getCurrentTimestamp } from '../../utils/formatters.js';

export const dossier = new Hono();

/**
 * GET /api/dossier/pending/:subId
 * Get the pending dossier context (stored when menu is clicked)
 */
dossier.get('/pending/:subId', async (c) => {
  try {
    const subId = c.req.param('subId');
    if (!subId) {
      return c.json({ error: 'Missing subId' }, 400);
    }

    const dossierKey = `modsync:dossier:pending:${subId}`;
    const data = await redis.hGetAll(dossierKey);

    if (!data || !data.userId) {
      return c.json({ error: 'No pending dossier' }, 404);
    }

    // Clear the pending context after reading (one-time use)
    await redis.del(dossierKey);

    return c.json({
      userId: data.userId,
      username: data.username,
      subredditId: data.subredditId,
      subredditName: data.subredditName,
    });
  } catch (error) {
    console.error('Error fetching pending dossier:', error);
    return c.json({ error: 'Failed to fetch pending dossier' }, 500);
  }
});

interface DossierDataResponse {
  type: 'dossier_data';
  targetUserId: string;
  targetUsername: string;
  subredditId: string;
  subredditName: string;
  meta: any;
  notes: any[];
  accountCreatedAt: number;
  metrics: any;
  error?: never;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  error: true;
}

type DossierResponse = DossierDataResponse | ErrorResponse;

/**
 * GET /api/dossier/:subId/:userId
 * Fetch user dossier data (meta + notes + Reddit info)
 */
dossier.get('/:subId/:userId', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');
    const targetUsername = c.req.query('username') || '';

    if (!subId || !userId) {
      return c.json<ErrorResponse>({
        type: 'error',
        message: 'Missing subId or userId',
        error: true,
      });
    }

    const store = new RedisStore(redis);

    // Load data in parallel
    const [meta, notes, redditData] = await Promise.all([
      store.getUserMeta(subId, userId),
      store.getRecentNotes(subId, userId, 10),
      targetUsername
        ? getUserInfo(reddit, targetUsername).catch(() => null)
        : Promise.resolve(null),
    ]);

    const accountCreatedAt = redditData?.accountCreatedAt || 0;
    const metrics = calculateMetrics(meta, accountCreatedAt);

    return c.json<DossierDataResponse>({
      type: 'dossier_data',
      targetUserId: userId,
      targetUsername: targetUsername || 'Unknown',
      subredditId: subId,
      subredditName: context.subredditName || '',
      meta,
      notes,
      accountCreatedAt,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching dossier:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to load dossier data',
        error: true,
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dossier/:subId/:userId/note
 * Add a new note to user's dossier
 */
dossier.post('/:subId/:userId/note', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');
    const body = await c.req.json<{
      content: string;
      noteType?: NoteType;
      modUsername: string;
      modId: string;
    }>();

    if (!subId || !userId || !body.content || !body.modUsername) {
      return c.json<ErrorResponse>(
        {
          type: 'error',
          message: 'Missing required fields',
          error: true,
        },
        { status: 400 }
      );
    }

    const store = new RedisStore(redis);
    await store.addNote(
      subId,
      userId,
      body.modUsername,
      body.modId,
      body.content,
      body.noteType || 'info'
    );

    const notes = await store.getRecentNotes(subId, userId, 10);

    return c.json({
      type: 'success',
      message: 'Note added',
      notes,
    });
  } catch (error) {
    console.error('Error adding note:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to add note',
        error: true,
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dossier/:subId/:userId/status
 * Set user status badge
 */
dossier.post('/:subId/:userId/status', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');
    const body = await c.req.json<{ status: 'TRUSTED' | 'RISK' | 'NEUTRAL' }>();

    if (!subId || !userId || !body.status) {
      return c.json<ErrorResponse>(
        {
          type: 'error',
          message: 'Missing required fields',
          error: true,
        },
        { status: 400 }
      );
    }

    const store = new RedisStore(redis);
    await store.setUserStatus(subId, userId, body.status);
    const meta = await store.getUserMeta(subId, userId);

    return c.json({
      type: 'success',
      message: 'Status updated',
      meta,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to update status',
        error: true,
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dossier/:subId/:userId/watchlist
 * Add or remove user from watchlist
 */
dossier.post('/:subId/:userId/watchlist', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');
    const body = await c.req.json<{
      action: 'add' | 'remove';
      hours?: number;
    }>();

    if (!subId || !userId || !body.action) {
      return c.json<ErrorResponse>(
        {
          type: 'error',
          message: 'Missing required fields',
          error: true,
        },
        { status: 400 }
      );
    }

    const store = new RedisStore(redis);

    if (body.action === 'add') {
      await store.addToWatchlist(subId, userId, body.hours || 12);
    } else {
      await store.removeFromWatchlist(subId, userId);
    }

    const meta = await store.getUserMeta(subId, userId);

    return c.json({
      type: 'success',
      message: `User ${body.action === 'add' ? 'added to' : 'removed from'} watchlist`,
      meta,
    });
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to update watchlist',
        error: true,
      },
      { status: 500 }
    );
  }
});
