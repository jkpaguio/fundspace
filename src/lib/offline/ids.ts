export function createOfflineId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createOfflineQueueId(prefix: string) {
  return `${prefix}_${createOfflineId()}`
}
