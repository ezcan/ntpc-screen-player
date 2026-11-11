import { createApp, nextTick, ref } from 'vue'
import type { App, Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exhibits } from '../../src/data/exhibits'
import { useExhibitController } from '../../src/composables/useExhibitController'
import type { ExhibitInput } from '../../src/types/exhibit'

let app: App | undefined
let host: HTMLDivElement | undefined

function mountController(source: readonly ExhibitInput[] | Ref<ExhibitInput[]> = exhibits) {
  let result: ReturnType<typeof useExhibitController> | undefined
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({
    setup() {
      result = useExhibitController(source)
      return () => null
    },
  })
  app.mount(host)
  if (!result) throw new Error('Controller did not mount')
  return result
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('provided data and URL state', () => {
  it('keeps all 30 supplied records, explicit zones and both organizations', () => {
    const c = mountController()
    expect(c.allExhibits.value).toHaveLength(30)
    expect(new Set(c.allExhibits.value.map((unit) => unit.id)).size).toBe(30)
    expect(c.allExhibits.value).toEqual([...exhibits].sort((a, b) => a.order - b.order))
    expect(c.allExhibits.value.filter((unit) => unit.unitType === 'organization').map((unit) => unit.id))
      .toEqual(['smart-learning-team', 'beitao-jin-team'])
    expect(c.availableZones.value.slice(0, 4).map((zone) => zone.id))
      .toEqual(['future-ai', 'future-digital', 'maker', 'cross-disciplinary'])
    expect(c.availableZones.value.reduce((sum, zone) => sum + zone.count, 0)).toBe(30)
  })

  it('loads direct unit, playback and interval while preserving unrelated query and hash', async () => {
    window.history.replaceState({}, '', '/?unit=beitao-jin-team&autoplay=true&interval=23&screen=2#stage')
    const c = mountController()
    await nextTick()
    expect(c.currentExhibit.value?.unitName).toBe('北桃金輔導團')
    expect(c.autoplay.value).toBe(true)
    expect(c.intervalSeconds.value).toBe(23)
    c.next()
    await nextTick()
    const url = new URL(window.location.href)
    expect(url.searchParams.get('unit')).toBe('sanmin-hs')
    expect(url.searchParams.get('screen')).toBe('2')
    expect(url.hash).toBe('#stage')
  })

  it.each(['0', '-5', 'abc', '1.5', '3601', 'Infinity', ''])('repairs invalid ID and interval %j', (interval) => {
    window.history.replaceState({}, '', `/?unit=missing&autoplay=invalid&interval=${interval}`)
    const c = mountController()
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    expect(c.intervalSeconds.value).toBe(15)
    expect(c.autoplay.value).toBe(false)
    expect(new URLSearchParams(window.location.search).get('unit')).toBe('sanmin-hs')
  })

  it('rehydrates a popstate and resets transient filters', async () => {
    const c = mountController()
    c.searchQuery.value = '陀螺'
    c.selectedZoneId.value = 'maker'
    window.history.replaceState({}, '', '/?unit=smart-learning-team&autoplay=true&interval=8')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await nextTick()
    expect(c.currentExhibit.value?.id).toBe('smart-learning-team')
    expect(c.selectedZoneId.value).toBe('all')
    expect(c.searchQuery.value).toBe('')
    expect(c.intervalSeconds.value).toBe(8)
  })
})

describe('classification, filtering and navigation', () => {
  it('groups from edited zone IDs and normalizes omitted IDs without guessing a theme', async () => {
    const first = exhibits[0]
    const second = exhibits[1]
    const third = exhibits[2]
    if (!first || !second || !third) throw new Error('Expected supplied data')
    const missingZone: ExhibitInput = { ...second }
    delete missingZone.zoneId
    const source = ref<ExhibitInput[]>([{ ...first, zoneId: 'future-ai' }, missingZone, { ...third, zoneId: 'maker' }])
    const c = mountController(source)
    expect(c.availableZones.value.find((zone) => zone.id === 'unassigned')?.count).toBe(1)
    expect(c.availableZones.value.find((zone) => zone.id === 'maker')?.count).toBe(1)
    expect(c.allExhibits.value.find((unit) => unit.id === second.id)?.zoneId).toBe('unassigned')
    source.value[1] = { ...second, zoneId: 'future-digital' }
    await nextTick()
    expect(c.availableZones.value.some((zone) => zone.id === 'unassigned')).toBe(false)
    c.selectedZoneId.value = 'future-ai'
    expect(c.filteredExhibits.value.map((unit) => unit.id)).toEqual([first.id])
  })

  it('wraps within the sorted keyword results, entering at either end from outside the filter', () => {
    const c = mountController()
    c.searchQuery.value = '陀螺'
    expect(c.filteredExhibits.value.map((unit) => unit.id)).toEqual(['jiangcui-jh', 'daguan-jh-es'])
    c.next()
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
    c.next()
    expect(c.currentExhibit.value?.id).toBe('daguan-jh-es')
    c.next()
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
    c.previous()
    expect(c.currentExhibit.value?.id).toBe('daguan-jh-es')
    c.selectUnit('sanmin-hs')
    c.previous()
    expect(c.currentExhibit.value?.id).toBe('daguan-jh-es')
  })

  it('searches unit names and themes case-insensitively, and preserves the stage on empty results', () => {
    const c = mountController()
    c.searchQuery.value = ' LINE '
    expect(c.filteredExhibits.value.map((unit) => unit.id)).toEqual(['xintai-jh'])
    c.searchQuery.value = '中港'
    expect(c.filteredExhibits.value.map((unit) => unit.id)).toEqual(['zhonggang-es'])
    c.searchQuery.value = '找不到這筆'
    expect(c.canNavigate.value).toBe(false)
    c.next()
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    c.selectUnit('missing')
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
  })

  it('sorts by order rather than the source array position and closes the menu on selection', () => {
    const c = mountController([...exhibits].reverse())
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    c.isMenuOpen.value = true
    c.selectUnit('beitao-jin-team')
    expect(c.isMenuOpen.value).toBe(false)
    c.next()
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
  })

  it('handles an empty source and repairs active selection when data is removed', async () => {
    const source = ref<ExhibitInput[]>([...exhibits])
    const c = mountController(source)
    c.toggleAutoplay()
    source.value = []
    await nextTick()
    expect(c.currentExhibit.value).toBeNull()
    expect(c.currentPosition.value).toBe(0)
    expect(c.autoplay.value).toBe(false)
    c.previous()
    c.next()
    c.toggleAutoplay()
    expect(c.autoplay.value).toBe(false)
    expect(new URLSearchParams(window.location.search).has('unit')).toBe(false)
  })
})

describe('playback, keyboard and lifecycle', () => {
  it('starts off, advances at the configured interval, and pauses for menu and hidden page', async () => {
    vi.useFakeTimers()
    const c = mountController()
    expect(c.autoplay.value).toBe(false)
    c.setIntervalSeconds(2)
    c.toggleAutoplay()
    await nextTick()
    await vi.advanceTimersByTimeAsync(1999)
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    await vi.advanceTimersByTimeAsync(1)
    expect(c.currentExhibit.value?.id).toBe('zhonggang-es')
    c.isMenuOpen.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(6000)
    expect(c.currentExhibit.value?.id).toBe('zhonggang-es')
    c.isMenuOpen.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(2000)
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(10000)
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(2000)
    expect(c.currentExhibit.value?.id).toBe('dingxi-es')
  })

  it('restarts the full interval after a manual selection and clears effects on unmount', async () => {
    vi.useFakeTimers()
    const c = mountController()
    c.setIntervalSeconds(2)
    c.toggleAutoplay()
    await nextTick()
    await vi.advanceTimersByTimeAsync(1500)
    c.selectUnit('jiangcui-jh')
    await nextTick()
    await vi.advanceTimersByTimeAsync(1500)
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
    app?.unmount()
    app = undefined
    expect(vi.getTimerCount()).toBe(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(c.currentExhibit.value?.id).toBe('jiangcui-jh')
  })

  it('supports shortcuts while ignoring text entry, IME composition and modified shortcuts', () => {
    const c = mountController()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(c.currentExhibit.value?.id).toBe('zhonggang-es')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'M' }))
    expect(c.isMenuOpen.value).toBe(true)
    const input = document.createElement('input')
    document.body.append(input)
    for (const key of ['m', 'f', ' ', 'ArrowRight', 'ArrowLeft']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }
    input.remove()
    expect(c.isMenuOpen.value).toBe(true)
    expect(c.autoplay.value).toBe(false)
    expect(c.currentExhibit.value?.id).toBe('sanmin-hs')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', isComposing: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true }))
    expect(c.isMenuOpen.value).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(c.isMenuOpen.value).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(c.autoplay.value).toBe(true)
  })

  it('rejects invalid interval updates', () => {
    const c = mountController()
    for (const value of [0, -1, 1.2, 3601, NaN, Infinity]) c.setIntervalSeconds(value)
    expect(c.intervalSeconds.value).toBe(15)
    c.setIntervalSeconds(1)
    expect(c.intervalSeconds.value).toBe(1)
    c.setIntervalSeconds(3600)
    expect(c.intervalSeconds.value).toBe(3600)
  })

  it('reflects reduced-motion and reports fullscreen rejection without an unhandled error', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blocked')),
    })
    const c = mountController()
    expect(c.isMotionEnabled.value).toBe(false)
    await c.toggleFullscreen()
    expect(c.fullscreenError.value).toContain('無法切換全螢幕')
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement })
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(c.isFullscreen.value).toBe(true)
  })
})
