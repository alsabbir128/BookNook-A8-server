# BookNook Server API

The BookNook server provides the REST API for books and borrowing records. It is designed to keep catalog data, available copies, ownership, and borrow history in MongoDB while the client handles the reader-facing interface.

## API features

- Public book catalog retrieval.
- Authenticated book creation, editing, and deletion.
- Borrow creation with available-copy checks.
- One active borrow per user and book.
- Return handling that restores the available copy count.
- JWT validation for protected routes.
- Consistent JSON responses for client-side toast and error states.

## API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/books` | Public | Return all books, newest first |
| GET | `/books/:id` | Public | Return one book |
| POST | `/books` | Protected | Add a book |
| PATCH | `/books/:id` | Protected | Update an owned book |
| DELETE | `/books/:id` | Protected | Delete an owned book |
| POST | `/borrows` | Protected | Borrow an available book |
| GET | `/borrows` | Protected | Return the current user's borrows |
| DELETE | `/borrows/:id` | Protected | Return a borrowed book |

## Book fields

A book contains a title, author, category, image URL, short description, total copies, available copies, creator name, creator email, and created date. Supported categories are Fiction, Science, History, Kids, and Others.

Borrowing decreases `availableCopies` atomically. Returning a book increases it. The API rejects a borrow when no copies remain or when the same user already has an active borrow for that book.

## Getting started

```bash
pnpm install
pnpm dev
```

The API can be deployed to Render, Railway, or another Node.js host. Set the client API base URL to the deployed server URL.

## Environment variables

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=booknook
JWT_SECRET=your_jwt_secret
CLIENT_URL=https://alsabbir.lovable.app
```

Keep secrets in the hosting provider's environment settings. Never commit `.env` files.

## Example response

```json
{
  "success": true,
  "data": {
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "category": "Fiction",
    "availableCopies": 1
  }
}
```

## Recommended server structure

```text
src/
├── config/        # MongoDB connection and environment configuration
├── middleware/    # JWT authentication and error handling
├── models/        # Book and borrow schemas
├── routes/        # /books and /borrows routes
├── controllers/   # Request handlers and validation
└── server.js      # Express application entry point
```

## Deployment checklist

- Configure MongoDB and production environment variables.
- Enable CORS only for the deployed client origin.
- Validate JWTs on every protected endpoint.
- Validate request bodies and ownership before writes.
- Use atomic copy updates to prevent over-borrowing.
- Add a health endpoint and confirm all eight API routes after deployment.
