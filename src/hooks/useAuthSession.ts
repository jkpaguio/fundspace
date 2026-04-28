import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthSessionState = {
  isLoading: boolean
  session: Session | null
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    isLoading: true,
    session: null,
  })

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setState({ isLoading: false, session: data.session })
      }
    }

    void loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({ isLoading: false, session })
      },
    )

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}
