import { NextResponse } from 'next/server'
import { getJwtPrincipalFromRequest } from '@/lib/jwt-server'

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maximumImageSize = 5 * 1024 * 1024

export async function POST(request: Request) {
  const principal = await getJwtPrincipalFromRequest(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Image uploads are not configured. Add an ImgBB API key in project settings.' }, { status: 503 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image file to upload.' }, { status: 400 })
  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json({ error: 'Use a JPEG, PNG, WebP, or GIF image.' }, { status: 400 })
  }
  if (file.size === 0 || file.size > maximumImageSize) {
    return NextResponse.json({ error: 'Image must be larger than 0 bytes and no more than 5 MB.' }, { status: 400 })
  }

  const uploadForm = new FormData()
  uploadForm.set('image', file)
  const uploadUrl = new URL('https://api.imgbb.com/1/upload')
  uploadUrl.searchParams.set('key', apiKey)

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadForm,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const payload = await response.json().catch(() => null) as { data?: { url?: unknown } } | null
    if (!response.ok || typeof payload?.data?.url !== 'string') {
      return NextResponse.json({ error: 'ImgBB could not store this image. Please try another file.' }, { status: 502 })
    }

    return NextResponse.json({ url: payload.data.url }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not reach ImgBB. Please try again.' }, { status: 502 })
  }
}
