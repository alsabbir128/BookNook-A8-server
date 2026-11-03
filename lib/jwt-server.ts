import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const JWT_ACCESS_COOKIE_NAME = 'booknook_access_token'

type JwtClaims = {
  sub?: unknown
  exp?: unknown
  name?: unknown
  email?: unknown
  image?: unknown
}

export type JwtPrincipal = {
  userId: string
  name: string
  email: string
  image: string | null
  expiresAt: number
}

export async function verifyJwtToken(token: string): Promise<JwtPrincipal | null> {
  if (!token || token.length > 8192) return null

  try {
    const result = await auth.api.verifyJWT({ body: { token } })
    const claims = result.payload as JwtClaims | null
    if (
      !claims ||
      typeof claims.sub !== 'string' ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    const email = typeof claims.email === 'string' ? claims.email : ''
    return {
      userId: claims.sub,
      name: typeof claims.name === 'string' ? claims.name : email || 'Reader',
      email,
      image: typeof claims.image === 'string' ? claims.image : null,
      expiresAt: claims.exp,
    }
  } catch {
    return null
  }
}

export async function getJwtPrincipalFromRequest(request: Request): Promise<JwtPrincipal | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization || authorization.length > 8200) return null

  const match = /^Bearer\s+(\S+)$/i.exec(authorization)
  return match ? verifyJwtToken(match[1]) : null
}

export async function getJwtPrincipalFromCookie(): Promise<JwtPrincipal | null> {
  const token = (await cookies()).get(JWT_ACCESS_COOKIE_NAME)?.value
  return token ? verifyJwtToken(token) : null
}

export function getSafeLocalReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  return value
}

export function jwtCookieOptions(expiresAt: number) {
  const sameSite = process.env.NODE_ENV === 'development' ? ('none' as const) : ('lax' as const)
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: '/',
    expires: new Date(expiresAt * 1000),
    maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
  }
}

export function expiredJwtCookieOptions() {
  const sameSite = process.env.NODE_ENV === 'development' ? ('none' as const) : ('lax' as const)
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  }
}

export async function requireJwtPrincipal(returnTo: string): Promise<JwtPrincipal> {
  const principal = await getJwtPrincipalFromCookie()
  if (principal) return principal

  const safeReturnTo = getSafeLocalReturnTo(returnTo)
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) {
    redirect(`/api/auth/access-token?returnTo=${encodeURIComponent(safeReturnTo)}`)
  }
  redirect(`/sign-in?next=${encodeURIComponent(safeReturnTo)}`)
}
