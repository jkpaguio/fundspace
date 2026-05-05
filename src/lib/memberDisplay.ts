import type { WorkspaceProfile } from '../types/domain'

export function getMemberDisplayName(
  profiles: WorkspaceProfile[],
  userId: string | null | undefined,
) {
  if (!userId) {
    return 'Unknown member'
  }

  const profile = profiles.find((item) => item.id === userId)

  return profile?.full_name || profile?.email || 'Unknown member'
}
