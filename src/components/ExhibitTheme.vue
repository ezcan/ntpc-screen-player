<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeHighlighter } from '../composables/useThemeHighlighter'
import { splitThemeHighlights } from '../utils/themeSegments'

const props = defineProps<{
  text: string
  terms: readonly string[]
  motionEnabled: boolean
  paused: boolean
  suspended: boolean
}>()

const element = ref<HTMLElement | null>(null)
const segments = computed(() => splitThemeHighlights(props.text, props.terms))
const keywordCount = computed(() => segments.value.filter((segment) => segment.kind === 'keyword').length)
const { activeIndex, mode, focusKeyword, blurKeyword } = useThemeHighlighter(element, keywordCount, {
  motionEnabled: () => props.motionEnabled,
  paused: () => props.paused,
  suspended: () => props.suspended,
})
</script>

<template>
  <p ref="element" class="exhibit-theme" :data-highlight-mode="mode">
    <template v-for="(segment, index) in segments" :key="index"><mark
      v-if="segment.kind === 'keyword'"
      class="theme-keyword"
      :class="{ 'is-highlighted': activeIndex === segment.index }"
      :data-keyword-index="segment.index"
      tabindex="0"
      @focus="focusKeyword(segment.index)"
      @blur="blurKeyword"
    >{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template>
  </p>
</template>
