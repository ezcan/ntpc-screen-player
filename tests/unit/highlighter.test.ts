import { createApp, h, nextTick, reactive } from 'vue'
import type { App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExhibitTheme from '../../src/components/ExhibitTheme.vue'
import { exhibits } from '../../src/data/exhibits'
import { themeHighlights } from '../../src/data/themeHighlights'
import { splitThemeHighlights } from '../../src/utils/themeSegments'

let app: App | undefined
let host: HTMLDivElement | undefined
let styleSheet: HTMLStyleElement | undefined

function mountTheme() {
  const exhibit = exhibits[0]
  if (!exhibit) throw new Error('Missing supplied exhibit')
  const props = reactive({
    text: exhibit.theme,
    terms: themeHighlights[exhibit.id] ?? [],
    motionEnabled: true,
    paused: false,
    suspended: false,
  })
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({ setup: () => () => h(ExhibitTheme, props) })
  app.mount(host)
  const paragraph = host.querySelector('p')
  if (!paragraph) throw new Error('Missing theme paragraph')
  vi.spyOn(paragraph, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 800, 100))
  const marks = [...paragraph.querySelectorAll('mark')]
  const active = () => [...paragraph.querySelectorAll('.is-highlighted')].map((mark) => mark.textContent)
  return { props, paragraph, marks, active }
}

function move(target: EventTarget, x: number, y: number, pointerType = 'mouse') {
  const event = new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  target.dispatchEvent(event)
}

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id))
})

afterEach(() => {
  app?.unmount()
  app = undefined
  host?.remove()
  host = undefined
  styleSheet?.remove()
  styleSheet = undefined
  vi.useRealTimers()
})

describe('theme content', () => {
  it('preserves every supplied theme and uses existing words for all 30 units', async () => {
    const { props, paragraph } = mountTheme()
    for (const exhibit of exhibits) {
      const terms = themeHighlights[exhibit.id]
      expect(terms?.length).toBeGreaterThanOrEqual(2)
      expect(terms?.every((term) => exhibit.theme.includes(term))).toBe(true)
      props.text = exhibit.theme
      props.terms = terms ?? []
      await nextTick()
      expect(paragraph.textContent).toBe(exhibit.theme)
      expect(paragraph.querySelectorAll('mark').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('matches literal punctuation, prefers longer overlapping terms and ignores empty or missing terms', () => {
    const text = exhibits.find((exhibit) => exhibit.id === 'dingxi-es')?.theme ?? ''
    const segments = splitThemeHighlights(text, ['micro', 'micro:bit', 'micro:bit', '', '不存在的字詞'])
    expect(segments.filter((segment) => segment.kind === 'keyword').map((segment) => segment.text)).toEqual(['micro:bit'])
    expect(segments.map((segment) => segment.text).join('')).toBe(text)
    expect(splitThemeHighlights(text, []).map((segment) => segment.text).join('')).toBe(text)
    expect(splitThemeHighlights('', ['AI'])).toEqual([])
  })
})

describe('automatic and pointer priority', () => {
  it('keeps millisecond timing when production CSS is minified into seconds', async () => {
    styleSheet = document.createElement('style')
    styleSheet.textContent = '.exhibit-theme { --highlight-start: .45s; --highlight-hold: 1.6s; --highlight-gap: .8s; --highlight-idle: 4s; --highlight-proximity: 80px; }'
    document.head.append(styleSheet)
    const { paragraph, active, marks } = mountTheme()
    await vi.advanceTimersByTimeAsync(449)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(active()).toEqual([marks[0]?.textContent])
    await vi.advanceTimersByTimeAsync(1599)
    expect(active()).toEqual([marks[0]?.textContent])
    await vi.advanceTimersByTimeAsync(1)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(799)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(active()).toEqual([marks[1]?.textContent])
    move(document.body, 0, 0)
    await vi.advanceTimersByTimeAsync(16)
    await vi.advanceTimersByTimeAsync(3999)
    expect(paragraph.dataset.highlightMode).toBe('pointer')
    await vi.advanceTimersByTimeAsync(1)
    expect(paragraph.dataset.highlightMode).toBe('auto')
  })

  it('cycles one word at a time, including a retract interval and wraparound', async () => {
    const { active, marks } = mountTheme()
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(450)
    expect(active()).toEqual([marks[0]?.textContent])
    await vi.advanceTimersByTimeAsync(1600)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(800)
    expect(active()).toEqual([marks[1]?.textContent])
    await vi.advanceTimersByTimeAsync(2400)
    expect(active()).toEqual([marks[0]?.textContent])
  })

  it('holds a hovered word but resumes after idle even if the pointer rests near the theme', async () => {
    const { paragraph, marks, active } = mountTheme()
    const first = marks[0]
    if (!first) throw new Error('Missing keyword')
    await vi.advanceTimersByTimeAsync(450)
    move(first, 150, 150)
    await vi.advanceTimersByTimeAsync(16)
    expect(paragraph.dataset.highlightMode).toBe('pointer')
    await vi.advanceTimersByTimeAsync(12000)
    expect(active()).toEqual([first.textContent])
    move(paragraph, 95, 150)
    await vi.advanceTimersByTimeAsync(16)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(3999)
    expect(paragraph.dataset.highlightMode).toBe('pointer')
    await vi.advanceTimersByTimeAsync(1)
    expect(paragraph.dataset.highlightMode).toBe('auto')
    await vi.advanceTimersByTimeAsync(450)
    expect(active()).toEqual([first.textContent])
    move(document.body, 0, 0)
    await vi.advanceTimersByTimeAsync(4016)
    expect(paragraph.dataset.highlightMode).toBe('auto')
    await vi.advanceTimersByTimeAsync(450)
    expect(active()).toEqual([first.textContent])
  })

  it('lets mouse movement take over from a previously keyboard-focused keyword', async () => {
    const { paragraph, marks, active } = mountTheme()
    const first = marks[0]
    const second = marks[1]
    if (!first || !second) throw new Error('Missing keywords')
    first.focus()
    await nextTick()
    expect(paragraph.dataset.highlightMode).toBe('focus')
    move(second, 250, 150)
    await vi.advanceTimersByTimeAsync(16)
    expect(paragraph.dataset.highlightMode).toBe('pointer')
    expect(active()).toEqual([second.textContent])
    move(paragraph, 95, 150)
    await vi.advanceTimersByTimeAsync(16)
    expect(active()).toEqual([])
    await vi.advanceTimersByTimeAsync(4450)
    expect(paragraph.dataset.highlightMode).toBe('auto')
    expect(active()).toEqual([first.textContent])
  })

  it('ignores touch hover and lets keyboard focus hold a keyword', async () => {
    const { paragraph, marks, active } = mountTheme()
    move(document.body, 0, 0, 'touch')
    await vi.advanceTimersByTimeAsync(450)
    expect(paragraph.dataset.highlightMode).toBe('auto')
    const second = marks[1]
    if (!second) throw new Error('Missing keyword')
    second.focus()
    await vi.advanceTimersByTimeAsync(10000)
    expect(paragraph.dataset.highlightMode).toBe('focus')
    expect(active()).toEqual([second.textContent])
    second.blur()
    await vi.advanceTimersByTimeAsync(450)
    expect(paragraph.dataset.highlightMode).toBe('auto')
    expect(active()).toEqual([marks[0]?.textContent])
  })

  it('pauses for controls or hidden pages, honors reduced motion and keeps explicit focus usable', async () => {
    const { props, paragraph, marks, active } = mountTheme()
    await vi.advanceTimersByTimeAsync(450)
    props.paused = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(10000)
    expect(active()).toEqual([marks[0]?.textContent])
    expect(paragraph.dataset.highlightMode).toBe('paused')
    props.paused = false
    props.suspended = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(10000)
    expect(paragraph.dataset.highlightMode).toBe('paused')
    props.suspended = false
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(paragraph.dataset.highlightMode).toBe('paused')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(450)
    expect(active()).toEqual([marks[0]?.textContent])
    props.motionEnabled = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(10000)
    expect(active()).toEqual([])
    expect(paragraph.dataset.highlightMode).toBe('static')
    marks[0]?.focus()
    await nextTick()
    expect(active()).toEqual([marks[0]?.textContent])
  })

  it('cleans up pending animation frames, timers and listeners when switching units', async () => {
    mountTheme()
    move(document.body, 0, 0)
    app?.unmount()
    app = undefined
    expect(vi.getTimerCount()).toBe(0)
    move(document.body, 100, 100)
    await vi.advanceTimersByTimeAsync(10000)
    expect(vi.getTimerCount()).toBe(0)
  })
})
