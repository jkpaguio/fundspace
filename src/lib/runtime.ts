import { Capacitor } from '@capacitor/core'

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

export function isInstalledAppRuntime() {
  if (Capacitor.isNativePlatform()) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean((window.navigator as NavigatorWithStandalone).standalone)
  )
}
