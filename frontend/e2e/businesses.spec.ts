import { test, expect } from '@playwright/test';

test.describe('Businesses Flow', () => {

  test('loads businesses page', async ({ page }) => {
    await page.goto('/businesses');

    await page.waitForLoadState('networkidle');
    const url = page.url();

    if (url.includes('login')) {
      await expect(page.locator('h2')).toContainText('Welcome');
    } else {
      await expect(page.locator('h2')).toContainText('Nearby Businesses');

      await expect(page.locator('.animate-spin')).toBeHidden();

      const noBusinesses = page.locator('text=No businesses listed yet');
      const businessCards = page.locator('.bg-white.rounded-xl.shadow');

      await expect(noBusinesses.or(businessCards.first())).toBeVisible();
    }
  });
});
