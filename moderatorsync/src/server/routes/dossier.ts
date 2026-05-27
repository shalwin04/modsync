// Dossier API Routes
// Handles data fetching and updates for user dossiers

import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { NoteType } from '../../types/modsync.js';
import { RedisStore } from '../core/redis.js';
import { getUserInfo, isUserModerator } from '../core/reddit.js';
import { calculateMetrics } from '../core/metrics.js';

export const dossier = new Hono();

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
        modUsername?: string;
        modId?: string;
    }>();

      if (!subId || !userId || !body.content) {
      return c.json<ErrorResponse>(
        {
          type: 'error',
          message: 'Missing required fields',
          error: true,
        },
        { status: 400 }
      );
    }

      // Ensure caller is a moderator for this subreddit
      const subredditName = context.subredditName || c.req.header('x-subreddit-name') || '';
      const isMod = await isUserModerator(reddit, subredditName);
      if (!isMod) {
        return c.json({ type: 'error', message: 'Not authorized', error: true }, { status: 403 });
      }

      // Prefer server-side current user identity via Devvit Reddit client
      let modUsername = body.modUsername || 'unknown';
      let modId = body.modId || 'unknown';
      try {
        const me = await reddit.getCurrentUser();
        if (me) {
          modUsername = me.username || modUsername;
          modId = me.id || modId;
        }
      } catch (err) {
        console.warn('Could not determine current moderator identity from Reddit client', err);
      }

      // Basic input validation
      const contentTrimmed = String(body.content || '').trim();
      if (!contentTrimmed || contentTrimmed.length > 2000) {
        return c.json({ type: 'error', message: 'Invalid content', error: true }, { status: 400 });
      }

      const store = new RedisStore(redis);
      await store.addNote(subId, userId, modUsername, modId, contentTrimmed, body.noteType || 'info');

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
 * DELETE /api/dossier/:subId/:userId/note/:noteId
 * Delete a note by ID
 */
dossier.delete('/:subId/:userId/note/:noteId', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');
    const noteId = c.req.param('noteId');

    if (!subId || !userId || !noteId) {
      return c.json({ type: 'error', message: 'Missing required params', error: true }, { status: 400 });
    }

    const store = new RedisStore(redis);
    const deleted = await store.deleteNote(subId, userId, noteId);

    if (!deleted) {
      return c.json({ type: 'error', message: 'Note not found', error: true }, { status: 404 });
    }

    const notes = await store.getRecentNotes(subId, userId, 10);

    return c.json({ type: 'success', message: 'Note deleted', notes });
  } catch (error) {
    console.error('Error deleting note:', error);
    return c.json({ type: 'error', message: 'Failed to delete note', error: true }, { status: 500 });
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

/**
 * POST /api/dossier/:subId/:userId/action/removal
 * Record that a removal action was taken on this user
 */
dossier.post('/:subId/:userId/action/removal', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');

    if (!subId || !userId) {
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
    await store.recordRemoval(subId, userId);
    const meta = await store.getUserMeta(subId, userId);

    return c.json({
      type: 'success',
      message: 'Removal recorded',
      meta,
    });
  } catch (error) {
    console.error('Error recording removal:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to record removal',
        error: true,
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dossier/:subId/:userId/action/approval
 * Record that an approval action was taken on this user
 */
dossier.post('/:subId/:userId/action/approval', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');

    if (!subId || !userId) {
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
    await store.recordApproval(subId, userId);
    const meta = await store.getUserMeta(subId, userId);

    return c.json({
      type: 'success',
      message: 'Approval recorded',
      meta,
    });
  } catch (error) {
    console.error('Error recording approval:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to record approval',
        error: true,
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dossier/:subId/:userId/action/automod
 * Record that an AutoMod catch occurred for this user
 */
dossier.post('/:subId/:userId/action/automod', async (c) => {
  try {
    const subId = c.req.param('subId');
    const userId = c.req.param('userId');

    if (!subId || !userId) {
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
    await store.recordAutomodCatch(subId, userId);
    const meta = await store.getUserMeta(subId, userId);

    return c.json({
      type: 'success',
      message: 'AutoMod catch recorded',
      meta,
    });
  } catch (error) {
    console.error('Error recording automod catch:', error);
    return c.json<ErrorResponse>(
      {
        type: 'error',
        message: 'Failed to record automod catch',
        error: true,
      },
      { status: 500 }
    );
  }
});
