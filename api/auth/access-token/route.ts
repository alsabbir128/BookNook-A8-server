import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  expiredJwtCookieOptions,
  getSafeLocalReturnTo,
  JWT_ACCESS_COOKIE_NAME,
  jwtCookieOptions,
  verifyJwtToken,
} from '@/lib/jwt-server'

export const dynamic = 'force-dynamic'

const noStoreHeaders = { 'Cache-Control': 'no-store, private' }

export async function GET(request: NextRequest) {
  const hasReturnTo = request.nextUrl.searchParams.has('returnTo')
  const returnTo = getSafeLocalReturnTo(request.nextUrl.searchParams.get('returnTo'))

  let session
  try {
    session = await auth.api.getSession({ headers: request.headers })
  } catch {
    return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
  }

  if (!session?.user) {
    if (hasReturnTo) {
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('next', returnTo)
      const response = NextResponse.redirect(signInUrl)
      response.headers.set('Cache-Control', 'no-store, private')
      response.cookies.set(JWT_ACCESS_COOKIE_NAME, '', expiredJwtCookieOptions())
      return response
    }

    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
    response.cookies.set(JWT_ACCESS_COOKIE_NAME, '', expiredJwtCookieOptions())
    return response
  }

  let token: string
  try {
    const result = await auth.api.getToken({ headers: request.headers })
    token = result.token
  } catch {
    return NextResponse.json({ error: 'Could not issue an access token.' }, { status: 503, headers: noStoreHeaders })
  }

  const principal = await verifyJwtToken(token)
  if (!principal) {
    return NextResponse.json({ error: 'Could not issue an access token.' }, { status: 503, headers: noStoreHeaders })
  }

  const response = hasReturnTo
    ? NextResponse.redirect(new URL(returnTo, request.url))
    : NextResponse.json({
        token,
        expiresAt: principal.expiresAt * 1000,
        user: {
          id: principal.userId,
          name: principal.name,
          email: principal.email,
          image: principal.image,
        },
      }, { headers: noStoreHeaders })

  response.headers.set('Cache-Control', 'no-store, private')
  response.cookies.set(JWT_ACCESS_COOKIE_NAME, token, jwtCookieOptions(principal.expiresAt))
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders })
  response.cookies.set(JWT_ACCESS_COOKIE_NAME, '', expiredJwtCookieOptions())
  return response
}
