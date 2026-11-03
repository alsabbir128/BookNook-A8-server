import { and, eq, ne, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getJwtPrincipalFromRequest } from '@/lib/jwt-server'
import { getBookByTitle } from '@/lib/book-catalog'
import { hasLegacyCatalogSeeded } from '@/lib/book-data'
import { db } from '@/lib/db'
import { bookInventory, borrow, libraryBooks } from '@/lib/db/schema'
import { parseBookInput } from '@/lib/book-validation'

type RouteContext = { params: Promise<{ id: string }> }

function getBookId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const databaseError = error as { code?: unknown; cause?: unknown }
  return databaseError.code === '23505' || isUniqueViolation(databaseError.cause)
}

export async function PUT(request: Request, { params }: RouteContext) {
  const principal = await getJwtPrincipalFromRequest(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = getBookId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid book ID.' }, { status: 400 })

  const validation = parseBookInput(await request.json().catch(() => null), 'update')
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
  const input = validation.value
  const legacyCatalogSeeded = await hasLegacyCatalogSeeded()

  try {
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(libraryBooks).where(and(
        eq(libraryBooks.id, id),
        eq(libraryBooks.userId, principal.userId),
      )).limit(1)
      if (!current) return { status: 'not-found' as const }

      const titleChanged = current.title !== input.title
      if (titleChanged && !legacyCatalogSeeded && getBookByTitle(input.title) && getBookByTitle(input.title)?.title !== current.title) {
        return { status: 'catalog-conflict' as const }
      }

      const [duplicate] = await tx.select({ id: libraryBooks.id }).from(libraryBooks).where(and(
        sql`lower(${libraryBooks.title}) = ${input.title.toLowerCase()}`,
        ne(libraryBooks.id, id),
      )).limit(1)
      if (duplicate) return { status: 'duplicate' as const }

      const activeBorrows = await tx.select({ id: borrow.id }).from(borrow).where(eq(borrow.title, current.title))
      if (titleChanged && activeBorrows.length > 0) return { status: 'title-borrowed' as const }
      if (input.totalCopies < activeBorrows.length) return { status: 'copies-borrowed' as const }

      const availableCopies = input.totalCopies - activeBorrows.length
      if (titleChanged) await tx.delete(bookInventory).where(eq(bookInventory.title, current.title))
      await tx.insert(bookInventory).values({ title: input.title, copies: availableCopies }).onConflictDoUpdate({
        target: bookInventory.title,
        set: { copies: availableCopies },
      })

      const [updated] = await tx.update(libraryBooks).set(input).where(and(
        eq(libraryBooks.id, id),
        eq(libraryBooks.userId, principal.userId),
      )).returning({
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

      return { status: 'updated' as const, book: updated }
    })

    if (result.status === 'not-found') return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    if (result.status === 'catalog-conflict') return NextResponse.json({ error: 'That title already exists in the shared collection.' }, { status: 409 })
    if (result.status === 'duplicate') return NextResponse.json({ error: 'A book with this title already exists.' }, { status: 409 })
    if (result.status === 'title-borrowed') return NextResponse.json({ error: 'Return active borrows before changing this book title.' }, { status: 409 })
    if (result.status === 'copies-borrowed') return NextResponse.json({ error: 'Total copies cannot be lower than the number currently borrowed.' }, { status: 409 })

    return NextResponse.json(result.book)
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'A book with this title already exists.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not update this book right now.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const principal = await getJwtPrincipalFromRequest(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = getBookId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid book ID.' }, { status: 400 })

  const result = await db.transaction(async (tx) => {
    const [book] = await tx.select({ id: libraryBooks.id, title: libraryBooks.title }).from(libraryBooks).where(and(
      eq(libraryBooks.id, id),
      eq(libraryBooks.userId, principal.userId),
    )).limit(1)
    if (!book) return 'not-found' as const

    const [activeBorrow] = await tx.select({ id: borrow.id }).from(borrow).where(eq(borrow.title, book.title)).limit(1)
    if (activeBorrow) return 'borrowed' as const

    await tx.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.userId, principal.userId)))
    await tx.delete(bookInventory).where(eq(bookInventory.title, book.title))
    return 'deleted' as const
  })

  if (result === 'not-found') return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
  if (result === 'borrowed') return NextResponse.json({ error: 'Return active borrows before deleting this book.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
