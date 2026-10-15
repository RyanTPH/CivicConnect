import { useEffect, useState } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'

// null = still checking. This only decides what to HSOQ. The Edge Function and the databse
// re-check admin rights on every request, so hiding a screen is 
// a convnience, not the security.

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(null)

    useEffect(() => {
        let cancelled = false
        supabase.rpc('is_current_admin').then(({ data, error }) => {
            if (!cancelled) setIsAdmin(error ? false : Boolean(data))
        })
        return () => {
            cancelled = true
        }
       
    }, [])

    return isAdmin
}