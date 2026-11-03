import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookInventory, libraryBookSeedState, libraryBooks } from '@/lib/db/schema'
import { books as legacyBooks, LEGACY_BOOK_OWNER, type Book } from '@/lib/book-catalog'

const categoryAccents: Record<string, string> = {
  Fiction: '#a898ff',
  Science: '#77a9c6',
  History: '#cb9275',
  Kids: '#d7aa63',
  Others: '#8aa392',
}

const legacyTitles = new Set(legacyBooks.map((book) => book.title.toLowerCase()))

type LibraryBookRow = typeof libraryBooks.$inferSelect

function toCatalogBook(row: LibraryBookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description,
    image: row.image,
    fallbackImage: row.image,
    accent: categoryAccents[row.category] ?? '#a898ff',
    year: '',
    copies: row.totalCopies,
    addedByName: row.addedByName,
    addedByEmail: row.addedByEmail,
    addedAt: row.addedAt.toISOString(),
  }
}

function mergeLegacyBook(book: Book, row: LibraryBookRow): Book {
  return {
    ...book,
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description,
    image: row.image,
    fallbackImage: row.image,
    copies: row.totalCopies,
    addedByName: row.addedByName,
    addedByEmail: row.addedByEmail,
    addedAt: row.addedAt.toISOString(),
  }
}

export async function getCatalogData() {
  const [rows, inventoryRows, seedStateRows] = await Promise.all([
    db.select().from(libraryBooks).orderBy(desc(libraryBooks.addedAt)),
    db.select().from(bookInventory),
    db.select({ userId: libraryBookSeedState.userId, seededAt: libraryBookSeedState.seededAt })
      .from(libraryBookSeedState)
      .where(eq(libraryBookSeedState.ownerEmail, LEGACY_BOOK_OWNER.email))
      .limit(1),
  ])

  const legacyOwnerId = seedStateRows[0]?.userId
  const legacySeededAt = seedStateRows[0]?.seededAt
  const legacyRows = rows.filter((row) => row.userId === legacyOwnerId && legacyTitles.has(row.title.toLowerCase()) && (!legacySeededAt || row.addedAt <= legacySeededAt))
  const legacyRowsByTitle = new Map(legacyRows.map((row) => [row.title.toLowerCase(), row]))
  const sharedRows = rows.filter((row) => !legacyRows.includes(row)).map(toCatalogBook)
  const staticBooks = legacyOwnerId
    ? legacyBooks.flatMap((book) => {
        const row = legacyRowsByTitle.get(book.title.toLowerCase())
        return row ? [mergeLegacyBook(book, row)] : []
      })
    : legacyBooks.filter((book) => !rows.some((row) => row.title.toLowerCase() === book.title.toLowerCase()))

  return {
    catalogBooks: [...sharedRows, ...staticBooks],
    initialCopies: Object.fromEntries(inventoryRows.map((row) => [row.title, row.copies])),
  }
}

export async function hasLegacyCatalogSeeded() {
  const [state] = await db.select({ ownerEmail: libraryBookSeedState.ownerEmail })
    .from(libraryBookSeedState)
    .where(eq(libraryBookSeedState.ownerEmail, LEGACY_BOOK_OWNER.email))
    .limit(1)
  return Boolean(state)
}

export async function ensureLegacyBooksForUser(user: { id: string; email: string }) {
  if (user.email.trim().toLowerCase() !== LEGACY_BOOK_OWNER.email) return

  await db.transaction(async (tx) => {
    const [seeded] = await tx.insert(libraryBookSeedState)
      .values({ ownerEmail: LEGACY_BOOK_OWNER.email, userId: user.id })
      .onConflictDoNothing()
      .returning({ ownerEmail: libraryBookSeedState.ownerEmail })

    if (!seeded) return

    await tx.insert(libraryBooks).values(legacyBooks.map((book) => ({
      title: book.title,
      author: book.author,
      category: book.category,
      image: book.image,
      description: book.description,
      totalCopies: book.copies,
      userId: user.id,
      addedByName: LEGACY_BOOK_OWNER.name,
      addedByEmail: LEGACY_BOOK_OWNER.email,
    }))).onConflictDoNothing()

    await tx.insert(bookInventory).values(legacyBooks.map((book) => ({ title: book.title, copies: book.copies }))).onConflictDoNothing()
  })
}
