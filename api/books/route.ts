import { and, desc, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getJwtPrincipalFromRequest } from '@/lib/jwt-server'
import { db } from '@/lib/db'
import { bookInventory, libraryBooks } from '@/lib/db/schema'
import { ensureLegacyBooksForUser, hasLegacyCatalogSeeded } from '@/lib/book-data'
import { getBookByTitle } from '@/lib/book-catalog'
import { parseBookInput } from '@/lib/book-validation'

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const databaseError = error as { code?: unknown; cause?: unknown }
  return databaseError.code === '23505' || isUniqueViolation(databaseError.cause)
}

export async function GET(request: Request) {
  const principal = await getJwtPrincipalFromRequest(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureLegacyBooksForUser({ id: principal.userId, email: principal.email })
  const records = await db.select({
    id: libraryBooks.id,
    title: libraryBooks.title,
    author: libraryBooks.author,
    category: libraryBooks.category,
    image: libraryBooks.image,
    description: libraryBooks.description,
    totalCopies: libraryBooks.totalCopies,
    addedByName: libraryBooks.addedByName,
    addedByEmail: libraryBooks.addedByEmail,
    addedAt: libraryBooks.addedAt,
  }).from(libraryBooks)
    .where(eq(libraryBooks.userId, principal.userId))
    .orderBy(desc(libraryBooks.addedAt))

  return NextResponse.json(records)
}

export async function POST(request: Request) {
  const principal = await getJwtPrincipalFromRequest(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const validation = parseBookInput(body, 'create')
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const input = validation.value
  if (!await hasLegacyCatalogSeeded() && getBookByTitle(input.title)) {
    return NextResponse.json({ error: 'This title is already part of the shared collection.' }, { status: 409 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: libraryBooks.id })
        .from(libraryBooks)
        .where(sql`lower(${libraryBooks.title}) = ${input.title.toLowerCase()}`)
        .limit(1)
      if (existing) return null

      const [book] = await tx.insert(libraryBooks).values({
        ...input,
        userId: principal.userId,
        addedByName: principal.name || principal.email || 'Reader',
        addedByEmail: principal.email,
      }).onConflictDoNothing().returning({
        id: libraryBooks.id,
        title: libraryBooks.title,
        author: libraryBooks.author,
        category: libraryBooks.category,
        image: libraryBooks.image,
        description: libraryBooks.description,
        totalCopies: libraryBooks.totalCopies,
        addedByName: libraryBooks.addedByName,
        addedByEmail: libraryBooks.addedByEmail,
        addedAt: libraryBooks.addedAt,
      })
      if (!book) return null

      await tx.insert(bookInventory).values({ title: book.title, copies: book.totalCopies }).onConflictDoNothing()
      return book
    })

    if (!result) return NextResponse.json({ error: 'A book with this title already exists.' }, { status: 409 })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'A book with this title already exists.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not add this book right now.' }, { status: 500 })
  }
}
