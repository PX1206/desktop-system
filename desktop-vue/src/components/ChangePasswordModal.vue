<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mask" @click.self="close">
      <div class="box">
        <h3>修改密码</h3>
        <p class="tip">修改成功后需重新登录（所有设备会话将失效）</p>
        <label>手机号</label>
        <input :value="mobile" type="text" readonly class="readonly" />
        <label>图形验证码</label>
        <div class="row-cap">
          <input v-model="pictureCode" maxlength="6" placeholder="请输入" />
          <img v-if="captchaImg" :src="captchaImg" class="cap-img" alt="" @click="refreshCaptcha" />
        </div>
        <label>短信验证码</label>
        <div class="row-sms">
          <input v-model="smsCode" maxlength="6" placeholder="短信验证码" />
          <button type="button" class="btn-sms" :disabled="countdown > 0 || sending" @click="sendSms">
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>
        <label>新密码</label>
        <input v-model="pwd1" type="password" autocomplete="new-password" placeholder="8 位以上，含数字和字母" />
        <label>确认新密码</label>
        <input v-model="pwd2" type="password" autocomplete="new-password" />
        <p v-if="err" class="err">{{ err }}</p>
        <div class="actions">
          <button type="button" class="btn-cancel" @click="close">取消</button>
          <button type="button" class="btn-ok" :disabled="submitting" @click="submit">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getCaptcha, getSmsCode } from '../api/sms'
import { updatePasswordSelf } from '../api/user'

const props = defineProps<{
  modelValue: boolean
  mobile: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'success'): void
}>()

const pictureCode = ref('')
const smsCode = ref('')
const pwd1 = ref('')
const pwd2 = ref('')
const err = ref('')
const captchaKey = ref('')
const captchaImg = ref('')
const countdown = ref(0)
const sending = ref(false)
const submitting = ref(false)

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return
    err.value = ''
    pictureCode.value = ''
    smsCode.value = ''
    pwd1.value = ''
    pwd2.value = ''
    await refreshCaptcha()
  }
)

async function refreshCaptcha() {
  const cap = await getCaptcha()
  captchaKey.value = cap.key
  captchaImg.value = cap.image
}

function close() {
  emit('update:modelValue', false)
}

async function sendSms() {
  err.value = ''
  if (!props.mobile || props.mobile.length < 11) {
    err.value = '账号未绑定有效手机号'
    return
  }
  if (!pictureCode.value || pictureCode.value.length < 4) {
    err.value = '请输入图形验证码'
    return
  }
  sending.value = true
  try {
    await getSmsCode(props.mobile, captchaKey.value, pictureCode.value)
    countdown.value = 60
    const t = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) window.clearInterval(t)
    }, 1000)
  } catch (e: any) {
    err.value = e?.message || '发送失败'
    await refreshCaptcha()
  } finally {
    sending.value = false
  }
}

function validatePwd(): boolean {
  const p = pwd1.value
  if (p.length < 8) {
    err.value = '密码至少 8 位'
    return false
  }
  if (!/[0-9]/.test(p) || !/[a-zA-Z]/.test(p)) {
    err.value = '密码须同时包含数字和字母'
    return false
  }
  if (p !== pwd2.value) {
    err.value = '两次密码不一致'
    return false
  }
  return true
}

async function submit() {
  err.value = ''
  if (!smsCode.value) {
    err.value = '请输入短信验证码'
    return
  }
  if (!validatePwd()) return
  submitting.value = true
  try {
    await updatePasswordSelf({
      mobile: props.mobile,
      smsCode: smsCode.value,
      plainPassword: pwd1.value
    })
    emit('success')
    close()
  } catch (e: any) {
    err.value = e?.message || '修改失败'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 11000;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.box {
  width: 100%;
  max-width: 400px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #e2e8f0;
}
.box h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}
.tip {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: #94a3b8;
}
label {
  display: block;
  margin: 12px 0 6px;
  font-size: 0.85rem;
  color: #94a3b8;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  box-sizing: border-box;
}
input.readonly {
  opacity: 0.85;
}
.row-cap,
.row-sms {
  display: flex;
  gap: 8px;
  align-items: center;
}
.row-cap input {
  flex: 1;
}
.cap-img {
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #334155;
}
.btn-sms {
  flex-shrink: 0;
  padding: 10px 12px;
  background: #334155;
  border: none;
  border-radius: 8px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.btn-sms:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.err {
  margin: 12px 0 0;
  color: #f87171;
  font-size: 0.85rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-cancel {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
}
.btn-ok {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}
.btn-ok:disabled {
  opacity: 0.6;
}
</style>
