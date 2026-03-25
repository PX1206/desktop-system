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
        <div
          v-if="node.createTime || node.lastSyncTime"
          class="time-carousel"
          :class="{ 'time-carousel--spin': hasBothTimes }"
        >
          <div class="time-carousel-inner">
            <div v-if="node.createTime" class="time-line time-line--create">创建: {{ node.createTime }}</div>
            <div v-if="node.lastSyncTime" class="time-line time-line--sync">同步: {{ node.lastSyncTime }}</div>
          </div>
        </div>
      </div>
      <span v-if="showOwner && node.ownerName" class="owner">{{ node.ownerName }}</span>
    </div>
    <ul v-show="expanded && node.children?.length" class="dir-children">
      <DirNode
        v-for="c in node.children"
        :key="c.syncDirectoryId + '-' + c.relativePath"
        :node="c"
        :selected-node="selectedNode"
        :show-owner="showOwner"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DirectoryTreeNode } from '../api/file'

defineOptions({ name: 'DirNode' })

const props = defineProps<{
  node: DirectoryTreeNode
  selectedNode: { syncDirectoryId: number; relativePath: string } | null
  showOwner: boolean
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
const isSelected = computed(() =>
  props.selectedNode &&
  props.selectedNode.syncDirectoryId === props.node.syncDirectoryId &&
  props.selectedNode.relativePath === (props.node.relativePath || '')
)
const paddingLeft = computed(() =>
  `${(props.node.relativePath ? props.node.relativePath.split('/').length : 0) * 12 + 16}px`
)
const hasBothTimes = computed(
  () => Boolean(props.node.createTime?.trim()) && Boolean(props.node.lastSyncTime?.trim())
)
</script>

<style scoped>
.dir-node { margin: 0; }
.dir-node-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  color: #94a3b8;
  transition: background 0.2s;
}
.dir-node-title:hover { background: rgba(255,255,255,0.05); color: #fff; }
.dir-node-title.selected { background: rgba(56,189,248,0.15); color: #38bdf8; }
.dir-node-title .expand { font-size: 0.75rem; min-width: 1em; flex-shrink: 0; }
.dir-node-title .label-wrap { flex: 1; min-width: 0; overflow: hidden; }
.dir-node-title .label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 固定单行高度：双时间用透明度切换叠放，避免滚动时两行各露一半 */
.time-carousel {
  --time-line-h: 1.35em;
  height: var(--time-line-h);
  margin-top: 2px;
  overflow: hidden;
}
.time-carousel-inner {
  min-height: var(--time-line-h);
}
.time-line {
  height: var(--time-line-h);
  line-height: var(--time-line-h);
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.time-carousel--spin .time-carousel-inner {
  position: relative;
  height: var(--time-line-h);
}
.time-carousel--spin .time-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  margin: 0;
}
.time-carousel--spin .time-line--create {
  animation: dir-time-fade-create 6s linear infinite;
}
.time-carousel--spin .time-line--sync {
  animation: dir-time-fade-sync 6s linear infinite;
}
.time-carousel--spin:hover .time-line--create,
.time-carousel--spin:hover .time-line--sync {
  animation-play-state: paused;
}
/* 相邻关键帧时间差极小，切换近似「硬切」，任意时刻只完整显示一行 */
@keyframes dir-time-fade-create {
  0%, 49.9% { opacity: 1; }
  50%, 99.9% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes dir-time-fade-sync {
  0%, 49.9% { opacity: 0; }
  50%, 99.9% { opacity: 1; }
  100% { opacity: 0; }
}
.dir-node-title .owner { font-size: 0.8rem; color: #64748b; flex-shrink: 0; }
.dir-children { list-style: none; margin: 0; padding: 0; }
</style>
