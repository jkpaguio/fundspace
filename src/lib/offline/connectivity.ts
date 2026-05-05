export function getIsOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function subscribeToConnectivity(callback: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
