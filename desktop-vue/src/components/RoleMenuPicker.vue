<template>
  <div class="role-menu-picker">
    <div v-for="n in tree" :key="n.id" class="node">
      <label class="row" :style="{ paddingLeft: depth * 12 + 'px' }">
        <input
          type="checkbox"
          :checked="modelValue.includes(n.id)"
          @change="toggle(n.id, ($event.target as HTMLInputElement).checked)"
        />
        <span class="t">{{ n.title }}</span>
        <span class="meta">{{ n.type }}</span>
        <span class="path">{{ n.path || '' }}</span>
      </label>
      <RoleMenuPicker
        v-if="n.children?.length"
        :tree="n.children"
        :model-value="modelValue"
        :depth="depth + 1"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import RoleMenuPicker from './RoleMenuPicker.vue'
import type { MenuVO } from '../api/menu'

const props = withDefaults(
  defineProps<{
    tree: MenuVO[]
    modelValue: number[]
    depth?: number
  }>(),
  { depth: 0 }
)

const emit = defineEmits<{
  'update:modelValue': [number[]]
}>()

function toggle(id: number, checked: boolean) {
  const set = new Set(props.modelValue)
  if (checked) set.add(id)
  else set.delete(id)
  emit('update:modelValue', [...set])
}
</script>

<style scoped>
.role-menu-picker {
  font-size: 0.9rem;
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.row input {
  flex-shrink: 0;
}
.t {
  font-weight: 500;
}
.meta {
  font-size: 0.8rem;
  color: #64748b;
}
.path {
  font-size: 0.8rem;
  color: #38bdf8;
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
.node {
  margin-bottom: 2px;
}
</style>
