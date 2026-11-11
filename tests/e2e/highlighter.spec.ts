import { expect, test } from '@playwright/test'
import { exhibits } from '../../src/data/exhibits'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.clock.install({ time: new Date('2026-11-11T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-11T00:01:00Z'))
  await page.goto('/?unit=sanmin-hs')
})

test('cycles through exact theme words, retracting between strokes and wrapping around', async ({ page }) => {
  const theme = page.locator('.exhibit-theme')
  const marks = theme.locator('mark')
  await expect(theme).toHaveAttribute('data-highlight-mode', 'auto')
  expect(await theme.textContent()).toBe(exhibits[0]?.theme)
  await page.clock.runFor(450)
  await expect(marks.nth(0)).toHaveClass(/is-highlighted/)
  await page.clock.runFor(1600)
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  await page.clock.runFor(800)
  await expect(marks.nth(1)).toHaveClass(/is-highlighted/)
  await page.clock.runFor(2400)
  await expect(marks.nth(0)).toHaveClass(/is-highlighted/)
})

test('painted strokes finish retracting before the next stroke and remain readable', async ({ page }) => {
  // Observe actual CSS transitions as well as classes: a fast JS loop can leave
  // several partly painted bands even when only one mark has the active class.
  await page.clock.resume()
  const samples = await page.locator('.exhibit-theme').evaluate(async (element) => {
    const result: Array<{ elapsed: number; widths: number[] }> = []
    const start = performance.now()
    while (performance.now() - start < 3600) {
      result.push({
        elapsed: performance.now() - start,
        widths: [...element.querySelectorAll('mark')].map((mark) => {
          const layers = getComputedStyle(mark).backgroundSize.split(',')
          return parseFloat(layers[layers.length - 1] ?? '0')
        }),
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
    }
    return result
  })
  expect(samples.every((sample) => sample.widths.filter((width) => width > 1).length <= 1)).toBe(true)
  expect(samples.filter((sample) => (sample.widths[0] ?? 0) > 99).length).toBeGreaterThanOrEqual(5)
  expect(samples.some((sample) => (sample.widths[1] ?? 0) > 99)).toBe(true)
})

test('mouse activity takes priority and idle near blank theme space restores the loop', async ({ page }) => {
  const theme = page.locator('.exhibit-theme')
  const marks = theme.locator('mark')
  await page.clock.runFor(450)
  const word = await marks.nth(1).boundingBox()
  const area = await theme.boundingBox()
  if (!word || !area) throw new Error('Missing theme geometry')
  await page.mouse.move(word.x + word.width / 2, word.y + word.height / 2)
  await page.clock.runFor(32)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'pointer')
  await expect(marks.nth(1)).toHaveClass(/is-highlighted/)
  await page.clock.runFor(10000)
  await expect(marks.nth(1)).toHaveClass(/is-highlighted/)
  await page.mouse.move(area.x - 30, area.y + area.height / 2)
  await page.clock.runFor(32)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'pointer')
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  await page.clock.runFor(3900)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'pointer')
  await page.clock.runFor(600)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'auto')
  await expect(theme.locator('.is-highlighted')).toHaveCount(1)
  await page.mouse.move(0, 0)
  await page.clock.runFor(4032)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'auto')
  await page.clock.runFor(450)
  await expect(theme.locator('.is-highlighted')).toHaveCount(1)
})

test('a mouse click does not pin the stroke after leaving the keyword', async ({ page }) => {
  const theme = page.locator('.exhibit-theme')
  const first = theme.locator('mark').first()
  await first.click()
  await page.clock.runFor(32)
  await expect(first).toBeFocused()
  expect(await first.evaluate((element) => element.matches(':focus-visible'))).toBe(false)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'pointer')
  await expect(first).toHaveClass(/is-highlighted/)
  await page.mouse.move(0, 0)
  await page.clock.runFor(32)
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  await page.clock.runFor(4450)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'auto')
  await expect(theme.locator('.is-highlighted')).toHaveCount(1)
})

test('the mouse takes over after keyboard focus without leaving a stale stroke', async ({ page }) => {
  const theme = page.locator('.exhibit-theme')
  const first = theme.locator('mark').nth(0)
  const second = theme.locator('mark').nth(1)
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()
  await expect(theme).toHaveAttribute('data-highlight-mode', 'focus')
  const word = await second.boundingBox()
  if (!word) throw new Error('Missing keyword geometry')
  await page.mouse.move(word.x + word.width / 2, word.y + word.height / 2)
  await page.clock.runFor(32)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'pointer')
  await expect(second).toHaveClass(/is-highlighted/)
  await expect(first).not.toHaveClass(/is-highlighted/)
  await page.mouse.move(0, 0)
  await page.clock.runFor(32)
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  await page.clock.runFor(4450)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'auto')
})

test('explicit pause survives idle, keyboard focus highlights words, and reduced motion disables the loop', async ({ page }) => {
  const theme = page.locator('.exhibit-theme')
  await page.keyboard.press('m')
  await page.getByRole('button', { name: '暫停主題自動劃記', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  await page.clock.runFor(10032)
  await expect(theme).toHaveAttribute('data-highlight-mode', 'paused')
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  const first = theme.locator('mark').nth(0)
  await first.focus()
  await expect(theme).toHaveAttribute('data-highlight-mode', 'focus')
  await expect(first).toHaveClass(/is-highlighted/)
  await page.keyboard.press('Tab')
  await expect(theme.locator('mark').nth(1)).toBeFocused()
  await expect(theme.locator('mark').nth(1)).toHaveClass(/is-highlighted/)
  await page.locator('.menu-toggle').focus()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(theme).toHaveAttribute('data-highlight-mode', 'static')
  await expect(theme.locator('.is-highlighted')).toHaveCount(0)
  await page.keyboard.press('m')
  await expect(page.getByRole('button', { name: '系統已停用主題自動劃記', exact: true })).toBeDisabled()
})
