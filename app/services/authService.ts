import type { ApiClient } from './apiClient.ts'
import type { AuthUser, PasswordChange, ProfilePatch } from '../types/auth.ts'

interface UserDto { id: number, username: string, full_name: string | null, auth_source: string, roles: string[], permissions: string[] }
interface LoginDto { access_token: string, token_type?: string, expires_in: number, user: UserDto }
export function mapUser(dto: UserDto): AuthUser {
  return { id: String(dto.id), username: dto.username, fullName: dto.full_name, authSource: dto.auth_source, roles: [...dto.roles], permissions: [...dto.permissions] }
}
export function createAuthService(api: ApiClient) {
  return {
    async login(username: string, password: string) {
      const dto = await api.request<LoginDto>('auth/login', { method: 'POST', public: true, body: { username: username.trim(), password } })
      return { accessToken: dto.access_token, expiresIn: dto.expires_in, user: mapUser(dto.user) }
    },
    getCurrentUser: async () => mapUser(await api.request<UserDto>('auth/me')),
    async updateProfile(payload: ProfilePatch) {
      const body = {
        ...(payload.username !== undefined ? { username: payload.username.trim() } : {}),
        ...(payload.fullName !== undefined ? { full_name: payload.fullName } : {})
      }
      return mapUser(await api.request<UserDto>('auth/profile', { method: 'PATCH', body }))
    },
    changePassword: (payload: PasswordChange) => api.request<undefined>('auth/change-password', {
      method: 'POST', body: { current_password: payload.currentPassword, new_password: payload.newPassword }
    })
  }
}
