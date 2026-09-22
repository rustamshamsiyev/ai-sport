export interface AuthUser {
  id: string
  username: string
  fullName: string | null
  authSource: string
  roles: string[]
  permissions: string[]
}
export interface ProfilePatch { username?: string, fullName?: string | null }
export interface PasswordChange { currentPassword: string, newPassword: string }
export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator', AI_SPECIALIST: 'SI mutaxassisi', VIEWER: 'Kuzatuvchi'
}
