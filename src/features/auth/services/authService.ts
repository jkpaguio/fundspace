import { supabase } from '../../../lib/supabase'

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
}

export async function updateProfileName(fullName: string) {
  return supabase.auth.updateUser({
    data: {
      full_name: fullName,
    },
  })
}
