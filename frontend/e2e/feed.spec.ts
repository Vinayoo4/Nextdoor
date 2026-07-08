import { test, expect } from '@playwright/test';

test.describe('Feed and Post Flow', () => {

  test('loads feed and handles offline states conditionally', async ({ page, context }) => {
    await page.goto('/');

    // Fallback logic check
    await page.waitForLoadState('networkidle');
    const url = page.url();
    if (url.includes('login')) {
      await expect(page.locator('h2')).toContainText('Welcome');
      return;
    }

    // Wait for the main feed elements
    await expect(page.locator('textarea[placeholder="What\'s happening in your neighborhood?"]')).toBeVisible();

    // Verify offline functionality
    await context.setOffline(true);
    await page.reload();

    // Ensure we see the offline indicator or fallback cache state
    await expect(page.locator('text=You\'re Offline').or(page.locator('.text-red-600'))).toBeVisible();
    await context.setOffline(false);
  });
});
