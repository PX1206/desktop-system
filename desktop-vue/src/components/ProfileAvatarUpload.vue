<template>
  <div class="avatar-upload">
    <div class="avatar-preview-wrap">
      <img v-if="modelValue" :src="modelValue" alt="头像预览" class="avatar-img" />
      <div v-else class="avatar-placeholder">未设置</div>
      <div v-if="uploading" class="avatar-loading">上传中…</div>
    </div>
    <div class="avatar-actions">
      <label class="btn-upload" :class="{ disabled: uploading }">
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="sr-only"
          :disabled="uploading"
          @change="onFile"
        />
        {{ uploading ? '上传中…' : '选择图片' }}
      </label>
      <button
        v-if="modelValue"
        type="button"
        class="btn-clear"
        :disabled="uploading"
        @click="clear"
      >
        清除
      </button>
    </div>
    <p class="hint">通过文件管理接口上传，支持 JPG / PNG / GIF / WebP，最大 2MB</p>
    <p v-if="localErr" class="err">{{ localErr }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { uploadFile, headImgUrlFromUploadResult } from '../api/file'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const uploading = ref(false)
const localErr = ref('')

const MAX_BYTES = 2 * 1024 * 1024

async function onFile(e: Event) {
  localErr.value = ''
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    localErr.value = '请选择图片文件'
    return
  }
  if (file.size > MAX_BYTES) {
    localErr.value = '图片请小于 2MB'
    return
  }
  uploading.value = true
  try {
    const path = await uploadFile(file)
    emit('update:modelValue', headImgUrlFromUploadResult(path))
  } catch (e: unknown) {
    localErr.value = e instanceof Error ? e.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

function clear() {
  localErr.value = ''
  emit('update:modelValue', '')
}
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.avatar-preview-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #334155;
  background: #0f172a;
  flex-shrink: 0;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #64748b;
}
.avatar-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.75);
}
.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.btn-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-upload:hover:not(.disabled) {
  background: #475569;
}
.btn-upload.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.btn-clear {
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-clear:hover:not(:disabled) {
  color: #e2e8f0;
  border-color: #64748b;
}
.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}
.err {
  margin: 0;
  font-size: 0.8rem;
  color: #f87171;
}
</style>
