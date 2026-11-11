import { computed, onMounted, onUnmounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

interface HighlighterOptions {
  motionEnabled: MaybeRefOrGetter<boolean>
  paused: MaybeRefOrGetter<boolean>
  suspended: MaybeRefOrGetter<boolean>
}

interface PointerPosition {
  x: number
  y: number
  target: EventTarget | null
}

export function useThemeHighlighter(
  element: Ref<HTMLElement | null>,
  keywordCount: MaybeRefOrGetter<number>,
  options: HighlighterOptions,
) {
  const automaticIndex = ref<number | null>(null)
  const pointerIndex = ref<number | null>(null)
  const focusedIndex = ref<number | null>(null)
  const pointerMode = ref(false)
  const pointerNear = ref(false)
  const mounted = ref(false)
  const visible = ref(!document.hidden)
  let automaticTimer: number | undefined
  let idleTimer: number | undefined
  let pointerFrame: number | undefined
  let lastPointer: PointerPosition | undefined
  let cursor = 0
  // Fallbacks also let the composable work in an unstyled document.
  const timing = { start: 450, hold: 1600, gap: 800, idle: 4000, proximity: 80 }

  function readSettings() {
    if (!element.value) return
    const style = getComputedStyle(element.value)
    for (const key of ['start', 'hold', 'gap', 'idle', 'proximity'] as const) {
      const raw = style.getPropertyValue(`--highlight-${key}`).trim().toLowerCase()
      // Production CSS may rewrite 450ms to .45s. Normalize time before using
      // setTimeout; proximity is a pixel distance and must keep its own unit.
      const seconds = key !== 'proximity' && raw.endsWith('s') && !raw.endsWith('ms')
      const value = parseFloat(raw) * (seconds ? 1000 : 1)
      if (Number.isFinite(value) && value > 0) timing[key] = value
    }
  }

  const canAnimate = computed(() => mounted.value && toValue(options.motionEnabled)
    && !toValue(options.paused) && !toValue(options.suspended) && visible.value
    && !pointerMode.value && focusedIndex.value === null && toValue(keywordCount) > 0)
  const activeIndex = computed(() => focusedIndex.value ?? (pointerMode.value ? pointerIndex.value : automaticIndex.value))
  const mode = computed(() => {
    if (!toValue(options.motionEnabled)) return 'static'
    if (toValue(options.suspended) || !visible.value) return 'paused'
    if (focusedIndex.value !== null) return 'focus'
    if (pointerMode.value) return 'pointer'
    return toValue(options.paused) ? 'paused' : 'auto'
  })

  function clearAutomaticTimer() {
    if (automaticTimer !== undefined) window.clearTimeout(automaticTimer)
    automaticTimer = undefined
  }

  function clearIdleTimer() {
    if (idleTimer !== undefined) window.clearTimeout(idleTimer)
    idleTimer = undefined
  }

  function showNext() {
    const count = toValue(keywordCount)
    if (!canAnimate.value || count === 0) return
    automaticIndex.value = cursor % count
    automaticTimer = window.setTimeout(() => {
      automaticIndex.value = null
      cursor = (cursor + 1) % count
      automaticTimer = window.setTimeout(showNext, timing.gap)
    }, timing.hold)
  }

  watch([canAnimate, () => toValue(keywordCount)], () => {
    clearAutomaticTimer()
    if (!toValue(options.motionEnabled) || pointerMode.value || focusedIndex.value !== null) automaticIndex.value = null
    if (canAnimate.value) {
      automaticIndex.value = null
      automaticTimer = window.setTimeout(showNext, timing.start)
    }
  }, { flush: 'sync' })

  function scheduleIdle() {
    clearIdleTimer()
    // Only hovering a real keyword holds the stroke. Nearby blank space must
    // still time out, otherwise a parked mouse can suppress the loop forever.
    if (pointerIndex.value !== null || !visible.value) return
    idleTimer = window.setTimeout(() => {
      pointerMode.value = false
      pointerIndex.value = null
      idleTimer = undefined
    }, timing.idle)
  }

  function updatePointer(position: PointerPosition) {
    const root = element.value
    if (!root) return
    const bounds = root.getBoundingClientRect()
    pointerNear.value = position.x >= bounds.left - timing.proximity && position.x <= bounds.right + timing.proximity
      && position.y >= bounds.top - timing.proximity && position.y <= bounds.bottom + timing.proximity
    const target = position.target instanceof Element ? position.target.closest<HTMLElement>('[data-keyword-index]') : null
    const index = target && root.contains(target) ? Number(target.dataset.keywordIndex) : NaN
    pointerIndex.value = Number.isInteger(index) && index >= 0 && index < toValue(keywordCount) ? index : null
    if (pointerNear.value) {
      pointerMode.value = true
    }
    scheduleIdle()
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' || toValue(options.suspended) || !visible.value) return
    pointerMode.value = true
    // Fresh mouse activity takes priority over an earlier keyboard selection.
    focusedIndex.value = null
    clearIdleTimer()
    lastPointer = { x: event.clientX, y: event.clientY, target: event.target }
    // Read geometry once per frame, even when a mouse sends high-frequency events.
    if (pointerFrame === undefined) pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = undefined
      if (lastPointer) updatePointer(lastPointer)
    })
  }

  function releasePointer() {
    if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame)
    pointerFrame = undefined
    lastPointer = undefined
    pointerIndex.value = null
    pointerNear.value = false
    if (pointerMode.value) scheduleIdle()
  }

  function onResize() {
    readSettings()
    if (lastPointer) updatePointer(lastPointer)
  }

  function onVisibilityChange() {
    visible.value = !document.hidden
    releasePointer()
    if (!visible.value) clearIdleTimer()
    else if (pointerMode.value) scheduleIdle()
  }

  function focusKeyword(index: number, event: FocusEvent) {
    // A mouse click also focuses tabindex elements; it must not pin a hover
    // stroke after the pointer leaves. Reserve persistent focus for keyboard use.
    focusedIndex.value = event.target instanceof Element && event.target.matches(':focus-visible') ? index : null
  }
  function blurKeyword() { focusedIndex.value = null }

  onMounted(() => {
    readSettings()
    mounted.value = true
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', releasePointer)
    document.documentElement.addEventListener('pointerleave', releasePointer)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    clearAutomaticTimer()
    clearIdleTimer()
    if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerMove)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('blur', releasePointer)
    document.documentElement.removeEventListener('pointerleave', releasePointer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { activeIndex, mode, focusKeyword, blurKeyword }
}
