<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { Exhibit, ZoneFilter, ZoneWithCount } from '../types/exhibit'
import ProjectionControls from './ProjectionControls.vue'

const props = defineProps<{
  open: boolean
  zones: readonly ZoneWithCount[]
  units: readonly Exhibit[]
  total: number
  selectedZoneId: ZoneFilter
  searchQuery: string
  activeUnitId: string | null
  canNavigate: boolean
  autoplay: boolean
  intervalSeconds: number
  playbackStatus: string
  isFullscreen: boolean
  fullscreenSupported: boolean
  fullscreenError: string
  ambientPaused: boolean
  motionEnabled: boolean
  highlightPaused: boolean
}>()

const emit = defineEmits<{
  close: []
  selectZone: [id: ZoneFilter]
  selectUnit: [id: string]
  search: [query: string]
  previous: []
  next: []
  toggleAutoplay: []
  toggleFullscreen: []
  setInterval: [seconds: number]
  toggleAmbient: []
  toggleHighlight: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
watch(() => props.open, (open) => {
  if (open && !dialog.value?.open) dialog.value?.showModal()
  else if (!open && dialog.value?.open) dialog.value.close()
}, { flush: 'post', immediate: true })

onUnmounted(() => { dialog.value?.close() })

function onSearch(event: Event) {
  if (event.target instanceof HTMLInputElement) emit('search', event.target.value)
}

function onBackdropClick(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) emit('close')
}
</script>

<template>
  <!-- Native dialog provides focus trapping, inert background and focus restoration. -->
  <dialog
    id="exhibit-menu"
    ref="dialog"
    class="control-panel"
    aria-labelledby="menu-title"
    aria-describedby="menu-help"
    @cancel.prevent="emit('close')"
    @keydown.esc.prevent.stop="emit('close')"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <header class="panel-header">
      <h2 id="menu-title">展示單位選單</h2>
      <button type="button" aria-label="關閉選單" autofocus @click="emit('close')">關閉 ×</button>
    </header>
    <p id="menu-help" class="control-hint">選擇展區後，點選展示單位開始投影。</p>

    <ProjectionControls
      :can-navigate="canNavigate"
      :has-exhibits="total > 0"
      :autoplay="autoplay"
      :interval-seconds="intervalSeconds"
      :playback-status="playbackStatus"
      :is-fullscreen="isFullscreen"
      :fullscreen-supported="fullscreenSupported"
      :fullscreen-error="fullscreenError"
      :ambient-paused="ambientPaused"
      :motion-enabled="motionEnabled"
      :highlight-paused="highlightPaused"
      @previous="emit('previous')"
      @next="emit('next')"
      @toggle-autoplay="emit('toggleAutoplay')"
      @toggle-fullscreen="emit('toggleFullscreen')"
      @set-interval="emit('setInterval', $event)"
      @toggle-ambient="emit('toggleAmbient')"
      @toggle-highlight="emit('toggleHighlight')"
    />

    <section class="zone-section" aria-labelledby="zones-title">
      <h3 id="zones-title">1. 選擇展區</h3>
      <div class="zone-menu" role="group" aria-labelledby="zones-title">
        <button type="button" aria-label="顯示全部展區的展示單位" :aria-pressed="selectedZoneId === 'all'" @click="emit('selectZone', 'all')">
          <span>全部展區</span><span>{{ total }}</span>
        </button>
        <button
          v-for="zone in zones"
          :key="zone.id"
          type="button"
          :aria-label="`顯示${zone.name}的展示單位，共 ${zone.count} 個`"
          :aria-pressed="selectedZoneId === zone.id"
          @click="emit('selectZone', zone.id)"
        >
          <span>{{ zone.name }}</span><span>{{ zone.count }}</span>
        </button>
      </div>
    </section>

    <section class="unit-section" aria-labelledby="units-title">
      <h3 id="units-title">2. 選擇展示單位</h3>
      <label class="search-label" for="unit-search">搜尋展示單位名稱或主題</label>
      <div class="search-field">
        <input id="unit-search" type="search" :value="searchQuery" placeholder="輸入名稱或主題關鍵字" autocomplete="off" @input="onSearch" />
        <button v-if="searchQuery" type="button" aria-label="清除搜尋文字" @click="emit('search', '')">清除</button>
      </div>
      <p class="result-count" role="status">{{ units.length }} 個展示單位</p>

      <p v-if="total === 0" class="menu-empty-state">目前沒有展示單位資料。</p>
      <p v-else-if="units.length === 0" class="menu-empty-state">
        {{ searchQuery.trim() ? '找不到符合的展示單位，請調整關鍵字或選擇其他展區。' : '此展區尚無展示單位，請選擇其他展區。' }}
      </p>
      <ul v-else class="unit-menu" aria-labelledby="units-title">
        <li v-for="unit in units" :key="unit.id">
          <button
            type="button"
            :aria-label="`投影${unit.unitName}：${unit.theme}`"
            :aria-current="activeUnitId === unit.id ? 'true' : undefined"
            @click="emit('selectUnit', unit.id)"
          >
            <span class="unit-menu-heading">
              <span class="unit-menu-name">{{ unit.unitName }}</span>
              <span v-if="activeUnitId === unit.id" class="current-unit-label">投影中</span>
            </span>
            <span class="unit-menu-theme">{{ unit.theme }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="keyboard-help" aria-labelledby="keyboard-title">
      <h3 id="keyboard-title">鍵盤操作</h3>
      <dl>
        <div><dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>切換展示單位</dd></div>
        <div><dt><kbd>M</kbd></dt><dd>顯示／隱藏選單</dd></div>
        <div><dt><kbd>F</kbd></dt><dd>切換全螢幕</dd></div>
        <div><dt><kbd>Space</kbd></dt><dd>開啟／關閉自動輪播</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>關閉選單</dd></div>
      </dl>
      <p class="control-hint">輸入文字或秒數時不觸發快捷鍵；Esc 仍可關閉選單。</p>
    </section>
  </dialog>
</template>
