import { expect, test, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'compact desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small mobile', width: 320, height: 568 },
]

const SURFACES = ['first-lens', 'briefing-shell', 'settings-shell', 'blind-spot'] as const

async function expectSurfaceContract(page: Page) {
  await expect(page.getByRole('heading', { name: 'Unexpected Application Error!' })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('must be used within')

  const result = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    }

    const smallTargets = [...document.querySelectorAll('button, [role="button"]')]
      .filter(visible)
      .map((element) => {
        const box = element.getBoundingClientRect()
        return { label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName, width: box.width, height: box.height }
      })
      .filter(({ width, height }) => width < 44 || height < 44)

    const clippedText = [...document.querySelectorAll('h1, h2, h3, p, button')]
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element)
        return style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 1
      })
      .map((element) => element.textContent?.trim().slice(0, 80))

    const bannedFonts = [...document.querySelectorAll('body *')]
      .filter(visible)
      .map((element) => getComputedStyle(element).fontFamily)
      .filter((family) => /Inter|Sora|Space Grotesk|Gobold|Source Serif/i.test(family))

    return {
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets,
      clippedText,
      bannedFonts: [...new Set(bannedFonts)],
    }
  })

  expect(result.horizontalOverflow).toBeLessThanOrEqual(1)
  expect(result.smallTargets).toEqual([])
  expect(result.clippedText).toEqual([])
  expect(result.bannedFonts).toEqual([])
}

for (const viewport of VIEWPORTS) {
  for (const state of ['pattern', 'tension', 'loading', 'error', 'accepted', 'rejected', 'stale-evidence', 'long-content'] as const) {
    test(`blind-spot ${state} holds at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/preview?surface=blind-spot&state=${state}`)
      await expectSurfaceContract(page)
      if (state === 'pattern' && viewport.width === 390) {
        const fit = await page.locator('article').evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight)
        expect(fit).toBe(true)
      }
    })
  }
}

test('blind-spot advisor preserves typed context when the response fails', async ({ page }) => {
  await page.route('**/functions/v1/blind-spot', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'synthetic transport failure' }),
  }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/preview?surface=blind-spot&state=conversation')
  const input = page.getByPlaceholder('Ask about this read')
  await input.fill('What evidence would change this read?')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('alert')).toContainText('Ask that once more')
  await expect(input).toHaveValue('What evidence would change this read?')
})

for (const viewport of VIEWPORTS) {
  for (const surface of SURFACES) {
    test(`${surface} holds the UI contract at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/preview?surface=${surface}`)
      await page.waitForLoadState('networkidle').catch(() => {})
      await expectSurfaceContract(page)
    })
  }
}

test('briefing conversation preserves a failed question and offers one-tap recovery', async ({ page }) => {
  await page.route('**/functions/v1/briefing-conversation', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'synthetic transport failure' }),
  }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/preview?surface=briefing-shell')
  await page.getByRole('button', { name: 'Type a question' }).click()
  const question = 'What changed for my operating model?'
  await page.getByPlaceholder('What do you want to understand?').fill(question)
  await page.getByRole('button', { name: 'Ask CTRL' }).click()

  await expect(page.getByRole('alert')).toContainText('Your question is still here')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await page.getByRole('button', { name: 'Type a question' }).click()
  await expect(page.getByPlaceholder('What do you want to understand?')).toHaveValue(question)
})

test('the first lens confirms in one click and can reset cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/preview?surface=first-lens')
  await page.getByRole('button', { name: /Yes, start here/i }).click()
  await expect(page.getByRole('heading', { name: 'Starting point saved.' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset fixture' }).click()
  await expect(page.getByRole('article').getByText('Here is what I heard')).toBeVisible()
})
