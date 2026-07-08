import { test, expect } from '@playwright/test';

test.describe('Businesses Flow', () => {

  test('loads businesses page', async ({ page }) => {
    await page.goto('/businesses');

    // Check if the page title is present when loading or after redirect
    await page.waitForLoadState('networkidle');
    const url = page.url();

    if (url.includes('login')) {
      await expect(page.locator('h2')).toContainText('Welcome');
    } else {
      await expect(page.locator('h2')).toContainText('Nearby Businesses');

      // Wait for the loading state to vanish
      await expect(page.locator('.animate-spin')).toBeHidden();

      // We expect either business items or a 'no businesses found' state
      const noBusinesses = page.locator('text=No businesses found');
      const businessCards = page.locator('.bg-white.rounded-xl.shadow');

      await expect(noBusinesses.or(businessCards.first())).toBeVisible();
    }
  });
});
