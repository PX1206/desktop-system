<template>
  <div class="birthday-picker">
    <input ref="inputRef" type="text" class="birthday-input" readonly placeholder="点击选择生日" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import flatpickr from 'flatpickr'
import { Mandarin } from 'flatpickr/dist/l10n/zh'
import type { Instance } from 'flatpickr/dist/types/instance'
import 'flatpickr/dist/flatpickr.min.css'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const inputRef = ref<HTMLInputElement | null>(null)
let fp: Instance | null = null

function bindPicker() {
  if (!inputRef.value || fp) return
  fp = flatpickr(inputRef.value, {
    locale: Mandarin,
    dateFormat: 'Y-m-d',
    maxDate: new Date(),
    defaultDate: props.modelValue || undefined,
    allowInput: false,
    clickOpens: true,
    disableMobile: true,
    onChange: (_dates, dateStr) => emit('update:modelValue', dateStr)
  })
}

function syncFromModel() {
  if (!fp) return
  if (!props.modelValue) fp.clear()
  else fp.setDate(props.modelValue, false)
}

watch(() => props.modelValue, syncFromModel)

onMounted(async () => {
  await nextTick()
  bindPicker()
})

onBeforeUnmount(() => {
  fp?.destroy()
  fp = null
})
</script>

<style scoped>
.birthday-picker {
  width: 100%;
}
.birthday-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.9rem;
  cursor: pointer;
}
.birthday-input:hover {
  border-color: #475569;
}
</style>

<style>
/* flatpickr 挂在 body 上，需全局样式；与个人信息弹窗深色主题、层级对齐 */
.flatpickr-calendar {
  z-index: 11000 !important;
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35) !important;
  color: #e2e8f0 !important;
}
.flatpickr-months .flatpickr-month {
  background: #1e293b !important;
  color: #e2e8f0 !important;
  fill: #e2e8f0 !important;
}
.flatpickr-current-month .flatpickr-monthDropdown-months,
.flatpickr-current-month .numInputWrapper input {
  background: #0f172a !important;
  color: #e2e8f0 !important;
  border: 1px solid #334155 !important;
  border-radius: 4px;
}
.flatpickr-weekdays {
  background: #1e293b !important;
}
span.flatpickr-weekday {
  color: #94a3b8 !important;
}
.flatpickr-day {
  color: #e2e8f0 !important;
  border-color: transparent !important;
}
.flatpickr-day:hover,
.flatpickr-day:focus {
  background: #334155 !important;
  border-color: #334155 !important;
}
.flatpickr-day.selected,
.flatpickr-day.startRange,
.flatpickr-day.endRange {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
}
.flatpickr-day.today {
  border-color: #38bdf8 !important;
}
.flatpickr-day.flatpickr-disabled,
.flatpickr-day.prevMonthDay,
.flatpickr-day.nextMonthDay {
  color: #64748b !important;
}
.flatpickr-prev-month,
.flatpickr-next-month {
  fill: #e2e8f0 !important;
}
.flatpickr-prev-month:hover svg,
.flatpickr-next-month:hover svg {
  fill: #38bdf8 !important;
}
</style>
