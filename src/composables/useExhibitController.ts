import { computed, onMounted, onUnmounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { exhibits } from '../data/exhibits'
import { isZoneId, zones } from '../data/zones'
import type { Exhibit, ExhibitInput, ZoneFilter, ZoneWithCount } from '../types/exhibit'

export const DEFAULT_INTERVAL = 15
export const MIN_INTERVAL = 1
export const MAX_INTERVAL = 3600

function parseInterval(value: string | null): number {
  const seconds = value && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(seconds) && seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL
    ? seconds
    : DEFAULT_INTERVAL
}

function isEditing(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"]',
  ) !== null
}

export function useExhibitController(
  source: MaybeRefOrGetter<readonly ExhibitInput[]> = exhibits,
) {
  const allExhibits = computed<Exhibit[]>(() => toValue(source)
    .map((exhibit) => ({ ...exhibit, zoneId: isZoneId(exhibit.zoneId) ? exhibit.zoneId : 'unassigned' as const }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))

  const params = new URLSearchParams(window.location.search)
  const activeUnitId = ref(params.get('unit') ?? '')
  const autoplay = ref(params.get('autoplay') === 'true')
  const intervalSeconds = ref(parseInterval(params.get('interval')))
  const selectedZoneId = ref<ZoneFilter>('all')
  const searchQuery = ref('')
  const isMenuOpen = ref(false)
  const isFullscreen = ref(false)
  const fullscreenSupported = ref(false)
  const fullscreenError = ref('')
  const isMotionEnabled = ref(true)
  const isPageVisible = ref(!document.hidden)
  let timer: number | undefined
  let motionQuery: MediaQueryList | undefined

  watch(allExhibits, (items) => {
    if (!items.some((item) => item.id === activeUnitId.value)) {
      activeUnitId.value = items[0]?.id ?? ''
    }
    if (items.length === 0) autoplay.value = false
  }, { immediate: true })

  const currentExhibit = computed(() => allExhibits.value.find((item) => item.id === activeUnitId.value) ?? null)
  const currentPosition = computed(() => allExhibits.value.findIndex((item) => item.id === activeUnitId.value) + 1)
  const availableZones = computed<ZoneWithCount[]>(() => zones
    .map((zone) => ({ ...zone, count: allExhibits.value.filter((item) => item.zoneId === zone.id).length }))
    .filter((zone) => zone.alwaysVisible || zone.count > 0))

  const filteredExhibits = computed(() => {
    const keyword = searchQuery.value.trim().toLocaleLowerCase()
    return allExhibits.value.filter((item) =>
      (selectedZoneId.value === 'all' || item.zoneId === selectedZoneId.value)
      && (!keyword || `${item.unitName}\n${item.theme}`.toLocaleLowerCase().includes(keyword)),
    )
  })

  const canNavigate = computed(() => filteredExhibits.value.length > 1
    || (filteredExhibits.value.length === 1 && filteredExhibits.value[0]?.id !== activeUnitId.value))
  const isAutoplayRunning = computed(() => autoplay.value && canNavigate.value && !isMenuOpen.value && isPageVisible.value)
  const playbackStatus = computed(() => {
    if (!autoplay.value) return '自動輪播已關閉'
    if (isMenuOpen.value) return '選單開啟，輪播暫停'
    if (!canNavigate.value) return '目前篩選無可切換的展示單位，輪播暫停'
    if (!isPageVisible.value) return '分頁隱藏，輪播暫停'
    return `自動輪播中，每 ${intervalSeconds.value} 秒切換`
  })

  function syncUrl() {
    const url = new URL(window.location.href)
    if (currentExhibit.value) url.searchParams.set('unit', currentExhibit.value.id)
    else url.searchParams.delete('unit')
    url.searchParams.set('autoplay', String(autoplay.value))
    url.searchParams.set('interval', String(intervalSeconds.value))
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }

  watch([activeUnitId, autoplay, intervalSeconds], syncUrl, { flush: 'post' })

  function selectUnit(id: string) {
    if (!allExhibits.value.some((item) => item.id === id)) return
    activeUnitId.value = id
    isMenuOpen.value = false
  }

  function move(direction: -1 | 1) {
    const items = filteredExhibits.value
    if (items.length === 0) return
    const index = items.findIndex((item) => item.id === activeUnitId.value)
    // If the stage is outside this filter, enter at its first/last item.
    const nextIndex = index < 0
      ? (direction === 1 ? 0 : items.length - 1)
      : (index + direction + items.length) % items.length
    const nextItem = items[nextIndex]
    if (nextItem) selectUnit(nextItem.id)
  }

  function setIntervalSeconds(seconds: number) {
    if (Number.isInteger(seconds) && seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL) {
      intervalSeconds.value = seconds
    }
  }

  function toggleAutoplay() {
    if (allExhibits.value.length > 0) autoplay.value = !autoplay.value
  }

  function clearTimer() {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
  }

  // Every manual change gets a full interval. No catch-up bursts after a hidden tab.
  watch([isAutoplayRunning, intervalSeconds, activeUnitId, filteredExhibits], () => {
    clearTimer()
    if (isAutoplayRunning.value) timer = window.setTimeout(() => move(1), intervalSeconds.value * 1000)
  }, { immediate: true, flush: 'post' })

  function updateFullscreen() {
    isFullscreen.value = document.fullscreenElement !== null
  }

  async function toggleFullscreen() {
    fullscreenError.value = ''
    if (!fullscreenSupported.value) {
      fullscreenError.value = '此瀏覽器不支援全螢幕 API，請使用瀏覽器的全螢幕功能。'
      return
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
      updateFullscreen()
    } catch {
      fullscreenError.value = '無法切換全螢幕，請直接點擊全螢幕按鈕重試，或使用瀏覽器的全螢幕功能。'
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || isEditing(event.target)) return
    switch (event.key.toLowerCase()) {
      case 'arrowleft': event.preventDefault(); move(-1); break
      case 'arrowright': event.preventDefault(); move(1); break
      case 'm': event.preventDefault(); isMenuOpen.value = !isMenuOpen.value; break
      case 'f': event.preventDefault(); void toggleFullscreen(); break
      case ' ':
        event.preventDefault(); toggleAutoplay(); break
      case 'escape': isMenuOpen.value = false; break
    }
  }

  function onPopstate() {
    const query = new URLSearchParams(window.location.search)
    activeUnitId.value = allExhibits.value.find((item) => item.id === query.get('unit'))?.id ?? allExhibits.value[0]?.id ?? ''
    autoplay.value = allExhibits.value.length > 0 && query.get('autoplay') === 'true'
    intervalSeconds.value = parseInterval(query.get('interval'))
    selectedZoneId.value = 'all'
    searchQuery.value = ''
    syncUrl()
  }

  function updateMotion(event: MediaQueryListEvent | MediaQueryList) {
    isMotionEnabled.value = !event.matches
  }

  function updateVisibility() { isPageVisible.value = !document.hidden }

  onMounted(() => {
    fullscreenSupported.value = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen)
    updateFullscreen()
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    updateMotion(motionQuery)
    motionQuery.addEventListener('change', updateMotion)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('popstate', onPopstate)
    document.addEventListener('fullscreenchange', updateFullscreen)
    document.addEventListener('visibilitychange', updateVisibility)
    syncUrl()
  })

  onUnmounted(() => {
    clearTimer()
    motionQuery?.removeEventListener('change', updateMotion)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('popstate', onPopstate)
    document.removeEventListener('fullscreenchange', updateFullscreen)
    document.removeEventListener('visibilitychange', updateVisibility)
  })

  return {
    allExhibits, currentExhibit, currentPosition, availableZones, filteredExhibits,
    selectedZoneId, searchQuery, isMenuOpen, isFullscreen, fullscreenSupported,
    fullscreenError, isMotionEnabled, autoplay, intervalSeconds, canNavigate,
    isAutoplayRunning, playbackStatus, selectUnit, setIntervalSeconds,
    previous: () => move(-1), next: () => move(1), toggleAutoplay, toggleFullscreen,
  }
}
