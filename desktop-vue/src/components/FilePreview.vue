<template>
  <div v-if="kind !== 'none'" class="preview-inline">
    <template v-if="kind === 'image'">
      <div class="thumb-wrap">
        <img v-if="!thumbFailed" :src="url" class="thumb" :alt="file.name" loading="lazy" @error="thumbFailed = true" />
        <span v-else class="thumb-fallback" title="缩略图加载失败">图</span>
      </div>
      <button type="button" class="btn-preview" @click="openModal">预览</button>
    </template>
    <template v-else-if="kind === 'text'">
      <button type="button" class="btn-preview" @click="openModal">文本预览</button>
    </template>
    <template v-else>
      <button type="button" class="btn-preview" @click="openModal">预览</button>
    </template>
  </div>

  <Teleport to="body">
    <div v-if="modalOpen" class="modal-mask" @click.self="closeModal">
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span class="modal-title">{{ file.name }}{{ displaySuffix }}</span>
          <button type="button" class="modal-close" aria-label="关闭" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <template v-if="kind === 'image'">
            <img
              v-if="!modalImgFailed"
              :src="url"
              class="modal-img"
              :alt="file.name"
              @error="modalImgFailed = true"
            />
            <p v-else class="modal-err">图片无法显示，请尝试下载后查看</p>
          </template>
          <video v-else-if="kind === 'video'" :src="url" controls playsinline class="modal-video" />
          <audio v-else-if="kind === 'audio'" :src="url" controls class="modal-audio" />
          <iframe v-else-if="kind === 'pdf'" :src="url" title="PDF" class="modal-iframe" />
          <iframe v-else-if="kind === 'html'" :src="url" title="HTML" sandbox="allow-same-origin" class="modal-iframe" />
          <template v-else-if="kind === 'text'">
            <p v-if="textLoading" class="modal-hint">加载中…</p>
            <p v-else-if="textError" class="modal-hint err">{{ textError }}</p>
            <pre v-else-if="textContent !== null" class="modal-text">{{ textContent }}</pre>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import request from '../api/request'
import type { FileItem } from '../api/file'

const props = defineProps<{
  file: FileItem
  url: string
}>()

const thumbFailed = ref(false)
const modalImgFailed = ref(false)
const modalOpen = ref(false)
const textContent = ref<string | null>(null)
const textLoading = ref(false)
const textError = ref('')

function extOf(f: FileItem): string {
  let s = (f.suffix || '').toLowerCase()
  if (s.startsWith('.')) s = s.slice(1)
  return s
}

const displaySuffix = computed(() => {
  const s = props.file.suffix
  return s && s.startsWith('.') ? s : s ? `.${s}` : ''
})

const IMAGE_EXT = new Set(['bmp', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'mkv', 'avi', 'wmv', 'm4v'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'wma', 'mid', 'midi'])

const kind = computed(() => {
  const ext = extOf(props.file)
  const t = props.file.type
  if (t === 1 || IMAGE_EXT.has(ext)) return 'image'
  if (t === 3 || VIDEO_EXT.has(ext)) return 'video'
  if (t === 4 || AUDIO_EXT.has(ext)) return 'audio'
  if (t === 2 && ext === 'pdf') return 'pdf'
  if (t === 2 && ['txt', 'json', 'md', 'csv', 'log', 'xml', 'yml', 'yaml', 'ini', 'properties', 'env'].includes(ext)) {
    return 'text'
  }
  if (t === 2 && ['html', 'htm'].includes(ext)) return 'html'
  if (t === 2) return 'none'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_EXT.has(ext)) return 'audio'
  return 'none'
})

watch(
  () => props.file.code,
  () => {
    thumbFailed.value = false
    modalImgFailed.value = false
    textContent.value = null
    textError.value = ''
    textLoading.value = false
    modalOpen.value = false
  }
)

watch(modalOpen, async (open) => {
  if (!open) return
  if (kind.value === 'text' && textContent.value === null && !textLoading.value && !textError.value) {
    await loadText()
  }
})

function openModal() {
  modalImgFailed.value = false
  modalOpen.value = true
  if (kind.value === 'text') {
    textContent.value = null
    textError.value = ''
  }
}

function closeModal() {
  modalOpen.value = false
  textLoading.value = false
}

async function loadText() {
  textLoading.value = true
  textError.value = ''
  try {
    const r = await request.get(`/file/${props.file.code}`, {
      responseType: 'text',
      transformResponse: [(data) => data]
    })
    const raw = typeof r.data === 'string' ? r.data : String(r.data ?? '')
    const max = 512 * 1024
    textContent.value = raw.length > max ? raw.slice(0, max) + '\n\n…（内容过长已截断，请下载查看完整文件）' : raw
  } catch {
    textError.value = '无法加载文本内容'
  } finally {
    textLoading.value = false
  }
}
</script>

<style scoped>
.preview-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.thumb-wrap {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
  border: 1px solid #334155;
  flex-shrink: 0;
}
.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.75rem;
  color: #64748b;
}
.btn-preview {
  padding: 6px 12px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.btn-preview:hover {
  background: #475569;
}
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal-box {
  max-width: min(92vw, 960px);
  max-height: 90vh;
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}
.modal-title {
  font-size: 0.95rem;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #334155;
  color: #e2e8f0;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.modal-close:hover {
  background: #475569;
}
.modal-body {
  padding: 16px;
  overflow: auto;
  min-height: 120px;
  max-height: calc(90vh - 64px);
}
.modal-img {
  display: block;
  max-width: 100%;
  max-height: min(75vh, 720px);
  margin: 0 auto;
  object-fit: contain;
  border-radius: 8px;
}
.modal-video {
  width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  background: #000;
}
.modal-audio {
  width: 100%;
  max-width: 480px;
}
.modal-iframe {
  width: 100%;
  height: min(70vh, 640px);
  border: 1px solid #334155;
  border-radius: 8px;
  background: #fff;
}
.modal-hint {
  margin: 0;
  color: #94a3b8;
}
.modal-hint.err {
  color: #f87171;
}
.modal-text {
  margin: 0;
  padding: 12px;
  font-size: 0.85rem;
  line-height: 1.5;
  background: #0f172a;
  border-radius: 8px;
  color: #cbd5e1;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: min(65vh, 560px);
  overflow: auto;
}
.modal-err {
  margin: 0;
  color: #94a3b8;
}
</style>
