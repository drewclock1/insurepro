import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  // Next.js 15: cookies() is synchronous in Server Components
  // @supabase/ssr 0.10+ handles this automatically
  const cookieStore = cookies() as any

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              cookieStore.set?.(name, value, options)
            })
          } catch {
            // Called from Server Component — cookies can't be set
          }
        },
      },
    }
  )
}

export function createServiceRoleClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
