<script setup lang="ts">
import { ref, watch } from 'vue'
import { MAX_INTERVAL, MIN_INTERVAL } from '../composables/useExhibitController'

const props = defineProps<{
  canNavigate: boolean
  hasExhibits: boolean
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
  previous: []
  next: []
  toggleAutoplay: []
  toggleFullscreen: []
  setInterval: [seconds: number]
  toggleAmbient: []
  toggleHighlight: []
}>()

const intervalDraft = ref(String(props.intervalSeconds))
const intervalError = ref('')
watch(() => props.intervalSeconds, (value) => {
  intervalDraft.value = String(value)
  intervalError.value = ''
})

function commitInterval() {
  const value = Number(intervalDraft.value)
  if (!/^\d+$/.test(intervalDraft.value) || !Number.isInteger(value) || value < MIN_INTERVAL || value > MAX_INTERVAL) {
    intervalError.value = `請輸入 ${MIN_INTERVAL}～${MAX_INTERVAL} 的整數秒數，目前維持 ${props.intervalSeconds} 秒。`
    return
  }
  intervalError.value = ''
  emit('setInterval', value)
}
</script>

<template>
  <section class="projection-controls" aria-labelledby="controls-title">
    <h3 id="controls-title">投影控制</h3>
    <div class="navigation-controls">
      <button type="button" aria-label="切換到上一個展示單位" aria-keyshortcuts="ArrowLeft" :disabled="!canNavigate" @click="emit('previous')">
        ← 上一個展示單位
      </button>
      <button type="button" aria-label="切換到下一個展示單位" aria-keyshortcuts="ArrowRight" :disabled="!canNavigate" @click="emit('next')">
        下一個展示單位 →
      </button>
    </div>
    <div class="playback-controls">
      <button type="button" :aria-label="autoplay ? '關閉自動輪播' : '開啟自動輪播'" :aria-pressed="autoplay" aria-keyshortcuts="Space" :disabled="!hasExhibits" @click="emit('toggleAutoplay')">
        {{ autoplay ? '關閉自動輪播' : '開啟自動輪播' }}
      </button>
      <label class="interval-field" for="interval-seconds">
        輪播秒數
        <input
          id="interval-seconds"
          v-model="intervalDraft"
          type="number"
          inputmode="numeric"
          :min="MIN_INTERVAL"
          :max="MAX_INTERVAL"
          step="1"
          :aria-invalid="Boolean(intervalError)"
          :aria-describedby="intervalError ? 'interval-hint interval-error' : 'interval-hint'"
          @change="commitInterval"
        />
      </label>
    </div>
    <p id="interval-hint" class="control-hint">{{ MIN_INTERVAL }}～{{ MAX_INTERVAL }} 秒；選單開啟時暫停輪播，關閉後繼續。</p>
    <p v-if="intervalError" id="interval-error" class="field-error" role="alert">{{ intervalError }}</p>
    <p class="playback-status" role="status">{{ playbackStatus }}</p>
    <div class="display-controls">
      <button
        type="button"
        class="fullscreen-button"
        :aria-label="isFullscreen ? '離開全螢幕' : '進入全螢幕'"
        :aria-pressed="isFullscreen"
        aria-keyshortcuts="F"
        :disabled="!fullscreenSupported"
        @click="emit('toggleFullscreen')"
      >
        {{ isFullscreen ? '離開全螢幕' : '進入全螢幕' }}
      </button>
      <button
        type="button"
        :aria-label="!motionEnabled ? '系統已停用背景光點動畫' : ambientPaused ? '播放背景光點動畫' : '暫停背景光點動畫'"
        :aria-pressed="motionEnabled && !ambientPaused"
        :disabled="!motionEnabled"
        @click="emit('toggleAmbient')"
      >
        {{ !motionEnabled ? '背景動畫已停用' : ambientPaused ? '播放背景光點' : '暫停背景光點' }}
      </button>
      <button
        type="button"
        :aria-label="!motionEnabled ? '系統已停用主題自動劃記' : highlightPaused ? '播放主題自動劃記' : '暫停主題自動劃記'"
        :aria-pressed="motionEnabled && !highlightPaused"
        :disabled="!motionEnabled || !hasExhibits"
        @click="emit('toggleHighlight')"
      >
        {{ !motionEnabled ? '主題動畫已停用' : highlightPaused ? '播放主題劃記' : '暫停主題劃記' }}
      </button>
    </div>
    <p v-if="!motionEnabled" class="control-hint">依系統的減少動態效果偏好，背景維持靜態，主題停止自動劃記。</p>
    <p v-if="!fullscreenSupported" class="control-hint">此瀏覽器不支援全螢幕 API，請使用瀏覽器的全螢幕功能。</p>
    <p v-if="fullscreenError" class="field-error" role="alert">{{ fullscreenError }}</p>
  </section>
</template>
