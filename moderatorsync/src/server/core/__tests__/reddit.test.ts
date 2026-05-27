import { describe, it, expect, vi } from 'vitest';
import { getUserInfo, getUserIdFromName, isUserModerator } from '../reddit.js';

describe('reddit helpers', () => {
  it('maps user info correctly', async () => {
    const fakeUser = {
      username: 'alice',
      createdAt: new Date('2000-01-01T00:00:00Z'),
      linkKarma: 10,
      commentKarma: 5,
    };

    const reddit = {
      getUserByUsername: vi.fn().mockResolvedValue(fakeUser),
    } as any;

    const info = await getUserInfo(reddit, 'alice');
    expect(info).toBeTruthy();
    expect(info?.username).toBe('alice');
    expect(info?.globalKarma).toBe(15);
    expect(info?.accountCreatedAt).toBe(Math.floor(fakeUser.createdAt.getTime() / 1000));
  });

  it('returns user id from name', async () => {
    const fakeUser = { id: 't2_abc', username: 'bob' };
    const reddit = { getUserByUsername: vi.fn().mockResolvedValue(fakeUser) } as any;
    const id = await getUserIdFromName(reddit, 'bob');
    expect(id).toBe('t2_abc');
  });

  it('recognizes moderator via current user metadata', async () => {
    const reddit = {
      getCurrentUser: vi.fn().mockResolvedValue({ username: 'mod', isModerator: true }),
    } as any;

    const res = await isUserModerator(reddit, 'testsub');
    expect(res).toBe(true);
  });

  it('falls back to mod permissions check', async () => {
    const fakeUser = {
      username: 'moduser',
      getModPermissionsForSubreddit: vi.fn().mockResolvedValue(['posts']),
    };
    const reddit = {
      getCurrentUser: vi.fn().mockResolvedValue({ username: 'moduser' }),
      getUserByUsername: vi.fn().mockResolvedValue(fakeUser),
    } as any;

    const res = await isUserModerator(reddit, 'testsub');
    expect(res).toBe(true);
  });

  it('denies when no permissions', async () => {
    const fakeUser = {
      username: 'plain',
      getModPermissionsForSubreddit: vi.fn().mockResolvedValue([]),
    };
    const reddit = {
      getCurrentUser: vi.fn().mockResolvedValue({ username: 'plain' }),
      getUserByUsername: vi.fn().mockResolvedValue(fakeUser),
    } as any;

    const res = await isUserModerator(reddit, 'testsub');
    expect(res).toBe(false);
  });
});
