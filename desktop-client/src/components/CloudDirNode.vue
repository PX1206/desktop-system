<template>
  <li class="dir-node">
    <div
      class="dir-node-title"
      :class="{ selected: isSelected }"
      :style="{ paddingLeft: paddingLeft }"
      @click="$emit('select', node)"
    >
      <span class="expand" @click.stop="expanded = !expanded">
        {{ node.children?.length ? (expanded ? '▼' : '▶') : '•' }}
      </span>
      <div class="label-wrap">
        <span class="label">{{ displayLabel }}</span>
        <span v-if="node.lastSyncTime" class="time-info">同步 {{ node.lastSyncTime }}</span>
      </div>
    </div>
    <ul v-show="expanded && node.children?.length" class="dir-children">
      <CloudDirNode
        v-for="c in node.children"
        :key="`${c.syncDirectoryId}-${c.relativePath}`"
        :node="c"
        :selected-node="selectedNode"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DirectoryTreeNode } from '../sync'

defineOptions({ name: 'CloudDirNode' })

const props = defineProps<{
  node: DirectoryTreeNode
  selectedNode: { syncDirectoryId: number; relativePath: string } | null
}>()
defineEmits<{ (e: 'select', node: DirectoryTreeNode): void }>()

const expanded = ref(true)
const displayLabel = computed(() => {
  const n = props.node
  if (n.displayName && n.displayName.trim()) return n.displayName.trim()
  if (n.relativePath) {
    const parts = n.relativePath.split('/').filter(Boolean)
    return parts[parts.length - 1] || '根目录'
  }
  return '未命名'
})
const isSelected = computed(
  () =>
    props.selectedNode &&
    props.selectedNode.syncDirectoryId === props.node.syncDirectoryId &&
    props.selectedNode.relativePath === (props.node.relativePath || '')
)
const paddingLeft = computed(() =>
  `${(props.node.relativePath ? props.node.relativePath.split('/').filter(Boolean).length : 0) * 10 + 8}px`
)
</script>

<style scoped>
.dir-node {
  margin: 0;
}
.dir-node-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 0.85rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.dir-node-title:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
}
.dir-node-title.selected {
  background: rgba(233, 69, 96, 0.2);
  color: #fca5a5;
}
.expand {
  font-size: 0.65rem;
  min-width: 1em;
  flex-shrink: 0;
}
.label-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time-info {
  display: block;
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 2px;
}
.dir-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
