<script setup lang="ts">
import { getZoneName } from '../data/zones'
import type { Exhibit } from '../types/exhibit'
import AmbientBokeh from './AmbientBokeh.vue'
import ExhibitTheme from './ExhibitTheme.vue'
import { themeHighlights } from '../data/themeHighlights'

withDefaults(defineProps<{
  exhibit: Exhibit | null
  position: number
  total: number
  autoplay: boolean
  playbackStatus: string
  motionEnabled: boolean
  ambientPaused: boolean
  highlightPaused: boolean
  highlightSuspended: boolean
  transitionName?: string
}>(), { transitionName: 'exhibit' })
</script>

<template>
  <main class="projection-stage" aria-label="展示單位投影舞台">
    <AmbientBokeh :paused="ambientPaused" />

    <header class="stage-header">
      <p class="exhibition-title">2026 臺灣教育科技展｜新北展區</p>
      <p class="exhibition-slogan">新北教育｜玩出 AI 好點子</p>
    </header>

    <div class="stage-content" :aria-live="autoplay ? 'off' : 'polite'" aria-atomic="true">
      <!-- Fixed bounds preserve geometry; out-in avoids overlapping two unit titles. -->
      <Transition :name="transitionName" :css="motionEnabled" mode="out-in">
        <article v-if="exhibit" :key="exhibit.id" class="exhibit-frame" :data-unit="exhibit.id">
          <p class="exhibit-meta">
            <span>{{ getZoneName(exhibit.zoneId) }}</span>
            <template v-if="exhibit.subcategory">
              <span class="meta-separator" aria-hidden="true">／</span>
              <span>{{ exhibit.subcategory }}</span>
            </template>
          </p>
          <h1 class="exhibit-unit-name">{{ exhibit.unitName }}</h1>
          <ExhibitTheme
            :text="exhibit.theme"
            :terms="exhibit.highlightTerms ?? themeHighlights[exhibit.id] ?? []"
            :motion-enabled="motionEnabled"
            :paused="highlightPaused"
            :suspended="highlightSuspended"
          />
        </article>
        <article v-else key="empty" class="exhibit-frame empty-stage">
          <h1 class="exhibit-unit-name">目前沒有展示單位</h1>
          <p class="exhibit-theme">加入展示單位資料後，即可開始投影。</p>
        </article>
      </Transition>
    </div>

    <footer class="stage-footer">
      <p class="stage-position" aria-label="展示單位進度">{{ position }} / {{ total }}</p>
      <p v-if="autoplay" class="stage-playback-status">{{ playbackStatus }}</p>
    </footer>
  </main>
</template>
