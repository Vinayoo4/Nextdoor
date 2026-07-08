import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // We cannot guarantee the test environment has active appwrite endpoints connected
  // This test file outlines the required Playwright structure with condition-based waiting
  // It tests that the application loads and correctly handles the auth redirect

  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    // Check if the initialization spinner appears and then vanishes or routes to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Welcome');
  });

  test('login validation checks', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Login")'); // Click login tab if not active
    await page.click('button[type="submit"]');

    // Expect error
    await expect(page.locator('p.text-red-600')).toContainText('Email address is required.');
  });
});
