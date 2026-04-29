import { supabase } from '../../../lib/supabase'
import type { CurrencyCode, Profile } from '../../../types/domain'

const SELECTED_WORKSPACE_KEY = 'fundspace:selected-workspace-id'

export async function signInWithEmail(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({ email, password })

  if (!result.error) {
    window.localStorage.removeItem(SELECTED_WORKSPACE_KEY)
  }

  return result
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await supabase.auth.signUp({ email, password })

  if (!result.error) {
    window.localStorage.removeItem(SELECTED_WORKSPACE_KEY)
  }

  return result
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
}

export async function signOut() {
  window.localStorage.removeItem(SELECTED_WORKSPACE_KEY)
  return supabase.auth.signOut()
}

export async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}

export async function updateCurrentProfile(input: {
  defaultCurrency?: CurrencyCode
  fullName: string
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: input.fullName,
    },
  })

  if (authError) {
    throw authError
  }

  const updates: {
    id: string
    default_currency?: CurrencyCode
    full_name: string
  } = {
    id: userData.user.id,
    full_name: input.fullName,
  }

  if (input.defaultCurrency) {
    updates.default_currency = input.defaultCurrency
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(updates, { onConflict: 'id' })

  if (error) {
    throw error
  }
}

export async function updateProfileName(fullName: string) {
  return updateCurrentProfile({ fullName })
}

export async function updateCurrentPassword(password: string) {
  return supabase.auth.updateUser({
    password,
  })
}
