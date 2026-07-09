import { test, expect } from '@playwright/test';

test.describe('Feed and Post Flow', () => {

  test('loads feed and handles offline states conditionally', async ({ page, context }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    const url = page.url();
    if (url.includes('login')) {
      await expect(page.locator('h2')).toContainText('Welcome');
      return;
    }

    const textarea = page.locator('textarea[placeholder="What\'s happening locally?"]');
    await expect(textarea).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.locator('text=You\'re Offline').or(page.locator('.text-red-600'))).toBeVisible();
    await context.setOffline(false);
  });
});
