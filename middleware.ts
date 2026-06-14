import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log(`[Middleware] Request: ${path}`)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          console.log(`[Middleware] setAll cookies:`, cookiesToSet.map(c => c.name))
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error(`[Middleware] getUser error:`, error.message)
  }
  console.log(`[Middleware] User:`, user ? user.email : 'null')

  const isAuthRoute = path.startsWith('/auth')
  const isCallbackRoute = path.startsWith('/auth/callback')

  if (isCallbackRoute) {
    console.log(`[Middleware] Allowing callback route.`)
    return supabaseResponse
  }

  // If not logged in and not on an auth page, send to login
  if (!user && !isAuthRoute) {
    console.log(`[Middleware] Redirecting to /auth/login (Not logged in)`)
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      console.log(`  Copying cookie to redirect: ${cookie.name}`)
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  // If logged in and on auth page, send to dashboard
  if (user && isAuthRoute) {
    console.log(`[Middleware] Redirecting to / (Logged in on auth page)`)
    const response = NextResponse.redirect(new URL('/', request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      console.log(`  Copying cookie to redirect: ${cookie.name}`)
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  console.log(`[Middleware] Allowing access.`)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
