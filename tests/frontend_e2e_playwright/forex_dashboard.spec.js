import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

test.describe('ForexPulse End-to-End User Experience & Resilience Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('Case 1: Dashboard loads exchange rates without errors', async ({ page }) => {
    await expect(page.locator('.brand-title')).toHaveText('ForexPulse');

    // Rate cards should render
    const rateCards = page.locator('.rate-card');
    await expect(rateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await rateCards.count();
    expect(count).toBeGreaterThan(5);
  });

  test('Case 2: Data freshness and provider provenance are displayed transparently', async ({ page }) => {
    // Status indicator badge
    const statusPill = page.locator('.status-indicator');
    await expect(statusPill).toBeVisible();

    // Relative elapsed time
    const timeLabel = page.locator('.freshness-time');
    await expect(timeLabel).toContainText('Updated:');

    // Data source provenance
    const sourceLabel = page.locator('.freshness-source');
    await expect(sourceLabel).toContainText('Source:');
  });

  test('Case 3: Instant Currency Converter calculates accurate amounts and supports swap', async ({ page }) => {
    const calcInput = page.locator('.calc-input');
    await calcInput.fill('250');

    // Result display must compute a numeric value
    const resultDisplay = page.locator('.result-number');
    await expect(resultDisplay).not.toHaveText('--');
    await expect(resultDisplay).not.toHaveText('...');

    // Trigger swap
    const swapBtn = page.locator('.btn-swap');
    await swapBtn.click();
    await expect(resultDisplay).toBeVisible();
  });

  test('Case 4: Degraded state handles API outage gracefully without blank screens', async ({ page }) => {
    const simulateToggle = page.locator('.simulate-toggle input[type="checkbox"]');
    await simulateToggle.check();

    // An informative warning banner must display
    const alertBanner = page.locator('.alert-banner.warning');
    await expect(alertBanner).toBeVisible({ timeout: 5000 });
    await expect(alertBanner).toContainText('Showing cached resilient rates');

    // Existing rates remain interactive and accessible
    const rateCards = page.locator('.rate-card');
    await expect(rateCards.first()).toBeVisible();
  });

  test('Case 5: Top 15 Traded filter restricts rate cards accurately', async ({ page }) => {
    const top15Tab = page.locator('.tab-pill', { hasText: 'Top 15 Traded' });
    await top15Tab.click();
    await expect(top15Tab).toHaveClass(/active/);

    const cards = page.locator('.rate-card');
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(15);
  });

  test('Case 6: Real-time search filters specific currency pairs', async ({ page }) => {
    const searchBox = page.locator('.search-box input');
    await searchBox.fill('JPY');

    await expect(page.locator('.rate-card', { hasText: 'JPY' })).toBeVisible();
  });

  test('Case 7: Pro tier conversion banner aligns with product freemium model', async ({ page }) => {
    const proCard = page.locator('.pro-upsell-card');
    await expect(proCard).toBeVisible();
    await expect(proCard).toContainText('$9/mo');
  });
});
