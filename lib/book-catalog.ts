export type Book = {
  id?: number
  title: string
  author: string
  category: string
  description: string
  image: string
  fallbackImage: string
  accent: string
  year: string
  copies: number
  addedByName: string
  addedByEmail: string
  addedAt?: string
}

export const LEGACY_BOOK_OWNER = { name: 'Abdullah Al Sabbir', email: 'abdullahals128@gmail.com' } as const

type BookEntry = readonly [title: string, author: string, category: string, year: string, isbn: string, accent: string, description: string, copies: number]

const openLibraryCover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
const googleBooksCover = (isbn: string) => `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=3&source=gbs_api`
const openLibraryMissingIsbns = new Set(['9780261102217'])
const generatedCoverByIsbn: Record<string, string | undefined> = {
  '9781616208898': '/images/covers/book-of-delights.png',
  '9781250776673': '/images/covers/sea-of-tranquility.png',
  '9780241373590': '/images/covers/art-of-rest.png',
  '9780525555217': '/images/covers/anthropocene-reviewed.png',
  '9780062459368': '/images/covers/ocean-at-the-end-of-the-lane.png',
}

const bookEntries: BookEntry[] = [
  ["The Hobbit", "J.R.R. Tolkien", "Fantasy", "1937", "9780261102217", "#6856ba", "Bilbo Baggins leaves his quiet home for a quest with thirteen dwarves and a dragon at the end.", 2],
  ["Pride and Prejudice", "Jane Austen", "Classic", "1813", "9780141439518", "#b87c9e", "A sharp, tender comedy of manners about first impressions, family, and finding an equal heart.", 4],
  ["The Midnight Library", "Matt Haig", "Fiction", "2020", "9780525559474", "#d97e51", "Between life and death there is a library. Every book offers Nora a chance to try another life.", 3],
  ["A Field Guide to Getting Lost", "Rebecca Solnit", "Essays", "2005", "9780143037248", "#7097a8", "A luminous exploration of the unknown and an invitation to find wonder in unfamiliar places.", 2],
  ["Braiding Sweetgrass", "Robin Wall Kimmerer", "Nature", "2013", "9781571313560", "#5d4f9e", "Plants and people are a story of reciprocity. This beautiful book asks us to listen again.", 5],
  ["The Book of Delights", "Ross Gay", "Poetry", "2019", "9781616208898", "#b87c9e", "Small, bright observations that make a life feel larger, more generous, and more awake.", 2],
  ["Sea of Tranquility", "Emily St. John Mandel", "Fiction", "2022", "9781250776673", "#a07b54", "A time-traveling fugue about art, history, and the patterns that bind one life to another.", 3],
  ["The Creative Act", "Rick Rubin", "Creativity", "2023", "9780593652886", "#c56f46", "A quiet and practical meditation on the nature of making from a legendary producer.", 4],
  ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", "Fiction", "2022", "9780593321201", "#c76e54", "Two friends build worlds together and discover the joy and cost of creating something lasting.", 3],
  ["The Vanishing Half", "Brit Bennett", "Fiction", "2020", "9780525536291", "#9270a0", "A sweeping story of identity, family, and the secrets we inherit from the places we leave.", 2],
  ["Atomic Habits", "James Clear", "Nonfiction", "2018", "9780735211292", "#718c9f", "An accessible guide to building good habits and breaking the ones that hold you back.", 6],
  ["Educated", "Tara Westover", "Memoir", "2018", "9780399590504", "#9a7c60", "A memoir about education, family, and the fierce work of making a life of your own.", 3],
  ["The Secret History", "Donna Tartt", "Mystery", "1992", "9781400031702", "#9d754e", "A close-knit group of classics students slip into a world of beauty, ritual, and dark consequence.", 2],
  ["The Alchemist", "Paulo Coelho", "Fiction", "1988", "9780062315007", "#c69955", "A shepherd follows a dream across the desert and learns to listen for the language of the world.", 5],
  ["Sapiens", "Yuval Noah Harari", "History", "2011", "9780062316097", "#49628f", "A concise history of humankind, from the first stories to the systems shaping our future.", 4],
  ["The Name of the Wind", "Patrick Rothfuss", "Fantasy", "2007", "9780756404741", "#8b6c9d", "A gifted musician tells the story of how he became the most notorious wizard of his age.", 2],
  ["Circe", "Madeline Miller", "Mythology", "2018", "9780316556347", "#5b58ae", "The story of a goddess who discovers her own power in a world ruled by gods and men.", 3],
  ["Little Women", "Louisa May Alcott", "Classic", "1868", "9780147514011", "#d48c6f", "Four sisters grow up, make art, and choose their own definitions of a good and brave life.", 4],
  ["The Song of Achilles", "Madeline Miller", "Mythology", "2011", "9780062060624", "#718aa0", "A tender retelling of the legendary bond between Achilles and Patroclus.", 2],
  ["The Thursday Murder Club", "Richard Osman", "Mystery", "2020", "9781984880963", "#b47f60", "Four friends in a retirement village investigate a real murder with wit and persistence.", 3],
  ["Project Hail Mary", "Andy Weir", "Science Fiction", "2021", "9780593135204", "#5e8495", "A lone astronaut wakes with a mission to save Earth and no memory of how he got there.", 4],
  ["A Gentleman in Moscow", "Amor Towles", "Historical", "2016", "9780143110439", "#a77d68", "A count is sentenced to house arrest in a grand hotel and finds a world within its walls.", 2],
  ["Station Eleven", "Emily St. John Mandel", "Science Fiction", "2014", "9780804172448", "#8c8260", "Art, memory, and survival intertwine after a pandemic reshapes the world.", 3],
  ["The Overstory", "Richard Powers", "Nature", "2018", "9780393635522", "#594e9f", "Nine strangers discover that the trees around them connect their lives in unexpected ways.", 2],
  ["On Earth We’re Briefly Gorgeous", "Ocean Vuong", "Memoir", "2019", "9780525562023", "#9a7898", "A son writes to his mother about language, family, violence, and the beauty of being alive.", 3],
  ["The Art of Rest", "Claudia Hammond", "Wellness", "2019", "9780241373590", "#50669a", "A thoughtful exploration of why rest matters and how we can make space for it.", 2],
  ["The Anthropocene Reviewed", "John Green", "Essays", "2021", "9780525555217", "#c17e69", "A funny, tender collection of reviews of the human-centered world we have made.", 3],
  ["Pachinko", "Min Jin Lee", "Historical", "2017", "9781455563937", "#ae865d", "A multigenerational saga about one family’s endurance, love, and belonging.", 4],
  ["The Ocean at the End of the Lane", "Neil Gaiman", "Fantasy", "2013", "9780062459368", "#617b9a", "A haunting, beautiful novel about memory, childhood, and the small farm at the end of the lane.", 2],
  ["The Four Agreements", "Don Miguel Ruiz", "Wellness", "1997", "9781878424365", "#b99a59", "Four simple principles offer a practical path to personal freedom and a kinder inner voice.", 5],
  ["The House in the Cerulean Sea", "TJ Klune", "Fantasy", "2020", "9781250217288", "#4d6aaf", "A caseworker discovers a found family and a home that changes what he thought was possible.", 3],
  ["Howl’s Moving Castle", "Diana Wynne Jones", "Fantasy", "1986", "9780061478789", "#cb805b", "A young hat-maker is cursed and finds an unlikely ally in a moving castle.", 4],
]

export const books: Book[] = bookEntries.map(([title, author, category, year, isbn, accent, description, copies]) => {
  const generatedCover = generatedCoverByIsbn[isbn]
  const openLibraryIsMissing = openLibraryMissingIsbns.has(isbn)

  return {
    title,
    author,
    category,
    year,
    accent,
    description,
    copies,
    image: generatedCover ?? (openLibraryIsMissing ? googleBooksCover(isbn) : openLibraryCover(isbn)),
    fallbackImage: generatedCover ?? (openLibraryIsMissing ? openLibraryCover(isbn) : googleBooksCover(isbn)),
    addedByName: LEGACY_BOOK_OWNER.name,
    addedByEmail: LEGACY_BOOK_OWNER.email,
  }
})

export function getBookByTitle(title: string) {
  const normalizedTitle = title.trim().toLowerCase()
  return books.find((book) => book.title.toLowerCase() === normalizedTitle)
}
