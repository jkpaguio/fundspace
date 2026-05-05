import { getIsOnline } from './connectivity'

export function requireOnline(featureName: string) {
  if (!getIsOnline()) {
    throw new Error(`${featureName} needs an internet connection. Try again when you are back online.`)
  }
}
