<script setup lang="ts">
import { ref } from 'vue'
import ExhibitStage from './components/ExhibitStage.vue'
import ExhibitMenu from './components/ExhibitMenu.vue'
import { useExhibitController } from './composables/useExhibitController'

const {
  allExhibits, currentExhibit, currentPosition, availableZones, filteredExhibits,
  selectedZoneId, searchQuery, isMenuOpen, isFullscreen, fullscreenSupported,
  fullscreenError, isMotionEnabled, autoplay, intervalSeconds, canNavigate,
  playbackStatus, selectUnit, setIntervalSeconds, previous, next,
  toggleAutoplay, toggleFullscreen,
} = useExhibitController()

const isAmbientPaused = ref(false)
const isHighlightPaused = ref(false)
</script>

<template>
  <div class="app-shell" :class="{
    'is-menu-open': isMenuOpen,
    'is-fullscreen': isFullscreen,
    'is-motion-enabled': isMotionEnabled,
  }">
    <ExhibitStage
      :exhibit="currentExhibit"
      :position="currentPosition"
      :total="allExhibits.length"
      :autoplay="autoplay"
      :playback-status="playbackStatus"
      :motion-enabled="isMotionEnabled"
      :ambient-paused="isAmbientPaused"
      :highlight-paused="isHighlightPaused"
      :highlight-suspended="isMenuOpen"
    />
    <button
      class="menu-toggle"
      type="button"
      :aria-label="isMenuOpen ? '關閉展示單位選單' : '開啟展示單位選單'"
      :aria-expanded="isMenuOpen"
      aria-haspopup="dialog"
      aria-controls="exhibit-menu"
      aria-keyshortcuts="M"
      @click="isMenuOpen = !isMenuOpen"
    >
      展示單位選單 <kbd>M</kbd>
    </button>
    <ExhibitMenu
      :open="isMenuOpen"
      :zones="availableZones"
      :units="filteredExhibits"
      :total="allExhibits.length"
      :selected-zone-id="selectedZoneId"
      :search-query="searchQuery"
      :active-unit-id="currentExhibit?.id ?? null"
      :can-navigate="canNavigate"
      :autoplay="autoplay"
      :interval-seconds="intervalSeconds"
      :playback-status="playbackStatus"
      :is-fullscreen="isFullscreen"
      :fullscreen-supported="fullscreenSupported"
      :fullscreen-error="fullscreenError"
      :ambient-paused="isAmbientPaused"
      :motion-enabled="isMotionEnabled"
      :highlight-paused="isHighlightPaused"
      @close="isMenuOpen = false"
      @select-zone="selectedZoneId = $event"
      @select-unit="selectUnit"
      @search="searchQuery = $event"
      @previous="previous"
      @next="next"
      @toggle-autoplay="toggleAutoplay"
      @toggle-fullscreen="toggleFullscreen"
      @set-interval="setIntervalSeconds"
      @toggle-ambient="isAmbientPaused = !isAmbientPaused"
      @toggle-highlight="isHighlightPaused = !isHighlightPaused"
    />
  </div>
</template>
