import { ref } from 'vue'
import { safeApiMessage } from '../services/apiClient.ts'
import type { PasswordChange } from '../types/auth.ts'

export function passwordValidation(current: string, next: string, confirmation: string) {
  if (next !== confirmation) return 'Yangi parol va tasdiqlash mos emas.'
  if (!current || Array.from(current).length > 1024) return 'Joriy parolni kiriting.'
  if (Array.from(next).length < 12 || Array.from(next).length > 1024 || !next.trim()) return 'Yangi parol 12–1024 belgidan iborat bo‘lishi kerak.'
  if (current === next) return 'Yangi parol joriy paroldan farq qilishi kerak.'
  return ''
}
export function createPasswordForm(changePassword: (payload: PasswordChange) => Promise<boolean>) {
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmation = ref('')
  const error = ref('')
  const success = ref('')
  const saving = ref(false)
  function clear() {
    currentPassword.value = ''
    newPassword.value = ''
    confirmation.value = ''
  }
  async function submit() {
    if (saving.value) return
    success.value = ''
    error.value = passwordValidation(currentPassword.value, newPassword.value, confirmation.value)
    if (error.value) return
    saving.value = true
    try {
      if (await changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })) success.value = 'Parol muvaffaqiyatli o\'zgartirildi.'
    } catch (cause) { error.value = safeApiMessage(cause) } finally {
      clear()
      saving.value = false
    }
  }
  return { currentPassword, newPassword, confirmation, error, success, saving, submit, clear }
}
