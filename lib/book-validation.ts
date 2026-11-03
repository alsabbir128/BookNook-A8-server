export const ADD_BOOK_CATEGORIES = ['Fiction', 'Science', 'History', 'Kids', 'Others'] as const

export type BookInput = {
  title: string
  author: string
  category: string
  image: string
  description: string
  totalCopies: number
}

type ValidationResult = { ok: true; value: BookInput } | { ok: false; error: string }

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function parseBookInput(body: unknown, mode: 'create' | 'update'): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Enter the book details and try again.' }
  }

  const record = body as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const author = typeof record.author === 'string' ? record.author.trim() : ''
  const category = typeof record.category === 'string' ? record.category.trim() : ''
  const image = typeof record.image === 'string' ? record.image.trim() : ''
  const description = typeof record.description === 'string' ? record.description.trim() : ''
  const totalCopies = Number(record.totalCopies)

  if (!title || title.length > 160) return { ok: false, error: 'Book title is required and must be 160 characters or fewer.' }
  if (!author || author.length > 120) return { ok: false, error: 'Author name is required and must be 120 characters or fewer.' }
  if (!category || category.length > 40) return { ok: false, error: 'Choose a valid category.' }
  if (mode === 'create' && !ADD_BOOK_CATEGORIES.includes(category as (typeof ADD_BOOK_CATEGORIES)[number])) {
    return { ok: false, error: 'Choose one of the available book categories.' }
  }
  if (!description || description.length > 1000) return { ok: false, error: 'Add a short description of 1,000 characters or fewer.' }
  if (!image || image.length > 2048 || !isHttpsUrl(image)) return { ok: false, error: 'Upload a valid HTTPS book image.' }
  if (!Number.isSafeInteger(totalCopies) || totalCopies < 1 || totalCopies > 100) {
    return { ok: false, error: 'Total copies must be a whole number from 1 to 100.' }
  }

  return { ok: true, value: { title, author, category, image, description, totalCopies } }
}
