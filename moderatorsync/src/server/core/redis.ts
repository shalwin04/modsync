// Redis Store Service for ModSync
// Handles all Redis data operations with tenant isolation

import type { RedisClient } from '@devvit/web/server';
import type {
  UserMeta,
  NoteEntry,
  StatusBadge,
  NoteType,
} from '../../types/modsync.js';
import {
  userMetaKey,
  userNotesKey,
  watchlistKey,
} from '../../utils/keys.js';
import { generateId, getCurrentTimestamp } from '../../utils/formatters.js';
import { DEFAULT_USER_META } from '../../types/modsync.js';

export class RedisStore {
  constructor(private redis: RedisClient) {}

  // ========== User Meta Operations ==========

  async getUserMeta(subId: string, userId: string): Promise<UserMeta> {
    const key = userMetaKey(subId, userId);
    const data = await this.redis.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return { ...DEFAULT_USER_META };
    }

    return {
      status_badge: (data.status_badge as StatusBadge) || 'NEUTRAL',
      watchlist_expiration: parseInt(data.watchlist_expiration || '0', 10),
      record_last_updated: parseInt(data.record_last_updated || '0', 10),
      internal_note_count: parseInt(data.internal_note_count || '0', 10),
      first_local_interaction: parseInt(data.first_local_interaction || '0', 10),
      total_removals: parseInt(data.total_removals || '0', 10),
      total_approvals: parseInt(data.total_approvals || '0', 10),
      automod_catches: parseInt(data.automod_catches || '0', 10),
    };
  }

  async updateUserMeta(
    subId: string,
    userId: string,
    updates: Partial<UserMeta>
  ): Promise<void> {
    const key = userMetaKey(subId, userId);
    const fields: Record<string, string> = {};

    for (const [k, v] of Object.entries(updates)) {
      fields[k] = String(v);
    }
    fields.record_last_updated = String(getCurrentTimestamp());

    await this.redis.hSet(key, fields);
  }

  async setUserStatus(
    subId: string,
    userId: string,
    status: StatusBadge
  ): Promise<void> {
    await this.updateUserMeta(subId, userId, { status_badge: status });
  }

  // ========== Notes Operations ==========
  // Notes stored in hash: noteId -> JSON(note)
  // Simple approach: store all notes in hash, sort by timestamp in code

  async addNote(
    subId: string,
    userId: string,
    modUsername: string,
    modId: string,
    content: string,
    noteType: NoteType
  ): Promise<void> {
    const noteId = generateId();
    const timestamp = getCurrentTimestamp();
    const notesHashKey = userNotesKey(subId, userId);

    const noteEntry: NoteEntry = {
      note_id: noteId,
      author_username: modUsername,
      author_id: modId,
      timestamp,
      content,
      note_type: noteType,
    };

    console.log(`Adding note to ${notesHashKey}:`, noteEntry);

    // Store note in hash (noteId -> JSON)
    await this.redis.hSet(notesHashKey, { [noteId]: JSON.stringify(noteEntry) });

    // Update note count in meta
    const meta = await this.getUserMeta(subId, userId);
    await this.updateUserMeta(subId, userId, {
      internal_note_count: meta.internal_note_count + 1,
    });

    console.log(`Note added successfully for user ${userId}`);
  }

  async getRecentNotes(
    subId: string,
    userId: string,
    limit: number = 10
  ): Promise<NoteEntry[]> {
    const notesHashKey = userNotesKey(subId, userId);

    try {
      console.log(`Fetching notes from: ${notesHashKey}`);

      // Fetch all notes from hash
      const notesData = await this.redis.hGetAll(notesHashKey);

      console.log(`Notes data retrieved:`, notesData ? Object.keys(notesData).length : 0, 'notes');

      if (!notesData || Object.keys(notesData).length === 0) {
        return [];
      }

      // Parse all notes
      const notes: NoteEntry[] = [];
      for (const [noteId, rawNote] of Object.entries(notesData)) {
        try {
          const note = JSON.parse(rawNote) as NoteEntry;
          notes.push(note);
        } catch (e) {
          console.error(`Failed to parse note ${noteId}:`, e);
        }
      }

      // Sort by timestamp descending (newest first)
      notes.sort((a, b) => b.timestamp - a.timestamp);

      // Return limited results
      return notes.slice(0, limit);
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }

  async deleteNote(subId: string, userId: string, noteId: string): Promise<void> {
    const notesHashKey = userNotesKey(subId, userId);

    // Remove from hash
    await this.redis.hDel(notesHashKey, [noteId]);

    // Update note count
    const meta = await this.getUserMeta(subId, userId);
    if (meta.internal_note_count > 0) {
      await this.updateUserMeta(subId, userId, {
        internal_note_count: meta.internal_note_count - 1,
      });
    }
  }

  // ========== Watchlist Operations ==========

  async addToWatchlist(
    subId: string,
    userId: string,
    durationHours: number
  ): Promise<void> {
    const expiration = getCurrentTimestamp() + durationHours * 3600;

    // Update user meta
    await this.updateUserMeta(subId, userId, {
      status_badge: 'WATCHLIST',
      watchlist_expiration: expiration,
    });

    // Add to sorted set for efficient lookup
    const key = watchlistKey(subId);
    await this.redis.zAdd(key, { member: userId, score: expiration });
  }

  async removeFromWatchlist(subId: string, userId: string): Promise<void> {
    await this.updateUserMeta(subId, userId, {
      status_badge: 'NEUTRAL',
      watchlist_expiration: 0,
    });

    const key = watchlistKey(subId);
    await this.redis.zRem(key, [userId]);
  }

  async getWatchlistExpiring(subId: string): Promise<string[]> {
    const now = getCurrentTimestamp();
    const key = watchlistKey(subId);

    try {
      const expiredUsers = await this.redis.zRange(key, '-inf', now.toString(), {
        by: 'score',
      });
      return expiredUsers || [];
    } catch (error) {
      console.error('Error getting expiring watchlist:', error);
      return [];
    }
  }

  // ========== Activity Tracking ==========

  async recordRemoval(subId: string, userId: string): Promise<void> {
    const meta = await this.getUserMeta(subId, userId);
    await this.updateUserMeta(subId, userId, {
      total_removals: meta.total_removals + 1,
      first_local_interaction: meta.first_local_interaction || getCurrentTimestamp(),
    });
  }

  async recordApproval(subId: string, userId: string): Promise<void> {
    const meta = await this.getUserMeta(subId, userId);
    await this.updateUserMeta(subId, userId, {
      total_approvals: meta.total_approvals + 1,
      first_local_interaction: meta.first_local_interaction || getCurrentTimestamp(),
    });
  }

  async recordAutomodCatch(subId: string, userId: string): Promise<void> {
    const meta = await this.getUserMeta(subId, userId);
    await this.updateUserMeta(subId, userId, {
      automod_catches: meta.automod_catches + 1,
      first_local_interaction: meta.first_local_interaction || getCurrentTimestamp(),
    });
  }
}
