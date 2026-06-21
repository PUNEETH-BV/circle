import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Derive the app origin from the incoming request so this works on
  // localhost, Vercel preview URLs, and production without any env-var change.
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const cookieStore = await cookies()
  const cookiesToSet: { name: string; value: string; options?: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(newCookies: { name: string; value: string; options?: any }[]) {
          // Collect cookies — do NOT set them yet
          cookiesToSet.push(...newCookies)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL('/auth/login?error=google_failed', origin)
    )
  }

  // Create the redirect and ATTACH the PKCE cookies directly onto it
  // This is critical — without this the verifier is lost during redirect
  const response = NextResponse.redirect(data.url)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
