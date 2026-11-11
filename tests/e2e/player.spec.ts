import { expect, test } from '@playwright/test'
import { exhibits } from '../../src/data/exhibits'
import { getZoneName } from '../../src/data/zones'

test('direct URLs, invalid IDs, all data and colored stage', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?unit=smart-learning-team&interval=19&autoplay=false')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('智慧學習輔導小組')
  const organization = exhibits.find((unit) => unit.id === 'smart-learning-team')
  if (!organization) throw new Error('Missing supplied organization')
  await expect(page.locator('.exhibit-meta')).toHaveText(getZoneName(organization.zoneId))
  await expect(page.locator('.ambient-layer')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.bokeh-light')).toHaveCount(18)
  await page.getByRole('button', { name: '開啟展示單位選單' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.unit-menu li')).toHaveCount(30)
  await expect(page.getByLabel('輪播秒數', { exact: true })).toHaveValue('19')
  const zoneCount = exhibits.filter((unit) => unit.zoneId === organization.zoneId).length
  await page.getByRole('button', { name: `顯示${getZoneName(organization.zoneId)}的展示單位，共 ${zoneCount} 個`, exact: true }).click()
  await expect(page.locator('.unit-menu li')).toHaveCount(zoneCount)
  await page.getByRole('button', { name: '顯示全部展區的展示單位', exact: true }).click()
  await page.getByRole('button', { name: /^投影北桃金輔導團/ }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('北桃金輔導團')
  await expect(page).toHaveURL(/unit=beitao-jin-team/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('北桃金輔導團')
  await page.goto('/?unit=does-not-exist&autoplay=invalid&interval=-10')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('三民高中')
  await expect(page).toHaveURL(/unit=sanmin-hs&autoplay=false&interval=15/)
  expect(errors).toEqual([])
})

test('search, filtered wraparound and keyboard input protection', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('m')
  await expect(page.getByRole('dialog')).toBeVisible()
  const search = page.getByRole('searchbox')
  await search.fill('m f ai')
  await search.press('ArrowRight')
  await search.press('Space')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('三民高中')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: '開啟自動輪播', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('找不到符合的展示單位，請調整關鍵字或選擇其他展區。')).toBeVisible()
  await search.fill('陀螺')
  await expect(page.locator('.unit-menu li')).toHaveCount(2)
  await page.getByRole('button', { name: /^投影江翠國中/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('江翠國中')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('達觀國中小')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('江翠國中')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('達觀國中小')
  await page.keyboard.press('m')
  await page.getByRole('searchbox').focus()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('autoplay timing, menu pause, interval validation and Space shortcut', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-11T00:01:00Z'))
  await page.goto('/?unit=sanmin-hs&autoplay=true&interval=1')
  await expect(page.locator('.stage-playback-status')).toContainText('每 1 秒')
  await page.clock.fastForward(1000)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('中港國小')
  await page.keyboard.press('m')
  await page.clock.fastForward(5000)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('中港國小')
  const interval = page.getByLabel('輪播秒數', { exact: true })
  await interval.fill('0')
  await interval.blur()
  await expect(interval).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('目前維持 1 秒')
  await interval.fill('2')
  await interval.blur()
  await expect(interval).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('button', { name: '關閉選單', exact: true }).click()
  await page.clock.fastForward(1999)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('中港國小')
  await page.clock.fastForward(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('江翠國中')
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(/autoplay=false/)
  await page.clock.fastForward(10000)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('江翠國中')
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(/autoplay=true/)
})

test('dialog traps and restores focus, scrolls independently, and all buttons are named', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: '開啟展示單位選單', exact: true })
  await opener.click()
  await expect(page.getByRole('button', { name: '關閉選單', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true)
  await page.getByRole('button', { name: /^投影北桃金輔導團/ }).scrollIntoViewIfNeeded()
  expect(await page.locator('.control-panel').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.scrollingElement?.scrollTop)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  expect(await page.locator('button').evaluateAll((buttons) => buttons.every((button) => Boolean(button.getAttribute('aria-label'))))).toBe(true)
})

test('fullscreen follows browser state and the F shortcut', async ({ page }) => {
  await page.goto('/')
  const supported = await page.evaluate(() => document.fullscreenEnabled)
  test.skip(!supported, 'Browser does not expose Fullscreen API')
  await page.keyboard.press('f')
  await expect(page.locator('.app-shell')).toHaveClass(/is-fullscreen/)
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  await page.keyboard.press('f')
  await expect(page.locator('.app-shell')).not.toHaveClass(/is-fullscreen/)
})

test('each viewport contains the complete stage with no projection scrolling or overlap', async ({ page }, testInfo) => {
  for (const [width, height] of [[1920, 1080], [3840, 2160], [1280, 720], [1024, 768], [768, 1024], [375, 812], [844, 390]] as const) {
    await page.setViewportSize({ width, height })
    for (const unit of ['smart-learning-team', 'zhonggang-es', 'chonglin-jh']) {
      await page.goto(`/?unit=${unit}`)
      await expect(page.locator('.exhibit-frame')).toHaveCount(1)
      const bounds = await page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector(selector)
          if (!element) throw new Error(`Missing ${selector}`)
          const { top, bottom, left, right } = element.getBoundingClientRect()
          return { top, bottom, left, right }
        }
        return {
          header: rect('.stage-header'), meta: rect('.exhibit-meta'),
          name: rect('.exhibit-unit-name'), theme: rect('.exhibit-theme'), footer: rect('.stage-footer'),
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          viewportWidth: innerWidth, viewportHeight: innerHeight,
        }
      })
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewportWidth)
      expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.viewportHeight)
      expect(bounds.meta.top).toBeGreaterThanOrEqual(bounds.header.bottom)
      expect(bounds.name.top).toBeGreaterThanOrEqual(bounds.meta.bottom)
      expect(bounds.theme.top).toBeGreaterThanOrEqual(bounds.name.bottom)
      expect(bounds.theme.bottom).toBeLessThanOrEqual(bounds.footer.top)
      expect(bounds.theme.left).toBeGreaterThanOrEqual(0)
      expect(bounds.theme.right).toBeLessThanOrEqual(width)
      expect(Math.abs((bounds.name.left + bounds.name.right) / 2 - width / 2)).toBeLessThan(2)
    }
    if (width === 1920 || width === 375 || width === 844) {
      await page.screenshot({ path: testInfo.outputPath(`stage-${width}x${height}.png`) })
    }
  }
})

test('reduced motion removes transitions, and the preference can change live', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.app-shell')).not.toHaveClass(/is-motion-enabled/)
  await expect(page.locator('.bokeh-light').first()).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.exhibit-frame')).toHaveCount(1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.app-shell')).toHaveClass(/is-motion-enabled/)
  await expect(page.locator('.bokeh-light').first()).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1, name: '江翠國中' })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.app-shell')).not.toHaveClass(/is-motion-enabled/)
  await expect(page.locator('.exhibit-frame')).toHaveCount(1)
  await expect(page.locator('.bokeh-light').first()).toBeHidden()
  await page.keyboard.press('m')
  await expect(page.getByRole('button', { name: '系統已停用背景光點動畫' })).toBeDisabled()
})

test('background lights move independently, pause without resetting, and survive exhibit changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?unit=sanmin-hs')
  const firstLight = page.locator('.bokeh-light').first()
  const before = await firstLight.evaluate((element) => getComputedStyle(element).transform)
  // Poll visible motion rather than waiting for an arbitrary animation duration.
  await expect.poll(() => firstLight.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before)
  const profiles = await page.locator('.bokeh-light').evaluateAll((lights) => lights.map((light) => {
    const style = getComputedStyle(light)
    return { duration: parseFloat(style.animationDuration), delay: parseFloat(style.animationDelay), filter: style.filter }
  }))
  expect(profiles.every((profile) => profile.duration >= 7 && profile.duration <= 14 && profile.delay < 0 && profile.filter.startsWith('blur('))).toBe(true)
  await page.keyboard.press('m')
  await page.getByRole('button', { name: '暫停背景光點動畫', exact: true }).click()
  await expect(firstLight).toHaveCSS('animation-play-state', 'paused')
  const pausedTime = await firstLight.evaluate(async (element) => {
    const animation = element.getAnimations()[0]
    if (!animation) throw new Error('Expected an active background animation')
    // CSS pause takes effect on the next animation frame; await its settled state.
    await animation.ready
    return animation.currentTime
  })
  await page.keyboard.press('Escape')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1, name: '中港國小' })).toBeVisible()
  expect(await firstLight.evaluate((element) => element.getAnimations()[0]?.currentTime)).toBe(pausedTime)
  await page.keyboard.press('m')
  await page.getByRole('button', { name: '播放背景光點動畫', exact: true }).click()
  await expect(firstLight).toHaveCSS('animation-play-state', 'running')
  await expect.poll(() => firstLight.evaluate((element) => element.getAnimations()[0]?.currentTime)).not.toBe(pausedTime)
  await page.keyboard.press('Escape')
  expect(new URL(page.url()).searchParams.get('autoplay')).toBe('false')
})

test('empty dataset shows a stable empty stage and disables navigation and autoplay', async ({ page }) => {
  await page.route('**/src/data/exhibits.ts', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const exhibits = [];',
  }))
  await page.goto('/?unit=missing&autoplay=true')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('目前沒有展示單位')
  await expect(page.locator('.stage-position')).toHaveText('0 / 0')
  expect(new URL(page.url()).searchParams.has('unit')).toBe(false)
  await expect(page).toHaveURL(/autoplay=false/)
  await page.keyboard.press('m')
  await expect(page.getByText('目前沒有展示單位資料。')).toBeVisible()
  await expect(page.getByRole('button', { name: '切換到下一個展示單位', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '開啟自動輪播', exact: true })).toBeDisabled()
})
