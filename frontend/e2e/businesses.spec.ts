import { test, expect } from '@playwright/test'

test.describe('Businesses Flow', () => {
  test('loads businesses list and shows seeded data', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'Admin@1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    await page.goto('/businesses')
    await expect(page.locator('h1')).toContainText('Businesses')
    await expect(page.locator('a[href^="/businesses/"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('can create a business', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'Admin@1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    await page.goto('/businesses/new')
    await page.fill('input[placeholder*="Sharma Sweets"]', `E2E Test Cafe ${Date.now()}`)
    await page.fill('input[placeholder*="Street, area"]', 'C-Scheme, Jaipur')
    await page.fill('input[placeholder*="+91 98"]', '+91 90000 00002')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/businesses\//)
    await expect(page.locator('h1').first()).toContainText('E2E Test Cafe')
  })
})

