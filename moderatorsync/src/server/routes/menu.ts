import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/dashboard-open', async (c) => {
  try {
    // Navigate to the dashboard entrypoint within the app
    return c.json(
      {
        navigateTo: '/dashboard.html',
      },
      200
    );
  } catch (error) {
    console.error('Error opening dashboard:', error);
    return c.json(
      {
        showToast: 'Failed to open dashboard',
      },
      400
    );
  }
});

menu.post('/demo-open', async (c) => {
  try {
    return c.json(
      {
        navigateTo: '/dashboard.html?demo=1',
      },
      200
    );
  } catch (error) {
    console.error('Error opening demo dashboard:', error);
    return c.json(
      {
        showToast: 'Failed to open demo mode',
      },
      400
    );
  }
});
