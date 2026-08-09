import { test, expect } from '@playwright/test'

test.describe('Feed Flow', () => {
  test('loads feed and shows seeded posts', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'Admin@1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/)

    await page.goto('/feed')
    await expect(page.locator('h1')).toContainText('Community Feed')
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 })
  })

  test('can post to the feed', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'Admin@1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/)

    await page.goto('/feed')
    const message = `E2E post ${Date.now()}`
    await page.fill('textarea', message)
    await page.click('button:has-text("Post")')
    await expect(page.locator('article', { hasText: message })).toBeVisible({ timeout: 10000 })
  })
})
