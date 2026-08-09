import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('login with demo admin account', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'Admin@1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Around You')
  })

  test('rejects wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#phone', '9999999999')
    await page.fill('#password', 'wrong-password')
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"]')).toContainText('Invalid phone or password')
  })

  test('guest is redirected to login from app pages', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login/)
  })
})
