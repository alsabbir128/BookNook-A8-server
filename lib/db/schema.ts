import { integer, date, serial, text, timestamp, boolean, pgTable, uniqueIndex } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(), emailVerified: boolean('emailVerified').notNull().default(false), image: text('image'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
export const session = pgTable('session', {
  id: text('id').primaryKey(), expiresAt: timestamp('expiresAt').notNull(), token: text('token').notNull().unique(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(), ipAddress: text('ipAddress'), userAgent: text('userAgent'), userId: text('userId').notNull(),
})
export const account = pgTable('account', {
  id: text('id').primaryKey(), accountId: text('accountId').notNull(), providerId: text('providerId').notNull(), userId: text('userId').notNull(), accessToken: text('accessToken'), refreshToken: text('refreshToken'), idToken: text('idToken'), accessTokenExpiresAt: timestamp('accessTokenExpiresAt'), refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'), scope: text('scope'), password: text('password'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
export const verification = pgTable('verification', {
  id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expiresAt').notNull(), createdAt: timestamp('createdAt').defaultNow(), updatedAt: timestamp('updatedAt').defaultNow(),
})
export const jwks = pgTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  expiresAt: timestamp('expiresAt'),
  alg: text('alg'),
  crv: text('crv'),
})
export const borrow = pgTable('borrow', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), title: text('title').notNull(), author: text('author').notNull(), image: text('image').notNull(), borrowDate: date('borrowDate').notNull(), returnDate: date('returnDate').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userTitleUnique: uniqueIndex('borrow_user_title_unique').on(table.userId, table.title),
}))
export const bookInventory = pgTable('book_inventory', { title: text('title').primaryKey(), copies: integer('copies').notNull() })
export const libraryBooks = pgTable('library_books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull().unique(),
  author: text('author').notNull(),
  category: text('category').notNull(),
  image: text('image').notNull(),
  description: text('description').notNull(),
  totalCopies: integer('total_copies').notNull().default(1),
  userId: text('userId').notNull(),
  addedByName: text('addedByName').notNull(),
  addedByEmail: text('addedByEmail').notNull(),
  addedAt: timestamp('addedAt', { withTimezone: true }).notNull().defaultNow(),
})
export const libraryBookSeedState = pgTable('library_book_seed_state', {
  ownerEmail: text('owner_email').primaryKey(),
  userId: text('userId').notNull(),
  seededAt: timestamp('seeded_at', { withTimezone: true }).notNull().defaultNow(),
})
