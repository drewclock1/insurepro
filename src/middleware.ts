import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/forgot-password', '/onboarding', '/api/meta/webhook']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths — skip auth check
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/meta/webhook'))) {
    return NextResponse.next()
  }

  // API routes with cron/internal auth — skip
  if (pathname.startsWith('/api/cron') || pathname.startsWith('/api/sheets')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not signed in + trying to access a protected route
  if (!user && pathname.startsWith('/') && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/sign-in', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Signed in but hitting auth pages — redirect to workbench
  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/workbench', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
